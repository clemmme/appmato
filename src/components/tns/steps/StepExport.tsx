// ============================================================================
// Step 5 — Export Comptable (Data Grid)
// ============================================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Download, Send, AlertTriangle, CheckCircle2, FileDown, CalendarDays, FileSpreadsheet, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';
import { COMPTES_TNS } from '@/lib/tns/constants';
import { toast } from 'sonner';

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export function StepExport() {
  const { state, dispatch, exportConfig } = useTNSWizard();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (exportConfig?.equilibre) {
      dispatch({ type: 'COMPLETE_STEP', payload: 4 });
    }
  }, [exportConfig, dispatch]);

  if (!exportConfig || !exportConfig.lignes.length) {
    return (
      <div className="text-center py-16">
        <FileDown className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-extrabold text-foreground mb-2">Aucune écriture à générer</h3>
        <p className="text-muted-foreground">
          L'exercice est équilibré, aucune écriture de régularisation n'est nécessaire.
        </p>
      </div>
    );
  }

  const totalDebit = exportConfig.lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = exportConfig.lignes.reduce((s, l) => s + l.credit, 0);

  const handleExportExcel = () => {
    if (!exportConfig.equilibre) {
      toast.error('L\'écriture est déséquilibrée. Vérifiez les montants avant d\'exporter.');
      return;
    }

    // Generate CSV content (Excel compatible format with BOM)
    const headers = ['Journal', 'Date', 'Compte', 'Libellé', 'Débit', 'Crédit'];
    const rows = exportConfig.lignes.map(l => [
      exportConfig.journal,
      exportConfig.dateEcriture,
      l.compte,
      `"${l.libelle}"`,
      l.debit > 0 ? l.debit.toString().replace('.', ',') : '',
      l.credit > 0 ? l.credit.toString().replace('.', ',') : ''
    ]);

    const csvContent = '\ufeff' + [headers, ...rows].map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_regul_tns_${exportConfig.dateEcriture}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export Excel généré avec succès !', {
      description: `${exportConfig.lignes.length} lignes exportées.`,
    });
  };

  const handlePushAPI = () => {
    toast.info('Bientôt disponible', {
      description: 'La synchronisation API automatique sera débloquée prochainement.',
      icon: <Lock className="w-4 h-4 text-blue-500" />
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">Export Comptable</h3>
        <p className="text-muted-foreground mt-1">
          Écriture d'inventaire pour la régularisation des charges sociales TNS.
        </p>
      </div>

      {/* Config bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/30">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Journal</label>
          <select
            value={exportConfig.journal}
            className="input-premium py-2 text-sm w-24"
            disabled
          >
            <option value="OD">OD</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={exportConfig.dateEcriture}
            className="input-premium py-2 text-sm w-40"
            disabled
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto rounded-2xl border border-border/50 bg-white/50 dark:bg-card/30">
        <table className="table-premium">
          <thead>
            <tr>
              <th className="w-28">Compte</th>
              <th>Libellé</th>
              <th className="text-right w-32">Débit</th>
              <th className="text-right w-32">Crédit</th>
              <th className="w-16 text-center">
                <Settings className="w-4 h-4 mx-auto text-muted-foreground" />
              </th>
            </tr>
          </thead>
          <tbody>
            {exportConfig.lignes.map((ligne) => {
              const isEditing = editingId === ligne.id;
              return (
                <motion.tr
                  key={ligne.id}
                  layout
                  className={cn(
                    isEditing && 'bg-primary/5'
                  )}
                >
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={ligne.compte}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_ECRITURE_LIGNE',
                          payload: { id: ligne.id, updates: { compte: e.target.value } },
                        })}
                        className="input-premium py-1 text-sm font-mono"
                      />
                    ) : (
                      <span className="font-mono font-bold text-sm">{ligne.compte}</span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm">{ligne.libelle}</span>
                    {isEditing && (
                      <div className="mt-1">
                        <input
                          type="text"
                          placeholder="Code analytique..."
                          value={ligne.codeAnalytique || ''}
                          onChange={(e) => dispatch({
                            type: 'UPDATE_ECRITURE_LIGNE',
                            payload: { id: ligne.id, updates: { codeAnalytique: e.target.value } },
                          })}
                          className="input-premium py-1 text-xs w-40"
                        />
                      </div>
                    )}
                  </td>
                  <td className="text-right font-mono font-bold text-sm tabular-nums">
                    {ligne.debit > 0 ? formatEuro(ligne.debit) : ''}
                  </td>
                  <td className="text-right font-mono font-bold text-sm tabular-nums">
                    {ligne.credit > 0 ? formatEuro(ligne.credit) : ''}
                  </td>
                  <td className="text-center">
                    {ligne.editable && (
                      <button
                        onClick={() => setEditingId(isEditing ? null : ligne.id)}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          isEditing
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          {/* Footer — Equilibre */}
          <tfoot>
            <tr className={cn(
              'border-t-2 font-extrabold text-sm',
              exportConfig.equilibre ? 'border-success/30' : 'border-destructive/30'
            )}>
              <td colSpan={2} className="text-right pr-4">
                <div className="flex items-center justify-end gap-2">
                  {exportConfig.equilibre ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-success">Écriture équilibrée</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-destructive">DÉSÉQUILIBRE — Export bloqué</span>
                    </>
                  )}
                </div>
              </td>
              <td className="text-right font-mono tabular-nums">{formatEuro(totalDebit)}</td>
              <td className="text-right font-mono tabular-nums">{formatEuro(totalCredit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={handleExportExcel}
          disabled={!exportConfig.equilibre}
          className={cn(
            'btn-primary flex items-center gap-2',
            !exportConfig.equilibre && 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none'
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
        <button
          onClick={handlePushAPI}
          className="btn-secondary flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
        >
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          Pousser via API
        </button>
      </div>
    </div>
  );
}
