import React, { useState, useMemo } from 'react';
import { Euro, FileText, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel, ExportData } from '@/lib/exportUtils';

type AmmortizationType = 'constante' | 'infine' | 'capital_constant';

interface LoanRow {
    month: number;
    remainingCapital: number;
    interest: number;
    principal: number;
    insurance: number;
    totalPayment: number;
}

export function LoanSimulator() {
    const [amount, setAmount] = useState<number>(100000);
    const [rate, setRate] = useState<number>(3.5);
    const [durationMonths, setDurationMonths] = useState<number>(60);
    const [insuranceRate, setInsuranceRate] = useState<number>(0.3);
    const [fees, setFees] = useState<number>(500);
    const [type, setType] = useState<AmmortizationType>('constante');

    const amortizationTable = useMemo(() => {
        const table: LoanRow[] = [];
        const monthlyRate = (rate / 100) / 12;
        const monthlyInsurance = (amount * (insuranceRate / 100)) / 12;

        let currentCapital = amount;

        // Monthly payment calculation for 'constante'
        const constantPayment = rate === 0
            ? amount / durationMonths
            : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -durationMonths));

        for (let i = 1; i <= durationMonths; i++) {
            const interest = currentCapital * monthlyRate;
            let principal = 0;
            let totalPayment = 0;

            if (type === 'constante') {
                principal = constantPayment - interest;
                totalPayment = constantPayment + monthlyInsurance;
            } else if (type === 'infine') {
                principal = i === durationMonths ? amount : 0;
                totalPayment = interest + principal + monthlyInsurance;
            } else if (type === 'capital_constant') {
                principal = amount / durationMonths;
                totalPayment = principal + interest + monthlyInsurance;
            }

            table.push({
                month: i,
                remainingCapital: currentCapital,
                interest,
                principal,
                insurance: monthlyInsurance,
                totalPayment
            });

            currentCapital -= principal;
        }

        return table;
    }, [amount, rate, durationMonths, insuranceRate, type]);

    const summary = useMemo(() => {
        const totalInterest = amortizationTable.reduce((acc, row) => acc + row.interest, 0);
        const totalInsurance = amortizationTable.reduce((acc, row) => acc + row.insurance, 0);
        const totalCost = totalInterest + totalInsurance + fees;
        const avgMonthly = amortizationTable.reduce((acc, row) => acc + row.totalPayment, 0) / durationMonths;

        return { totalInterest, totalInsurance, totalCost, avgMonthly };
    }, [amortizationTable, fees, durationMonths]);

    const handleExport = (format: 'pdf' | 'excel') => {
        const data: ExportData = {
            title: "Simulateur d'Emprunt",
            subtitle: `Montant : ${amount.toLocaleString('fr-FR')} € | Durée : ${durationMonths} mois | Taux : ${rate}%`,
            filename: `Emprunt_${amount}e_${durationMonths}m`,
            headers: [
                { header: 'Mois', dataKey: 'month' },
                { header: 'Capital Restant', dataKey: 'remainingCapital' },
                { header: 'Amortissement', dataKey: 'principal' },
                { header: 'Intérêts', dataKey: 'interest' },
                { header: 'Assurance', dataKey: 'insurance' },
                { header: 'Échéance TTC', dataKey: 'totalPayment' }
            ],
            rows: amortizationTable.map(row => ({
                month: row.month,
                remainingCapital: row.remainingCapital.toFixed(2),
                principal: row.principal.toFixed(2),
                interest: row.interest.toFixed(2),
                insurance: row.insurance.toFixed(2),
                totalPayment: row.totalPayment.toFixed(2)
            })),
            summary: [
                ["Coût Total du Crédit :", `${summary.totalCost.toFixed(2)} €`],
                ["Total Intérêts :", `${summary.totalInterest.toFixed(2)} €`],
                ["Total Assurance :", `${summary.totalInsurance.toFixed(2)} €`],
                ["Frais de Dossier :", `${fees.toFixed(2)} €`],
                ["Mensualité Moyenne :", `${summary.avgMonthly.toFixed(2)} €`]
            ]
        };

        if (format === 'pdf') exportToPDF(data);
        else exportToExcel(data);
    };

    return (
        <div className="flex flex-col h-full fade-in pb-10">
            <div className="px-6 py-8 md:px-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                        <span className="p-2.5 bg-blue-500/10 rounded-2xl shadow-inner">
                            <Euro className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </span>
                        Simulateur d'Emprunt Pro
                    </h2>
                    <p className="text-muted-foreground mt-3 font-medium text-lg">Calcul complet avec tableau d'amortissement, assurance et frais de dossier.</p>
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

            <div className="px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4 z-10 w-full">
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Montant (€)</label>
                    <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="h-12 text-lg font-black bg-white/50 dark:bg-background/50 border-0 shadow-inner rounded-xl" />
                </div>
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Durée (mois)</label>
                    <Input type="number" value={durationMonths || ''} onChange={e => setDurationMonths(Number(e.target.value))} className="h-12 text-lg font-black bg-white/50 dark:bg-background/50 border-0 shadow-inner rounded-xl" />
                </div>
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Taux Nom. (%)</label>
                    <Input type="number" step="0.01" value={rate || ''} onChange={e => setRate(Number(e.target.value))} className="h-12 text-lg font-black bg-white/50 dark:bg-background/50 border-0 shadow-inner rounded-xl" />
                </div>
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assurance (%)</label>
                    <Input type="number" step="0.01" value={insuranceRate || ''} onChange={e => setInsuranceRate(Number(e.target.value))} className="h-12 text-lg font-black bg-white/50 dark:bg-background/50 border-0 shadow-inner rounded-xl" />
                </div>
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Frais Dossier (€)</label>
                    <Input type="number" value={fees || ''} onChange={e => setFees(Number(e.target.value))} className="h-12 text-lg font-black bg-white/50 dark:bg-background/50 border-0 shadow-inner rounded-xl" />
                </div>
                <div className="space-y-2 bg-white/60 dark:bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-white/10 shadow-sm">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type Ammo.</label>
                    <select
                        className="flex h-12 w-full font-bold rounded-xl border-0 shadow-inner bg-white/50 dark:bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        value={type}
                        onChange={(e) => setType(e.target.value as AmmortizationType)}
                    >
                        <option value="constante">Constante</option>
                        <option value="capital_constant">Amort. Cst</option>
                        <option value="infine">In Fine</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col min-h-0 flex-1 px-6 lg:px-8 xl:px-10 gap-6 z-10 w-full overflow-y-auto custom-scrollbar pb-10">
                {/* Synthesis Panel (Horizontal Banner) */}
                <div className="w-full shrink-0 p-6 lg:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 text-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full blur-[60px]" />

                    {/* Main Total Cost */}
                    <div className="relative z-10 flex flex-col items-center lg:items-start">
                        <div className="text-blue-100/90 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="p-1 bg-white/20 rounded-md backdrop-blur-sm"><Euro className="w-3 h-3 text-white" /></span>
                            Coût Total du Crédit
                        </div>
                        <div className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter drop-shadow-md break-words">
                            {summary.totalCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-2xl lg:text-3xl font-bold opacity-70">€</span>
                        </div>
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-end gap-6 w-full lg:w-auto relative z-10">
                        <div className="bg-black/20 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-sm text-center">
                            <div className="text-blue-100/80 text-[10px] uppercase font-bold tracking-widest mb-1">Mensualité</div>
                            <div className="text-2xl lg:text-3xl font-black text-white">{summary.avgMonthly.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-lg opacity-70">€</span></div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[150px]">
                            <div className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                                <div className="text-blue-100/80 text-[10px] uppercase font-bold tracking-widest">Intérêts</div>
                                <div className="text-lg font-bold">{summary.totalInterest.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-xl">
                                <div className="text-blue-100/80 text-[10px] uppercase font-bold tracking-widest">Assurance</div>
                                <div className="text-lg font-bold">{summary.totalInsurance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Amortization Table */}
                <div className="flex-1 min-w-0 overflow-hidden bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-[400px]">
                    <div className="overflow-auto flex-1 p-2 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest bg-white/80 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-20 shadow-sm rounded-t-[2rem]">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-3xl">Mois</th>
                                    <th className="px-6 py-4 text-right">Cap. Restant</th>
                                    <th className="px-6 py-4 text-right">Amort.</th>
                                    <th className="px-6 py-4 text-right">Intérêts</th>
                                    <th className="px-6 py-4 text-right">Assurance</th>
                                    <th className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400 rounded-tr-3xl">Échéance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {amortizationTable.map((row) => (
                                    <tr key={row.month} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-3 font-bold text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{row.month}</td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{row.remainingCapital.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-600 dark:text-slate-300">{row.principal.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</td>
                                        <td className="px-6 py-3 text-right font-medium text-rose-500/80">{row.interest.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</td>
                                        <td className="px-6 py-3 text-right font-medium text-amber-500/80">{row.insurance.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</td>
                                        <td className="px-6 py-3 text-right font-black text-slate-800 dark:text-slate-100">{row.totalPayment.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
