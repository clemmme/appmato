/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SuiviDossiersView } from '@/components/production/SuiviDossiersView';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { calculateDashboardKPIs, getTVAKey } from '@/lib/calculations';
import type { Client, TVAHistory, BilanCycle } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
}

export default function SuiviDossiers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [tvaHistories, setTvaHistories] = useState<TVAHistory[]>([]);
  const [bilanCyclesMap, setBilanCyclesMap] = useState<Map<string, BilanCycle[]>>(new Map());
  const [timeEntries, setTimeEntries] = useState<TimeEntryData[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  }, []);

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
    if (user) loadData();
  }, [user, loadData]);

  const kpis = useMemo(() => calculateDashboardKPIs(clients, tvaHistories, bilanCyclesMap, currentDate), [clients, tvaHistories, bilanCyclesMap, currentDate]);
  const recentClients = useMemo(() => clients.slice(0, 5).map(c => ({ id: c.id, name: c.name, regime: c.regime })), [clients]);

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></MainLayout>;
  }

  return (
    <MainLayout>
      <SuiviDossiersView
        kpis={kpis}
        recentClients={recentClients}
        clients={clients}
        timeEntries={timeEntries}
      />
    </MainLayout>
  );
}