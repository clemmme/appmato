import React, { useState, useMemo, useEffect } from 'react';
import { Euro, Briefcase, User, Info, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel, ExportData } from '@/lib/exportUtils';

type Categorie = 'cadre' | 'non_cadre' | 'stage';

export function SalarySimulator() {
    const [baseInput, setBaseInput] = useState<string>('2500'); // Monthly Gross base
    const [inputType, setInputType] = useState<'brut' | 'net' | 'cout'>('brut');
    const [categorie, setCategorie] = useState<Categorie>('non_cadre');
    const [tempsTravail, setTempsTravail] = useState<number>(35);

    // Simplified typical breakdown percentages for 2024/2025 standard cases
    const rates = useMemo(() => {
        switch (categorie) {
            case 'cadre': return { employee: 0.25, employer: 0.45 };
            case 'non_cadre': return { employee: 0.22, employer: 0.42 }; // Includes standard deductions
            case 'stage': return { employee: 0.0, employer: 0.05 }; // Minimal CSG/CRDS
        }
    }, [categorie]);

    const calculations = useMemo(() => {
        let brut = 0;
        const val = parseFloat(baseInput) || 0;

        switch (inputType) {
            case 'brut':
                brut = val;
                break;
            case 'net':
                brut = val / (1 - rates.employee);
                break;
            case 'cout':
                brut = val / (1 + rates.employer);
                break;
        }

        const net = brut * (1 - rates.employee);
        const coutTotal = brut * (1 + rates.employer);

        // Annualize considering 12 months
        return {
            monthly: { brut, net, coutTotal },
            annual: { brut: brut * 12, net: net * 12, coutTotal: coutTotal * 12 },
        };
    }, [baseInput, inputType, rates]);

    // Adjust placeholder when category changes to give a realistic number
    useEffect(() => {
        if (categorie === 'stage' && inputType === 'brut' && (baseInput === '2500' || baseInput === '3500')) {
            setBaseInput('650');
        } else if (categorie === 'cadre' && inputType === 'brut' && (baseInput === '2500' || baseInput === '650')) {
            setBaseInput('3500');
        } else if (categorie === 'non_cadre' && inputType === 'brut' && (baseInput === '3500' || baseInput === '650')) {
            setBaseInput('2500');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categorie]);

    const handleExport = (format: 'pdf' | 'excel') => {
        const data: ExportData = {
            title: "Simulation de Paie Express",
            subtitle: `Profil : ${categorie === 'non_cadre' ? 'Non-Cadre' : categorie === 'cadre' ? 'Cadre' : 'Stagiaire'} | Temps de travail : ${tempsTravail}h/sem`,
            filename: `Paie_${categorie}`,
            headers: [
                { header: 'Désignation', dataKey: 'label' },
                { header: 'Mensuel', dataKey: 'monthly' },
                { header: 'Annuel', dataKey: 'annual' },
            ],
            rows: [
                { label: 'Salaire Brut', monthly: calculations.monthly.brut.toFixed(2) + ' €', annual: calculations.annual.brut.toFixed(2) + ' €' },
                { label: 'Salaire Net (Perçu)', monthly: calculations.monthly.net.toFixed(2) + ' €', annual: calculations.annual.net.toFixed(2) + ' €' },
                { label: 'Coût Total Employeur', monthly: calculations.monthly.coutTotal.toFixed(2) + ' €', annual: calculations.annual.coutTotal.toFixed(2) + ' €' },
            ],
            summary: [
                ["Taux de cotisations Salariales estimés :", `${(rates.employee * 100).toFixed(1)} %`],
                ["Taux de charges Patronales estimées :", `${(rates.employer * 100).toFixed(1)} %`]
            ]
        };

        if (format === 'pdf') exportToPDF(data);
        else exportToExcel(data);
    };

    return (
        <div className="flex flex-col h-full fade-in pb-10">
            {/* Header */}
            <div className="px-6 py-8 md:px-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                        <span className="p-2.5 bg-emerald-500/10 rounded-2xl shadow-inner">
                            <Briefcase className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        </span>
                        Simulateur de Paie Express
                    </h2>
                    <p className="text-muted-foreground mt-3 font-medium text-lg">Estimation rapide du Net, du Brut et du Coût total employeur. (Taux simplifiés 24/25)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-2 rounded-xl bg-white/50 backdrop-blur-md border-white/40 hover:bg-white/80 dark:bg-black/20 dark:border-white/10 dark:hover:bg-black/40 shadow-sm transition-all text-sm font-semibold h-11 px-5">
                        <FileText className="w-4 h-4 text-rose-500" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-2 rounded-xl bg-white/50 backdrop-blur-md border-white/40 hover:bg-white/80 dark:bg-black/20 dark:border-white/10 dark:hover:bg-black/40 shadow-sm transition-all text-sm font-semibold h-11 px-5">
                        <Download className="w-4 h-4 text-emerald-600" /> Excel
                    </Button>
                </div>
            </div>

            {/* Top Config row */}
            <div className="px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 z-10 w-full">
                <div className="space-y-4 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Statut du Salarié</label>
                    <div className="flex rounded-2xl bg-slate-100/50 dark:bg-muted/50 p-1.5 border border-white/60 dark:border-border/50 shadow-inner">
                        <button onClick={() => setCategorie('non_cadre')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", categorie === 'non_cadre' ? "bg-white dark:bg-background shadow-md text-emerald-600 dark:text-emerald-400 scale-[1.02]" : "text-muted-foreground hover:text-foreground")}><User className="w-4 h-4 hidden sm:block" />Non-Cadre</button>
                        <button onClick={() => setCategorie('cadre')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", categorie === 'cadre' ? "bg-white dark:bg-background shadow-md text-emerald-600 dark:text-emerald-400 scale-[1.02]" : "text-muted-foreground hover:text-foreground")}><User className="w-4 h-4 hidden sm:block" />Cadre</button>
                        <button onClick={() => setCategorie('stage')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", categorie === 'stage' ? "bg-white dark:bg-background shadow-md text-emerald-600 dark:text-emerald-400 scale-[1.02]" : "text-muted-foreground hover:text-foreground")}><User className="w-4 h-4 hidden sm:block" />Stagiaire</button>
                    </div>
                </div>

                <div className={cn("space-y-4 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-opacity duration-500", categorie === 'stage' ? "opacity-50 pointer-events-none" : "opacity-100")}>
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Temps de travail</label>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 rounded-full shadow-sm">{tempsTravail} h/sem</span>
                    </div>
                    <div className="pt-2 pb-2">
                        <Slider value={[tempsTravail]} min={10} max={39} step={0.5} onValueChange={v => setTempsTravail(v[0])} className="py-2" />
                    </div>
                </div>
            </div>

            {/* Interactive Cards Container */}
            <div className="flex-1 px-6 lg:px-10 pb-10 flex flex-col items-center z-10 w-full relative">
                <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
                    {/* NET CARD */}
                    <div className={cn(
                        "relative p-8 rounded-[2.5rem] transition-all duration-300 flex flex-col items-center text-center overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] border",
                        inputType === 'net' ? "bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-transparent scale-[1.04] shadow-emerald-500/30 shadow-2xl z-20" : "bg-white/60 dark:bg-card/40 backdrop-blur-xl border-white/50 dark:border-border/50 hover:border-emerald-500/40 cursor-pointer"
                    )} onClick={() => setInputType('net')}>
                        {inputType === 'net' && <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-20 rounded-full blur-[60px] mix-blend-overlay"></div>}

                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-colors", inputType === 'net' ? "bg-white/20 backdrop-blur-md" : "bg-emerald-100 dark:bg-emerald-500/10")}>
                            <User className={cn("w-8 h-8", inputType === 'net' ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                        </div>
                        <h3 className={cn("text-xl font-black mb-1 tracking-tight", inputType === 'net' ? "" : "text-slate-800 dark:text-slate-200")}>Salaire Net</h3>
                        <p className={cn("text-xs font-bold tracking-widest uppercase mb-8", inputType === 'net' ? "text-emerald-100/90" : "text-muted-foreground/60")}>Perçu par le salarié</p>

                        {inputType === 'net' ? (
                            <div className="w-full relative mt-auto mb-4">
                                <Input autoFocus type="number" value={baseInput} onChange={e => setBaseInput(e.target.value)} className="h-16 text-2xl font-black text-center border-0 bg-black/10 ring-2 ring-white/50 focus-visible:ring-white rounded-3xl placeholder-white/30 text-white shadow-inner px-4" placeholder="2000" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 font-bold text-lg">€</span>
                            </div>
                        ) : (
                            <div className="text-4xl md:text-5xl font-black mt-auto tracking-tighter mb-4 text-slate-800 dark:text-white drop-shadow-sm break-words">{calculations.monthly.net.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-2xl opacity-60 font-bold">€</span></div>
                        )}
                        <div className={cn("mt-auto pt-6 border-t w-full", inputType === 'net' ? "border-white/20" : "border-slate-200 dark:border-border/50")}>
                            <div className={cn("text-xs font-bold uppercase tracking-widest mb-1", inputType === 'net' ? "text-emerald-100/80" : "text-muted-foreground/70")}>Annuel estimé</div>
                            <div className="font-extrabold text-xl">{calculations.annual.net.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</div>
                        </div>
                    </div>

                    {/* BRUT CARD */}
                    <div className={cn(
                        "relative p-8 rounded-[2.5rem] transition-all duration-300 flex flex-col items-center text-center overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] border",
                        inputType === 'brut' ? "bg-gradient-to-br from-blue-500 to-indigo-700 text-white border-transparent scale-[1.04] shadow-blue-500/30 shadow-2xl z-20" : "bg-white/60 dark:bg-card/40 backdrop-blur-xl border-white/50 dark:border-border/50 hover:border-blue-500/40 cursor-pointer"
                    )} onClick={() => setInputType('brut')}>
                        {inputType === 'brut' && <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-20 rounded-full blur-[60px] mix-blend-overlay"></div>}

                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-colors", inputType === 'brut' ? "bg-white/20 backdrop-blur-md" : "bg-blue-100 dark:bg-blue-500/10")}>
                            <Euro className={cn("w-8 h-8", inputType === 'brut' ? "text-white" : "text-blue-600 dark:text-blue-400")} />
                        </div>
                        <h3 className={cn("text-xl font-black mb-1 tracking-tight", inputType === 'brut' ? "" : "text-slate-800 dark:text-slate-200")}>Salaire Brut</h3>
                        <p className={cn("text-xs font-bold tracking-widest uppercase mb-8", inputType === 'brut' ? "text-blue-100/90" : "text-muted-foreground/60")}>Base du contrat</p>

                        {inputType === 'brut' ? (
                            <div className="w-full relative mt-auto mb-4">
                                <Input autoFocus type="number" value={baseInput} onChange={e => setBaseInput(e.target.value)} className="h-16 text-2xl font-black text-center border-0 bg-black/10 ring-2 ring-white/50 focus-visible:ring-white rounded-3xl placeholder-white/30 text-white shadow-inner px-4" placeholder="2500" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 font-bold text-lg">€</span>
                            </div>
                        ) : (
                            <div className="text-4xl md:text-5xl font-black mt-auto tracking-tighter mb-4 text-slate-800 dark:text-white drop-shadow-sm break-words">{calculations.monthly.brut.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-2xl opacity-60 font-bold">€</span></div>
                        )}

                        <div className={cn("mt-auto pt-6 border-t w-full", inputType === 'brut' ? "border-white/20" : "border-slate-200 dark:border-border/50")}>
                            <div className={cn("text-xs font-bold uppercase tracking-widest mb-1", inputType === 'brut' ? "text-blue-100/80" : "text-muted-foreground/70")}>Annuel estimé</div>
                            <div className="font-extrabold text-xl">{calculations.annual.brut.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</div>
                        </div>
                    </div>

                    {/* COUT EMPLOYER CARD */}
                    <div className={cn(
                        "relative p-8 rounded-[2.5rem] transition-all duration-300 flex flex-col items-center text-center overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] border",
                        inputType === 'cout' ? "bg-gradient-to-br from-purple-500 to-fuchsia-700 text-white border-transparent scale-[1.04] shadow-purple-500/30 shadow-2xl z-20" : "bg-white/60 dark:bg-card/40 backdrop-blur-xl border-white/50 dark:border-border/50 hover:border-purple-500/40 cursor-pointer"
                    )} onClick={() => setInputType('cout')}>
                        {inputType === 'cout' && <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-20 rounded-full blur-[60px] mix-blend-overlay"></div>}

                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-colors", inputType === 'cout' ? "bg-white/20 backdrop-blur-md" : "bg-purple-100 dark:bg-purple-500/10")}>
                            <Briefcase className={cn("w-8 h-8", inputType === 'cout' ? "text-white" : "text-purple-600 dark:text-purple-400")} />
                        </div>
                        <h3 className={cn("text-xl font-black mb-1 tracking-tight", inputType === 'cout' ? "" : "text-slate-800 dark:text-slate-200")}>Coût Employeur</h3>
                        <p className={cn("text-xs font-bold tracking-widest uppercase mb-8", inputType === 'cout' ? "text-purple-100/90" : "text-muted-foreground/60")}>Brut + Patronales</p>

                        {inputType === 'cout' ? (
                            <div className="w-full relative mt-auto mb-4">
                                <Input autoFocus type="number" value={baseInput} onChange={e => setBaseInput(e.target.value)} className="h-16 text-2xl font-black text-center border-0 bg-black/10 ring-2 ring-white/50 focus-visible:ring-white rounded-3xl placeholder-white/30 text-white shadow-inner px-4" placeholder="3000" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 font-bold text-lg">€</span>
                            </div>
                        ) : (
                            <div className="text-4xl md:text-5xl font-black mt-auto tracking-tighter mb-4 text-slate-800 dark:text-white drop-shadow-sm break-words">{calculations.monthly.coutTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-2xl opacity-60 font-bold">€</span></div>
                        )}

                        <div className={cn("mt-auto pt-6 border-t w-full", inputType === 'cout' ? "border-white/20" : "border-slate-200 dark:border-border/50")}>
                            <div className={cn("text-xs font-bold uppercase tracking-widest mb-1", inputType === 'cout' ? "text-purple-100/80" : "text-muted-foreground/70")}>Annuel estimé</div>
                            <div className="font-extrabold text-xl">{calculations.annual.coutTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-muted-foreground/70 bg-white/50 dark:bg-card/30 rounded-full px-6 py-3 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2"><Info className="w-5 h-5 text-emerald-500" /> Cliquez sur une carte pour modifier manuellement son montant et recalculer les autres.</div>
                </div>
            </div>
        </div>
    );
}
