/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Briefcase,
  Coffee,
  Calendar,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Client } from '@/lib/database.types';
import type { TimeEntry } from '@/pages/production/TimeTracking';
import { cn } from '@/lib/utils';

const MISSION_TYPES = ['Compta', 'Révision', 'Juridique', 'Social', 'Éval', 'Tableau de bord', 'Prévisionnel'];
const INTERNAL_TYPES = ['Rangement bureau', 'Formation', 'Administratif', 'Réunion interne'];
const ABSENCE_TYPES = ['RTT', 'CP', 'Maladie', 'Férié'];

interface TimeTrackingViewProps {
  clients: Client[];
  entries: TimeEntry[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAddEntry: (entry: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onDeleteEntry: (id: string) => void;
}

export function TimeTrackingView({
  clients,
  entries,
  currentDate,
  onDateChange,
  onAddEntry,
  onDeleteEntry
}: TimeTrackingViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entryType, setEntryType] = useState<'client' | 'internal' | 'absence'>('client');
  const [clientId, setClientId] = useState<string>('');
  const [missionType, setMissionType] = useState<string>('');
  const [internalType, setInternalType] = useState<string>('');
  const [absenceType, setAbsenceType] = useState<string>('');
  const [duration, setDuration] = useState<string>('1');
  const [comment, setComment] = useState<string>('');

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const moveMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onDateChange(newDate);
  };

  const getEntriesForDay = (day: Date) => {
    return entries.filter(e => isSameDay(new Date(e.entry_date), day));
  };

  const getDayTotal = (day: Date) => {
    return getEntriesForDay(day).reduce((sum, e) => sum + e.duration_hours, 0);
  };

  const profitabilityData = useMemo(() => {
    const clientTotals: Record<string, { hours: number; fee: number; name: string }> = {};

    entries.forEach(entry => {
      // Filtrer les entrées du mois courant uniquement
      if (entry.entry_type === 'client' && entry.client_id && isSameDay(new Date(entry.entry_date), new Date(entry.entry_date))) {
        // Simple check to keep all entries since they're already filtered by month
        const client = clients.find(c => c.id === entry.client_id);
        if (client) {
          if (!clientTotals[client.id]) {
            const monthlyFee = ((client as any).annual_fee || 0) / 12;
            clientTotals[client.id] = { hours: 0, fee: monthlyFee, name: client.name };
          }
          clientTotals[client.id].hours += entry.duration_hours;
        }
      }
    });

    return Object.entries(clientTotals).map(([id, data]) => ({
      id,
      name: data.name,
      hours: data.hours,
      fee: data.fee,
      hourlyRate: data.hours > 0 ? (data.fee / data.hours) : 0
    })).sort((a, b) => b.hours - a.hours);
  }, [entries, clients]);

  const monthlyTotals = useMemo(() => {
    let client = 0, internal = 0, absence = 0;
    entries.forEach(e => {
      if (e.entry_type === 'client') client += e.duration_hours;
      else if (e.entry_type === 'internal') internal += e.duration_hours;
      else absence += e.duration_hours;
    });
    return { client, internal, absence, total: client + internal + absence };
  }, [entries]);

