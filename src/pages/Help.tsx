import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { HelpCircle, ClipboardList, Calculator, FileCheck, Eye, Archive, Scale, Clock, Users, LayoutDashboard, Phone, Mail, ChevronDown, ChevronUp, Timer, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HELP_SECTIONS = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500 bg-blue-100',
    title: 'Pilotage Cabinet',
    questions: [
      { q: "Comment est calculée la rentabilité ?", a: "La rentabilité = (Honoraires annuels / Temps passé en heures). Le temps passé est collecté via le Chronomètre et le Calendrier. Plus vous imputez du temps, plus le calcul est précis." },
      { q: "Pourquoi mes Top 3 / Flop 3 ne s'affichent pas ?", a: "Vous devez avoir saisi du temps sur vos dossiers via le Chronomètre ou le Calendrier ET avoir renseigné les honoraires dans 'Mes Dossiers'." },
    ]
  },
  {
    id: 'dossiers',
    icon: Users,
    color: 'text-emerald-500 bg-emerald-100',
    title: 'Mes Dossiers',
    questions: [
      { q: "Comment importer mes clients ?", a: "Allez dans 'Mes Dossiers' → cliquez sur 'Importer' → téléchargez d'abord la matrice CSV modèle → remplissez-la → importez-la. Le format doit respecter les colonnes de la matrice." },
      { q: "Comment modifier un dossier ?", a: "Cliquez sur un dossier dans la liste pour ouvrir sa fiche détaillée. Modifiez les informations puis sauvegardez." },
    ]
  },
  {
    id: 'suivi',
    icon: ClipboardList,
    color: 'text-primary bg-primary/10',
    title: 'Suivi des Dossiers',
    questions: [
      { q: "Comment fonctionnent les indicateurs d'échéance ?", a: "Les indicateurs se basent sur la date de clôture et le régime TVA de chaque dossier. Un dossier en retard apparaît en rouge, à traiter bientôt en orange." },
    ]
  },
  {
    id: 'tva',
    icon: Calculator,
    color: 'text-red-500 bg-red-100',
    title: 'Pilotage TVA',
    questions: [
      { q: "Quel est le workflow TVA ?", a: "6 étapes séquentielles : Saisie → Révision → Calcul → Validation → Télédéclaration → Comptabilisation. Chaque étape doit être cochée pour débloquer la suivante." },
      { q: "Comment gérer un crédit de TVA ?", a: "Renseignez le montant dans le champ 'Crédit' de la période concernée. Il sera reporté automatiquement." },
    ]
  },
  {
    id: 'revision',
    icon: FileCheck,
    color: 'text-purple-500 bg-purple-100',
    title: 'Révision',
    questions: [
      { q: "Comment envoyer un dossier en supervision ?", a: "Dans le module Révision, montez le slider au maximum (Finalisé) sur tous les cycles, puis activez le bouton 'Envoyer en Supervision'. Le dossier apparaîtra dans le module Supervision." },
      { q: "Que sont les points critiques ?", a: "Les points critiques sont des alertes (Caisse, Impôts, Fournisseurs, Blocages) que vous remontez pendant la révision et qui seront visibles par le superviseur." },
    ]
  },
  {
    id: 'supervision',
    icon: Eye,
    color: 'text-primary bg-primary/10',
    title: 'Supervision',
    questions: [
      { q: "Comment annuler une validation ?", a: "Si un dossier a été validé par erreur, cliquez sur 'Annuler la validation' dans la fiche du dossier supervisé. Il repassera en statut 'RDV Planifié' ou 'En attente'." },
      { q: "Le RDV apparaît-il dans le Calendrier ?", a: "Oui, toute date de RDV de supervision saisie génère automatiquement un événement dans le Calendrier." },
    ]
  },
  {
    id: 'cloture',
    icon: Archive,
    color: 'text-pink-500 bg-pink-100',
    title: 'Clôture Annuelle',
    questions: [
      { q: "Quelles sont les étapes de clôture ?", a: "4 étapes : A) RDV Bilan B) Liasse Fiscale (Montée → Validée → Envoyée → Accusé DGFiP) C) Fiche Juridique (Réserve Légale, Affectation, Conventions) D) Bascule : Édition dossier annuel → Validation écritures → Tirage définitif + Export FEC → Report à nouveau + Journal de clôture." },
      { q: "Comment accéder à la fiche juridique ?", a: "La fiche juridique est accessible dans l'étape C du workflow de clôture. Vous pouvez la consulter et la partager via le bouton dédié." },
    ]
  },
  {
    id: 'temps',
    icon: Clock,
    color: 'text-cyan-500 bg-cyan-100',
    title: 'Calendrier & Chrono',
    questions: [
      { q: "Comment fonctionne le chronomètre ?", a: "Le widget flottant est accessible depuis n'importe quel module. Sélectionnez un dossier, cliquez sur Play. L'heure de début est enregistrée. Vous pouvez mettre en pause sans perdre l'heure initiale. À l'arrêt, le temps est enregistré et apparaît dans le Calendrier." },
      { q: "Pourquoi mon temps n'apparaît pas dans le Calendrier ?", a: "Vérifiez que vous avez bien arrêté le chronomètre (pas juste mis en pause). Le temps est enregistré uniquement à l'arrêt définitif." },
    ]
  },
];

export default function Help() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'aide' | 'contact'>('aide');

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            Centre d'Aide
          </h1>
          <p className="text-muted-foreground mt-1">Trouvez des réponses ou contactez le support</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === 'aide' ? 'default' : 'outline'} onClick={() => setActiveTab('aide')} className="gap-2 rounded-xl">
            <HelpCircle className="w-4 h-4" /> Aide par module
          </Button>
          <Button variant={activeTab === 'contact' ? 'default' : 'outline'} onClick={() => setActiveTab('contact')} className="gap-2 rounded-xl">
            <MessageCircle className="w-4 h-4" /> Contacter le support
          </Button>
        </div>

        {activeTab === 'aide' && (
          <div className="space-y-3">
            {HELP_SECTIONS.map(section => (
              <div key={section.id} className="bento-card !p-0 overflow-hidden">
                <button
                  onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", section.color)}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold flex-1 text-left">{section.title}</span>
                  <span className="text-xs text-muted-foreground mr-2">{section.questions.length} questions</span>
                  {openSection === section.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {openSection === section.id && (
                  <div className="border-t border-border/50 px-5 pb-5 space-y-4 pt-4 animate-fade-in">
                    {section.questions.map((faq, idx) => (
                      <div key={idx}>
                        <p className="font-medium text-sm mb-1">❓ {faq.q}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bento-card">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Contactez le Service Client</h2>
              <p className="text-muted-foreground text-sm">Notre équipe est à votre disposition pour vous aider</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href="tel:0623072940" className="flex items-center gap-4 p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone className="w-7 h-7 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                  <p className="text-lg font-bold">06 23 07 29 40</p>
                  <p className="text-xs text-muted-foreground mt-1">Clément AMATO</p>
                </div>
              </a>

              <a href="mailto:clement.amato.pro@gmail.com" className="flex items-center gap-4 p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-bold break-all">clement.amato.pro@gmail.com</p>
                  <p className="text-xs text-muted-foreground mt-1">Réponse sous 24h</p>
                </div>
              </a>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm">
                💡 <strong>Astuce :</strong> Avant de nous contacter, consultez la section <strong>Aide par module</strong> — votre réponse s'y trouve peut-être !
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
