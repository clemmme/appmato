/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import { Search, FileCheck, Calendar, Scale, FileText, CheckCircle, AlertTriangle, ArrowRight, ChevronRight, Euro, Users, Building, Share2, Printer } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Client, BilanCycle } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTimer } from '@/contexts/TimerContext';
import { cn } from '@/lib/utils';

interface ClotureData {
  id?: string;
  client_id: string;
  exercice: string;
  rdv_bilan_date?: string;
  rdv_bilan_time?: string;
  rdv_bilan_duration?: number;
  rdv_bilan_done?: boolean;
  liasse_montee?: boolean;
  liasse_validee?: boolean;
  liasse_envoyee?: boolean;
  liasse_accuse_dgfip?: boolean;
  capital_social?: number;
  benefice_net?: number;
  reserve_legale_actuelle?: number;
  reserve_legale_dotation?: number;
  affectation_dividendes?: number;
  affectation_report?: number;
  continuite_exploitation?: boolean;
  conventions_reglementees?: { description: string; montant: number }[];
  remuneration_gerant?: number;
  charges_sociales_gerant?: number;
  fec_genere?: boolean;
  fec_envoye?: boolean;
  exercice_cloture?: boolean;
  status?: string;
}

interface ClotureAnnuelleViewProps {
  clients: Client[];
  bilanCyclesMap: Map<string, BilanCycle[]>;
  cloturesMap: Map<string, ClotureData>;
  onSaveCloture: (data: ClotureData) => Promise<void>;
  onCreateCalendarEvent: (clientId: string, date: string, time: string, duration: number, title: string) => Promise<void>;
}

type ClotureStep = 'rdv_bilan' | 'liasse' | 'juridique' | 'bascule';

const STEPS: { id: ClotureStep; label: string; icon: React.ElementType }[] = [
  { id: 'rdv_bilan', label: 'RDV Bilan', icon: Calendar },
  { id: 'liasse', label: 'Liasse Fiscale', icon: FileText },
  { id: 'juridique', label: 'Fiche Juridique', icon: Scale },
  { id: 'bascule', label: 'Bascule', icon: ArrowRight },
];

const KANBAN_COLUMNS: { id: ClotureStep | 'done'; label: string; icon: React.ElementType }[] = [
  { id: 'rdv_bilan', label: 'RDV Bilan', icon: Calendar },
  { id: 'liasse', label: 'Liasse Fiscale', icon: FileText },
  { id: 'juridique', label: 'Juridique', icon: Scale },
  { id: 'bascule', label: 'Bascule', icon: ArrowRight },
  { id: 'done', label: 'Tableau d\'Honneur', icon: CheckCircle },
];

