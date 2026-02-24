/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Users, FileCheck, Calculator, Clock, TrendingUp, Building2,
    Crown, Shield, UserCheck, BarChart3, Activity, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyShort } from '@/lib/calculations';
import { Progress } from '@/components/ui/progress';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface CollaboratorStats {
    userId: string;
    name: string;
    email: string;
    role: string;
    clientCount: number;
    tvaCompleted: number;
    tvaTotal: number;
    bilanAvgProgress: number;
    timeHours: number;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    manager: { label: 'Gérant', icon: Crown, color: 'text-yellow-500' },
    team_lead: { label: 'Chef de Mission', icon: Shield, color: 'text-primary' },
    collaborator: { label: 'Salarié', icon: UserCheck, color: 'text-muted-foreground' },
};

const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
];

export default function CabinetOverview() {
    const { currentOrg, members, userRole, refreshMembers } = useOrganization();
    const [stats, setStats] = useState<CollaboratorStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<string>('all');

    useEffect(() => {
        if (currentOrg && members.length > 0) {
            loadStats();
        }
    }, [currentOrg, members]);

    const loadStats = async () => {
        if (!currentOrg) return;
        setLoading(true);
        try {
            // Get all member user IDs
            const memberIds = members.map(m => m.user_id);

            // Fetch all clients for these users
            const { data: allClients } = await supabase
                .from('clients')
                .select('id, user_id')
                .in('user_id', memberIds);

            // Fetch all TVA records
            const clientIds = (allClients || []).map(c => c.id);
            const { data: allTva } = clientIds.length > 0
                ? await supabase.from('tva_history').select('client_id, step_tele').in('client_id', clientIds)
                : { data: [] };

            // Fetch all bilan cycles
            const { data: allBilan } = clientIds.length > 0
                ? await supabase.from('bilan_cycles').select('client_id, items').in('client_id', clientIds)
                : { data: [] };

            // Fetch all time entries for current month
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const { data: allTime } = await supabase
                .from('time_entries')
                .select('user_id, duration_hours')
                .in('user_id', memberIds)
                .gte('entry_date', monthStart);

            // Build per-user stats
            const clientsByUser = new Map<string, string[]>();
            (allClients || []).forEach(c => {
                const list = clientsByUser.get(c.user_id) || [];
                list.push(c.id);
                clientsByUser.set(c.user_id, list);
            });

            const collaboratorStats: CollaboratorStats[] = members.map(member => {
                const userClients = clientsByUser.get(member.user_id) || [];
                const userTva = (allTva || []).filter(t => userClients.includes(t.client_id));
                const userBilan = (allBilan || []).filter(b => userClients.includes(b.client_id));
                const userTime = (allTime || []).filter(t => t.user_id === member.user_id);

                // Calculate bilan avg progress
                let bilanAvg = 0;
                if (userBilan.length > 0) {
                    const progresses = userBilan.map(b => {
                        try {
                            const items = typeof b.items === 'string' ? JSON.parse(b.items) : b.items;
                            if (Array.isArray(items) && items.length > 0) {
                                const done = items.filter((i: any) => i.done || i.completed).length;
                                return (done / items.length) * 100;
                            }
                        } catch { /* ignore parsing error */ }
                        return 0;
                    });
                    bilanAvg = progresses.reduce((a, b) => a + b, 0) / progresses.length;
                }

                return {
                    userId: member.user_id,
                    name: member.profile?.full_name || member.profile?.email || 'Inconnu',
                    email: member.profile?.email || '',
                    role: member.role,
                    clientCount: userClients.length,
                    tvaCompleted: userTva.filter(t => t.step_tele).length,
                    tvaTotal: userTva.length,
                    bilanAvgProgress: Math.round(bilanAvg),
                    timeHours: userTime.reduce((sum, t) => sum + (t.duration_hours || 0), 0),
                };
            });

            setStats(collaboratorStats);
        } catch (err) {
            console.error('Error loading cabinet stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStats = useMemo(() => {
        if (filterRole === 'all') return stats;
        return stats.filter(s => s.role === filterRole);
    }, [stats, filterRole]);

    // Aggregate KPIs
    const totals = useMemo(() => ({
        members: stats.length,
        clients: stats.reduce((s, c) => s + c.clientCount, 0),
        tvaCompleted: stats.reduce((s, c) => s + c.tvaCompleted, 0),
        tvaTotal: stats.reduce((s, c) => s + c.tvaTotal, 0),
        totalHours: stats.reduce((s, c) => s + c.timeHours, 0),
        avgBilan: stats.length > 0
            ? Math.round(stats.reduce((s, c) => s + c.bilanAvgProgress, 0) / stats.length)
            : 0,
    }), [stats]);

    // Chart data
    const chartClientData = useMemo(() =>
        filteredStats.map(s => ({ name: s.name.split(' ')[0], dossiers: s.clientCount })),
        [filteredStats]);

    const chartTimeData = useMemo(() =>
        filteredStats.map(s => ({ name: s.name.split(' ')[0], heures: Math.round(s.timeHours * 10) / 10 })),
        [filteredStats]);

    const chartTvaData = useMemo(() =>
        filteredStats.map(s => ({
            name: s.name.split(' ')[0],
            fait: s.tvaCompleted,
            restant: s.tvaTotal - s.tvaCompleted,
        })),
        [filteredStats]);

    const roleDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        stats.forEach(s => { counts[s.role] = (counts[s.role] || 0) + 1; });
        return Object.entries(counts).map(([role, count]) => ({
            name: ROLE_LABELS[role]?.label || role,
            value: count,
        }));
    }, [stats]);

    if (userRole !== 'manager' && userRole !== 'team_lead') {
        return (
            <MainLayout>
                <div className="p-8 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
                    <p className="text-muted-foreground">La vue cabinet est réservée aux gérants et chefs de mission.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        Vue Cabinet
                    </h1>
                    <p className="text-muted-foreground mt-2">{currentOrg?.name} — Vue d'ensemble de la production</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                        { label: 'Membres', value: totals.members, icon: Users, color: 'text-primary' },
                        { label: 'Dossiers', value: totals.clients, icon: FileCheck, color: 'text-chart-2' },
                        { label: 'TVA terminées', value: `${totals.tvaCompleted}/${totals.tvaTotal}`, icon: Calculator, color: 'text-chart-3' },
                        { label: 'Avg. Bilan', value: `${totals.avgBilan}%`, icon: TrendingUp, color: 'text-chart-4' },
                        { label: 'Heures (mois)', value: `${Math.round(totals.totalHours)}h`, icon: Clock, color: 'text-chart-5' },
                        { label: 'Taux TVA', value: totals.tvaTotal > 0 ? `${Math.round((totals.tvaCompleted / totals.tvaTotal) * 100)}%` : '—', icon: Activity, color: 'text-success' },
                    ].map((kpi, i) => (
                        <div key={i} className="bento-card p-4 text-center">
                            <kpi.icon className={cn('w-5 h-5 mx-auto mb-2', kpi.color)} />
                            <p className="text-2xl font-bold">{kpi.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtrer par rôle :</span>
                    {['all', 'manager', 'team_lead', 'collaborator'].map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={cn(
                                'px-3 py-1 rounded-xl text-xs font-medium transition-all',
                                filterRole === role
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                        >
                            {role === 'all' ? 'Tous' : ROLE_LABELS[role]?.label || role}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : (
                    <>
                        {/* Charts Row */}
                        <div className="grid lg:grid-cols-3 gap-6 mb-8">
                            {/* Dossiers par collaborateur */}
                            <div className="bento-card p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-primary" /> Dossiers par collaborateur
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartClientData}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <RechartsTooltip />
                                        <Bar dataKey="dossiers" radius={[6, 6, 0, 0]}>
                                            {chartClientData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Heures par collaborateur */}
                            <div className="bento-card p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" /> Heures (mois en cours)
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartTimeData}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <RechartsTooltip />
                                        <Bar dataKey="heures" radius={[6, 6, 0, 0]}>
                                            {chartTimeData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Répartition des rôles */}
                            <div className="bento-card p-6">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Répartition des rôles
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={roleDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name} (${value})`}
                                        >
                                            {roleDistribution.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Collaborator Table */}
                        <div className="bento-card overflow-hidden">
                            <div className="p-4 border-b border-border/50">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Détail par collaborateur
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">Collaborateur</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Rôle</th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">Dossiers</th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">TVA</th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">Bilan Avg.</th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">Heures</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStats.map((s, i) => {
                                            const roleInfo = ROLE_LABELS[s.role] || ROLE_LABELS.collaborator;
                                            const RoleIcon = roleInfo.icon;
                                            const tvaPercent = s.tvaTotal > 0 ? Math.round((s.tvaCompleted / s.tvaTotal) * 100) : 0;

                                            return (
                                                <tr key={s.userId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                                                style={{ background: CHART_COLORS[i % CHART_COLORS.length] + '20', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                                                {s.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{s.name}</p>
                                                                <p className="text-xs text-muted-foreground">{s.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={cn('flex items-center gap-1.5 text-xs font-medium', roleInfo.color)}>
                                                            <RoleIcon className="w-3.5 h-3.5" />
                                                            {roleInfo.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-center font-semibold">{s.clientCount}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2 justify-center">
                                                            <Progress value={tvaPercent} className="w-16 h-1.5" />
                                                            <span className="text-xs">{s.tvaCompleted}/{s.tvaTotal}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2 justify-center">
                                                            <Progress value={s.bilanAvgProgress} className="w-16 h-1.5" />
                                                            <span className="text-xs">{s.bilanAvgProgress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center font-semibold">
                                                        {Math.round(s.timeHours * 10) / 10}h
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredStats.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                    Aucun collaborateur à afficher.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
