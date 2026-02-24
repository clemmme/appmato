import { Play, Pause, Square, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/contexts/TimerContext';
import { TimeRecordModal } from './TimeRecordModal';
import { cn } from '@/lib/utils';

export function GlobalTimerWidget() {
  const { 
    timerState, 
    resumeTimer, 
    pauseTimer, 
    requestRecordTime, 
    stopTimer,
    isRecordModalOpen,
    closeRecordModal,
    recordTimeWithDetails,
  } = useTimer();

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Don't show if no timer is active/paused
  if (!timerState.clientId) return null;

  return (
    <>
      <div className={cn(
        "fixed bottom-6 right-6 z-50",
        "bg-card border-2 rounded-2xl shadow-2xl p-4 min-w-[280px]",
        "animate-scale-in",
        timerState.isActive 
          ? "border-primary shadow-primary/20" 
          : "border-border"
      )}>
        {/* Close button */}
        <button
          onClick={stopTimer}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Annuler le chrono"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3 pr-6">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            timerState.isActive 
              ? "bg-primary/20 text-primary animate-pulse" 
              : "bg-muted text-muted-foreground"
          )}>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Chrono actif</p>
            <p className="font-bold truncate">{timerState.clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            "font-mono text-2xl font-bold flex-1",
            timerState.isActive && "text-primary"
          )}>
            {formatTime(timerState.elapsedSeconds)}
          </span>

          <div className="flex gap-2">
            {timerState.isActive ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={pauseTimer}
                className="w-10 h-10 p-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                title="Pause"
              >
                <Pause className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={resumeTimer}
                className="w-10 h-10 p-0 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                title="Reprendre"
              >
                <Play className="w-5 h-5" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={requestRecordTime}
              className="w-10 h-10 p-0 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20"
              title="Arrêter et enregistrer"
            >
              <Square className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          Min. 1 min pour enregistrer
        </p>
      </div>

      {/* Record Modal */}
      <TimeRecordModal
        isOpen={isRecordModalOpen}
        onClose={closeRecordModal}
        onRecord={recordTimeWithDetails}
        clientName={timerState.clientName}
        elapsedSeconds={timerState.elapsedSeconds}
      />
    </>
  );
}
