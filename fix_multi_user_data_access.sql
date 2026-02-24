-- ==========================================
-- FIX : ACCÈS AUX DONNÉES DU CABINET ET PROFILS
-- Ce script résout le problème du "compte invisible" et "silence radio" sur les dossiers
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ---------------------------------------------------------
-- 1. FONCTION DE VISIBILITÉ MULTI-UTILISATEURS
-- ---------------------------------------------------------
-- Détermine quels utilisateurs le membre actuel a le droit de voir (pour les dossiers/clients)
CREATE OR REPLACE FUNCTION public.get_visible_users()
RETURNS SETOF uuid AS $$
DECLARE
  v_role text;
  v_org_id uuid;
BEGIN
  -- L'utilisateur voit toujours ses propres données :
  RETURN NEXT auth.uid();

  -- Vérifier le rôle de l'utilisateur dans son cabinet
  SELECT role, organization_id INTO v_role, v_org_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_role = 'manager' THEN
    -- Le gérant voit les données de TOUS les membres de son cabinet
    RETURN QUERY SELECT user_id FROM public.organization_members WHERE organization_id = v_org_id;
  ELSIF v_role = 'team_lead' THEN
    -- Le chef de mission voit les données des collaborateurs qui lui sont assignés
    RETURN QUERY SELECT collaborator_id FROM public.team_assignments WHERE team_lead_id = auth.uid() AND organization_id = v_org_id;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------
-- 2. CORRECTION RLS: PROFILS (Rend les rattachés visibles au gérant)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "rls_profiles_select" ON public.profiles;

CREATE POLICY "rls_profiles_select" ON public.profiles FOR SELECT USING (
  -- 1) Soi-même
  id = auth.uid()
  OR
  -- 2) Membres des mêmes cabinets
  id IN (
    SELECT user_id 
    FROM public.organization_members 
    WHERE organization_id IN (SELECT public.get_user_organization_ids())
  )
);


-- ---------------------------------------------------------
-- 3. CORRECTION RLS: CLIENTS (Dossiers)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "rls_clients_select" ON public.clients;
DROP POLICY IF EXISTS "rls_clients_update" ON public.clients;
DROP POLICY IF EXISTS "rls_clients_delete" ON public.clients;

-- Un utilisateur voit les dossiers des "utilisateurs visibles" selon son rôle
CREATE POLICY "rls_clients_select" ON public.clients
  FOR SELECT USING (user_id IN (SELECT public.get_visible_users()));

CREATE POLICY "rls_clients_update" ON public.clients
  FOR UPDATE USING (user_id IN (SELECT public.get_visible_users()));

CREATE POLICY "rls_clients_delete" ON public.clients
  FOR DELETE USING (user_id IN (SELECT public.get_visible_users()));


-- ---------------------------------------------------------
-- 4. CORRECTION RLS: TABLES DÉPENDANTES DU CLIENT
-- (TVA, Bilan, Cloture, etc.)
-- ---------------------------------------------------------

-- TVA HISTORY
DROP POLICY IF EXISTS "rls_tva_select" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_insert" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_update" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_delete" ON public.tva_history;

CREATE POLICY "rls_tva_select" ON public.tva_history FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_tva_insert" ON public.tva_history FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_tva_update" ON public.tva_history FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_tva_delete" ON public.tva_history FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);


-- BILAN CYCLES
DROP POLICY IF EXISTS "rls_bilan_select" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_insert" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_update" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_delete" ON public.bilan_cycles;

CREATE POLICY "rls_bilan_select" ON public.bilan_cycles FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_bilan_insert" ON public.bilan_cycles FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_bilan_update" ON public.bilan_cycles FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_bilan_delete" ON public.bilan_cycles FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);


-- CLOTURE ANNUELLE
DROP POLICY IF EXISTS "rls_cloture_select" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_insert" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_update" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_delete" ON public.cloture_annuelle;

CREATE POLICY "rls_cloture_select" ON public.cloture_annuelle FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_cloture_insert" ON public.cloture_annuelle FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_cloture_update" ON public.cloture_annuelle FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);
CREATE POLICY "rls_cloture_delete" ON public.cloture_annuelle FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id IN (SELECT public.get_visible_users()))
);


-- ---------------------------------------------------------
-- 5. CORRECTION RLS: TIME ENTRIES & CTRL ENTRY
-- (Basé sur user_id)
-- ---------------------------------------------------------

-- TIME ENTRIES
DROP POLICY IF EXISTS "rls_time_select" ON public.time_entries;
DROP POLICY IF EXISTS "rls_time_update" ON public.time_entries;
DROP POLICY IF EXISTS "rls_time_delete" ON public.time_entries;

CREATE POLICY "rls_time_select" ON public.time_entries FOR SELECT USING (user_id IN (SELECT public.get_visible_users()));
CREATE POLICY "rls_time_update" ON public.time_entries FOR UPDATE USING (user_id IN (SELECT public.get_visible_users()));
CREATE POLICY "rls_time_delete" ON public.time_entries FOR DELETE USING (user_id IN (SELECT public.get_visible_users()));

-- CTRL ENTRY
DROP POLICY IF EXISTS "rls_ctrl_select" ON public.ctrl_entry;
DROP POLICY IF EXISTS "rls_ctrl_update" ON public.ctrl_entry;
DROP POLICY IF EXISTS "rls_ctrl_delete" ON public.ctrl_entry;

CREATE POLICY "rls_ctrl_select" ON public.ctrl_entry FOR SELECT USING (user_id IN (SELECT public.get_visible_users()));
CREATE POLICY "rls_ctrl_update" ON public.ctrl_entry FOR UPDATE USING (user_id IN (SELECT public.get_visible_users()));
CREATE POLICY "rls_ctrl_delete" ON public.ctrl_entry FOR DELETE USING (user_id IN (SELECT public.get_visible_users()));
