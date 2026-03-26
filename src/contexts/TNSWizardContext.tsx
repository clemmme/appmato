// ============================================================================
// TNS Wizard — State Management (React Context + useReducer)
// ============================================================================

import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import type { TNSWizardState, TNSAction, TNSSynthese, TNSExportConfig } from '@/lib/tns/types';
import { DEFAULT_PROFIL, DEFAULT_ASSIETTE } from '@/lib/tns/constants';
import { calculerSynthese, genererEcritures } from '@/lib/tns/calculations';

// ─── État initial ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'appmato_tns_wizard';

const initialState: TNSWizardState = {
  currentStep: 0,
  completedSteps: [false, false, false, false, false],
  profil: { ...DEFAULT_PROFIL } as TNSWizardState['profil'],
  acomptes: {
    regularisationN1: [],
    provisionsN: [],
    totalRegularisation: 0,
    totalProvisions: 0,
    totalBrut: 0,
  },
  assiette: { ...DEFAULT_ASSIETTE },
  synthese: null,
  exportConfig: null,
  isDirty: false,
  isCalculating: false,
  isAIPreFilled: false,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function tnsReducer(state: TNSWizardState, action: TNSAction): TNSWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(4, action.payload)) };

    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(4, state.currentStep + 1) };

    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };

    case 'COMPLETE_STEP': {
      const completedSteps = [...state.completedSteps];
      completedSteps[action.payload] = true;
      return { ...state, completedSteps, isDirty: true };
    }

    case 'UPDATE_PROFIL':
      return {
        ...state,
        profil: { ...state.profil, ...action.payload },
        isDirty: true,
      };

    case 'UPDATE_ACOMPTES': {
      const acomptes = { ...state.acomptes, ...action.payload };
      // Recalcul auto des totaux
      acomptes.totalRegularisation = acomptes.regularisationN1.reduce((s, a) => s + a.montant, 0);
      acomptes.totalProvisions = acomptes.provisionsN.reduce((s, a) => s + a.montant, 0);
      acomptes.totalBrut = acomptes.totalRegularisation + acomptes.totalProvisions;
      return { ...state, acomptes, isDirty: true };
    }

    case 'ADD_ACOMPTE': {
      const acompte = action.payload;
      const acomptes = { ...state.acomptes };
      if (acompte.type === 'regularisation_n1') {
        acomptes.regularisationN1 = [...acomptes.regularisationN1, acompte];
      } else {
        acomptes.provisionsN = [...acomptes.provisionsN, acompte];
      }
      acomptes.totalRegularisation = acomptes.regularisationN1.reduce((s, a) => s + a.montant, 0);
      acomptes.totalProvisions = acomptes.provisionsN.reduce((s, a) => s + a.montant, 0);
      acomptes.totalBrut = acomptes.totalRegularisation + acomptes.totalProvisions;
      return { ...state, acomptes, isDirty: true };
    }

    case 'REMOVE_ACOMPTE': {
      const { id, type } = action.payload;
      const acomptes = { ...state.acomptes };
      if (type === 'regularisation_n1') {
        acomptes.regularisationN1 = acomptes.regularisationN1.filter(a => a.id !== id);
      } else {
        acomptes.provisionsN = acomptes.provisionsN.filter(a => a.id !== id);
      }
      acomptes.totalRegularisation = acomptes.regularisationN1.reduce((s, a) => s + a.montant, 0);
      acomptes.totalProvisions = acomptes.provisionsN.reduce((s, a) => s + a.montant, 0);
      acomptes.totalBrut = acomptes.totalRegularisation + acomptes.totalProvisions;
      return { ...state, acomptes, isDirty: true };
    }

    case 'UPDATE_ASSIETTE':
      return {
        ...state,
        assiette: { ...state.assiette, ...action.payload },
        isDirty: true,
      };

    case 'PREFILL_FROM_DOCUMENT':
      return {
        ...state,
        profil: { ...state.profil, ...action.payload.profil },
        acomptes: { ...state.acomptes, ...action.payload.acomptes },
        assiette: { ...state.assiette, ...action.payload.assiette },
        completedSteps: [true, true, false, false, false], // Valider les steps 1 et 2
        isDirty: true,
        isAIPreFilled: true,
      };

    case 'SET_SYNTHESE':
      return { ...state, synthese: action.payload };

    case 'SET_EXPORT_CONFIG':
      return { ...state, exportConfig: action.payload };

    case 'UPDATE_ECRITURE_LIGNE': {
      if (!state.exportConfig) return state;
      const lignes = state.exportConfig.lignes.map(l =>
        l.id === action.payload.id ? { ...l, ...action.payload.updates } : l
      );
      const totalDebit = lignes.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lignes.reduce((s, l) => s + l.credit, 0);
      return {
        ...state,
        exportConfig: {
          ...state.exportConfig,
          lignes,
          equilibre: Math.abs(totalDebit - totalCredit) < 0.01,
        },
      };
    }

    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload };

    case 'RESET_WIZARD':
      return { ...initialState };

    case 'RESTORE_STATE':
      return { ...action.payload };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface TNSWizardContextType {
  state: TNSWizardState;
  dispatch: React.Dispatch<TNSAction>;
  // Derived data (computed)
  synthese: TNSSynthese | null;
  exportConfig: TNSExportConfig | null;
  // Helpers
  canProceed: boolean;
  recalculer: () => void;
}

