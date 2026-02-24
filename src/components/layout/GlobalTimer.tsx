import { useTimer } from '@/contexts/TimerContext';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function GlobalTimer() {
    const { timerState, pauseTimer, resumeTimer, requestRecordTime } = useTimer();
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (timerState.isActive) {
            setPulse(true);
            const timer = setTimeout(() => setPulse(false), 500);
            return () => clearTimeout(timer);
        }
    }, [timerState.elapsedSeconds, timerState.isActive]);

    if (!timerState.clientId && !timerState.isActive && timerState.elapsedSeconds === 0) {
        return null;
    }

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in shadow-2xl rounded-full bg-card/95 backdrop-blur-md border border-border/50 flex items-center p-1.5 pr-3">
            <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full shrink-0 mr-3",
                timerState.isActive ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"
            )}>
                <Clock className={cn("w-5 h-5", pulse && timerState.isActive ? "animate-pulse" : "")} />
            </div>

            <div className="flex flex-col mr-6 min-w-[120px]">
                <span className="text-sm font-bold truncate max-w-[150px]" title={timerState.clientName}>
                    {timerState.clientName}
                </span>
                <span className={cn(
                    "text-xs font-mono font-bold font-mono tracking-wider",
                    timerState.isActive ? "text-primary" : "text-muted-foreground"
                )}>
                    {formatTime(timerState.elapsedSeconds)}
                </span>
            </div>

            <div className="flex items-center gap-1 border-l border-border/50 pl-4">
                {timerState.isActive ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={pauseTimer}
                        className="h-8 w-8 hover:bg-warning/10 hover:text-warning rounded-full"
                        title="Mettre en pause"
                    >
                        <Pause className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={resumeTimer}
                        className="h-8 w-8 hover:bg-success/10 hover:text-success rounded-full"
                        title="Reprendre"
                    >
                        <Play className="w-4 h-4 ml-0.5" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={requestRecordTime}
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full ml-1"
                    title="Arrêter et Enregistrer"
                >
                    <Square className="w-4 h-4 fill-current" />
                </Button>
            </div>
        </div>
    );
}
