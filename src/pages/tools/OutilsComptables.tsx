import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Calculator, BookMarked, Landmark, Percent, Euro, Car, Wrench, Building2, CreditCard, Globe, TrendingUp } from 'lucide-react';
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

const TOOLS = [
    { id: 'calc', label: 'Calculatrice', icon: Calculator, description: 'Calculatrice experte avec historique' },
    { id: 'pcg', label: 'PCG 2026', icon: BookMarked, description: 'Recherche rapide de comptes' },
    { id: 'tva_hub', label: 'Pilotage TVA', icon: BookMarked, description: 'Gestion des déclarations' },
    { id: 'tva', label: 'Calcul TVA', icon: Percent, description: 'HT/TTC, Marge, Inversée' },
    { id: 'loan', label: 'Emprunts', icon: Landmark, description: 'Amortissement complet' },
    { id: 'salary', label: 'Simul. Paie', icon: Euro, description: 'Brut, Net, Coût employeur' },
    { id: 'ik', label: 'IK 2026', icon: Car, description: 'Barème kilométrique auto' },
    { id: 'entreprise', label: 'Annuaire', icon: Building2, description: 'Recherche entreprise INSEE' },
    { id: 'vat', label: 'TVA Intra', icon: Globe, description: 'Vérification VIES européen' },
    { id: 'iban', label: 'IBAN', icon: CreditCard, description: 'Validation IBAN ISO 13616' },
    { id: 'exchange', label: 'Devises', icon: TrendingUp, description: 'Taux de change EUR temps réel' },
];

export default function OutilsComptables() {
    const [activeTool, setActiveTool] = useState(TOOLS[0].id);

    const CurrentTool = () => {
        switch (activeTool) {
            case 'calc':
                return <div className="max-w-md mx-auto h-[600px] w-full mt-8 animate-in zoom-in-95 duration-500"><AdvancedCalculator /></div>;
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
            default:
                return null;
        }
    };

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
                    <div className="mb-8 lg:mb-12 text-center lg:text-left">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight flex flex-col lg:flex-row items-center gap-4">
                            <span className="p-4 bg-gradient-to-br from-primary to-indigo-600 text-white rounded-2xl shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Wrench className="w-8 h-8" />
                            </span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-primary to-indigo-600 dark:from-white dark:to-slate-300">
                                Boîte à Outils
                            </span>
                        </h1>
                        <p className="text-muted-foreground mt-4 text-lg max-w-2xl">
                            La suite d'utilitaires instantanés pour vos calculs quotidiens. Conçue pour la vitesse et la précision.
                        </p>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-8">
                        {/* Sidebar / Hub Menu */}
                        <div className="w-full xl:w-80 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-3 xl:gap-4 self-start xl:sticky xl:top-8">
                            {TOOLS.map((tool) => {
                                const isActive = activeTool === tool.id;
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => setActiveTool(tool.id)}
                                        className={cn(
                                            "group relative p-4 rounded-3xl text-left transition-all duration-500 border flex flex-col xl:flex-row gap-4 items-start xl:items-center overflow-hidden",
                                            isActive
                                                ? "bg-gradient-to-br from-primary via-primary/90 to-indigo-600 text-white border-transparent shadow-2xl shadow-primary/30 scale-[1.02] xl:scale-105"
                                                : "bg-white/60 dark:bg-background/40 backdrop-blur-md border-white/40 dark:border-border/40 hover:bg-white/80 dark:hover:bg-background/60 hover:border-white/80 dark:hover:border-border/80 hover:scale-[1.02] text-slate-700 dark:text-slate-200 shadow-sm"
                                        )}
                                    >
                                        {/* Indicator line for active */}
                                        {isActive && (
                                            <div className="hidden xl:block absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-white/40 rounded-r-full" />
                                        )}

                                        <div className={cn(
                                            "p-3 rounded-2xl transition-all duration-300 shadow-sm shrink-0",
                                            isActive
                                                ? "bg-white/20 text-white shadow-inner backdrop-blur-sm"
                                                : "bg-primary/5 text-primary group-hover:bg-primary/10 group-hover:scale-110"
                                        )}>
                                            <tool.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={cn("font-bold text-base tracking-tight", isActive ? "text-white" : "group-hover:text-primary transition-colors")}>
                                                {tool.label}
                                            </h3>
                                            <p className={cn("text-xs font-medium mt-1.5 leading-snug hidden xl:block", isActive ? "text-primary-foreground/90" : "text-muted-foreground")}>
                                                {tool.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Tool Area */}
                        <div className="flex-1 min-w-0 relative">
                            {/* Glassmorphism Container */}
                            <div className="bg-white/70 dark:bg-card/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-3 md:p-6 overflow-hidden relative min-h-[750px] flex flex-col">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none" />

                                <div className="relative z-10 flex-1 flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-700 fill-mode-both" key={activeTool}>
                                    <CurrentTool />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
