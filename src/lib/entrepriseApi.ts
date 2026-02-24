const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search';


export interface EntrepriseResult {
    siren: string;
    nom_complet: string;
    nom_raison_sociale: string;
    sigle: string | null;
    nombre_etablissements: number;
    nombre_etablissements_ouverts: number;
    date_creation: string;
    date_fermeture: string | null;
    etat_administratif: string; // "A" = active, "C" = cessée
    nature_juridique: string;
    categorie_entreprise: string; // PME, ETI, GE
    activite_principale: string; // Code NAF
    tranche_effectif_salarie: string;
    siege: {
        siret: string;
        adresse: string;
        code_postal: string;
        libelle_commune: string;
        departement: string;
        latitude: string;
        longitude: string;
    };
    dirigeants: {
        nom: string;
        prenoms: string;
        qualite: string;
        type_dirigeant: string;
        denomination?: string; // for personne morale
    }[];
    finances?: Record<string, { ca?: number; resultat_net?: number }>;
}

export interface SearchResponse {
    results: EntrepriseResult[];
    total_results: number;
    page: number;
    per_page: number;
    total_pages: number;
}

// NAF code labels (most common)
const NAF_LABELS: Record<string, string> = {
    '69.20Z': 'Activités comptables',
    '69.10Z': 'Activités juridiques',
    '62.01Z': 'Programmation informatique',
    '62.02A': 'Conseil en systèmes informatiques',
    '47.11F': 'Hypermarchés',
    '47.11D': 'Supermarchés',
    '56.10A': 'Restauration traditionnelle',
    '41.20A': 'Construction résidentielle',
    '43.21A': 'Travaux électriques',
    '68.20A': 'Location de logements',
    '68.20B': 'Location de terrains et autres biens immo',
    '46.69B': 'Commerce de gros interindustriel',
    '86.21Z': 'Activité des médecins généralistes',
    '86.23Z': 'Pratique dentaire',
    '85.59A': 'Formation continue d\'adultes',
    '70.22Z': 'Conseil pour les affaires',
    '64.19Z': 'Autres intermédiations monétaires',
    '66.12Z': 'Courtage en valeurs mobilières',
    '10.71C': 'Boulangerie et boulangerie-pâtisserie',
    '45.11Z': 'Commerce de voitures',
};

// Tranche effectif labels
const EFFECTIF_LABELS: Record<string, string> = {
    'NN': 'Non renseigné',
    '00': '0 salarié',
    '01': '1-2 salariés',
    '02': '3-5 salariés',
    '03': '6-9 salariés',
    '11': '10-19 salariés',
    '12': '20-49 salariés',
    '21': '50-99 salariés',
    '22': '100-199 salariés',
    '31': '200-249 salariés',
    '32': '250-499 salariés',
    '41': '500-999 salariés',
    '42': '1 000-1 999 salariés',
    '51': '2 000-4 999 salariés',
    '52': '5 000-9 999 salariés',
    '53': '10 000+ salariés',
};

// Nature juridique labels
const NATURE_LABELS: Record<string, string> = {
    '1000': 'Entrepreneur individuel',
    '5499': 'SARL unipersonnelle (EURL)',
    '5710': 'SAS',
    '5720': 'SASU',
    '5498': 'SARL',
    '5599': 'SA à conseil d\'administration',
    '6599': 'SCI',
    '9220': 'Association déclarée',
};

export function getNafLabel(code: string): string {
    return NAF_LABELS[code] || code;
}

export function getEffectifLabel(code: string): string {
    return EFFECTIF_LABELS[code] || code;
}

export function getNatureLabel(code: string): string {
    return NATURE_LABELS[code] || code;
}

export function formatSiren(siren: string): string {
    return siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

export function formatSiret(siret: string): string {
    return siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4');
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export async function searchEntreprises(query: string, page = 1, perPage = 10): Promise<SearchResponse> {
    const url = `${API_BASE}?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
    return response.json();
}

export async function searchBySiret(siret: string): Promise<SearchResponse> {
    // The API also accepts SIRET/SIREN as query
    return searchEntreprises(siret.replace(/\s/g, ''), 1, 5);
}
