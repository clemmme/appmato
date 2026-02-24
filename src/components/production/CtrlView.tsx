import { useState, useMemo } from 'react';
import { Calculator, ArrowRight, ArrowLeft, Check, AlertTriangle, FileText, CreditCard, Landmark, ChevronRight, StickyNote, Plus, Trash2, ChevronDown } from 'lucide-react';
import { formatCurrency, formatNumber, getTVAKey } from '@/lib/calculations';
import type { Client, TVAHistory } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { motion, AnimatePresence } from 'framer-motion';
import { CommentWithMentions } from '@/components/chat/CommentWithMentions';
import { chatService } from '@/services/chatService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

// ═══ Types ═══

interface CtrlViewProps {
  clients: Client[];
  tvaHistories: TVAHistory[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onValidateDeclaration: (clientId: string, data: DeclarationData) => void;
}

export interface TVALine {
  id: string;
  type: 'collectee' | 'deductible';
  category: string;
  rate: number;
  baseHT: number;
  tva: number;
}

export interface DeclarationData {
  regime_type: 'debits' | 'encaissements';
  lines: TVALine[];
  credit_precedent: number;
  note_next_month: string;
  // Legacy compat fields computed from lines
  base_ht_20: number;
  tva_collectee_20: number;
  base_ht_10: number;
  tva_collectee_10: number;
  base_ht_55: number;
  tva_collectee_55: number;
  tva_deductible_immobilisations: number;
  tva_deductible_biens_services: number;
}

// ═══ TVA Rate catalog ═══

interface TVARateOption {
  label: string;
  rate: number;
  category: string;
  ca3Line?: string;
  type: 'collectee' | 'deductible';
}

const TVA_COLLECTEE_OPTIONS: TVARateOption[] = [
  { label: 'Taux normal 20%', rate: 0.20, category: 'normal_20', ca3Line: 'L08', type: 'collectee' },
  { label: 'Taux intermédiaire 10%', rate: 0.10, category: 'intermediaire_10', ca3Line: 'L09', type: 'collectee' },
  { label: 'Taux réduit 5,5%', rate: 0.055, category: 'reduit_55', ca3Line: 'L9B', type: 'collectee' },
  { label: 'Taux super-réduit 2,1%', rate: 0.021, category: 'super_reduit_21', ca3Line: 'L09C', type: 'collectee' },
  { label: 'Autoliquidation due', rate: 0.20, category: 'autoliquidation', ca3Line: 'L02', type: 'collectee' },
  { label: 'Acquisitions intracommunautaires', rate: 0.20, category: 'intracom', ca3Line: 'L03', type: 'collectee' },
  { label: 'Importations', rate: 0.20, category: 'importation', ca3Line: 'L24', type: 'collectee' },
  { label: 'Exportations (exonéré)', rate: 0, category: 'exportation', ca3Line: 'L04', type: 'collectee' },
  { label: 'Livraisons intracom (exonéré)', rate: 0, category: 'livraison_intracom', ca3Line: 'L06', type: 'collectee' },
  { label: 'Opérations non imposables', rate: 0, category: 'exonere', ca3Line: 'L07', type: 'collectee' },
];

const TVA_DEDUCTIBLE_OPTIONS: TVARateOption[] = [
  { label: 'Sur immobilisations', rate: 0, category: 'immo', ca3Line: 'L19', type: 'deductible' },
  { label: 'Sur biens & services', rate: 0, category: 'biens_services', ca3Line: 'L20', type: 'deductible' },
  { label: 'Autoliquidation déductible', rate: 0, category: 'autoliq_deductible', ca3Line: 'L20', type: 'deductible' },
  { label: 'Acquisitions intracom. déductible', rate: 0, category: 'intracom_deductible', ca3Line: 'L20', type: 'deductible' },
  { label: 'TVA sur importations déductible', rate: 0, category: 'import_deductible', ca3Line: 'L20', type: 'deductible' },
  { label: 'Autre TVA déductible', rate: 0, category: 'autre_deductible', ca3Line: 'L21', type: 'deductible' },
];

const REGIME_LABELS: Record<string, string> = { M: 'Mensuel', T: 'Trimestriel', A: 'Annuel', N: 'Non assujetti' };
const REGIME_COLORS: Record<string, string> = {
  M: 'bg-primary/10 text-primary border-primary/20',
  T: 'bg-warning/10 text-warning border-warning/20',
  A: 'bg-accent/20 text-accent-foreground border-accent/30',
  N: 'bg-muted text-muted-foreground border-border'
};

let lineIdCounter = 0;
function genLineId() { return `line_${++lineIdCounter}_${Date.now()}`; }

function detectRateAnomaly(baseHT: number, tva: number, expectedRate: number): boolean {
  if (baseHT === 0 || tva === 0 || expectedRate === 0) return false;
  const actualRate = tva / baseHT;
  return Math.abs(actualRate - expectedRate) > 0.005;
}

// ═══ Main Component ═══

export function CtrlView({ clients, tvaHistories, currentDate, onDateChange, onValidateDeclaration }: CtrlViewProps) {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, sortWithFavorites } = useFavorites();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [step, setStep] = useState(0);
  const [regimeType, setRegimeType] = useState<'debits' | 'encaissements'>('debits');
  const [collecteeLines, setCollecteeLines] = useState<TVALine[]>([]);
  const [deductibleLines, setDeductibleLines] = useState<TVALine[]>([]);
  const [creditPrecedent, setCreditPrecedent] = useState(0);
  const [noteNextMonth, setNoteNextMonth] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  const period = getTVAKey(currentDate);

