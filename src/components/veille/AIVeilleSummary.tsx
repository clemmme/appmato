import { useState, useCallback } from 'react';
import { Sparkles, Loader2, X, FileText, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendMessage, type ChatMessage } from '@/lib/geminiApi';
import { type RSSItem } from '@/lib/rssFetcher';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface AIVeilleSummaryProps {
    items: RSSItem[];
}

export function AIVeilleSummary({ items }: AIVeilleSummaryProps) {
    const [summary, setSummary] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const generateSummary = useCallback(async () => {
        if (items.length === 0) return;

        setLoading(true);
        setError(null);

        // Filter items from the last 7 days
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let recentItems = items.filter(item => item.pubDate >= lastWeek);

        // Fallback 1: Last 30 days
        if (recentItems.length === 0) {
            recentItems = items.filter(item => item.pubDate >= lastMonth);
        }

        // Fallback 2: Last 10 articles (regardless of date)
        if (recentItems.length === 0 && items.length > 0) {
            recentItems = items.slice(0, 10);
        }

        if (recentItems.length === 0) {
            setError("Aucune actualité disponible pour générer un résumé. Essayez de rafraîchir les flux.");
            setLoading(false);
            return;
        }

        // Format data for the prompt
        const newsContent = recentItems.map(item =>
            `- [${item.category}] ${item.title}\n  Source: ${item.source}\n  Lien: ${item.link}\n  Description: ${item.description}`
        ).join('\n\n');

        const promoDetails = `L'utilisateur est un EXPERT-COMPTABLE SENIOR. 
Il connaît déjà parfaitement les bases (taux de TVA standards, calendrier fiscal classique, etc.).
NE RAPPELLE JAMAIS les bases orales ou les évidences.

CONSIGNES DE SYNTHÈSE :
1. FILTRE les articles "basiques" ou "vulgarisation".
2. PRIORISE l'analyse technique : Jurisprudence complexe, nouveaux décrets d'application, modifications de seuils fiscaux/sociaux, doctrine administrative (BOFiP).
3. ANALYSE l'impact stratégique pour le cabinet et ses clients (PME/TPE).
4. STRUCTURE par thématiques (Fiscal, Social, Juridique).
5. INTERDIT : Ne fais JAMAIS de tableaux. Utilise des listes à puces.
6. TONALITÉ : Expert, précis, technique, citant les articles de loi si disponibles.
`;

        const prompt = `${promoDetails}\n\nVoici les actualités à analyser :\n\n${newsContent}`;

        const chatMessages: ChatMessage[] = [
            {
                role: 'user',
                text: prompt,
                timestamp: Date.now()
            }
        ];

        try {
            const response = await sendMessage(chatMessages);
            setSummary(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'analyse.");
        } finally {
            setLoading(false);
        }
    }, [items]);

    // Simple markdown renderer for the summary
    const renderSummary = (text: string) => {
        const processInline = (line: string): string => {
            return line
                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-bold">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em class="text-indigo-600 dark:text-indigo-400">$1</em>')
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all no-underline"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>$1</a>');
        };

        return text.split('\n').map((line, i) => {
            const cleanLine = line.trim();
            if (!cleanLine && i > 0) return <div key={i} className="h-4" />;

            if (cleanLine.startsWith('### ')) return <h4 key={i} className="text-[10px] font-black mt-4 mb-2 text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{cleanLine.replace('### ', '')}</h4>;
            if (cleanLine.startsWith('## ')) return <h3 key={i} className="text-lg font-black mt-6 mb-3 text-slate-900 dark:text-white flex items-center gap-2 border-l-4 border-indigo-500 pl-3">{cleanLine.replace('## ', '')}</h3>;
            if (cleanLine.startsWith('# ')) return <h2 key={i} className="text-xl font-black mt-8 mb-4 text-slate-900 dark:text-white underline decoration-indigo-500/30 underline-offset-8">{cleanLine.replace('# ', '')}</h2>;

            if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                return (
                    <div key={i} className="flex gap-3 mb-2 ml-1 items-start group">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform" />
                        <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                            dangerouslySetInnerHTML={{ __html: processInline(cleanLine.replace(/^[-*] /, '')) }} />
                    </div>
                );
            }

            return <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-2 font-medium"
                dangerouslySetInnerHTML={{ __html: processInline(cleanLine) }} />;
        });
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    onClick={() => {
                        setOpen(true);
                        if (!summary) generateSummary();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all animate-in fade-in duration-500"
                >
                    <Sparkles className="w-4 h-4" />
                    Résumé IA
                </button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col gap-0 border-l border-white/10 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Header Section */}
                <div className="p-6 bg-gradient-to-br from-violet-600 to-indigo-700 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                    <SheetHeader className="relative z-10 text-left">
                        <div className="flex items-center gap-2 mb-2 text-indigo-100/80 uppercase tracking-widest text-[10px] font-bold">
                            <Sparkles className="w-3 h-3" />
                            Intelligence Artificielle
                        </div>
                        <SheetTitle className="text-white text-2xl font-black tracking-tight flex items-center gap-3">
                            Résumé de votre semaine
                        </SheetTitle>
                        <p className="text-indigo-100/70 text-sm font-medium">Synthèse structurée des actualités comptables & fiscales</p>
                    </SheetHeader>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6 py-20 animate-in fade-in duration-500">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
                                    <BotIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <div className="absolute -bottom-1 -right-1">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">Alfred analyse les flux...</p>
                                <p className="text-sm text-muted-foreground mt-1">Extraction des points clés de la semaine</p>
                            </div>
                            <div className="w-full max-w-[250px] space-y-3">
                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-full animate-pulse" />
                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-[80%] animate-pulse" style={{ animationDelay: '0.2s' }} />
                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-5 rounded-2xl flex gap-3 text-rose-700 dark:text-rose-400 animate-in zoom-in-95">
                            <X className="w-5 h-5 shrink-0" />
                            <div className="space-y-2">
                                <p className="font-bold">Analyse interrompue</p>
                                <p className="text-sm">{error}</p>
                                <button onClick={generateSummary} className="text-sm font-bold underline">Réessayer</button>
                            </div>
                        </div>
                    ) : summary ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-700">
                            <div className="bg-white dark:bg-slate-900 border border-white dark:border-white/5 rounded-3xl p-6 shadow-sm mb-6">
                                {renderSummary(summary)}
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex gap-3 items-center">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                    <FileText className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Sources vérifiées</p>
                                    <p className="text-[10px] text-indigo-700/70 dark:text-indigo-400/70">Basé sur les flux officiels et la presse spécialisée de la semaine.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground opacity-50">
                            <Calendar className="w-12 h-12" />
                            <p className="font-medium italic">Cliquez sur le bouton pour générer le résumé</p>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <button
                        onClick={() => setOpen(false)}
                        className="w-full py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                        Fermer le résumé
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function BotIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    );
}
