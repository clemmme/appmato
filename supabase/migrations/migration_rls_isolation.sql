-- ==========================================
-- MIGRATION RLS : ISOLATION DES DONNÉES PAR UTILISATEUR
-- À exécuter dans le SQL Editor de Supabase Studio
-- ==========================================

-- ===========================================================
-- ÉTAPE 1 : Supprimer les anciennes politiques (trop permissives)
-- ===========================================================

-- Clients
DROP POLICY IF EXISTS "Users can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;

-- TVA History
DROP POLICY IF EXISTS "Users can view tva" ON public.tva_history;
DROP POLICY IF EXISTS "Users can insert tva" ON public.tva_history;
DROP POLICY IF EXISTS "Users can update tva" ON public.tva_history;

-- Bilan Cycles
DROP POLICY IF EXISTS "Users can view bilan" ON public.bilan_cycles;
DROP POLICY IF EXISTS "Users can insert bilan" ON public.bilan_cycles;
DROP POLICY IF EXISTS "Users can update bilan" ON public.bilan_cycles;

-- Time Entries
DROP POLICY IF EXISTS "Users can view all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;

-- Cloture Annuelle
DROP POLICY IF EXISTS "Users can view cloture" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "Users can insert cloture" ON public.cloture_annuelle;
DROP POLICY IF EXISTS "Users can update cloture" ON public.cloture_annuelle;

-- Ctrl Entry
DROP POLICY IF EXISTS "Users can view ctrl" ON public.ctrl_entry;
DROP POLICY IF EXISTS "Users can insert ctrl" ON public.ctrl_entry;
DROP POLICY IF EXISTS "Users can update ctrl" ON public.ctrl_entry;


-- ===========================================================
-- ÉTAPE 2 : Nouvelles politiques RLS strictes par utilisateur
-- ===========================================================

-- ===== CLIENTS =====
-- Chaque utilisateur ne voit que SES clients (via user_id)
CREATE POLICY "rls_clients_select" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rls_clients_insert" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rls_clients_update" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "rls_clients_delete" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);


-- ===== TVA HISTORY =====
-- Accessible uniquement si le client appartient à l'utilisateur
CREATE POLICY "rls_tva_select" ON public.tva_history
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_tva_insert" ON public.tva_history
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_tva_update" ON public.tva_history
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_tva_delete" ON public.tva_history
  FOR DELETE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );


-- ===== BILAN CYCLES =====
-- Accessible uniquement si le client appartient à l'utilisateur
CREATE POLICY "rls_bilan_select" ON public.bilan_cycles
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_bilan_insert" ON public.bilan_cycles
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_bilan_update" ON public.bilan_cycles
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_bilan_delete" ON public.bilan_cycles
  FOR DELETE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );


-- ===== TIME ENTRIES =====
-- Chaque utilisateur ne voit que SES entrées de temps
CREATE POLICY "rls_time_select" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rls_time_insert" ON public.time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rls_time_update" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "rls_time_delete" ON public.time_entries
  FOR DELETE USING (auth.uid() = user_id);


-- ===== CLOTURE ANNUELLE =====
-- Accessible uniquement si le client appartient à l'utilisateur
CREATE POLICY "rls_cloture_select" ON public.cloture_annuelle
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_cloture_insert" ON public.cloture_annuelle
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_cloture_update" ON public.cloture_annuelle
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "rls_cloture_delete" ON public.cloture_annuelle
  FOR DELETE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );


-- ===== CTRL ENTRY =====
-- Chaque utilisateur ne voit que SES contrôles TVA
CREATE POLICY "rls_ctrl_select" ON public.ctrl_entry
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rls_ctrl_insert" ON public.ctrl_entry
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rls_ctrl_update" ON public.ctrl_entry
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "rls_ctrl_delete" ON public.ctrl_entry
  FOR DELETE USING (auth.uid() = user_id);


-- ===========================================================
-- ÉTAPE 3 : Profils — Ajout du flag tutoriel
-- ===========================================================

-- Ajout de la colonne has_completed_tutorial
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_tutorial boolean DEFAULT false;

-- Mettre à jour le trigger pour inclure le flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, has_completed_tutorial)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
