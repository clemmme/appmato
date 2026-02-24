-- ==========================================
-- SCRIPT DE RÉSOLUTION ABSOLUE DU BUG D'ÉQUIPE
-- Ce script nettoie TOUT l'ancien système de sécurité sur les membres et les profils
-- et installe des règles ultra-sécurisées et performantes sans aucun conflit.
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ---------------------------------------------------------
-- 1. NETTOYAGE PROFOND DES ANCIENNES SÉCURITÉS
-- ---------------------------------------------------------
-- Ce bloc efface absolument toutes les règles RLS sur les profils et les membres
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('organization_members', 'profiles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- ---------------------------------------------------------
-- 2. CRÉATION DES NOUVELLES FONCTIONS ANTI-BOUCLE
-- ---------------------------------------------------------

-- Fonction pour savoir directement si un utilisateur fait partie d'un cabinet
CREATE OR REPLACE FUNCTION public.is_member_of(check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = check_org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction pour voir les profils de son équipe
CREATE OR REPLACE FUNCTION public.get_visible_users()
RETURNS SETOF uuid AS $$
DECLARE
  v_role text;
  v_org_id uuid;
BEGIN
  -- L'utilisateur se voit toujours lui-même
  RETURN NEXT auth.uid();
  
  -- Récupère son cabinet et son rôle
  SELECT role, organization_id INTO v_role, v_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_role = 'manager' THEN
    -- Le gérant voit tous les membres
    RETURN QUERY SELECT user_id FROM public.organization_members WHERE organization_id = v_org_id;
  ELSIF v_role = 'team_lead' THEN
    -- Le chef de mission voit ses salariés + le gérant
    RETURN QUERY SELECT collaborator_id FROM public.team_assignments WHERE team_lead_id = auth.uid() AND organization_id = v_org_id;
    RETURN QUERY SELECT user_id FROM public.organization_members WHERE organization_id = v_org_id AND role = 'manager';
  ELSIF v_role = 'collaborator' THEN
    -- Le salarié voit ses managers/chefs
    RETURN QUERY SELECT user_id FROM public.organization_members WHERE organization_id = v_org_id AND role IN ('manager', 'team_lead');
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------
-- 3. APPLICATION DES NOUVELLES RÈGLES
-- ---------------------------------------------------------

-- 🔹 SÉCURITÉ DES MEMBRES DU CABINET (organization_members)
-- Voir les membres : autorisé si on fait partie du cabinet (public.is_member_of)
CREATE POLICY "rls_members_select_v2" ON public.organization_members 
  FOR SELECT USING (public.is_member_of(organization_id));

-- Rejoindre le cabinet : autorisé si on s'ajoute soi-même, ou si un membre nous y ajoute
CREATE POLICY "rls_members_insert_v2" ON public.organization_members 
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_member_of(organization_id));

CREATE POLICY "rls_members_update_v2" ON public.organization_members 
  FOR UPDATE USING (public.is_member_of(organization_id));

CREATE POLICY "rls_members_delete_v2" ON public.organization_members 
  FOR DELETE USING (user_id = auth.uid() OR public.is_member_of(organization_id));


-- 🔹 SÉCURITÉ DES PROFILS (profiles)
-- Lire un profil (nom, email) : Autorisé uniquement pour les personnes de la même équipe
CREATE POLICY "rls_profiles_select_v2" ON public.profiles 
  FOR SELECT USING (id IN (SELECT public.get_visible_users()));

CREATE POLICY "rls_profiles_update_v2" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "rls_profiles_insert_v2" ON public.profiles 
  FOR INSERT WITH CHECK (id = auth.uid());
