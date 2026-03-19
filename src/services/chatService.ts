/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/lib/database.types';

export const chatService = {
    /**
     * Récupérer tous les canaux de l'utilisateur pour une organisation donnée
     */
    async getChannels(orgId: string) {
        // Requires that the user is a member of the channel
        const { data: members, error: membersError } = await supabase
            .from('chat_members')
            .select('channel_id');

        if (membersError) throw membersError;

        if (!members || members.length === 0) return [];

        const channelIds = members.map(m => m.channel_id);

        const { data: channels, error } = await supabase
            .from('chat_channels')
            .select(`
                *,
                members:chat_members(
                user_id,
                last_read_at
                )
            `)
            .eq('organization_id', orgId)
            .in('id', channelIds)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // --- MANUALLY JOIN PROFILES TO AVOID POSTGREST CACHE ISSUES ---
        const allUserIds = new Set<string>();
        channels.forEach((c: any) => c.members?.forEach((m: any) => allUserIds.add(m.user_id)));

        const profilesMap: Record<string, any> = {};
        if (allUserIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', Array.from(allUserIds));

            profiles?.forEach(p => {
                profilesMap[p.id] = p;
            });
        }

        // Inject profiles into channels.members
        const channelsWithProfiles = channels.map((c: any) => ({
            ...c,
            members: c.members?.map((m: any) => ({
                ...m,
                profile: profilesMap[m.user_id] || null
            }))
        }));

        return channelsWithProfiles;
    },

    /**
     * Créer un nouveau canal (Direct ou Group)
     */
    async createChannel(orgId: string, type: 'direct' | 'group', userIds: string[], name?: string) {
        const { data: auth, error: authError } = await supabase.auth.getSession();
        if (authError || !auth.session) throw new Error("Non authentifié");

        const currentUserId = auth.session.user.id;
        const allUsers = Array.from(new Set([...userIds, currentUserId]));

        // Création du canal
        const { data: channel, error: channelError } = await supabase
            .from('chat_channels')
            .insert({
                organization_id: orgId,
                type,
                name: type === 'group' ? name : null
            })
            .select()
            .single();

        if (channelError) throw channelError;

        // Ajout des membres
        const membersData = allUsers.map(id => ({
            channel_id: channel.id,
            user_id: id,
        }));

        const { error: membersErr } = await supabase
            .from('chat_members')
            .insert(membersData);

        if (membersErr) throw membersErr;

        return channel;
    },

    /**
     * Renommer un canal (Group)
     */
    async renameChannel(channelId: string, newName: string) {
        const { error } = await supabase
            .from('chat_channels')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('id', channelId);

        if (error) throw error;
    },

    /**
     * Récupérer les messages d'un canal
     */
    async getMessages(channelId: string, limit = 50) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // --- MANUALLY JOIN PROFILES ---
        const senderIds = Array.from(new Set(data.map(m => m.sender_id)));
        const profilesMap: Record<string, any> = {};

        if (senderIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', senderIds);

            profiles?.forEach(p => {
                profilesMap[p.id] = p;
            });
        }

        const messagesWithProfiles = data.map(m => ({
            ...m,
            profile: profilesMap[m.sender_id] || null
        }));

        return messagesWithProfiles.reverse() as unknown as ChatMessage[]; // Ordre chronologique
    },

    /**
     * Envoyer un message
     */
    async sendMessage(channelId: string, content: string, mentions: string[] = []) {
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session) throw new Error("Non authentifié");

        // 1. Envoyer le message
        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
                channel_id: channelId,
                sender_id: auth.session.user.id,
                content,
                mentions
            })
            .select('*')
            .single();

        if (error) throw error;

        // Join profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', message.sender_id)
            .single();

        const msgWithProfile = { ...message, profile };

        // 2. Mettre à jour l'heure de modification du canal
        await supabase
            .from('chat_channels')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', channelId);

        // 3. Mettre à jour le statut "lu" de l'expéditeur
        await this.markAsRead(channelId);

        return msgWithProfile;
    },

    /**
     * Envoyer un message système direct (croisement de modules)
     */
    async sendSystemMessageToUser(orgId: string, targetUserId: string, content: string, contextLink?: string) {
        const { data: auth, error: authError } = await supabase.auth.getSession();
        if (authError || !auth.session) throw new Error("Non authentifié");

        const currentUserId = auth.session.user.id;

        // 1. Chercher un canal direct existant entre currentUserId et targetUserId
        // On récupère tous les canaux directs de l'orga
        const { data: directChannels } = await supabase
            .from('chat_channels')
            .select('id')
            .eq('organization_id', orgId)
            .eq('type', 'direct');

        let targetChannelId = null;

        if (directChannels && directChannels.length > 0) {
            const channelIds = directChannels.map(c => c.id);

            // Chercher un canal qui a exactement ces deux membres
            const { data: membersMap } = await supabase
                .from('chat_members')
                .select('channel_id, user_id')
                .in('channel_id', channelIds)
                .in('user_id', [currentUserId, targetUserId]);

            if (membersMap) {
                // Group by channel
                const channelMembers: Record<string, string[]> = {};
                membersMap.forEach(m => {
                    if (!channelMembers[m.channel_id]) channelMembers[m.channel_id] = [];
                    channelMembers[m.channel_id].push(m.user_id);
                });

                // Find the one with both users (or just one if current=target)
                const expectedCount = currentUserId === targetUserId ? 1 : 2;
                for (const [cId, users] of Object.entries(channelMembers)) {
                    if (users.length === expectedCount && users.includes(currentUserId) && users.includes(targetUserId)) {
                        targetChannelId = cId;
                        break;
                    }
                }
            }
        }

        // 2. Si aucun canal, on le crée
        if (!targetChannelId) {
            const newChannel = await this.createChannel(orgId, 'direct', [targetUserId]);
            targetChannelId = newChannel.id;
        }

        // 3. Formater le messsage si un lien est fourni
        const finalContent = contextLink ? `${content}\n\n[Voir le contexte](${contextLink})` : content;

        // 4. Envoyer le message
        return await this.sendMessage(targetChannelId, finalContent, [targetUserId]);
    },

    /**
     * Marquer un canal comme lu par l'utilisateur courant
     */
    async markAsRead(channelId: string) {
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session) return;

        await supabase
            .from('chat_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('channel_id', channelId)
            .eq('user_id', auth.session.user.id);
    },

    /**
     * Quitter ou supprimer une conversation (côté utilisateur)
     */
    async leaveChannel(channelId: string) {
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session) throw new Error("Non authentifié");

        const { error } = await supabase
            .from('chat_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', auth.session.user.id);

        if (error) throw error;
    },

    /**
     * Écoute des nouveaux messages et des événements de frappe via Supabase Realtime
     */
    subscribeToMessages(channelId: string, onNewMessage: (msg: any) => void, onTyping?: (userId: string) => void) {
        const channel = supabase.channel(`chat_messages_${channelId}`);

        channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`
        }, async (payload) => {
            // Fetch profile info for the new message
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();

            const completeMessage = {
                ...payload.new,
                profile
            };
            onNewMessage(completeMessage);
        });

        if (onTyping) {
            channel.on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload && payload.payload.user_id) {
                    onTyping(payload.payload.user_id);
                }
            });
        }

        return channel.subscribe();
    },

    /**
     * Envoyer un événement Broadcast 'En train d'écrire'
     */
    async sendTypingEvent(channelId: string, userId: string) {
        const channel = supabase.channel(`chat_messages_${channelId}`);
        await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: userId }
        });
    },

    /**
     * Écoute des mises à jour des canaux
     */
    subscribeToChannels(orgId: string, onChannelsUpdate: () => void) {
        return supabase
            .channel(`chat_channels_${orgId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_channels',
                filter: `organization_id=eq.${orgId}`
            }, () => {
                onChannelsUpdate();
            })
            .subscribe();
    }
};
