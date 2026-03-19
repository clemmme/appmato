/**
 * Alfred — Service API via xAI (Grok)
 * - Texte/Calculs   : grok-3-mini
 * - Vision (images) : grok-3-mini (multimodal)
 */

const XAI_MODEL = 'grok-4-1-fast-reasoning';
const XAI_VISION_MODEL = 'grok-4-1-fast-reasoning';
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

// Mots-clés qui indiquent qu'une question nécessite des infos récentes du web
const WEB_SEARCH_KEYWORDS = [
    '2025', '2026', '2027',
    'actuel', 'actuellement', 'aujourd', 'récent', 'récente', 'dernièr',
    'nouveau', 'nouvelle', 'nouveaux', 'en vigueur', 'en cours',
    'mise à jour', 'changement', 'modification', 'réforme',
    'projet de loi', 'loi de finances', 'plfss', 'plf',
    'journal officiel', 'jo du', 'décret', 'arrêté',
    'actualité', 'news', 'annonce',
    'mémento', 'lefebvre', 'revue fiduciaire', 'rf', 'lamy',
    'jurisprudence', 'cassation', 'convention collective',
    'entreprendre.gouv.fr', 'formalités entreprises',
];

/**
 * Détecte si la question nécessite une recherche web (infos récentes)
 * Note: Grok-2 intègre nativement la recherche web si nécessaire via ses capacités de raisonnement,
 * mais nous gardons la détection pour logs/info si besoin.
 */
function needsWebSearch(messages: ChatMessage[]): boolean {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return false;
    const text = lastUserMessage.text.toLowerCase();
    return WEB_SEARCH_KEYWORDS.some(kw => text.includes(kw));
}

// API key from environment variable
const API_KEY = (import.meta.env.VITE_XAI_API_KEY || '').trim();

if (!API_KEY) {
    console.warn("⚠️ Alfred: VITE_XAI_API_KEY est manquante dans le fichier .env");
}

export function getGeminiApiKey(): string {
    return API_KEY;
}

export function hasApiKey(): boolean {
    return !!API_KEY;
}

const SYSTEM_PROMPT_BASE = `Tu es **Alfred**, l'assistant IA de pointe pour experts-comptables.

## 🚫 RÈGLE ABSOLUE N°1 — PÉRIMÈTRE STRICT :
Tu es UNIQUEMENT autorisé à répondre aux questions relevant de ces domaines :
- **Comptabilité** : saisie, écritures, PCG, clôture, révision, bilans
- **Fiscalité** : TVA, IS, IR, CFE, liasse fiscale, BOFiP, décrets, loi de finances
- **Social / Paie** : bulletins, URSSAF, charges sociales, convention collective, congés
- **Juridique** : droit des sociétés, contrats, statuts, contentieux, GIE, SCI
- **Gestion cabinet** : dossiers clients, relances, échéances, tableaux de bord

Si la question ne relève d'AUCUN de ces domaines (météo, sport, cuisine, informatique générale, blagues, sujets personnels, etc.), tu DOIS répondre UNIQUEMENT et EXACTEMENT avec cette phrase, sans ajouter quoi que ce soit d'autre :
"Je suis exclusivement spécialisé en comptabilité, fiscalité, social et droit des affaires. Cette question est hors de mon périmètre."

## Règles d'OR :
1. **CONCISION CHIRURGICALE** : Pas de politesses superflues. Réponds directement en 3-5 lignes max sauf si un tableau ou une liste est nécessaire.
2. **NIVEAU EXPERT** : Pas de vulgarisation. Parle technique (comptes 6xx/7xx, doctrine administrative, jurisprudence).
3. **FIABILITÉ DES SOURCES** : Cite toujours des sources d'autorité comme Légifrance, BOFiP, CGI, Code de Commerce, Code du Travail, Mémentos Francis Lefebvre, Revue Fiduciaire ou entreprendre.gouv.fr. Fournis des liens si possible. N'invente jamais d'URLs.
4. **FORMAT** : Utilise Markdown, listes à puces et tableaux pour les écritures.
5. **ÉCONOMIE DE TOKENS** : Sois précis et court. Pas de répétitions, pas d'introductions.
6. **VEILLE** : Prends en compte les dernières actualités fiscales et sociales publiées par ces sources.`;

