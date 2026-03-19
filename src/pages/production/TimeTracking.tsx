import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/lib/database.types';
import { Loader2, Plus, CalendarDays, LayoutList, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { EventModal } from '@/components/calendar/EventModal';
import { AgendaCalendar } from '@/components/time/AgendaCalendar';
import { NotificationManager } from '@/components/time/NotificationManager';
import { cn } from '@/lib/utils';

export interface TimeEntry {
  id: string;
  user_id: string;
  entry_date: string;
  client_id: string | null;
  entry_type: 'client' | 'internal' | 'absence';
  event_category?: 'work' | 'meeting' | 'supervision' | 'revision';
  start_time?: string;
  mission_type: string | null;
  internal_type: string | null;
  absence_type: string | null;
  duration_hours: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'month' | 'week' | 'day';

export default function TimeTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimeEntry | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const fetchData = useCallback(async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const [clientsRes, entriesRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase
          .from('time_entries')
          .select('*')
          .gte('entry_date', format(start, 'yyyy-MM-dd'))
          .lte('entry_date', format(end, 'yyyy-MM-dd'))
          .or(`user_id.eq.${user.id},guest_id.eq.${user.id}`)
          .order('entry_date', { ascending: false })
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (entriesRes.error) throw entriesRes.error;

      setClients(clientsRes.data as Client[]);
      setEntries((entriesRes.data || []) as TimeEntry[]);
    } catch (error) {
      console.error('Error fetching time data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast, user?.id]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: TimeEntry) => {
    setSelectedDate(parseISO(event.entry_date));
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(9);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<TimeEntry, 'id'>) => {
    if (!user) return;

    try {
      if (selectedEvent?.id) {
        // Update existing
        const { error } = await supabase
          .from('time_entries')
          .update({
            ...eventData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;

        setEntries(prev => prev.map(e =>
          e.id === selectedEvent.id ? { ...e, ...eventData } as TimeEntry : e
        ));
        toast({ title: 'Modifié', description: 'L\'événement a été mis à jour.' });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            ...eventData,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setEntries(prev => [data as TimeEntry, ...prev]);
        toast({ title: 'Créé', description: 'L\'événement a été ajouté au calendrier.' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder l\'événement.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Supprimé', description: 'L\'événement a été supprimé.' });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'événement.',
        variant: 'destructive',
      });
    }
  };

  // Stats
  const monthlyTotals = useMemo(() => {
    let client = 0, internal = 0, absence = 0;
    entries.forEach(e => {
      if (e.entry_type === 'client') client += e.duration_hours;
      else if (e.entry_type === 'internal') internal += e.duration_hours;
      else absence += e.duration_hours;
    });
    return { client, internal, absence, total: client + internal + absence };
  }, [entries]);

  const profitabilityData = useMemo(() => {
    const clientTotals: Record<string, { hours: number; fee: number; name: string }> = {};

    entries.forEach(entry => {
      if (entry.entry_type === 'client' && entry.client_id) {
        const client = clients.find(c => c.id === entry.client_id);
        if (client) {
          if (!clientTotals[client.id]) {
            const totalFee = (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);
            clientTotals[client.id] = { hours: 0, fee: totalFee, name: client.name };
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
      hourlyRate: data.hours > 0 ? data.fee / data.hours : 0
    })).sort((a, b) => b.hours - a.hours);
  }, [entries, clients]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-border/50 bg-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Calendrier</h1>
              <p className="text-muted-foreground mt-1">Agenda professionnel et suivi de productivité</p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-muted rounded-xl p-1">
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
                    viewMode === 'month' ? "bg-card shadow-sm" : "hover:text-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Mois
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
                    viewMode === 'week' ? "bg-card shadow-sm" : "hover:text-foreground"
                  )}
                >
                  <LayoutList className="w-4 h-4" />
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
                    viewMode === 'day' ? "bg-card shadow-sm" : "hover:text-foreground"
                  )}
                >
                  <CalendarDays className="w-4 h-4" />
                  Jour
                </button>
              </div>

              <NotificationManager />
              <Button
                onClick={() => { setSelectedDate(new Date()); setSelectedHour(9); setSelectedEvent(null); setIsModalOpen(true); }}
                className="btn-primary gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvel événement
              </Button>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bento-card py-3 px-4 bg-rose-50 dark:bg-rose-950/20 border-rose-200/50">
              <p className="stat-label">Dossiers</p>
              <p className="text-2xl font-bold text-rose-600">{monthlyTotals.client}h</p>
            </div>
            <div className="bento-card py-3 px-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200/50">
              <p className="stat-label">Interne</p>
              <p className="text-2xl font-bold text-amber-600">{monthlyTotals.internal}h</p>
            </div>
            <div className="bento-card py-3 px-4 bg-sky-50 dark:bg-sky-950/20 border-sky-200/50">
              <p className="stat-label">Absences</p>
              <p className="text-2xl font-bold text-sky-600">{monthlyTotals.absence}h</p>
            </div>
            <div className="bento-card py-3 px-4">
              <p className="stat-label">Total</p>
              <p className="text-2xl font-bold">{monthlyTotals.total}h</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
              {viewMode === 'month' && (
                <AgendaCalendar
                  currentDate={currentDate}
                  entries={entries}
                  onDateChange={setCurrentDate}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDate}
                  currentUserId={user?.id}
                />
              )}
              {viewMode === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={entries}
                  clients={clients}
                  onDateChange={setCurrentDate}
                  onSlotClick={handleSlotClick}
                  onEventClick={handleEventClick}
                  currentUserId={user?.id}
                />
              )}
              {viewMode === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={entries}
                  clients={clients}
                  onDateChange={setCurrentDate}
                  onSlotClick={handleSlotClick}
                  onEventClick={handleEventClick}
                  currentUserId={user?.id}
                />
              )}
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
                          <span>Forfait: {item.fee.toLocaleString('fr-FR')}€</span>
                          <span className={cn(
                            "font-medium",
                            item.hourlyRate >= 50 ? "text-success" : item.hourlyRate >= 30 ? "text-warning" : "text-destructive"
                          )}>
                            {item.hourlyRate.toFixed(0)}€/h
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
          selectedDate={selectedDate || new Date()}
          selectedHour={selectedHour}
          clients={clients}
          event={selectedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      </div>
    </MainLayout>
  );
}