  const activeClients = useMemo(() => {
    return sortWithFavorites(clients.filter(c => c.regime !== 'N'));
  }, [clients, sortWithFavorites]);

  const getClientTVA = (clientId: string) => tvaHistories.find(h => h.client_id === clientId && h.period === period);

  const getPreviousCredit = (clientId: string): number => {
    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevPeriod = getTVAKey(prevDate);
    const prev = tvaHistories.find(h => h.client_id === clientId && h.period === prevPeriod);
    return prev?.credit || 0;
  };

  const openWizard = (client: Client) => {
    const prevCredit = getPreviousCredit(client.id);
    setSelectedClient(client);
    setStep(0);
    setRegimeType('debits');
    setCollecteeLines([]);
    setDeductibleLines([]);
    setCreditPrecedent(prevCredit);
    setNoteNextMonth('');
    setMentionedUserIds([]);
  };

  // ═══ Add / Remove Lines ═══

  const addCollecteeLine = (option: TVARateOption) => {
    setCollecteeLines(prev => [...prev, {
      id: genLineId(),
      type: 'collectee',
      category: option.category,
      rate: option.rate,
      baseHT: 0,
      tva: 0,
    }]);
  };

  const addDeductibleLine = (option: TVARateOption) => {
    setDeductibleLines(prev => [...prev, {
      id: genLineId(),
      type: 'deductible',
      category: option.category,
      rate: option.rate,
      baseHT: 0,
      tva: 0,
    }]);
  };

