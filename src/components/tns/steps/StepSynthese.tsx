// ============================================================================
// Step 4 — Synthèse Magique (Dashboard d'impact)
// ============================================================================

import { motion } from 'framer-motion';
import { BarChart3, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { TresorerieCards } from '../synthese/TresorerieCards';
import { VentilationDonut } from '../synthese/VentilationDonut';
import { DetailAccordion } from '../synthese/DetailAccordion';
import { useEffect } from 'react';

export function StepSynthese() {
  const { state, dispatch, synthese, recalculer } = useTNSWizard();
  const { isCalculating } = state;

  // Auto-mark step as complete once synthese is available
  useEffect(() => {
    if (synthese && synthese.tresorerie) {
      dispatch({ type: 'COMPLETE_STEP', payload: 3 });
    }
  }, [synthese, dispatch]);

  // Empty state
  if (!synthese || !synthese.ventilation.length) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-primary/40" />
            </div>
          </div>
        </motion.div>
        <h3 className="text-xl font-extrabold text-foreground mb-2">
          Données insuffisantes
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Complétez les étapes précédentes (rémunération et acomptes) pour générer la synthèse de régularisation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Synthèse Magique
          </h3>
          <p className="text-muted-foreground mt-1">
            Impact de la régularisation sur votre trésorerie et votre fiscalité.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recalculer}
            disabled={isCalculating}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
              'bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground',
              isCalculating && 'opacity-50'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isCalculating && 'animate-spin')} />
            Recalculer
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {isCalculating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl"
        >
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-muted-foreground">Recalcul en cours...</p>
          </div>
        </motion.div>
      )}

      {/* ── Bloc 1 : Trésorerie ── */}
      <section aria-label="Trésorerie">
        <TresorerieCards tresorerie={synthese.tresorerie} />
      </section>

      {/* ── Bloc 2 : Ventilation fiscale ── */}
      <section aria-label="Ventilation fiscale">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bento-card"
        >
          <h4 className="text-lg font-extrabold text-foreground mb-6">Ventilation des cotisations</h4>
          <VentilationDonut
            ventilation={synthese.ventilation}
            totalCotisations={synthese.totalCotisations}
          />
        </motion.div>
      </section>

      {/* ── Bloc 3 : Détail calcul ── */}
      <section aria-label="Détail du calcul">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <DetailAccordion baseCalcul={synthese.baseCalcul} />
        </motion.div>
      </section>
    </div>
  );
}
