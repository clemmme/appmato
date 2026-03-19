import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { chatService } from '@/services/chatService';
import type { ChatChannel } from '@/lib/database.types';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MainLayout } from '@/components/layout/MainLayout';
import { MessageCircle, Plus, Search, Users, Trash2, Mic, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function Messages() {
    const { user } = useAuth();
    const { currentOrg, members } = useOrganization();
    const { toast } = useToast();

    const [channels, setChannels] = useState<(ChatChannel & { members: any[] })[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<ChatChannel & { members: any[] } | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMembersForGroup, setSelectedMembersForGroup] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user && currentOrg) {
            loadChannels();
            const sub = chatService.subscribeToChannels(currentOrg.id, () => {
                loadChannels();
            });
            return () => {
                supabase.removeChannel(sub);
            };
        }
    }, [user, currentOrg]);

    const loadChannels = async () => {
        if (!currentOrg) return;
        try {
            const data = await chatService.getChannels(currentOrg.id);
            setChannels(data as any);
        } catch (err) {
            console.error("Erreur chargement canaux", err);
        }
    };

    const handleDeleteChannel = async (e: React.MouseEvent, channelId: string) => {
        e.stopPropagation();
        if (window.confirm('Voulez-vous vraiment supprimer cette conversation ?')) {
            try {
                await chatService.leaveChannel(channelId);
                if (selectedChannel?.id === channelId) {
                    setSelectedChannel(null);
                }
                await loadChannels();
                toast({ title: "Conversation supprimée" });
            } catch (err: any) {
                toast({ title: "Erreur", description: err.message, variant: "destructive" });
            }
        }
    };

    const handleStartDirectChat = async (targetUserId: string) => {
        if (!currentOrg) return;
        try {
            const existing = channels.find(c =>
                c.type === 'direct' &&
                c.members.some(m => m.user_id === targetUserId)
            );

            if (existing) {
                setSelectedChannel(existing);
                setIsCreating(false);
                return;
            }

            const newChannel = await chatService.createChannel(currentOrg.id, 'direct', [targetUserId]);
            await loadChannels();
            const freshlyLoaded = await chatService.getChannels(currentOrg.id);
            const toSelect = freshlyLoaded.find(c => c.id === newChannel.id);
            if (toSelect) {
                setSelectedChannel(toSelect as any);
                setIsCreating(false);
            }
        } catch (err: any) {
            toast({ title: "Erreur", description: err.message || "Impossible de créer la discussion.", variant: "destructive" });
        }
    };

    const handleStartGroupChat = async () => {
        if (!currentOrg || selectedMembersForGroup.length === 0) return;
        try {
            const finalName = groupName.trim() || `Groupe (${selectedMembersForGroup.length + 1} membres)`;
            const newChannel = await chatService.createChannel(currentOrg.id, 'group', selectedMembersForGroup, finalName);
            await loadChannels();
            const freshlyLoaded = await chatService.getChannels(currentOrg.id);
            const toSelect = freshlyLoaded.find(c => c.id === newChannel.id);
            if (toSelect) {
                setSelectedChannel(toSelect as any);
                setIsCreating(false);
                setIsGroupMode(false);
                setGroupName('');
                setSelectedMembersForGroup([]);
            }
        } catch (err: any) {
            toast({ title: "Erreur", description: err.message || "Impossible de créer le groupe.", variant: "destructive" });
        }
    };

    const toggleMemberForGroup = (userId: string) => {
        setSelectedMembersForGroup(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const filteredMembers = useMemo(() => {
        return members.filter(m =>
            m.user_id !== user?.id &&
            (m.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.profile?.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [members, searchQuery, user]);

    const renderChannelItem = (ch: ChatChannel & { members: any[] }) => {
        const isGroup = ch.type === 'group';
        const otherUserId = ch.members.find(m => m.user_id !== user?.id)?.user_id;
        const originalProfile = ch.members.find(m => m.user_id !== user?.id)?.profile;
        const contextProfile = members.find(m => m.user_id === otherUserId)?.profile;
        const otherMember = originalProfile || contextProfile;

        const name = isGroup ? (ch.name || 'Groupe') : (otherMember?.full_name || otherMember?.email || 'Utilisateur inconnu');
        const avatarUrl = isGroup ? null : otherMember?.avatar_url;

        const myMember = ch.members.find(m => m.user_id === user?.id);
        const lastRead = myMember?.last_read_at ? new Date(myMember.last_read_at).getTime() : 0;
        const updated = new Date(ch.updated_at).getTime();
        const isUnread = updated > lastRead + 1000;
        const isSelected = selectedChannel?.id === ch.id;

        return (
            <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group mb-2 border border-transparent",
                    isSelected ? "bg-white shadow-md border-border/40" :
                        isUnread ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-white/60"
                )}
            >
                <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 border border-border/50 shadow-sm">
                        {avatarUrl ? <AvatarImage src={avatarUrl} /> : (
                            <AvatarFallback className={isGroup ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}>
                                {isGroup ? <Users className="w-5 h-5" /> : name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    {isUnread && (
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h4 className={cn("text-base truncate pr-2", isUnread || isSelected ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>
                            {name}
                        </h4>
                        <span className={cn("text-xs whitespace-nowrap", isUnread ? "text-emerald-600 font-semibold" : "text-muted-foreground")}>
                            {formatDistanceToNow(new Date(ch.updated_at), { addSuffix: false, locale: fr })}
                        </span>
                    </div>
                    <p className={cn("text-sm truncate", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {isGroup ? `${ch.members.length} membres` : 'Démarrer la discussion'}
                    </p>
                </div>
                <button
                    onClick={(e) => handleDeleteChannel(e, ch.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 rounded-full transition-all flex-shrink-0"
                    title="Supprimer la conversation"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </button>
        );
    };

    return (
        <MainLayout>
            {/* 
              Pleine page: On soustrait la hauteur approximative du header de la layout (si nécessaire)
              Mais vu que l'app utilise un layout global, on peut utiliser h-[calc(100vh-2rem)] par exemple.
            */}
            <div className="h-[calc(100vh-2rem)] p-2 md:p-6 w-full animate-in fade-in duration-500">
                <div className="flex h-full w-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden">

                    {/* Colonne de gauche : Liste des discussions */}
                    <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col bg-muted/20 border-r border-border/50">
                        {/* Header Sidebar Messages */}
                        <div className="h-20 px-6 flex items-center justify-between border-b border-border/40 shrink-0">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                Messagerie
                            </h2>
                            <button
                                onClick={() => {
                                    setIsCreating(!isCreating);
                                    setIsGroupMode(false);
                                }}
                                className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                            >
                                <Plus className={cn("w-5 h-5 transition-transform", isCreating && "rotate-45")} />
                            </button>
                        </div>

                        {/* Contenu Sidebar */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                            {isCreating ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                            {isGroupMode ? "Nouveau Groupe" : "Nouvelle Discussion"}
                                        </h3>
                                        {!isGroupMode ? (
                                            <button onClick={() => setIsGroupMode(true)} className="text-xs text-primary font-medium hover:underline">
                                                Créer un groupe
                                            </button>
                                        ) : (
                                            <button onClick={() => { setIsGroupMode(false); setSelectedMembersForGroup([]); }} className="text-xs text-muted-foreground font-medium hover:underline">
                                                Annuler
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Chercher quelqu'un..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-background border border-border/50 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                        />
                                    </div>

                                    {isGroupMode && (
                                        <input
                                            type="text"
                                            placeholder="Nom du groupe..."
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                            className="w-full bg-background border border-border/50 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm font-medium"
                                        />
                                    )}

                                    <div className="space-y-2 mt-4">
                                        {filteredMembers.map(m => {
                                            const isSelected = selectedMembersForGroup.includes(m.user_id);
                                            return (
                                                <button
                                                    key={m.user_id}
                                                    onClick={() => isGroupMode ? toggleMemberForGroup(m.user_id) : handleStartDirectChat(m.user_id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group",
                                                        isGroupMode && isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                                                    )}
                                                >
                                                    <Avatar className="w-10 h-10 border border-border/50 shadow-sm">
                                                        <AvatarImage src={m.profile?.avatar_url || ''} />
                                                        <AvatarFallback className="bg-background text-primary font-bold">
                                                            {(m.profile?.full_name || m.profile?.email || 'U').charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 truncate">
                                                        <p className="font-medium text-sm text-foreground">{m.profile?.full_name || m.profile?.email}</p>
                                                        <p className="text-xs text-muted-foreground">{m.role}</p>
                                                    </div>
                                                    {isGroupMode && (
                                                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {isGroupMode && selectedMembersForGroup.length > 0 && (
                                        <button
                                            onClick={handleStartGroupChat}
                                            className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-2xl font-bold shadow-md hover:scale-[1.02] transition-transform"
                                        >
                                            Créer ({selectedMembersForGroup.length} membres)
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1 animate-in fade-in">
                                    {channels.length === 0 ? (
                                        <div className="text-center py-20 px-6">
                                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <MessageCircle className="w-10 h-10 text-primary" />
                                            </div>
                                            <h3 className="text-lg font-bold mb-2">Pas de messages</h3>
                                            <p className="text-muted-foreground text-sm">Commencez une nouvelle discussion avec vos collaborateurs.</p>
                                        </div>
                                    ) : (
                                        channels.map(renderChannelItem)
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Colonne de droite : Chat Window */}
                    <div className="hidden md:flex flex-1 flex-col bg-muted/10 relative">
                        {selectedChannel ? (
                            <div className="h-full w-full animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* ChatWindow is full height. Let's wrap it in a container that provides tools on top of it or next to it if needed. */}
                                {/* But for now just render it directly so it acts like WhatsApp Web */}
                                <div className="h-full relative shadow-inner">
                                    <ChatWindow channel={selectedChannel} />



                                    {/* Fancy addition: Fake Voice Memo button positioned over the right side of the input field. 
                                        Since ChatWindow has its own input, we can overlay a mic button if we want, or just leave ChatWindow as is. 
                                        ChatWindow already has a complete input footer.
                                        To make it really premium, we could modify ChatWindow directly, but this is a nice safe integration.
                                    */}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                                <div className="w-24 h-24 bg-card rounded-3xl shadow-sm border border-border/30 flex items-center justify-center mb-6">
                                    <MessageCircle className="w-12 h-12 text-zinc-300" />
                                </div>
                                <h2 className="text-2xl font-bold text-zinc-700 tracking-tight mb-2">AppMato Messages</h2>
                                <p className="text-zinc-500 max-w-sm">
                                    Sélectionnez une discussion à gauche ou commencez une nouvelle conversation pour collaborer.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
