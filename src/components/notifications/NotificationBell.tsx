import React, { useState, useEffect } from 'react';
import { Bell, Check, Loader2, Sparkles } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadNotifications();

            // Subscribe to real-time notifications
            const channel = notificationService.subscribeToNotifications((newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.id]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Error loading notifications", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking notification as read", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all as read", err);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted/50 transition-colors">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-[10px] font-bold border-2 border-background shadow-sm hover:bg-rose-600 transition-colors">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-3xl border-border/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border/30 bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] h-7 px-2 hover:bg-primary/5 text-primary font-semibold rounded-full"
                        >
                            Tout marquer comme lu
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {loading ? (
                        <div className="p-8 flex items-center justify-center opacity-30">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center space-y-3 opacity-40">
                            <Bell className="w-10 h-10 mx-auto" strokeWidth={1} />
                            <p className="text-sm font-medium">Aucune notification</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/20">
                            {notifications.map((notif) => (
                                <DropdownMenuItem
                                    key={notif.id}
                                    className={cn(
                                        "p-4 focus:bg-muted/30 flex items-start gap-4 transition-colors cursor-pointer",
                                        !notif.is_read && "bg-primary/[0.02]"
                                    )}
                                    onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                                >
                                    <div className="relative mt-1">
                                        {notif.actor?.avatar_url ? (
                                            <img src={notif.actor.avatar_url} className="w-10 h-10 rounded-full border border-border/40 object-cover shadow-sm" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary border border-primary/10 shadow-sm text-xs">
                                                {(notif.actor?.full_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {!notif.is_read && (
                                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background shadow-sm" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={cn(
                                            "text-[13px] leading-relaxed",
                                            !notif.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                                        )}>
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide border-b border-transparent">
                                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 bg-muted/5 border-t border-border/20 text-center">
                    <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground hover:text-primary rounded-xl">
                        Voir tout l'historique
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
