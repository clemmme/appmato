import { useState, useEffect, useCallback } from 'react';
import { Star, ExternalLink, RefreshCw, Filter, Loader2, AlertCircle, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    fetchAllFeeds,
    getCachedFeeds,
    setCachedFeeds,
    getFavorites,
    toggleFavorite as toggleFav,
    CATEGORIES,
    type RSSItem,
    type Category,
} from '@/lib/rssFetcher';

export function NewsFeed() {
    const [items, setItems] = useState<RSSItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<Category>('Tout');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [favorites, setFavorites] = useState<string[]>(getFavorites());

    const loadFeeds = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);

        // STALE: Load from cache immediately (even if expired)
        const cached = getCachedFeeds(true);
        if (cached && cached.length > 0) {
            setItems(cached);
            // If cache is fresh enough, stop here unless forced
            const isFresh = getCachedFeeds(false);
            if (isFresh && !forceRefresh) {
                setLoading(false);
                return;
            }
        }

        // REVALIDATE: Fetch in background
        try {
            const results = await fetchAllFeeds();
            if (results.length > 0) {
                setItems(results);
                setCachedFeeds(results);
            } else if (items.length === 0) {
                setError('Aucun article trouvé. Les sources sont peut-être temporairement indisponibles.');
            }
        } catch {
            if (items.length === 0) {
                setError('Erreur de connexion aux flux RSS.');
            }
        }
        setLoading(false);
    }, [items.length]);

    useEffect(() => {
        loadFeeds();
    }, [loadFeeds]);

    const handleToggleFavorite = (link: string) => {
        const newFavs = toggleFav(link);
        setFavorites([...newFavs]);
    };

    const filtered = items.filter(item => {
        if (showFavoritesOnly && !favorites.includes(item.link)) return false;
        if (activeCategory !== 'Tout' && item.category !== activeCategory) return false;
        return true;
    });

    const categoryColors: Record<string, string> = {
        'Fiscalité': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        'Social': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        'Juridique': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        'TVA': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        'IS/IR': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground mr-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-semibold">Filtres :</span>
                </div>
                <div className="flex gap-1 bg-white/50 dark:bg-card/30 rounded-2xl p-1 border border-white/50 dark:border-white/10 backdrop-blur-md flex-wrap">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold rounded-xl transition-all",
                                activeCategory === cat
                                    ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all",
                        showFavoritesOnly
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                            : "bg-white/50 dark:bg-card/30 text-muted-foreground border-white/50 dark:border-white/10 hover:text-foreground"
                    )}
                >
                    <Star className={cn("w-4 h-4", showFavoritesOnly ? "fill-amber-500" : "")} />
                    Favoris
                </button>

                <button
                    onClick={() => loadFeeds(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white/50 dark:bg-card/30 text-muted-foreground border border-white/50 dark:border-white/10 hover:text-foreground transition-all ml-auto"
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Actualiser
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading && items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                        <p className="font-semibold">Chargement des articles…</p>
                    </div>
                ) : error && items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                        <AlertCircle className="w-10 h-10 text-rose-500" />
                        <p className="font-semibold">{error}</p>
                        <button onClick={() => loadFeeds(true)} className="text-sm text-indigo-500 underline font-medium">Réessayer</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                        <Newspaper className="w-10 h-10 opacity-40" />
                        <p className="font-semibold">Aucun article trouvé pour ce filtre.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((item, idx) => (
                            <article
                                key={`${item.link}-${idx}`}
                                className="group bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col gap-3"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", categoryColors[item.category] || 'bg-slate-100 text-slate-600')}>
                                        {item.category}
                                    </span>
                                    <button onClick={() => handleToggleFavorite(item.link)} className="shrink-0 p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                        <Star className={cn("w-4 h-4", favorites.includes(item.link) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                                    </button>
                                </div>

                                {/* Title */}
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-bold text-base leading-snug text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                    {item.title}
                                </a>

                                {/* Description */}
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">{item.description}</p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.source}</span>
                                        <span className="text-xs text-muted-foreground">{format(item.pubDate, 'dd MMM yyyy', { locale: fr })}</span>
                                    </div>
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                                        Lire <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
