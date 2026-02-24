/**
 * Gemini AI API Service — Expert comptable, fiscal, social, juridique
 * Uses Google Gemini 1.5 Flash (free tier: 15 RPM, 1500 RPD)
 */

const GEMINI_MODEL = 'gemini-1.5-flash';

// API key from environment variable (single shared key for all users)
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

if (!API_KEY) {
    console.warn("⚠️ MATO AI: VITE_GEMINI_API_KEY est manquante dans le fichier .env");
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

interface GeminiPart {
    text?: string;
    inline_data?: {
        mime_type: string;
        data: string;
    };
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

function buildContents(messages: ChatMessage[]): GeminiContent[] {
    return messages.map(msg => {
        const parts: GeminiPart[] = [];
        if (msg.images) {
            for (const dataUri of msg.images) {
                const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    parts.push({
                        inline_data: {
                            mime_type: match[1],
                            data: match[2],
                        }
                    });
                }
            }
        }
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        return {
            role: msg.role,
            parts,
        };
    });
}

export async function sendMessage(messages: ChatMessage[]): Promise<string> {
    const key = getGeminiApiKey();
    if (!key) {
        console.error("[MATO AI] Clé API manquante dans .env");
        throw new Error("Clé API manquante. Configurez VITE_GEMINI_API_KEY dans votre fichier .env.");
    }

    // Crucial: Use v1beta and correct naming (system_instruction is snake_case, generationConfig is camelCase)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const googleMessages = buildContents(messages);

    console.log(`[MATO AI] Envoi requête vers ${GEMINI_MODEL} (v1beta)...`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: googleMessages,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 4096,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                ]
            })
        });

        if (response.status === 429) {
            console.error("[MATO AI] 429: Limite de requêtes atteinte");
            throw new Error('⏰ Limite de requêtes atteinte (15/min). Réessayez dans une minute.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[MATO AI] Erreur API:", errorData);
            throw new Error(`Erreur API (${response.status}): ${errorData.error?.message || 'Inconnue'}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("[MATO AI] Réponse vide ou structure inconnue", data);
            throw new Error('Réponse vide de l\'IA.');
        }

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
