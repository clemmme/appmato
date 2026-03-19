import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AIAssistant } from './AIAssistant';
import { cn } from '@/lib/utils';

export function AIAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-[10rem] z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-full sm:w-[450px] h-[600px] bg-background border border-border/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/30">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Alfred
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <AIAssistant />
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border border-border/50",
                    isOpen
                        ? "bg-muted text-foreground"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
                )}
                title="Alfred"
            >
                <Sparkles className={cn("w-6 h-6", isOpen ? "opacity-50" : "text-white")} />
            </button>
        </div>
    );
}
