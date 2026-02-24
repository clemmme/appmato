import { useMemo } from 'react';
import { Users, Activity, TrendingUp, CheckCircle, AlertTriangle, TrendingDown, Sparkles } from 'lucide-react';
import { formatCurrencyShort } from '@/lib/calculations';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Client } from '@/lib/database.types';

interface DashboardKPIs {
  totalClients: number;
  tvaTotal: number;
  tvaDone: number;
  tvaActive: number;
  avgBilanProgress: number;
}

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
}

interface SuiviDossiersViewProps {
  kpis: DashboardKPIs;
  recentClients: { id: string; name: string; regime: string }[];
  clients?: Client[];
  timeEntries?: TimeEntryData[];
}

// Calculate difficulty index based on volume metrics
function calculateDifficultyIndex(client: Client): number {
  const entries = client.entries_count || 0;
  const establishments = client.establishments_count || 1;
  const invoices = client.invoices_per_month || 0;
  
  // Weighted difficulty score (higher = harder)
  const score = (entries * 0.5) + (invoices * 2) + ((establishments - 1) * 50);
  
  // Normalize to 1-5 scale
  if (score <= 50) return 1;
  if (score <= 100) return 2;
  if (score <= 200) return 3;
  if (score <= 400) return 4;
  return 5;
}

// Calculate profitability score
function calculateProfitabilityScore(
  client: Client, 
  hoursSpent: number
): { score: number; hourlyRate: number; adjustedRate: number; status: 'excellent' | 'good' | 'warning' | 'danger' } {
  const totalFee = (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);
  
  if (hoursSpent === 0 || totalFee === 0) {
    return { score: 0, hourlyRate: 0, adjustedRate: 0, status: 'warning' };
  }
  
  const hourlyRate = totalFee / hoursSpent;
  const difficulty = calculateDifficultyIndex(client);
  
  // Adjust rate based on difficulty (higher difficulty = rate should be higher to be fair)
  const adjustedRate = hourlyRate / difficulty;
  
  // Score: target is 50€/h adjusted rate
  const score = Math.min(100, Math.round((adjustedRate / 50) * 100));
  
  let status: 'excellent' | 'good' | 'warning' | 'danger' = 'warning';
  if (adjustedRate >= 50) status = 'excellent';
  else if (adjustedRate >= 35) status = 'good';
  else if (adjustedRate >= 20) status = 'warning';
  else status = 'danger';
  
  return { score, hourlyRate, adjustedRate, status };
}

