import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import {
    Calculator, BookMarked, Landmark, Percent, Euro, Car, Wrench,
    Building2, CreditCard, Globe, TrendingUp, ChevronLeft, ArrowRight, Scale
} from 'lucide-react';
import { AdvancedCalculator } from '@/components/tools/AdvancedCalculator';
import { PlanComptable } from '@/components/tools/PlanComptable';
import { LoanSimulator } from '@/components/tools/LoanSimulator';
import { TVACalculator } from '@/components/tools/TVACalculator';
import { TVAPilotage } from '@/components/tools/TVAPilotage';
import { SalarySimulator } from '@/components/tools/SalarySimulator';
import { MileageCalculator } from '@/components/tools/MileageCalculator';
import { EntrepriseSearch } from '@/components/tools/EntrepriseSearch';
import { VATChecker } from '@/components/tools/VATChecker';
import { IBANChecker } from '@/components/tools/IBANChecker';
import { ExchangeRates } from '@/components/tools/ExchangeRates';
import { TNSWizardProvider } from '@/contexts/TNSWizardContext';
import { TNSWizard } from '@/components/tns/TNSWizard';

const TOOLS = [
    { id: 'calc', label: 'Calculatrice', icon: Calculator, description: 'Calculatrice experte avec historique', color: 'from-blue-500/20 to-transparent', iconColor: 'text-blue-500' },
    { id: 'pcg', label: 'PCG 2026', icon: BookMarked, description: 'Recherche rapide de comptes', color: 'from-emerald-500/20 to-transparent', iconColor: 'text-emerald-500' },
    { id: 'tva_hub', label: 'Pilotage TVA', icon: BookMarked, description: 'Gestion des déclarations', color: 'from-indigo-500/20 to-transparent', iconColor: 'text-indigo-500' },
    { id: 'tva', label: 'Calcul TVA', icon: Percent, description: 'HT/TTC, Marge, Inversée', color: 'from-rose-500/20 to-transparent', iconColor: 'text-rose-500' },
    { id: 'loan', label: 'Emprunts', icon: Landmark, description: 'Amortissement complet', color: 'from-amber-500/20 to-transparent', iconColor: 'text-amber-500' },
    { id: 'salary', label: 'Simul. Paie', icon: Euro, description: 'Brut, Net, Coût employeur', color: 'from-emerald-500/20 to-transparent', iconColor: 'text-emerald-500' },
    { id: 'ik', label: 'IK 2026', icon: Car, description: 'Barème kilométrique auto', color: 'from-pink-500/20 to-transparent', iconColor: 'text-pink-500' },
    { id: 'entreprise', label: 'Annuaire', icon: Building2, description: 'Recherche entreprise INSEE', color: 'from-indigo-500/20 to-transparent', iconColor: 'text-indigo-500' },
    { id: 'vat', label: 'TVA Intra', icon: Globe, description: 'Vérification VIES européen', color: 'from-violet-500/20 to-transparent', iconColor: 'text-violet-500' },
    { id: 'iban', label: 'IBAN', icon: CreditCard, description: 'Validation IBAN ISO 13616', color: 'from-slate-500/20 to-transparent', iconColor: 'text-slate-500' },
    { id: 'exchange', label: 'Devises', icon: TrendingUp, description: 'Taux de change EUR temps réel', color: 'from-fuchsia-500/20 to-transparent', iconColor: 'text-fuchsia-500' },
    { id: 'tns', label: 'Régul. TNS', icon: Scale, description: 'Régularisation charges sociales TNS', color: 'from-cyan-500/20 to-transparent', iconColor: 'text-cyan-500' },
];

