/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CabinetDashboard } from '@/components/dashboard/CabinetDashboard';
import { SkeletonDashboard } from '@/components/ui/skeleton-card';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateDashboardKPIs, getTVAKey } from '@/lib/calculations';
import type { Client, TVAHistory, BilanCycle } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [tvaHistories, setTvaHistories] = useState<TVAHistory[]>([]);
  const [bilanCyclesMap, setBilanCyclesMap] = useState<Map<string, BilanCycle[]>>(new Map());
  const [timeEntries, setTimeEntries] = useState<TimeEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name?: string | null; avatar_url?: string | null; email?: string } | null>(null);

  const currentDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  }, []);

  const checkFirstVisit = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('has_completed_tutorial, full_name, avatar_url').eq('id', user.id).single();
      if (data) {
        if (!data.has_completed_tutorial) {
          setShowOnboarding(true);
        }
        setUserProfile({ full_name: data.full_name, avatar_url: data.avatar_url, email: user.email });
      }
    } catch {
      // Fallback localStorage pour compatibilité anciens profils
      const hasSeenOnboarding = localStorage.getItem('appmato_onboarding_complete');
      if (!hasSeenOnboarding) setShowOnboarding(true);
      setUserProfile({ email: user.email });
    }
  }, [user]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    localStorage.setItem('appmato_onboarding_complete', 'true');
    if (user) {
      await supabase.from('profiles').update({ has_completed_tutorial: true }).eq('id', user.id);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, tvaRes, bilanRes, timeRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('tva_history').select('*').eq('period', getTVAKey(currentDate)),
        supabase.from('bilan_cycles').select('*'),
        supabase.from('time_entries').select('client_id, duration_hours').eq('entry_type', 'client')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (tvaRes.error) throw tvaRes.error;
      if (bilanRes.error) throw bilanRes.error;
      if (timeRes.error) throw timeRes.error;

      setClients((clientsRes.data || []) as Client[]);
      setTvaHistories((tvaRes.data || []) as TVAHistory[]);

      const cyclesMap = new Map<string, BilanCycle[]>();
      (bilanRes.data || []).forEach((cycle: any) => {
        const existing = cyclesMap.get(cycle.client_id) || [];
        existing.push(cycle);
        cyclesMap.set(cycle.client_id, existing);
      });
      setBilanCyclesMap(cyclesMap);
      setTimeEntries((timeRes.data || []) as TimeEntryData[]);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => {
    if (user) {
      loadData();
      checkFirstVisit();
    }
  }, [user, loadData, checkFirstVisit]);

  const kpis = useMemo(() => calculateDashboardKPIs(clients, tvaHistories, bilanCyclesMap, currentDate), [clients, tvaHistories, bilanCyclesMap, currentDate]);

  if (loading) {
    return (
      <MainLayout>
        <SkeletonDashboard />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <CabinetDashboard
        clients={clients}
        tvaHistories={tvaHistories}
        bilanCyclesMap={bilanCyclesMap}
        timeEntries={timeEntries}
        kpis={kpis}
        userProfile={userProfile}
      />
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={handleOnboardingComplete}
        onComplete={handleOnboardingComplete}
      />
    </MainLayout>
  );
}