export function SuiviDossiersView({ kpis, recentClients, clients = [], timeEntries = [] }: SuiviDossiersViewProps) {
  // Calculate profitability data
  const profitabilityData = useMemo(() => {
    if (!clients.length) return [];
    
    // Group hours by client
    const hoursByClient: Record<string, number> = {};
    timeEntries.forEach(entry => {
      if (entry.client_id) {
        hoursByClient[entry.client_id] = (hoursByClient[entry.client_id] || 0) + entry.duration_hours;
      }
    });
    
    // Calculate profitability for each client with time
    const data = clients
      .filter(c => hoursByClient[c.id] > 0)
      .map(client => {
        const hours = hoursByClient[client.id] || 0;
        const profitability = calculateProfitabilityScore(client, hours);
        return {
          id: client.id,
          name: client.name,
          hours,
          fee: (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0),
          difficulty: calculateDifficultyIndex(client),
          ...profitability
        };
      })
      .sort((a, b) => a.adjustedRate - b.adjustedRate); // Worst first
    
    return data;
  }, [clients, timeEntries]);

  // Summary stats
  const profitabilitySummary = useMemo(() => {
    if (!profitabilityData.length) return { avgScore: 0, underBilled: 0, excellent: 0 };
    
    const avgScore = Math.round(profitabilityData.reduce((sum, d) => sum + d.score, 0) / profitabilityData.length);
    const underBilled = profitabilityData.filter(d => d.status === 'danger').length;
    const excellent = profitabilityData.filter(d => d.status === 'excellent').length;
    
    return { avgScore, underBilled, excellent };
  }, [profitabilityData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-primary';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-success/10';
      case 'good': return 'bg-primary/10';
      case 'warning': return 'bg-warning/10';
      case 'danger': return 'bg-destructive/10';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in overflow-auto h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Suivi des Dossiers</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
      </div>
      
      {/* Bento Grid KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Dossiers Actifs */}
        <div className="stat-card">
          <div>
            <p className="stat-label">Dossiers Actifs</p>
            <p className="stat-value mt-2">{kpis.totalClients}</p>
          </div>
          <div className="stat-icon bg-muted text-muted-foreground">
            <Users className="w-7 h-7" />
          </div>
        </div>
        
        {/* TVA du Mois */}
        <div className="stat-card">
          <div>
            <p className="stat-label">TVA du Mois</p>
            <p className="stat-value mt-2 text-primary">{formatCurrencyShort(kpis.tvaTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.tvaDone}/{kpis.tvaActive} validés
            </p>
          </div>
          <div className="stat-icon bg-primary/10 text-primary">
            <Activity className="w-7 h-7" />
          </div>
        </div>
        
        {/* Avancement Bilans */}
        <div className="stat-card">
          <div className="w-full">
            <p className="stat-label">Avancement Bilans</p>
            <p className="stat-value mt-2 text-success">{kpis.avgBilanProgress}%</p>
            <div className="progress-bar mt-3">
              <div 
                className={kpis.avgBilanProgress === 100 ? 'progress-bar-success' : 'progress-bar-fill'}
                style={{ width: `${kpis.avgBilanProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Score Rentabilité */}
        <div className="stat-card">
          <div>
            <p className="stat-label">Score Rentabilité</p>
            <p className={cn(
              "stat-value mt-2",
              profitabilitySummary.avgScore >= 70 ? "text-success" :
              profitabilitySummary.avgScore >= 50 ? "text-primary" :
              profitabilitySummary.avgScore >= 30 ? "text-warning" : "text-destructive"
            )}>
              {profitabilitySummary.avgScore}%
            </p>
            {profitabilitySummary.underBilled > 0 && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {profitabilitySummary.underBilled} sous-facturés
              </p>
            )}
          </div>
          <div className="stat-icon bg-warning/10 text-warning">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability Analysis */}
        <div className="bento-card">
          <h3 className="font-semibold text-lg flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-warning" />
            </div>
            Analyse Rentabilité
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              Honoraires vs Temps × Dureté
            </span>
          </h3>
          
          {profitabilityData.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Aucune donnée de temps</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Enregistrez des temps sur vos dossiers pour voir l'analyse
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {profitabilityData.slice(0, 10).map(item => (
                <div 
                  key={item.id} 
                  className={cn(
                    "p-3 rounded-xl border transition-colors",
                    getStatusBg(item.status),
                    item.status === 'danger' && "border-destructive/30"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{item.hours.toFixed(1)}h</span>
                        <span>{item.fee.toLocaleString('fr-FR')}€/an</span>
                        <span className="flex items-center gap-1">
                          Dureté: {'⬤'.repeat(item.difficulty)}{'○'.repeat(5 - item.difficulty)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", getStatusColor(item.status))}>
                        {item.hourlyRate.toFixed(0)}€/h
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ajusté: {item.adjustedRate.toFixed(0)}€/h
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={item.score} 
                    className={cn(
                      "h-1.5",
                      item.status === 'excellent' && "[&>div]:bg-success",
                      item.status === 'good' && "[&>div]:bg-primary",
                      item.status === 'warning' && "[&>div]:bg-warning",
                      item.status === 'danger' && "[&>div]:bg-destructive"
                    )}
                  />
                </div>
              ))}
              {profitabilityData.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Et {profitabilityData.length - 10} autres dossiers...
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* TVA Summary + Recent Clients */}
        <div className="space-y-6">
          {/* TVA Summary */}
          <div className="bento-card">
            <h3 className="font-semibold text-lg flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              Statut TVA
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Dossiers actifs ce mois</span>
                <span className="font-bold text-lg">{kpis.tvaActive}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Déjà validés</span>
                <span className="font-bold text-lg text-success">{kpis.tvaDone}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">En attente</span>
                <span className="font-bold text-lg text-primary">{kpis.tvaActive - kpis.tvaDone}</span>
              </div>
            </div>
          </div>
          
          {/* Recent Clients */}
          <div className="bento-card">
            <h3 className="font-semibold text-lg flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              Derniers Clients
            </h3>
            {recentClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Aucun client enregistré</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Ajoutez vos premiers clients</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClients.slice(0, 5).map(client => (
                  <div 
                    key={client.id} 
                    className="flex justify-between items-center py-3 px-4 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium truncate flex-1">{client.name}</span>
                    <span className="badge-neutral">{client.regime}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
