/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SupervisionView } from '@/components/production/SupervisionView';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Client, BilanCycle } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export default function Supervision() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [bilanCyclesMap, setBilanCyclesMap] = useState<Map<string, BilanCycle[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*').order('name');
      if (clientsError) throw clientsError;
      setClients((clientsData || []) as Client[]);

      const { data: bilanData, error: bilanError } = await supabase.from('bilan_cycles').select('*');
      if (bilanError) throw bilanError;

      const cyclesMap = new Map<string, BilanCycle[]>();
      ((bilanData || []) as BilanCycle[]).forEach(cycle => {
        const existing = cyclesMap.get(cycle.client_id) || [];
        existing.push(cycle);
        cyclesMap.set(cycle.client_id, existing);
      });
      setBilanCyclesMap(cyclesMap);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleUpdateSupervisionStatus = useCallback(async (clientId: string, status: string) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    if (existingCycles.length === 0) return;

    try {
      // Update all cycles for this client with the new supervision status
      for (const cycle of existingCycles) {
        const { error } = await supabase.from('bilan_cycles').update({
          supervision_status: status
        }).eq('id', cycle.id);
        if (error) throw error;
      }

      // Update local state
      setBilanCyclesMap(prev => {
        const newMap = new Map(prev);
        const cycles = newMap.get(clientId) || [];
        newMap.set(clientId, cycles.map(c => ({ ...c, supervision_status: status } as BilanCycle)));
        return newMap;
      });

      toast({ title: "Statut mis à jour", description: `Dossier passé en "${status}"` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleUpdateRdvDate = useCallback(async (clientId: string, date: string) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    if (existingCycles.length === 0) return;

    const firstCycle = existingCycles[0];

    try {
      const { error } = await supabase.from('bilan_cycles').update({
        rdv_chef_date: date
      }).eq('id', firstCycle.id);

      if (error) throw error;

      // Create calendar event
      if (user && date) {
        const client = clients.find(c => c.id === clientId);
        const { error: insertError } = await supabase.from('time_entries').insert({
          user_id: user.id,
          client_id: clientId,
          entry_date: date,
          start_time: '10:00',
          entry_type: 'client',
          event_category: 'supervision',
          mission_type: 'Supervision',
          duration_hours: 1,
          comment: `RDV Supervision - ${client?.name || 'Client'}`,
        } as any);
        if (insertError) throw insertError;
      }

      // Update local state
      setBilanCyclesMap(prev => {
        const newMap = new Map(prev);
        const cycles = newMap.get(clientId) || [];
        if (cycles.length > 0) {
          cycles[0] = { ...cycles[0], rdv_chef_date: date } as BilanCycle;
        }
        newMap.set(clientId, cycles);
        return newMap;
      });

      toast({ title: "RDV planifié", description: `Événement créé dans le Calendrier pour le ${date}` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, user, clients, toast]);

  if (loading) return <MainLayout><div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></MainLayout>;

  return (
    <MainLayout>
      <SupervisionView
        clients={clients}
        bilanCyclesMap={bilanCyclesMap}
        onUpdateStatus={handleUpdateSupervisionStatus}
        onUpdateRdvDate={handleUpdateRdvDate}
      />
    </MainLayout>
  );
}
