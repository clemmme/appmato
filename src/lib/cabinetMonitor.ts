import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from 'date-fns';

export interface CabinetAlert {
    type: 'delay' | 'deadline' | 'info';
    severity: 'low' | 'medium' | 'high';
    title: string;
    message: string;
    clientName?: string;
    dueDate?: Date;
}

/**
 * Scans the database for potential delays or upcoming deadlines
 */
export async function getCabinetAlerts(): Promise<CabinetAlert[]> {
    const alerts: CabinetAlert[] = [];
    const now = new Date();
    const currentPeriod = format(now, 'yyyy-MM');

    try {
        // 1. Check TVA Deadlines (Deadlines)
        const { data: tvaData } = await supabase
            .from('tva_history')
            .select('*, clients(name, day)')
            .eq('period', currentPeriod);

        if (tvaData) {
            tvaData.forEach((item: any) => {
                const day = parseInt(item.clients?.day || '15');
                const deadlineDate = new Date(now.getFullYear(), now.getMonth(), day);

                // If deadline is in less than 3 days and not transmitted
                if (!item.step_tele && isBefore(now, deadlineDate) && isAfter(addDays(now, 3), deadlineDate)) {
                    alerts.push({
                        type: 'deadline',
                        severity: 'high',
                        title: 'Échéance TVA imminente',
                        message: `La TVA de ${item.clients?.name} doit être télétransmise avant le ${day} du mois.`,
                        clientName: item.clients?.name,
                        dueDate: deadlineDate
                    });
                }
            });
        }

        // 2. Check for missing time entries (Delays) - Simplified logic
        // We look for clients where no work has been recorded recently
        const { data: recentTime } = await supabase
            .from('time_entries')
            .select('client_id, entry_date')
            .gte('entry_date', format(addDays(now, -15), 'yyyy-MM-dd'));

        const { data: allClients } = await supabase.from('clients').select('id, name');

        if (allClients && recentTime) {
            const activeClientIds = new Set(recentTime.map(t => t.client_id));
            allClients.slice(0, 10).forEach(client => { // Limit for now
                if (!activeClientIds.has(client.id)) {
                    alerts.push({
                        type: 'delay',
                        severity: 'medium',
                        title: 'Dossier inactif',
                        message: `Aucune activité enregistrée pour ${client.name} depuis plus de 15 jours.`,
                        clientName: client.name
                    });
                }
            });
        }

    } catch (error) {
        console.error('Error fetching cabinet alerts:', error);
    }

    return alerts;
}