const TNSWizardContext = createContext<TNSWizardContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export function TNSWizardProvider({ children }: { children: React.ReactNode }) {
  // Restore from localStorage
  const [state, dispatch] = useReducer(tnsReducer, initialState, (initial) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed, isCalculating: false };
      }
    } catch {
      // Corrupted data, start fresh
    }
    return initial;
  });

  // Persist to localStorage on change
  useEffect(() => {
    if (state.isDirty) {
      const toSave = { ...state, isCalculating: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state]);

  // Auto-compute synthèse when assiette or acomptes change
  const synthese = useMemo<TNSSynthese | null>(() => {
    if (state.assiette.remunerationNette > 0 || state.acomptes.totalBrut > 0) {
      return calculerSynthese(state.assiette, state.acomptes, state.profil.statut);
    }
    return null;
  }, [state.assiette, state.acomptes, state.profil.statut]);

  // Auto-compute export config from synthese
  const exportConfig = useMemo<TNSExportConfig | null>(() => {
    if (synthese && synthese.tresorerie.verdict !== 'neutre') {
      return genererEcritures(synthese, state.profil.exerciceFiscal);
    }
    return null;
  }, [synthese, state.profil.exerciceFiscal]);

  // Sync computed data back to state
  useEffect(() => {
    if (synthese) {
      dispatch({ type: 'SET_SYNTHESE', payload: synthese });
    }
  }, [synthese]);

  useEffect(() => {
    if (exportConfig) {
      dispatch({ type: 'SET_EXPORT_CONFIG', payload: exportConfig });
    }
  }, [exportConfig]);

  const canProceed = useMemo(() => {
    return state.completedSteps[state.currentStep] || false;
  }, [state.completedSteps, state.currentStep]);

  const recalculer = useCallback(() => {
    dispatch({ type: 'SET_CALCULATING', payload: true });
    // Simulate async recalculation
    setTimeout(() => {
      if (synthese) {
        dispatch({ type: 'SET_SYNTHESE', payload: synthese });
      }
      dispatch({ type: 'SET_CALCULATING', payload: false });
    }, 300);
  }, [synthese]);

  return (
    <TNSWizardContext.Provider value={{ state, dispatch, synthese, exportConfig, canProceed, recalculer }}>
      {children}
    </TNSWizardContext.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useTNSWizard() {
  const context = useContext(TNSWizardContext);
  if (!context) {
    throw new Error('useTNSWizard must be used within a TNSWizardProvider');
  }
  return context;
}

export function useTNSSynthese() {
  const { synthese, exportConfig, state } = useTNSWizard();
  return { synthese, exportConfig, isCalculating: state.isCalculating };
}
