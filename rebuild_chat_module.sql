-- ==============================================================================
-- REBUILD COMPLET : Module de Messagerie (Chat) Interne au Cabinet
-- Ce script nettoie l'existant, recrée les tables avec les bonnes relations
-- (vers public.profiles), et force le rafraîchissement du cache de Supabase (PostgREST).
-- ==============================================================================

BEGIN;

-- 1. Nettoyage Brutal de l'existant
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_members CASCADE;
DROP TABLE IF EXISTS public.chat_channels CASCADE;
DROP FUNCTION IF EXISTS public.is_chat_member CASCADE;

-- 2. Création de la Table des canaux de discussion (Channels)
CREATE TABLE public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Création de la Table des membres par canal (Membres)
-- CRITIQUE : La Foreign Key pointe bien vers public.profiles(id) pour la jointure GraphQL
CREATE TABLE public.chat_members (
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (channel_id, user_id)
);

-- 4. Création de la Table des messages
-- CRITIQUE : La Foreign Key pointe bien vers public.profiles(id) pour la jointure GraphQL
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of user UUIDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEX & PERFORMANCES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON public.chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);

-- ==============================================================================
-- SECURITE (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Fonction SECURITY DEFINER pour éviter la boucle infinie (Infinite Recursion)
CREATE OR REPLACE FUNCTION public.is_chat_member(channel_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM chat_members WHERE channel_id = channel_uuid AND user_id = auth.uid()
    );
$$;

-- ------------------------------------------------------------------------------
-- CHANNELS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Les membres peuvent créer des canaux dans leur org"
ON public.chat_channels FOR INSERT TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Les membres peuvent voir leurs canaux"
ON public.chat_channels FOR SELECT TO authenticated
USING (
    public.is_chat_member(id) OR created_by = auth.uid()
);

CREATE POLICY "Les membres du canal peuvent le modifier"
ON public.chat_channels FOR UPDATE TO authenticated
USING (public.is_chat_member(id));

-- ------------------------------------------------------------------------------
-- MEMBERS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Les membres voient les participants"
ON public.chat_members FOR SELECT TO authenticated
USING (
    public.is_chat_member(channel_id) OR
    channel_id IN (SELECT id FROM public.chat_channels WHERE created_by = auth.uid())
);

CREATE POLICY "Les membres peuvent ajouter des participants"
ON public.chat_members FOR INSERT TO authenticated
WITH CHECK (
    public.is_chat_member(channel_id) OR 
    channel_id IN (SELECT id FROM public.chat_channels WHERE created_by = auth.uid())
);

CREATE POLICY "Mise à jour de son propre statut"
ON public.chat_members FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "On peut quitter un canal"
ON public.chat_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- MESSAGES RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Les membres peuvent lire les messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (public.is_chat_member(channel_id));

CREATE POLICY "Les membres peuvent envoyer des messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
    sender_id = auth.uid() AND public.is_chat_member(channel_id)
);

CREATE POLICY "L'auteur peut modifier son message"
ON public.chat_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

-- ==============================================================================
-- TEMPS RÉEL (REALTIME)
-- ==============================================================================
--- NOTE: Si les tables étaient déjà dans la publication, l'ajout peut échouer, on ignore gentiment.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channels'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore error if realtime publish fails
END;
$$;

COMMIT;

-- ==============================================================================
-- FORCE CACHE RELOAD PostgREST
-- Cette ligne est EXTRÊMEMENT IMPORTANTE, c'est elle qui règle l'erreur
-- "Could not find a relationship" (le cache de Supabase est bloqué sur l'ancien schéma)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
