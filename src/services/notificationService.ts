import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/lib/database.types';

export const notificationService = {
    /**
     * Récupérer les notifications de l'utilisateur
     */
    async getNotifications(limit = 20) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url)
      `)
            .eq('user_id', user.id)
            .eq('organization_id', profile.current_organization_id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as Notification[];
    },

    /**
     * Envoyer une notification
     */
    async sendNotification(targetUserId: string, type: Notification['type'], entityId?: string, message?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Éviter de s'envoyer une notification à soi-même
        if (user.id === targetUserId) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.current_organization_id) return;

        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: targetUserId,
                actor_id: user.id,
                organization_id: profile.current_organization_id,
                type,
                entity_id: entityId,
                message
            });

        if (error) console.error("Error sending notification", error);
    },

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    /**
     * Marquer toutes les notifications comme lues
     */
    async markAllAsRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
    },

    /**
     * S'abonner aux nouvelles notifications en temps réel
     */
    subscribeToNotifications(onNewNotification: (notif: Notification) => void) {
        return supabase
            .channel('notifications_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                async (payload) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && payload.new.user_id === user.id) {
                        // Fetch actor profile
                        const { data: actor } = await supabase
                            .from('profiles')
                            .select('id, full_name, avatar_url')
                            .eq('id', payload.new.actor_id)
                            .single();

                        onNewNotification({
                            ...payload.new,
                            actor
                        } as Notification);
                    }
                }
            )
            .subscribe();
    }
};
