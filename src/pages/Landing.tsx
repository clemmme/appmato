import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import {
  Check, ArrowRight, BarChart3, Clock, FileText, Users,
  Shield, Zap, Sparkles, Star, TrendingUp, Cloud,
  Database, Server, MonitorPlay, MousePointerClick, CheckCircle2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatedMockup } from '@/components/landing/AnimatedMockup';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AppLogo } from '@/components/ui/AppLogo';

const features = [
  { icon: Shield, title: 'Sécurité Hermétique', description: "Isolation totale des données par cabinet (RLS). Vos dossiers ne sont vus que par votre équipe accréditée." },
  { icon: Clock, title: 'Rentabilité Live-Timer', description: 'Suivi du temps embarqué. Calculez votre taux horaire effectif par dossier instantanément pendant que vous produisez.' },
  { icon: Users, title: 'Vue Client 360°', description: 'Centralisez toutes les informations, la production et les échanges de votre portefeuille clients en un seul écran.' },
  { icon: BarChart3, title: 'Tableaux de bord (KPIs)', description: 'Météo de production, urgences, et graphiques de suivi pour piloter votre activité d\'expertise sans angle mort.' },
  { icon: Cloud, title: 'Souveraineté (GCP)', description: 'Auto-hébergement possible sur Google Cloud Platform. Reprenez le contrôle complet de votre infrastructure.' },
  { icon: FileText, title: 'Suivi Bilans & Kanban', description: 'Gérez vos cycles de clôture annuelle avec un tableau Kanban moderne et des exports PDF natifs.' },
];

const stats = [
  { value: 98, suffix: '%', label: 'Satisfaction clients' },
  { value: 2500, suffix: '+', label: 'Dossiers gérés' },
  { value: 40, suffix: '%', label: 'Temps gagné' },
  { value: 150, suffix: '+', label: 'Cabinets actifs' },
];

const testimonials = [
  {
    quote: "APPMATO a transformé la façon dont nous gérons nos déclarations TVA. Un gain de temps incroyable.",
    author: "Marie L.",
    role: "Expert-Comptable, Cabinet ML & Associés",
    rating: 5,
  },
  {
    quote: "L'analyse de rentabilité par dossier nous a permis de renégocier 30% de nos honoraires à la hausse.",
    author: "Thomas D.",
    role: "Associé, Cabinet Dupont",
    rating: 5,
  },
  {
    quote: "Le module de supervision est exactement ce qu'il nous manquait pour structurer notre workflow.",
    author: "Sophie R.",
    role: "Chef de mission, Cabinet RGS",
    rating: 5,
  },
];

const plans = [
  {
    name: 'Solo / Indépendant', description: 'Pour les experts-comptables libéraux',
    monthlyPrice: 29, yearlyPrice: 278,
    features: ["Idéal 1 Utilisateur", "Jusqu'à 50 dossiers clients", 'Pilotage TVA & Révision', 'Export CSV/PDF standards', 'Support par email']
  },
  {
    name: 'Cabinet Souverain', description: 'L\'expérience ERP complète pour votre équipe',
    monthlyPrice: 99, yearlyPrice: 950, popular: true,
    features: ['Jusqu\'à 10 collaborateurs', 'Dossiers clients illimités', 'Moteur Live-Timer et Rentabilité', 'Agenda de passation intégré', 'Isolation Multi-Tenant (RLS)', 'Support prioritaire (SLA 4h)']
  }
];

const workflowSteps = [
  { icon: MousePointerClick, title: '1. Connectez votre cabinet', description: 'Créez votre environnement sécurisé et invitez vos collaborateurs en quelques clics.' },
  { icon: Cloud, title: '2. Centralisez vos dossiers', description: 'Importez votre portefeuille existant et retrouvez toutes les pièces au même endroit.' },
  { icon: MonitorPlay, title: '3. Produisez et analysez', description: 'Saisissez vos temps, bouclez vos révisions et visualisez votre rentabilité en temps réel.' },
];

