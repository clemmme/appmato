// ============================================================================
// TNS Wizard — Fonctions de calcul pures
// ============================================================================
// Formules simplifiées pour la V1 — barèmes Urssaf 2025.
// À affiner par exercice fiscal et par caisse si besoin.

import type {
  TNSAssiette,
  TNSAcomptesData,
  TNSSynthese,
  TNSTresorerie,
  TNSVentilationLigne,
  TNSExportConfig,
  TNSEcritureLigne,
  TNSStatut,
} from './types';
import { COTISATION_LABELS } from './constants';
import { v4Fallback } from './utils';

// ─── Barèmes simplifiés (taux moyens Urssaf 2025) ──────────────────────────

const TAUX_COTISATIONS: Record<string, number> = {
  maladie: 0.065,                 // 6.50%
  retraite_base: 0.1775,          // 17.75%
  retraite_complementaire: 0.07,  // 7.00%
  invalidite_deces: 0.013,        // 1.30%
  allocations_familiales: 0.0310, // 3.10%
  csg_deductible: 0.068,          // 6.80%
  csg_non_deductible: 0.024,      // 2.40%
  crds: 0.005,                    // 0.50%
  formation_professionnelle: 0.0025, // 0.25%
};

// ─── Calcul de l'assiette de cotisation ─────────────────────────────────────

export function calculerAssietteCotisation(assiette: TNSAssiette): number {
  const cotisOblig = assiette.cotisationsObligatoiresManuel
    ? assiette.cotisationsObligatoiresForce
    : assiette.cotisationsObligatoires;

  const base =
    assiette.remunerationNette
    + assiette.avantagesNature
    + assiette.dividendesSuperieur10
    + cotisOblig; // Reconstitution de l'assiette brute

  return Math.max(0, base);
}

// ─── Calcul de la ventilation ───────────────────────────────────────────────

export function calculerVentilation(
  assietteBrute: number,
  _statut: TNSStatut | null
): TNSVentilationLigne[] {
  if (assietteBrute <= 0) return [];

  const lignes: TNSVentilationLigne[] = [];
  let totalCalcule = 0;

  for (const [type, taux] of Object.entries(TAUX_COTISATIONS)) {
    const montant = Math.round(assietteBrute * taux * 100) / 100;
    totalCalcule += montant;

    const config = COTISATION_LABELS[type as keyof typeof COTISATION_LABELS];
    lignes.push({
      type: type as TNSVentilationLigne['type'],
      label: config.label,
      montant,
      pourcentage: 0, // Sera recalculé après
      deductible: config.deductible,
      alerteFiscale: config.alerteFiscale,
    });
  }

  // Recalculer les pourcentages
  for (const ligne of lignes) {
    ligne.pourcentage = totalCalcule > 0
      ? Math.round((ligne.montant / totalCalcule) * 10000) / 100
      : 0;
  }

  return lignes;
}

// ─── Calcul de la synthèse complète ─────────────────────────────────────────

export function calculerSynthese(
  assiette: TNSAssiette,
  acomptes: TNSAcomptesData,
  statut: TNSStatut | null
): TNSSynthese {
  const assietteBrute = calculerAssietteCotisation(assiette);
  const ventilation = calculerVentilation(assietteBrute, statut);
  const totalCotisations = ventilation.reduce((sum, l) => sum + l.montant, 0);

  const tresorerie: TNSTresorerie = {
    totalPaye: acomptes.totalBrut,
    totalDu: totalCotisations,
    solde: Math.round((totalCotisations - acomptes.totalBrut) * 100) / 100,
    verdict:
      totalCotisations - acomptes.totalBrut > 0.01 ? 'dette' :
      totalCotisations - acomptes.totalBrut < -0.01 ? 'creance' :
      'neutre',
  };

  const cotisOblig = assiette.cotisationsObligatoiresManuel
    ? assiette.cotisationsObligatoiresForce
    : assiette.cotisationsObligatoires;

  const baseCalcul = [
    { label: 'Rémunération nette', montant: assiette.remunerationNette },
    { label: 'Avantages en nature', montant: assiette.avantagesNature },
    { label: 'Dividendes > 10%', montant: assiette.dividendesSuperieur10 },
    { label: 'Cotisations obligatoires reconstituées', montant: cotisOblig },
    { label: 'Assiette brute de cotisation', montant: assietteBrute },
  ];

  if (assiette.contratMadelin) {
    baseCalcul.push({ label: 'Contrat Madelin (info)', montant: assiette.montantMadelin });
  }
  if (assiette.contratPER) {
    baseCalcul.push({ label: 'PER (info)', montant: assiette.montantPER });
  }

  return {
    tresorerie,
    ventilation,
    totalCotisations: Math.round(totalCotisations * 100) / 100,
    baseCalcul,
  };
}

