/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import {
  Sun,
  CloudSun,
  Cloud,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileCheck,
  Eye,
  CheckCircle2,
  Users,
  BarChart3,
  Search,
  PieChart as PieChartIcon,
  UserPlus,
  FileText,
  CalendarDays,
  ClipboardList,
  Calculator,
  Wrench,
  Newspaper,
  Building2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { AnimatedCounter } from '@/components/ui/animated-counter';
import type { Client, BilanCycle, TVAHistory } from '@/lib/database.types';

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
}

interface DashboardProps {
  clients: Client[];
  tvaHistories: TVAHistory[];
  bilanCyclesMap: Map<string, BilanCycle[]>;
  timeEntries: TimeEntryData[];
  kpis: {
    tvaToDoCount: number;
    tvaCompleteCount: number;
    tvaLateCount: number;
    bilanProgressAvg: number;
    bilanCompleteCount: number;
  };
  userProfile?: { full_name?: string | null; avatar_url?: string | null; email?: string } | null;
}

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  let greeting = 'Bonsoir';
  if (hour < 7) greeting = 'Bonne nuit';
  else if (hour < 12) greeting = 'Bonjour';
  else if (hour < 14) greeting = 'Bon appétit';
  else if (hour < 18) greeting = 'Bon après-midi';

  return name ? `${greeting}, ${name}` : greeting;
}

