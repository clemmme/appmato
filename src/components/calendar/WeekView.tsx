import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks, parseISO } from 'date-fns';
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

interface WeekViewProps {
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
  work: 'bg-rose-100 border-rose-300 text-rose-800',
  meeting: 'bg-violet-100 border-violet-300 text-violet-800',
  supervision: 'bg-primary/10 border-primary/30 text-primary',
  revision: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  client: 'bg-rose-100 border-rose-300 text-rose-800',
  internal: 'bg-primary/10 border-primary/30 text-primary',
  absence: 'bg-sky-100 border-sky-300 text-sky-800',
};

export function WeekView({
  currentDate,
  events,
  clients,
  onDateChange,
  onSlotClick,
  onEventClick,
  currentUserId
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.entry_date), day));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = event.start_time
      ? parseInt(event.start_time.split(':')[0])
      : 9;
    const duration = event.duration_hours || 1;
    const top = (startHour - 8) * 64; // 64px per hour
    const height = Math.max(duration * 64, 32);
    return { top, height };
  };

  const getEventLabel = (event: CalendarEvent) => {
    if (event.entry_type === 'client') {
      const client = clients.find(c => c.id === event.client_id);
      return `${client?.name || 'Client'} - ${event.mission_type || ''}`;
    }
    return event.internal_type || event.absence_type || '';
  };

  return (
    <div className="bento-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-b border-border/30">
        <button
          onClick={() => onDateChange(subWeeks(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold">
            {format(weekStart, 'd MMM', { locale: fr })} - {format(weekEnd, 'd MMM yyyy', { locale: fr })}
          </h3>
          <p className="text-xs text-muted-foreground">Semaine {format(currentDate, 'w', { locale: fr })}</p>
        </div>
        <button
          onClick={() => onDateChange(addWeeks(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-border/30 bg-muted/30">
        <div className="p-3 text-center text-xs text-muted-foreground" />
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-3 text-center border-l border-border/30",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: fr })}
            </p>
            <p className={cn(
              "text-lg font-bold mt-1",
              isToday(day) && "text-primary"
            )}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="relative overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8">
          {/* Hour labels */}
          <div className="sticky left-0 bg-card z-10">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-16 border-b border-border/30 flex items-start justify-end pr-3 pt-1"
              >
                <span className="text-xs text-muted-foreground">{hour}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day.toISOString()} className="relative border-l border-border/30">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    onClick={() => onSlotClick(day, hour)}
                    className={cn(
                      "h-16 border-b border-border/30 cursor-pointer group hover:bg-primary/5 transition-colors",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute right-1 top-1 transition-opacity">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const { top, height } = getEventPosition(event);
                  let colorClass = EVENT_COLORS[event.event_category || event.entry_type] || EVENT_COLORS.client;

                  if (event.guest_id === currentUserId) {
                    if (event.guest_status === 'pending') {
                      colorClass = 'bg-warning/20 border-warning/40 text-warning border-dashed border-2 shadow-sm';
                    } else if (event.guest_status === 'declined') {
                      colorClass = 'bg-destructive/10 border-destructive/30 text-destructive line-through opacity-50';
                    }
                  }

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 cursor-pointer shadow-sm hover:shadow-md transition-shadow overflow-hidden",
                        colorClass
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold truncate">{getEventLabel(event)}</p>
                        {event.guest_id === currentUserId && (
                          <span className="shrink-0 text-[8px] uppercase tracking-wider bg-background/50 px-1 rounded-sm mt-0.5">Invité</span>
                        )}
                      </div>
                      {event.start_time && (
                        <p className="text-[10px] opacity-75">{event.start_time}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
