import { useState, useCallback } from 'react';
import { Search, Building2, MapPin, Users, TrendingUp, ChevronRight, ExternalLink, Copy, Check, Loader2, X, BadgeCheck, BadgeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    searchEntreprises,
    formatSiren,
    formatSiret,
    getNafLabel,
    getEffectifLabel,
    getNatureLabel,
    formatCurrency,
    type EntrepriseResult,
} from '@/lib/entrepriseApi';

export function EntrepriseSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<EntrepriseResult[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<EntrepriseResult | null>(null);
    const [copiedField, setCopiedField] = useState('');

    const handleSearch = useCallback(async (searchQuery?: string) => {
        const q = searchQuery ?? query;
        if (!q.trim()) return;
        setLoading(true);
        setError('');
        setSelectedCompany(null);
        try {
            const data = await searchEntreprises(q, 1, 10);
            setResults(data.results);
            setTotalResults(data.total_results);
        } catch {
            setError('Erreur lors de la recherche. Veuillez réessayer.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch();
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 1500);
    };

    const CopyBtn = ({ text, field }: { text: string; field: string }) => (
        <button onClick={() => copyToClipboard(text, field)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            {copiedField === field ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/40" />}
        </button>
    );

    // Detail View
    if (selectedCompany) {
        const c = selectedCompany;
        const isActive = c.etat_administratif === 'A';
        const latestFinance = c.finances ? Object.entries(c.finances).sort(([a], [b]) => b.localeCompare(a))[0] : null;
        const physDirigeants = c.dirigeants?.filter(d => d.type_dirigeant === 'personne physique') || [];

        return (
            <div className="flex flex-col gap-4 h-full overflow-auto custom-scrollbar animate-in slide-in-from-right-5 duration-300">
                {/* Back */}
                <button onClick={() => setSelectedCompany(null)} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline self-start">
                    ← Retour aux résultats
                </button>

                {/* Header Card */}
                <div className="bg-white/70 dark:bg-card/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg", isActive ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-rose-600")}>
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{c.nom_complet}</h2>
                                {isActive ? <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" /> : <BadgeX className="w-5 h-5 text-red-500 shrink-0" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{getNatureLabel(c.nature_juridique)} • {getNafLabel(c.activite_principale)}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                                    {isActive ? 'Active' : 'Cessée'}
                                </span>
                                {c.categorie_entreprise && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold">{c.categorie_entreprise}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Identifiers */}
                    <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Identifiants</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">SIREN</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-sm">{formatSiren(c.siren)}</span>
                                    <CopyBtn text={c.siren} field="siren" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">SIRET (Siège)</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-sm">{formatSiret(c.siege.siret)}</span>
                                    <CopyBtn text={c.siege.siret} field="siret" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Code NAF</span>
                                <span className="font-bold text-sm">{c.activite_principale}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Création</span>
                                <span className="font-bold text-sm">{new Date(c.date_creation).toLocaleDateString('fr-FR')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Siège social</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm">{c.siege.adresse}</p>
                                    <p className="text-xs text-muted-foreground">{c.siege.code_postal} {c.siege.libelle_commune}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Etablissements</span>
                                <span className="font-bold text-sm">{c.nombre_etablissements_ouverts} ouvert(s) / {c.nombre_etablissements}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Effectif</span>
                                <span className="font-bold text-sm">{getEffectifLabel(c.tranche_effectif_salarie)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Finances */}
                    {latestFinance && (
                        <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                <TrendingUp className="w-4 h-4 inline mr-1" /> Finances ({latestFinance[0]})
                            </h3>
                            <div className="space-y-3">
                                {latestFinance[1].ca != null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Chiffre d'affaires</span>
                                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(latestFinance[1].ca)}</span>
                                    </div>
                                )}
                                {latestFinance[1].resultat_net != null && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Résultat net</span>
                                        <span className={cn("font-bold text-lg", (latestFinance[1].resultat_net ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                            {formatCurrency(latestFinance[1].resultat_net ?? 0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Directors */}
                    {physDirigeants.length > 0 && (
                        <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                <Users className="w-4 h-4 inline mr-1" /> Dirigeants ({physDirigeants.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar">
                                {physDirigeants.slice(0, 6).map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold">{d.prenoms} {d.nom}</span>
                                        <span className="text-xs text-muted-foreground truncate ml-2">{d.qualite}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* External links */}
                <div className="flex gap-2 flex-wrap">
                    <a href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${c.siren}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:shadow-md transition-all">
                        <ExternalLink className="w-3.5 h-3.5" /> Fiche complète gouv.fr
                    </a>
                    <a href={`https://www.societe.com/cgi-bin/search?champs=${c.siren}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:shadow-md transition-all">
                        <ExternalLink className="w-3.5 h-3.5" /> Societe.com
                    </a>
                    <a href={`https://www.pappers.fr/entreprise/${c.siren}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:shadow-md transition-all">
                        <ExternalLink className="w-3.5 h-3.5" /> Pappers
                    </a>
                </div>
            </div>
        );
    }

    // Search View
    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Nom, SIREN, SIRET... (ex: Deloitte, 434209797)"
                    className="w-full h-14 text-lg rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm px-14 font-medium placeholder-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
                {query && (
                    <button type="button" onClick={() => { setQuery(''); setResults([]); setTotalResults(0); }} className="absolute right-16 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-40 hover:shadow-lg transition-all"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Chercher'}
                </button>
            </form>

            {/* Suggestions */}
            {!results.length && !loading && !error && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Recherches rapides :</p>
                    <div className="flex flex-wrap gap-2">
                        {['Deloitte', 'KPMG', 'BNP Paribas', 'Orange', 'Carrefour'].map(s => (
                            <button key={s} onClick={() => { setQuery(s); handleSearch(s); }}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:shadow-md hover:scale-[1.02] transition-all">
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
                        <Building2 className="w-5 h-5 shrink-0" />
                        <span>Données officielles INSEE via <strong>api.gouv.fr</strong> — gratuites et mises à jour quotidiennement.</span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="flex-1 overflow-auto custom-scrollbar space-y-3">
                    <p className="text-sm text-muted-foreground">{totalResults.toLocaleString('fr-FR')} résultat(s) trouvé(s)</p>
                    {results.map(r => {
                        const isActive = r.etat_administratif === 'A';
                        return (
                            <button
                                key={r.siren}
                                onClick={() => setSelectedCompany(r)}
                                className="w-full text-left bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:scale-[1.005] transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow", isActive ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-500")}>
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm truncate">{r.nom_complet}</h4>
                                            {!isActive && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full shrink-0">Cessée</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{formatSiren(r.siren)} • {r.siege.libelle_commune} ({r.siege.departement}) • {getNafLabel(r.activite_principale)}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-500 transition-colors shrink-0" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