function getMotivationalQuote(): string {
  const quotes = [
    "Chaque dossier traité est un pas vers l'excellence.",
    "La rigueur d'aujourd'hui construit la sérénité de demain.",
    "Un bon pilotage, c'est anticiper plutôt que subir.",
    "La productivité naît de l'organisation.",
    "Simplifiez, automatisez, excellez.",
  ];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

const LAUNCHPAD_MODULES = [
  { label: 'Suivi des Dossiers', icon: ClipboardList, path: '/production/suivi-dossiers', color: 'from-blue-500/20 to-transparent', iconColor: 'text-blue-500', desc: "Avancement global" },
  { label: 'Pilotage TVA', icon: Calculator, path: '/production/tva', color: 'from-emerald-500/20 to-transparent', iconColor: 'text-emerald-500', desc: "Suivi des déclarations" },
  { label: 'Révision', icon: FileCheck, path: '/production/revision', color: 'from-amber-500/20 to-transparent', iconColor: 'text-amber-500', desc: "Cycles de révision" },
  { label: 'Supervision', icon: Eye, path: '/production/supervision', color: 'from-purple-500/20 to-transparent', iconColor: 'text-purple-500', desc: "Contrôle qualité" },
  { label: 'Saisie Temps', icon: Clock, path: '/production/temps', color: 'from-pink-500/20 to-transparent', iconColor: 'text-pink-500', desc: "Feuilles de temps" },
  { label: 'Dossiers Clients', icon: Users, path: '/clients', color: 'from-indigo-500/20 to-transparent', iconColor: 'text-indigo-500', desc: "Carnet d'adresses" },
  { label: 'Outils Pratiques', icon: Wrench, path: '/outils', color: 'from-fuchsia-500/20 to-transparent', iconColor: 'text-fuchsia-500', desc: "Simulateurs, PCG, IK..." },
  { label: 'Annuaire Entreprises', icon: Building2, path: '/annuaire', color: 'from-indigo-500/20 to-transparent', iconColor: 'text-indigo-500', desc: "Recherche SIREN, SIRET..." },
  { label: 'MATO AI', icon: Sparkles, path: '/assistant', color: 'from-violet-500/20 to-transparent', iconColor: 'text-violet-500', desc: "Assistant IA expert" },
  { label: 'Actualités & Veille', icon: Newspaper, path: '/veille', color: 'from-zinc-500/10 to-transparent', iconColor: 'text-zinc-400', desc: "Flux métier" },
];

export function CabinetDashboard({
  clients,
  bilanCyclesMap,
  timeEntries,
  kpis,
  userProfile
}: DashboardProps) {
  const weatherStatus = useMemo(() => {
    const totalTva = kpis.tvaToDoCount + kpis.tvaCompleteCount;
    const completionRate = totalTva > 0 ? (kpis.tvaCompleteCount / totalTva) * 100 : 100;
    const lateRate = totalTva > 0 ? (kpis.tvaLateCount / totalTva) * 100 : 0;

    if (lateRate > 20) return { icon: Cloud, label: 'Attention', color: 'text-destructive bg-destructive/10', desc: 'Plusieurs dossiers en retard' };
    if (completionRate >= 80) return { icon: Sun, label: 'Excellent', color: 'text-success bg-success/10', desc: 'Production à jour' };
    return { icon: CloudSun, label: 'Correct', color: 'text-warning bg-warning/10', desc: 'Quelques dossiers à traiter' };
  }, [kpis]);

  const alerts = useMemo(() => {
    const result: { type: 'urgent' | 'warning' | 'info'; message: string; action?: string; route?: string }[] = [];

    if (kpis.tvaLateCount > 0) {
      result.push({ type: 'urgent', message: `${kpis.tvaLateCount} déclaration(s) TVA en retard`, action: 'Voir TVA', route: '/production/tva' });
    }

    let supervisionWaiting = 0;
    bilanCyclesMap.forEach((cycles) => {
      // Dédupliquer : ne garder que le premier enregistrement par cycle_id
      const uniqueCycles = new Map<string, typeof cycles[0]>();
      cycles.forEach(c => {
        if (!uniqueCycles.has(c.cycle_id)) uniqueCycles.set(c.cycle_id, c);
      });
      const deduped = Array.from(uniqueCycles.values());
      const hasWaiting = deduped.some(c => (c as any).supervision_mode && (c as any).supervision_status === 'waiting');
      if (hasWaiting) supervisionWaiting++;
    });
    if (supervisionWaiting > 0) {
      result.push({ type: 'warning', message: `${supervisionWaiting} dossier(s) en attente de supervision`, action: 'Voir Supervision', route: '/production/supervision' });
    }

    if (kpis.tvaToDoCount > 5) {
      result.push({ type: 'info', message: `${kpis.tvaToDoCount} déclarations TVA à traiter ce mois` });
    }

    return result.slice(0, 4);
  }, [kpis, bilanCyclesMap]);

  const funnelData = useMemo(() => {
    let saisie = 0, revision = 0, supervision = 0, cloture = 0;

    bilanCyclesMap.forEach((cycles) => {
      // Dédupliquer : ne garder que le premier enregistrement par cycle_id
      const uniqueCycles = new Map<string, typeof cycles[0]>();
      cycles.forEach(c => {
        if (!uniqueCycles.has(c.cycle_id)) uniqueCycles.set(c.cycle_id, c);
      });
      const deduped = Array.from(uniqueCycles.values());

      const avgLevel = deduped.reduce((sum, c) => sum + c.revision_level, 0) / (deduped.length || 1);
      const inSupervision = deduped.some(c => (c as any).supervision_mode);
      const isValidated = deduped.some(c => (c as any).supervision_status === 'validated');

      if (isValidated) cloture++;
      else if (inSupervision) supervision++;
      else if (avgLevel >= 2) revision++;
      else saisie++;
    });

    return [
      { label: 'Saisie', count: saisie, fill: '#f43f5e' },
      { label: 'Révision', count: revision, fill: '#f59e0b' },
      { label: 'Supervision', count: supervision, fill: '#8b5cf6' },
      { label: 'Clôture', count: cloture, fill: '#10b981' },
    ];
  }, [bilanCyclesMap]);

  const timeDistributionData = useMemo(() => {
    const map = new Map<string, { name: string, value: number }>();
    timeEntries.forEach(t => {
      const client = clients.find(c => c.id === t.client_id);
      if (client) {
        const existing = map.get(client.id) || { name: client.name, value: 0 };
        existing.value += t.duration_hours;
        map.set(client.id, existing);
      }
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);

    if (others > 0) {
      top5.push({ name: 'Autres', value: others });
    }

    return top5;
  }, [timeEntries, clients]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#64748b'];

  const profitabilityRanking = useMemo(() => {
    const clientData: { id: string; name: string; hours: number; fee: number; rate: number }[] = [];

    clients.forEach(client => {
      const clientHours = timeEntries.filter(t => t.client_id === client.id).reduce((sum, t) => sum + t.duration_hours, 0);
      const totalFee = (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);

      if (clientHours > 0 && totalFee > 0) {
        clientData.push({ id: client.id, name: client.name, hours: clientHours, fee: totalFee, rate: totalFee / clientHours });
      }
    });

    const sorted = clientData.sort((a, b) => b.rate - a.rate);
    return { top3: sorted.slice(0, 3), flop3: sorted.slice(-3).reverse() };
  }, [clients, timeEntries]);

  const totalHours = timeEntries.reduce((sum, t) => sum + t.duration_hours, 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Greeting Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {userProfile?.avatar_url ? (
              <div className="w-14 h-14 rounded-full border-4 border-background shadow-md overflow-hidden flex-shrink-0 bg-muted">
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover scale-110" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-4 border-background shadow-md">
                <span className="text-xl font-bold text-primary">
                  {(userProfile?.full_name || userProfile?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {getGreeting(userProfile?.full_name?.split(' ')[0])} <span>👋</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">{getMotivationalQuote()}</p>
            </div>
          </div>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="hidden lg:flex items-center gap-2 px-5 py-3 rounded-full bg-white/50 dark:bg-muted/20 border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:shadow-md transition-all cursor-pointer shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Recherche magique...</span>
            <kbd className="ml-4 px-2 py-0.5 rounded-full bg-background border border-border/50 text-[10px] uppercase font-bold tracking-wider">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Launchpad (Module Grid) */}
      <div className="mb-10 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70 mb-4 flex items-center gap-2">
          Lancement Rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LAUNCHPAD_MODULES.map((mod, idx) => (
            <Link
              key={idx}
              to={mod.path}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5",
                mod.path === '#' && "cursor-not-allowed opacity-80 hover:-translate-y-0 hover:shadow-none"
              )}
            >
              {/* Animated Gradient Background */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-500 z-0", mod.color)} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2.5 rounded-xl bg-background/80 shadow-sm backdrop-blur-sm", mod.iconColor)}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
                <div className="mt-auto">
                  <h3 className="font-bold text-foreground text-[15px] mb-1 group-hover:text-primary transition-colors">{mod.label}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{mod.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
          Indicateurs de Pilotage (KPIs)
        </h2>
        <div className="flex-1 border-t border-border/40 ml-4"></div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

        {/* Weather Widget */}
        <div className="md:col-span-2 lg:col-span-4 bento-card bg-gradient-to-r from-card to-muted/30 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all", weatherStatus.color)}>
                <weatherStatus.icon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{weatherStatus.label}</h2>
                <p className="text-muted-foreground">{weatherStatus.desc}</p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-6 text-sm">
              <div className="text-center">
                <AnimatedCounter value={kpis.tvaCompleteCount} className="text-2xl font-bold text-success" />
                <p className="text-muted-foreground">À jour</p>
              </div>
              <div className="text-center">
                <AnimatedCounter value={kpis.tvaToDoCount} className="text-2xl font-bold text-warning" />
                <p className="text-muted-foreground">À traiter</p>
              </div>
              <div className="text-center">
                <AnimatedCounter value={kpis.tvaLateCount} className="text-2xl font-bold text-destructive" />
                <p className="text-muted-foreground">En retard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-1 bento-card animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Alertes
          </h3>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-success opacity-50" />
              <p className="text-sm">Aucune alerte</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-xl border-l-4 text-sm",
                  alert.type === 'urgent' && "bg-destructive/10 border-destructive",
                  alert.type === 'warning' && "bg-warning/10 border-warning",
                  alert.type === 'info' && "bg-primary/10 border-primary"
                )}>
                  <p className="font-medium">{alert.message}</p>
                  {alert.action && alert.route && (
                    <Link to={alert.route} className="text-xs text-primary mt-1 flex items-center gap-1 hover:underline">
                      {alert.action} <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Funnel (Recharts) */}
        <div className="lg:col-span-2 bento-card animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            Flux de Production
          </h3>
          <div className="h-56 mt-2 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Distribution PieChart */}
        <div className="lg:col-span-2 md:col-span-2 bento-card animate-fade-in" style={{ animationDelay: '350ms' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-indigo-500" />
            Répartition du Temps (Top Dossiers)
          </h3>
          {timeDistributionData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
              <Clock className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Aucune donnée de temps saisie.</p>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {timeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [`${value} heures`, 'Temps passé']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Profitability */}
        <div className="lg:col-span-1 md:col-span-1 bento-card animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-success" />
            Rentabilité
          </h3>
          {profitabilityRanking.top3.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Saisissez du temps pour voir la rentabilité</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profitabilityRanking.top3.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> TOP 3
                  </p>
                  {profitabilityRanking.top3.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 text-sm">
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-bold text-success ml-2">{item.rate.toFixed(0)}€/h</span>
                    </div>
                  ))}
                </div>
              )}
              {profitabilityRanking.flop3.length > 0 && (
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> FLOP 3
                  </p>
                  {profitabilityRanking.flop3.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 text-sm">
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-bold text-destructive ml-2">{item.rate.toFixed(0)}€/h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats with animated counters */}
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {[
            { icon: Users, value: clients.length, label: 'Dossiers', color: 'text-primary', delay: 500 },
            { icon: FileCheck, value: kpis.bilanCompleteCount, label: 'Bilans Finalisés', color: 'text-success', delay: 600 },
            { icon: Eye, value: funnelData[2].count, label: 'En Supervision', color: 'text-primary', delay: 700 },
            { icon: Clock, value: totalHours, label: 'Heures Saisies', color: 'text-violet-500', delay: 800, suffix: 'h', decimals: 0 },
          ].map((stat) => (
            <div key={stat.label} className="bento-card py-4 text-center animate-fade-in" style={{ animationDelay: `${stat.delay}ms` }}>
              <stat.icon className={cn("w-6 h-6 mx-auto mb-2", stat.color)} />
              <AnimatedCounter
                value={stat.value}
                suffix={stat.suffix || ''}
                decimals={stat.decimals || 0}
                className="text-3xl font-bold"
              />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
