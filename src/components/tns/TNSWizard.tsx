// ============================================================================
// TNS Wizard — Wrapper parent (orchestration)
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { TNSStepper } from './TNSStepper';
import { StepProfil } from './steps/StepProfil';
import { StepAcomptes } from './steps/StepAcomptes';
import { StepAssiette } from './steps/StepAssiette';
import { StepSynthese } from './steps/StepSynthese';
import { StepExport } from './steps/StepExport';
import { TNSAIUploader } from './TNSAIUploader';
import { WIZARD_STEPS } from '@/lib/tns/constants';

const STEP_COMPONENTS = [StepProfil, StepAcomptes, StepAssiette, StepSynthese, StepExport];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export function TNSWizard() {
  const { state, dispatch, canProceed } = useTNSWizard();
  const { currentStep } = state;

  const CurrentStepComponent = STEP_COMPONENTS[currentStep];
  const stepInfo = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === 4;

  const handleNext = () => {
    if (currentStep < 4) {
      dispatch({ type: 'COMPLETE_STEP', payload: currentStep });
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      dispatch({ type: 'PREV_STEP' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment recommencer ? Toutes les données seront effacées.')) {
      localStorage.removeItem('appmato_tns_wizard');
      dispatch({ type: 'RESET_WIZARD' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 lg:gap-8">
      {/* ── Header : Stepper ── */}
      <div className="bg-white/70 dark:bg-card/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2rem] shadow-card p-5 lg:p-6">
        <TNSStepper />
      </div>

      {/* ── Body : Step Content ── */}
      <div className="flex-1 bg-white/70 dark:bg-card/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2rem] shadow-card overflow-hidden relative">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none" />

        {/* Step title bar */}
        <div className="relative z-10 border-b border-border/30 px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">
              Étape {currentStep + 1}/{WIZARD_STEPS.length}
            </span>
            <span className="text-muted-foreground text-sm hidden sm:inline">—</span>
            <h2 className="text-lg font-bold text-foreground hidden sm:block">{stepInfo.label}</h2>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-xl px-3 py-1.5 hover:bg-destructive/5"
            title="Recommencer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        </div>

        {/* Step content (animated) */}
        <div className="relative z-10 p-6 lg:p-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 22rem)' }}>
          <TNSAIUploader />
          
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={currentStep}
              custom={1}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer : Navigation ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={isFirstStep}
          className={cn(
            'btn-ghost flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all',
            isFirstStep && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        <div className="flex items-center gap-1.5">
          {WIZARD_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === currentStep
                  ? 'bg-primary w-6'
                  : state.completedSteps[i]
                    ? 'bg-success'
                    : 'bg-border'
              )}
            />
          ))}
        </div>

        {!isLastStep ? (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              'btn-primary flex items-center gap-2',
              !canProceed && 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none'
            )}
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-[120px]" /> // Spacer for alignment
        )}
      </div>
    </div>
  );
}