  const updateLine = (lines: TVALine[], setLines: React.Dispatch<React.SetStateAction<TVALine[]>>, id: string, field: 'baseHT' | 'tva', value: number) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (setLines: React.Dispatch<React.SetStateAction<TVALine[]>>, id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // ═══ Calculations ═══

  const totalCollectee = collecteeLines.reduce((sum, l) => sum + l.tva, 0);
  const totalDeductible = deductibleLines.reduce((sum, l) => sum + l.tva, 0) + creditPrecedent;
  const tvaAPayer = totalCollectee - totalDeductible;
  const creditTVA = tvaAPayer < 0 ? Math.abs(tvaAPayer) : 0;
  const montantAPayer = tvaAPayer > 0 ? tvaAPayer : 0;

  // Build legacy compat data
  const buildDeclarationData = (): DeclarationData => {
    const findCollectee = (cat: string) => collecteeLines.filter(l => l.category === cat);
    const sumTva = (lines: TVALine[]) => lines.reduce((s, l) => s + l.tva, 0);
    const sumBase = (lines: TVALine[]) => lines.reduce((s, l) => s + l.baseHT, 0);

    return {
      regime_type: regimeType,
      lines: [...collecteeLines, ...deductibleLines],
      credit_precedent: creditPrecedent,
      note_next_month: noteNextMonth,
      base_ht_20: sumBase(findCollectee('normal_20')),
      tva_collectee_20: sumTva(findCollectee('normal_20')),
      base_ht_10: sumBase(findCollectee('intermediaire_10')),
      tva_collectee_10: sumTva(findCollectee('intermediaire_10')),
      base_ht_55: sumBase(findCollectee('reduit_55')),
      tva_collectee_55: sumTva(findCollectee('reduit_55')),
      tva_deductible_immobilisations: sumTva(deductibleLines.filter(l => l.category === 'immo')),
      tva_deductible_biens_services: sumTva(deductibleLines.filter(l => l.category !== 'immo')),
    };
  };

  const handleValidate = async () => {
    if (!selectedClient) return;

    // Process mentions
    if (currentOrg && mentionedUserIds.length > 0) {
      let sentCount = 0;
      for (const userId of mentionedUserIds) {
        try {
          await chatService.sendSystemMessageToUser(
            currentOrg.id,
            userId,
            `Vous avez été mentionné dans les notes de TVA du dossier **${selectedClient.name}**.\n\n"${noteNextMonth}"`
          );
          sentCount++;
        } catch (err) {
          console.error("Failed to notify user", userId, err);
        }
      }
      if (sentCount > 0) {
        toast({
          title: "Notifications envoyées",
          description: `${sentCount} collaborateur(s) ont été notifiés via le chat.`,
        });
      }
    }

    onValidateDeclaration(selectedClient.id, buildDeclarationData());
    setSelectedClient(null);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onDateChange(d);
  };
  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onDateChange(d);
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const getLabelForCategory = (cat: string, type: 'collectee' | 'deductible'): string => {
    const list = type === 'collectee' ? TVA_COLLECTEE_OPTIONS : TVA_DEDUCTIBLE_OPTIONS;
    return list.find(o => o.category === cat)?.label || cat;
  };

  const getCA3LineForCategory = (cat: string, type: 'collectee' | 'deductible'): string => {
    const list = type === 'collectee' ? TVA_COLLECTEE_OPTIONS : TVA_DEDUCTIBLE_OPTIONS;
    return list.find(o => o.category === cat)?.ca3Line || '';
  };

  // ═══ Card view (no client selected) ═══
  if (!selectedClient) {
    const doneCount = activeClients.filter(c => getClientTVA(c.id)?.step_valide).length;
    return (
      <div className="p-6 lg:p-8 h-full overflow-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Calculator className="w-8 h-8 text-primary" />
                Calcul de TVA
              </h1>
              <p className="text-muted-foreground mt-1">Assistant intelligent de déclaration — tous régimes</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-2xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[160px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-2xl">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Dossiers actifs', value: activeClients.length, color: '' },
              { label: 'Déclarés ce mois', value: `${doneCount} / ${activeClients.length}`, color: 'text-success' },
              { label: 'Progression', value: null, color: '' },
            ].map((kpi, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }} className="stat-card">
                <div>
                  <p className="stat-label">{kpi.label}</p>
                  {kpi.value !== null ? (
                    <p className={cn("stat-value mt-2", kpi.color)}>{kpi.value}</p>
                  ) : (
                    <div className="mt-3">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${activeClients.length ? (doneCount / activeClients.length) * 100 : 0}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Client cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeClients.map((client, i) => {
              const tva = getClientTVA(client.id);
              const isDone = tva?.step_valide;
              return (
                <motion.button
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(i, 12), duration: 0.35 }}
                  onClick={() => !isDone && openWizard(client)}
                  disabled={!!isDone}
                  className={cn(
                    "bento-card p-5 text-left transition-all group",
                    isDone ? "opacity-60 cursor-default" : "hover:shadow-lg hover:border-primary/30 cursor-pointer"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FavoriteStar isFavorite={isFavorite(client.id)} onToggle={() => toggleFavorite(client.id)} />
                      <div>
                        <p className="font-semibold text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.ref} · {client.form}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", REGIME_COLORS[client.regime])}>
                      {REGIME_LABELS[client.regime]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    {isDone ? (
                      <div className="flex items-center gap-2 text-success text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Déclaré
                        {tva?.credit ? <span className="text-xs text-muted-foreground ml-1">(Crédit: {formatCurrency(tva.credit)})</span> : null}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Échéance : J{client.day}</span>
                    )}
                    {!isDone && <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══ WIZARD ═══
  const steps = ['Configuration', 'TVA Collectée', 'TVA Déductible', 'Miroir CA3', 'Validation'];

  return (
    <div className="p-6 lg:p-8 h-full overflow-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedClient(null)} className="rounded-2xl gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedClient.ref} · {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8 p-4 bento-card overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  i === step ? "bg-primary text-primary-foreground" :
                    i < step ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                )}
                animate={{ scale: i === step ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </motion.div>
              <span className={cn("text-xs font-medium hidden md:inline truncate", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-border min-w-2" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ Step 0: Configuration ═══ */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-2xl mx-auto">
              <div className="bento-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" />
                  Configuration du Régime
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {(['debits', 'encaissements'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setRegimeType(type)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-center transition-all",
                        regimeType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <p className="font-semibold capitalize">{type === 'debits' ? 'TVA sur Débits' : 'TVA sur Encaissements'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {type === 'debits' ? 'Facturation = Exigibilité' : 'Paiement = Exigibilité'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {creditPrecedent > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bento-card p-5 border-l-4 border-l-primary bg-primary/5">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-semibold">Crédit de TVA précédent détecté</p>
                      <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(creditPrecedent)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Sera automatiquement déduit lors du calcul</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} className="btn-primary gap-2">
                  Suivant <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 1: TVA Collectée (Dynamic) ═══ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-3xl mx-auto">
              <div className="bento-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    TVA Collectée
                  </h3>
                  <AddLineDropdown options={TVA_COLLECTEE_OPTIONS} onAdd={addCollecteeLine} label="Ajouter une ligne" />
                </div>

                {collecteeLines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune ligne de TVA collectée</p>
                    <p className="text-sm mt-1">Cliquez sur « Ajouter une ligne » pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {collecteeLines.map(line => (
                        <DynamicRateLine
                          key={line.id}
                          line={line}
                          label={getLabelForCategory(line.category, 'collectee')}
                          onBaseChange={v => updateLine(collecteeLines, setCollecteeLines, line.id, 'baseHT', v)}
                          onTvaChange={v => updateLine(collecteeLines, setCollecteeLines, line.id, 'tva', v)}
                          onRemove={() => removeLine(setCollecteeLines, line.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {collecteeLines.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-semibold">Total TVA Collectée</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(totalCollectee)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="rounded-2xl gap-2">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Button>
                <Button onClick={() => setStep(2)} className="btn-primary gap-2">
                  TVA Déductible <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 2: TVA Déductible (Dynamic) ═══ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-3xl mx-auto">
              <div className="bento-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    TVA Déductible
                  </h3>
                  <AddLineDropdown options={TVA_DEDUCTIBLE_OPTIONS} onAdd={addDeductibleLine} label="Ajouter une ligne" />
                </div>

                {deductibleLines.length === 0 && creditPrecedent === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune ligne de TVA déductible</p>
                    <p className="text-sm mt-1">Cliquez sur « Ajouter une ligne » pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {deductibleLines.map(line => (
                        <DynamicRateLine
                          key={line.id}
                          line={line}
                          label={getLabelForCategory(line.category, 'deductible')}
                          isDeductible
                          onBaseChange={v => updateLine(deductibleLines, setDeductibleLines, line.id, 'baseHT', v)}
                          onTvaChange={v => updateLine(deductibleLines, setDeductibleLines, line.id, 'tva', v)}
                          onRemove={() => removeLine(setDeductibleLines, line.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {creditPrecedent > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Crédit TVA période précédente</p>
                    </div>
                    <span className="font-bold text-primary">{formatCurrency(creditPrecedent)}</span>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                  <span className="font-semibold">Total TVA Déductible</span>
                  <span className="text-xl font-bold">{formatCurrency(totalDeductible)}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-2xl gap-2">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Button>
                <Button onClick={() => setStep(3)} className="btn-primary gap-2">
                  Miroir CA3 <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 3: Miroir CA3 ═══ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-3xl mx-auto">
              <div className="bento-card p-6 border-2 border-primary/20">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Fac-similé Déclaration CA3
                </h3>
                <p className="text-sm text-muted-foreground mb-6">Recopiez directement ces valeurs sur impots.gouv.fr</p>

                {/* Collectée lines */}
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérations imposables</div>
                {collecteeLines.map(line => (
                  <CA3Line key={line.id} label={`${getCA3LineForCategory(line.category, 'collectee')} – ${getLabelForCategory(line.category, 'collectee')}`} value={line.rate > 0 ? line.baseHT : line.baseHT} />
                ))}
                {collecteeLines.filter(l => l.rate > 0).length > 0 && (
                  <>
                    <div className="h-px bg-border my-3" />
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">TVA brute</div>
                    {collecteeLines.filter(l => l.tva > 0).map(line => (
                      <CA3Line key={`tva_${line.id}`} label={`${getCA3LineForCategory(line.category, 'collectee')} TVA – ${getLabelForCategory(line.category, 'collectee')}`} value={line.tva} />
                    ))}
                  </>
                )}
                <CA3Line label="Ligne 16 – Total TVA brute" value={totalCollectee} highlight />

                <div className="h-px bg-border my-4" />

                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">TVA déductible</div>
                {deductibleLines.map(line => (
                  <CA3Line key={line.id} label={`${getCA3LineForCategory(line.category, 'deductible')} – ${getLabelForCategory(line.category, 'deductible')}`} value={line.tva} />
                ))}
                {creditPrecedent > 0 && <CA3Line label="Ligne 22 – Crédit TVA antérieur" value={creditPrecedent} />}
                <CA3Line label="Ligne 23 – Total TVA déductible" value={totalDeductible} highlight />

                <div className="h-2 bg-border rounded my-4" />

                {montantAPayer > 0 ? (
                  <CA3Line label="Ligne 28 – TVA nette à payer" value={montantAPayer} highlight primary />
                ) : (
                  <CA3Line label="Ligne 25 – Crédit de TVA" value={creditTVA} highlight credit />
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-2xl gap-2">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Button>
                <Button onClick={() => setStep(4)} className="btn-primary gap-2">
                  Finaliser <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 4: Validation ═══ */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6 max-w-2xl mx-auto">
              <div className="bento-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-primary" />
                  Notes pour le mois prochain
                </h3>
                <CommentWithMentions
                  value={noteNextMonth}
                  onChange={setNoteNextMonth}
                  placeholder="Ex: Attente facture Amazon, régularisation loyer... (@ pour taguer un collègue)"
                  className="min-h-[100px]"
                  onMentionDetected={setMentionedUserIds}
                />
              </div>

              <div className="bento-card p-6 bg-primary/5 border-primary/20">
                <h3 className="text-lg font-bold mb-4">Résumé de la Déclaration</h3>
                <div className="space-y-2 text-sm">
                  {collecteeLines.length > 0 && collecteeLines.map(line => (
                    <div key={line.id} className="flex justify-between text-muted-foreground">
                      <span className="text-xs">{getLabelForCategory(line.category, 'collectee')}</span>
                      <span className="font-mono">{formatCurrency(line.tva)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium"><span>TVA Collectée</span><span className="font-mono font-semibold">{formatCurrency(totalCollectee)}</span></div>
                  <div className="flex justify-between font-medium"><span>TVA Déductible</span><span className="font-mono font-semibold">- {formatCurrency(totalDeductible)}</span></div>
                  <div className="h-px bg-border my-2" />
                  {montantAPayer > 0 ? (
                    <div className="flex justify-between text-lg font-bold">
                      <span>TVA à payer</span>
                      <span className="text-destructive">{formatCurrency(montantAPayer)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-lg font-bold">
                      <span>Crédit de TVA</span>
                      <span className="text-success">{formatCurrency(creditTVA)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="rounded-2xl gap-2">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Button>
                <Button onClick={handleValidate} className="btn-primary gap-2 bg-success hover:bg-success/90">
                  <Check className="w-4 h-4" /> Valider et Marquer comme Déclaré
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══ Sub-components ═══

function AddLineDropdown({ options, onAdd, label }: { options: TVARateOption[]; onAdd: (o: TVARateOption) => void; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={() => setOpen(!open)}>
        <Plus className="w-4 h-4" /> {label} <ChevronDown className="w-3 h-3" />
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden"
            >
              {options.map(opt => (
                <button
                  key={opt.category}
                  onClick={() => { onAdd(opt); setOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between text-sm"
                >
                  <span>{opt.label}</span>
                  {opt.ca3Line && <span className="text-xs text-muted-foreground font-mono">{opt.ca3Line}</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DynamicRateLine({ line, label, isDeductible, onBaseChange, onTvaChange, onRemove }: {
  line: TVALine; label: string; isDeductible?: boolean;
  onBaseChange: (v: number) => void; onTvaChange: (v: number) => void; onRemove: () => void;
}) {
  const anomaly = !isDeductible && line.rate > 0 && detectRateAnomaly(line.baseHT, line.tva, line.rate);
  const isExo = line.rate === 0 && !isDeductible;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="p-4 rounded-2xl bg-muted/30 border border-border/50"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {line.rate > 0 && !isDeductible && (
            <Badge variant="outline" className="text-xs font-mono">{(line.rate * 100).toFixed(1)}%</Badge>
          )}
          {isExo && (
            <Badge variant="outline" className="text-xs bg-muted">Exonéré</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className={cn("grid gap-3 items-end", isDeductible ? "grid-cols-1" : isExo ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[1fr,1fr,auto]")}>
        {!isDeductible && (
          <div>
            <Label className="text-xs text-muted-foreground">Base HT</Label>
            <Input
              type="number" step="0.01" placeholder="0.00"
              value={line.baseHT || ''}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                onBaseChange(val);
                // Auto-calculate TVA if rate > 0
                if (line.rate > 0) onTvaChange(Math.round(val * line.rate * 100) / 100);
              }}
              className="input-premium mt-1"
            />
          </div>
        )}
        {(!isExo || isDeductible) && (
          <div>
            <Label className="text-xs text-muted-foreground">{isDeductible ? 'Montant TVA déductible' : 'TVA Collectée'}</Label>
            <Input
              type="number" step="0.01" placeholder="0.00"
              value={line.tva || ''}
              onChange={e => onTvaChange(parseFloat(e.target.value) || 0)}
              className="input-premium mt-1"
            />
          </div>
        )}
        {anomaly && (
          <div className="flex items-center h-10">
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" /> Écart
            </Badge>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CA3Line({ label, value, highlight, primary, credit }: {
  label: string; value: number; highlight?: boolean; primary?: boolean; credit?: boolean;
}) {
  return (
    <div className={cn(
      "flex justify-between items-center py-2 px-4 rounded-xl",
      highlight ? "bg-muted font-bold" : "",
      primary ? "bg-destructive/10 text-destructive" : "",
      credit ? "bg-success/10 text-success" : ""
    )}>
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm">{formatNumber(value)} €</span>
    </div>
  );
}
