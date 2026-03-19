-- ==========================================
-- FIX : Récursion infinie dans les RLS organization_members
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- Étape 1 : Créer une fonction SECURITY DEFINER pour obtenir
-- les org IDs de l'utilisateur SANS déclencher les RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF uuid AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Étape 2 : Supprimer les anciennes politiques récursives
DROP POLICY IF EXISTS "rls_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "rls_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "rls_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "rls_members_delete" ON public.organization_members;

DROP POLICY IF EXISTS "rls_teams_select" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_insert" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_update" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_delete" ON public.team_assignments;

DROP POLICY IF EXISTS "rls_org_select" ON public.organizations;
DROP POLICY IF EXISTS "rls_org_update" ON public.organizations;

-- Étape 3 : Recréer les politiques SANS récursion

-- Organizations : visibles par les membres (via la fonction)
CREATE POLICY "rls_org_select" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.get_user_organization_ids())
    OR created_by = auth.uid()
  );
CREATE POLICY "rls_org_update" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT public.get_user_organization_ids())
  );

-- Organization Members : pas de récursion, on check directement
CREATE POLICY "rls_members_select" ON public.organization_members
  FOR SELECT USING (
    -- Un membre peut voir tous les membres de ses propres organisations
    organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_members_insert" ON public.organization_members
  FOR INSERT WITH CHECK (
    -- Auto-insertion (rejoindre) ou manager qui ajoute
    user_id = auth.uid()
    OR organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_members_update" ON public.organization_members
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_members_delete" ON public.organization_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.get_user_organization_ids())
  );

-- Team Assignments : via la fonction
CREATE POLICY "rls_teams_select" ON public.team_assignments
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_teams_insert" ON public.team_assignments
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_teams_update" ON public.team_assignments
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );
CREATE POLICY "rls_teams_delete" ON public.team_assignments
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );
