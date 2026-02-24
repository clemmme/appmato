/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { BilanView } from '@/components/production/BilanView';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Client, BilanCycle, ItemStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export default function Bilan() {
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

  const handleUpdateRevision = useCallback(async (clientId: string, cycleId: string, level: number) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const { error } = await supabase.from('bilan_cycles').update({ revision_level: level }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, revision_level: level } : c)); return newMap; });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: level, items: {} } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleUpdateItem = useCallback(async (clientId: string, cycleId: string, itemIndex: number, status: ItemStatus) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const newItems = { ...existing.items, [itemIndex.toString()]: status };
        const { error } = await supabase.from('bilan_cycles').update({ items: newItems }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, items: newItems } : c)); return newMap; });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: 0, items: { [itemIndex.toString()]: status } } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleUpdateNotes = useCallback(async (clientId: string, cycleId: string, notes: string) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const { error } = await supabase.from('bilan_cycles').update({ notes }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, notes } as BilanCycle : c));
          return newMap;
        });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: 0, items: {}, notes } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleToggleSupervision = useCallback(async (clientId: string, cycleId: string, mode: boolean) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const { error } = await supabase.from('bilan_cycles').update({ supervision_mode: mode }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, supervision_mode: mode } : c));
          return newMap;
        });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: 0, items: {}, supervision_mode: mode } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleUpdateRdvChef = useCallback(async (clientId: string, cycleId: string, date: string | null) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const { error } = await supabase.from('bilan_cycles').update({ rdv_chef_date: date }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, rdv_chef_date: date } : c));
          return newMap;
        });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: 0, items: {}, rdv_chef_date: date } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleUpdateCriticalPoints = useCallback(async (clientId: string, cycleId: string, points: string[]) => {
    const existingCycles = bilanCyclesMap.get(clientId) || [];
    const existing = existingCycles.find(c => c.cycle_id === cycleId);
    try {
      if (existing) {
        const { error } = await supabase.from('bilan_cycles').update({ critical_points: points }).eq('id', existing.id);
        if (error) throw error;
        setBilanCyclesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(clientId, (newMap.get(clientId) || []).map(c => c.id === existing.id ? { ...c, critical_points: points } : c));
          return newMap;
        });
      } else {
        const { data, error } = await supabase.from('bilan_cycles').insert({ client_id: clientId, cycle_id: cycleId, revision_level: 0, items: {}, critical_points: points } as any).select().single();
        if (error) throw error;
        if (data) setBilanCyclesMap(prev => { const newMap = new Map(prev); newMap.set(clientId, [...(newMap.get(clientId) || []), data as BilanCycle]); return newMap; });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [bilanCyclesMap, toast]);

  const handleSaveSupervision = useCallback(async (clientId: string, data: any) => {
    toast({
      title: "Supervision validée",
      description: "La fiche de supervision a été enregistrée.",
    });
  }, [toast]);

  const handleCreateCalendarEvent = useCallback(async (clientId: string, date: string, clientName: string, guestId?: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('time_entries').insert({
        user_id: user.id,
        client_id: clientId,
        entry_date: date,
        start_time: '10:00',
        entry_type: 'event',
        event_category: 'supervision',
        mission_type: 'Révision',
        duration_hours: 1,
        comment: `RDV Supervision - ${clientName}`,
        ...(guestId ? {
          guest_id: guestId,
          guest_status: 'pending'
        } : {})
      } as any);
      if (error) throw error;
      toast({
        title: "Événement créé",
        description: `RDV du ${date} ajouté au calendrier.`,
      });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  if (loading) return <MainLayout><div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></MainLayout>;

  return (
    <MainLayout>
      <BilanView
        clients={clients}
        bilanCyclesMap={bilanCyclesMap}
        onUpdateRevision={handleUpdateRevision}
        onUpdateItem={handleUpdateItem}
        onUpdateNotes={handleUpdateNotes}
        onToggleSupervision={handleToggleSupervision}
        onUpdateRdvChef={handleUpdateRdvChef}
        onUpdateCriticalPoints={handleUpdateCriticalPoints}
        onSaveSupervision={handleSaveSupervision}
        onCreateCalendarEvent={handleCreateCalendarEvent}
      />
    </MainLayout>
  );
}