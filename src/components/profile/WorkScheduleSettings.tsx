/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Clock, Calendar, Coffee, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WorkSchedule {
  work_start_time: string;
  work_end_time: string;
  lunch_duration_minutes: number;
  work_days: string[];
}

const ALL_DAYS = [
  { id: 'lundi', label: 'Lun' },
  { id: 'mardi', label: 'Mar' },
  { id: 'mercredi', label: 'Mer' },
  { id: 'jeudi', label: 'Jeu' },
  { id: 'vendredi', label: 'Ven' },
  { id: 'samedi', label: 'Sam' },
  { id: 'dimanche', label: 'Dim' },
];

export function WorkScheduleSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WorkSchedule>({
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_duration_minutes: 60,
    work_days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
  });

  useEffect(() => {
    if (user) fetchSchedule();
  }, [user]);

  const fetchSchedule = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('work_start_time, work_end_time, lunch_duration_minutes, work_days')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSchedule({
          work_start_time: data.work_start_time || '09:00',
          work_end_time: data.work_end_time || '18:00',
          lunch_duration_minutes: data.lunch_duration_minutes || 60,
          work_days: (data.work_days as string[]) || ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
        });
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          work_start_time: schedule.work_start_time,
          work_end_time: schedule.work_end_time,
          lunch_duration_minutes: schedule.lunch_duration_minutes,
          work_days: schedule.work_days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Horaires enregistrés',
        description: 'Vos paramètres de temps de travail ont été mis à jour.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter((d) => d !== day)
        : [...prev.work_days, day],
    }));
  };

  // Calculate daily work hours
  const calculateDailyHours = () => {
    const [startH, startM] = schedule.work_start_time.split(':').map(Number);
    const [endH, endM] = schedule.work_end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const workMinutes = endMinutes - startMinutes - schedule.lunch_duration_minutes;
    return (workMinutes / 60).toFixed(1);
  };

  const calculateWeeklyHours = () => {
    return (parseFloat(calculateDailyHours()) * schedule.work_days.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Horaires de travail</h3>
          <p className="text-sm text-muted-foreground">
            Définissez vos heures pour calculer votre taux d'occupation
          </p>
        </div>
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="stat-label mb-2">Heure de début</Label>
          <Input
            type="time"
            value={schedule.work_start_time}
            onChange={(e) => setSchedule({ ...schedule, work_start_time: e.target.value })}
            className="input-premium"
          />
        </div>
        <div>
          <Label className="stat-label mb-2">Heure de fin</Label>
          <Input
            type="time"
            value={schedule.work_end_time}
            onChange={(e) => setSchedule({ ...schedule, work_end_time: e.target.value })}
            className="input-premium"
          />
        </div>
      </div>

      {/* Lunch Duration */}
      <div>
        <Label className="stat-label mb-2 flex items-center gap-2">
          <Coffee className="w-4 h-4" />
          Pause déjeuner (minutes)
        </Label>
        <Input
          type="number"
          min="0"
          max="180"
          step="15"
          value={schedule.lunch_duration_minutes}
          onChange={(e) =>
            setSchedule({ ...schedule, lunch_duration_minutes: parseInt(e.target.value) || 0 })
          }
          className="input-premium max-w-[150px]"
        />
      </div>

      {/* Work Days */}
      <div>
        <Label className="stat-label mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Jours travaillés
        </Label>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDay(day.id)}
              className={cn(
                'px-4 py-2 rounded-xl font-medium text-sm transition-all',
                schedule.work_days.includes(day.id)
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-2xl">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Résumé</p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Heures/jour: </span>
            <span className="font-bold">{calculateDailyHours()}h</span>
          </div>
          <div>
            <span className="text-muted-foreground">Heures/semaine: </span>
            <span className="font-bold">{calculateWeeklyHours()}h</span>
          </div>
          <div>
            <span className="text-muted-foreground">Jours: </span>
            <span className="font-bold">{schedule.work_days.length}/7</span>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Enregistrer
      </Button>
    </div>
  );
}
