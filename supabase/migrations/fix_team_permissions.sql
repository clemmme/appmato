-- ==========================================
-- SÉCURISATION DES ACTIONS DE GESTION D'ÉQUIPE (UPDATE/DELETE)
-- Restreint les modifications de rôles et la suppression de membres
-- aux utilisateurs ayant les droits suffisants (Gérants).
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ---------------------------------------------------------
-- 1. FONCTION DE VÉRIFICATION DES DROITS MANAGER
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_manager_of(check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = check_org_id 
    AND user_id = auth.uid()
    AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------
-- 2. CORRECTION RLS : ORGANIZATION_MEMBERS (Modifications)
-- ---------------------------------------------------------
-- On supprime les anciennes règles d'Update/Delete trop permissives
DROP POLICY IF EXISTS "rls_members_update_v2" ON public.organization_members;
DROP POLICY IF EXISTS "rls_members_delete_v2" ON public.organization_members;

-- Nouveau : Seul un MANAGER d'une org peut modifier un rôle
CREATE POLICY "rls_members_update_v3" ON public.organization_members 
  FOR UPDATE USING (public.is_manager_of(organization_id));

-- Nouveau : Un membre peut se supprimer lui-même (quitter le cabinet), 
-- ou un MANAGER peut supprimer n'importe quel membre
CREATE POLICY "rls_members_delete_v3" ON public.organization_members 
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_manager_of(organization_id)
  );


-- ---------------------------------------------------------
-- 3. CORRECTION RLS : TEAM_ASSIGNMENTS (Assignations)
-- ---------------------------------------------------------
-- Nettoyage des éventuelles anciennes politiques
DROP POLICY IF EXISTS "rls_teams_select" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_insert" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_update" ON public.team_assignments;
DROP POLICY IF EXISTS "rls_teams_delete" ON public.team_assignments;

-- La sélection (lecture) est gérée par la RPC get_cabinet_assignments, 
-- mais on garde une politique SELECT basique pour la cohésion
CREATE POLICY "rls_teams_select_v2" ON public.team_assignments 
  FOR SELECT USING (public.is_member_of(organization_id));

-- Insertion/Modification/Suppression : Réservé aux MANAGERS
CREATE POLICY "rls_teams_insert_v2" ON public.team_assignments 
  FOR INSERT WITH CHECK (public.is_manager_of(organization_id));

CREATE POLICY "rls_teams_update_v2" ON public.team_assignments 
  FOR UPDATE USING (public.is_manager_of(organization_id));

CREATE POLICY "rls_teams_delete_v2" ON public.team_assignments 
  FOR DELETE USING (public.is_manager_of(organization_id));