const faqs = [
  { q: "Où sont hébergées mes données ?", a: "Contrairement aux solutions classiques, Appmatogest peut être hébergé sur une instance Google Cloud Platform (GCP) privée, située en Europe (Paris). Vous êtes le seul propriétaire." },
  { q: "Le logiciel est-il sécurisé pour mes clients ?", a: "L'architecture repose sur des règles RLS (Row Level Security) natives à PostgreSQL. Un collaborateur n'a mathématiquement accès qu'aux données de son cabinet." },
  { q: "Est-ce difficile à prendre en main ?", a: "L'interface a été conçue pour être aussi fluide qu'une application grand public (navigation instantanée, design épuré, mode sombre)." },
];

const useCases = [
  {
    title: "Experts-Comptables Indépendants",
    description: "Ceux qui se lancent et veulent un outil propre sans frais cachés, regroupant la gestion des temps, le suivi des bilans et la supervision des déclarations TVA avec une TPE ou une dizaine de dossiers."
  },
  {
    title: "Jeunes Cabinets en Croissance",
    description: "Les équipes de 2 à 10 personnes nécessitant une vraie collaboration. Chaque membre a son rôle, ses dossiers assignés et le gérant garde une vue granulaire sur la rentabilité globale sans s'arracher les cheveux sur Excel."
  },
  {
    title: "Cabinets matures en quête de souveraineté",
    description: "Ceux qui souhaitent s'extraire des SaaS mutualisés imposant tarifs arbitraires et dépendance technique, pour adopter un ERP auto-hébergé sur un serveur Google Cloud dont ils sont les maîtres absolus."
  },
];

