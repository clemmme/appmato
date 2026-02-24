import { useState } from 'react';
import { Search, ExternalLink, Clock, BookOpen, X, ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'veille_bofip_recent';

function getRecentSearches(): string[] {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function addRecentSearch(query: string): string[] {
    const searches = getRecentSearches().filter(s => s !== query);
    searches.unshift(query);
    const limited = searches.slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(limited));
    return limited;
}

function clearRecentSearches(): void {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
}

const POPULAR_SEARCHES = [
    'TVA sur marge',
    'LMNP regime fiscal',
    'Credit impot recherche CIR',
    'Plus-value immobiliere',
    'Amortissement degressif',
    'Regime micro-BNC seuils',
    'Taxe sur les salaires',
    'CFE exoneration',
];

// Curated BOFiP topic directory from the official Plan de Classement
interface BofipTopic {
    title: string;
    code: string;
    url: string;
    color: string;
    subtopics: { label: string; url: string }[];
}

const BOFIP_DIRECTORY: BofipTopic[] = [
    {
        title: 'TVA - Taxe sur la Valeur Ajoutee',
        code: 'TVA',
        url: 'https://bofip.impots.gouv.fr/bofip/240-PGP.html',
        color: 'from-blue-500 to-indigo-600',
        subtopics: [
            { label: "Champ d'application", url: 'https://bofip.impots.gouv.fr/bofip/240-PGP.html' },
            { label: 'Taux de TVA', url: 'https://bofip.impots.gouv.fr/bofip/206-PGP.html' },
            { label: 'Droits a deduction', url: 'https://bofip.impots.gouv.fr/bofip/258-PGP.html' },
            { label: 'Regime simplifie (CA12)', url: 'https://bofip.impots.gouv.fr/bofip/271-PGP.html' },
        ],
    },
    {
        title: 'IS - Impot sur les Societes',
        code: 'IS',
        url: 'https://bofip.impots.gouv.fr/bofip/3066-PGP.html',
        color: 'from-purple-500 to-fuchsia-600',
        subtopics: [
            { label: "Champ d'application", url: 'https://bofip.impots.gouv.fr/bofip/3066-PGP.html' },
            { label: 'Base d\'imposition', url: 'https://bofip.impots.gouv.fr/bofip/3113-PGP.html' },
            { label: 'Taux et liquidation', url: 'https://bofip.impots.gouv.fr/bofip/3184-PGP.html' },
            { label: 'Regime des groupes', url: 'https://bofip.impots.gouv.fr/bofip/3249-PGP.html' },
        ],
    },
    {
        title: 'IR - Impot sur le Revenu',
        code: 'IR',
        url: 'https://bofip.impots.gouv.fr/bofip/1-PGP.html',
        color: 'from-emerald-500 to-teal-600',
        subtopics: [
            { label: 'Bareme et liquidation', url: 'https://bofip.impots.gouv.fr/bofip/2159-PGP.html' },
            { label: 'Reductions et credits', url: 'https://bofip.impots.gouv.fr/bofip/2040-PGP.html' },
            { label: 'Prelevement a la source', url: 'https://bofip.impots.gouv.fr/bofip/11255-PGP.html' },
        ],
    },
    {
        title: 'BIC - Benefices Industriels et Commerciaux',
        code: 'BIC',
        url: 'https://bofip.impots.gouv.fr/bofip/4624-PGP.html',
        color: 'from-amber-500 to-orange-600',
        subtopics: [
            { label: 'Amortissements', url: 'https://bofip.impots.gouv.fr/bofip/4520-PGP.html' },
            { label: 'Plus-values et moins-values', url: 'https://bofip.impots.gouv.fr/bofip/4347-PGP.html' },
            { label: 'Provisions', url: 'https://bofip.impots.gouv.fr/bofip/4368-PGP.html' },
            { label: 'Credit Impot Recherche', url: 'https://bofip.impots.gouv.fr/bofip/6486-PGP.html' },
        ],
    },
    {
        title: 'BNC - Benefices Non Commerciaux',
        code: 'BNC',
        url: 'https://bofip.impots.gouv.fr/bofip/4768-PGP.html',
        color: 'from-rose-500 to-pink-600',
        subtopics: [
            { label: "Champ d'application", url: 'https://bofip.impots.gouv.fr/bofip/4768-PGP.html' },
            { label: "Base d'imposition", url: 'https://bofip.impots.gouv.fr/bofip/4779-PGP.html' },
            { label: 'Regime micro-BNC', url: 'https://bofip.impots.gouv.fr/bofip/4795-PGP.html' },
        ],
    },
    {
        title: 'RFPI - Revenus Fonciers & Patrimoine Immobilier',
        code: 'RFPI',
        url: 'https://bofip.impots.gouv.fr/bofip/4950-PGP.html',
        color: 'from-cyan-500 to-sky-600',
        subtopics: [
            { label: 'Plus-values immobilieres', url: 'https://bofip.impots.gouv.fr/bofip/239-PGP.html' },
            { label: 'Revenus fonciers', url: 'https://bofip.impots.gouv.fr/bofip/4950-PGP.html' },
            { label: 'LMNP / LMP', url: 'https://bofip.impots.gouv.fr/bofip/4624-PGP.html' },
        ],
    },
];

export function BofipSearch() {
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

    const doSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        const updated = addRecentSearch(searchQuery.trim());
        setRecentSearches(updated);
        // Open Google with site restriction in new tab — this is the most reliable approach
        window.open(
            `https://www.google.com/search?q=site:bofip.impots.gouv.fr+${encodeURIComponent(searchQuery)}`,
            '_blank'
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        doSearch(query);
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher dans le BOFiP via Google... (ex: TVA sur marge, LMNP)"
                    className="w-full h-14 text-lg rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm px-14 font-medium placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
                {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!query.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-40 hover:shadow-lg transition-all"
                >
                    Chercher
                </button>
            </form>

            {/* Info banner */}
            <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
                <Search className="w-4 h-4 shrink-0" />
                La recherche ouvre Google (restreint a bofip.impots.gouv.fr) dans un nouvel onglet pour des resultats fiables et complets.
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar space-y-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <Clock className="w-4 h-4" /> Recherches recentes
                            </div>
                            <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-xs text-muted-foreground/60 hover:text-rose-500 transition-colors">
                                Effacer
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recentSearches.map(s => (
                                <button key={s} onClick={() => { setQuery(s); doSearch(s); }} className="px-4 py-2 bg-white/60 dark:bg-card/40 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all shadow-sm">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Popular Searches */}
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                        <BookOpen className="w-4 h-4" /> Recherches populaires
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map(s => (
                            <button key={s} onClick={() => { setQuery(s); doSearch(s); }} className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:shadow-md hover:scale-[1.02] transition-all">
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOFiP Directory */}
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                        <Folder className="w-4 h-4" /> Acces direct par theme (Plan de Classement BOFiP)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {BOFIP_DIRECTORY.map(topic => {
                            const isExpanded = expandedTopic === topic.code;
                            return (
                                <div
                                    key={topic.code}
                                    className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
                                >
                                    {/* Topic Header */}
                                    <button
                                        onClick={() => setExpandedTopic(isExpanded ? null : topic.code)}
                                        className="w-full flex items-center gap-3 p-5 text-left"
                                    >
                                        <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md", topic.color)}>
                                            {topic.code}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{topic.title}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-0.5">{topic.subtopics.length} sous-themes</p>
                                        </div>
                                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground/40 transition-transform", isExpanded && "rotate-90")} />
                                    </button>

                                    {/* Subtopics */}
                                    {isExpanded && (
                                        <div className="px-5 pb-4 space-y-1 border-t border-slate-100 dark:border-white/5 pt-3">
                                            <a
                                                href={topic.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Voir tout
                                            </a>
                                            {topic.subtopics.map(sub => (
                                                <a
                                                    key={sub.label}
                                                    href={sub.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                                >
                                                    <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                                                    {sub.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
