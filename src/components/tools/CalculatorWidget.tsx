import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { AdvancedCalculator } from './AdvancedCalculator';
import { cn } from '@/lib/utils';

export function CalculatorWidget() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-[5.5rem] z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[320px] h-[480px] bg-background border border-border/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-muted/50 to-transparent">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Calculator className="w-4 h-4" />
                            </div>
                            Quick Calc
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AdvancedCalculator />
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border border-border/50",
                    isOpen
                        ? "bg-muted text-foreground"
                        : "bg-background text-foreground hover:bg-muted hover:scale-105"
                )}
                title="Calculatrice rapide"
            >
                <Calculator className={cn("w-6 h-6", isOpen ? "opacity-50" : "text-primary")} />
            </button>
        </div>
    );
}
