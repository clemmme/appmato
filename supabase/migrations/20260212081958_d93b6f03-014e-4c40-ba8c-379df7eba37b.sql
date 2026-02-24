
-- 1. Add supervision_status column to bilan_cycles
ALTER TABLE public.bilan_cycles 
ADD COLUMN IF NOT EXISTS supervision_status text DEFAULT 'waiting';

-- 2. Add start_time and event_category columns to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS start_time text DEFAULT NULL;

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS event_category text DEFAULT NULL;

-- 3. Create cloture_annuelle table
CREATE TABLE IF NOT EXISTS public.cloture_annuelle (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercice text NOT NULL DEFAULT '',
  rdv_bilan_date date DEFAULT NULL,
  rdv_bilan_time text DEFAULT NULL,
  rdv_bilan_duration integer DEFAULT 60,
  rdv_bilan_done boolean DEFAULT false,
  liasse_montee boolean DEFAULT false,
  liasse_validee boolean DEFAULT false,
  liasse_envoyee boolean DEFAULT false,
  liasse_accuse_dgfip boolean DEFAULT false,
  capital_social numeric DEFAULT 0,
  benefice_net numeric DEFAULT 0,
  reserve_legale_actuelle numeric DEFAULT 0,
  reserve_legale_dotation numeric DEFAULT 0,
  affectation_dividendes numeric DEFAULT NULL,
  affectation_report numeric DEFAULT NULL,
  continuite_exploitation boolean DEFAULT true,
  conventions_reglementees jsonb DEFAULT '[]'::jsonb,
  remuneration_gerant numeric DEFAULT 0,
  charges_sociales_gerant numeric DEFAULT 0,
  fec_genere boolean DEFAULT false,
  fec_envoye boolean DEFAULT false,
  exercice_cloture boolean DEFAULT false,
  status text DEFAULT 'rdv_bilan',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cloture_annuelle ENABLE ROW LEVEL SECURITY;

-- RLS policies for cloture_annuelle (via clients ownership)
CREATE POLICY "Users can view own cloture data"
ON public.cloture_annuelle FOR SELECT
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = cloture_annuelle.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can insert own cloture data"
ON public.cloture_annuelle FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = cloture_annuelle.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can update own cloture data"
ON public.cloture_annuelle FOR UPDATE
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = cloture_annuelle.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Users can delete own cloture data"
ON public.cloture_annuelle FOR DELETE
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = cloture_annuelle.client_id AND clients.user_id = auth.uid()));
