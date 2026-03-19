/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Building2,
  FileEdit,
  CheckSquare,
  Calculator as CalcIcon,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthYear, formatCurrency, getTVAKey, isClientActiveForMonth, getTVAStatus } from '@/lib/calculations';
import type { Client, TVAHistory } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TVAViewProps {
  clients: Client[];
  tvaHistories: TVAHistory[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTVA: (clientId: string, field: string, value: any) => void;
}

// Step icons with tooltips
const STEP_CONFIG: { key: 'step_compta' | 'step_saisie' | 'step_revise' | 'step_calcul' | 'step_tele' | 'step_valide'; icon: React.ElementType; label: string; isValidation?: boolean }[] = [
  { key: 'step_compta', icon: Building2, label: 'Comptabilité reçue' },
  { key: 'step_saisie', icon: FileEdit, label: 'Saisie effectuée' },
  { key: 'step_revise', icon: CheckSquare, label: 'Révisé' },
  { key: 'step_calcul', icon: CalcIcon, label: 'Calcul TVA' },
  { key: 'step_tele', icon: Send, label: 'Télétransmis' },
  { key: 'step_valide', icon: CheckCircle2, label: 'Validé', isValidation: true },
];

export function TVAView({
  clients,
  tvaHistories,
  currentDate,
  onDateChange,
  onUpdateTVA
}: TVAViewProps) {
  const [filterRegime, setFilterRegime] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterForm, setFilterForm] = useState('all');
  const [search, setSearch] = useState('');

  const period = getTVAKey(currentDate);

  // Get deadline day for current period
  const getDeadlineInfo = useCallback((client: Client) => {
    const day = parseInt(client.day) || 15;
    const deadlineDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { day, daysUntil, deadlineDate };
  }, [currentDate]);

  const moveMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onDateChange(newDate);
  };

  const getClientTVA = useCallback((clientId: string): TVAHistory | undefined => {
    return tvaHistories.find(h => h.client_id === clientId && h.period === period);
  }, [tvaHistories, period]);

  // Get unique forms for filter
  const uniqueForms = useMemo(() => {
    const forms = new Set(clients.map(c => c.form).filter(Boolean));
    return Array.from(forms).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients
      .filter(client => {
        if (search && !client.name.toLowerCase().includes(search.toLowerCase()) &&
          !client.ref.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (filterRegime !== 'all' && client.regime !== filterRegime) {
          return false;
        }
        if (filterForm !== 'all' && client.form !== filterForm) {
          return false;
        }
        const tva = getClientTVA(client.id);
        const isDone = tva?.step_valide || false;
        if (filterStatus === 'done' && !isDone) return false;
        if (filterStatus === 'todo' && isDone) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, search, filterRegime, filterStatus, filterForm, getClientTVA]);

  const totalToPay = useMemo(() => {
    return filteredClients.reduce((sum, client) => {
      if (isClientActiveForMonth(client, currentDate)) {
        const tva = getClientTVA(client.id);
        return sum + (tva?.amount || 0);
      }
      return sum;
    }, 0);
  }, [filteredClients, currentDate, getClientTVA]);

  const getStatusBadge = (client: Client, active: boolean) => {
    if (!active) return <span className="badge-neutral">N/A</span>;
    const tva = getClientTVA(client.id);
    const status = getTVAStatus(tva || null, active);

    if (status === 'done') return <span className="badge-success">Validé</span>;
    if (status === 'progress') return <span className="badge-warning">En cours</span>;
    return <span className="badge-danger">À faire</span>;
  };

  const getDeadlineIndicator = (client: Client, active: boolean) => {
    if (!active) return null;
    const tva = getClientTVA(client.id);
    if (tva?.step_valide) return null;

    const { day, daysUntil } = getDeadlineInfo(client);

    if (daysUntil < 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">J{daysUntil}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Échéance dépassée de {Math.abs(daysUntil)} jours</TooltipContent>
        </Tooltip>
      );
    }

    if (daysUntil <= 5) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">J-{daysUntil}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Échéance dans {daysUntil} jours (le {day})</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">Le {day}</span>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-border/50 bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex justify-between items-center w-full lg:w-auto gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Pilotage TVA</h1>
              <p className="text-muted-foreground mt-1">Gestion mensuelle des déclarations</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 rounded-xl lg:hidden">
              <Printer className="w-4 h-4" /> PDF
            </Button>
          </div>

          {/* Period Selector & Print */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 bg-muted rounded-2xl p-1 flex-1 lg:flex-none justify-center">
              <button
                onClick={() => moveMonth(-1)}
                className="p-2 hover:bg-card rounded-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold w-36 text-center">
                {formatMonthYear(currentDate)}
              </span>
              <button
                onClick={() => moveMonth(1)}
                className="p-2 hover:bg-card rounded-xl transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 rounded-xl hidden lg:flex">
              <Printer className="w-4 h-4" /> Exporter PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-6 items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtres:</span>
          </div>

          <select
            value={filterRegime}
            onChange={(e) => setFilterRegime(e.target.value)}
            className="input-premium py-2 px-4 w-auto text-sm"
          >
            <option value="all">Tous Régimes</option>
            <option value="M">Mensuel</option>
            <option value="T">Trimestriel</option>
            <option value="A">Annuel</option>
          </select>

          <select
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value)}
            className="input-premium py-2 px-4 w-auto text-sm"
          >
            <option value="all">Toutes Formes</option>
            {uniqueForms.map(form => (
              <option key={form} value={form}>{form}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-premium py-2 px-4 w-auto text-sm"
          >
            <option value="all">Tous États</option>
            <option value="todo">À faire</option>
            <option value="done">Validés</option>
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input-premium py-2 pl-11 pr-4 text-sm"
            />
          </div>

          <div className="ml-auto bento-card py-2 px-4">
            <span className="text-sm font-medium text-muted-foreground">Total: </span>
            <span className="font-bold text-primary">{formatCurrency(totalToPay)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="table-premium min-w-[1200px]">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="w-20">Ref</th>
              <th className="w-48">Client</th>
              <th className="w-20 text-center">Régime</th>
              <th className="w-20 text-center">Échéance</th>
              <th className="w-24 text-center">État</th>
              <th className="w-28 text-right">À Payer</th>
              <th className="w-28 text-right">Crédit</th>
              {STEP_CONFIG.map(step => (
                <th
                  key={step.key}
                  className={cn(
                    "w-12 text-center",
                    step.isValidation && 'bg-success/10'
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center cursor-help">
                        <step.icon className="w-4 h-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{step.label}</TooltipContent>
                  </Tooltip>
                </th>
              ))}
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => {
              const active = isClientActiveForMonth(client, currentDate);
              const tva = getClientTVA(client.id);
              const isDone = tva?.step_valide || false;
              const isInProgress = tva && (
                tva.step_compta || tva.step_saisie || tva.step_revise ||
                tva.step_calcul || tva.step_tele
              );

              return (
                <tr
                  key={client.id}
                  className={cn(
                    active
                      ? (isDone ? 'bg-success/5' : (isInProgress ? 'bg-warning/5' : ''))
                      : 'opacity-50 bg-muted/50'
                  )}
                >
                  <td className="font-mono text-xs text-muted-foreground">{client.ref}</td>
                  <td className="font-semibold truncate max-w-[180px]" title={client.name}>
                    {client.name}
                  </td>
                  <td className="text-center">
                    <span className="badge-neutral">{client.regime}</span>
                  </td>
                  <td className="text-center">
                    {getDeadlineIndicator(client, active)}
                  </td>
                  <td className="text-center">{getStatusBadge(client, active)}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      className="w-full text-right bg-transparent outline-none font-mono font-semibold focus:bg-muted/50 rounded px-2 py-1"
                      placeholder="-"
                      value={tva?.amount || ''}
                      disabled={!active}
                      onChange={(e) => onUpdateTVA(client.id, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      className="w-full text-right bg-transparent outline-none font-mono font-semibold text-success focus:bg-muted/50 rounded px-2 py-1"
                      placeholder="-"
                      value={tva?.credit || ''}
                      disabled={!active}
                      onChange={(e) => onUpdateTVA(client.id, 'credit', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  {STEP_CONFIG.map((step) => (
                    <td key={step.key} className={cn("text-center", step.isValidation && 'bg-success/10')}>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg accent-primary cursor-pointer disabled:cursor-not-allowed"
                        checked={tva?.[step.key] || false}
                        disabled={!active}
                        onChange={() => onUpdateTVA(client.id, step.key, !(tva?.[step.key] || false))}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      className="w-full bg-transparent outline-none text-sm focus:bg-muted/50 rounded px-2 py-1"
                      placeholder="..."
                      value={tva?.note || ''}
                      disabled={!active}
                      onChange={(e) => onUpdateTVA(client.id, 'note', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Aucun dossier affiché</p>
            <p className="text-sm mt-1">Ajoutez des clients via la Base Clients</p>
          </div>
        )}
      </div>
    </div>
  );
}
