/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TimerState {
  isActive: boolean;
  clientId: string | null;
  clientName: string;
  startTime: number | null;
  originalStartTime: number | null;
  elapsedSeconds: number;
  pausedElapsed: number;
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: (clientId: string, clientName: string) => void;
  resumeTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  requestRecordTime: () => void;
  recordTimeWithDetails: (missionType: string, comment: string, adjustedSeconds: number) => Promise<void>;
  isRecordModalOpen: boolean;
  closeRecordModal: () => void;
}

const STORAGE_KEY = 'appmato_timer_state';

const defaultState: TimerState = {
  isActive: false,
  clientId: null,
  clientName: '',
  startTime: null,
  originalStartTime: null,
  elapsedSeconds: 0,
  pausedElapsed: 0,
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isActive && parsed.startTime) {
          const now = Date.now();
          parsed.elapsedSeconds = parsed.pausedElapsed + Math.floor((now - parsed.startTime) / 1000);
        }
        return parsed;
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  // Update elapsed seconds every second
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerState.isActive && timerState.startTime) {
      interval = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedSeconds: prev.pausedElapsed + Math.floor((Date.now() - prev.startTime!) / 1000)
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isActive, timerState.startTime]);

  const startTimer = useCallback((clientId: string, clientName: string) => {
    const now = Date.now();
    setTimerState({
      isActive: true,
      clientId,
      clientName,
      startTime: now,
      originalStartTime: now,
      elapsedSeconds: 0,
      pausedElapsed: 0,
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isActive: true,
      startTime: Date.now(),
      pausedElapsed: prev.elapsedSeconds,
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      startTime: null,
      pausedElapsed: prev.elapsedSeconds,
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setTimerState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
    setIsRecordModalOpen(false);
  }, []);

  // Opens the record modal when stopping
  const requestRecordTime = useCallback(() => {
    if (!timerState.clientId) return;
    
    // Pause the timer first
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      startTime: null,
      pausedElapsed: prev.elapsedSeconds,
    }));
    
    // Open the modal
    setIsRecordModalOpen(true);
  }, [timerState.clientId]);

  const closeRecordModal = useCallback(() => {
    setIsRecordModalOpen(false);
  }, []);

  // Record time with mission type and comment - now includes start_time for calendar integration
  const recordTimeWithDetails = useCallback(async (
    missionType: string, 
    comment: string, 
    adjustedSeconds: number
  ) => {
    if (!user || !timerState.clientId || adjustedSeconds < 60) {
      toast({
        title: "Temps non enregistré",
        description: "Le chrono doit être d'au moins 1 minute.",
        variant: "destructive"
      });
      return;
    }

    const hours = adjustedSeconds / 3600;
    const roundedHours = Math.round(hours * 4) / 4;
    
    // Use the original start time stored when timer was first started
    const timerStartDate = timerState.originalStartTime 
      ? new Date(timerState.originalStartTime)
      : new Date();
    const startTimeStr = timerStartDate.toTimeString().slice(0, 5);

    try {
      const { error } = await (supabase as any)
        .from('time_entries')
        .insert({
          user_id: user.id,
          client_id: timerState.clientId,
          entry_date: new Date().toISOString().split('T')[0],
          start_time: startTimeStr,
          entry_type: 'client',
          event_category: 'work',
          mission_type: missionType,
          duration_hours: roundedHours,
          comment: comment || 'Chrono automatique',
        });

      if (error) throw error;

      toast({
        title: "Temps enregistré ✓",
        description: `${roundedHours.toFixed(2)}h (${missionType}) pour ${timerState.clientName}`,
      });

      stopTimer();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [user, timerState, toast, stopTimer]);

  return (
    <TimerContext.Provider value={{ 
      timerState, 
      startTimer, 
      resumeTimer, 
      pauseTimer, 
      stopTimer, 
      requestRecordTime,
      recordTimeWithDetails,
      isRecordModalOpen,
      closeRecordModal,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
