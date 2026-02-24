import { useState, useEffect, useCallback } from 'react';
import { TVAHub } from '@/components/production/TVAHub';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getTVAKey } from '@/lib/calculations';
import type { Client, TVAHistory } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { translateError } from '@/lib/error-translator';

export function TVAPilotage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [tvaHistories, setTvaHistories] = useState<TVAHistory[]>([]);
    const [currentDate, setCurrentDate] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
    const [loading, setLoading] = useState(true);

    const period = getTVAKey(currentDate);

    const loadClients = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('clients').select('*').order('name');
            if (error) throw error;
            setClients((data || []) as Client[]);
        } catch (error: unknown) {
            toast({ title: "Erreur", description: translateError(error as Error), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const loadTVAHistories = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('tva_history').select('*').eq('period', period);
            if (error) throw error;
            setTvaHistories((data || []) as TVAHistory[]);
        } catch (error: unknown) {
            toast({ title: "Erreur", description: translateError(error as Error), variant: "destructive" });
        }
    }, [period, toast]);

    useEffect(() => { if (user) loadClients(); }, [user, loadClients]);
    useEffect(() => { if (user && clients.length > 0) loadTVAHistories(); }, [user, clients.length, loadTVAHistories]);

    const handleUpdateTVA = useCallback(async (clientId: string, field: string, value: string | boolean | number) => {
        const existing = tvaHistories.find(h => h.client_id === clientId && h.period === period);
        try {
            if (existing) {
                const { error } = await supabase.from('tva_history').update({ [field]: value }).eq('id', existing.id);
                if (error) throw error;
                setTvaHistories(prev => prev.map(h => h.id === existing.id ? { ...h, [field]: value } : h));
            } else {
                const newRecord: Partial<TVAHistory> = { client_id: clientId, period, amount: 0, credit: 0, step_compta: false, step_saisie: false, step_revise: false, step_calcul: false, step_tele: false, step_valide: false, note: '', [field]: value };
                const { data, error } = await supabase.from('tva_history').insert(newRecord as never).select().single();
                if (error) throw error;
                if (data) setTvaHistories(prev => [...prev, data as TVAHistory]);
            }
        } catch (error: unknown) {
            toast({ title: "Erreur", description: translateError(error as Error), variant: "destructive" });
        }
    }, [tvaHistories, period, toast]);

    if (loading) return <div className="flex items-center justify-center h-[750px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

    return <div className="h-[750px] overflow-hidden"><TVAHub clients={clients} tvaHistories={tvaHistories} currentDate={currentDate} onDateChange={setCurrentDate} onUpdateTVA={handleUpdateTVA} /></div>;
}
