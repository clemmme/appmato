/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Search, FolderOpen, Landmark, ShoppingCart, FileText, Package, Monitor, Users, Flag, Briefcase, MoreHorizontal, MessageSquare, Eye, Printer } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { calculateBilanProgress } from '@/lib/calculations';
import { CYCLES, REVISION_LABELS } from '@/lib/database.types';
import type { Client, BilanCycle, ItemStatus } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SupervisionForm, type SupervisionData } from './SupervisionForm';

const iconMap: Record<string, React.ReactNode> = {
  Landmark: <Landmark className="w-5 h-5" />,
  ShoppingCart: <ShoppingCart className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  Monitor: <Monitor className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Flag: <Flag className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  MoreHorizontal: <MoreHorizontal className="w-5 h-5" />,
};

interface ProgressCircleProps {
  progress: number;
}

function ProgressCircle({ progress }: ProgressCircleProps) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90">
        <circle
          className="text-muted"
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
        <circle
          className={progress === 100 ? "text-success" : "text-primary"}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {progress}%
      </span>
    </div>
  );
}

interface BilanViewProps {
  clients: Client[];
  bilanCyclesMap: Map<string, BilanCycle[]>;
  onUpdateRevision: (clientId: string, cycleId: string, level: number) => void;
  onUpdateItem: (clientId: string, cycleId: string, itemIndex: number, status: ItemStatus) => void;
  onUpdateNotes?: (clientId: string, cycleId: string, notes: string) => void;
  onToggleSupervision?: (clientId: string, cycleId: string, mode: boolean) => void;
  onUpdateRdvChef?: (clientId: string, cycleId: string, date: string | null) => void;
  onUpdateCriticalPoints?: (clientId: string, cycleId: string, points: string[]) => void;
  onSaveSupervision?: (clientId: string, data: SupervisionData) => void;
  onCreateCalendarEvent?: (clientId: string, date: string, clientName: string, guestId?: string) => void;
}

