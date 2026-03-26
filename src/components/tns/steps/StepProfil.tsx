// ============================================================================
// Step 1 — Profilage TNS
// ============================================================================

import { motion } from 'framer-motion';
import { Building2, Wrench, ShoppingBag, GraduationCap, Briefcase, Users, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { STATUTS_TNS, CAISSE_LABELS, CURRENT_YEAR } from '@/lib/tns/constants';
import type { TNSStatut } from '@/lib/tns/types';

const ICON_MAP = { Building2, Wrench, ShoppingBag, GraduationCap, Briefcase };

export function StepProfil() {
  const { state, dispatch } = useTNSWizard();
  const { profil } = state;

  const handleStatutSelect = (statut: TNSStatut) => {
    dispatch({ type: 'UPDATE_PROFIL', payload: { statut } });
    dispatch({ type: 'COMPLETE_STEP', payload: 0 });
  };

  const selectedStatut = STATUTS_TNS.find(s => s.id === profil.statut);

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">
          Quel est votre statut TNS ?
        </h3>
        <p className="text-muted-foreground mt-1">
          Sélectionnez le statut juridique du dirigeant pour adapter les caisses de cotisation.
        </p>
      </div>

      {/* Grille de Cards statut */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATUTS_TNS.map((statut, index) => {
          const IconComp = ICON_MAP[statut.icon as keyof typeof ICON_MAP] || Briefcase;
          const isSelected = profil.statut === statut.id;

          return (
            <motion.button
              key={statut.id}
              onClick={() => handleStatutSelect(statut.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className={cn(
                'group relative text-left p-5 rounded-[1.5rem] border-2 transition-all duration-300',
                'hover:shadow-xl hover:-translate-y-1',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/50 bg-white/50 dark:bg-card/30 hover:border-primary/30'
              )}
            >
              {/* Gradient overlay */}
              <div className={cn('absolute inset-0 rounded-[1.5rem] bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity', statut.color)} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'p-3 rounded-xl transition-all',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                  )}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <span className="text-xs font-black">✓</span>
                    </motion.div>
                  )}
                </div>

                <h4 className="font-bold text-foreground mb-1">{statut.label}</h4>
                <p className="text-xs text-muted-foreground mb-3">{statut.description}</p>

                {/* Tags caisses */}
                <div className="flex flex-wrap gap-1.5">
                  {statut.caisses.map(caisse => (
                    <span
                      key={caisse}
                      className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', CAISSE_LABELS[caisse].color)}
                    >
                      {CAISSE_LABELS[caisse].label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Champs supplémentaires */}
      {profil.statut && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-6 pt-4 border-t border-border/30"
        >
          {/* Exercice fiscal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Exercice fiscal</label>
              <select
                value={profil.exerciceFiscal}
                onChange={(e) => dispatch({ type: 'UPDATE_PROFIL', payload: { exerciceFiscal: parseInt(e.target.value) } })}
                className="input-premium"
              >
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">
                <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Date de début d'activité
              </label>
              <input
                type="date"
                value={profil.dateDebutActivite}
                onChange={(e) => dispatch({ type: 'UPDATE_PROFIL', payload: { dateDebutActivite: e.target.value } })}
                className="input-premium"
              />
            </div>
          </div>

          {/* Conjoint collaborateur */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-bold text-sm">Conjoint collaborateur</p>
                <p className="text-xs text-muted-foreground">Activer si le conjoint participe à l'activité</p>
              </div>
            </div>
            <button
              onClick={() => dispatch({
                type: 'UPDATE_PROFIL',
                payload: {
                  conjointCollaborateur: !profil.conjointCollaborateur,
                  assietteConjoint: !profil.conjointCollaborateur ? 'tiers' : null,
                }
              })}
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors duration-300',
                profil.conjointCollaborateur ? 'bg-primary' : 'bg-muted'
              )}
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ left: profil.conjointCollaborateur ? '1.375rem' : '0.125rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Assiette conjoint (conditionnel) */}
          {profil.conjointCollaborateur && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pl-4 border-l-2 border-primary/20"
            >
              <label className="text-sm font-bold text-foreground mb-3 block">
                Assiette de cotisation du conjoint
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'tiers' as const, label: '1/3 de l\'assiette' },
                  { value: 'moitie' as const, label: '1/2 de l\'assiette' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => dispatch({ type: 'UPDATE_PROFIL', payload: { assietteConjoint: opt.value } })}
                    className={cn(
                      'flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all',
                      profil.assietteConjoint === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/50 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
