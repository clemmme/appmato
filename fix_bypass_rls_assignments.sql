-- ==========================================
-- SÉCURISATION DÉFINITIVE DES ASSIGNATIONS D'ÉQUIPE
-- Bypass des RLS sur team_assignments pour assurer que le gérant
-- voit toujours l'organigramme (Chef de mission <-> Salarié)
-- À exécuter dans le SQL Editor de Supabase
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_cabinet_assignments(p_org_id uuid)
RETURNS TABLE(
  id uuid,
  organization_id uuid,
  team_lead_id uuid,
  collaborator_id uuid,
  created_at timestamptz
) AS $$
BEGIN
  -- Vérifier que l'appelant est bien membre de ce cabinet
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = p_org_id 
    AND organization_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé : vous ne faites pas partie de ce cabinet';
  END IF;
  
  -- Retourner toutes les assignations du cabinet
  RETURN QUERY
  SELECT 
    ta.id,
    ta.organization_id,
    ta.team_lead_id,
    ta.collaborator_id,
    ta.created_at
  FROM public.team_assignments ta
  WHERE ta.organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
