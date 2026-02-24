import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Download, Upload, LayoutDashboard, Sparkles, Check, ClipboardList, Calculator, FileCheck, Eye, Archive, Scale, Clock, Users, Calendar as CalendarIcon, Timer, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Bienvenue sur APPMATO', subtitle: 'Votre assistant de gestion de cabinet comptable', icon: Sparkles },
  { id: 'setup', title: 'Configuration Initiale', subtitle: 'Importez vos données pour commencer', icon: Upload },
  { id: 'dashboard', title: 'Pilotage Cabinet', subtitle: 'Votre tableau de bord central', icon: LayoutDashboard },
  { id: 'dossiers', title: 'Mes Dossiers', subtitle: 'La base de votre cabinet', icon: Users },
  { id: 'production', title: 'Les Modules de Production', subtitle: 'Votre chaîne de travail complète', icon: ClipboardList },
  { id: 'supervision', title: 'Supervision & Clôture', subtitle: 'Contrôle qualité et juridique', icon: Eye },
  { id: 'temps', title: 'Calendrier & Chrono', subtitle: 'Suivi du temps et planification', icon: Clock },
  { id: 'ready', title: 'Vous êtes prêt !', subtitle: 'Commencez à utiliser APPMATO', icon: Check },
];

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setCurrentStep(0);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleDownloadMatrix = () => {
    const csvContent = `Ref,Forme,Nom,SIREN,Code APE,Clôture,Régime,Jour,Email Gérant,Téléphone,Adresse,Honoraires Compta,Honoraires Social,Honoraires Juridique,Factures/mois,Écritures,Établissements
001,SARL,Exemple SARL,123456789,6201Z,12-31,M,15,gerant@exemple.com,0102030405,1 rue de Paris,3000,1500,500,50,200,1`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'matrice_import_dossiers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 px-8 py-6">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="w-7 h-7 text-primary" />; })()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
              <p className="text-muted-foreground">{STEPS[currentStep].subtitle}</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-6">
            {STEPS.map((_, idx) => (
              <div key={idx} className={cn("flex-1 h-1.5 rounded-full transition-colors", idx <= currentStep ? "bg-primary" : "bg-primary/20")} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-[340px] max-h-[50vh] overflow-y-auto">
          {currentStep === 0 && (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Bonjour et bienvenue ! 👋</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                APPMATO est votre solution collaborative pour piloter votre cabinet comptable en équipe.
                Ce guide va présenter <strong>tous les modules</strong> et la gestion des dossiers partagés.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">7</p>
                  <p className="text-xs text-muted-foreground">Modules</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Cloud</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">∞</p>
                  <p className="text-xs text-muted-foreground">Dossiers</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-muted-foreground text-center mb-6">
                Pour démarrer, importez votre portefeuille clients via notre matrice CSV.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleDownloadMatrix} className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group text-left">
                  <Download className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-1">Télécharger la Matrice</h4>
                  <p className="text-xs text-muted-foreground">Modèle CSV prêt à remplir</p>
                </button>
                <button onClick={onClose} className="p-5 rounded-2xl border-2 border-dashed border-border hover:border-success hover:bg-success/5 transition-all group text-left">
                  <Upload className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-semibold mb-1">Importer mes Données</h4>
                  <p className="text-xs text-muted-foreground">Depuis "Mes Dossiers"</p>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <ModuleCard icon={LayoutDashboard} color="text-blue-500 bg-blue-100" title="Tableau de Bord – Pilotage Cabinet"
                description="Vue d'ensemble de votre activité : chiffre d'affaires, rentabilité par dossier, Top 3 / Flop 3 clients. Identifiez rapidement les dossiers les plus rentables et ceux qui nécessitent une attention." />
              <ModuleCard icon={BarChart3} color="text-indigo-500 bg-indigo-100" title="Indicateurs clés"
                description="Honoraires totaux, temps passé vs honoraires, taux de rentabilité. Le dashboard agrège automatiquement les données de tous les modules." />
              <TipBox text="Le dashboard se met à jour en temps réel avec les saisies de temps du Chronomètre et les données de production." />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <ModuleCard icon={Users} color="text-emerald-500 bg-emerald-100" title="Mes Dossiers – Vue 360°"
                description="Centralisez toutes les informations de vos clients : forme juridique, SIREN, régime TVA, dates de clôture, honoraires détaillés (Compta / Social / Juridique). Import CSV en masse." />
              <ModuleCard icon={ClipboardList} color="text-primary bg-primary/10" title="Suivi des Dossiers"
                description="Suivez l'avancement de chaque dossier client avec des indicateurs d'échéance dynamiques. Visualisez en un coup d'œil quels dossiers sont à jour, en retard ou prioritaires." />
              <TipBox text="Importez votre portefeuille via CSV dans 'Mes Dossiers', puis tous les modules se rempliront automatiquement." />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <ModuleCard icon={Calculator} color="text-red-500 bg-red-100" title="Pilotage TVA"
                description="Gérez la TVA de chaque dossier avec un workflow en 6 étapes : Saisie → Révision → Calcul → Validation → Télédéclaration → Compta. Suivi des crédits de TVA et notes." />
              <ModuleCard icon={FileCheck} color="text-purple-500 bg-purple-100" title="Révision"
                description="Module de révision cyclique par domaine (Achats, Ventes, Banque, Social, Fiscal, Immobilisations). Slider de progression, points critiques et commentaires. Envoi en supervision d'un clic." />
              <ModuleCard icon={Scale} color="text-teal-500 bg-teal-100" title="Cadrage TVA (Ctrl)"
                description="Outil de contrôle croisé : vérifiez la cohérence entre le CA déclaré et la TVA calculée à différents taux (20%, 10%, 5.5%, 0%)." />
              <TipBox text="Le workflow suit un ordre logique : Suivi → TVA → Révision → Supervision → Clôture. Chaque étape alimente la suivante." />
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <ModuleCard icon={Eye} color="text-primary bg-primary/10" title="Supervision"
                description="Contrôle qualité des dossiers envoyés depuis la Révision. Fiche avec points critiques, QCM de diagnostic et planification du RDV de supervision (créé automatiquement dans le Calendrier). Statuts : En attente → RDV Planifié → Validé." />
              <ModuleCard icon={Archive} color="text-pink-500 bg-pink-100" title="Clôture Annuelle"
                description="Module final post-supervision en 4 étapes : A) Planification RDV Bilan B) Checklist Liasse Fiscale C) Fiche Juridique intelligente (Réserve Légale, Affectation, Conventions) D) Bascule d'exercice avec export FEC et journal de clôture." />
              <TipBox text="La fiche juridique calcule automatiquement la Réserve Légale (5% du bénéfice, plafonné à 10% du capital). Vous pouvez la consulter et la partager à tout moment." />
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <ModuleCard icon={CalendarIcon} color="text-cyan-500 bg-cyan-100" title="Calendrier / Agenda"
                description="Vue Semaine et Jour avec créneaux de 8h à 20h. Planifiez vos événements (Travail de fond, RDV Client, Supervision, Révision). Tous les RDV des autres modules apparaissent ici automatiquement." />
              <ModuleCard icon={Timer} color="text-violet-500 bg-violet-100" title="Chronomètre Global"
                description="Widget flottant accessible depuis n'importe quel module. Démarrez un chrono sur un dossier, l'heure exacte de début est enregistrée et le bloc apparaît dans le Calendrier. Pause/Reprise sans perte de l'heure initiale." />
              <TipBox text="Le Chronomètre et le Calendrier alimentent directement le calcul de rentabilité du Dashboard. Chaque minute comptée se traduit en données de pilotage." />
            </div>
          )}

          {currentStep === 7 && (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center mb-5">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Vous êtes prêt ! 🚀</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Commencez par importer vos dossiers clients, puis explorez chaque module à votre rythme.
              </p>
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  💡 Besoin d'aide ? Accédez à la page <strong>Aide</strong> dans les Paramètres ou cliquez sur <span className="text-primary font-semibold">?</span> dans la barre de navigation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border/50 flex justify-between">
          <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 0} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          <span className="text-xs text-muted-foreground self-center">{currentStep + 1} / {STEPS.length}</span>
          <Button onClick={handleNext} className="gap-2">
            {currentStep === STEPS.length - 1 ? <><Check className="w-4 h-4" /> Terminer</> : <>Suivant <ChevronRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, color, title, description }: { icon: React.ElementType; color: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold mb-1 text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TipBox({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
      <p className="text-xs">💡 <strong>Astuce :</strong> {text}</p>
    </div>
  );
}
