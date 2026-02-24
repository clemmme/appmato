import { useState, useEffect, useMemo } from 'react';
import { ArrowRightLeft, RefreshCw, Loader2, TrendingUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchExchangeRates, getPopularCurrencies, convertAmount, type ExchangeRates as ExRates } from '@/lib/exchangeApi';

export function ExchangeRates() {
    const [rates, setRates] = useState<ExRates | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [amount, setAmount] = useState(1000);
    const [fromCurrency, setFromCurrency] = useState('EUR');
    const [toCurrency, setToCurrency] = useState('USD');
    const [filter, setFilter] = useState('');

    const currencies = getPopularCurrencies();

    useEffect(() => {
        loadRates();
    }, []);

    const loadRates = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchExchangeRates();
            setRates(data);
        } catch {
            setError('Erreur de chargement des taux');
        } finally {
            setLoading(false);
        }
    };

    const convertedAmount = useMemo(() => {
        if (!rates) return 0;
        const fromRate = rates.rates[fromCurrency] || 1;
        const toRate = rates.rates[toCurrency] || 1;
        return convertAmount(amount, fromRate, toRate);
    }, [amount, fromCurrency, toCurrency, rates]);

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const filteredCurrencies = useMemo(() => {
        if (!filter) return currencies;
        const q = filter.toLowerCase();
        return currencies.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }, [filter, currencies]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Taux de Change</h2>
                        <p className="text-xs text-muted-foreground">
                            Mis à jour : {rates?.time_last_update_utc ? new Date(rates.time_last_update_utc).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        </p>
                    </div>
                </div>
                <button onClick={loadRates} className="p-2 rounded-xl bg-white/60 dark:bg-card/40 border border-white/50 dark:border-white/10 hover:shadow-md transition-all">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {error && <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>}

            {/* Converter */}
            <div className="bg-white/70 dark:bg-card/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
                    {/* From */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">De</label>
                        <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value)} className="w-full mt-1 h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            <option value="EUR">🇪🇺 EUR</option>
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full mt-2 h-14 text-2xl font-bold rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                    </div>

                    {/* Swap */}
                    <button onClick={swapCurrencies} className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all mb-2">
                        <ArrowRightLeft className="w-5 h-5" />
                    </button>

                    {/* To */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vers</label>
                        <select value={toCurrency} onChange={e => setToCurrency(e.target.value)} className="w-full mt-1 h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            <option value="EUR">🇪🇺 EUR</option>
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                        </select>
                        <div className="w-full mt-2 h-14 text-2xl font-bold rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 px-4 flex items-center text-amber-700 dark:text-amber-300">
                            {convertedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Rate Info */}
                {rates && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                        1 {fromCurrency} = {(convertAmount(1, rates.rates[fromCurrency] || 1, rates.rates[toCurrency] || 1)).toFixed(4)} {toCurrency}
                    </p>
                )}
            </div>

            {/* Popular Rates Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-bold text-muted-foreground">Taux EUR → Devises</h3>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer..."
                            className="w-full h-8 text-xs rounded-lg bg-white/60 dark:bg-card/40 border border-white/50 dark:border-white/10 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {filteredCurrencies.map(c => {
                        const rate = rates?.rates[c.code] || 0;
                        return (
                            <button
                                key={c.code}
                                onClick={() => { setToCurrency(c.code); setFromCurrency('EUR'); }}
                                className={cn(
                                    "flex items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-md hover:scale-[1.02]",
                                    toCurrency === c.code
                                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30"
                                        : "bg-white/60 dark:bg-card/40 border-white/50 dark:border-white/10"
                                )}
                            >
                                <span className="text-lg">{c.flag}</span>
                                <div className="text-left min-w-0">
                                    <p className="font-bold text-xs">{c.code}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{rate.toFixed(rate < 10 ? 4 : 2)}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
