/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClientsView } from '@/components/clients/ClientsView';
import { ClientImportModal } from '@/components/clients/ClientImportModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Client, BilanCycle, TVAHistory } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { translateError } from '@/lib/error-translator';

interface ImportedClient {
  ref: string;
  form: string;
  name: string;
  siren: string;
  code_ape: string;
  closing_date: string;
  regime: 'M' | 'T' | 'A' | 'N';
  day: string;
  manager_email?: string;
  phone?: string;
  address?: string;
  fee_compta?: number;
  fee_social?: number;
  fee_juridique?: number;
  annual_fee?: number;
  invoices_per_month?: number;
  entries_count?: number;
  establishments_count?: number;
}

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
  mission_type?: string;
  entry_date?: string;
}

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [bilanCycles, setBilanCycles] = useState<BilanCycle[]>([]);
  const [tvaHistories, setTvaHistories] = useState<TVAHistory[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const [clientsRes, bilanRes, tvaRes, timeRes] = await Promise.all([
        supabase.from('clients').select('*, profile:profiles!user_id(full_name, email)').order('name'),
        supabase.from('bilan_cycles').select('*'),
        supabase.from('tva_history').select('*'),
        supabase.from('time_entries').select('client_id, duration_hours, mission_type, entry_date').eq('entry_type', 'client')
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bilanRes.error) throw bilanRes.error;
      if (tvaRes.error) throw tvaRes.error;
      if (timeRes.error) throw timeRes.error;

      setClients((clientsRes.data || []) as unknown as Client[]);
      setBilanCycles((bilanRes.data || []) as BilanCycle[]);
      setTvaHistories((tvaRes.data || []) as TVAHistory[]);
      setTimeEntries((timeRes.data || []) as TimeEntryData[]);
    } catch (error) {
      toast({ title: "Erreur", description: translateError(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, loadClients]);

  const handleAdd = useCallback(async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, user_id: user!.id } as any)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setClients(prev => [...prev, data as Client].sort((a, b) => a.name.localeCompare(b.name)));
        toast({ title: "Succès", description: "Client créé" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: translateError(error), variant: "destructive" });
    }
  }, [user, toast]);

  const handleUpdate = useCallback(async (id: string, client: Partial<Client>) => {
    try {
      const { error } = await supabase.from('clients').update(client).eq('id', id);
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...client } as Client : c));
      toast({ title: "Succès", description: "Client mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", description: translateError(error), variant: "destructive" });
    }
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      toast({ title: "Succès", description: "Client supprimé" });
    } catch (error) {
      toast({ title: "Erreur", description: translateError(error), variant: "destructive" });
    }
  }, [toast]);

  const handleAssign = useCallback(async (clientId: string, userId: string) => {
    try {
      const { error } = await supabase.from('clients').update({ user_id: userId }).eq('id', clientId);
      if (error) throw error;

      // On recharge la liste silencieusement pour récupérer le profile mis à jour
      const { data } = await supabase.from('clients').select('*, profile:profiles!user_id(full_name, email)').eq('id', clientId).single();
      if (data) {
        setClients(prev => prev.map(c => c.id === clientId ? data as unknown as Client : c));
        toast({ title: "Succès", description: "Dossier réattribué avec succès", variant: "default" });
      }
    } catch (error) {
      toast({ title: "Erreur d'attribution", description: translateError(error), variant: "destructive" });
    }
  }, [toast]);

  const handleImport = useCallback(async (importedClients: ImportedClient[]) => {
    if (!user) return;

    try {
      const clientsToInsert = importedClients.map(c => ({
        ref: c.ref,
        name: c.name,
        form: c.form,
        regime: c.regime,
        day: c.day || '15',
        siren: c.siren,
        code_ape: c.code_ape,
        closing_date: c.closing_date,
        user_id: user.id,
        manager_email: c.manager_email || '',
        phone: c.phone || '',
        address: c.address || '',
        fee_compta: c.fee_compta || 0,
        fee_social: c.fee_social || 0,
        fee_juridique: c.fee_juridique || 0,
        annual_fee: c.annual_fee || 0,
        invoices_per_month: c.invoices_per_month || 0,
        entries_count: c.entries_count || 0,
        establishments_count: c.establishments_count || 1,
      }));

      const { data, error } = await supabase
        .from('clients')
        .insert(clientsToInsert as any)
        .select();

      if (error) throw error;

      setClients(prev => [...prev, ...(data as Client[])].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Import réussi",
        description: `${importedClients.length} clients importés avec succès.`
      });
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: translateError(error),
        variant: "destructive"
      });
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
      <ClientsView
        clients={clients}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAssign={handleAssign}
        onOpenImport={() => setShowImportModal(true)}
        bilanCycles={bilanCycles}
        tvaHistories={tvaHistories}
        timeEntries={timeEntries}
      />
      <ClientImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </MainLayout>
  );
}