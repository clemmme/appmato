-- Add supervision fields to bilan_cycles
ALTER TABLE public.bilan_cycles 
ADD COLUMN IF NOT EXISTS supervision_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rdv_chef_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS critical_points jsonb DEFAULT '[]'::jsonb;