import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    MessageSquare, Heart, Share2, MoreHorizontal,
    Send, Image as ImageIcon, Link as LinkIcon, Sparkles, Lock, Loader2, Smile, X, FileText, Download
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pulseService } from '@/services/pulseService';
import { notificationService } from '@/services/notificationService';
import type { PulsePost, PulseComment } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function Discussions() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profile, setProfile] = useState<{ id: string, avatar_url?: string | null, full_name?: string | null } | null>(null);
    const [posts, setPosts] = useState<PulsePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [mediaUrlInput, setMediaUrlInput] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    // Edition
    const [editingPost, setEditingPost] = useState<PulsePost | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editMediaUrl, setEditMediaUrl] = useState('');

    // Commentaires
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, PulseComment[]>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user?.id) {
            const fetchProfile = async () => {
                const { data } = await supabase.from('profiles').select('id, avatar_url, full_name').eq('id', user.id).single();
                if (data) setProfile(data);
            };
            fetchProfile();
            loadPosts();
        }
    }, [user?.id]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await pulseService.getPosts();
            setPosts(data);
        } catch (err) {
            console.error("Error loading posts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await pulseService.uploadMedia(file);
            setMediaUrlInput(url);
            setUploadedFileName(file.name);
            toast({ title: "Fichier prêt", description: "Le média a été téléchargé avec succès." });
        } catch (err) {
            toast({ title: "Erreur d'upload", description: "Impossible de télécharger le fichier.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() || isPosting || isUploading) return;
        setIsPosting(true);
        try {
            const post = await pulseService.createPost(newPostContent, mediaUrlInput);
            setPosts(prev => [post, ...prev]);

            // Gestion des mentions
            const users = await pulseService.getProfiles();
            const mentionedUsers = users.filter((u: any) =>
                u.full_name && newPostContent.includes(`@${u.full_name}`)
            );

            for (const target of mentionedUsers) {
                await notificationService.sendNotification(
                    target.id,
                    'mention' as any,
                    post.id,
                    `${profile?.full_name || 'Quelqu\'un'} vous a mentionné dans une publication.`
                );
            }

            setNewPostContent('');
            setMediaUrlInput('');
            setUploadedFileName('');
            toast({ title: "Publication envoyée !", description: "Votre post est désormais visible par toute l'organisation." });
        } catch (err) {
            toast({ title: "Erreur", description: "Impossible de publier votre message.", variant: "destructive" });
        } finally {
            setIsPosting(false);
        }
    };

    const handleUpdatePost = async () => {
        if (!editingPost || !editContent.trim()) return;
        try {
            const updated = await pulseService.updatePost(editingPost.id, editContent, editMediaUrl);
            setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, content: updated.content, media_url: updated.media_url } : p));
            setEditingPost(null);
            toast({ title: "Mise à jour réussie !" });
        } catch (err) {
            toast({ title: "Erreur", description: "Impossible de modifier le post.", variant: "destructive" });
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette publication ?")) return;
        try {
            await pulseService.deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: "Publication supprimée." });
        } catch (err) {
            toast({ title: "Erreur", description: "Impossible de supprimer le post.", variant: "destructive" });
        }
    };

    const handleLike = async (post: PulsePost) => {
        // Optimistic UI
        const wasLiked = post.is_liked_by_me;
        setPosts(prev => prev.map(p => p.id === post.id ? {
            ...p,
            is_liked_by_me: !wasLiked,
            likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1)
        } : p));

        try {
            const liked = await pulseService.toggleLike(post.id);
            if (liked && post.author_id !== user?.id) {
                // Envoyer notification
                await notificationService.sendNotification(
                    post.author_id,
                    'post_like',
                    post.id,
                    `${profile?.full_name || 'Quelqu\'un'} a aimé votre publication.`
                );
            }
        } catch (err) {
            // Revert on error
            setPosts(prev => prev.map(p => p.id === post.id ? post : p));
        }
    };

    const toggleComments = async (postId: string) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
            return;
        }

        setExpandedPostId(postId);
        if (!comments[postId]) {
            setLoadingComments(prev => ({ ...prev, [postId]: true }));
            try {
                const data = await pulseService.getComments(postId);
                setComments(prev => ({ ...prev, [postId]: data }));
            } catch (err) {
                console.error("Error loading comments", err);
            } finally {
                setLoadingComments(prev => ({ ...prev, [postId]: false }));
            }
        }
    };

    const handleAddComment = async (post: PulsePost) => {
        const content = commentInputs[post.id];
        if (!content?.trim()) return;

        try {
            const comment = await pulseService.addComment(post.id, content);
            setComments(prev => ({ ...prev, [post.id]: [...(prev[post.id] || []), comment] }));
            setCommentInputs(prev => ({ ...prev, [post.id]: '' }));

            // Notification
            if (post.author_id !== user?.id) {
                await notificationService.sendNotification(
                    post.author_id,
                    'post_comment',
                    post.id,
                    `${profile?.full_name || 'Quelqu\'un'} a commenté votre publication.`
                );
            }

            // Update posts comment count
            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        } catch (err) {
            toast({ title: "Erreur", description: "Impossible d'ajouter le commentaire.", variant: "destructive" });
        }
    };

    const userName = profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur';

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto p-4 md:p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

                <div className="relative">
                    {/* Header de la page */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-primary" />
                            Pulse Feed
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Partagez, échangez et collaborez avec votre réseau.
                        </p>
                    </div>

                    {/* Zone de création de post */}
                    <Card className="mb-8 shadow-sm border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent w-full"></div>
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-border shadow-sm object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shadow-sm border border-primary/20">
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 space-y-4">
                                    <Textarea
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        placeholder="Partagez une actualité, posez une question..."
                                        className="min-h-[100px] resize-none border-border/50 bg-background/50 focus-visible:ring-primary/30 rounded-2xl p-4 text-[15px]"
                                    />
                                    {mediaUrlInput && (
                                        <div className="relative group/media animate-in fade-in zoom-in-95 duration-300">
                                            <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm bg-muted/20">
                                                {mediaUrlInput.match(/\.(jpg|jpeg|png|gif|webp)$|supabase\.co\/storage\/v1\/object\/public\/pulse-media\/.+(jpg|jpeg|png|gif|webp)$|base64/) ? (
                                                    <img src={mediaUrlInput} alt="Preview" className="w-full h-auto object-cover max-h-[300px]" />
                                                ) : (
                                                    <div className="p-4 flex items-center gap-3 bg-muted/30">
                                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                            <FileText className="w-6 h-6 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate text-foreground">
                                                                {uploadedFileName || "Fichier joint"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground uppercase">
                                                                {mediaUrlInput.split('.').pop()?.split('?')[0] || "Lien"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 rounded-full h-8 w-8 opacity-0 group-hover/media:opacity-100 transition-opacity"
                                                onClick={() => {
                                                    setMediaUrlInput('');
                                                    setUploadedFileName('');
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex gap-1 md:gap-2">
                                        <input
                                            type="file"
                                            id="pulse-media-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isUploading}
                                            onClick={() => document.getElementById('pulse-media-upload')?.click()}
                                            className={cn(
                                                "text-muted-foreground hover:text-primary rounded-full px-3 h-9",
                                                mediaUrlInput && "text-primary bg-primary/5"
                                            )}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-4.5 h-4.5 animate-spin mr-2" />
                                            ) : (
                                                <ImageIcon className="w-4.5 h-4.5 mr-2" />
                                            )}
                                            {isUploading ? "Envoi..." : "Média"}
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={handleCreatePost}
                                        disabled={!newPostContent.trim() || isPosting || isUploading}
                                        className="rounded-full shadow-md bg-primary hover:bg-primary/90 px-6 transition-all active:scale-95"
                                    >
                                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                        Publier
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-50">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm font-medium">Chargement du fil...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-3xl border border-dashed border-border/60">
                                <Sparkles className="w-12 h-12 text-muted-foreground opacity-20" />
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold text-foreground">Le fil est vide</p>
                                    <p className="text-sm text-muted-foreground max-w-[250px]">
                                        Soyez le premier à partager quelque chose avec vos collaborateurs !
                                    </p>
                                </div>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <Card key={post.id} className="shadow-sm border-border/30 hover:border-border/50 transition-all duration-300 rounded-3xl bg-card overflow-hidden group">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {post.author?.avatar_url ? (
                                                    <img src={post.author.avatar_url} alt="" className="w-11 h-11 rounded-full border border-border/50 object-cover shadow-sm" />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary border border-primary/10 shadow-sm">
                                                        {(post.author?.full_name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-foreground text-[15px]">{post.author?.full_name || 'Utilisateur'}</h4>
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(post.author_id === user?.id) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="w-4.5 h-4.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingPost(post);
                                                                setEditContent(post.content);
                                                                setEditMediaUrl(post.media_url || '');
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            Modifier
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeletePost(post.id)}
                                                            className="text-rose-500 focus:text-rose-500 cursor-pointer"
                                                        >
                                                            Supprimer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        <p className="text-foreground/90 leading-relaxed text-[15px] mb-5 whitespace-pre-wrap">
                                            {post.content}
                                        </p>

                                        {post.media_url && (
                                            <div className="mb-5 rounded-2xl overflow-hidden border border-border/40 shadow-sm bg-muted/10">
                                                {post.media_url.match(/\.(jpg|jpeg|png|gif|webp)$|supabase\.co\/storage\/v1\/object\/public\/pulse-media\/.+(jpg|jpeg|png|gif|webp)$|base64/) ? (
                                                    <img src={post.media_url} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                                                ) : (
                                                    <a
                                                        href={post.media_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group/file"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover/file:scale-110 transition-transform">
                                                            <FileText className="w-6 h-6 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold truncate text-foreground group-hover/file:text-primary transition-colors">
                                                                {post.media_url.split('/').pop()?.split('-').slice(1).join('-') || "Document joint"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                                                                {post.media_url.split('.').pop()?.split('?')[0] || "Fichier"}
                                                                <Download className="w-3 h-3 ml-1 opacity-50" />
                                                            </p>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-6 pt-4 border-t border-border/30">
                                            <button
                                                onClick={() => handleLike(post)}
                                                className={cn(
                                                    "flex items-center gap-2 text-sm transition-all duration-300 group/btn",
                                                    post.is_liked_by_me ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-rose-500"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-full transition-colors",
                                                    post.is_liked_by_me ? "bg-rose-500/10" : "group-hover:btn/hover:bg-rose-500/5"
                                                )}>
                                                    <Heart className={cn("w-5 h-5", post.is_liked_by_me && "fill-current")} />
                                                </div>
                                                <span className="tabular-nums">{post.likes_count || 0}</span>
                                            </button>

                                            <button
                                                onClick={() => toggleComments(post.id)}
                                                className={cn(
                                                    "flex items-center gap-2 text-sm transition-all duration-300 group/btn",
                                                    expandedPostId === post.id ? "text-blue-500 font-semibold" : "text-muted-foreground hover:text-blue-500"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-full transition-colors",
                                                    expandedPostId === post.id ? "bg-blue-500/10" : "group-hover:btn/hover:bg-blue-500/5"
                                                )}>
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                                <span className="tabular-nums">{post.comments_count || 0}</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/discussions#${post.id}`);
                                                    toast({
                                                        title: "Lien copié",
                                                        description: "Le lien du post a été copié dans le presse-papier"
                                                    });
                                                }}
                                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-500 transition-all duration-300 group/btn ml-auto"
                                            >
                                                <div className="p-2 rounded-full group-hover:btn/hover:bg-emerald-500/5 transition-colors">
                                                    <Share2 className="w-5 h-5" />
                                                </div>
                                                <span>Partager</span>
                                            </button>
                                        </div>

                                        {/* Section Commentaires Expansible */}
                                        <AnimatePresence>
                                            {expandedPostId === post.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-6 space-y-4">
                                                        {loadingComments[post.id] ? (
                                                            <div className="flex justify-center p-4">
                                                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30" />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {comments[post.id]?.map(comment => (
                                                                    <div key={comment.id} className="flex gap-3 bg-muted/10 p-3 rounded-2xl border border-border/20">
                                                                        {comment.author?.avatar_url ? (
                                                                            <img src={comment.author.avatar_url} className="w-8 h-8 rounded-full border border-border/50 shadow-sm" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/10">
                                                                                {(comment.author?.full_name || 'U').charAt(0).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[13px] font-bold">{comment.author?.full_name || 'Utilisateur'}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}</span>
                                                                            </div>
                                                                            <p className="text-[13px] text-foreground/80 leading-relaxed">{comment.content}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <div className="flex items-center gap-3 pt-2">
                                                                    <div className="flex-1 relative">
                                                                        <Input
                                                                            value={commentInputs[post.id] || ''}
                                                                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                            placeholder="Écrire un commentaire..."
                                                                            className="rounded-full bg-muted/20 border-border/40 focus-visible:ring-primary/20 h-10 pr-10 text-[13px]"
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post)}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleAddComment(post)}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 p-1.5 transition-colors"
                                                                        >
                                                                            <Send className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Modifier la publication</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[150px] resize-none border-border/40 rounded-2xl p-4"
                            />
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Lien du média (optionnel)</label>
                                <Input
                                    value={editMediaUrl}
                                    onChange={(e) => setEditMediaUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="rounded-xl border-border/40"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setEditingPost(null)} className="rounded-full">Annuler</Button>
                            <Button onClick={handleUpdatePost} className="rounded-full px-6">Enregistrer les modifications</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout >
    );
}
