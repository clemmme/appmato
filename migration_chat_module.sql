-- ==============================================================================
-- Migration : Module de Messagerie (Chat) Interne au Cabinet
-- ==============================================================================

-- 1. Table des canaux de discussion (Channels)
CREATE TABLE public.chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des membres par canal (Membres)
CREATE TABLE public.chat_members (
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (channel_id, user_id)
);

-- 3. Table des messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of user UUIDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEX & PERFORMANCES
-- ==============================================================================
CREATE INDEX idx_chat_channels_org ON public.chat_channels(organization_id);
CREATE INDEX idx_chat_members_user ON public.chat_members(user_id);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);

-- ==============================================================================
-- SECURITE (Row Level Security - RLS)
-- ==============================================================================

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- CHANNELS RLS
-- Un utilisateur peut voir/créer un canal s'il appartient à la même organisation
-- ET s'il fait partie des membres (ou lors de la création d'un canal direct)
-- ------------------------------------------------------------------------------

-- Règle 1: Lecture (SELECT) des channels de sa propre org auxquels il participe
CREATE POLICY "Les membres peuvent voir leurs canaux"
ON public.chat_channels
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND id IN (
        SELECT channel_id FROM public.chat_members WHERE user_id = auth.uid()
    )
);

-- Règle 2: Insertion (INSERT)
CREATE POLICY "Les membres peuvent créer des canaux dans leur org"
ON public.chat_channels
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

-- Règle 3: Update (Mise à jour du nom par exemple)
CREATE POLICY "Les membres du canal peuvent le modifier"
ON public.chat_channels
FOR UPDATE
TO authenticated
USING (
    id IN (SELECT channel_id FROM public.chat_members WHERE user_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- MEMBERS RLS
-- ------------------------------------------------------------------------------

CREATE POLICY "Les membres voient les participants de leurs canaux"
ON public.chat_members
FOR SELECT
TO authenticated
USING (
    channel_id IN (
        SELECT id FROM public.chat_channels WHERE organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Les membres peuvent ajouter des participants"
ON public.chat_members
FOR INSERT
TO authenticated
WITH CHECK (
    channel_id IN (
        SELECT id FROM public.chat_channels WHERE organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Mise à jour de son propre last_read_at"
ON public.chat_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "On peut quitter un canal"
ON public.chat_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- MESSAGES RLS
-- ------------------------------------------------------------------------------

CREATE POLICY "Les membres d'un canal peuvent lire les messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
    channel_id IN (
        SELECT channel_id FROM public.chat_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Les membres d'un canal peuvent envoyer des messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (
        SELECT channel_id FROM public.chat_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "L'auteur peut modifier son message"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

-- Activer le temps réel (REPLICA IDENTITY) sur messages et membres
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
