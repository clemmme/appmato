import { useMemo } from 'react';
import { format, addDays, subDays, isToday, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/database.types';

interface CalendarEvent {
  id: string;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours: number;
  entry_type: 'client' | 'internal' | 'absence';
  event_category?: 'work' | 'meeting' | 'supervision' | 'revision';
  mission_type?: string | null;
  internal_type?: string | null;
  absence_type?: string | null;
  client_id?: string | null;
  comment?: string;
  guest_id?: string | null;
  guest_status?: 'pending' | 'accepted' | 'declined' | null;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  clients: Client[];
  onDateChange: (date: Date) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  currentUserId?: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h

const EVENT_COLORS = {
  work: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200',
  meeting: 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-200',
  supervision: 'bg-primary/10 border-primary/30 text-primary dark:bg-primary/10 dark:border-primary/30 dark:text-primary',
  revision: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200',
  client: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200',
  internal: 'bg-primary/10 border-primary/30 text-primary dark:bg-primary/10 dark:border-primary/30 dark:text-primary',
  absence: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200',
};

export function DayView({
  currentDate,
  events,
  clients,
  onDateChange,
  onSlotClick,
  onEventClick,
  currentUserId
}: DayViewProps) {
  const dayEvents = useMemo(() => {
    return events.filter(e => isSameDay(parseISO(e.entry_date), currentDate));
  }, [events, currentDate]);

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = event.start_time
      ? parseInt(event.start_time.split(':')[0]) + parseInt(event.start_time.split(':')[1]) / 60
      : 9;
    const duration = event.duration_hours || 1;
    const top = (startHour - 8) * 80; // 80px per hour
    const height = Math.max(duration * 80, 40);
    return { top, height };
  };

  const getEventLabel = (event: CalendarEvent) => {
    if (event.entry_type === 'client') {
      const client = clients.find(c => c.id === event.client_id);
      return `${client?.name || 'Client'} - ${event.mission_type || ''}`;
    }
    return event.internal_type || event.absence_type || '';
  };

  const todayIsSelected = isToday(currentDate);

  return (
    <div className="bento-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-b border-border/30">
        <button
          onClick={() => onDateChange(subDays(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold capitalize">
            {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          {todayIsSelected && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Aujourd'hui</span>
          )}
        </div>
        <button
          onClick={() => onDateChange(addDays(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Time Grid */}
      <div className="relative overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_1fr]">
          {/* Hour labels */}
          <div className="sticky left-0 bg-card z-10">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-20 border-b border-border/30 flex items-start justify-end pr-3 pt-1"
              >
                <span className="text-xs text-muted-foreground font-medium">{hour}:00</span>
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="relative border-l border-border/30">
            {HOURS.map(hour => (
              <div
                key={hour}
                onClick={() => onSlotClick(currentDate, hour)}
                className={cn(
                  "h-20 border-b border-border/30 cursor-pointer group hover:bg-primary/5 transition-colors relative",
                  todayIsSelected && "bg-primary/5"
                )}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity flex items-center gap-1 text-primary text-xs">
                  <Plus className="w-4 h-4" />
                  Ajouter
                </div>
                {/* Half hour line */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/20" />
              </div>
            ))}

            {/* Events */}
            {dayEvents.map(event => {
              const { top, height } = getEventPosition(event);
              let colorClass = EVENT_COLORS[event.event_category || event.entry_type] || EVENT_COLORS.client;

              if (event.guest_id === currentUserId) {
                if (event.guest_status === 'pending') {
                  colorClass = 'bg-warning/20 border-warning/40 text-warning border-dashed border-2 shadow-sm dark:bg-warning/10 dark:text-warning-foreground';
                } else if (event.guest_status === 'declined') {
                  colorClass = 'bg-destructive/10 border-destructive/30 text-destructive line-through opacity-50 dark:bg-destructive/10 dark:text-destructive-foreground';
                }
              }

              return (
                <div
                  key={event.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  className={cn(
                    "absolute left-2 right-2 rounded-xl border-l-4 px-4 py-2 cursor-pointer shadow-sm hover:shadow-lg transition-all overflow-hidden",
                    colorClass
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{getEventLabel(event)}</p>
                        {event.guest_id === currentUserId && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wider bg-background/50 px-1.5 rounded-sm mt-0.5">Invité</span>
                        )}
                      </div>
                      <p className="text-xs opacity-75 mt-0.5">{event.duration_hours}h</p>
                    </div>
                    {event.start_time && (
                      <span className="text-xs font-medium opacity-75">{event.start_time}</span>
                    )}
                  </div>
                  {event.comment && height > 60 && (
                    <p className="text-xs mt-2 opacity-60 line-clamp-2">{event.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
