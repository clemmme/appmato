-- ==========================================
-- SCRIPT FINAL : CORRECTION VISIBILITÉ DE L'ÉQUIPE
-- Ce script remplace toutes les règles RLS précédentes qui empêchaient
-- l'affichage du salarié dans "Gérer l'équipe"
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- 1. FONCTION DE SÉCURITÉ (Évite l'erreur de boucle infinie sur organization_members)
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF uuid AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. CORRECTION RLS : ORGANIZATION_MEMBERS
DROP POLICY IF EXISTS "rls_members_select" ON public.organization_members;
CREATE POLICY "rls_members_select" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organization_ids())
  );

DROP POLICY IF EXISTS "rls_members_insert" ON public.organization_members;
CREATE POLICY "rls_members_insert" ON public.organization_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR organization_id IN (SELECT public.get_user_organization_ids())
  );
DROP POLICY IF EXISTS "rls_members_update" ON public.organization_members;
CREATE POLICY "rls_members_update" ON public.organization_members
  FOR UPDATE USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "rls_members_delete" ON public.organization_members;
CREATE POLICY "rls_members_delete" ON public.organization_members
  FOR DELETE USING (
    user_id = auth.uid() OR organization_id IN (SELECT public.get_user_organization_ids())
  );

-- 3. CORRECTION RLS : PROFILES (Autorise le gérant à lire le nom/email du salarié)
DROP POLICY IF EXISTS "rls_profiles_select" ON public.profiles;
CREATE POLICY "rls_profiles_select" ON public.profiles FOR SELECT USING (
  -- On peut voir son propre profil
  id = auth.uid()
  OR
  -- On peut voir le profil des membres de ses cabinets
  id IN (
    SELECT user_id 
    FROM public.organization_members 
    WHERE organization_id IN (SELECT public.get_user_organization_ids())
  )
);