  const openModal = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
    resetForm();
  };

  const resetForm = () => {
    setEntryType('client');
    setClientId('');
    setMissionType('');
    setInternalType('');
    setAbsenceType('');
    setDuration('1');
    setComment('');
  };

  const handleSubmit = () => {
    const durationNum = parseFloat(duration) || 0;
    if (durationNum <= 0) return;

    if (entryType === 'client' && (!clientId || !missionType)) return;
    if (entryType === 'internal' && !internalType) return;
    if (entryType === 'absence' && !absenceType) return;

    onAddEntry({
      entry_date: format(selectedDate, 'yyyy-MM-dd'),
      entry_type: entryType,
      client_id: entryType === 'client' ? clientId : null,
      mission_type: entryType === 'client' ? missionType : null,
      internal_type: entryType === 'internal' ? internalType : null,
      absence_type: entryType === 'absence' ? absenceType : null,
      duration_hours: durationNum,
      comment: comment.trim()
    });

    setIsModalOpen(false);
  };

  const getEntryLabel = (entry: TimeEntry) => {
    if (entry.entry_type === 'client') {
      const client = clients.find(c => c.id === entry.client_id);
      return `${client?.name || 'Client'} - ${entry.mission_type}`;
    }
    if (entry.entry_type === 'internal') return entry.internal_type;
    return entry.absence_type;
  };

  const getEntryIcon = (type: string) => {
    if (type === 'client') return <Briefcase className="w-4 h-4" />;
    if (type === 'internal') return <Coffee className="w-4 h-4" />;
    return <Calendar className="w-4 h-4" />;
  };

  const getEntryColor = (type: string) => {
    if (type === 'client') return 'bg-primary/10 text-primary border-primary/20';
    if (type === 'internal') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted text-muted-foreground border-muted-foreground/20';
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-border/50 bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendrier</h1>
            <p className="text-muted-foreground mt-1">Saisissez et analysez votre activité</p>
          </div>

          <div className="flex items-center gap-3 bg-muted rounded-2xl p-1">
            <button
              onClick={() => moveMonth(-1)}
              className="p-2 hover:bg-card rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold w-36 text-center">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </span>
            <button
              onClick={() => moveMonth(1)}
              className="p-2 hover:bg-card rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bento-card py-3 px-4">
            <p className="stat-label">Dossiers</p>
            <p className="text-2xl font-bold text-primary">{monthlyTotals.client}h</p>
          </div>
          <div className="bento-card py-3 px-4">
            <p className="stat-label">Interne</p>
            <p className="text-2xl font-bold text-warning">{monthlyTotals.internal}h</p>
          </div>
          <div className="bento-card py-3 px-4">
            <p className="stat-label">Absences</p>
            <p className="text-2xl font-bold text-muted-foreground">{monthlyTotals.absence}h</p>
          </div>
          <div className="bento-card py-3 px-4">
            <p className="stat-label">Total</p>
            <p className="text-2xl font-bold">{monthlyTotals.total}h</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bento-card p-0 overflow-hidden">
            <div className="grid grid-cols-7 bg-muted">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: (monthDays[0]?.getDay() || 7) - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 h-24 border-b border-r border-border/50 bg-muted/30" />
              ))}
              {monthDays.map(day => {
                const dayEntries = getEntriesForDay(day);
                const total = getDayTotal(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => openModal(day)}
                    className={cn(
                      "p-2 h-24 border-b border-r border-border/50 cursor-pointer hover:bg-muted/50 transition-colors",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {total > 0 && (
                        <span className="text-xs font-bold text-primary">{total}h</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEntries.slice(0, 2).map(entry => (
                        <div
                          key={entry.id}
                          className={cn(
                            "text-xs truncate px-1.5 py-0.5 rounded border",
                            getEntryColor(entry.entry_type)
                          )}
                        >
                          {entry.duration_hours}h {entry.entry_type === 'client' ? entry.mission_type : (entry.internal_type || entry.absence_type)}
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayEntries.length - 2} autres
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profitability */}
          <div className="bento-card">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              Rentabilité par Dossier
            </h3>
            {profitabilityData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune donnée ce mois
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {profitabilityData.map(item => (
                  <div key={item.id} className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm truncate flex-1">{item.name}</span>
                      <span className="text-sm font-bold text-primary ml-2">{item.hours}h</span>
                    </div>
                    {item.fee > 0 && (
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Forfait: {item.fee.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€ / mois</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium px-2 py-0.5 rounded-full",
                            item.hourlyRate >= 70 ? "bg-success/20 text-success" :
                              item.hourlyRate >= 45 ? "bg-warning/20 text-warning" :
                                "bg-destructive/20 text-destructive"
                          )}>
                            {item.hourlyRate.toFixed(0)}€/h
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Nouvelle Saisie</h2>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-muted">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Entry Type Tabs */}
            <div className="flex gap-2 mb-6">
              {(['client', 'internal', 'absence'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setEntryType(type)}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2",
                    entryType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {getEntryIcon(type)}
                  {type === 'client' ? 'Dossier' : type === 'internal' ? 'Interne' : 'Absence'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {entryType === 'client' && (
                <>
                  <div>
                    <Label className="stat-label">Client</Label>
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="input-premium mt-2"
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="stat-label">Mission</Label>
                    <select
                      value={missionType}
                      onChange={(e) => setMissionType(e.target.value)}
                      className="input-premium mt-2"
                    >
                      <option value="">Sélectionner une mission</option>
                      {MISSION_TYPES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="stat-label">Facturation</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Forfait annuel (€)"
                      className="input-premium mt-2"
                    />
                  </div>
                </>
              )}

              {entryType === 'internal' && (
                <div>
                  <Label className="stat-label">Type</Label>
                  <select
                    value={internalType}
                    onChange={(e) => setInternalType(e.target.value)}
                    className="input-premium mt-2"
                  >
                    <option value="">Sélectionner un type</option>
                    {INTERNAL_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {entryType === 'absence' && (
                <div>
                  <Label className="stat-label">Type d'absence</Label>
                  <select
                    value={absenceType}
                    onChange={(e) => setAbsenceType(e.target.value)}
                    className="input-premium mt-2"
                  >
                    <option value="">Sélectionner un type</option>
                    {ABSENCE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label className="stat-label">Durée (heures)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input-premium mt-2"
                />
              </div>

              <div>
                <Label className="stat-label">Commentaire (optionnel)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Notes sur cette saisie..."
                  className="input-premium mt-2 min-h-[80px]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl">
                  Annuler
                </Button>
                <Button onClick={handleSubmit} className="btn-primary flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Existing entries for the day */}
            {getEntriesForDay(selectedDate).length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium mb-3">Saisies de ce jour</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getEntriesForDay(selectedDate).map(entry => (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        getEntryColor(entry.entry_type)
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getEntryIcon(entry.entry_type)}
                        <span className="text-sm truncate">{getEntryLabel(entry)}</span>
                        <span className="text-sm font-bold">{entry.duration_hours}h</span>
                      </div>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
