import { supabase } from '@/integrations/supabase/client';
import type { PulsePost, PulseComment } from '@/lib/database.types';

export const pulseService = {
    /**
     * Récupérer tous les posts avec leurs auteurs, likes et commentaires
     */
    async getPosts() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        // Récupérer le profil pour avoir l'organization_id actuel
        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) return [];

        const { data, error } = await (supabase
            .from('pulse_posts')
            .select(`
        *,
        author:profiles!pulse_posts_author_id_fkey(id, full_name, avatar_url),
        likes:pulse_likes(user_id),
        comments:pulse_comments(id)
      `)
            .eq('organization_id', profile.current_organization_id)
            .order('created_at', { ascending: false }) as any);

        if (error) throw error;

        // Mapper pour ajouter les compteurs et si l'utilisateur a aimé
        return data.map((post: any) => ({
            ...post,
            likes_count: post.likes?.length || 0,
            comments_count: post.comments?.length || 0,
            is_liked_by_me: post.likes?.some((l: any) => l.user_id === user.id) || false
        })) as PulsePost[];
    },

    /**
     * Créer un nouveau post
     */
    /**
     * Créer un nouveau post
     */
    async createPost(content: string, mediaUrl?: string, mentions: string[] = []) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) throw new Error("Organisation non définie");

        const { data, error } = await supabase
            .from('pulse_posts')
            .insert({
                author_id: user.id,
                organization_id: profile.current_organization_id,
                content,
                media_url: mediaUrl,
                mentions
            })
            .select(`
        *,
        author:profiles!pulse_posts_author_id_fkey(id, full_name, avatar_url)
      `)
            .single();

        if (error) throw error;
        return {
            ...data,
            likes_count: 0,
            comments_count: 0,
            is_liked_by_me: false
        } as PulsePost;
    },

    /**
     * Mettre à jour un post
     */
    async updatePost(postId: string, content: string, mediaUrl?: string, mentions: string[] = []) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        // Verify author
        const { data: postToCheck } = await supabase.from('pulse_posts').select('author_id').eq('id', postId).single();
        if (postToCheck?.author_id !== user.id) throw new Error("Non autorisé à modifier ce post");

        const { data, error } = await supabase
            .from('pulse_posts')
            .update({
                content,
                media_url: mediaUrl,
                mentions,
                updated_at: new Date().toISOString()
            })
            .eq('id', postId)
            .select(`
                *,
                author:profiles!pulse_posts_author_id_fkey(id, full_name, avatar_url)
            `)
            .single();

        if (error) throw error;
        return data as PulsePost;
    },

    /**
     * Supprimer un post
     */
    async deletePost(postId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        // Verify author
        const { data: postToCheck } = await supabase.from('pulse_posts').select('author_id').eq('id', postId).single();
        if (postToCheck?.author_id !== user.id) throw new Error("Non autorisé à supprimer ce post");

        const { error } = await supabase
            .from('pulse_posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;
    },

    /**
     * Liker ou unliker un post
     */
    async toggleLike(postId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) throw new Error("Organisation non définie");

        // Vérifier si déjà liké
        const { data: existing } = await supabase
            .from('pulse_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            await supabase.from('pulse_likes').delete().eq('id', existing.id);
            return false; // Unliked
        } else {
            await supabase.from('pulse_likes').insert({
                post_id: postId,
                user_id: user.id,
                organization_id: profile.current_organization_id
            });
            return true; // Liked
        }
    },

    /**
     * Récupérer les commentaires d'un post
     */
    async getComments(postId: string) {
        const { data, error } = await supabase
            .from('pulse_comments')
            .select(`
        *,
        author:profiles!pulse_comments_author_id_fkey(id, full_name, avatar_url)
      `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as PulseComment[];
    },

    /**
     * Ajouter un commentaire
     */
    async addComment(postId: string, content: string, parentId?: string, mentions: string[] = []) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) throw new Error("Organisation non définie");

        const { data, error } = await supabase
            .from('pulse_comments')
            .insert({
                post_id: postId,
                author_id: user.id,
                organization_id: profile.current_organization_id,
                content,
                parent_id: parentId,
                mentions
            })
            .select(`
        *,
        author:profiles!pulse_comments_author_id_fkey(id, full_name, avatar_url)
      `)
            .single();

        if (error) throw error;
        return data as PulseComment;
    },

    /**
     * Récupérer les profils pour les mentions
     */
    async getProfiles() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: me } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!me?.current_organization_id) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('current_organization_id', me.current_organization_id);

        if (error) throw error;
        return data;
    },

    /**
     * Uploader un média dans Supabase Storage
     */
    async uploadMedia(file: File) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Déconnecté");

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('pulse-media')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('pulse-media')
            .getPublicUrl(filePath);

        return publicUrl;
    }
};
