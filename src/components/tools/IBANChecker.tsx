import { useState } from 'react';
import { CreditCard, Check, X, Copy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateIBAN, getCountryFlag, type IBANInfo } from '@/lib/ibanValidator';

export function IBANChecker() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<IBANInfo | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCheck = (value: string) => {
        setInput(value);
        if (value.replace(/\s/g, '').length >= 15) {
            setResult(validateIBAN(value));
        } else {
            setResult(null);
        }
    };

    const copyFormatted = () => {
        if (result?.formatted) {
            navigator.clipboard.writeText(result.formatted);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <CreditCard className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">Vérification IBAN</h2>
                    <p className="text-xs text-muted-foreground">Validation ISO 13616-1 (MOD 97-10) — 40 pays supportés</p>
                </div>
            </div>

            {/* Input */}
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={e => handleCheck(e.target.value)}
                    placeholder="Entrez un IBAN... (ex: FR76 3000 6000 0112 3456 7890 189)"
                    className="w-full h-16 text-xl font-mono tracking-wider rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm px-6 placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                />
                {result && (
                    <div className={cn("absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center", result.valid ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30")}>
                        {result.valid ? <Check className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-red-600" />}
                    </div>
                )}
            </div>

            {/* Result */}
            {result && (
                <div className={cn("bg-white/60 dark:bg-card/40 backdrop-blur-xl border rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-3 duration-300",
                    result.valid ? "border-emerald-200 dark:border-emerald-800/30" : "border-red-200 dark:border-red-800/30"
                )}>
                    {/* Status */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", result.valid ? "bg-emerald-500" : "bg-red-500")}>
                            {result.valid ? <Shield className="w-5 h-5 text-white" /> : <X className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <h3 className={cn("font-bold text-lg", result.valid ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                                {result.valid ? 'IBAN Valide ✓' : 'IBAN Invalide ✗'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {result.valid ? 'La clé de contrôle est correcte' : 'La clé de contrôle ne correspond pas ou le format est incorrect'}
                            </p>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pays</span>
                                <p className="font-bold text-lg mt-0.5">{getCountryFlag(result.countryCode)} {result.country}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Code pays</span>
                                <p className="font-mono font-bold mt-0.5">{result.countryCode}</p>
                            </div>
                            {result.bankCode && (
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Code banque</span>
                                    <p className="font-mono font-bold mt-0.5">{result.bankCode}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">IBAN formaté</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="font-mono font-bold text-sm">{result.formatted}</p>
                                    <button onClick={copyFormatted} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/40" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Longueur</span>
                                <p className="font-mono font-bold mt-0.5">{result.length} caractères</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">BBAN</span>
                                <p className="font-mono font-bold text-xs mt-0.5 break-all">{result.bban}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Examples */}
            {!result && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-semibold">Exemples d'IBAN :</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: '🇫🇷 France', iban: 'FR76 3000 6000 0112 3456 7890 189' },
                            { label: '🇩🇪 Allemagne', iban: 'DE89 3704 0044 0532 0130 00' },
                            { label: '🇬🇧 UK', iban: 'GB29 NWBK 6016 1331 9268 19' },
                            { label: '🇪🇸 Espagne', iban: 'ES91 2100 0418 4502 0005 1332' },
                        ].map(ex => (
                            <button key={ex.iban} onClick={() => handleCheck(ex.iban)}
                                className="px-4 py-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30 rounded-xl text-sm font-medium text-violet-700 dark:text-violet-300 hover:shadow-md hover:scale-[1.02] transition-all">
                                {ex.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
