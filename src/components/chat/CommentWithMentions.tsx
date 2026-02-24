/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CommentWithMentionsProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onMentionDetected?: (userIds: string[]) => void; // Called to inform parent of newly tagged users
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    rows?: number;
}

export function CommentWithMentions({
    value,
    onChange,
    placeholder = "Ajouter un commentaire (@ pour mentionner)...",
    className,
    onMentionDetected,
    onKeyDown,
    rows = 2
}: CommentWithMentionsProps) {
    const { members } = useOrganization();

    // Mentions State
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionFilteredIndex, setMentionFilteredIndex] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Filter members based on @search
    const mentionableMembers = useMemo(() => {
        if (!mentionSearch) return members;
        const lowerSearch = mentionSearch.toLowerCase();
        return members.filter(m =>
            (m.profile?.full_name || '').toLowerCase().includes(lowerSearch) ||
            (m.profile?.email || '').toLowerCase().includes(lowerSearch)
        );
    }, [members, mentionSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChange(val);

        // Check for '@' near cursor to trigger mention dropdown
        const cursor = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        if (lastAtPos !== -1) {
            // Ensure '@' is at the start or preceded by a space/newline
            const prevChar = textBeforeCursor.charAt(lastAtPos - 1);
            if (prevChar === '' || prevChar === ' ' || prevChar === '\n') {
                const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
                // If there's no space after '@', we consider it an active search
                if (!textAfterAt.includes(' ')) {
                    setShowMentions(true);
                    setMentionSearch(textAfterAt);
                    setMentionFilteredIndex(0);
                    return;
                }
            }
        }
        setShowMentions(false);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle dropdown navigation if active
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
            if (e.key === 'Escape') {
                setShowMentions(false);
                return;
            }
        }

        // Pass to parent
        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    const insertMention = (member: any) => {
        const cursor = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursor);
        const lastAtPos = textBeforeCursor.lastIndexOf('@');

        const before = value.slice(0, lastAtPos);
        const after = value.slice(cursor);

        // Format the mention string
        // We strip spaces to make it a solid block, e.g., @JeanDupont
        const nameToInsert = `@${member.profile?.full_name?.replace(/ /g, '') || 'Utilisateur'} `;

        const newValue = before + nameToInsert + after;
        onChange(newValue);
        setShowMentions(false);

        // Re-focus and set cursor position after the inserted name
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = before.length + nameToInsert.length;
                inputRef.current.setSelectionRange(newPos, newPos);
            }

            // Extract all mentions after insertion to notify parent
            extractAllMentions(newValue);
        }, 10);
    };

    // Helper to find all valid mentioned users in the current text block
    const extractAllMentions = (text: string) => {
        if (!onMentionDetected) return;

        const extractedUserIds: string[] = [];
        members.forEach(m => {
            const tag = `@${m.profile?.full_name?.replace(/ /g, '') || 'Utilisateur'}`;
            if (text.includes(tag)) {
                extractedUserIds.push(m.user_id);
            }
        });

        onMentionDetected(Array.from(new Set(extractedUserIds)));
    };

    // Extract on unmount or blur if needed, but doing it on insertion is usually enough for reactive UIs.
    // We can also do it on blur to catch any manual deletions.
    const handleBlur = () => {
        setTimeout(() => setShowMentions(false), 200); // delay to allow click on dropdown
        extractAllMentions(value);
    };

    return (
        <div className="relative w-full">
            {/* Mentions Dropdown */}
            {showMentions && mentionableMembers.length > 0 && (
                <div className="absolute bottom-full left-0 w-64 max-w-full bg-card border border-border shadow-xl rounded-xl mb-1 overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 bg-muted/40 border-b border-border/40 text-muted-foreground">
                        Mentionner quelqu'un
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 scrollbar-hide">
                        {mentionableMembers.map((m, idx) => (
                            <button
                                key={m.user_id}
                                onClick={() => insertMention(m)}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors",
                                    mentionFilteredIndex === idx ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                            >
                                <Avatar className="w-5 h-5 flex-shrink-0">
                                    {m.profile?.avatar_url ? (
                                        <AvatarImage src={m.profile.avatar_url} />
                                    ) : (
                                        <AvatarFallback className={cn("text-[8px] font-bold", mentionFilteredIndex === idx ? "bg-primary-foreground/20 text-white" : "bg-primary/10 text-primary")}>
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

            <textarea
                ref={inputRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDownInternal}
                onBlur={handleBlur}
                placeholder={placeholder}
                rows={rows}
                className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
            />
        </div>
    );
}
