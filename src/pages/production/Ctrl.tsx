/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CtrlView, type DeclarationData } from '@/components/production/CtrlView';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTVAKey } from '@/lib/calculations';
import type { Client, TVAHistory } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export default function Ctrl() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [tvaHistories, setTvaHistories] = useState<TVAHistory[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAllTVAHistories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('tva_history').select('*');
      if (error) throw error;
      setTvaHistories((data || []) as TVAHistory[]);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => { if (user) loadClients(); }, [user, loadClients]);
  useEffect(() => { if (user && clients.length > 0) loadAllTVAHistories(); }, [user, clients.length, loadAllTVAHistories]);

  const handleUpdateTVA = useCallback(async (clientId: string, field: string, value: string | boolean | number) => {
    const period = getTVAKey(currentDate);
    const existing = tvaHistories.find(h => h.client_id === clientId && h.period === period);
    try {
      if (existing) {
        const { error } = await supabase.from('tva_history').update({ [field]: value }).eq('id', existing.id);
        if (error) throw error;
        setTvaHistories(prev => prev.map(h => h.id === existing.id ? { ...h, [field]: value } : h));
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [tvaHistories, currentDate, toast]);

  const handleValidateDeclaration = useCallback(async (clientId: string, data: DeclarationData) => {
    const period = getTVAKey(currentDate);
    const existing = tvaHistories.find(h => h.client_id === clientId && h.period === period);
    const totalCollectee = (data.tva_collectee_20 || 0) + (data.tva_collectee_10 || 0) + (data.tva_collectee_55 || 0) +
      (data.lines ? data.lines.filter(l => l.type === 'collectee' && !['normal_20', 'intermediaire_10', 'reduit_55'].includes(l.category)).reduce((s, l) => s + l.tva, 0) : 0);
    const totalDeductible = (data.tva_deductible_immobilisations || 0) + (data.tva_deductible_biens_services || 0) + (data.credit_precedent || 0);
    const tvaNet = totalCollectee - totalDeductible;
    const credit = tvaNet < 0 ? Math.abs(tvaNet) : 0;
    const amount = tvaNet > 0 ? tvaNet : 0;

    const record = {
      client_id: clientId,
      period,
      amount,
      credit,
      step_compta: true,
      step_saisie: true,
      step_revise: true,
      step_calcul: true,
      step_tele: true,
      step_valide: true,
      note: data.note_next_month || '',
    };

    try {
      if (existing) {
        const { error } = await supabase.from('tva_history').update(record).eq('id', existing.id);
        if (error) throw error;
        setTvaHistories(prev => prev.map(h => h.id === existing.id ? { ...h, ...record } : h));
      } else {
        const { data: inserted, error } = await supabase.from('tva_history').insert(record as any).select().single();
        if (error) throw error;
        if (inserted) setTvaHistories(prev => [...prev, inserted as TVAHistory]);
      }
      toast({ title: "✅ Déclaration validée", description: `${credit > 0 ? `Crédit de ${credit.toFixed(2)}€ reporté` : `TVA à payer: ${amount.toFixed(2)}€`}` });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [tvaHistories, currentDate, toast]);

  if (loading) return <MainLayout><div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></MainLayout>;

  return (
    <MainLayout>
      <CtrlView
        clients={clients}
        tvaHistories={tvaHistories}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onUpdateTVA={handleUpdateTVA}
        onValidateDeclaration={handleValidateDeclaration}
      />
    </MainLayout>
  );
}
