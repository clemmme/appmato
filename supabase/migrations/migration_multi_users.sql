-- ==========================================
-- MIGRATION : SYSTÈME MULTI-UTILISATEURS
-- Organisations, Rôles et Équipes
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ===========================================================
-- ÉTAPE 1 : Nouvelles tables
-- ===========================================================

-- Table: organizations (Cabinet comptable)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  legal_form text,
  siret text,
  address text,
  establishments_count integer DEFAULT 1,
  establishment_names text[],
  team_size_range text,
  specialties text[],
  logo_url text,
  invite_code text NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- Table: organization_members (Membres d'un cabinet)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('manager', 'team_lead', 'collaborator')),
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  UNIQUE(organization_id, user_id)
);

-- Table: team_assignments (Chef de Mission → Salariés)
CREATE TABLE IF NOT EXISTS public.team_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_lead_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id),
  UNIQUE(organization_id, team_lead_id, collaborator_id)
);

-- ===========================================================
-- ÉTAPE 2 : Modifier la table profiles
-- ===========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'solo' CHECK (account_type IN ('solo', 'cabinet')),
  ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS has_completed_setup boolean DEFAULT false;

-- ===========================================================
-- ÉTAPE 3 : RLS pour les nouvelles tables
-- ===========================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;

-- Organizations : visibles par les membres
CREATE POLICY "rls_org_select" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );
CREATE POLICY "rls_org_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "rls_org_update" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );

-- Organization Members : visibles par les membres de la même org
CREATE POLICY "rls_members_select" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members om WHERE om.user_id = auth.uid())
  );
CREATE POLICY "rls_members_insert" ON public.organization_members
  FOR INSERT WITH CHECK (
    -- Le manager peut ajouter des membres, ou auto-insertion (rejoindre)
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
    OR user_id = auth.uid()
  );
CREATE POLICY "rls_members_update" ON public.organization_members
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );
CREATE POLICY "rls_members_delete" ON public.organization_members
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
    OR user_id = auth.uid()
  );

-- Team Assignments : visibles par les managers et team leads concernés
CREATE POLICY "rls_teams_select" ON public.team_assignments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );
CREATE POLICY "rls_teams_insert" ON public.team_assignments
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );
CREATE POLICY "rls_teams_update" ON public.team_assignments
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );
CREATE POLICY "rls_teams_delete" ON public.team_assignments
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'manager')
  );

-- ===========================================================
-- ÉTAPE 4 : Fonction pour chercher une org par code d'invitation
-- ===========================================================

CREATE OR REPLACE FUNCTION public.find_organization_by_code(code text)
RETURNS TABLE(id uuid, name text) AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.name FROM public.organizations o WHERE o.invite_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
