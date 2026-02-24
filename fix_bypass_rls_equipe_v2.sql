-- ==========================================
-- CORRECTION DÉFINITIVE : BYPASS RLS SANS AVATAR_URL
-- Ce script corrige l'erreur "column p.avatar_url does not exist"
-- car la table profiles d'origine ne contenait pas cette colonne.
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

-- ---------------------------------------------------------
-- FONCTION POUR RÉCUPÉRER LES MEMBRES D'UN CABINET
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cabinet_members(p_org_id uuid)
RETURNS TABLE(
  member_id uuid,
  member_org_id uuid,
  member_user_id uuid,
  member_role text,
  member_created_at timestamptz,
  profile_full_name text,
  profile_email text
) AS $$
BEGIN
  -- Vérifier que l'appelant est bien membre de ce cabinet
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé : vous ne faites pas partie de ce cabinet';
  END IF;
  
  -- Retourner tous les membres avec leur profil (SANS avatar_url qui n'existe pas)
  RETURN QUERY
  SELECT 
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.created_at,
    p.full_name,
    p.email
  FROM public.organization_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.organization_id = p_org_id
  ORDER BY 
    CASE om.role 
      WHEN 'manager' THEN 1 
      WHEN 'team_lead' THEN 2 
      WHEN 'collaborator' THEN 3 
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
