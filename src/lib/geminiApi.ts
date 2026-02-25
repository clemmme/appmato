/**
 * MATO AI — Service API via Groq
 * - Texte/Calculs   : llama-3.3-70b-versatile (14 400 RPD free)
 * - Web temps réel  : compound-beta (recherche web Tavily automatique)
 * - Vision (images) : llama-3.2-90b-vision-preview
 */

const GROQ_MODEL = 'llama-3.3-70b-versatile';  // Rapide, connaissance générale
const GROQ_WEB_MODEL = 'compound-beta';             // Recherche web temps réel
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview'; // Vision images/PDF
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Mots-clés qui indiquent qu'une question nécessite des infos récentes du web
const WEB_SEARCH_KEYWORDS = [
    '2025', '2026', '2027',
    'actuel', 'actuellement', 'aujourd', 'récent', 'récente', 'dernièr',
    'nouveau', 'nouvelle', 'nouveaux', 'en vigueur', 'en cours',
    'mise à jour', 'changement', 'modification', 'réforme',
    'projet de loi', 'loi de finances', 'plfss', 'plf',
    'journal officiel', 'jo du', 'décret', 'arrêté',
    'actualité', 'news', 'annonce',
];

/**
 * Détecte si la question nécessite une recherche web (infos récentes)
 */
function needsWebSearch(messages: ChatMessage[]): boolean {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return false;
    const text = lastUserMessage.text.toLowerCase();
    return WEB_SEARCH_KEYWORDS.some(kw => text.includes(kw));
}

// API key from environment variable
const API_KEY = (import.meta.env.VITE_GROQ_API_KEY || '').trim();

if (!API_KEY) {
    console.warn("⚠️ MATO AI: VITE_GROQ_API_KEY est manquante dans le fichier .env");
}

export function getGeminiApiKey(): string {
    return API_KEY;
}

export function hasApiKey(): boolean {
    return !!API_KEY;
}

const SYSTEM_PROMPT = `Tu es **MATO AI**, l'assistant expert intégré dans APPMATO, un ERP pour cabinets d'expertise-comptable.

## Ton expertise couvre :

### 1. COMPTABILITÉ
- Plan Comptable Général (PCG 2026) — tu connais tous les comptes, classes 1 à 8
- Écritures comptables (journal, grand livre, balance)
- Normes françaises (ANC) et IFRS
- Comptabilisation des immobilisations, amortissements (linéaire, dégressif, par composants)
- Provisions (risques, charges, dépréciations)
- Clôture des comptes annuels, liasse fiscale
- Consolidation des comptes

### 2. FISCALITÉ
- Impôt sur les sociétés (IS) — taux, acomptes, régimes
- Impôt sur le revenu (IR) — barème, tranches, niches fiscales
- TVA — régimes (réel normal, simplifié, micro), calcul, déclarations CA3/CA12
- CET (CFE + CVAE), C3S
- Plus-values professionnelles et patrimoniales
- Régimes fiscaux (micro, réel, IS vs IR)
- Fiscalité internationale (conventions, prix de transfert)
- Contrôle fiscal, procédures de redressement
- BOFiP, CGI — tu cites les articles pertinents

### 3. DROIT DU TRAVAIL & SOCIAL
- Contrats de travail (CDI, CDD, intérim, apprentissage)
- Conventions collectives (notamment CCN des cabinets comptables IDCC 0787)
- Paie : bulletins, cotisations URSSAF, Agirc-Arrco, prévoyance
- Charges patronales et salariales — barèmes en vigueur
- Congés payés, RTT, heures supplémentaires
- Licenciement, rupture conventionnelle, démission
- CSE, accords d'entreprise
- DPAE, DSN, déclarations sociales

### 4. DROIT DES AFFAIRES & DES SOCIÉTÉS
- Création d'entreprise (SARL, SAS, SASU, EURL, SCI, SA...)
- Statuts, pactes d'associés, AGO/AGE
- Augmentation de capital, cession de parts/actions
- Fusion, scission, TUP, apport partiel d'actif
- Procédures collectives (sauvegarde, RJ, LJ)
- Baux commerciaux (3-6-9)
- Droit des contrats commerciaux

### 5. FINANCE D'ENTREPRISE
- Analyse financière (SIG, CAF, BFR, trésorerie)
- Évaluation d'entreprise (DCF, multiples, actif net, goodwill)
- Business plan, prévisionnel, plan de financement
- Ratios financiers (rentabilité, solvabilité, liquidité)
- Financement (emprunt, crédit-bail, affacturage)

## Règles de comportement :
1. **Toujours citer les sources** : articles du CGI, du Code du travail, du Code de commerce, recommandations ANC, BOFiP, etc.
2. **Être précis et structuré** : utilise des titres, listes, tableaux quand c'est pertinent
3. **Chiffrer quand possible** : donne les montants, taux, seuils en vigueur pour 2025-2026
4. **Disclaimer** : Précise toujours quand un point mérite une vérification auprès d'un expert ou que la législation peut avoir évolué
5. **Format Markdown** : Utilise le gras, les titres, les tableaux, les listes pour une lisibilité optimale
6. **Répondre en français** — toujours
7. **Si l'utilisateur fournit une image** (bilan, compte de résultat, facture, bulletin de paie...), l'analyser en détail et extraire les données pertinentes
8. **Ne JAMAIS inventer de chiffres** — si tu ne connais pas un taux ou un seuil exact, dis-le
9. **Être pédagogue** — explique clairement, comme un bon expert-comptable qui vulgarise pour son client`;

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    images?: string[]; // base64 data URIs
    fileNames?: string[];
    timestamp: number;
}

interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | GroqContentPart[];
}

interface GroqContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

function buildMessages(messages: ChatMessage[]): { groqMessages: GroqMessage[]; hasImages: boolean } {
    let hasImages = false;

    const groqMessages: GroqMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];

    for (const msg of messages) {
        const role = msg.role === 'user' ? 'user' : 'assistant';

        // Check if message has images
        const imageUris = msg.images?.filter(img => img.startsWith('data:image')) || [];

        if (imageUris.length > 0 && msg.role === 'user') {
            hasImages = true;
            const parts: GroqContentPart[] = [];

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

            groqMessages.push({ role, content: parts });
        } else {
            groqMessages.push({ role, content: msg.text });
        }
    }

    return { groqMessages, hasImages };
}

export async function sendMessage(messages: ChatMessage[]): Promise<string> {
    const key = API_KEY;
    if (!key) {
        console.error("[MATO AI] Clé API Groq manquante dans .env");
        throw new Error("Clé API manquante. Configurez VITE_GROQ_API_KEY dans votre fichier .env.");
    }

    const { groqMessages, hasImages } = buildMessages(messages);
    // Priorité : vision > web search > modèle rapide standard
    let model: string;
    if (hasImages) {
        model = GROQ_VISION_MODEL;
    } else if (needsWebSearch(messages)) {
        model = GROQ_WEB_MODEL;
        console.log(`[MATO AI] 🌐 Recherche web activée (compound-beta)`);
    } else {
        model = GROQ_MODEL;
    }

    console.log(`[MATO AI] Envoi requête vers Groq (${model})...`);


    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model,
                messages: groqMessages,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 0.95,
            })
        });

        if (response.status === 429) {
            console.error("[MATO AI] 429: Limite de requêtes atteinte");
            throw new Error('⏰ Limite de requêtes atteinte (30/min). Réessayez dans une minute.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[MATO AI] Erreur API:", errorData);
            throw new Error(`Erreur API (${response.status}): ${errorData.error?.message || 'Inconnue'}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            console.error("[MATO AI] Réponse vide ou structure inconnue", data);
            throw new Error('Réponse vide de l\'IA.');
        }

        console.log(`[MATO AI] Réponse reçue en ${data.usage?.total_time ? (data.usage.total_time * 1000).toFixed(0) + 'ms' : '?'}`);
        return text;
    } catch (error) {
        console.error("[MATO AI] Fetch Error:", error);
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
