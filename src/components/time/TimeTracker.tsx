import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeTrackerProps {
  clientId: string;
  clientName: string;
  onTimeRecorded: (clientId: string, durationHours: number) => void;
  isActive: boolean;
  onToggle: (clientId: string) => void;
}

export function TimeTracker({ 
  clientId, 
  clientName, 
  onTimeRecorded, 
  isActive,
  onToggle 
}: TimeTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  const handleToggle = () => {
    if (!isActive) {
      // Start tracking
      setStartTime(Date.now());
      setElapsedSeconds(0);
    } else {
      // Stop tracking
      if (elapsedSeconds >= 60) { // At least 1 minute
        const hours = elapsedSeconds / 3600;
        onTimeRecorded(clientId, Math.round(hours * 4) / 4); // Round to nearest 15 min
      }
      setStartTime(null);
      setElapsedSeconds(0);
    }
    onToggle(clientId);
  };

  const handleStop = () => {
    if (elapsedSeconds >= 60) {
      const hours = elapsedSeconds / 3600;
      onTimeRecorded(clientId, Math.round(hours * 4) / 4);
    }
    setStartTime(null);
    setElapsedSeconds(0);
    if (isActive) onToggle(clientId);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
      isActive 
        ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10" 
        : "bg-muted/50 border-border/30"
    )}>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleToggle}
        className={cn(
          "w-8 h-8 p-0 rounded-lg transition-all",
          isActive 
            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
            : "bg-success text-success-foreground hover:bg-success/90"
        )}
      >
        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      
      {isActive && (
        <>
          <span className="font-mono text-sm font-bold min-w-[70px]">
            {formatTime(elapsedSeconds)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStop}
            className="w-8 h-8 p-0 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Square className="w-4 h-4" />
          </Button>
        </>
      )}
      
      {!isActive && (
        <span className="text-xs text-muted-foreground">Chrono</span>
      )}
    </div>
  );
}
