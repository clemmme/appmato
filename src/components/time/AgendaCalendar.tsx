import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  entry_date: string;
  entry_type: 'client' | 'internal' | 'absence';
  duration_hours: number;
  mission_type?: string | null;
  internal_type?: string | null;
  absence_type?: string | null;
  guest_id?: string | null;
  guest_status?: 'pending' | 'accepted' | 'declined' | null;
  user_id?: string;
}

interface AgendaCalendarProps {
  currentDate: Date;
  entries: TimeEntry[];
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  selectedDate?: Date | null;
  currentUserId?: string;
}

// Pastel colors inspired by Airbnb
const PASTEL_COLORS = {
  client: 'bg-rose-100 text-rose-700 border-rose-200',
  internal: 'bg-primary/10 text-primary border-primary/20',
  absence: 'bg-sky-100 text-sky-700 border-sky-200',
};

export function AgendaCalendar({
  currentDate,
  entries,
  onDateChange,
  onDayClick,
  selectedDate,
  currentUserId
}: AgendaCalendarProps) {
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEntriesForDay = (day: Date) => {
    return entries.filter(e => isSameDay(new Date(e.entry_date), day));
  };

  const getDayTotal = (day: Date) => {
    return getEntriesForDay(day).reduce((sum, e) => sum + e.duration_hours, 0);
  };

  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthDays[0]);
  // Adjust for Monday start (0 becomes 6, 1 becomes 0, etc.)
  const emptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const getEntryStyle = (entry: TimeEntry) => {
    if (entry.guest_id === currentUserId && entry.guest_status === 'pending') {
      return 'bg-warning/20 text-warning border-warning/40 border-dashed border-2';
    }
    if (entry.guest_id === currentUserId && entry.guest_status === 'declined') {
      return 'bg-destructive/10 text-destructive border-destructive/30 line-through opacity-50';
    }
    return PASTEL_COLORS[entry.entry_type as keyof typeof PASTEL_COLORS] || PASTEL_COLORS.client;
  };

  return (
    <div className="bento-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-b border-border/30">
        <button
          onClick={() => onDateChange(subMonths(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <button
          onClick={() => onDateChange(addMonths(currentDate, 1))}
          className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-muted/50">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: emptyDays }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2 min-h-[100px] border-b border-r border-border/30 bg-muted/20" />
        ))}

        {monthDays.map(day => {
          const dayEntries = getEntriesForDay(day);
          const total = getDayTotal(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "p-2 min-h-[100px] border-b border-r border-border/30 cursor-pointer transition-all group",
                "hover:bg-rose-50/50 dark:hover:bg-rose-950/20",
                isSelected && "bg-primary/10 ring-2 ring-primary/30 ring-inset",
                isTodayDate && "bg-gradient-to-br from-primary/5 to-primary/10",
                isWeekend && !isSelected && !isTodayDate && "bg-muted/30"
              )}
            >
              {/* Day number */}
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isTodayDate && "bg-primary text-primary-foreground",
                  isSelected && !isTodayDate && "bg-secondary text-secondary-foreground",
                  !isTodayDate && !isSelected && "group-hover:bg-muted"
                )}>
                  {format(day, 'd')}
                </span>
                {total > 0 && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {total}h
                  </span>
                )}
              </div>

              {/* Entries preview */}
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map(entry => (
                  <div
                    key={entry.id}
                    className={cn(
                      "text-[10px] font-medium truncate px-1.5 py-0.5 rounded-md border flex items-center justify-between gap-1",
                      getEntryStyle(entry)
                    )}
                  >
                    <span className="truncate">
                      {entry.duration_hours}h {
                        entry.entry_type === 'client'
                          ? entry.mission_type
                          : (entry.internal_type || entry.absence_type)
                      }
                    </span>
                    {entry.guest_id === currentUserId && (
                      <span className="shrink-0 text-[8px] uppercase tracking-wider bg-background/50 px-1 rounded-sm">Invité</span>
                    )}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium pl-1">
                    +{dayEntries.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
