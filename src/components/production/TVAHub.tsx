import { useState, useMemo } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteStar } from '@/components/ui/favorite-star';
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
  Phone,
  Mail,
  StickyNote
} from 'lucide-react';
import { formatMonthYear, formatCurrency, getTVAKey, isClientActiveForMonth } from '@/lib/calculations';
import type { Client, TVAHistory } from '@/lib/database.types';
import { cn } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TVAHubProps {
  clients: Client[];
  tvaHistories: TVAHistory[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTVA: (clientId: string, field: string, value: string | number | boolean | null) => void;
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

type FilterDeadline = 'all' | 'none' | '5' | '16' | '19' | '21' | '24' | '25';

export function TVAHub({
  clients,
  tvaHistories,
  currentDate,
  onDateChange,
  onUpdateTVA
}: TVAHubProps) {
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();
  const [filterDeadline, setFilterDeadline] = useState<FilterDeadline>('all');
  const [filterRegime, setFilterRegime] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const period = getTVAKey(currentDate);

  // Get deadline info for a client
  const getDeadlineInfo = (client: Client) => {
    const day = parseInt(client.day) || 15;
    const deadlineDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return { day, daysUntil, deadlineDate };
  };

  const moveMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onDateChange(newDate);
  };

  const getClientTVA = (clientId: string): TVAHistory | undefined => {
    return tvaHistories.find(h => h.client_id === clientId && h.period === period);
  };

  // Active clients only (for TVA)
  const activeClients = useMemo(() => {
    return clients.filter(c => isClientActiveForMonth(c, currentDate));
  }, [clients, currentDate]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return activeClients
      .filter(client => {
        // Search filter
        if (search && !client.name.toLowerCase().includes(search.toLowerCase()) &&
          !client.ref.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        // Regime filter
        if (filterRegime !== 'all' && client.regime !== filterRegime) {
          return false;
        }
        // Status filter
        const tva = getClientTVA(client.id);
        const isDone = tva?.step_valide || false;
        if (filterStatus === 'done' && !isDone) return false;
        if (filterStatus === 'todo' && isDone) return false;

        // Deadline filter by day of month
        if (filterDeadline !== 'all') {
          const clientDay = parseInt(client.day) || 15;
          if (filterDeadline === 'none' && client.regime !== 'N') return false;
          if (filterDeadline !== 'none' && clientDay !== parseInt(filterDeadline)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Favorites first
        const aFav = favoriteIds.has(a.id);
        const bFav = favoriteIds.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        // Done items go last
        const tvaA = getClientTVA(a.id);
        const tvaB = getClientTVA(b.id);
        if (tvaA?.step_valide && !tvaB?.step_valide) return 1;
        if (!tvaA?.step_valide && tvaB?.step_valide) return -1;

        // Sort by deadline urgency
        const { daysUntil: daysA } = getDeadlineInfo(a);
        const { daysUntil: daysB } = getDeadlineInfo(b);
        return daysA - daysB;
      });
  }, [activeClients, search, filterRegime, filterStatus, filterDeadline, tvaHistories, period, currentDate, favoriteIds]);

  // Global progress stats
  const progressStats = useMemo(() => {
    const total = activeClients.length;
    const done = activeClients.filter(c => getClientTVA(c.id)?.step_valide).length;
    const inProgress = activeClients.filter(c => {
      const tva = getClientTVA(c.id);
      return tva && !tva.step_valide && (tva.step_compta || tva.step_saisie || tva.step_revise || tva.step_calcul || tva.step_tele);
    }).length;
    const todo = total - done - inProgress;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalAmount = activeClients.reduce((sum, c) => sum + (getClientTVA(c.id)?.amount || 0), 0);

    return { total, done, inProgress, todo, percentage, totalAmount };
  }, [activeClients, tvaHistories, period]);

  // Selected client and TVA
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const selectedTVA = useMemo(() => {
    return selectedClientId ? getClientTVA(selectedClientId) : undefined;
  }, [selectedClientId, tvaHistories, period]);

  const getStepProgress = (tva: TVAHistory | undefined) => {
    if (!tva) return 0;
    let count = 0;
    STEP_CONFIG.forEach(s => { if (tva[s.key]) count++; });
    return count;
  };

  const getStatusColor = (client: Client) => {
    const tva = getClientTVA(client.id);
    if (tva?.step_valide) return 'border-success/50 bg-success/5';
    const { daysUntil } = getDeadlineInfo(client);
    if (daysUntil < 0) return 'border-destructive/50 bg-destructive/5';
    if (daysUntil <= 2) return 'border-warning/50 bg-warning/5';
    if (daysUntil <= 7) return 'border-primary/50 bg-primary/5 dark:bg-primary/10';
    return 'border-border/50';
  };

  const getDeadlineLabel = (client: Client) => {
    const tva = getClientTVA(client.id);
    if (tva?.step_valide) return { text: 'Validé', color: 'text-success', icon: CheckCircle2 };

    const { daysUntil, day } = getDeadlineInfo(client);
    if (daysUntil < 0) return { text: `Retard J${daysUntil}`, color: 'text-destructive', icon: AlertTriangle };
    if (daysUntil <= 2) return { text: `J-${daysUntil}`, color: 'text-warning', icon: Clock };
    if (daysUntil <= 7) return { text: `J-${daysUntil}`, color: 'text-primary', icon: Clock };
    return { text: `Le ${day}`, color: 'text-muted-foreground', icon: Clock };
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header with Progress */}
      <div className="p-6 lg:p-8 border-b border-border/50 bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hub TVA 2.0</h1>
            <p className="text-muted-foreground mt-1">Pilotage des déclarations</p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-3 bg-muted rounded-2xl p-1">
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
        </div>

        {/* Global Progress Bar */}
        <div className="bento-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Progression globale</p>
                <p className="text-2xl font-bold">{progressStats.percentage}%</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">Validés:</span>
                  <span className="font-bold">{progressStats.done}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">En cours:</span>
                  <span className="font-bold">{progressStats.inProgress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">À faire:</span>
                  <span className="font-bold">{progressStats.todo}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total TVA</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(progressStats.totalAmount)}</p>
            </div>
          </div>
          <Progress value={progressStats.percentage} className="h-3" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtres:</span>
          </div>

          {/* Deadline Filter - Legal dates */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 flex-wrap">
            {[
              { value: 'all', label: 'Toutes' },
              { value: 'none', label: 'Pas de TVA' },
              { value: '5', label: 'Le 5' },
              { value: '16', label: 'Le 16' },
              { value: '19', label: 'Le 19' },
              { value: '21', label: 'Le 21' },
              { value: '24', label: 'Le 24' },
              { value: '25', label: 'Le 25' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterDeadline(opt.value as FilterDeadline)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  filterDeadline === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-premium py-2 px-4 w-auto text-sm"
          >
            <option value="all">Tous États</option>
            <option value="todo">À faire</option>
            <option value="done">Validés</option>
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input-premium py-2 pl-11 pr-4 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">Aucun dossier affiché</p>
            <p className="text-sm mt-1">Modifiez les filtres ou ajoutez des clients</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 min-w-0">
            {filteredClients.map(client => {
              const tva = getClientTVA(client.id);
              const stepProgress = getStepProgress(tva);
              const deadlineInfo = getDeadlineLabel(client);
              const DeadlineIcon = deadlineInfo.icon;

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "bento-card p-4 cursor-pointer hover:shadow-lg transition-all group",
                    getStatusColor(client)
                  )}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-1.5">
                      <FavoriteStar isFavorite={isFavorite(client.id)} onToggle={() => toggleFavorite(client.id)} />
                      <span className="badge-neutral text-xs">{client.ref}</span>
                      <span className="badge-neutral text-xs">{client.regime}</span>
                    </div>
                    <div className={cn("flex items-center gap-1 text-sm font-bold", deadlineInfo.color)}>
                      <DeadlineIcon className="w-4 h-4" />
                      {deadlineInfo.text}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {client.name}
                  </h3>

                  {/* Amount */}
                  {tva?.amount ? (
                    <p className="text-lg font-bold text-primary mb-3">
                      {formatCurrency(tva.amount)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">Montant à saisir</p>
                  )}

                  {/* Steps Progress */}
                  <div className="flex gap-1.5 mb-2">
                    {STEP_CONFIG.map((step) => (
                      <Tooltip key={step.key}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex-1 h-1.5 rounded-full transition-colors",
                              tva?.[step.key]
                                ? (step.isValidation ? "bg-success" : "bg-primary")
                                : "bg-muted"
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{step.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{stepProgress}/6 étapes</p>

                  {/* Note preview */}
                  {tva?.note && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                        <StickyNote className="w-3 h-3" />
                        {tva.note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedClientId} onOpenChange={(open) => !open && setSelectedClientId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader className="pb-6 border-b border-border">
                <div className="flex gap-2 mb-2">
                  <span className="badge-neutral">{selectedClient.ref}</span>
                  <span className="badge-success">{selectedClient.form}</span>
                  <span className="badge-neutral">{selectedClient.regime}</span>
                </div>
                <SheetTitle className="text-xl">{selectedClient.name}</SheetTitle>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                  {selectedClient.manager_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedClient.manager_email}
                    </span>
                  )}
                  {selectedClient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedClient.phone}
                    </span>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Deadline */}
                <div className="bento-card p-4">
                  <div className="flex justify-between items-center">
                    <span className="stat-label">Échéance</span>
                    {(() => {
                      const info = getDeadlineLabel(selectedClient);
                      const Icon = info.icon;
                      return (
                        <span className={cn("flex items-center gap-2 font-bold", info.color)}>
                          <Icon className="w-5 h-5" />
                          {info.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="stat-label block mb-2">Montant TVA</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={selectedTVA?.amount || ''}
                      onChange={(e) => onUpdateTVA(selectedClient.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="input-premium text-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Crédit TVA</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={selectedTVA?.credit || ''}
                      onChange={(e) => onUpdateTVA(selectedClient.id, 'credit', parseFloat(e.target.value) || 0)}
                      className="input-premium text-lg font-bold text-success"
                    />
                  </div>
                </div>

                {/* Steps Checklist */}
                <div className="space-y-3">
                  <p className="stat-label">Étapes de validation</p>
                  {STEP_CONFIG.map(step => {
                    const isChecked = selectedTVA?.[step.key] || false;
                    return (
                      <button
                        key={step.key}
                        onClick={() => onUpdateTVA(selectedClient.id, step.key, !isChecked)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          isChecked
                            ? (step.isValidation ? "bg-success/10 border-success/30" : "bg-primary/10 border-primary/30")
                            : "bg-muted/50 border-border hover:bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center",
                          isChecked ? (step.isValidation ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground") : "bg-muted"
                        )}>
                          {isChecked && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <step.icon className="w-5 h-5 text-muted-foreground" />
                        <span className={cn("font-medium", isChecked && "text-foreground")}>{step.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Notes */}
                <div>
                  <label className="stat-label block mb-2">Notes</label>
                  <textarea
                    placeholder="Ajouter des notes sur ce dossier..."
                    value={selectedTVA?.note || ''}
                    onChange={(e) => onUpdateTVA(selectedClient.id, 'note', e.target.value)}
                    className="input-premium min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
