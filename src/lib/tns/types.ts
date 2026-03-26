// ============================================================================
// TNS Wizard — Types centraux
// ============================================================================

/** Statuts TNS possibles */
export type TNSStatut = 'gerant_sarl' | 'artisan' | 'commercant' | 'liberal_cipav' | 'liberal_urssaf';

/** Caisses sociales associées aux statuts */
export type CaisseSociale = 'urssaf' | 'cipav' | 'rsi' | 'carpimko' | 'cnbf' | 'cnavpl';

/** Types de cotisations */
export type TypeCotisation =
  | 'maladie'
  | 'retraite_base'
  | 'retraite_complementaire'
  | 'invalidite_deces'
  | 'allocations_familiales'
  | 'csg_deductible'
  | 'csg_non_deductible'
  | 'crds'
  | 'formation_professionnelle';

// ─── Step 1 : Profil ────────────────────────────────────────────────────────

export interface TNSProfil {
  statut: TNSStatut | null;
  dateDebutActivite: string; // ISO date
  exerciceFiscal: number;   // ex: 2025
  conjointCollaborateur: boolean;
  assietteConjoint: 'tiers' | 'moitie' | null;
}

// ─── Step 2 : Acomptes ─────────────────────────────────────────────────────

export interface TNSAcompte {
  id: string;
  date: string;        // ISO date
  montant: number;
  type: 'regularisation_n1' | 'provision_n';
  libelle: string;
}

export interface TNSAcomptesData {
  regularisationN1: TNSAcompte[];
  provisionsN: TNSAcompte[];
  totalRegularisation: number;
  totalProvisions: number;
  totalBrut: number; // Somme = Compte 646 brut
}

// ─── Step 3 : Assiette ─────────────────────────────────────────────────────

export interface TNSAssiette {
  remunerationNette: number;
  avantagesNature: number;
  dividendesSuperieur10: number;
  cotisationsObligatoires: number;         // auto-calculé depuis Step 2
  cotisationsObligatoiresManuel: boolean;  // mode manuel activé ?
  cotisationsObligatoiresForce: number;    // valeur forcée manuellement
  contratMadelin: boolean;
  montantMadelin: number;
  contratPER: boolean;
  montantPER: number;
}

// ─── Step 4 : Synthèse (Résultats calculés) ─────────────────────────────────

export interface TNSTresorerie {
  totalPaye: number;      // Total acomptes versés
  totalDu: number;        // Total cotisations recalculées
  solde: number;          // Dû - Payé (>0 = dette, <0 = créance)
  verdict: 'dette' | 'creance' | 'neutre';
}

export interface TNSVentilationLigne {
  type: TypeCotisation;
  label: string;
  montant: number;
  pourcentage: number;    // Part dans le total
  deductible: boolean;
  alerteFiscale?: string; // ex: "À réintégrer sur la 2058-A"
}

export interface TNSSynthese {
  tresorerie: TNSTresorerie;
  ventilation: TNSVentilationLigne[];
  totalCotisations: number;
  baseCalcul: {
    label: string;
    montant: number;
  }[];
}

// ─── Step 5 : Export comptable ──────────────────────────────────────────────

export interface TNSEcritureLigne {
  id: string;
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  codeAnalytique?: string;
  editable: boolean;
}

export interface TNSExportConfig {
  journal: string;         // ex: 'OD'
  dateEcriture: string;    // ISO date (31/12/N)
  lignes: TNSEcritureLigne[];
  equilibre: boolean;      // Debit total === Credit total
}

// ─── Wizard State ────────────────────────────────────────────────────────────

export interface TNSWizardState {
  currentStep: number;           // 0-indexed (0..4)
  completedSteps: boolean[];     // [true, true, false, false, false]
  profil: TNSProfil;
  acomptes: TNSAcomptesData;
  assiette: TNSAssiette;
  synthese: TNSSynthese | null;  // Calculé automatiquement
  exportConfig: TNSExportConfig | null;
  isDirty: boolean;              // données modifiées non sauvegardées
  isCalculating: boolean;        // calcul en cours
  isAIPreFilled?: boolean;       // Indique si le dossier a été pré-rempli par l'IA
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type TNSAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'COMPLETE_STEP'; payload: number }
  | { type: 'UPDATE_PROFIL'; payload: Partial<TNSProfil> }
  | { type: 'UPDATE_ACOMPTES'; payload: Partial<TNSAcomptesData> }
  | { type: 'ADD_ACOMPTE'; payload: TNSAcompte }
  | { type: 'REMOVE_ACOMPTE'; payload: { id: string; type: 'regularisation_n1' | 'provision_n' } }
  | { type: 'UPDATE_ASSIETTE'; payload: Partial<TNSAssiette> }
  | { type: 'SET_SYNTHESE'; payload: TNSSynthese }
  | { type: 'SET_EXPORT_CONFIG'; payload: TNSExportConfig }
  | { type: 'UPDATE_ECRITURE_LIGNE'; payload: { id: string; updates: Partial<TNSEcritureLigne> } }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'RESET_WIZARD' }
  | { type: 'RESTORE_STATE'; payload: TNSWizardState }
  | { type: 'PREFILL_FROM_DOCUMENT'; payload: { profil: Partial<TNSProfil>; acomptes: Partial<TNSAcomptesData>; assiette: Partial<TNSAssiette> } };
