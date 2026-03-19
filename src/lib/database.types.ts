// APPMATO Database Types
// These types represent the database schema

export type RegimeType = 'M' | 'T' | 'A' | 'N';
export type ItemStatus = 'ask' | 'done' | 'na';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  ref: string;
  form: string;
  name: string;
  regime: RegimeType;
  day: string;
  siren?: string;
  code_ape?: string;
  closing_date?: string;
  annual_fee?: number;
  // CRM fields
  manager_email?: string;
  phone?: string;
  address?: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  // Billing section
  fee_compta?: number;
  fee_social?: number;
  fee_juridique?: number;
  // Volume metrics
  invoices_per_month?: number;
  entries_count?: number;
  establishments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TVAHistory {
  id: string;
  client_id: string;
  period: string; // YYYY-MM
  amount: number;
  credit: number;
  step_compta: boolean;
  step_saisie: boolean;
  step_revise: boolean;
  step_calcul: boolean;
  step_tele: boolean;
  step_valide: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface BilanCycle {
  id: string;
  client_id: string;
  cycle_id: string;
  revision_level: number;
  items: Record<string, ItemStatus>;
  notes?: string;
  critical_points?: string[];
  rdv_chef_date?: string;
  supervision_mode?: boolean;
  supervision_status?: 'waiting' | 'scheduled' | 'validated';
  created_at: string;
  updated_at: string;
}

export interface CtrlEntry {
  id: string;
  user_id: string;
  period: string; // YYYY-MM
  solde_start: number;
  solde_end: number;
  ca_20: number;
  ca_10: number;
  ca_55: number;
  ca_0: number;
  tva_declared: number;
  created_at: string;
  updated_at: string;
}

// Cycle definitions (constants)
export interface CycleDef {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

export const CYCLES: CycleDef[] = [
  {
    id: 'treso',
    label: 'Trésorerie / Finances',
    icon: 'Landmark',
    items: ['Relevés bancaires N (PDF)', 'Relevé LCR / Agios', 'Brouillard de caisse', 'Tableaux d\'emprunts', 'Contrats de leasing']
  },
  {
    id: 'achats',
    label: 'Achats / Fournisseurs',
    icon: 'ShoppingCart',
    items: ['Factures d\'achats manquantes', 'Relevés fournisseurs', 'Justificatifs notes de frais', 'Factures non parvenues (FNP)']
  },
  {
    id: 'charges',
    label: 'Charges Externes',
    icon: 'FileText',
    items: ['Quittances de loyer', 'Assurances (Quittances)', 'Honoraires (Avocats/Experts)', 'Contrats de maintenance']
  },
  {
    id: 'stocks',
    label: 'Stocks & En-cours',
    icon: 'Package',
    items: ['Inventaire valorisé (Détail)', 'Attestation de stock signée', 'État des travaux en cours']
  },
  {
    id: 'immo',
    label: 'Immobilisations',
    icon: 'Monitor',
    items: ['Factures immo > 500€', 'Cessions / Mises au rebut']
  },
  {
    id: 'perso',
    label: 'Personnel',
    icon: 'Users',
    items: ['Livre de paie annuel', 'État des congés payés', 'Charges sociales (Bordereaux)', 'Taxe sur les salaires']
  },
  {
    id: 'etat',
    label: 'État & Fiscal',
    icon: 'Flag',
    items: ['TVA (Déclarations CA3/CA12)', 'CFE / CVAE', 'IS (Acomptes)']
  },
  {
    id: 'capitaux',
    label: 'Capitaux',
    icon: 'Briefcase',
    items: ['PV d\'Assemblée Générale N-1', 'Statuts (si modifs)', 'Comptes courants d\'associés']
  },
  {
    id: 'divers',
    label: 'Divers',
    icon: 'MoreHorizontal',
    items: ['Juridique divers', 'Litiges en cours']
  }
];

export const REVISION_LABELS = ['Non commencé', 'En cours', 'Saisi', 'Révisé', 'Finalisé'];

export const SUPERVISION_LABELS = {
  waiting: 'En attente de RDV',
  scheduled: 'RDV Planifié',
  validated: 'Validé/Clôturé'
};

// ============================================================================
// CHAT MODULE TYPES
// ============================================================================

export interface ChatChannel {
  id: string;
  organization_id: string;
  name: string | null;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  channel_id: string;
  user_id: string;
  last_read_at: string | null;
  joined_at: string;
  // Included via Join
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  mentions: string[]; // UUID array
  created_at: string;
  updated_at: string;
  // Included via Join
  profile?: Profile;
}

// ============================================
// PULSE FEED & NOTIFICATIONS TYPES
// ============================================

export interface PulsePost {
  id: string;
  author_id: string;
  organization_id: string;
  content: string;
  media_url?: string | null;
  created_at: string;
  updated_at: string;
  // Included via Join
  author?: Profile;
  likes_count?: number;
  comments_count?: number;
  is_liked_by_me?: boolean;
}

export interface PulseComment {
  id: string;
  post_id: string;
  author_id: string;
  organization_id: string;
  content: string;
  created_at: string;
  // Included via Join
  author?: Profile;
}

export interface PulseLike {
  id: string;
  post_id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  organization_id: string;
  type: 'post_like' | 'post_comment' | 'new_post' | 'chat_message' | 'mention';
  entity_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  // Included via Join
  actor?: Profile;
}

