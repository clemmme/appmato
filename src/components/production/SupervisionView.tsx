/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Search, Eye, Calendar, Clock, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { CYCLES } from '@/lib/database.types';
import type { Client, BilanCycle } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTimer } from '@/contexts/TimerContext';

interface SupervisionViewProps {
  clients: Client[];
  bilanCyclesMap: Map<string, BilanCycle[]>;
  onUpdateStatus: (clientId: string, status: string) => void;
  onUpdateRdvDate: (clientId: string, date: string) => void;
}

type SupervisionStatus = 'waiting' | 'scheduled' | 'validated';

const STATUS_LABELS: Record<SupervisionStatus, string> = {
  waiting: 'En attente de RDV',
  scheduled: 'RDV Planifié',
  validated: 'Validé/Clôturé',
};

const STATUS_COLORS: Record<SupervisionStatus, string> = {
  waiting: 'bg-warning/10 text-warning border-warning/30',
  scheduled: 'bg-primary/10 text-primary border-primary/30',
  validated: 'bg-success/10 text-success border-success/30',
};

export function SupervisionView({
  clients,
  bilanCyclesMap,
  onUpdateStatus,
  onUpdateRdvDate
}: SupervisionViewProps) {
  const { isFavorite, toggleFavorite, sortWithFavorites } = useFavorites();
  const { startTimer, timerState } = useTimer();
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupervisionStatus | 'all'>('all');
  const [rdvDate, setRdvDate] = useState('');

  // Only show clients in supervision mode
  const supervisionClients = useMemo(() => {
    return clients.filter(client => {
      const cycles = bilanCyclesMap.get(client.id) || [];
      return cycles.some(c => (c as any).supervision_mode === true);
    });
  }, [clients, bilanCyclesMap]);

  const filteredClients = useMemo(() => {
    const filtered = supervisionClients
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase()))
      .filter(c => {
        if (statusFilter === 'all') return true;
        const cycles = bilanCyclesMap.get(c.id) || [];
        const status = (cycles[0] as any)?.supervision_status || 'waiting';
        return status === statusFilter;
      });
    return sortWithFavorites(filtered);
  }, [supervisionClients, search, statusFilter, bilanCyclesMap, sortWithFavorites]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const getClientStatus = (clientId: string): SupervisionStatus => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    return (cycles[0] as any)?.supervision_status || 'waiting';
  };

  const getClientRdvDate = (clientId: string): string | null => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    return (cycles[0] as any)?.rdv_chef_date || null;
  };

  const getCriticalPoints = (clientId: string): string[] => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    const allPoints: string[] = [];
    cycles.forEach(c => {
      const points = (c as any)?.critical_points || [];
      allPoints.push(...points);
    });
    return [...new Set(allPoints)];
  };

  const getNotesFromRevision = (clientId: string): { cycle: string; notes: string }[] => {
    const cycles = bilanCyclesMap.get(clientId) || [];
    return cycles
      .filter(c => (c as any).notes && (c as any).notes.trim())
      .map(c => ({
        cycle: CYCLES.find(cy => cy.id === c.cycle_id)?.label || c.cycle_id,
        notes: (c as any).notes
      }));
  };

  const handleScheduleRdv = () => {
    if (!selectedClientId || !rdvDate) return;
    onUpdateRdvDate(selectedClientId, rdvDate);
    onUpdateStatus(selectedClientId, 'scheduled');
    setRdvDate('');
  };

  const handleValidate = () => {
    if (!selectedClientId) return;
    onUpdateStatus(selectedClientId, 'validated');
  };

  return (
    <div className="h-full flex animate-fade-in">
      {/* Client List Sidebar */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-card">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-primary" />
            Supervision
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="input-premium pl-11 py-2 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors",
                statusFilter === 'all'
                  ? "bg-muted border-border"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              Tous ({supervisionClients.length})
            </button>
            {(Object.keys(STATUS_LABELS) as SupervisionStatus[]).map(status => {
              const count = supervisionClients.filter(c => getClientStatus(c.id) === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors",
                    statusFilter === status
                      ? STATUS_COLORS[status]
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto opacity-30 mb-3" />
              <p className="text-sm font-medium">Aucun dossier en supervision</p>
              <p className="text-xs mt-1">Les dossiers révisés apparaîtront ici</p>
            </div>
          ) : (
            filteredClients.map(client => {
              const status = getClientStatus(client.id);
              const rdv = getClientRdvDate(client.id);
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left transition-all",
                    "hover:bg-muted border border-transparent hover:border-border",
                    selectedClientId === client.id && "bg-muted border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="truncate flex-1">
                      <span className="font-semibold truncate flex items-center gap-1">
                        <FavoriteStar isFavorite={isFavorite(client.id)} onToggle={() => toggleFavorite(client.id)} />
                        {client.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{client.ref}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", STATUS_COLORS[status])}>
                      {STATUS_LABELS[status]}
                    </Badge>
                    {rdv && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {rdv}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background overflow-y-auto">
        {!selectedClient ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Eye className="w-20 h-20 mb-4 opacity-30" />
            <p className="text-lg font-medium">Sélectionnez un dossier</p>
            <p className="text-sm mt-1">pour accéder aux détails de supervision</p>
          </div>
        ) : (
          <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bento-card mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-neutral">{selectedClient.ref}</span>
                    <Badge className={cn(STATUS_COLORS[getClientStatus(selectedClient.id)])}>
                      {STATUS_LABELS[getClientStatus(selectedClient.id)]}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                </div>

                {/* Timer */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startTimer(selectedClient.id, selectedClient.name)}
                  disabled={timerState.clientId === selectedClient.id}
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {timerState.clientId === selectedClient.id ? 'Chrono actif' : 'Démarrer chrono'}
                </Button>
              </div>
            </div>

            {/* Points Critiques */}
            <div className="bento-card mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Points Critiques
              </h3>
              <div className="space-y-2">
                {getCriticalPoints(selectedClient.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun point critique remonté</p>
                ) : (
                  getCriticalPoints(selectedClient.id).map((point, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl border border-warning/20">
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      <span className="text-sm">{point}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes de Révision */}
            <div className="bento-card mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                Commentaires de Révision
              </h3>
              <div className="space-y-3">
                {getNotesFromRevision(selectedClient.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun commentaire de révision</p>
                ) : (
                  getNotesFromRevision(selectedClient.id).map((item, idx) => (
                    <div key={idx} className="p-4 bg-muted/50 rounded-xl border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{item.cycle}</p>
                      <p className="text-sm">{item.notes}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            {getClientStatus(selectedClient.id) !== 'validated' && (
              <div className="bento-card">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  Actions
                </h3>

                {getClientStatus(selectedClient.id) === 'waiting' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="stat-label">Date du RDV de supervision</Label>
                      <Input
                        type="date"
                        value={rdvDate}
                        onChange={(e) => setRdvDate(e.target.value)}
                        className="input-premium mt-2 max-w-xs"
                      />
                    </div>
                    <Button onClick={handleScheduleRdv} disabled={!rdvDate} className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Planifier le RDV
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Un événement sera automatiquement créé dans le Calendrier.
                    </p>
                  </div>
                )}

                {getClientStatus(selectedClient.id) === 'scheduled' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
                      <p className="flex items-center gap-2 font-medium">
                        <Calendar className="w-4 h-4" />
                        RDV prévu le {getClientRdvDate(selectedClient.id)}
                      </p>
                    </div>
                    <Button onClick={handleValidate} className="gap-2 bg-success hover:bg-success/90">
                      <CheckCircle className="w-4 h-4" />
                      Valider & Clôturer
                    </Button>
                  </div>
                )}
              </div>
            )}

            {getClientStatus(selectedClient.id) === 'validated' && (
              <div className="bento-card bg-success/10 border-success/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-success">Dossier Validé</h3>
                      <p className="text-sm text-muted-foreground">
                        Ce dossier a été validé et transmis en Clôture.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateStatus(selectedClient.id, 'scheduled')}
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Annuler la validation
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
