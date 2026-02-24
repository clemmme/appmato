-- ==========================================
-- FIX : Code d'invitation insensible à la casse
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- Met à jour la fonction pour utiliser "lower()" sur la comparaison
CREATE OR REPLACE FUNCTION public.find_organization_by_code(code text)
RETURNS TABLE(id uuid, name text) AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.name 
  FROM public.organizations o 
  WHERE lower(o.invite_code) = lower(code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
