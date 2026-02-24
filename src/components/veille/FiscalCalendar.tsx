import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDeadlinesForMonth, getDeadlinesForDay, DEADLINE_TYPES, type FiscalDeadline } from '@/lib/fiscalDeadlines';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function FiscalCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const currentMonth = currentDate.getMonth() + 1; // 1-indexed
    const monthDeadlines = useMemo(() => getDeadlinesForMonth(currentMonth), [currentMonth]);

    // Build calendar grid
    const calendarDays: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
        calendarDays.push(day);
        day = addDays(day, 1);
    }

    const selectedDayDeadlines: FiscalDeadline[] = selectedDay ? getDeadlinesForDay(selectedDay.getMonth() + 1, selectedDay.getDate()) : [];

    const todayDeadlines = getDeadlinesForDay(new Date().getMonth() + 1, new Date().getDate());

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-white/60 dark:bg-card/40 backdrop-blur-md border border-white/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-sm">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-black tracking-tight capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: fr })}
                    </h3>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-white/60 dark:bg-card/40 backdrop-blur-md border border-white/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {WEEKDAYS.map(wd => (
                        <div key={wd} className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 py-2">
                            {wd}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-2 flex-1">
                    {calendarDays.map((d, idx) => {
                        const isCurrentMonth = isSameMonth(d, currentDate);
                        const isToday = isSameDay(d, new Date());
                        const isSelected = selectedDay && isSameDay(d, selectedDay);
                        const dayDeadlines = isCurrentMonth ? getDeadlinesForDay(d.getMonth() + 1, d.getDate()) : [];
                        const hasDeadlines = dayDeadlines.length > 0;

                        return (
                            <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => isCurrentMonth && setSelectedDay(d)}
                                        className={cn(
                                            "relative flex flex-col items-center justify-center py-3 rounded-xl transition-all text-sm font-semibold min-h-[52px]",
                                            !isCurrentMonth && "opacity-20 cursor-default",
                                            isCurrentMonth && !isSelected && !isToday && "hover:bg-white/60 dark:hover:bg-white/10",
                                            isToday && !isSelected && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800",
                                            isSelected && "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg scale-105"
                                        )}
                                    >
                                        {d.getDate()}
                                        {hasDeadlines && (
                                            <div className="flex gap-0.5 mt-1">
                                                {dayDeadlines.slice(0, 3).map((dl, i) => (
                                                    <span key={i} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/80" : dl.color)} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                {hasDeadlines && (
                                    <TooltipContent side="bottom" className="max-w-xs">
                                        <div className="space-y-1">
                                            {dayDeadlines.map(dl => (
                                                <div key={dl.id} className="text-xs">
                                                    <span className="font-bold">{dl.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    {Object.entries(DEADLINE_TYPES).map(([key, info]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn("w-2.5 h-2.5 rounded-full", info.color)} />
                            {info.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Details Panel */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4">
                {/* Today Alert */}
                {todayDeadlines.length > 0 && (
                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-5 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wider">Échéance aujourd'hui</span>
                        </div>
                        {todayDeadlines.map(dl => (
                            <div key={dl.id} className="text-sm font-medium opacity-90 mt-1">• {dl.label}</div>
                        ))}
                    </div>
                )}

                {/* Selected Day Details */}
                <div className="bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-6 shadow-sm flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                        <CalendarDays className="w-4 h-4" />
                        {selectedDay ? format(selectedDay, 'dd MMMM yyyy', { locale: fr }) : 'Échéances du mois'}
                    </div>

                    {selectedDay ? (
                        selectedDayDeadlines.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDayDeadlines.map(dl => (
                                    <div key={dl.id} className="p-4 bg-white/60 dark:bg-background/30 rounded-xl border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn("w-2.5 h-2.5 rounded-full", dl.color)} />
                                            <span className={cn("text-xs font-bold uppercase tracking-widest", dl.textColor)}>{DEADLINE_TYPES[dl.type]?.label}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{dl.label}</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{dl.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Aucune échéance ce jour.</p>
                        )
                    ) : (
                        <div className="space-y-3">
                            {monthDeadlines.length > 0 ? (
                                monthDeadlines.map(dl => (
                                    <button
                                        key={dl.id}
                                        onClick={() => {
                                            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), dl.dayOfMonth);
                                            setSelectedDay(d);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 bg-white/40 dark:bg-background/20 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-left"
                                    >
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm", dl.color)}>
                                            {dl.dayOfMonth}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{dl.label}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{DEADLINE_TYPES[dl.type]?.label}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">Aucune échéance ce mois.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