// ─── Génération des écritures comptables ────────────────────────────────────

export function genererEcritures(
  synthese: TNSSynthese,
  exercice: number
): TNSExportConfig {
  const dateEcriture = `${exercice}-12-31`;
  const lignes: TNSEcritureLigne[] = [];
  const solde = synthese.tresorerie.solde;

  // Groupement des charges
  const groupes = {
    urssaf_tns: { compte: '646100', libelle: `Cotisations Urssaf TNS ${exercice}`, montant: 0 },
    contrib_pro: { compte: '633300', libelle: `Contribution formation pro. ${exercice}`, montant: 0 },
    csg_deductible: { compte: '637810', libelle: `CSG déductible ${exercice}`, montant: 0 },
    csg_non_deductible: { compte: '108000', libelle: `CSG/CRDS non déductible ${exercice}`, montant: 0 },
  };

  let totalRegulRepartie = 0;

  for (const v of synthese.ventilation) {
    if (v.montant === 0) continue;

    const montantRegul = Math.round((v.montant * Math.abs(solde) / synthese.totalCotisations) * 100) / 100;
    totalRegulRepartie += montantRegul;

    if (v.type === 'formation_professionnelle') {
      groupes.contrib_pro.montant += montantRegul;
    } else if (v.type === 'csg_deductible') {
      groupes.csg_deductible.montant += montantRegul;
    } else if (v.type === 'csg_non_deductible' || v.type === 'crds') {
      groupes.csg_non_deductible.montant += montantRegul;
    } else {
      groupes.urssaf_tns.montant += montantRegul;
    }
  }

  // Ajustement de l'arrondi sur Urssaf TNS
  const differenceArrondi = Math.abs(solde) - totalRegulRepartie;
  if (Math.abs(differenceArrondi) > 0.001) {
    groupes.urssaf_tns.montant += differenceArrondi;
    groupes.urssaf_tns.montant = Math.round(groupes.urssaf_tns.montant * 100) / 100;
  }

  for (const [key, groupe] of Object.entries(groupes)) {
    if (groupe.montant > 0) {
      lignes.push({
        id: v4Fallback(),
        compte: groupe.compte,
        libelle: groupe.libelle,
        debit: solde > 0 ? groupe.montant : 0,
        credit: solde < 0 ? groupe.montant : 0,
        editable: true,
      });
    }
  }

  // Contrepartie
  const totalDebit = lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lignes.reduce((s, l) => s + l.credit, 0);

  if (solde > 0) {
    // DETTE → Charge à payer (crédit 438600)
    lignes.push({
      id: v4Fallback(),
      compte: '438600',
      libelle: `Charges sociales TNS à payer ${exercice}`,
      debit: 0,
      credit: Math.round(totalDebit * 100) / 100,
      editable: false,
    });
  } else if (solde < 0) {
    // CRÉANCE → Produit à recevoir (débit 438700)
    lignes.push({
      id: v4Fallback(),
      compte: '438700',
      libelle: `Charges sociales TNS à recevoir ${exercice}`,
      debit: Math.round(totalCredit * 100) / 100,
      credit: 0,
      editable: false,
    });
  }

  // Vérification équilibre
  const finalDebit = lignes.reduce((s, l) => s + l.debit, 0);
  const finalCredit = lignes.reduce((s, l) => s + l.credit, 0);

  return {
    journal: 'OD',
    dateEcriture,
    lignes,
    equilibre: Math.abs(finalDebit - finalCredit) < 0.01,
  };
}
