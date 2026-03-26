// ============================================================================
// TNS Wizard — Schémas de validation Zod
// ============================================================================

import { z } from 'zod';

// ─── Step 1 : Profil ────────────────────────────────────────────────────────

export const profilSchema = z.object({
  statut: z.enum([
    'gerant_sarl',
    'artisan',
    'commercant',
    'liberal_cipav',
    'liberal_urssaf',
  ], { required_error: 'Veuillez sélectionner un statut TNS' }),
  dateDebutActivite: z.string().min(1, 'La date de début est requise'),
  exerciceFiscal: z.number()
    .int()
    .min(2000, 'Exercice invalide')
    .max(2100, 'Exercice invalide'),
  conjointCollaborateur: z.boolean(),
  assietteConjoint: z.enum(['tiers', 'moitie']).nullable(),
}).refine(
  (data) => !data.conjointCollaborateur || data.assietteConjoint !== null,
  { message: 'Veuillez sélectionner l\'assiette du conjoint', path: ['assietteConjoint'] }
);

// ─── Step 2 : Acomptes ─────────────────────────────────────────────────────

export const acompteSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  montant: z.number()
    .min(0, 'Le montant doit être positif')
    .max(10_000_000, 'Montant trop élevé'),
  libelle: z.string().min(1, 'Le libellé est requis'),
});

export const acomptesDataSchema = z.object({
  regularisationN1: z.array(z.any()),
  provisionsN: z.array(z.any()),
  totalRegularisation: z.number(),
  totalProvisions: z.number(),
  totalBrut: z.number(),
});

// ─── Step 3 : Assiette ─────────────────────────────────────────────────────

export const assietteSchema = z.object({
  remunerationNette: z.number().min(0, 'La rémunération doit être positive ou nulle'),
  avantagesNature: z.number().min(0, 'Montant invalide'),
  dividendesSuperieur10: z.number().min(0, 'Montant invalide'),
  cotisationsObligatoires: z.number().min(0),
  cotisationsObligatoiresManuel: z.boolean(),
  cotisationsObligatoiresForce: z.number().min(0),
  contratMadelin: z.boolean(),
  montantMadelin: z.number().min(0, 'Montant invalide'),
  contratPER: z.boolean(),
  montantPER: z.number().min(0, 'Montant invalide'),
}).refine(
  (data) => !data.contratMadelin || data.montantMadelin > 0,
  { message: 'Montant Madelin requis si le contrat est activé', path: ['montantMadelin'] }
).refine(
  (data) => !data.contratPER || data.montantPER > 0,
  { message: 'Montant PER requis si le contrat est activé', path: ['montantPER'] }
);

// ─── Step 5 : Export ────────────────────────────────────────────────────────

export const exportConfigSchema = z.object({
  journal: z.string().min(1, 'Le journal est requis'),
  dateEcriture: z.string().min(1, 'La date d\'écriture est requise'),
});

// ─── Types inférés ──────────────────────────────────────────────────────────

export type ProfilFormData = z.infer<typeof profilSchema>;
export type AcompteFormData = z.infer<typeof acompteSchema>;
export type AssietteFormData = z.infer<typeof assietteSchema>;
export type ExportConfigFormData = z.infer<typeof exportConfigSchema>;
