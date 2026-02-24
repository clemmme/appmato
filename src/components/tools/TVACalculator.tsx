import React, { useState, useEffect } from 'react';
import { AlertCircle, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel, ExportData } from '@/lib/exportUtils';

const TVA_RATES = [
    { label: 'Normale (20%)', value: 20 },
    { label: 'Intermédiaire (10%)', value: 10 },
    { label: 'Réduite (5.5%)', value: 5.5 },
    { label: 'Particulière (2.1%)', value: 2.1 },
];

export function TVACalculator() {
    const [rate, setRate] = useState<number>(20);

    // Standard Mode
    const [ht, setHt] = useState<string>('100');
    const [tva, setTva] = useState<string>('20');
    const [ttc, setTtc] = useState<string>('120');

    // Margin Mode
    const [isMarginMode, setIsMarginMode] = useState(false);
    const [purchasePrice, setPurchasePrice] = useState<string>('50');
    const [sellPrice, setSellPrice] = useState<string>('100');

    // Input Handlers for Standard Mode
    const handleHtChange = (val: string) => {
        setHt(val);
        const num = parseFloat(val) || 0;
        const calcTva = num * (rate / 100);
        setTva(calcTva.toFixed(2));
        setTtc((num + calcTva).toFixed(2));
    };

    const handleTvaChange = (val: string) => {
        setTva(val);
        const num = parseFloat(val) || 0;
        const calcHt = num / (rate / 100);
        setHt(calcHt.toFixed(2));
        setTtc((calcHt + num).toFixed(2));
    };

    const handleTtcChange = (val: string) => {
        setTtc(val);
        const num = parseFloat(val) || 0;
        const calcHt = num / (1 + (rate / 100));
        setHt(calcHt.toFixed(2));
        setTva((num - calcHt).toFixed(2));
    };

    // Recalculate on rate change for standard mode
    useEffect(() => {
        if (!isMarginMode) {
            handleHtChange(ht); // Re-trigger from HT
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rate, isMarginMode]);


    // Margin Mode Calculations
    const marginTcc = (parseFloat(sellPrice) || 0) - (parseFloat(purchasePrice) || 0);
    const marginHt = marginTcc > 0 ? marginTcc / (1 + (rate / 100)) : 0;
    const marginTva = marginTcc > 0 ? marginTcc - marginHt : 0;

    const handleExport = (format: 'pdf' | 'excel') => {
        const data: ExportData = {
            title: "Calculateur de TVA",
            subtitle: isMarginMode ? `Mode : TVA sur Marge | Taux : ${rate}%` : `Mode : Standard | Taux : ${rate}%`,
            filename: `TVA_${rate}pct`,
            headers: isMarginMode
                ? [
                    { header: 'Élément', dataKey: 'label' },
                    { header: 'Montant', dataKey: 'amount' },
                ]
                : [
                    { header: 'Montant HT', dataKey: 'ht' },
                    { header: 'Montant TVA', dataKey: 'tva' },
                    { header: 'Montant TTC', dataKey: 'ttc' },
                ],
            rows: isMarginMode
                ? [
                    { label: "Prix d'Achat (TTC/Exo)", amount: `${parseFloat(purchasePrice || '0').toFixed(2)} €` },
                    { label: "Prix de Vente (TTC)", amount: `${parseFloat(sellPrice || '0').toFixed(2)} €` },
                    { label: "Marge Globale effective", amount: `${marginTcc.toFixed(2)} €` },
                    { label: "Marge HT", amount: `${marginHt.toFixed(2)} €` },
                    { label: "TVA à décaisser", amount: `${marginTva.toFixed(2)} €` },
                ]
                : [
                    { ht: `${parseFloat(ht || '0').toFixed(2)} €`, tva: `${parseFloat(tva || '0').toFixed(2)} €`, ttc: `${parseFloat(ttc || '0').toFixed(2)} €` }
                ],
            summary: []
        };

        if (format === 'pdf') exportToPDF(data);
        else exportToExcel(data);
    };

    return (
        <div className="flex flex-col h-full fade-in">
            <div className="px-6 py-8 md:px-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                        <span className="p-2.5 bg-indigo-500/10 rounded-2xl shadow-inner">
                            <span className="text-indigo-600 dark:text-indigo-400 font-black text-xl leading-none px-1">%</span>
                        </span>
                        Calculateur de TVA
                    </h2>
                    <p className="text-muted-foreground mt-3 font-medium text-lg">Calcul inversé instantané : modifiez n'importe quel champ pour mettre à jour les autres.</p>
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

            <div className="px-6 lg:px-10 flex flex-col lg:flex-row gap-6 mb-8 relative z-10 w-full">
                {/* Rate Selector */}
                <div className="flex bg-slate-100/50 dark:bg-muted/50 p-1.5 border border-white/60 dark:border-border/50 shadow-inner rounded-2xl flex-1 overflow-x-auto">
                    {TVA_RATES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setRate(r.value)}
                            className={cn(
                                "flex-1 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                                rate === r.value
                                    ? "bg-white dark:bg-background shadow-md text-indigo-600 dark:text-indigo-400 scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-background/40"
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Mode Selector */}
                <div className="flex items-center space-x-3 bg-white/60 dark:bg-card/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/50 dark:border-border/50 shadow-sm">
                    <Switch
                        id="margin-mode"
                        checked={isMarginMode}
                        onCheckedChange={setIsMarginMode}
                        className="data-[state=checked]:bg-indigo-600"
                    />
                    <Label htmlFor="margin-mode" className="font-bold cursor-pointer text-sm uppercase tracking-widest text-muted-foreground">TVA sur marge</Label>
                </div>
            </div>

            <div className="flex-1 px-6 lg:px-10 pb-10 flex flex-col items-center justify-center relative z-10 w-full">
                {!isMarginMode ? (
                    // STANDARD MODE
                    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6 items-center">
                        <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center transition-all focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:scale-[1.02]">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-4">Montant HT</label>
                            <div className="relative">
                                <Input
                                    type="number" value={ht} onChange={(e) => handleHtChange(e.target.value)}
                                    className="h-16 text-2xl font-black text-center rounded-2xl border-0 bg-white dark:bg-background shadow-inner focus-visible:ring-indigo-500 px-4"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-lg text-muted-foreground/50">€</span>
                            </div>
                        </div>

                        <div className="relative flex flex-col items-center justify-center">
                            <div className="hidden md:block absolute left-0 -ml-3 w-10 h-0.5 bg-gradient-to-r from-indigo-500/20 to-indigo-500/80 -translate-y-1/2 top-1/2" />
                            <div className="hidden md:block absolute right-0 -mr-3 w-10 h-0.5 bg-gradient-to-l from-indigo-500/20 to-indigo-500/80 -translate-y-1/2 top-1/2" />

                            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.4)] text-white text-center w-full z-10 focus-within:ring-4 focus-within:ring-indigo-500/50 focus-within:scale-[1.02] transition-transform">
                                <label className="text-xs font-bold text-indigo-100/90 uppercase tracking-widest block mb-4">Montant TVA ({rate}%)</label>
                                <div className="relative">
                                    <Input
                                        type="number" value={tva} onChange={(e) => handleTvaChange(e.target.value)}
                                        className="h-16 text-2xl font-black text-center rounded-2xl border-0 bg-black/10 text-white shadow-inner focus-visible:ring-white placeholder-white/30 px-4"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-lg text-white/50">€</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center transition-all focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:scale-[1.02]">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest block mb-4">Montant TTC</label>
                            <div className="relative">
                                <Input
                                    type="number" value={ttc} onChange={(e) => handleTtcChange(e.target.value)}
                                    className="h-16 text-2xl font-black text-center rounded-2xl border-0 bg-white dark:bg-background shadow-inner focus-visible:ring-indigo-500 px-4"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-lg text-muted-foreground/50">€</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    // MARGIN MODE
                    <div className="w-full flex gap-8 flex-col xl:flex-row">
                        <div className="w-full xl:w-1/3 flex flex-col gap-6">
                            <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Prix d'Achat (Exo/TTC)</label>
                                <div className="relative">
                                    <Input
                                        type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)}
                                        className="h-16 text-2xl font-black rounded-2xl border-0 bg-white dark:bg-background shadow-inner px-6"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">€</span>
                                </div>
                            </div>
                            <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Prix de Vente (TTC)</label>
                                <div className="relative">
                                    <Input
                                        type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
                                        className="h-16 text-2xl font-black rounded-2xl border-0 bg-white dark:bg-background shadow-inner px-6"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">€</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 p-10 lg:p-14 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.5)] text-white relative overflow-hidden flex flex-col justify-center min-h-[400px]">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px]" />

                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 drop-shadow-md">
                                <span className="p-2 bg-white/20 rounded-xl"><AlertCircle className="w-5 h-5 text-white" /></span>
                                Analyse de Marge (Taux: {rate}%)
                            </h3>

                            {marginTcc <= 0 ? (
                                <div className="p-6 bg-rose-500/20 backdrop-blur-md rounded-2xl flex items-center gap-3 font-semibold text-rose-100 border border-rose-500/30">
                                    <AlertCircle className="w-6 h-6" />
                                    La marge doit être positive (Prix Vente &gt; Prix Achat)
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                    <div className="p-6 bg-black/10 rounded-3xl backdrop-blur-sm border border-white/10 shadow-inner flex flex-col justify-center">
                                        <div className="text-xs uppercase font-bold text-indigo-100/70 tracking-widest mb-2">Marge Globale</div>
                                        <div className="text-2xl md:text-3xl font-black break-words">{marginTcc.toFixed(2)} €</div>
                                    </div>
                                    <div className="p-6 bg-black/10 rounded-3xl backdrop-blur-sm border border-white/10 shadow-inner flex flex-col justify-center">
                                        <div className="text-xs uppercase font-bold text-indigo-100/70 tracking-widest mb-2">Marge HT</div>
                                        <div className="text-2xl md:text-3xl font-black break-words">{marginHt.toFixed(2)} €</div>
                                    </div>
                                    <div className="p-8 bg-white text-indigo-900 rounded-3xl shadow-xl flex flex-col justify-center relative translate-y-[-10px] md:scale-110 z-10">
                                        <div className="text-xs uppercase font-extrabold text-indigo-500 tracking-widest mb-2">TVA à décaisser</div>
                                        <div className="text-3xl md:text-4xl font-black tracking-tighter break-words">{marginTva.toFixed(2)} <span className="text-xl">€</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