export default function OutilsComptables() {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const CurrentTool = () => {
        switch (activeTool) {
            case 'calc':
                return <div className="max-w-md mx-auto h-[600px] w-full mt-4 animate-in zoom-in-95 duration-500"><AdvancedCalculator /></div>;
            case 'pcg':
                return <div className="h-full flex flex-col"><PlanComptable /></div>;
            case 'tva_hub':
                return <div className="h-full flex flex-col"><TVAPilotage /></div>;
            case 'tva':
                return <div className="h-full flex flex-col"><TVACalculator /></div>;
            case 'loan':
                return <div className="h-full flex flex-col"><LoanSimulator /></div>;
            case 'salary':
                return <div className="h-full flex flex-col"><SalarySimulator /></div>;
            case 'ik':
                return <div className="h-full flex flex-col"><MileageCalculator /></div>;
            case 'entreprise':
                return <div className="h-full flex flex-col"><EntrepriseSearch /></div>;
            case 'vat':
                return <div className="h-full flex flex-col"><VATChecker /></div>;
            case 'iban':
                return <div className="h-full flex flex-col"><IBANChecker /></div>;
            case 'exchange':
                return <div className="h-full flex flex-col"><ExchangeRates /></div>;
            case 'tns':
                return <div className="h-full flex flex-col"><TNSWizardProvider><TNSWizard /></TNSWizardProvider></div>;
            default:
                return null;
        }
    };

    const selectedTool = TOOLS.find(t => t.id === activeTool);

    return (
        <MainLayout>
            <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-slate-50/50 dark:bg-background">
                {/* Background Gradients */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" />
                    <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70" style={{ animationDelay: '2s' }} />
                    <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[40%] rounded-full bg-emerald-500/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50" style={{ animationDelay: '4s' }} />
                </div>

                <div className="relative p-6 lg:p-8 max-w-[1500px] mx-auto z-10 animate-in fade-in duration-700">
                    {/* Header */}
                    <div className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight flex flex-col lg:flex-row items-center gap-4">
                                <span className="p-4 bg-gradient-to-br from-primary to-indigo-600 text-white rounded-2xl shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                                    <Wrench className="w-8 h-8" />
                                </span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-primary to-indigo-600 dark:from-white dark:to-slate-300">
                                    Boîte à Outils
                                </span>
                            </h1>
                            <p className="text-muted-foreground mt-4 text-lg max-w-2xl">
                                {activeTool
                                    ? selectedTool?.description
                                    : "La suite d'utilitaires instantanés pour vos calculs quotidiens. Conçue pour la vitesse et la précision."
                                }
                            </p>
                        </div>

                        {activeTool && (
                            <button
                                onClick={() => setActiveTool(null)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/80 dark:bg-muted/30 border border-border/50 text-sm font-bold text-muted-foreground hover:text-primary transition-all hover:shadow-lg backdrop-blur-sm self-center md:self-auto"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Retour au Hub
                            </button>
                        )}
                    </div>

                    {!activeTool ? (
                        /* Tool Hub Grid (Dashboard Style) */
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {TOOLS.map((tool, idx) => (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(tool.id)}
                                    className="group relative overflow-hidden rounded-[2rem] border border-border/50 bg-white/40 dark:bg-background/40 backdrop-blur-md p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 text-left"
                                >
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0", tool.color)} />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={cn("p-3.5 rounded-2xl bg-white/80 dark:bg-background/80 shadow-sm backdrop-blur-sm transition-transform duration-500 group-hover:scale-110", tool.iconColor)}>
                                                <tool.icon className="w-6 h-6" />
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 duration-500">
                                                <ArrowRight className="w-5 h-5 text-primary" />
                                            </div>
                                        </div>
                                        <div className="mt-auto">
                                            <h3 className="font-extrabold text-foreground text-xl mb-2 group-hover:text-primary transition-colors">{tool.label}</h3>
                                            <p className="text-sm text-muted-foreground font-medium leading-relaxed opacity-80 group-hover:opacity-100">{tool.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Active Tool View */
                        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
                            <div className="bg-white/70 dark:bg-card/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-3 md:p-8 overflow-hidden relative min-h-[750px] flex flex-col">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none" />
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <CurrentTool />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
