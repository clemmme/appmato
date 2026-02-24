// APPMATO Calculation Functions

import type { Client, TVAHistory, BilanCycle, CtrlEntry } from './database.types';
import { CYCLES } from './database.types';

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

export function formatMonthYear(date: Date): string {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const [y, m] = dateStr.split('-');
  const months = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TVA CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getTVAKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isClientActiveForMonth(client: Client, date: Date): boolean {
  const monthNum = date.getMonth() + 1;
  if (client.regime === 'N') return false;
  if (client.regime === 'M') return true;
  if (client.regime === 'T') return [1, 4, 7, 10].includes(monthNum);
  if (client.regime === 'A') return monthNum === 5;
  return false;
}

export function getTVAStatus(tvaHistory: TVAHistory | null, isActive: boolean): 'na' | 'done' | 'progress' | 'todo' {
  if (!isActive) return 'na';
  if (!tvaHistory) return 'todo';
  if (tvaHistory.step_valide) return 'done';
  if (tvaHistory.step_compta || tvaHistory.step_saisie || tvaHistory.step_revise ||
    tvaHistory.step_calcul || tvaHistory.step_tele) return 'progress';
  return 'todo';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILAN CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateBilanProgress(bilanCycles: BilanCycle[]): number {
  if (!bilanCycles || bilanCycles.length === 0) return 0;

  const max = CYCLES.length * 4;

  // Ne garder que le PREMIER enregistrement par cycle_id.
  // C'est cohérent avec .find() utilisé dans Bilan.tsx pour les mises à jour :
  // .find() retourne toujours le premier match, donc c'est lui qui a la bonne valeur.
  const uniqueCycles = new Map<string, number>();
  bilanCycles.forEach(cycle => {
    if (!uniqueCycles.has(cycle.cycle_id)) {
      uniqueCycles.set(cycle.cycle_id, cycle.revision_level || 0);
    }
  });

  let total = 0;
  uniqueCycles.forEach(level => {
    total += level;
  });

  return Math.min(100, Math.round((total / max) * 100));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CADRAGE TVA CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CtrlLineCalc {
  totalHT: number;
  totalTvaFacturee: number;
  totalTTC: number;
  encaissementsTheoTTC: number;
  tvaTheorique: number;
  ecart: number;
}

export function calculateCtrlLine(entry: CtrlEntry): CtrlLineCalc {
  const ca20 = entry.ca_20 || 0;
  const ca10 = entry.ca_10 || 0;
  const ca55 = entry.ca_55 || 0;
  const ca0 = entry.ca_0 || 0;

  const tva20 = ca20 * 0.20;
  const tva10 = ca10 * 0.10;
  const tva55 = ca55 * 0.055;

  const totalHT = ca20 + ca10 + ca55 + ca0;
  const totalTvaFacturee = tva20 + tva10 + tva55;
  const totalTTC = totalHT + totalTvaFacturee;

  const soldeStart = entry.solde_start || 0;
  const soldeEnd = entry.solde_end || 0;
  const encaissementsTheoTTC = (soldeStart + totalTTC) - soldeEnd;

  let ratioTva = 0;
  if (totalTTC > 0) {
    ratioTva = totalTvaFacturee / totalTTC;
  }

  const tvaTheorique = encaissementsTheoTTC * ratioTva;
  const declared = entry.tva_declared || 0;
  const ecart = tvaTheorique - declared;

  return { totalHT, totalTvaFacturee, totalTTC, encaissementsTheoTTC, tvaTheorique, ecart };
}

export interface CtrlTotals {
  sumDeclared: number;
  sumTheoretical: number;
  sumDiff: number;
}

export function calculateCtrlTotals(entries: CtrlEntry[]): CtrlTotals {
  let sumDeclared = 0;
  let sumTheoretical = 0;
  let sumDiff = 0;

  entries.forEach(entry => {
    const calc = calculateCtrlLine(entry);
    sumDeclared += entry.tva_declared || 0;
    sumTheoretical += calc.tvaTheorique;
    sumDiff += calc.ecart;
  });

  return { sumDeclared, sumTheoretical, sumDiff };
}

export function getDiffSeverity(diff: number): 'ok' | 'warn' | 'danger' {
  const absDiff = Math.abs(diff);
  if (absDiff < 2) return 'ok';
  if (absDiff < 50) return 'warn';
  return 'danger';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD KPIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DashboardKPIs {
  totalClients: number;
  tvaTotal: number;
  tvaDone: number;
  tvaActive: number;
  avgBilanProgress: number;
  // Extended KPIs for Dashboard
  tvaToDoCount: number;
  tvaCompleteCount: number;
  tvaLateCount: number;
  bilanProgressAvg: number;
  bilanCompleteCount: number;
}

export function calculateDashboardKPIs(
  clients: Client[],
  tvaHistories: TVAHistory[],
  bilanCyclesMap: Map<string, BilanCycle[]>,
  currentDate: Date
): DashboardKPIs {
  const totalClients = clients.length;
  const period = getTVAKey(currentDate);

  let tvaTotal = 0;
  let tvaDone = 0;
  let tvaActive = 0;
  let bilanProgressSum = 0;
  let bilanComplete = 0;

  // Calculate day of month for late detection
  const currentDay = new Date().getDate();
  let tvaLate = 0;

  clients.forEach(client => {
    if (isClientActiveForMonth(client, currentDate)) {
      tvaActive++;
      const history = tvaHistories.find(h => h.client_id === client.id && h.period === period);
      if (history) {
        tvaTotal += history.amount || 0;
        if (history.step_valide) tvaDone++;
      } else if (currentDay > parseInt(client.day || '15')) {
        // Consider late if past due day and no history
        tvaLate++;
      }
    }

    const cycles = bilanCyclesMap.get(client.id) || [];
    const progress = calculateBilanProgress(cycles);
    bilanProgressSum += progress;
    if (progress === 100) bilanComplete++;
  });

  const avgBilanProgress = totalClients ? Math.round(bilanProgressSum / totalClients) : 0;

  return {
    totalClients,
    tvaTotal,
    tvaDone,
    tvaActive,
    avgBilanProgress,
    // Extended KPIs
    tvaToDoCount: tvaActive - tvaDone,
    tvaCompleteCount: tvaDone,
    tvaLateCount: tvaLate,
    bilanProgressAvg: avgBilanProgress,
    bilanCompleteCount: bilanComplete
  };
}
