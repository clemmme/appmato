-- ==============================================================================
-- Ajout de la Politique de Suppression pour les conversations (Chat)
-- ==============================================================================

-- 1. Autoriser la suppression des canaux par leurs membres
CREATE POLICY "Les membres peuvent supprimer le canal"
ON public.chat_channels FOR DELETE TO authenticated
USING (public.is_chat_member(id));
