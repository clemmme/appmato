-- ==========================================
-- PULSE FEED & NOTIFICATIONS SCHEMA (V4 - TOTALEMENT IDEMPOTENT)
-- ==========================================

-- 1. S'assurer que les tables existent et ont les bonnes colonnes
-- Note: On utilise ALTER TABLE pour ajouter les colonnes si elles manquent

-- pulse_posts
CREATE TABLE IF NOT EXISTS public.pulse_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.pulse_posts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- pulse_comments
CREATE TABLE IF NOT EXISTS public.pulse_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.pulse_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.pulse_comments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- pulse_likes
CREATE TABLE IF NOT EXISTS public.pulse_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.pulse_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, user_id)
);
ALTER TABLE public.pulse_likes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    entity_id UUID,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ==========================================
-- 2. INDEX & SECURITE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_pulse_posts_org ON public.pulse_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulse_comments_org ON public.pulse_comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pulse_likes_org ON public.pulse_likes(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);

ALTER TABLE public.pulse_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Nettoyage de TOUTES les versions de politiques possibles
DROP POLICY IF EXISTS "Users can view all posts" ON public.pulse_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.pulse_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.pulse_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.pulse_posts;
DROP POLICY IF EXISTS "Users can view posts from their organization" ON public.pulse_posts;
DROP POLICY IF EXISTS "Users can create posts in their organization" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_select" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_insert" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_update" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_delete" ON public.pulse_posts;

DROP POLICY IF EXISTS "Users can view all comments" ON public.pulse_comments;
DROP POLICY IF EXISTS "Users can view comments from their organization" ON public.pulse_comments;
DROP POLICY IF EXISTS "Users can add comments in their organization" ON public.pulse_comments;
DROP POLICY IF EXISTS "pulse_comments_select" ON public.pulse_comments;
DROP POLICY IF EXISTS "pulse_comments_insert" ON public.pulse_comments;

DROP POLICY IF EXISTS "Users can view likes from their organization" ON public.pulse_likes;
DROP POLICY IF EXISTS "Users can toggle likes in their organization" ON public.pulse_likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.pulse_likes;
DROP POLICY IF EXISTS "pulse_likes_select" ON public.pulse_likes;
DROP POLICY IF EXISTS "pulse_likes_insert" ON public.pulse_likes;
DROP POLICY IF EXISTS "pulse_likes_delete" ON public.pulse_likes;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications (read status)" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

-- 3. RECREATION DES POLITIQUES ISOLÉES
-- Posts
CREATE POLICY "pulse_posts_select" ON public.pulse_posts FOR SELECT
USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pulse_posts_insert" ON public.pulse_posts FOR INSERT
WITH CHECK (auth.uid() = author_id AND organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pulse_posts_update" ON public.pulse_posts FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "pulse_posts_delete" ON public.pulse_posts FOR DELETE
USING (auth.uid() = author_id);

-- Comments
CREATE POLICY "pulse_comments_select" ON public.pulse_comments FOR SELECT
USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pulse_comments_insert" ON public.pulse_comments FOR INSERT
WITH CHECK (auth.uid() = author_id AND organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

-- Likes
CREATE POLICY "pulse_likes_select" ON public.pulse_likes FOR SELECT
USING (organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pulse_likes_insert" ON public.pulse_likes FOR INSERT
WITH CHECK (auth.uid() = user_id AND organization_id IN (SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "pulse_likes_delete" ON public.pulse_likes FOR DELETE
USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 4. STOCKAGE (BUCKET)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pulse-media', 'pulse-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'pulse-media');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pulse-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE USING (bucket_id = 'pulse-media' AND auth.uid() = owner);