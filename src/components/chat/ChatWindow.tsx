/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { chatService } from '@/services/chatService';
import type { ChatChannel, ChatMessage, Profile } from '@/lib/database.types';
import { Send, Users, AtSign, Loader2, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
    channel: ChatChannel & { members: any[] };
    onBack?: () => void;
}

export function ChatWindow({ channel, onBack }: ChatWindowProps) {
    const { user } = useAuth();
    const { members } = useOrganization();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    // Renaming
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Mentions
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilteredIndex, setMentionFilteredIndex] = useState(0);
    const [mentionSearch, setMentionSearch] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
    const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
    const lastTypingEvent = useRef<number>(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Helper pour toujours trouver le profil complet via le contexte sécurisé (contourne le RLS backend)
    const getProfile = (uid: string) => members.find(m => m.user_id === uid)?.profile;

    // Parse direct channel name
    const channelName = useMemo(() => {
        if (channel.name) return channel.name;
        if (channel.type === 'group') return 'Groupe (sans nom)';
        // Direct -> find the other member
        const otherUserId = channel.members.find(m => m.user_id !== user?.id)?.user_id;
        if (!otherUserId) return 'Utilisateur inconnu';

        const profile = channel.members.find(m => m.user_id === otherUserId)?.profile || getProfile(otherUserId);
        return profile?.full_name || profile?.email || 'Utilisateur inconnu';
    }, [channel, user, members]);

    const channelAvatar = useMemo(() => {
        if (channel.type === 'group') return null; // Default group icon
        const otherUserId = channel.members.find(m => m.user_id !== user?.id)?.user_id;
        if (!otherUserId) return null;

        const profile = channel.members.find(m => m.user_id === otherUserId)?.profile || getProfile(otherUserId);
        return profile?.avatar_url;
    }, [channel, user, members]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch { /* audio play error, ignore */ }
    };

    useEffect(() => {
        loadMessages();

        // Mark as read when opening
        chatService.markAsRead(channel.id);

        // Subscribe to new messages
        const subscription = chatService.subscribeToMessages(
            channel.id,
            (newMsg) => {
                setMessages(prev => {
                    // Eviter les ids en double si on a l'ui optimiste (bien qu'on n'en ait pas ici, c'est plus safe)
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                chatService.markAsRead(channel.id);
                setTimeout(scrollToBottom, 100);

                if (newMsg.sender_id !== user?.id) {
                    playNotificationSound();
                }

                // Remove typing indicator immediately for sender
                setTypingUserIds(prev => prev.filter(id => id !== newMsg.sender_id));
            },
            (userId) => {
                if (userId === user?.id) return;
                setTypingUserIds(prev => {
                    if (!prev.includes(userId)) return [...prev, userId];
                    return prev;
                });

                if (typingTimeouts.current[userId]) {
                    clearTimeout(typingTimeouts.current[userId]);
                }
                typingTimeouts.current[userId] = setTimeout(() => {
                    setTypingUserIds(prev => prev.filter(id => id !== userId));
                    delete typingTimeouts.current[userId];
                }, 3000);
            }
        );

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [channel.id]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const msgs = await chatService.getMessages(channel.id);
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error("Error loading messages", err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --------------------------------------------------------------------------
    // Mentions Logic (Rudimentary)
    // --------------------------------------------------------------------------

    const mentionableMembers = useMemo(() => {
        // Only allow mentioning members who are actually in this channel
        const channelUserIds = channel.members.map(cm => cm.user_id);
        const presentMembers = members.filter(m => channelUserIds.includes(m.user_id) && m.user_id !== user?.id);

        if (!mentionSearch) return presentMembers;
        const lowerSearch = mentionSearch.toLowerCase();
        return presentMembers.filter(m =>
            (m.profile?.full_name || '').toLowerCase().includes(lowerSearch) ||
            (m.profile?.email || '').toLowerCase().includes(lowerSearch)
        );
    }, [members, mentionSearch, user, channel]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputValue(val);

        const now = Date.now();
        if (now - lastTypingEvent.current > 2000 && user && val.trim().length > 0) {
            chatService.sendTypingEvent(channel.id, user.id);
            lastTypingEvent.current = now;
        }

        // Check for '@' near cursor
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
            if (!textAfterAt.includes(' ')) {
                setShowMentions(true);
                setMentionSearch(textAfterAt);
                setMentionFilteredIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && mentionableMembers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionFilteredIndex(prev => (prev + 1) % mentionableMembers.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionFilteredIndex(prev => (prev - 1 + mentionableMembers.length) % mentionableMembers.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionableMembers[mentionFilteredIndex]);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const insertMention = (member: any) => {
        const cursor = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = inputValue.slice(0, cursor);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        const before = inputValue.slice(0, lastAtPos);
        const after = inputValue.slice(cursor);
        const nameToInsert = `@${member.profile?.full_name?.replace(/ /g, '') || 'Utilisateur'} `;

        setInputValue(before + nameToInsert + after);
        setShowMentions(false);

        // Focus back
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = before.length + nameToInsert.length;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 10);
    };

    // --------------------------------------------------------------------------
    // Sending
    // --------------------------------------------------------------------------

    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || sending) return;

        setSending(true);
        try {
            // Find active mentions in the text
            const extractedMentions: string[] = [];
            members.forEach(m => {
                const tag = `@${m.profile?.full_name?.replace(/ /g, '') || 'Utilisateur'}`;
                if (trimmed.includes(tag)) extractedMentions.push(m.user_id);
            });

            await chatService.sendMessage(channel.id, trimmed, extractedMentions);
            setInputValue('');
            setShowMentions(false);

            // Local optimistic ui is handled by realtime subscription receiving its own insert
        } catch (err) {
            console.error("Error sending message", err);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleRename = async () => {
        const trimmedNewName = editNameValue.trim();
        if (!trimmedNewName || trimmedNewName === channelName) {
            setIsEditingName(false);
            return;
        }

        setIsRenaming(true);
        try {
            await chatService.renameChannel(channel.id, trimmedNewName);
            // Update local channel object or rely on realtime updates?
            // Realtime for channels is usually subscribed in Messages.tsx.
            // But we can optimistically update our local channel obj locally or rely on prop change.
            channel.name = trimmedNewName;
            setIsEditingName(false);
            toast({ title: 'Conversation renommée avec succès !' });
        } catch (err: any) {
            toast({ title: 'Erreur', description: "Impossible de renommer la conversation", variant: "destructive" });
        } finally {
            setIsRenaming(false);
        }
    };

    const formatMessageTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return format(d, 'HH:mm');
    };

    const formatMessageDateGroup = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isToday(d)) return "Aujourd'hui";
        if (isYesterday(d)) return "Hier";
        return format(d, 'EEEE d MMMM', { locale: fr });
    };

    // Group messages by date
    const groupedMessages = useMemo(() => {
        const groups: { dateStr: string, label: string, msgs: ChatMessage[] }[] = [];
        messages.forEach(msg => {
            const msgDateStr = msg.created_at.split('T')[0];
            const exist = groups.find(g => g.dateStr === msgDateStr);
            if (exist) {
                exist.msgs.push(msg);
            } else {
                groups.push({
                    dateStr: msgDateStr,
                    label: formatMessageDateGroup(msg.created_at),
                    msgs: [msg]
                });
            }
        });
        return groups;
    }, [messages]);

    return (
        <div className="flex flex-col h-full relative" style={{ backgroundColor: 'var(--background)' }}>
            {/* Header */}
            <div className="h-16 border-b border-border/40 flex items-center px-4 z-10 sticky top-0 bg-muted/10">
                {onBack && (
                    <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-black/5 transition-colors text-muted-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <Avatar className="w-10 h-10 border border-border/50 bg-white shadow-sm">
                    {channelAvatar ? (
                        <AvatarImage src={channelAvatar} />
                    ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {channel.type === 'group' ? <Users className="w-4 h-4" /> : channelName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="ml-3 flex-1 min-w-0 pr-2">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                disabled={isRenaming}
                                className="flex-1 text-sm font-semibold rounded-md border border-border/50 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            />
                            <button
                                onClick={handleRename}
                                disabled={isRenaming}
                                className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
                            >
                                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setIsEditingName(false)}
                                disabled={isRenaming}
                                className="p-1.5 rounded-md hover:bg-red-100 text-red-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                            setEditNameValue(channelName);
                            setIsEditingName(true);
                        }}>
                            <h3 className="font-semibold text-[15px] text-foreground truncate">{channelName}</h3>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate leading-none mt-0.5">
                        {channel.type === 'group' ? `${channel.members.length} membres` : 'Direct message'}
                    </p>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                    </div>
                ) : groupedMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Users className="w-12 h-12 mb-3" />
                        <p className="text-sm">Envoyez votre premier message !</p>
                    </div>
                ) : (
                    groupedMessages.map(group => (
                        <div key={group.dateStr}>
                            <div className="flex justify-center mb-6 mt-2 relative">
                                <span className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full z-10 backdrop-blur-sm">
                                    {group.label}
                                </span>
                                <div className="absolute top-1/2 left-0 right-0 border-t border-border/30 -z-0"></div>
                            </div>

                            <div className="space-y-4">
                                {group.msgs.map((msg, idx) => {
                                    const isMine = msg.sender_id === user?.id;
                                    const showAvatar = !isMine && (idx === 0 || group.msgs[idx - 1].sender_id !== msg.sender_id);
                                    const isMentioned = msg.mentions?.includes(user?.id || '');

                                    return (
                                        <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                                            {showAvatar && (
                                                <span className="text-[11px] text-muted-foreground ml-10 mb-1">
                                                    {(msg.profile || getProfile(msg.sender_id))?.full_name?.split(' ')[0]}
                                                </span>
                                            )}
                                            <div className={cn("flex max-w-[85%]", isMine ? "flex-row-reverse" : "flex-row")}>

                                                {!isMine && (
                                                    <div className="w-8 flex-shrink-0 flex items-end mb-1 mr-2">
                                                        {showAvatar ? (
                                                            <Avatar className="w-7 h-7 shadow-sm">
                                                                {(msg.profile || getProfile(msg.sender_id))?.avatar_url ? (
                                                                    <AvatarImage src={(msg.profile || getProfile(msg.sender_id))?.avatar_url ?? ''} />
                                                                ) : (
                                                                    <AvatarFallback className="text-[10px] bg-white text-primary font-bold">
                                                                        {((msg.profile || getProfile(msg.sender_id))?.full_name || 'U').charAt(0).toUpperCase()}
                                                                    </AvatarFallback>
                                                                )}
                                                            </Avatar>
                                                        ) : <div className="w-7" />}
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "px-3 py-2 text-[14px] leading-relaxed relative shadow-sm",
                                                    isMine
                                                        ? "bg-[#D9FDD3] text-zinc-900 rounded-2xl rounded-tr-sm"
                                                        : "bg-white text-zinc-900 rounded-2xl rounded-tl-sm"
                                                )}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        <span className="text-[10px] opacity-60 text-zinc-500">
                                                            {formatMessageTime(msg.created_at)}
                                                        </span>
                                                        {isMine && (() => {
                                                            const otherMembers = channel.members.filter(m => m.user_id !== user?.id);
                                                            const readCount = otherMembers.filter(m => m.last_read_at && new Date(m.last_read_at) >= new Date(msg.created_at)).length;
                                                            if (readCount === 0) return <Check className="w-3 h-3 text-emerald-700/50" />;
                                                            if (readCount < otherMembers.length) return <CheckCheck className="w-3 h-3 text-emerald-700/50" />;
                                                            return <CheckCheck className="w-3 h-3 text-blue-500" />;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}

                {typingUserIds.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 px-4 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-card px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 w-fit border border-border/10">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-[11px] italic font-medium">
                            {typingUserIds.length === 1
                                ? `${getProfile(typingUserIds[0])?.full_name?.split(' ')[0] || 'Un utilisateur'} écrit...`
                                : `${typingUserIds.length} personnes écrivent...`}
                        </span>
                    </div>
                )}

                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-muted/10 relative">
                {/* Mentions Dropdown */}
                {showMentions && mentionableMembers.length > 0 && (
                    <div className="absolute bottom-full left-3 w-64 bg-card border border-border shadow-xl rounded-xl mb-2 overflow-hidden z-20">
                        <div className="text-xs font-semibold px-3 py-2 bg-muted/40 border-b border-border/40 text-muted-foreground">
                            Taguer un collaborateur
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                            {mentionableMembers.map((m, idx) => (
                                <button
                                    key={m.user_id}
                                    onClick={() => insertMention(m)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                                        mentionFilteredIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                    )}
                                >
                                    <Avatar className="w-6 h-6">
                                        {m.profile?.avatar_url ? (
                                            <AvatarImage src={m.profile.avatar_url} />
                                        ) : (
                                            <AvatarFallback className={cn("text-[10px]", mentionFilteredIndex === idx ? "bg-primary-foreground/20 text-white" : "bg-primary/10 text-primary")}>
                                                {(m.profile?.full_name || m.profile?.email || 'U').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <span className="truncate">{m.profile?.full_name || m.profile?.email}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-1 bg-card rounded-3xl p-1 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-sm transition-all border border-border/10">
                    <button
                        type="button"
                        className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors flex-shrink-0"
                        onClick={() => setInputValue(prev => prev + '@')}
                        title="Taguer quelqu'un"
                    >
                        <AtSign className="w-5 h-5" />
                    </button>

                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message... (@ pour taguer)"
                        className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2.5 px-1 max-h-32 min-h-[44px] text-[15px] leading-snug scrollbar-hide text-zinc-800 placeholder:text-zinc-400"
                        rows={1}
                        style={{
                            height: 'auto',
                        }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || sending}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-transform duration-200",
                            inputValue.trim() && !sending
                                ? "bg-[#25D366] text-white shadow-sm hover:scale-105 hover:bg-[#20bd5a]"
                                : "bg-zinc-100 text-zinc-400 opacity-50 cursor-not-allowed"
                        )}
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-[18px] h-[18px] ml-0.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
