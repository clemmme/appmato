-- ==========================================
-- SCHÉMA DE BASE DE DONNÉES APPMATOGEST
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE regime_type AS ENUM ('M', 'T', 'A', 'N');
CREATE TYPE item_status AS ENUM ('ask', 'done', 'na');
CREATE TYPE supervision_status_type AS ENUM ('waiting', 'scheduled', 'validated');
CREATE TYPE entry_type_enum AS ENUM ('client', 'internal', 'absence');
CREATE TYPE event_category_enum AS ENUM ('work', 'meeting', 'supervision', 'revision');

-- ==========================================
-- 3. CRÉATION DES TABLES
-- ==========================================

-- Table: profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: clients
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ref text NOT NULL,
  form text NOT NULL,
  name text NOT NULL,
  regime regime_type NOT NULL,
  day text NOT NULL,
  siren text,
  code_ape text,
  closing_date text,
  annual_fee numeric,
  manager_email text,
  phone text,
  address text,
  fee_compta numeric,
  fee_social numeric,
  fee_juridique numeric,
  invoices_per_month integer,
  entries_count integer,
  establishments_count integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: tva_history
CREATE TABLE public.tva_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  step_compta boolean NOT NULL DEFAULT false,
  step_saisie boolean NOT NULL DEFAULT false,
  step_revise boolean NOT NULL DEFAULT false,
  step_calcul boolean NOT NULL DEFAULT false,
  step_tele boolean NOT NULL DEFAULT false,
  step_valide boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: bilan_cycles
CREATE TABLE public.bilan_cycles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_id text NOT NULL,
  revision_level integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  critical_points text[],
  rdv_chef_date text,
  supervision_mode boolean DEFAULT false,
  supervision_status supervision_status_type DEFAULT 'waiting',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE(client_id, cycle_id)
);

-- Table: time_entries
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  entry_type entry_type_enum NOT NULL,
  event_category event_category_enum,
  start_time time without time zone,
  mission_type text,
  internal_type text,
  absence_type text,
  duration_hours numeric NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Table: cloture_annuelle
CREATE TABLE public.cloture_annuelle (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercice text NOT NULL,
  rdv_bilan_date date,
  rdv_bilan_time time without time zone,
  rdv_bilan_duration integer,
  rdv_bilan_done boolean DEFAULT false,
  liasse_montee boolean DEFAULT false,
  liasse_validee boolean DEFAULT false,
  liasse_envoyee boolean DEFAULT false,
  liasse_accuse_dgfip boolean DEFAULT false,
  capital_social numeric,
  benefice_net numeric,
  reserve_legale_actuelle numeric,
  reserve_legale_dotation numeric,
  affectation_dividendes numeric,
  affectation_report numeric,
  continuite_exploitation boolean DEFAULT true,
  conventions_reglementees jsonb DEFAULT '[]'::jsonb,
  remuneration_gerant numeric,
  charges_sociales_gerant numeric,
  fec_genere boolean DEFAULT false,
  fec_envoye boolean DEFAULT false,
  exercice_cloture boolean DEFAULT false,
  status text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE(client_id, exercice)
);

-- Table: ctrl_entry (Added from earlier types if needed)
CREATE TABLE public.ctrl_entry (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period text NOT NULL,
  solde_start numeric NOT NULL DEFAULT 0,
  solde_end numeric NOT NULL DEFAULT 0,
  ca_20 numeric NOT NULL DEFAULT 0,
  ca_10 numeric NOT NULL DEFAULT 0,
  ca_55 numeric NOT NULL DEFAULT 0,
  ca_0 numeric NOT NULL DEFAULT 0,
  tva_declared numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tva_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bilan_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloture_annuelle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctrl_entry ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "rls_profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "rls_profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "rls_profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Clients: Users can only access THEIR OWN clients
CREATE POLICY "rls_clients_select" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rls_clients_insert" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rls_clients_update" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rls_clients_delete" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- TVA History: Access only if the client belongs to the user
CREATE POLICY "rls_tva_select" ON public.tva_history FOR SELECT USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_tva_insert" ON public.tva_history FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_tva_update" ON public.tva_history FOR UPDATE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_tva_delete" ON public.tva_history FOR DELETE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Bilan Cycles: Access only if the client belongs to the user
CREATE POLICY "rls_bilan_select" ON public.bilan_cycles FOR SELECT USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_bilan_insert" ON public.bilan_cycles FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_bilan_update" ON public.bilan_cycles FOR UPDATE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_bilan_delete" ON public.bilan_cycles FOR DELETE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Time Entries: Users can only access their own
CREATE POLICY "rls_time_select" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rls_time_insert" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rls_time_update" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rls_time_delete" ON public.time_entries FOR DELETE USING (auth.uid() = user_id);

-- Cloture Annuelle: Access only if the client belongs to the user
CREATE POLICY "rls_cloture_select" ON public.cloture_annuelle FOR SELECT USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_cloture_insert" ON public.cloture_annuelle FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_cloture_update" ON public.cloture_annuelle FOR UPDATE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));
CREATE POLICY "rls_cloture_delete" ON public.cloture_annuelle FOR DELETE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Ctrl Entry: Users can only access their own
CREATE POLICY "rls_ctrl_select" ON public.ctrl_entry FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rls_ctrl_insert" ON public.ctrl_entry FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rls_ctrl_update" ON public.ctrl_entry FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rls_ctrl_delete" ON public.ctrl_entry FOR DELETE USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- ==========================================
-- 5. FUNCTION & TRIGGERS
-- ==========================================

-- Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, has_completed_tutorial)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

