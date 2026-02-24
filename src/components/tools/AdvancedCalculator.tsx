import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Delete, History, RotateCcw, Receipt } from 'lucide-react';

export function AdvancedCalculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [history, setHistory] = useState<{ id: string; eq: string; res: string }[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isNewNumber, setIsNewNumber] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, showHistory]);

    const handleNum = (num: string) => {
        if (isNewNumber) {
            setDisplay(num);
            setIsNewNumber(false);
        } else {
            setDisplay(display === '0' && num !== '.' ? num : display + num);
        }
    };

    const calculate = (expr: string) => {
        try {
            // Replace display symbols with JS operators
            const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
             
            const result = new Function(`return ${safeExpr}`)();
            if (!Number.isFinite(result) || Number.isNaN(result)) throw new Error('Erreur');
            return String(Math.round(result * 10000) / 10000); // 4 decimals max
        } catch {
            return 'Erreur';
        }
    };

    const handleOp = (op: string) => {
        if (display === 'Erreur') return;

        // If ending in an operator, replace it
        if (isNewNumber && equation && !equation.includes('=')) {
            setEquation(equation.slice(0, -1) + op);
            return;
        }

        if (equation.includes('=')) {
            setEquation(display + op);
        } else {
            const newEq = equation + display + op;
            setEquation(newEq);
            setDisplay(calculate(newEq.slice(0, -1)));
        }
        setIsNewNumber(true);
    };

    const handleEqual = () => {
        if (isNewNumber && equation.includes('=')) return;
        const finalEq = equation + display;
        const res = calculate(finalEq);
        setDisplay(res);
        setEquation(finalEq + '=');
        setIsNewNumber(true);
        if (res !== 'Erreur') {
            setHistory(prev => [...prev, { id: Date.now().toString(), eq: finalEq, res }]);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setIsNewNumber(true);
    };

    const handleAllClear = () => {
        setDisplay('0');
        setEquation('');
        setIsNewNumber(true);
    };

    const handleDel = () => {
        if (isNewNumber) return;
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    };

    const handleTVA = (rate: number, type: 'add' | 'sub') => {
        if (display === 'Erreur' || isNaN(Number(display))) return;
        const val = Number(display);
        let res = 0;
        if (type === 'add') {
            res = val * (1 + rate / 100);
        } else {
            res = val / (1 + rate / 100);
        }
        const resStr = String(Math.round(res * 100) / 100);
        setDisplay(resStr);
        setIsNewNumber(true);
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            eq: `${val} ${type === 'add' ? '+ TVA' : '- TVA'} ${rate}%`,
            res: resStr
        }]);
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Display Area */}
            <div className="p-4 flex flex-col items-end justify-end min-h-[120px] bg-muted/20 border-b border-border/50">
                <div className="text-muted-foreground text-sm font-medium h-5 mb-1 tracking-wider overflow-hidden">
                    {equation}
                </div>
                <div className="text-4xl font-bold tracking-tight text-foreground break-all text-right">
                    {display}
                </div>
            </div>

            {/* History Toggle */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-border/30 bg-muted/10">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                        "text-xs font-semibold flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md",
                        showHistory ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    <History className="w-3.5 h-3.5" />
                    Historique
                </button>
                {history.length > 0 && (
                    <button
                        onClick={() => setHistory([])}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Effacer
                    </button>
                )}
            </div>

            {/* Paper Tape / History Overlay */}
            {showHistory && (
                <div
                    ref={scrollRef}
                    className="absolute inset-x-0 bottom-0 top-[161px] bg-background/95 backdrop-blur-sm z-10 overflow-y-auto p-4 flex flex-col gap-3"
                >
                    {history.length === 0 ? (
                        <div className="m-auto text-sm text-muted-foreground flex flex-col items-center">
                            <Receipt className="w-8 h-8 mb-2 opacity-20" />
                            Aucun calcul
                        </div>
                    ) : (
                        history.map((h) => (
                            <div key={h.id} className="text-right border-b border-border/50 pb-2 last:border-0 border-dashed">
                                <div className="text-xs text-muted-foreground">{h.eq}</div>
                                <div className="text-lg font-bold text-foreground">{h.res}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Keypad */}
            <div className="flex-1 p-2 grid grid-cols-4 gap-2 bg-muted/5">
                {/* Row 1 - TVA Shortcuts */}
                <button onClick={() => handleTVA(20, 'add')} className="calc-btn text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20">+20%</button>
                <button onClick={() => handleTVA(20, 'sub')} className="calc-btn text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20">-20%</button>
                <button onClick={handleClear} className="calc-btn text-orange-500 font-bold bg-orange-500/10 hover:bg-orange-500/20">C</button>
                <button onClick={handleAllClear} className="calc-btn text-destructive font-bold bg-destructive/10 hover:bg-destructive/20">AC</button>

                {/* Row 2 */}
                <button onClick={() => handleNum('7')} className="calc-btn-num">7</button>
                <button onClick={() => handleNum('8')} className="calc-btn-num">8</button>
                <button onClick={() => handleNum('9')} className="calc-btn-num">9</button>
                <button onClick={() => handleOp('÷')} className="calc-btn-op">÷</button>

                {/* Row 3 */}
                <button onClick={() => handleNum('4')} className="calc-btn-num">4</button>
                <button onClick={() => handleNum('5')} className="calc-btn-num">5</button>
                <button onClick={() => handleNum('6')} className="calc-btn-num">6</button>
                <button onClick={() => handleOp('×')} className="calc-btn-op">×</button>

                {/* Row 4 */}
                <button onClick={() => handleNum('1')} className="calc-btn-num">1</button>
                <button onClick={() => handleNum('2')} className="calc-btn-num">2</button>
                <button onClick={() => handleNum('3')} className="calc-btn-num">3</button>
                <button onClick={() => handleOp('-')} className="calc-btn-op">-</button>

                {/* Row 5 */}
                <button onClick={() => handleNum('0')} className="calc-btn-num col-span-2">0</button>
                <button onClick={() => handleNum('.')} className="calc-btn-num">.</button>
                <button onClick={() => handleOp('+')} className="calc-btn-op">+</button>

                {/* Row 6 */}
                <button onClick={handleDel} className="calc-btn-num col-span-2 text-muted-foreground">
                    <Delete className="w-5 h-5 mx-auto" />
                </button>
                <button onClick={handleEqual} className="calc-btn col-span-2 bg-primary text-primary-foreground hover:opacity-90 font-bold text-xl shadow-md rounded-xl">=</button>
            </div>

            <style>{`
        .calc-btn {
          @apply flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 select-none;
        }
        .calc-btn-num {
          @apply calc-btn bg-background border border-border/40 shadow-sm text-foreground text-lg font-medium hover:bg-muted text-lg;
        }
        .calc-btn-op {
          @apply calc-btn bg-muted/80 text-foreground text-xl font-medium hover:bg-muted border border-border/40 shadow-sm;
        }
      `}</style>
        </div>
    );
}
