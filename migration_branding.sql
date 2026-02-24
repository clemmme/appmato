-- ==========================================
-- Migration : Personnalisation Cabinet (branding)
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- Ajouter les colonnes de branding à la table organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_bg_color text DEFAULT NULL;

-- brand_primary_color : code hex de la couleur d'accent (#F97316 par défaut = orange)
-- brand_bg_color : code hex de la couleur de fond (#FAFAFA light / #0D1117 dark par défaut)

COMMENT ON COLUMN public.organizations.brand_primary_color IS 'Couleur principale du cabinet (hex, ex: #F97316)';
COMMENT ON COLUMN public.organizations.brand_bg_color IS 'Couleur de fond du cabinet (hex, ex: #FAFAFA)';
