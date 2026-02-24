import { useState } from 'react';
import { ShieldCheck, ShieldX, Loader2, Globe, Search, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VatResult {
    valid: boolean;
    countryCode: string;
    vatNumber: string;
    name?: string;
    address?: string;
    requestDate: string;
}

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
];

async function checkVAT(fullNumber: string): Promise<VatResult> {
    const cleaned = fullNumber.replace(/[\s.-]/g, '').toUpperCase();
    const countryCode = cleaned.substring(0, 2);
    const vatNumber = cleaned.substring(2);

    // Try the EU VIES REST API via CORS proxy
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`;
    const body = JSON.stringify({ countryCode, vatNumber });

    for (const proxy of CORS_PROXIES) {
        try {
            const resp = await fetch(proxy + encodeURIComponent(url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: AbortSignal.timeout(8000),
            });
            if (resp.ok) {
                const data = await resp.json();
                return {
                    valid: data.valid === true,
                    countryCode: data.countryCode || countryCode,
                    vatNumber: data.vatNumber || vatNumber,
                    name: data.name && data.name !== '---' ? data.name : undefined,
                    address: data.address && data.address !== '---' ? data.address : undefined,
                    requestDate: data.requestDate || new Date().toISOString().split('T')[0],
                };
            }
        } catch {
            // Try next proxy
        }
    }

    // If all proxies fail, try direct (may work if CORS isn't blocked)
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
            const data = await resp.json();
            return {
                valid: data.valid === true,
                countryCode: data.countryCode || countryCode,
                vatNumber: data.vatNumber || vatNumber,
                name: data.name && data.name !== '---' ? data.name : undefined,
                address: data.address && data.address !== '---' ? data.address : undefined,
                requestDate: data.requestDate || new Date().toISOString().split('T')[0],
            };
        }
    } catch {
        // Direct call failed too
    }

    throw new Error('Le service VIES est temporairement indisponible. Vous pouvez vérifier directement sur ec.europa.eu/taxation_customs/vies');
}

const COUNTRY_FLAGS: Record<string, string> = {
    AT: '🇦🇹', BE: '🇧🇪', BG: '🇧🇬', HR: '🇭🇷', CY: '🇨🇾', CZ: '🇨🇿',
    DK: '🇩🇰', EE: '🇪🇪', FI: '🇫🇮', FR: '🇫🇷', DE: '🇩🇪', GR: '🇬🇷',
    HU: '🇭🇺', IE: '🇮🇪', IT: '🇮🇹', LV: '🇱🇻', LT: '🇱🇹', LU: '🇱🇺',
    MT: '🇲🇹', NL: '🇳🇱', PL: '🇵🇱', PT: '🇵🇹', RO: '🇷🇴', SK: '🇸🇰',
    SI: '🇸🇮', ES: '🇪🇸', SE: '🇸🇪', XI: '🇬🇧',
};

export function VATChecker() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<VatResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await checkVAT(input);
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    const copyNumber = () => {
        if (result) {
            navigator.clipboard.writeText(result.countryCode + result.vatNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Globe className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold">Vérification TVA Intracommunautaire</h2>
                    <p className="text-xs text-muted-foreground">API VIES — Commission Européenne (27 pays EU)</p>
                </div>
            </div>

            {/* Input */}
            <form onSubmit={handleCheck} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Numéro de TVA (ex: FR40303265045, DE123456789)"
                    className="w-full h-14 text-lg font-mono tracking-wider rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm px-14 placeholder-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-40 hover:shadow-lg transition-all"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-700 dark:text-red-300">
                    {error}
                    <a href="https://ec.europa.eu/taxation_customs/vies/" target="_blank" rel="noopener noreferrer" className="ml-2 underline font-semibold">Vérifier sur VIES →</a>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className={cn("bg-white/60 dark:bg-card/40 backdrop-blur-xl border rounded-2xl p-6 shadow-sm animate-in zoom-in-95 duration-300",
                    result.valid ? "border-emerald-200 dark:border-emerald-800/30" : "border-red-200 dark:border-red-800/30"
                )}>
                    <div className="flex items-center gap-4 mb-5">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", result.valid ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-red-500 to-rose-600")}>
                            {result.valid ? <ShieldCheck className="w-7 h-7" /> : <ShieldX className="w-7 h-7" />}
                        </div>
                        <div>
                            <h3 className={cn("font-bold text-xl", result.valid ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                                {result.valid ? 'Numéro TVA Valide ✓' : 'Numéro TVA Invalide ✗'}
                            </h3>
                            <p className="text-sm text-muted-foreground">Vérifié le {new Date(result.requestDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Numéro</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{COUNTRY_FLAGS[result.countryCode] || '🇪🇺'}</span>
                                <span className="font-mono font-bold">{result.countryCode} {result.vatNumber}</span>
                                <button onClick={copyNumber} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/40" />}
                                </button>
                            </div>
                        </div>
                        {result.name && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Raison sociale</span>
                                <span className="font-bold text-sm text-right max-w-[60%]">{result.name}</span>
                            </div>
                        )}
                        {result.address && (
                            <div className="flex items-start justify-between">
                                <span className="text-sm text-muted-foreground">Adresse</span>
                                <span className="text-sm text-right max-w-[60%]">{result.address}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick examples */}
            {!result && !loading && !error && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-semibold">Exemples rapides :</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: '🇫🇷 Deloitte FR', vat: 'FR40303265045' },
                            { label: '🇩🇪 Siemens DE', vat: 'DE129273398' },
                            { label: '🇳🇱 Philips NL', vat: 'NL002230884B01' },
                        ].map(ex => (
                            <button key={ex.vat} onClick={() => setInput(ex.vat)}
                                className="px-4 py-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30 rounded-xl text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:shadow-md hover:scale-[1.02] transition-all">
                                {ex.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30 rounded-xl text-sm text-cyan-700 dark:text-cyan-300">
                        <Globe className="w-5 h-5 shrink-0" />
                        <span>Vérification via le système <strong>VIES</strong> de la Commission Européenne. Résultat officiel et à jour.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