export function BilanView({
  clients,
  bilanCyclesMap,
  onUpdateRevision,
  onUpdateItem,
  onUpdateNotes,
  onToggleSupervision,
  onUpdateRdvChef,
  onUpdateCriticalPoints,
  onSaveSupervision,
  onCreateCalendarEvent
}: BilanViewProps) {
  const { isFavorite, toggleFavorite, sortWithFavorites } = useFavorites();
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sliderLabels, setSliderLabels] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showSupervisionMode, setShowSupervisionMode] = useState(false);

  const filteredClients = useMemo(() => {
    const searched = clients
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase()));
    return sortWithFavorites(searched);
  }, [clients, search, sortWithFavorites]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const getClientProgress = (clientId: string) => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    return calculateBilanProgress(cycles);
  };

  const getCycleData = (clientId: string, cycleId: string): BilanCycle | undefined => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    return cycles.find(c => c.cycle_id === cycleId);
  };

  const handleSliderInput = (cycleId: string, value: string) => {
    const level = parseInt(value);
    setSliderLabels(prev => ({ ...prev, [cycleId]: REVISION_LABELS[level] }));
  };

  const handleSliderChange = (clientId: string, cycleId: string, value: string) => {
    const level = parseInt(value);
    onUpdateRevision(clientId, cycleId, level);
  };

  const toggleNotes = (cycleId: string) => {
    setExpandedNotes(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  };

  const isFullyRevised = (clientId: string) => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    if (cycles.length === 0) return false;
    return calculateBilanProgress(cycles) > 80;
  };

  const handleEnterSupervision = (clientId: string) => {
    // Mark all cycles as in supervision
    const cycles = bilanCyclesMap.get(clientId) || [];
    cycles.forEach(c => {
      if (onToggleSupervision) {
        onToggleSupervision(clientId, c.cycle_id, true);
      }
    });
    setShowSupervisionMode(true);
  };

  return (
    <div className="h-full flex animate-fade-in">
      {/* Client List Sidebar */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-card">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-xl font-bold mb-4">Révision</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="input-premium pl-11 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredClients.map(client => {
            const progress = getClientProgress(client.id);
            const fullyRevised = isFullyRevised(client.id);
            return (
              <button
                key={client.id}
                onClick={() => { setSelectedClientId(client.id); setShowSupervisionMode(false); }}
                className={cn(
                  "w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between",
                  "hover:bg-muted border border-transparent hover:border-border",
                  selectedClientId === client.id && "bg-muted border-border",
                  fullyRevised && "ring-2 ring-success/30"
                )}
              >
                <div className="truncate flex-1 mr-3">
                  <div className="font-semibold truncate flex items-center gap-1">
                    <FavoriteStar isFavorite={isFavorite(client.id)} onToggle={() => toggleFavorite(client.id)} />
                    {client.name}
                    {fullyRevised && <Eye className="w-4 h-4 text-success" />}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <span>{client.ref}</span>
                    <span className="badge-neutral">{client.form}</span>
                  </div>
                </div>
                <ProgressCircle progress={progress} />
              </button>
            );
          })}
          {filteredClients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun client</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background overflow-y-auto">
        {!selectedClient ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FolderOpen className="w-20 h-20 mb-4 opacity-30" />
            <p className="text-lg font-medium">Sélectionnez un client</p>
            <p className="text-sm mt-1">pour voir le détail des cycles de révision</p>
          </div>
        ) : showSupervisionMode ? (
          // SUPERVISION MODE - Using SupervisionForm
          <SupervisionForm
            client={selectedClient}
            bilanCycles={bilanCyclesMap.get(selectedClient.id) || []}
            onClose={() => setShowSupervisionMode(false)}
            onSave={(data) => {
              if (onSaveSupervision) {
                onSaveSupervision(selectedClient.id, data);
              }
              // Also update RDV and critical points via existing handlers
              if (data.rdvChefDate && onUpdateRdvChef) {
                const cycles = bilanCyclesMap.get(selectedClient.id) || [];
                const firstCycle = cycles[0];
                if (firstCycle) {
                  onUpdateRdvChef(selectedClient.id, firstCycle.cycle_id, data.rdvChefDate);
                }
              }
              if (data.criticalPoints.length > 0 && onUpdateCriticalPoints) {
                const cycles = bilanCyclesMap.get(selectedClient.id) || [];
                const firstCycle = cycles[0];
                if (firstCycle) {
                  onUpdateCriticalPoints(selectedClient.id, firstCycle.cycle_id, data.criticalPoints);
                }
              }
              setShowSupervisionMode(false);
            }}
            onCreateCalendarEvent={(clientId, date, clientName, guestId) => {
              if (onCreateCalendarEvent) {
                onCreateCalendarEvent(clientId, date, clientName, guestId);
              }
            }}
          />
        ) : (
          // REVISION MODE
          <div className="p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Client Header */}
            <div className="bento-card mb-8 sticky top-0 z-10 bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="badge-neutral">{selectedClient.ref}</span>
                    <span className="badge-success">{selectedClient.form}</span>
                  </div>
                  <h2 className="text-2xl font-bold mt-2">{selectedClient.name}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={() => window.print()} className="gap-2 rounded-xl">
                    <Printer className="w-4 h-4" /> Synthèse PDF
                  </Button>
                  {/* Supervision Button */}
                  {isFullyRevised(selectedClient.id) && onToggleSupervision && (
                    <Button
                      onClick={() => handleEnterSupervision(selectedClient.id)}
                      className="gap-2 bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl"
                    >
                      <Eye className="w-4 h-4" />
                      Envoyer en Supervision
                    </Button>
                  )}
                  <div className="text-right">
                    <p className="stat-label mb-1">Avancement</p>
                    <div className="text-4xl font-bold">
                      {getClientProgress(selectedClient.id)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="progress-bar mt-4">
                <div
                  className={getClientProgress(selectedClient.id) === 100 ? 'progress-bar-success' : 'progress-bar-fill'}
                  style={{ width: `${getClientProgress(selectedClient.id)}%` }}
                />
              </div>

              {!isFullyRevised(selectedClient.id) && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Le bouton "Envoyer en Supervision" sera disponible lorsque l'avancement dépassera 80%.
                </p>
              )}
            </div>

            {/* Cycles */}
            <div className="space-y-6">
              {CYCLES.map(cycle => {
                const cycleData = getCycleData(selectedClient.id, cycle.id);
                const revisionLevel = cycleData?.revision_level || 0;
                const currentLabel = sliderLabels[cycle.id] || REVISION_LABELS[revisionLevel];
                const labelColor = revisionLevel >= 4 ? 'text-success' : (revisionLevel === 0 ? 'text-muted-foreground' : 'text-primary');
                const cycleNotes = (cycleData as any)?.notes || '';
                const isNotesExpanded = expandedNotes[cycle.id];

                return (
                  <div key={cycle.id} className="bento-card overflow-hidden p-0">
                    {/* Cycle Header */}
                    <div className="bg-muted/30 p-5 border-b border-border/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center border border-border text-primary shadow-sm">
                          {iconMap[cycle.icon]}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{cycle.label}</h3>
                          <p className="text-xs text-muted-foreground">Documents & Contrôles</p>
                        </div>
                      </div>

                      {/* Revision Slider */}
                      <div className="w-full lg:w-1/2 bg-card p-4 rounded-2xl border border-border shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="stat-label">Avancement Révision</span>
                          <span className={cn("text-sm font-bold", labelColor)}>
                            {currentLabel}
                          </span>
                        </div>
                        <div className="flex w-full mb-2 gap-1">
                          {[1, 2, 3, 4].map(step => (
                            <div
                              key={step}
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                step <= revisionLevel
                                  ? (revisionLevel >= 4 ? 'bg-success' : 'bg-primary')
                                  : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="4"
                          value={revisionLevel}
                          onInput={(e) => handleSliderInput(cycle.id, (e.target as HTMLInputElement).value)}
                          onChange={(e) => handleSliderChange(selectedClient.id, cycle.id, e.target.value)}
                          className="w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border/50">
                      {cycle.items.map((item, idx) => {
                        const status = (cycleData?.items?.[idx.toString()] as ItemStatus) || 'ask';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                          >
                            <span className="font-medium">{item}</span>
                            <div className="flex gap-2">
                              {(['ask', 'done', 'na'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => onUpdateItem(selectedClient.id, cycle.id, idx, s)}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all",
                                    status === s
                                      ? s === 'done'
                                        ? 'bg-success text-success-foreground border-success'
                                        : s === 'ask'
                                          ? 'bg-warning text-warning-foreground border-warning'
                                          : 'bg-muted-foreground text-muted border-muted-foreground'
                                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                                  )}
                                >
                                  {s === 'ask' ? 'À demander' : s === 'done' ? 'Reçu / Fait' : 'N/A'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes Section */}
                    <div className="border-t border-border/50">
                      <button
                        onClick={() => toggleNotes(cycle.id)}
                        className="w-full px-5 py-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-medium">Notes & Commentaires</span>
                        {cycleNotes && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </button>
                      {isNotesExpanded && onUpdateNotes && (
                        <div className="px-5 pb-5">
                          <Textarea
                            value={cycleNotes}
                            onChange={(e) => onUpdateNotes(selectedClient.id, cycle.id, e.target.value)}
                            placeholder="Ajouter des notes sur ce cycle de révision..."
                            className="input-premium min-h-[100px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
