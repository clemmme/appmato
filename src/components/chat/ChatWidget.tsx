/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { chatService } from '@/services/chatService';
import type { ChatChannel } from '@/lib/database.types';
import { ChatWindow } from './ChatWindow';
import { MessageCircle, X, Plus, Search, Users, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ChatWidget() {
    const { user } = useAuth();
    const { currentOrg, members } = useOrganization();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [channels, setChannels] = useState<(ChatChannel & { members: any[] })[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<ChatChannel & { members: any[] } | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMembersForGroup, setSelectedMembersForGroup] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState('');

    const [unreadTotal, setUnreadTotal] = useState(0);
    const prevUnreadRef = useRef<number | null>(null);

    useEffect(() => {
        if (prevUnreadRef.current !== null && unreadTotal > prevUnreadRef.current) {
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => { });

                toast({
                    title: "💬 Nouveau message",
                    description: "Vous avez reçu un nouveau message sur le chat du cabinet.",
                });
            } catch { /* notification error, ignore */ }
        }
        prevUnreadRef.current = unreadTotal;
    }, [unreadTotal, toast]);

    useEffect(() => {
        if (user && currentOrg && isOpen) {
            loadChannels();
        }
    }, [user, currentOrg, isOpen]);

    useEffect(() => {
        if (user && currentOrg) {
            // Load initially for the unread badge
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

            // Calculate unread globally
            let unread = 0;
            data.forEach((ch: any) => {
                const myMember = ch.members.find((m: any) => m.user_id === user?.id);
                const lastRead = myMember?.last_read_at ? new Date(myMember.last_read_at).getTime() : 0;
                const updated = new Date(ch.updated_at).getTime();
                // Allow a small grace period for sync
                if (updated > lastRead + 1000) {
                    unread++;
                }
            });
            setUnreadTotal(unread);

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

    const filteredMembers = useMemo(() => {
        return members.filter(m =>
            m.user_id !== user?.id &&
            (m.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.profile?.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [members, searchQuery, user]);

    const handleStartDirectChat = async (targetUserId: string) => {
        if (!currentOrg) return;
        try {
            // Check if direct channel already exists
            const existing = channels.find(c =>
                c.type === 'direct' &&
                c.members.some(m => m.user_id === targetUserId)
            );

            if (existing) {
                setSelectedChannel(existing);
                setIsCreating(false);
                return;
            }

            // Create new
            const newChannel = await chatService.createChannel(currentOrg.id, 'direct', [targetUserId]);
            await loadChannels();

            // Select the new one
            const freshlyLoaded = await chatService.getChannels(currentOrg.id);
            const toSelect = freshlyLoaded.find(c => c.id === newChannel.id);
            if (toSelect) {
                setSelectedChannel(toSelect as any);
                setIsCreating(false);
            }
        } catch (err: any) {
            toast({
                title: "Erreur",
                description: err.message || "Impossible de créer la discussion.",
                variant: "destructive"
            });
        }
    };

    // --------------------------------------------------------------------------
    // Group Creation
    // --------------------------------------------------------------------------
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
            toast({
                title: "Erreur",
                description: err.message || "Impossible de créer le groupe.",
                variant: "destructive"
            });
        }
    };

    const toggleMemberForGroup = (userId: string) => {
        setSelectedMembersForGroup(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    // --------------------------------------------------------------------------
    // Channel List Item
    // --------------------------------------------------------------------------
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

        return (
            <button
                key={ch.id}
                onClick={() => {
                    setSelectedChannel(ch);
                    // Optimistically mark read
                    setUnreadTotal(prev => Math.max(0, prev - 1));
                }}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group",
                    isUnread ? "bg-emerald-50/50" : "hover:bg-muted/60"
                )}
            >
                <div className="relative">
                    <Avatar className="w-12 h-12 border border-border/50">
                        {avatarUrl ? <AvatarImage src={avatarUrl} /> : (
                            <AvatarFallback className={isGroup ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}>
                                {isGroup ? <Users className="w-5 h-5" /> : name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        )}
                    </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h4 className={cn("text-sm truncate pr-2", isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>
                            {name}
                        </h4>
                        <span className={cn("text-[10px] whitespace-nowrap", isUnread ? "text-[#25D366] font-semibold" : "text-muted-foreground")}>
                            {formatDistanceToNow(new Date(ch.updated_at), { addSuffix: true, locale: fr })}
                        </span>
                    </div>
                    <p className={cn("text-xs truncate", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {isGroup ? `${ch.members.length} membres` : 'Discussion directe'}
                    </p>
                </div>

                <button
                    onClick={(e) => handleDeleteChannel(e, ch.id)}
                    className="p-2 mr-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 rounded-full transition-all flex-shrink-0"
                    title="Supprimer la conversation"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                {isUnread && (
                    <div className="w-2.5 h-2.5 bg-[#25D366] rounded-full flex-shrink-0 mr-1 shadow-sm" />
                )}

                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
            </button>
        );
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================
    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300",
                    isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100 hover:scale-105 hover:shadow-xl",
                    "bg-[#25D366] text-white" // WhatsApp Green
                )}
            >
                <div className="relative">
                    <MessageCircle className="w-6 h-6" />
                    {unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full border-2 border-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">
                            {unreadTotal > 99 ? '99+' : unreadTotal}
                        </span>
                    )}
                </div>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background border-l border-border/40 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {selectedChannel ? (
                    // ==================================================================
                    // Vue: CHAT WINDOW
                    // ==================================================
                    <ChatWindow
                        channel={selectedChannel}
                        onBack={() => {
                            setSelectedChannel(null);
                            loadChannels();
                        }}
                    />
                ) : (
                    // ==================================================================
                    // Vue: LISTE DES CANAUX
                    // ==================================================================
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-background/95 backdrop-blur-sm relative z-10">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-emerald-600" />
                                Discussions
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsCreating(!isCreating);
                                        setIsGroupMode(false);
                                    }}
                                    className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                    title="Nouvelle conversation"
                                >
                                    <Plus className={cn("w-4 h-4 transition-transform", isCreating && "rotate-45")} />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
                            {isCreating ? (
                                /* Vue: NOUVELLE CONVERSATION / GROUPE */
                                <div className="animate-fade-in flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                            {isGroupMode ? "Nouveau Groupe" : "Démarrer une discussion"}
                                        </h3>
                                        {!isGroupMode ? (
                                            <button
                                                onClick={() => setIsGroupMode(true)}
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full"
                                            >
                                                Créer un groupe
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setIsGroupMode(false);
                                                    setSelectedMembersForGroup([]);
                                                    setGroupName('');
                                                }}
                                                className="text-xs font-semibold text-muted-foreground hover:bg-muted px-2.5 py-1 rounded-full"
                                            >
                                                Annuler groupe
                                            </button>
                                        )}
                                    </div>

                                    {isGroupMode && (
                                        <div className="px-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Nom du groupe..."
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                                className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    <div className="relative mb-4 px-2">
                                        <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Chercher un collaborateur..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-muted/40 border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-1 px-2 pb-20">
                                        {filteredMembers.map(m => {
                                            const isSelected = selectedMembersForGroup.includes(m.user_id);
                                            return (
                                                <button
                                                    key={m.user_id}
                                                    onClick={() => isGroupMode ? toggleMemberForGroup(m.user_id) : handleStartDirectChat(m.user_id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left group",
                                                        isGroupMode && isSelected ? "bg-emerald-50/50" : "hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div className="relative">
                                                        <Avatar className="w-10 h-10 shadow-sm border border-border/50">
                                                            {m.profile?.avatar_url ? (
                                                                <AvatarImage src={m.profile.avatar_url} />
                                                            ) : (
                                                                <AvatarFallback className="bg-white text-emerald-600 text-xs font-bold">
                                                                    {(m.profile?.full_name || m.profile?.email || 'U').charAt(0).toUpperCase()}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        {isGroupMode && (
                                                            <div className={cn(
                                                                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-colors",
                                                                isSelected ? "bg-emerald-500" : "bg-muted shadow-inner"
                                                            )}>
                                                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        <p className="text-sm font-medium">{m.profile?.full_name || m.profile?.email}</p>
                                                        <p className="text-[11px] text-muted-foreground">{m.role}</p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                        {filteredMembers.length === 0 && (
                                            <p className="text-center text-sm text-muted-foreground py-10">Aucun collaborateur trouvé.</p>
                                        )}
                                    </div>

                                    {isGroupMode && (
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50">
                                            <button
                                                onClick={handleStartGroupChat}
                                                disabled={selectedMembersForGroup.length === 0}
                                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-2xl font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                Créer le groupe ({selectedMembersForGroup.length})
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Vue: LISTE NORMALE */
                                <div className="animate-fade-in">
                                    {channels.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                                <MessageCircle className="w-8 h-8 text-emerald-500" />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">Aucune discussion</h3>
                                            <p className="text-sm text-muted-foreground flex-1 mb-6">
                                                Communiquez en direct avec les membres de votre cabinet.
                                            </p>
                                            <button
                                                onClick={() => setIsCreating(true)}
                                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-2xl font-semibold shadow-sm transition-all"
                                            >
                                                Nouvelle discussion
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                                                Récentes ({channels.length})
                                            </h3>
                                            {channels.map(renderChannelItem)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
