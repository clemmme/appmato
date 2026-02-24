const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
];

export interface RSSItem {
    title: string;
    link: string;
    description: string;
    pubDate: Date;
    source: string;
    category: string;
}

interface FeedSource {
    url: string;
    name: string;
    defaultCategory: string;
}

export const RSS_SOURCES: FeedSource[] = [
    {
        url: 'https://www.economie.gouv.fr/rss',
        name: 'Economie.gouv',
        defaultCategory: 'Fiscalite',
    },
    {
        url: 'https://www.service-public.fr/particuliers/actualites/rss',
        name: 'Service Public',
        defaultCategory: 'Juridique',
    },
];

export const CATEGORIES = ['Tout', 'Fiscalite', 'Social', 'Juridique', 'TVA', 'IS/IR'] as const;
export type Category = (typeof CATEGORIES)[number];

// Static fallback articles when RSS fails
const FALLBACK_ARTICLES: RSSItem[] = [
    {
        title: "Calendrier fiscal 2026 : les dates cles a retenir",
        link: "https://www.economie.gouv.fr/entreprises/calendrier-fiscal",
        description: "Retrouvez toutes les echeances fiscales importantes de l'annee 2026 pour les entreprises et les particuliers. TVA, IS, CFE, DAS2...",
        pubDate: new Date(2026, 0, 15),
        source: "Economie.gouv",
        category: "Fiscalite",
    },
    {
        title: "TVA : les taux applicables en France en 2026",
        link: "https://www.economie.gouv.fr/cedef/taux-tva-france-702",
        description: "Le point sur les differents taux de TVA en vigueur en France : taux normal (20%), taux intermediaire (10%), taux reduit (5,5%) et taux particulier (2,1%).",
        pubDate: new Date(2026, 0, 10),
        source: "Economie.gouv",
        category: "TVA",
    },
    {
        title: "Impot sur les societes : bareme et taux applicables",
        link: "https://www.economie.gouv.fr/entreprises/impot-societes-taux",
        description: "Quels sont les taux d'imposition de l'IS ? Taux normal de 25%, taux reduit PME de 15% sur les 42 500 premiers euros de benefice.",
        pubDate: new Date(2026, 0, 8),
        source: "Economie.gouv",
        category: "IS/IR",
    },
    {
        title: "Cotisations sociales des employeurs : ce qui change",
        link: "https://www.urssaf.fr/accueil/employeur.html",
        description: "Les derniers ajustements des cotisations sociales patronales et les nouvelles mesures d'allegement pour les entreprises.",
        pubDate: new Date(2026, 0, 5),
        source: "URSSAF",
        category: "Social",
    },
    {
        title: "Loi de finances 2026 : les principales mesures fiscales",
        link: "https://www.legifrance.gouv.fr",
        description: "Analyse des principales dispositions de la loi de finances pour 2026 impactant les professionnels comptables et leurs clients.",
        pubDate: new Date(2025, 11, 30),
        source: "Legifrance",
        category: "Juridique",
    },
    {
        title: "Facture electronique : calendrier de deploiement",
        link: "https://www.economie.gouv.fr/cedef/facturation-electronique-702",
        description: "Le point complet sur le calendrier progressif d'obligation de facturation electronique pour les entreprises assujetties a la TVA.",
        pubDate: new Date(2025, 11, 20),
        source: "Economie.gouv",
        category: "TVA",
    },
    {
        title: "Credit d'impot recherche (CIR) : guide pratique 2026",
        link: "https://www.economie.gouv.fr/entreprises/credit-impot-recherche",
        description: "Conditions d'eligibilite, calcul du credit d'impot, depenses prises en compte et modalites de declaration du CIR.",
        pubDate: new Date(2025, 11, 15),
        source: "Economie.gouv",
        category: "IS/IR",
    },
    {
        title: "Declarations sociales : DSN et echeances mensuelles",
        link: "https://www.net-entreprises.fr/declaration/dsn/",
        description: "Rappel des echeances de la Declaration Sociale Nominative (DSN) et des obligations declaratives mensuelles des employeurs.",
        pubDate: new Date(2025, 11, 10),
        source: "Net-Entreprises",
        category: "Social",
    },
];

function parseRSSXml(xmlString: string, source: FeedSource): RSSItem[] {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parsing errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) return [];

        const items = doc.querySelectorAll('item');
        const results: RSSItem[] = [];

        items.forEach((item) => {
            const title = item.querySelector('title')?.textContent?.trim() ?? '';
            const link = item.querySelector('link')?.textContent?.trim() ?? '#';
            const description = item.querySelector('description')?.textContent?.trim() ?? '';
            const pubDateStr = item.querySelector('pubDate')?.textContent?.trim();
            const categoryEl = item.querySelector('category')?.textContent?.trim();

            const cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 200);

            let category = categoryEl || source.defaultCategory;
            const text = (title + ' ' + description).toLowerCase();
            if (text.includes('tva')) category = 'TVA';
            else if (text.includes('impot sur les societes') || text.includes('impot sur le revenu')) category = 'IS/IR';
            else if (text.includes('social') || text.includes('cotisation') || text.includes('urssaf') || text.includes('salaire')) category = 'Social';
            else if (text.includes('juridique') || text.includes('loi') || text.includes('decret')) category = 'Juridique';

            if (title) {
                results.push({
                    title,
                    link,
                    description: cleanDescription,
                    pubDate: pubDateStr ? new Date(pubDateStr) : new Date(),
                    source: source.name,
                    category,
                });
            }
        });

        return results;
    } catch {
        return [];
    }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchRSSFeed(source: FeedSource): Promise<RSSItem[]> {
    for (const proxy of CORS_PROXIES) {
        try {
            const response = await fetchWithTimeout(proxy + encodeURIComponent(source.url), 5000);
            if (!response.ok) continue;
            const text = await response.text();
            const items = parseRSSXml(text, source);
            if (items.length > 0) return items;
        } catch {
            continue;
        }
    }
    return [];
}

export async function fetchAllFeeds(): Promise<RSSItem[]> {
    const allResults = await Promise.all(RSS_SOURCES.map(fetchRSSFeed));
    const merged = allResults.flat();
    if (merged.length === 0) {
        // Return fallback articles if all feeds fail
        return FALLBACK_ARTICLES;
    }
    merged.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    return merged;
}

// localStorage cache
const CACHE_KEY = 'veille_rss_cache';
const CACHE_TTL = 15 * 60 * 1000;

interface CachedData {
    items: RSSItem[];
    timestamp: number;
}

export function getCachedFeeds(): RSSItem[] | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached: CachedData = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL) return null;
        return cached.items.map(item => ({ ...item, pubDate: new Date(item.pubDate) }));
    } catch {
        return null;
    }
}

export function setCachedFeeds(items: RSSItem[]): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
    } catch { /* ignore */ }
}

const FAVORITES_KEY = 'veille_favorites';

export function getFavorites(): string[] {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function toggleFavorite(link: string): string[] {
    const favs = getFavorites();
    const idx = favs.indexOf(link);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(link);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return favs;
}
