import { cn } from '@/lib/utils';

interface MockupWindowProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

function MockupWindow({ title, className, children, delay = 0 }: MockupWindowProps) {
  return (
    <div 
      className={cn(
        "mockup-window rounded-2xl overflow-hidden shadow-xl animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Window Header */}
      <div className="bg-secondary/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-border/30">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs text-muted-foreground font-medium flex-1 text-center mr-8">
          {title}
        </span>
      </div>
      {/* Window Content */}
      <div className="bg-card/95 backdrop-blur-sm p-4">
        {children}
      </div>
    </div>
  );
}

export function AnimatedMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto h-[400px] lg:h-[500px]">
      {/* Main Window - Dashboard */}
      <MockupWindow 
        title="APPMATO — Pilotage TVA" 
        className="absolute left-0 top-0 w-[85%] lg:w-[70%] z-20"
        delay={200}
      >
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary">24</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Déclarations</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-success">89%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Complétées</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-warning">3</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">En cours</div>
            </div>
          </div>
          {/* Table Preview */}
          <div className="bg-muted/30 rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 flex gap-4 text-[10px] font-bold text-muted-foreground uppercase">
              <span className="w-24">Client</span>
              <span className="w-16">Période</span>
              <span className="w-16">Statut</span>
              <span className="flex-1">Progression</span>
            </div>
            {[
              { name: 'SCI Horizon', period: 'Jan 2026', status: 'done', progress: 100 },
              { name: 'SARL Tech+', period: 'Jan 2026', status: 'pending', progress: 60 },
              { name: 'EI Martin', period: 'Jan 2026', status: 'todo', progress: 20 },
            ].map((row, i) => (
              <div 
                key={i} 
                className="px-3 py-2.5 flex gap-4 items-center text-xs border-t border-border/30"
              >
                <span className="w-24 font-medium truncate">{row.name}</span>
                <span className="w-16 text-muted-foreground">{row.period}</span>
                <span className="w-16">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    row.status === 'done' && "bg-success/20 text-success",
                    row.status === 'pending' && "bg-warning/20 text-warning",
                    row.status === 'todo' && "bg-muted text-muted-foreground"
                  )}>
                    {row.status === 'done' ? 'Fait' : row.status === 'pending' ? 'En cours' : 'À faire'}
                  </span>
                </span>
                <div className="flex-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        row.status === 'done' ? "bg-success" : "bg-primary"
                      )}
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MockupWindow>

      {/* Secondary Window - Client Card */}
      <MockupWindow 
        title="Fiche Client" 
        className="absolute right-0 top-16 w-[55%] lg:w-[45%] z-30"
        delay={500}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
              SC
            </div>
            <div>
              <div className="font-semibold text-sm">SCI Horizon</div>
              <div className="text-[10px] text-muted-foreground">SIREN: 123 456 789</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground">Régime TVA</div>
              <div className="font-semibold">Mensuel</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground">Échéance</div>
              <div className="font-semibold">19 du mois</div>
            </div>
          </div>
        </div>
      </MockupWindow>

      {/* Tertiary Window - Time Tracking */}
      <MockupWindow 
        title="Temps du jour" 
        className="absolute right-8 bottom-0 w-[50%] lg:w-[40%] z-10"
        delay={800}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">SCI Horizon</span>
            <span className="text-primary font-bold">2h30</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">SARL Tech+</span>
            <span className="text-primary font-bold">1h45</span>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total journée</span>
            <span className="font-bold">4h15</span>
          </div>
        </div>
      </MockupWindow>
    </div>
  );
}
