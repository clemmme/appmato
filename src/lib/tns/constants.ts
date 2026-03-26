// ============================================================================
// TNS Wizard — Constantes métier
// ============================================================================

import type { TNSStatut, CaisseSociale, TypeCotisation } from './types';

// ─── Statuts TNS ─────────────────────────────────────────────────────────────

export interface StatutConfig {
  id: TNSStatut;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  caisses: CaisseSociale[];
  color: string; // Tailwind gradient
}

export const STATUTS_TNS: StatutConfig[] = [
  {
    id: 'gerant_sarl',
    label: 'Gérant majoritaire SARL',
    description: 'Gérant détenant >50% des parts sociales',
    icon: 'Building2',
    caisses: ['urssaf'],
    color: 'from-blue-500/20 to-indigo-500/10',
  },
  {
    id: 'artisan',
    label: 'Artisan',
    description: 'Entreprise individuelle artisanale',
    icon: 'Wrench',
    caisses: ['urssaf'],
    color: 'from-amber-500/20 to-orange-500/10',
  },
  {
    id: 'commercant',
    label: 'Commerçant',
    description: 'Activité commerciale ou industrielle',
    icon: 'ShoppingBag',
    caisses: ['urssaf'],
    color: 'from-emerald-500/20 to-green-500/10',
  },
  {
    id: 'liberal_cipav',
    label: 'Libéral (CIPAV)',
    description: 'Profession libérale rattachée CIPAV',
    icon: 'GraduationCap',
    caisses: ['urssaf', 'cipav'],
    color: 'from-violet-500/20 to-purple-500/10',
  },
  {
    id: 'liberal_urssaf',
    label: 'Libéral (Urssaf seule)',
    description: 'Profession libérale non réglementée',
    icon: 'Briefcase',
    caisses: ['urssaf'],
    color: 'from-rose-500/20 to-pink-500/10',
  },
];

// ─── Badges Caisses ─────────────────────────────────────────────────────────

export const CAISSE_LABELS: Record<CaisseSociale, { label: string; color: string }> = {
  urssaf: { label: 'Urssaf', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cipav: { label: 'CIPAV', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  rsi: { label: 'RSI', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  carpimko: { label: 'CARPIMKO', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
  cnbf: { label: 'CNBF', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cnavpl: { label: 'CNAVPL', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

// ─── Plan Comptable (comptes utilisés) ──────────────────────────────────────

export const COMPTES_TNS = {
  // Charges sociales
  '646100': 'Charges sociales du dirigeant — Maladie-Maternité',
  '646200': 'Charges sociales du dirigeant — Retraite de base',
  '646300': 'Charges sociales du dirigeant — Retraite complémentaire',
  '646400': 'Charges sociales du dirigeant — Invalidité-Décès',
  '646500': 'Charges sociales du dirigeant — Allocations familiales',
  '646600': 'Charges sociales du dirigeant — Formation professionnelle',
  // CSG/CRDS
  '637810': 'CSG déductible',
  '108000': 'CSG/CRDS non déductible (compte de l\'exploitant)',
  '634100': 'CRDS',
  // Contrepartie
  '438600': 'Organismes sociaux — Charges à payer',
  '438700': 'Organismes sociaux — Produits à recevoir',
} as const;

// ─── Labels des types de cotisation ─────────────────────────────────────────

export const COTISATION_LABELS: Record<TypeCotisation, { label: string; shortLabel: string; deductible: boolean; alerteFiscale?: string }> = {
  maladie: { label: 'Maladie-Maternité', shortLabel: 'Maladie', deductible: true },
  retraite_base: { label: 'Retraite de base', shortLabel: 'Retraite base', deductible: true },
  retraite_complementaire: { label: 'Retraite complémentaire', shortLabel: 'Retraite compl.', deductible: true },
  invalidite_deces: { label: 'Invalidité-Décès', shortLabel: 'Inval./Décès', deductible: true },
  allocations_familiales: { label: 'Allocations familiales', shortLabel: 'Alloc. fam.', deductible: true },
  csg_deductible: { label: 'CSG Déductible', shortLabel: 'CSG déd.', deductible: true },
  csg_non_deductible: { label: 'CSG Non déductible', shortLabel: 'CSG non déd.', deductible: false, alerteFiscale: 'À réintégrer sur la 2058-A' },
  crds: { label: 'CRDS', shortLabel: 'CRDS', deductible: false, alerteFiscale: 'À réintégrer sur la 2058-A' },
  formation_professionnelle: { label: 'Formation professionnelle', shortLabel: 'Formation', deductible: true },
};

// ─── Steps du Wizard ────────────────────────────────────────────────────────

export const WIZARD_STEPS = [
  { id: 0, label: 'Profil', shortLabel: 'Profil', icon: 'UserCog' },
  { id: 1, label: 'Acomptes', shortLabel: 'Acomptes', icon: 'Coins' },
  { id: 2, label: 'Assiette', shortLabel: 'Assiette', icon: 'Calculator' },
  { id: 3, label: 'Synthèse', shortLabel: 'Synthèse', icon: 'BarChart3' },
  { id: 4, label: 'Export', shortLabel: 'Export', icon: 'FileDown' },
] as const;

// ─── Valeurs par défaut ─────────────────────────────────────────────────────

export const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_PROFIL = {
  statut: null,
  dateDebutActivite: `${CURRENT_YEAR}-01-01`,
  exerciceFiscal: CURRENT_YEAR,
  conjointCollaborateur: false,
  assietteConjoint: null,
} as const;

export const DEFAULT_ASSIETTE = {
  remunerationNette: 0,
  avantagesNature: 0,
  dividendesSuperieur10: 0,
  cotisationsObligatoires: 0,
  cotisationsObligatoiresManuel: false,
  cotisationsObligatoiresForce: 0,
  contratMadelin: false,
  montantMadelin: 0,
  contratPER: false,
  montantPER: 0,
} as const;
