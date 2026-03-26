// ============================================================================
// Step 2 — Acomptes (Récolte des données passées)
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Euro, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { v4Fallback } from '@/lib/tns/utils';
import type { TNSAcompte } from '@/lib/tns/types';

type TabType = 'regularisation_n1' | 'provision_n';

export function StepAcomptes() {
  const { state, dispatch } = useTNSWizard();
  const { acomptes, profil } = state;
  const [activeTab, setActiveTab] = useState<TabType>('regularisation_n1');
  const [newMontant, setNewMontant] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLibelle, setNewLibelle] = useState('');

  const exercice = profil.exerciceFiscal;
  const items = activeTab === 'regularisation_n1' ? acomptes.regularisationN1 : acomptes.provisionsN;

  const handleAdd = () => {
    const montant = parseFloat(newMontant);
    if (isNaN(montant) || montant <= 0 || !newDate) return;

    const acompte: TNSAcompte = {
      id: v4Fallback(),
      date: newDate,
      montant,
      type: activeTab,
      libelle: newLibelle || (activeTab === 'regularisation_n1' ? `Régularisation ${exercice - 1}` : `Provision ${exercice}`),
    };
    dispatch({ type: 'ADD_ACOMPTE', payload: acompte });
    setNewMontant('');
    setNewDate('');
    setNewLibelle('');

    // Mark step as completed if there's at least one entry
    dispatch({ type: 'COMPLETE_STEP', payload: 1 });
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_ACOMPTE', payload: { id, type: activeTab } });
  };

  const formatEuro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">Acomptes versés</h3>
        <p className="text-muted-foreground mt-1">
          Renseignez les acomptes de cotisations sociales versés sur l'exercice.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl w-fit">
        {[
          { id: 'regularisation_n1' as TabType, label: `Régularisation ${exercice - 1}` },
          { id: 'provision_n' as TabType, label: `Provisions ${exercice}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300',
              activeTab === tab.id
                ? 'bg-white dark:bg-card shadow-md text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/30">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input-premium pl-9 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Montant (€)</label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="number"
              value={newMontant}
              onChange={(e) => setNewMontant(e.target.value)}
              placeholder="0,00"
              className="input-premium pl-9 text-sm"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Libellé</label>
          <input
            type="text"
            value={newLibelle}
            onChange={(e) => setNewLibelle(e.target.value)}
            placeholder="Description..."
            className="input-premium text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleAdd}
            disabled={!newMontant || !newDate}
            className={cn(
              'btn-primary w-full flex items-center justify-center gap-2 text-sm',
              (!newMontant || !newDate) && 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none'
            )}
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Euro className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold">Aucun acompte enregistré</p>
          <p className="text-sm mt-1 opacity-70">Utilisez le formulaire ci-dessus pour ajouter vos acomptes</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-card/30 border border-border/30 group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-mono">{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                  <span className="text-sm font-medium">{item.libelle}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">{formatEuro(item.montant)}</span>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/30">
        {[
          { label: `Régularisation ${exercice - 1}`, value: acomptes.totalRegularisation },
          { label: `Provisions ${exercice}`, value: acomptes.totalProvisions },
          { label: 'Total brut (Cpte 646)', value: acomptes.totalBrut, highlight: true },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              'p-4 rounded-xl text-center',
              item.highlight
                ? 'bg-primary/5 border-2 border-primary/20'
                : 'bg-muted/20 border border-border/30'
            )}
          >
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
            <p className={cn('text-xl font-extrabold', item.highlight ? 'text-primary' : 'text-foreground')}>
              {formatEuro(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
