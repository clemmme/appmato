/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClotureAnnuelleView } from '@/components/production/ClotureAnnuelleView';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Client, BilanCycle } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface ClotureData {
  id?: string;
  client_id: string;
  exercice: string;
  rdv_bilan_date?: string;
  rdv_bilan_time?: string;
  rdv_bilan_duration?: number;
  rdv_bilan_done?: boolean;
  liasse_montee?: boolean;
  liasse_validee?: boolean;
  liasse_envoyee?: boolean;
  liasse_accuse_dgfip?: boolean;
  capital_social?: number;
  benefice_net?: number;
  reserve_legale_actuelle?: number;
  reserve_legale_dotation?: number;
  affectation_dividendes?: number;
  affectation_report?: number;
  continuite_exploitation?: boolean;
  conventions_reglementees?: { description: string; montant: number }[];
  remuneration_gerant?: number;
  charges_sociales_gerant?: number;
  fec_genere?: boolean;
  fec_envoye?: boolean;
  exercice_cloture?: boolean;
  status?: string;
}

export default function Cloture() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [bilanCyclesMap, setBilanCyclesMap] = useState<Map<string, BilanCycle[]>>(new Map());
  const [cloturesMap, setCloturesMap] = useState<Map<string, ClotureData>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, bilanRes, clotureRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('bilan_cycles').select('*'),
        supabase.from('cloture_annuelle').select('*')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bilanRes.error) throw bilanRes.error;
      if (clotureRes.error) throw clotureRes.error;

      setClients((clientsRes.data || []) as Client[]);

      const cyclesMap = new Map<string, BilanCycle[]>();
      ((bilanRes.data || []) as BilanCycle[]).forEach(cycle => {
        const existing = cyclesMap.get(cycle.client_id) || [];
        existing.push(cycle);
        cyclesMap.set(cycle.client_id, existing);
      });
      setBilanCyclesMap(cyclesMap);

      const cloMap = new Map<string, ClotureData>();
      ((clotureRes.data || []) as unknown as ClotureData[]).forEach(c => {
        cloMap.set(c.client_id, c);
      });
      setCloturesMap(cloMap);
    } catch (error) {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleSaveCloture = useCallback(async (data: ClotureData) => {
    try {
      const existing = cloturesMap.get(data.client_id);

      if (existing?.id) {
        const { error } = await supabase.from('cloture_annuelle').update({
          ...data,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('cloture_annuelle').insert(data as any).select().single();
        if (error) throw error;
        data.id = inserted?.id;
      }

      setCloturesMap(prev => {
        const newMap = new Map(prev);
        newMap.set(data.client_id, { ...existing, ...data });
        return newMap;
      });

      toast({ title: "Sauvegardé", description: "Les données ont été enregistrées." });
    } catch (error) {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    }
  }, [cloturesMap, toast]);

  const handleCreateCalendarEvent = useCallback(async (
    clientId: string,
    date: string,
    time: string,
    duration: number,
    title: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('time_entries').insert({
        user_id: user.id,
        client_id: clientId,
        entry_date: date,
        start_time: time,
        entry_type: 'client',
        event_category: 'meeting',
        mission_type: 'RDV Bilan',
        duration_hours: duration / 60,
        comment: title,
      } as any);

      if (error) throw error;
      toast({ title: "RDV planifié", description: "L'événement a été ajouté au Calendrier." });
    } catch (error) {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    }
  }, [user, toast]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ClotureAnnuelleView
        clients={clients}
        bilanCyclesMap={bilanCyclesMap}
        cloturesMap={cloturesMap}
        onSaveCloture={handleSaveCloture}
        onCreateCalendarEvent={handleCreateCalendarEvent}
      />
    </MainLayout>
  );
}
