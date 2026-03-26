// ============================================================================
// Step 3 — Assiette de calcul
// ============================================================================

import { motion } from 'framer-motion';
import { Info, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';

function SmartTooltip({ text }: { text: string }) {
  return (
    <div className="group/tip relative inline-flex ml-1.5">
      <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-3 rounded-xl bg-card border border-border shadow-xl text-xs text-muted-foreground opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50">
        {text}
      </div>
    </div>
  );
}

function CurrencyInput({
  label,
  value,
  onChange,
  tooltip,
  disabled = false,
  warning,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tooltip?: string;
  disabled?: boolean;
  warning?: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-foreground mb-2 flex items-center">
        {label}
        {tooltip && <SmartTooltip text={tooltip} />}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className={cn(
            'input-premium text-right pr-10',
            disabled && 'opacity-60 cursor-not-allowed bg-muted/50'
          )}
          min="0"
          step="0.01"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">€</span>
      </div>
      {warning && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-warning">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </div>
  );
}

export function StepAssiette() {
  const { state, dispatch } = useTNSWizard();
  const { assiette, acomptes } = state;

  const handleChange = (field: string, value: number | boolean) => {
    dispatch({ type: 'UPDATE_ASSIETTE', payload: { [field]: value } });
    // Mark completed if rémunération is set
    if (field === 'remunerationNette' && typeof value === 'number' && value >= 0) {
      dispatch({ type: 'COMPLETE_STEP', payload: 2 });
    }
  };

  const toggleManualMode = () => {
    const newVal = !assiette.cotisationsObligatoiresManuel;
    dispatch({
      type: 'UPDATE_ASSIETTE',
      payload: {
        cotisationsObligatoiresManuel: newVal,
        cotisationsObligatoiresForce: newVal ? assiette.cotisationsObligatoires : 0,
      },
    });
  };

  // Auto-update cotisations from Step 2
  const cotisAuto = acomptes.totalBrut;
  if (assiette.cotisationsObligatoires !== cotisAuto) {
    dispatch({ type: 'UPDATE_ASSIETTE', payload: { cotisationsObligatoires: cotisAuto } });
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">Base de calcul</h3>
        <p className="text-muted-foreground mt-1">
          Renseignez les éléments constitutifs de l'assiette de cotisation pour le recalcul.
        </p>
      </div>

      {/* Bloc rémunération */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <CurrencyInput
          label="Rémunération nette du gérant"
          value={assiette.remunerationNette}
          onChange={(v) => handleChange('remunerationNette', v)}
          tooltip="Rémunération nette de charges sociales, telle que constatée en comptabilité (Art. L131-6 CSS)"
        />
        <CurrencyInput
          label="Avantages en nature"
          value={assiette.avantagesNature}
          onChange={(v) => handleChange('avantagesNature', v)}
          tooltip="Véhicule, logement, etc. évalués au réel ou au forfait (Art. D131-6-1 CSS)"
        />
      </div>

      {/* Dividendes */}
      <CurrencyInput
        label="Dividendes soumis (part > 10% du capital)"
        value={assiette.dividendesSuperieur10}
        onChange={(v) => handleChange('dividendesSuperieur10', v)}
        tooltip="Part des dividendes excédant 10% du capital social + primes d'émission + apports en CCA (Art. L131-6 al. 3 CSS)"
      />

      {/* Cotisations obligatoires (read-only / forçable) */}
      <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            {assiette.cotisationsObligatoiresManuel ? (
              <Unlock className="w-4 h-4 text-warning" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
            Cotisations sociales obligatoires
            <SmartTooltip text="Valeur auto-calculée depuis vos acomptes (Step 2 — Cpte 646). Activez la saisie manuelle pour corriger." />
          </label>
          <button
            onClick={toggleManualMode}
            className={cn(
              'text-xs font-bold px-3 py-1 rounded-lg transition-all',
              assiette.cotisationsObligatoiresManuel
                ? 'bg-warning/10 text-warning'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {assiette.cotisationsObligatoiresManuel ? '⚠️ Mode manuel' : 'Forcer la saisie'}
          </button>
        </div>

        <CurrencyInput
          label=""
          value={assiette.cotisationsObligatoiresManuel ? assiette.cotisationsObligatoiresForce : cotisAuto}
          onChange={(v) => handleChange('cotisationsObligatoiresForce', v)}
          disabled={!assiette.cotisationsObligatoiresManuel}
          warning={assiette.cotisationsObligatoiresManuel ? 'Valeur surchargée manuellement' : undefined}
        />
      </div>

      {/* Contrats facultatifs */}
      <div>
        <h4 className="text-sm font-extrabold text-foreground mb-4">Contrats facultatifs</h4>
        <div className="space-y-4">
          {/* Madelin */}
          <motion.div
            className="p-4 rounded-xl border border-border/30 space-y-3"
            layout
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Contrat Madelin</span>
              <button
                onClick={() => handleChange('contratMadelin', !assiette.contratMadelin)}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors duration-300',
                  assiette.contratMadelin ? 'bg-primary' : 'bg-muted'
                )}
              >
                <motion.div
                  className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                  animate={{ left: assiette.contratMadelin ? '1.375rem' : '0.125rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {assiette.contratMadelin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CurrencyInput
                  label="Montant Madelin"
                  value={assiette.montantMadelin}
                  onChange={(v) => handleChange('montantMadelin', v)}
                  tooltip="Cotisations versées au titre du contrat Madelin (Art. 154 bis CGI)"
                />
              </motion.div>
            )}
          </motion.div>

          {/* PER */}
          <motion.div
            className="p-4 rounded-xl border border-border/30 space-y-3"
            layout
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">PER individuel</span>
              <button
                onClick={() => handleChange('contratPER', !assiette.contratPER)}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors duration-300',
                  assiette.contratPER ? 'bg-primary' : 'bg-muted'
                )}
              >
                <motion.div
                  className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                  animate={{ left: assiette.contratPER ? '1.375rem' : '0.125rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {assiette.contratPER && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CurrencyInput
                  label="Montant PER"
                  value={assiette.montantPER}
                  onChange={(v) => handleChange('montantPER', v)}
                  tooltip="Versements sur le Plan d'Épargne Retraite (Art. 163 quatervicies CGI)"
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
