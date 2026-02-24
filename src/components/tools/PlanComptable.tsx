import React, { useState, useMemo } from 'react';
import { Search, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { pcg2026 } from '@/data/pcg2026';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function PlanComptable() {
    const [query, setQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const filteredAccounts = useMemo(() => {
        return pcg2026.filter((acc) => {
            const matchQuery = acc.numero.includes(query) || acc.libelle.toLowerCase().includes(query.toLowerCase());
            const matchClass = selectedClass ? acc.classe === selectedClass : true;
            return matchQuery && matchClass;
        }).slice(0, 50); // Limit to 50 results for performance
    }, [query, selectedClass]);

    const classes = [
        { id: '1', label: '1 - Comptes de capitaux', color: 'bg-indigo-100 text-indigo-700' },
        { id: '2', label: '2 - Comptes d\'immobilisations', color: 'bg-blue-100 text-blue-700' },
        { id: '3', label: '3 - Comptes de stocks', color: 'bg-cyan-100 text-cyan-700' },
        { id: '4', label: '4 - Comptes de tiers', color: 'bg-emerald-100 text-emerald-700' },
        { id: '5', label: '5 - Comptes financiers', color: 'bg-amber-100 text-amber-700' },
        { id: '6', label: '6 - Comptes de charges', color: 'bg-red-100 text-red-700' },
        { id: '7', label: '7 - Comptes de produits', color: 'bg-purple-100 text-purple-700' },
    ];

    return (
        <div className="flex flex-col h-full bg-background rounded-xl">
            <div className="p-6 border-b border-border/50 bg-muted/20">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    Plan Comptable Général
                    <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full tracking-wider">2026</span>
                </h2>
                <p className="text-muted-foreground text-sm mt-1 mb-6">Moteur de recherche ultra-rapide intégrant les mises à jour de l'ANC applicables en 2026.</p>

                {/* Nouveautés Alert */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-sm text-amber-700 (dark:text-amber-400) mb-6">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                    <div>
                        <strong>Rappel PCG 2026 :</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            <li>Suppression du transfert de charges (Comptes 79).</li>
                            <li>Nouvelle définition stricte du Résultat Exceptionnel.</li>
                        </ul>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                        type="text"
                        placeholder="Rechercher par numéro ou par libellé... (ex: 4456)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-12 text-lg rounded-xl bg-background border-border"
                    />
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <button
                        onClick={() => setSelectedClass(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                            !selectedClass ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted text-muted-foreground border-border/50"
                        )}
                    >
                        Tous les comptes
                    </button>
                    {classes.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedClass(c.id === selectedClass ? null : c.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                selectedClass === c.id
                                    ? `${c.color.replace('100', '500').replace('700', 'white')} border-transparent shadow-sm`
                                    : "bg-card hover:bg-muted text-muted-foreground border-border/50"
                            )}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
                {filteredAccounts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="font-medium">Aucun compte trouvé</p>
                        <p className="text-sm">Vérifiez la numérotation ou le libellé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                        {filteredAccounts.map((acc) => (
                            <div
                                key={acc.numero}
                                className="group p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-border transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-xl font-bold text-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                                            {acc.numero}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-3">
                                        {acc.libelle}
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Classe {acc.classe}
                                    <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