export function ClotureAnnuelleView({
  clients,
  bilanCyclesMap,
  cloturesMap,
  onSaveCloture,
  onCreateCalendarEvent
}: ClotureAnnuelleViewProps) {
  const { isFavorite, toggleFavorite, sortWithFavorites } = useFavorites();
  const { startTimer, timerState } = useTimer();
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ClotureStep>('rdv_bilan');
  const [showJuridiqueFiche, setShowJuridiqueFiche] = useState(false);

  const [rdvDate, setRdvDate] = useState('');
  const [rdvTime, setRdvTime] = useState('10:00');
  const [rdvDuration, setRdvDuration] = useState(60);

  const eligibleClients = useMemo(() => {
    return clients.filter(client => {
      const cycles = bilanCyclesMap.get(client.id) || [];
      return cycles.some(c => c.supervision_status === 'validated');
    });
  }, [clients, bilanCyclesMap]);

  const filteredClients = useMemo(() => {
    const filtered = eligibleClients
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase()));
    return sortWithFavorites(filtered);
  }, [eligibleClients, search, sortWithFavorites]);

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  const currentCloture = useMemo(() => selectedClientId ? cloturesMap.get(selectedClientId) : undefined, [selectedClientId, cloturesMap]);

  const getClotureProgress = (clientId: string): number => {
    const cloture = cloturesMap.get(clientId);
    if (!cloture) return 0;
    let done = 0;
    if (cloture.rdv_bilan_done) done += 25;
    if (cloture.liasse_accuse_dgfip) done += 25;
    if (cloture.affectation_dividendes !== undefined || cloture.affectation_report !== undefined) done += 25;
    if (cloture.exercice_cloture) done += 25;
    return done;
  };

  const getStepStatus = (step: ClotureStep): 'pending' | 'active' | 'done' => {
    if (!currentCloture) return step === 'rdv_bilan' ? 'active' : 'pending';
    switch (step) {
      case 'rdv_bilan': return currentCloture.rdv_bilan_done ? 'done' : 'active';
      case 'liasse':
        if (!currentCloture.rdv_bilan_done) return 'pending';
        return currentCloture.liasse_accuse_dgfip ? 'done' : 'active';
      case 'juridique':
        if (!currentCloture.liasse_accuse_dgfip) return 'pending';
        return (currentCloture.affectation_dividendes !== undefined) ? 'done' : 'active';
      case 'bascule':
        if (currentCloture.affectation_dividendes === undefined) return 'pending';
        return currentCloture.exercice_cloture ? 'done' : 'active';
    }
  };

  const getClientColumn = (clientId: string): ClotureStep | 'done' => {
    const cloture = cloturesMap.get(clientId);
    if (!cloture) return 'rdv_bilan';
    if (cloture.exercice_cloture) return 'done';
    if (cloture.affectation_dividendes !== undefined) return 'bascule';
    if (cloture.liasse_accuse_dgfip) return 'juridique';
    if (cloture.rdv_bilan_done) return 'liasse';
    return 'rdv_bilan';
  };

  const calculateReserveLegale = useCallback((benefice: number, capital: number, reserveActuelle: number): number => {
    if (benefice <= 0) return 0;
    const plafond = capital * 0.1;
    if (reserveActuelle >= plafond) return 0;
    const dotation = benefice * 0.05;
    return Math.min(dotation, plafond - reserveActuelle);
  }, []);

  const handleScheduleRdv = async () => {
    if (!selectedClientId || !rdvDate || !rdvTime) return;
    await onCreateCalendarEvent(selectedClientId, rdvDate, rdvTime, rdvDuration, `RDV Bilan - ${selectedClient?.name}`);
    await onSaveCloture({ client_id: selectedClientId, exercice: new Date().getFullYear().toString(), rdv_bilan_date: rdvDate, rdv_bilan_time: rdvTime, rdv_bilan_duration: rdvDuration, status: 'rdv_bilan' });
  };

  const handleMarkRdvDone = async () => {
    if (!selectedClientId || !currentCloture) return;
    await onSaveCloture({ ...currentCloture, rdv_bilan_done: true, status: 'liasse' });
    setCurrentStep('liasse');
  };

  const handleUpdateLiasse = async (field: string, value: boolean) => {
    if (!selectedClientId) return;
    const update: any = { ...currentCloture, client_id: selectedClientId, exercice: new Date().getFullYear().toString() };
    update[field] = value;
    if (value && field === 'liasse_accuse_dgfip') update.status = 'juridique';
    await onSaveCloture(update);
  };

  const handleSaveJuridique = async (data: Partial<ClotureData>) => {
    if (!selectedClientId) return;
    await onSaveCloture({ ...currentCloture, client_id: selectedClientId, exercice: new Date().getFullYear().toString(), ...data, status: 'bascule' });
    setCurrentStep('bascule');
  };

  const handleFinalValidation = async () => {
    if (!selectedClientId || !currentCloture) return;
    await onSaveCloture({ ...currentCloture, exercice_cloture: true, status: 'done' });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clôtures Annuelles</h1>
          <p className="text-muted-foreground mt-1">Suivi au format Kanban des dossiers à clôturer</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un dossier..." className="input-premium pl-11 w-full" />
        </div>
      </div>

      {eligibleClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border">
          <FileCheck className="w-20 h-20 mb-4 opacity-30" />
          <p className="text-lg font-medium">Aucun dossier en clôture</p>
          <p className="text-sm mt-1">Les dossiers dont le Bilan a été supervisé apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-6 h-full items-start">
          {KANBAN_COLUMNS.map(col => {
            const colClients = filteredClients.filter(c => getClientColumn(c.id) === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-card/40 rounded-3xl border border-border/50 max-h-full overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-card rounded-t-3xl flex items-center justify-between sticky top-0">
                  <h3 className="font-semibold flex items-center gap-2">
                    <col.icon className={cn("w-4 h-4", col.id === 'done' ? "text-success" : "text-primary")} />
                    {col.label}
                  </h3>
                  <Badge variant="secondary" className="rounded-full bg-muted">{colClients.length}</Badge>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3">
                  {colClients.map(client => {
                    const progress = getClotureProgress(client.id);
                    return (
                      <div
                        key={client.id}
                        onClick={() => { setSelectedClientId(client.id); setCurrentStep(col.id === 'done' ? 'bascule' : col.id); setShowJuridiqueFiche(false); }}
                        className="p-4 bg-background rounded-2xl border border-border/50 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold cursor-pointer group-hover:text-primary transition-colors">{client.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="badge-neutral text-xs">{client.ref}</span>
                          {client.form && <span className="badge-success text-xs">{client.form}</span>}
                        </div>
                        <Progress value={progress} className={cn("h-1.5", progress === 100 && "[&>div]:bg-success")} />
                      </div>
                    );
                  })}
                  {colClients.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-background/30">
                      Aucun dossier
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet details for Client */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClientId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto sm:rounded-l-3xl p-0">
          {selectedClient && (
            showJuridiqueFiche ? (
              <JuridiqueFicheConsultable cloture={currentCloture} client={selectedClient} onClose={() => setShowJuridiqueFiche(false)} />
            ) : (
              <div className="p-6">
                <SheetHeader className="mb-6 border-b border-border pb-6 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-neutral text-xs">{selectedClient.ref}</span>
                    <Badge className="bg-success/10 text-success text-xs">En clôture</Badge>
                  </div>
                  <SheetTitle className="text-2xl text-left">{selectedClient.name}</SheetTitle>
                </SheetHeader>

                {/* Steps Navigator */}
                <div className="flex flex-wrap gap-2 mb-8 bg-muted/30 p-2 rounded-2xl border border-border/50">
                  {STEPS.map((step) => {
                    const status = getStepStatus(step.id);
                    return (
                      <button key={step.id} onClick={() => status !== 'pending' && setCurrentStep(step.id)} disabled={status === 'pending'}
                        className={cn("flex items-center gap-2 p-2 rounded-xl flex-1 justify-center min-w-[120px] transition-all",
                          status === 'done' && "bg-success/10 text-success font-medium",
                          status === 'active' && currentStep === step.id && "bg-background text-primary shadow-sm ring-1 ring-border",
                          status === 'active' && currentStep !== step.id && "hover:bg-background/80",
                          status === 'pending' && "opacity-40 cursor-not-allowed")}>
                        <step.icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{step.label}</span>
                        {status === 'done' && <CheckCircle className="w-3 h-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* Forms */}
                <div className="space-y-6">
                  {currentStep === 'rdv_bilan' && <RdvBilanStep cloture={currentCloture} rdvDate={rdvDate} rdvTime={rdvTime} rdvDuration={rdvDuration} onDateChange={setRdvDate} onTimeChange={setRdvTime} onDurationChange={setRdvDuration} onSchedule={handleScheduleRdv} onMarkDone={handleMarkRdvDone} />}
                  {currentStep === 'liasse' && <LiasseStep cloture={currentCloture} onUpdate={handleUpdateLiasse} onNext={() => setCurrentStep('juridique')} />}
                  {currentStep === 'juridique' && <JuridiqueStep cloture={currentCloture} client={selectedClient} calculateReserveLegale={calculateReserveLegale} onSave={handleSaveJuridique} onShowTicket={() => setShowJuridiqueFiche(true)} />}
                  {currentStep === 'bascule' && <BasculeStep cloture={currentCloture} client={selectedClient} onUpdate={(field: string, value: any) => onSaveCloture({ ...currentCloture, client_id: selectedClient.id, exercice: new Date().getFullYear().toString(), [field]: value })} onFinalValidation={handleFinalValidation} />}
                </div>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ========== Fiche Juridique Consultable ==========
function JuridiqueFicheConsultable({ cloture, client, onClose }: { cloture: ClotureData | undefined; client: Client; onClose: () => void }) {
  const handlePrint = () => window.print();
  const handleShare = () => {
    const text = `FICHE JURIDIQUE – ${client.name} (${client.ref})
Exercice : ${cloture?.exercice || new Date().getFullYear()}
Capital Social : ${(cloture?.capital_social || 0).toLocaleString('fr-FR')} €
Bénéfice Net : ${(cloture?.benefice_net || 0).toLocaleString('fr-FR')} €
Réserve Légale – Dotation : ${(cloture?.reserve_legale_dotation || 0).toLocaleString('fr-FR')} €
Dividendes : ${(cloture?.affectation_dividendes || 0).toLocaleString('fr-FR')} €
Report à Nouveau : ${(cloture?.affectation_report || 0).toLocaleString('fr-FR')} €
Continuité d'exploitation : ${cloture?.continuite_exploitation ? 'Oui' : 'Non'}
Rémunération Gérant : ${(cloture?.remuneration_gerant || 0).toLocaleString('fr-FR')} €
Charges Sociales : ${(cloture?.charges_sociales_gerant || 0).toLocaleString('fr-FR')} €`;

    if (navigator.share) {
      navigator.share({ title: `Fiche Juridique – ${client.name}`, text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Fiche copiée dans le presse-papier !');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" onClick={onClose} className="gap-2 rounded-xl">← Retour au workflow</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-xl"><Share2 className="w-4 h-4" /> Partager</Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Imprimer</Button>
        </div>
      </div>

      <div className="bento-card print:shadow-none print:border-black/20">
        <div className="border-b border-border pb-4 mb-6">
          <h1 className="text-2xl font-bold">📋 Fiche Juridique</h1>
          <p className="text-muted-foreground">{client.name} — {client.ref}</p>
          <p className="text-sm text-muted-foreground">Exercice {cloture?.exercice || new Date().getFullYear()}</p>
        </div>

        <div className="space-y-6">
          <Section title="Capital & Résultat">
            <Row label="Capital Social" value={`${(cloture?.capital_social || 0).toLocaleString('fr-FR')} €`} />
            <Row label="Bénéfice Net" value={`${(cloture?.benefice_net || 0).toLocaleString('fr-FR')} €`} />
            <Row label="Réserve Légale Actuelle" value={`${(cloture?.reserve_legale_actuelle || 0).toLocaleString('fr-FR')} €`} />
          </Section>

          <Section title="Affectation du Résultat">
            <Row label="Dotation Réserve Légale" value={`${(cloture?.reserve_legale_dotation || 0).toLocaleString('fr-FR')} €`} highlight />
            <Row label="Dividendes" value={`${(cloture?.affectation_dividendes || 0).toLocaleString('fr-FR')} €`} />
            <Row label="Report à Nouveau" value={`${(cloture?.affectation_report || 0).toLocaleString('fr-FR')} €`} />
          </Section>

          <Section title="Continuité d'Exploitation">
            <Row label="Continuité" value={cloture?.continuite_exploitation ? '✅ Oui' : '⚠️ Non – Rupture'} />
          </Section>

          <Section title="Rémunérations du Dirigeant">
            <Row label="Rémunération Gérant" value={`${(cloture?.remuneration_gerant || 0).toLocaleString('fr-FR')} €`} />
            <Row label="Charges Sociales" value={`${(cloture?.charges_sociales_gerant || 0).toLocaleString('fr-FR')} €`} />
            <Row label="Coût Total Dirigeant" value={`${((cloture?.remuneration_gerant || 0) + (cloture?.charges_sociales_gerant || 0)).toLocaleString('fr-FR')} €`} highlight />
          </Section>

          {cloture?.conventions_reglementees && cloture.conventions_reglementees.length > 0 && (
            <Section title="Conventions Réglementées">
              {cloture.conventions_reglementees.map((conv, idx) => (
                <Row key={idx} label={conv.description} value={`${conv.montant.toLocaleString('fr-FR')} €`} />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center py-2 px-3 rounded-lg", highlight ? "bg-primary/10 font-semibold" : "bg-muted/30")}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ========== Step Components ==========

function RdvBilanStep({ cloture, rdvDate, rdvTime, rdvDuration, onDateChange, onTimeChange, onDurationChange, onSchedule, onMarkDone }: any) {
  return (
    <div className="bento-card">
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><Calendar className="w-5 h-5 text-primary" /> Étape A : RDV Bilan</h3>
      {!cloture?.rdv_bilan_date ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Planifiez le rendez-vous de présentation du bilan avec le client.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="stat-label">Date du RDV</Label><Input type="date" value={rdvDate} onChange={(e) => onDateChange(e.target.value)} className="input-premium mt-2" /></div>
            <div><Label className="stat-label">Heure</Label><Input type="time" value={rdvTime} onChange={(e) => onTimeChange(e.target.value)} className="input-premium mt-2" /></div>
            <div><Label className="stat-label">Durée (min)</Label><Input type="number" value={rdvDuration} onChange={(e) => onDurationChange(Number(e.target.value))} className="input-premium mt-2" min={15} step={15} /></div>
          </div>
          <Button onClick={onSchedule} disabled={!rdvDate} className="gap-2 mt-4"><Calendar className="w-4 h-4" /> Planifier le RDV</Button>
          <p className="text-xs text-muted-foreground">Un événement sera créé dans le Calendrier.</p>
        </div>
      ) : !cloture.rdv_bilan_done ? (
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/30">
            <p className="font-medium flex items-center gap-2"><Calendar className="w-4 h-4" /> RDV planifié le {format(new Date(cloture.rdv_bilan_date), 'EEEE d MMMM yyyy', { locale: fr })} à {cloture.rdv_bilan_time}</p>
          </div>
          <Button onClick={onMarkDone} className="gap-2 bg-success hover:bg-success/90"><CheckCircle className="w-4 h-4" /> Marquer comme effectué</Button>
        </div>
      ) : (
        <div className="p-4 bg-success/10 rounded-xl border border-success/30">
          <p className="font-medium text-success flex items-center gap-2"><CheckCircle className="w-5 h-5" /> RDV Bilan effectué le {format(new Date(cloture.rdv_bilan_date), 'd MMMM yyyy', { locale: fr })}</p>
        </div>
      )}
    </div>
  );
}

function LiasseStep({ cloture, onUpdate, onNext }: any) {
  const steps = [
    { key: 'liasse_montee', label: 'Liasse montée' },
    { key: 'liasse_validee', label: 'Liasse validée' },
    { key: 'liasse_envoyee', label: 'Liasse envoyée' },
    { key: 'liasse_accuse_dgfip', label: 'Accusé DGFiP reçu' },
  ];
  return (
    <div className="bento-card">
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><FileText className="w-5 h-5 text-primary" /> Étape B : Liasse Fiscale</h3>
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isChecked = cloture?.[step.key] || false;
          const prevDone = idx === 0 ? true : cloture?.[steps[idx - 1].key];
          return (
            <div key={step.key} className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", isChecked ? "bg-success/10 border-success/30" : prevDone ? "bg-muted/50 border-border" : "bg-muted/20 border-border/50 opacity-50")}>
              <Checkbox checked={isChecked} disabled={!prevDone} onCheckedChange={(checked) => onUpdate(step.key, checked)} className="data-[state=checked]:bg-success data-[state=checked]:border-success" />
              <span className={cn("font-medium", isChecked && "text-success")}>{step.label}</span>
              {isChecked && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
            </div>
          );
        })}
      </div>
      {cloture?.liasse_accuse_dgfip && (
        <Button onClick={onNext} className="gap-2 mt-6">Continuer vers Fiche Juridique <ChevronRight className="w-4 h-4" /></Button>
      )}
    </div>
  );
}

function JuridiqueStep({ cloture, calculateReserveLegale, onSave, onShowTicket }: any) {
  const [capital, setCapital] = useState(cloture?.capital_social || 0);
  const [benefice, setBenefice] = useState(cloture?.benefice_net || 0);
  const [reserveActuelle, setReserveActuelle] = useState(cloture?.reserve_legale_actuelle || 0);
  const [continuite, setContinuite] = useState(cloture?.continuite_exploitation ?? true);
  const [remuGerant, setRemuGerant] = useState(cloture?.remuneration_gerant || 0);
  const [chargesGerant, setChargesGerant] = useState(cloture?.charges_sociales_gerant || 0);
  const [conventions] = useState<{ description: string; montant: number }[]>(cloture?.conventions_reglementees || []);
  const dotationRL = calculateReserveLegale(benefice, capital, reserveActuelle);
  const resteAAffecter = benefice - dotationRL;
  const [dividendes, setDividendes] = useState(0);
  const report = resteAAffecter - dividendes;

  const handleSave = () => {
    onSave({ capital_social: capital, benefice_net: benefice, reserve_legale_actuelle: reserveActuelle, reserve_legale_dotation: dotationRL, affectation_dividendes: dividendes, affectation_report: report, continuite_exploitation: continuite, conventions_reglementees: conventions, remuneration_gerant: remuGerant, charges_sociales_gerant: chargesGerant });
  };

  return (
    <div className="space-y-6">
      <div className="bento-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Étape C : Fiche Juridique</h3>
          {cloture?.affectation_dividendes !== undefined && (
            <Button variant="outline" size="sm" onClick={onShowTicket} className="gap-2 rounded-xl">
              <Printer className="w-4 h-4" /> Générer PDF
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div><Label className="stat-label">Capital Social</Label><Input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="input-premium mt-2" /></div>
          <div><Label className="stat-label">Bénéfice Net</Label><Input type="number" value={benefice} onChange={(e) => setBenefice(Number(e.target.value))} className="input-premium mt-2" /></div>
          <div><Label className="stat-label">Réserve Légale Actuelle</Label><Input type="number" value={reserveActuelle} onChange={(e) => setReserveActuelle(Number(e.target.value))} className="input-premium mt-2" /></div>
        </div>
        <div className="p-4 bg-primary/10 rounded-xl border border-primary/30 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dotation Réserve Légale (5% plafonné à 10% du capital)</p>
              <p className="text-2xl font-bold text-primary">{dotationRL.toLocaleString('fr-FR')} €</p>
            </div>
            <Euro className="w-8 h-8 text-primary/50" />
          </div>
        </div>
        {benefice > 0 && (
          <div className="space-y-4 mb-6">
            <p className="font-medium">Reste à affecter : <span className="text-primary">{resteAAffecter.toLocaleString('fr-FR')} €</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="stat-label">Dividendes</Label><Input type="number" value={dividendes} onChange={(e) => setDividendes(Math.min(Number(e.target.value), resteAAffecter))} max={resteAAffecter} className="input-premium mt-2" /></div>
              <div><Label className="stat-label">Report à nouveau</Label><Input type="number" value={report} readOnly className="input-premium mt-2 bg-muted" /></div>
            </div>
          </div>
        )}
      </div>

      <div className="bento-card">
        <h4 className="font-medium flex items-center gap-2 mb-4"><Building className="w-4 h-4" /> Continuité d'Exploitation</h4>
        <div className="flex items-center gap-4">
          <Checkbox checked={continuite} onCheckedChange={(c) => setContinuite(!!c)} />
          <span>Les comptes ont été établis en continuité d'exploitation</span>
        </div>
        {!continuite && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-xl border border-destructive/30">
            <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Attention : Rupture de continuité d'exploitation</p>
          </div>
        )}
      </div>

      <div className="bento-card">
        <h4 className="font-medium flex items-center gap-2 mb-4"><Users className="w-4 h-4" /> Rémunérations du Dirigeant</h4>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="stat-label">Rémunération Gérant</Label><Input type="number" value={remuGerant} onChange={(e) => setRemuGerant(Number(e.target.value))} className="input-premium mt-2" /></div>
          <div><Label className="stat-label">Charges Sociales Gérant</Label><Input type="number" value={chargesGerant} onChange={(e) => setChargesGerant(Number(e.target.value))} className="input-premium mt-2" /></div>
        </div>
      </div>

      <Button onClick={handleSave} className="gap-2 w-full"><CheckCircle className="w-4 h-4" /> Valider la Fiche Juridique</Button>
    </div>
  );
}

function BasculeStep({ cloture, onUpdate, onFinalValidation }: any) {

  return (
    <div className="space-y-6">
      <div className="bento-card">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><ArrowRight className="w-5 h-5 text-primary" /> Étape D : Bascule d'Exercice</h3>
        <div className="space-y-4">
          {/* Étape 1 : Édition du dossier annuel */}
          <div className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", cloture?.fec_genere ? "bg-success/10 border-success/30" : "bg-muted/50 border-border")}>
            <Checkbox checked={cloture?.fec_genere || false} onCheckedChange={(c) => onUpdate('fec_genere', c)} />
            <div>
              <span className={cn("font-medium", cloture?.fec_genere && "text-success")}>Édition du dossier annuel</span>
              <p className="text-xs text-muted-foreground">Vérification et édition complète du dossier</p>
            </div>
            {cloture?.fec_genere && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
          </div>

          {/* Étape 2 : Validation des écritures */}
          <div className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", cloture?.fec_envoye ? "bg-success/10 border-success/30" : !cloture?.fec_genere ? "bg-muted/20 border-border/50 opacity-50" : "bg-muted/50 border-border")}>
            <Checkbox checked={cloture?.fec_envoye || false} disabled={!cloture?.fec_genere} onCheckedChange={(c) => onUpdate('fec_envoye', c)} />
            <div>
              <span className={cn("font-medium", cloture?.fec_envoye && "text-success")}>Validation des écritures</span>
              <p className="text-xs text-muted-foreground">Contrôle final des écritures comptables</p>
            </div>
            {cloture?.fec_envoye && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
          </div>

          {/* Étape 3 : Tirage définitif + Export FEC */}
          <div className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", cloture?.exercice_cloture ? "bg-success/10 border-success/30" : !cloture?.fec_envoye ? "bg-muted/20 border-border/50 opacity-50" : "bg-muted/50 border-border")}>
            <Checkbox checked={false} disabled={!cloture?.fec_envoye || cloture?.exercice_cloture} onCheckedChange={() => { }} />
            <div>
              <span className="font-medium">Tirage définitif + Export FEC</span>
              <p className="text-xs text-muted-foreground">Génération du Fichier des Écritures Comptables</p>
            </div>
          </div>

          {/* Étape 4 : Report à nouveau + Journal de clôture */}
          <div className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", cloture?.exercice_cloture ? "bg-success/10 border-success/30" : "bg-muted/20 border-border/50 opacity-50")}>
            <Checkbox checked={false} disabled={true} onCheckedChange={() => { }} />
            <div>
              <span className="font-medium">Report à Nouveau + Journal de clôture</span>
              <p className="text-xs text-muted-foreground">Édition du journal de clôture et report des soldes</p>
            </div>
          </div>
        </div>

        {cloture?.fec_envoye && !cloture?.exercice_cloture && (
          <Button onClick={onFinalValidation} className="gap-2 w-full mt-6 bg-success hover:bg-success/90">
            <CheckCircle className="w-4 h-4" /> Clôturer l'Exercice (Tirage + Report + Bascule N+1)
          </Button>
        )}

        {cloture?.exercice_cloture && (
          <div className="mt-6 p-6 bg-success/10 rounded-xl border border-success/30 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <h4 className="font-bold text-success text-lg">Exercice Clôturé !</h4>
            <p className="text-sm text-muted-foreground mt-1">FEC exporté, journal de clôture édité, report à nouveau effectué.</p>
          </div>
        )}
      </div>
    </div>
  );
}