export const AGENTS = {
    generalist: {
        id: 'generalist',
        name: 'Généraliste',
        icon: '🧠',
        description: 'Expertise globale cabinet',
        prompt: `${SYSTEM_PROMPT_BASE}\n\n## Ta spécialité :\nTu es un expert-comptable généraliste. Tu maîtrises l'ensemble du spectre d'un cabinet (Compta, Fisc, Social, Juridique). Utilise les Mémentos Francis Lefebvre et la Revue Fiduciaire comme sources de référence pour tes analyses globales.`
    },
    accountant: {
        id: 'accountant',
        name: 'Comptable',
        icon: '📒',
        description: 'Saisie, révision, PCG',
        prompt: `${SYSTEM_PROMPT_BASE}\n\n## Ta spécialité :\nTu es un expert de la production comptable. Concentre-toi sur le PCG, les schémas d'écritures, la révision, le cut-off et la clôture annuelle.`
    },
    tax: {
        id: 'tax',
        name: 'Fiscaliste',
        icon: '⚖️',
        description: 'TVA, IS, IR, BOFiP',
        prompt: `${SYSTEM_PROMPT_BASE}\n\n## Ta spécialité :\nTu es un expert fiscal. Base toujours tes réponses sur le CGI, le BOFiP et le Code de Commerce. Utilise également les Mémentos Fiscaux et les dossiers de la Revue Fiduciaire. Maîtrise la TVA, l'IS, la liasse fiscale et les régimes d'imposition.`
    },
    social: {
        id: 'social',
        name: 'Social',
        icon: '👥',
        description: 'Paie, URSSAF, contrats',
        prompt: `${SYSTEM_PROMPT_BASE}\n\n## Ta spécialité :\nTu es un expert social et paie. Concentre-toi sur les charges sociales, le droit du travail (Code du Travail), les déclarations DSN et les conventions collectives. Cite précisément les articles du Code du Travail ou les numéros de brochure de la Revue Fiduciaire Social.`
    },
    legal: {
        id: 'legal',
        name: 'Juridique',
        icon: '🏛️',
        description: 'Droit des affaires, AG',
        prompt: `${SYSTEM_PROMPT_BASE}\n\n## Ta spécialité :\nTu es un expert en droit des affaires et des sociétés. Aide sur la rédaction de statuts (en te basant sur le Code de Commerce), les AG d'approbation des comptes, le droit des contrats, les formalités (Infogreffe) et la jurisprudence (Lamy, Dalloz).`
    }
} as const;

export type AgentId = keyof typeof AGENTS;

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    images?: string[]; // base64 data URIs
    fileNames?: string[];
    timestamp: number;
}

interface XaiMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | XaiContentPart[];
}

interface XaiContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

function buildMessages(messages: ChatMessage[], agentContext: string, dossierContext: string): { xaiMessages: XaiMessage[]; hasImages: boolean } {
    let hasImages = false;

    // Combine agent prompt and dossier context
    const fullSystemContent = `${agentContext}\n\n${dossierContext}`.trim();

    const xaiMessages: XaiMessage[] = [
        { role: 'system', content: fullSystemContent }
    ];

    for (const msg of messages) {
        const role = msg.role === 'user' ? 'user' : 'assistant';

        // Check if message has images
        const imageUris = msg.images?.filter(img => img.startsWith('data:image')) || [];

        if (imageUris.length > 0 && msg.role === 'user') {
            hasImages = true;
            const parts: XaiContentPart[] = [];

            // Add images first
            for (const dataUri of imageUris) {
                parts.push({
                    type: 'image_url',
                    image_url: { url: dataUri }
                });
            }

            // Add text
            if (msg.text) {
                parts.push({ type: 'text', text: msg.text });
            }

            xaiMessages.push({ role, content: parts });
        } else {
            xaiMessages.push({ role, content: msg.text });
        }
    }

    return { xaiMessages, hasImages };
}

export async function sendMessage(messages: ChatMessage[], agentId: AgentId = 'generalist', dossierContext: string = ''): Promise<string> {
    const key = API_KEY;
    if (!key) {
        console.error("[Alfred] Clé API xAI manquante dans .env");
        throw new Error("Clé API manquante. Configurez VITE_XAI_API_KEY dans votre fichier .env.");
    }

    const agentContext = AGENTS[agentId].prompt;
    const { xaiMessages, hasImages } = buildMessages(messages, agentContext, dossierContext);

    let model: string;
    if (hasImages) {
        model = XAI_VISION_MODEL;
    } else {
        model = XAI_MODEL;
    }

    console.log(`[Alfred] Envoi requête vers xAI (${model})...`);


    try {
        const response = await fetch(XAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model,
                messages: xaiMessages,
                temperature: 0, // Plus précis pour la compta
                max_tokens: 4096,
                stream: false
            })
        });

        if (response.status === 429) {
            console.error("[Alfred] 429: Limite de requêtes atteinte");
            throw new Error('⏰ Limite de requêtes atteinte (30/min). Réessayez dans une minute.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Alfred] Erreur API:", errorData);
            const errMsg = errorData.error?.message || errorData.error || 'Inconnue';
            throw new Error(`Erreur API (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            console.error("[Alfred] Réponse vide ou structure inconnue", data);
            throw new Error('Réponse vide de l\'IA.');
        }

        console.log(`[Alfred] Réponse reçue en ${data.usage?.total_time ? (data.usage.total_time * 1000).toFixed(0) + 'ms' : '?'}`);
        return text;
    } catch (error) {
        console.error("[Alfred] Fetch Error:", error);
        throw error;
    }
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const SUPPORTED_DOC_TYPES = ['application/pdf'];
export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
