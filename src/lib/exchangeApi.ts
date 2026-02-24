const EXCHANGE_API = 'https://open.er-api.com/v6/latest/EUR';

export interface ExchangeRates {
    base_code: string;
    time_last_update_utc: string;
    rates: Record<string, number>;
}

const POPULAR_CURRENCIES = [
    { code: 'USD', name: 'Dollar américain', flag: '🇺🇸' },
    { code: 'GBP', name: 'Livre sterling', flag: '🇬🇧' },
    { code: 'CHF', name: 'Franc suisse', flag: '🇨🇭' },
    { code: 'JPY', name: 'Yen japonais', flag: '🇯🇵' },
    { code: 'CAD', name: 'Dollar canadien', flag: '🇨🇦' },
    { code: 'AUD', name: 'Dollar australien', flag: '🇦🇺' },
    { code: 'CNY', name: 'Yuan chinois', flag: '🇨🇳' },
    { code: 'MAD', name: 'Dirham marocain', flag: '🇲🇦' },
    { code: 'TND', name: 'Dinar tunisien', flag: '🇹🇳' },
    { code: 'DZD', name: 'Dinar algérien', flag: '🇩🇿' },
    { code: 'TRY', name: 'Livre turque', flag: '🇹🇷' },
    { code: 'PLN', name: 'Zloty polonais', flag: '🇵🇱' },
    { code: 'SEK', name: 'Couronne suédoise', flag: '🇸🇪' },
    { code: 'NOK', name: 'Couronne norvégienne', flag: '🇳🇴' },
    { code: 'DKK', name: 'Couronne danoise', flag: '🇩🇰' },
    { code: 'CZK', name: 'Couronne tchèque', flag: '🇨🇿' },
    { code: 'HUF', name: 'Forint hongrois', flag: '🇭🇺' },
    { code: 'RON', name: 'Leu roumain', flag: '🇷🇴' },
    { code: 'BGN', name: 'Lev bulgare', flag: '🇧🇬' },
    { code: 'BRL', name: 'Réal brésilien', flag: '🇧🇷' },
    { code: 'INR', name: 'Roupie indienne', flag: '🇮🇳' },
    { code: 'KRW', name: 'Won sud-coréen', flag: '🇰🇷' },
    { code: 'MXN', name: 'Peso mexicain', flag: '🇲🇽' },
    { code: 'SGD', name: 'Dollar singapourien', flag: '🇸🇬' },
];

export function getPopularCurrencies() {
    return POPULAR_CURRENCIES;
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
    const cached = sessionStorage.getItem('exchange_rates');
    if (cached) {
        const parsed = JSON.parse(cached);
        // Cache for 1 hour
        if (Date.now() - parsed._cachedAt < 3600000) return parsed;
    }

    const response = await fetch(EXCHANGE_API);
    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
    const data = await response.json();

    const enriched = { ...data, _cachedAt: Date.now() };
    sessionStorage.setItem('exchange_rates', JSON.stringify(enriched));
    return data;
}

export function convertAmount(amount: number, fromRate: number, toRate: number): number {
    // Convert: amount in fromCurrency → EUR → toCurrency
    const eurAmount = amount / fromRate;
    return eurAmount * toRate;
}
