import React, { useState, useMemo } from 'react';
import { Car, Info, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel, ExportData } from '@/lib/exportUtils';

type PowerCV = '3' | '4' | '5' | '6' | '7+';

interface IKScale {
    cv: PowerCV;
    upTo5k: number;
    from5kTo20kRate: number;
    from5kTo20kFixed: number;
    above20k: number;
}

// Barème officiel (simplifié base 2024 pour exemple)
const SCALE: IKScale[] = [
    { cv: '3', upTo5k: 0.548, from5kTo20kRate: 0.327, from5kTo20kFixed: 1104, above20k: 0.382 },
    { cv: '4', upTo5k: 0.635, from5kTo20kRate: 0.358, from5kTo20kFixed: 1382, above20k: 0.427 },
    { cv: '5', upTo5k: 0.671, from5kTo20kRate: 0.375, from5kTo20kFixed: 1478, above20k: 0.449 },
    { cv: '6', upTo5k: 0.697, from5kTo20kRate: 0.393, from5kTo20kFixed: 1515, above20k: 0.468 },
    { cv: '7+', upTo5k: 0.730, from5kTo20kRate: 0.413, from5kTo20kFixed: 1584, above20k: 0.492 },
];

export function MileageCalculator() {
    const [distance, setDistance] = useState<number>(3500);
    const [cv, setCv] = useState<PowerCV>('5');
    const [isElectric, setIsElectric] = useState<boolean>(false);

    const calculateIK = (d: number, power: PowerCV, electric: boolean) => {
        const scale = SCALE.find(s => s.cv === power)!;
        let amount = 0;

        if (d <= 5000) {
            amount = d * scale.upTo5k;
        } else if (d <= 20000) {
            amount = (d * scale.from5kTo20kRate) + scale.from5kTo20kFixed;
        } else {
            amount = d * scale.above20k;
        }

        // Majoration véhicule électrique +20%
        if (electric) {
            amount = amount * 1.20;
        }

        return amount;
    };

    const allowance = useMemo(() => calculateIK(distance, cv, isElectric), [distance, cv, isElectric]);

    const CV_OPTIONS: PowerCV[] = ['3', '4', '5', '6', '7+'];

    const handleExport = (format: 'pdf' | 'excel') => {
        const data: ExportData = {
            title: "Indemnités Kilométriques",
            subtitle: `Véhicule: ${cv} CV | Électricité: ${isElectric ? 'Oui (+20%)' : 'Non'} | Total: ${distance} km`,
            filename: `IK_${cv}cv_${distance}km`,
            headers: [
                { header: 'Désignation', dataKey: 'label' },
                { header: 'Valeur', dataKey: 'value' },
            ],
            rows: [
                { label: 'Indemnité de Base', value: (isElectric ? allowance / 1.2 : allowance).toFixed(2) + ' €' },
                { label: 'Majoration Électrique (20%)', value: (isElectric ? (allowance - (allowance / 1.2)) : 0).toFixed(2) + ' €' },
                { label: 'Montant Total Déductible', value: allowance.toFixed(2) + ' €' }
            ],
            summary: [
                ["Distance déclarée :", `${distance} km`],
                ["Puissance fiscale retenue :", `${cv} CV`]
            ]
        };

        if (format === 'pdf') exportToPDF(data);
        else exportToExcel(data);
    };

    return (
        <div className="flex flex-col h-full fade-in">
            <div className="px-6 py-8 md:px-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                        <span className="p-2.5 bg-primary/10 rounded-2xl shadow-inner">
                            <Car className="w-7 h-7 text-primary" />
                        </span>
                        Indemnités Kilométriques
                    </h2>
                    <p className="text-muted-foreground mt-3 font-medium text-lg">Calcul automatique de la déduction pour frais professionnels selon le barème officiel.</p>
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

            <div className="flex-1 px-6 lg:px-10 pb-10 grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-12 items-stretch h-full">

                {/* Input Form */}
                <div className="space-y-8 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative flex flex-col justify-center">

                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Puissance Fiscale (CV)</label>
                        <div className="flex rounded-2xl bg-slate-100/50 dark:bg-muted/50 p-1.5 border border-white/60 dark:border-border/50 shadow-inner">
                            {CV_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setCv(opt)}
                                    className={cn("flex-1 py-3 text-lg font-extrabold rounded-xl transition-all duration-300", cv === opt ? "bg-white dark:bg-background shadow-md text-primary scale-105" : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-background/40")}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Kilomètres annuels</label>
                            <span className="font-extrabold text-primary bg-primary/10 px-4 py-1.5 rounded-full shadow-sm">{distance.toLocaleString('fr-FR')} km</span>
                        </div>
                        <div className="relative pt-4 pb-2">
                            <Slider
                                value={[distance]}
                                min={0} max={30000} step={100}
                                onValueChange={v => setDistance(v[0])}
                                className="py-2"
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 px-1 uppercase tracking-wider">
                            <span>0 km</span>
                            <span>30 000+ km</span>
                        </div>
                        <Input
                            type="number"
                            value={distance || ''}
                            onChange={e => setDistance(Number(e.target.value))}
                            className="h-16 text-2xl font-black text-center mt-6 rounded-2xl bg-white/50 dark:bg-background/50 border-white/60 dark:border-border shadow-inner"
                        />
                    </div>

                    <div className="pt-6 flex items-center gap-4">
                        <button
                            onClick={() => setIsElectric(!isElectric)}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 transform",
                                isElectric ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20 scale-[1.02]" : "border-slate-200 dark:border-border bg-white/50 dark:bg-background hover:bg-slate-50 dark:hover:bg-muted text-slate-500 dark:text-muted-foreground font-semibold hover:scale-[1.01]"
                            )}
                        >
                            Véhicule Électrique (+20%)
                        </button>
                    </div>

                </div>

                {/* Result Card */}
                <div className="flex flex-col items-center justify-center text-center p-10 lg:p-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] relative overflow-hidden h-full group">
                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white opacity-10 rounded-full blur-[80px] group-hover:opacity-20 transition-opacity duration-1000"></div>
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-emerald-400 opacity-20 rounded-full blur-[80px] group-hover:translate-x-10 transition-transform duration-1000"></div>

                    <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10 mb-8 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <Car className="w-12 h-12 text-white drop-shadow-md" />
                    </div>

                    <p className="text-indigo-100 font-bold uppercase tracking-[0.2em] text-sm mb-4">Montant de l'Indemnité</p>

                    <div className="flex items-start gap-2 my-2 relative">
                        <span className="text-5xl md:text-7xl lg:text-[6rem] font-black tracking-tighter drop-shadow-xl leading-none break-words max-w-[85%]">{allowance.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-3xl md:text-4xl lg:text-5xl font-bold opacity-90 drop-shadow-md mt-2">€</span>
                    </div>

                    <p className="text-indigo-100/80 mt-8 text-base max-w-[280px] mx-auto font-medium leading-relaxed">
                        Calculé pour <strong>{distance.toLocaleString('fr-FR')} km</strong> avec un véhicule de <strong>{cv} CV</strong> {isElectric && "électrique"}.
                    </p>

                    <div className="mt-auto pt-10 flex items-center gap-2 text-xs font-semibold text-indigo-200/60 w-full justify-center opacity-80">
                        <Info className="w-4 h-4" />
                        Basé sur le barème fiscal en vigueur.
                    </div>
                </div>

            </div>
        </div>
    );
}
