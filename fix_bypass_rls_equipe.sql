-- ==========================================
-- SOLUTION DÉFINITIVE : BYPASS RLS POUR L'ÉQUIPE
-- Au lieu de dépendre des RLS (qui se superposent et créent des conflits),
-- on crée des fonctions SECURITY DEFINER qui contournent les RLS.
-- Le frontend appellera ces fonctions au lieu de requêter les tables directement.
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================


-- ---------------------------------------------------------
-- ÉTAPE 1 : DIAGNOSTIC — Vérifier l'état de la base
-- Exécute d'abord cette requête séparément pour voir le résultat :
-- ---------------------------------------------------------
-- SELECT 
--   om.id, om.organization_id, om.user_id, om.role,
--   p.email, p.full_name,
--   o.name as org_name
-- FROM public.organization_members om
-- LEFT JOIN public.profiles p ON p.id = om.user_id
-- LEFT JOIN public.organizations o ON o.id = om.organization_id
-- ORDER BY om.organization_id, om.role;
-- ---------------------------------------------------------
-- ↑ Copie ce bloc (sans les --), exécute-le et dis-moi le résultat !
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- ÉTAPE 2 : FONCTION POUR RÉCUPÉRER LES MEMBRES D'UN CABINET
-- Cette fonction bypass les RLS et vérifie elle-même les droits
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cabinet_members(p_org_id uuid)
RETURNS TABLE(
  member_id uuid,
  member_org_id uuid,
  member_user_id uuid,
  member_role text,
  member_created_at timestamptz,
  profile_full_name text,
  profile_email text,
  profile_avatar_url text
) AS $$
BEGIN
  -- Vérifier que l'appelant est bien membre de ce cabinet
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = p_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé : vous ne faites pas partie de ce cabinet';
  END IF;
  
  -- Retourner tous les membres avec leur profil
  RETURN QUERY
  SELECT 
    om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.created_at,
    p.full_name,
    p.email,
    p.avatar_url
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


-- ---------------------------------------------------------
-- ÉTAPE 3 : FONCTION POUR COMPTER LES MEMBRES (diagnostic)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_cabinet_members(p_org_id uuid)
RETURNS integer AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt 
  FROM public.organization_members 
  WHERE organization_id = p_org_id;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
