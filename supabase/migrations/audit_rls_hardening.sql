-- ==========================================
-- AUDIT & DURCISSEMENT RLS (PHASE 9)
-- Sécurisation Multi-Tenant (Cabinets isolés hermétiquement)
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ---------------------------------------------------------
-- 1. FONCTION DE VISIBILITÉ DE CABINET (Toutes tables)
-- Identifie tous les collègues d'un utilisateur au sein de ses cabinets.
-- Sécurisé: Ne retourne rien si l'utilisateur est 'solo'.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cabinet_users()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT user_id FROM public.organization_members 
  WHERE organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------
-- 2. DURCISSEMENT : CLIENTS
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "rls_clients_select" ON public.clients;
DROP POLICY IF EXISTS "rls_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "rls_clients_update" ON public.clients;
DROP POLICY IF EXISTS "rls_clients_delete" ON public.clients;

-- Lecture/Modif : Le client m'appartient OU appartient à qqn de mon cabinet
CREATE POLICY "rls_clients_select" ON public.clients FOR SELECT USING (
  user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users())
);
CREATE POLICY "rls_clients_update" ON public.clients FOR UPDATE USING (
  user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users())
);
CREATE POLICY "rls_clients_delete" ON public.clients FOR DELETE USING (
  user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users())
);

-- Insertion : Je ne peux créer un client qu'en mon nom (je serai le owner initial)
CREATE POLICY "rls_clients_insert" ON public.clients FOR INSERT WITH CHECK (
  user_id = auth.uid()
);


-- ---------------------------------------------------------
-- 3. DURCISSEMENT : TABLES DÉPENDANTES DU CLIENT (TVA, Bilan, Cloture)
-- ---------------------------------------------------------

-- TVA
DROP POLICY IF EXISTS "rls_tva_select" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_insert" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_update" ON public.tva_history;
DROP POLICY IF EXISTS "rls_tva_delete" ON public.tva_history;

CREATE POLICY "rls_tva_select" ON public.tva_history FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_tva_insert" ON public.tva_history FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_tva_update" ON public.tva_history FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_tva_delete" ON public.tva_history FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);

-- BILAN
DROP POLICY IF EXISTS "rls_bilan_select" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_insert" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_update" ON public.bilan_cycles;
DROP POLICY IF EXISTS "rls_bilan_delete" ON public.bilan_cycles;

CREATE POLICY "rls_bilan_select" ON public.bilan_cycles FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_bilan_insert" ON public.bilan_cycles FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_bilan_update" ON public.bilan_cycles FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_bilan_delete" ON public.bilan_cycles FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);

-- CLOTURE
DROP POLICY IF EXISTS "rls_cloture_select" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_insert" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_update" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "rls_cloture_delete" ON public.cloture_annuelle;

CREATE POLICY "rls_cloture_select" ON public.cloture_annuelle FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_cloture_insert" ON public.cloture_annuelle FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_cloture_update" ON public.cloture_annuelle FOR UPDATE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);
CREATE POLICY "rls_cloture_delete" ON public.cloture_annuelle FOR DELETE USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users()))
);


-- ---------------------------------------------------------
-- 4. DURCISSEMENT : TIME ENTRIES (Agenda, Temps, RDV)
-- Gère également l'accès des invités (guest_id) depuis la Phase 7
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "rls_time_select" ON public.time_entries;
DROP POLICY IF EXISTS "rls_time_insert" ON public.time_entries;
DROP POLICY IF EXISTS "rls_time_update" ON public.time_entries;
DROP POLICY IF EXISTS "rls_time_delete" ON public.time_entries;
-- Suppression des vieilles politiques additionnelles si existantes
DROP POLICY IF EXISTS "time_entries_select_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update_policy" ON public.time_entries;

-- Le créateur, l'invité, ET les membres du cabinet peuvent lire pour alimenter les KPIs Cabinet
CREATE POLICY "rls_time_select" ON public.time_entries FOR SELECT USING (
  user_id = auth.uid() OR guest_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users())
);

-- Seul le créateur ou l'invité peuvent modifier (l'invité modifie le guest_status)
CREATE POLICY "rls_time_update" ON public.time_entries FOR UPDATE USING (
  user_id = auth.uid() OR guest_id = auth.uid()
);

-- Création et Suppression réservées au Owner
CREATE POLICY "rls_time_insert" ON public.time_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "rls_time_delete" ON public.time_entries FOR DELETE USING (user_id = auth.uid());


-- ---------------------------------------------------------
-- 5. DURCISSEMENT : CTRL ENTRY (Suivi Interne)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "rls_ctrl_select" ON public.ctrl_entry;
DROP POLICY IF EXISTS "rls_ctrl_insert" ON public.ctrl_entry;
DROP POLICY IF EXISTS "rls_ctrl_update" ON public.ctrl_entry;
DROP POLICY IF EXISTS "rls_ctrl_delete" ON public.ctrl_entry;

CREATE POLICY "rls_ctrl_select" ON public.ctrl_entry FOR SELECT USING (
  user_id = auth.uid() OR user_id IN (SELECT public.get_cabinet_users())
);
CREATE POLICY "rls_ctrl_insert" ON public.ctrl_entry FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "rls_ctrl_update" ON public.ctrl_entry FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "rls_ctrl_delete" ON public.ctrl_entry FOR DELETE USING (user_id = auth.uid());


-- FIN DE L'AUDIT DE SÉCURITÉ RLS (PHASE 9)
