/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { TrendingUp, Clock, FileCheck, Activity, AlertTriangle, Play, Euro } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/contexts/TimerContext';
import { cn } from '@/lib/utils';
import { calculateBilanProgress, getTVAKey, formatCurrencyShort } from '@/lib/calculations';
import type { Client, BilanCycle, TVAHistory } from '@/lib/database.types';

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
  mission_type?: string;
  entry_date?: string;
}

interface ClientDetailSheetProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  bilanCycles?: BilanCycle[];
  tvaHistories?: TVAHistory[];
  timeEntries?: TimeEntryData[];
}

export function ClientDetailSheet({
  client,
  open,
  onClose,
  bilanCycles = [],
  tvaHistories = [],
  timeEntries = []
}: ClientDetailSheetProps) {
  const { startTimer, timerState } = useTimer();

  const currentDate = new Date();
  currentDate.setDate(1);
  const currentPeriod = getTVAKey(currentDate);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!client) return null;

    // Time spent
    const clientTimeEntries = timeEntries.filter(e => e.client_id === client.id);
    const totalHours = clientTimeEntries.reduce((sum, e) => sum + e.duration_hours, 0);

    // Hours by mission
    const hoursByMission: Record<string, number> = {};
    clientTimeEntries.forEach(e => {
      const mission = e.mission_type || 'Autre';
      hoursByMission[mission] = (hoursByMission[mission] || 0) + e.duration_hours;
    });

    // Annual TVA
    const clientTva = tvaHistories.filter(t => t.client_id === client.id);
    const currentMonthTva = clientTva.find(t => t.period === currentPeriod);
    const annualTvaTotal = clientTva.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Bilan progress
    const clientCycles = bilanCycles.filter(c => c.client_id === client.id);
    const bilanProgress = calculateBilanProgress(clientCycles);

    // Get supervision status
    const inSupervision = clientCycles.some(c => (c as any).supervision_mode);
    const supervisionStatus = inSupervision
      ? ((clientCycles[0] as any)?.supervision_status || 'waiting')
      : null;

    // Profitability
    const totalFee = (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);
    const hourlyRate = totalHours > 0 ? totalFee / totalHours : 0;

    return {
      totalHours,
      hoursByMission,
      currentMonthTva,
      annualTvaTotal,
      bilanProgress,
      inSupervision,
      supervisionStatus,
      totalFee,
      hourlyRate,
      clientCycles
    };
  }, [client, timeEntries, tvaHistories, bilanCycles, currentPeriod]);

  if (!client || !metrics) return null;

  const getSupervisionBadge = () => {
    if (!metrics.inSupervision) return null;
    const colors: Record<string, string> = {
      waiting: 'bg-warning/10 text-warning',
      scheduled: 'bg-primary/10 text-primary',
      validated: 'bg-success/10 text-success'
    };
    const labels: Record<string, string> = {
      waiting: 'En attente RDV',
      scheduled: 'RDV Planifié',
      validated: 'Validé'
    };
    return (
      <Badge className={colors[metrics.supervisionStatus || 'waiting']}>
        {labels[metrics.supervisionStatus || 'waiting']}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-6 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-neutral text-xs">{client.ref}</span>
                {client.form && <span className="badge-success text-xs">{client.form}</span>}
                {getSupervisionBadge()}
              </div>
              <SheetTitle className="text-2xl">{client.name}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Timer Quick Action */}
          <Button
            onClick={() => startTimer(client.id, client.name)}
            disabled={timerState.clientId === client.id}
            className="w-full gap-2"
            variant={timerState.clientId === client.id ? "secondary" : "default"}
          >
            {timerState.clientId === client.id ? (
              <>
                <Clock className="w-4 h-4 animate-pulse" />
                Chrono en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Démarrer le chrono
              </>
            )}
          </Button>

          {/* TVA Summary */}
          <div className="bento-card p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              TVA
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Mois en cours</p>
                <p className="text-lg font-bold">
                  {metrics.currentMonthTva
                    ? formatCurrencyShort(metrics.currentMonthTva.amount)
                    : '—'}
                </p>
                {metrics.currentMonthTva && (
                  <Badge className={metrics.currentMonthTva.step_valide
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                  }>
                    {metrics.currentMonthTva.step_valide ? 'Validée' : 'En cours'}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cumul annuel payé</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrencyShort(metrics.annualTvaTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Revision & Supervision Progress */}
          <div className="bento-card p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-success" />
              </div>
              Avancement
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Révision</span>
                  <span className="font-semibold">{metrics.bilanProgress}%</span>
                </div>
                <Progress
                  value={metrics.bilanProgress}
                  className={cn(
                    "h-2",
                    metrics.bilanProgress === 100 && "[&>div]:bg-success"
                  )}
                />
              </div>

              {metrics.inSupervision && (
                <div className="pt-3 border-t border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Supervision</span>
                    {getSupervisionBadge()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rentabilité & Temps */}
          <div className="bento-card p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-warning" />
              </div>
              Rentabilité & Temps
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Temps passé</p>
                <p className="text-xl font-bold">{metrics.totalHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Budget honoraires</p>
                <p className="text-xl font-bold">{formatCurrencyShort(metrics.totalFee)}</p>
              </div>
            </div>

            {/* Taux horaire réel */}
            <div className={cn(
              "p-4 rounded-xl border",
              metrics.hourlyRate >= 50 ? "bg-success/10 border-success/30" :
                metrics.hourlyRate >= 35 ? "bg-primary/10 border-primary/30" :
                  metrics.hourlyRate >= 20 ? "bg-warning/10 border-warning/30" :
                    "bg-destructive/10 border-destructive/30"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  <span className="font-medium">Taux Horaire Réel</span>
                </div>
                <span className={cn(
                  "text-2xl font-bold",
                  metrics.hourlyRate >= 50 ? "text-success" :
                    metrics.hourlyRate >= 35 ? "text-primary" :
                      metrics.hourlyRate >= 20 ? "text-warning" :
                        "text-destructive"
                )}>
                  {metrics.totalHours > 0 ? `${metrics.hourlyRate.toFixed(0)}€/h` : '—'}
                </span>
              </div>
              {metrics.totalHours === 0 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Aucun temps enregistré
                </p>
              )}
            </div>

            {/* Breakdown by mission */}
            {Object.keys(metrics.hoursByMission).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Répartition par mission</p>
                <div className="space-y-2">
                  {Object.entries(metrics.hoursByMission)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([mission, hours]) => (
                      <div key={mission} className="flex justify-between text-sm">
                        <span>{mission}</span>
                        <span className="font-medium">{hours.toFixed(1)}h</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Administrative Info */}
          <div className="bento-card p-4">
            <h3 className="font-semibold mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              {client.siren && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SIREN</span>
                  <span>{client.siren}</span>
                </div>
              )}
              {client.manager_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate ml-2">{client.manager_email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.closing_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clôture</span>
                  <span>{client.closing_date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dernières Activités */}
          {timeEntries.filter(e => e.client_id === client.id).length > 0 && (
            <div className="bento-card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Dernières sessions de travail
              </h3>
              <div className="space-y-3">
                {timeEntries
                  .filter(e => e.client_id === client.id)
                  .sort((a, b) => new Date(b.entry_date || 0).getTime() - new Date(a.entry_date || 0).getTime())
                  .slice(0, 3)
                  .map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-3 rounded-xl bg-muted/50 border border-border/50">
                      <div>
                        <p className="font-medium">{entry.mission_type || 'Général'}</p>
                        <p className="text-xs text-muted-foreground">{entry.entry_date}</p>
                      </div>
                      <span className="font-bold">{entry.duration_hours}h</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
