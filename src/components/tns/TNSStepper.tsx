// ============================================================================
// TNS Wizard — Stepper horizontal
// ============================================================================

import { motion } from 'framer-motion';
import { Check, UserCog, Coins, Calculator, BarChart3, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { WIZARD_STEPS } from '@/lib/tns/constants';

const STEP_ICONS = {
  UserCog,
  Coins,
  Calculator,
  BarChart3,
  FileDown,
} as const;

export function TNSStepper() {
  const { state, dispatch } = useTNSWizard();
  const { currentStep, completedSteps } = state;

  const handleStepClick = (stepIndex: number) => {
    // Autoriser le retour aux steps déjà complétés ou au step courant
    if (stepIndex <= currentStep || completedSteps[stepIndex]) {
      dispatch({ type: 'SET_STEP', payload: stepIndex });
    }
  };

  return (
    <nav aria-label="Étapes du wizard" className="w-full">
      <ol className="flex items-center justify-between gap-2 lg:gap-0">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps[index];
          const isClickable = index <= currentStep || isCompleted;
          const IconComponent = STEP_ICONS[step.icon as keyof typeof STEP_ICONS];

          return (
            <li key={step.id} className="flex-1 flex items-center">
              {/* Step circle + label */}
              <button
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group flex flex-col items-center gap-2 w-full transition-all duration-300',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Circle */}
                <motion.div
                  className={cn(
                    'relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-110'
                      : isCompleted
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-muted/50 text-muted-foreground border-border/50 group-hover:border-primary/20'
                  )}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <IconComponent className="w-5 h-5" />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-primary/20"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-bold tracking-wide transition-colors hidden sm:block',
                    isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className="hidden lg:block flex-1 h-0.5 mx-3 bg-border/50 relative overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-success rounded-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: isCompleted ? '100%' : isActive ? '50%' : '0%'
                    }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
