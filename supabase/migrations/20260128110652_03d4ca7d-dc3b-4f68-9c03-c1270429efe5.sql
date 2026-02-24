-- Add CRM fields to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS manager_email text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text DEFAULT '';

-- Billing section (annual fees by type)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS fee_compta numeric DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS fee_social numeric DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS fee_juridique numeric DEFAULT 0;

-- Volume metrics
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invoices_per_month integer DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS entries_count integer DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS establishments_count integer DEFAULT 1;