export default function Landing() {
  const [isYearly, setIsYearly] = useState(false);
  const navigate = useNavigate();
  const { colorTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const classes = Array.from(root.classList);
    classes.filter(c => c.startsWith('theme-')).forEach(c => root.classList.remove(c));
    root.classList.add('theme-orange');

    return () => {
      const root = document.documentElement;
      const classes = Array.from(root.classList);
      classes.filter(c => c.startsWith('theme-')).forEach(c => root.classList.remove(c));
      root.classList.add(`theme-${colorTheme}`);
    };
  }, [colorTheme]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <AppLogo size="sm" showSubtext={false} />
          <Button onClick={() => navigate('/auth')} className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 font-semibold">
            Se connecter
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 lg:py-32 px-6 relative overflow-hidden">
        {/* Halos lumineux en arrière-plan du Hero */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-20 pointer-events-none -space-y-32">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/40 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] mix-blend-screen" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium mb-10 border border-primary/20 animate-fade-in shadow-sm">
              <Sparkles className="w-5 h-5" />
              <span>Nouveau : Le pilotage temps réel enfin accessible</span>
            </div>

            <h1 className="text-6xl lg:text-[5.5rem] font-extrabold tracking-tight text-foreground leading-[1.05] mb-8">
              L'ERP des cabinets,<br />
              <span className="text-primary/90">souverain et temps réel.</span>
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              Pilotez votre production, gérez vos temps et augmentez votre rentabilité avec un outil moderne conçu spécifiquement pour les experts-comptables.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button size="lg" className="h-16 px-10 text-lg rounded-full bg-primary hover:bg-primary/90 font-bold shadow-xl shadow-primary/20 transition-transform hover:scale-105" onClick={() => navigate('/auth')}>
                Commencer l'essai gratuit
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-lg rounded-full font-bold border-border/50 hover:bg-muted/50 transition-colors" onClick={() => navigate('/auth')}>
                Voir une démo
              </Button>
            </div>

            {/* Preuve sociale Hero */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex -space-x-2 mr-2">
                {['JD', 'ML', 'TD'].map((initials, i) => (
                  <div key={i} className={cn("w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold shadow-sm", ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'][i])}>
                    {initials}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-yellow-500 mr-1">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <span>Noté 4.9/5 par des confrères</span>
            </div>
          </div>
          <div className="mt-16 relative mx-auto max-w-5xl">
            <AnimatedMockup />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl lg:text-6xl font-extrabold text-foreground mb-3 flex justify-center items-center tracking-tight">
                  <AnimatedCounter value={stat.value} />
                  <span>{stat.suffix}</span>
                </div>
                <div className="text-xl text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100/50 text-orange-600 font-medium mb-6 text-sm border border-orange-200">
              <Zap className="w-4 h-4" />
              <span>Performances maximales</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Cœur du réacteur</h2>
            <p className="text-muted-foreground text-xl">
              Tout ce dont vous avez besoin pour moderniser la gestion de votre structure, sans superflu.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 p-2">
            {features.map((feature, idx) => (
              <div key={idx} className="p-8 rounded-[2rem] bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center mb-8">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Le pilotage simplifié en 3 étapes</h2>
            <p className="text-muted-foreground text-xl">
              Une transition en douceur pour numériser votre processus de production.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Traits de connexion visuels cachés sur mobile */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

            {workflowSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center relative bg-background">
                <div className="w-32 h-32 rounded-full bg-muted/30 border-8 border-background flex items-center justify-center mb-8 shadow-sm">
                  <step.icon className="w-10 h-10 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-muted/30 relative overflow-hidden">
        {/* Halo décoratif Testimonials */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none translate-y-1/2 translate-x-1/4" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Ils nous font confiance</h2>
            <p className="text-muted-foreground text-xl">Les professionnels parlent de leur expérience avec l'ERP.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testi, idx) => (
              <div key={idx} className="p-10 rounded-[2rem] bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex gap-1 mb-8 text-black dark:text-white">
                  {Array.from({ length: testi.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <p className="text-xl font-medium mb-8 leading-relaxed">"{testi.quote}"</p>
                <div>
                  <div className="font-bold text-foreground text-lg">{testi.author}</div>
                  <div className="text-muted-foreground">{testi.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Un socle technologique à l'état de l'art.</h2>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Appmatogest s'affranchit des monolithes. L'outil est bâti sur une stack moderne garantissant une fluidité parfaite et une souveraineté totale de vos données.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <Server className="w-10 h-10 text-foreground" />
              <div>
                <h4 className="font-bold text-xl mb-2">Google Cloud</h4>
                <p className="text-muted-foreground leading-relaxed">Instances dédiées et isolées en France, au plus près de vous.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <Database className="w-10 h-10 text-foreground" />
              <div>
                <h4 className="font-bold text-xl mb-2">Supabase PostgreSQL</h4>
                <p className="text-muted-foreground leading-relaxed">Une base de données temps réel robuste avec technologie RLS.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <MonitorPlay className="w-10 h-10 text-foreground" />
              <div>
                <h4 className="font-bold text-xl mb-2">React & Vite</h4>
                <p className="text-muted-foreground leading-relaxed">Interface instantanée sans temps de chargement pour vos équipes.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <CheckCircle2 className="w-10 h-10 text-foreground" />
              <div>
                <h4 className="font-bold text-xl mb-2">Zod Validation</h4>
                <p className="text-muted-foreground leading-relaxed">Validation stricte empêchant toute donnée corrompue en base.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases (Pour qui ?) */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">À qui s'adresse Appmatogest ?</h2>
            <p className="text-muted-foreground text-xl">
              Une solution pensée pour s'adapter à la taille de votre structure.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, idx) => (
              <div key={idx} className="bg-background p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-start text-left">
                <div className="w-16 h-16 flex items-center justify-center font-bold text-2xl bg-foreground text-background rounded-full mb-8">
                  {idx + 1}
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">{useCase.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed flex-1">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Tarifs simples et transparents</h2>
            <p className="text-muted-foreground text-xl">Adaptez votre offre à vos besoins.</p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <span className={cn("text-lg", !isYearly && "font-bold text-foreground")}>Mensuel</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="w-16 h-8 rounded-full bg-foreground relative flex items-center px-1 transition-colors"
              >
                <div className={cn("w-6 h-6 rounded-full bg-background transition-transform", isYearly && "translate-x-8")} />
              </button>
              <span className={cn("text-lg", isYearly && "font-bold text-foreground")}>
                Annuel <span className="text-emerald-600 text-sm ml-1 font-bold">-20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, idx) => (
              <div key={idx} className={cn("rounded-[3rem] p-10 border-2 transition-all duration-300 relative", plan.popular ? "bg-foreground text-background border-foreground shadow-2xl scale-105 z-10" : "bg-card text-foreground border-border/40")}>
                {plan.popular && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[3rem]">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/30 rounded-full blur-[60px]" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/30 rounded-full blur-[60px]" />
                  </div>
                )}
                {plan.popular && (
                  <div className="absolute -top-4 right-1/2 translate-x-1/2 px-5 py-2 bg-gradient-to-r from-primary to-orange-400 text-white text-sm font-bold rounded-full whitespace-nowrap shadow-xl z-30">
                    LE CHOIX DES CABINETS
                  </div>
                )}
                <div className="mb-8 relative z-20">
                  <h3 className="text-3xl font-extrabold mb-3 tracking-tight">{plan.name}</h3>
                  <p className={cn("text-lg", plan.popular ? "text-background/80" : "text-muted-foreground")}>{plan.description}</p>
                </div>
                <div className="mb-10 flex items-baseline gap-1 relative z-10">
                  <span className="text-6xl font-extrabold tracking-tighter">€{isYearly ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice}</span>
                  <span className={cn("text-lg font-medium", plan.popular ? "text-background/80" : "text-muted-foreground")}>/mois</span>
                </div>
                <ul className="space-y-5 mb-10 relative z-10">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <Check className={cn("w-6 h-6 shrink-0", plan.popular ? "text-primary" : "text-foreground")} />
                      <span className="text-lg">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate('/auth')}
                  variant={plan.popular ? "secondary" : "default"}
                  className={cn("w-full h-16 rounded-full text-lg font-bold relative z-10", plan.popular && "bg-background text-foreground hover:bg-background/90")}
                >
                  Choisir {plan.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 bg-muted/30 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight">Questions fréquentes</h2>
            <p className="text-muted-foreground text-xl">Tout ce que vous devez savoir avant de franchir le pas.</p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group p-8 rounded-[2rem] bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer font-bold text-xl tracking-tight group-hover:text-primary transition-colors">
                  {faq.q}
                  <ChevronDown className="w-6 h-6 text-muted-foreground group-hover:text-primary group-open:text-primary group-open:rotate-180 transition-all" />
                </summary>
                <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* App CTA */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-6xl mx-auto rounded-[3rem] bg-foreground text-background relative overflow-hidden py-24 px-8 md:px-16 text-center shadow-2xl">
          {/* L'alliage de couleurs en arrière-plan */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] text-background/10" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-primary-foreground/90 font-medium mb-10 border border-white/10 backdrop-blur-sm shadow-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>La solution n°1 des cabinets agiles</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">Prêt à moderniser votre cabinet ?</h2>
            <p className="text-background/80 text-xl md:text-2xl mb-12 leading-relaxed">
              Rejoignez les experts-comptables qui ont repris le contrôle de leur processus de production et de la sécurité de leurs données.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Button size="lg" className="h-16 px-10 text-xl font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-105" onClick={() => navigate('/auth')}>
                Commencer l'essai gratuit
              </Button>
            </div>

            {/* Social Proof (Avatars & Stars) */}
            <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-white/10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex -space-x-3">
                {['JD', 'ML', 'TD', 'SR'].map((initials, i) => (
                  <div key={i} className={cn("w-12 h-12 rounded-full border-4 border-foreground overflow-hidden flex items-center justify-center text-sm font-bold shadow-lg", ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600'][i])}>
                    <span className="text-white">{initials}</span>
                  </div>
                ))}
              </div>
              <div className="text-left text-sm text-background/80">
                <div className="flex items-center gap-1 text-yellow-500 mb-0.5">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-base text-background/60">Rejoignez <span className="text-white font-bold">+500 cabinets</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <AppLogo size="sm" showSubtext={false} />
          <p className="text-muted-foreground text-sm">© 2024 APPMATO. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
