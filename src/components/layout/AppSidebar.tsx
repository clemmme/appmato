import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList, FileCheck, Scale, Users, LogOut, Settings,
  ChevronDown, LayoutDashboard, Menu, X, Clock, Eye, HelpCircle, Archive,
  Moon, Sun, Search, Building2, Shield, Wrench, Newspaper, Sparkles, Link2,
  MessageCircle, Lock, Layout
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { DigitalClock } from './DigitalClock';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { AppLogo } from '@/components/ui/AppLogo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { NotificationBell } from '../notifications/NotificationBell';

type ViewType = 'dashboard' | 'suivi-dossiers' | 'tva' | 'revision' | 'supervision' | 'cloture' | 'ctrl' | 'temps' | 'clients' | 'settings' | 'outils' | 'news' | 'annuaire' | 'assistant' | 'integrations' | 'discussions' | 'messages' | 'aide';

const categories = [
  {
    title: "Général",
    workspace: "gestion",
    items: [
      { id: 'dashboard' as ViewType, label: 'Accueil', icon: LayoutDashboard, path: '/dashboard' },
    ]
  },
  {
    title: "Production Comptable",
    workspace: "gestion",
    items: [
      { id: 'suivi-dossiers' as ViewType, label: 'Suivi des Dossiers', icon: ClipboardList, path: '/production/suivi-dossiers' },
      { id: 'revision' as ViewType, label: 'Révision', icon: FileCheck, path: '/production/revision' },
      { id: 'supervision' as ViewType, label: 'Supervision', icon: Eye, path: '/production/supervision' },
      { id: 'cloture' as ViewType, label: 'Clôture Annuelle', icon: Archive, path: '/production/cloture' },
      { id: 'ctrl' as ViewType, label: 'Calcul de TVA', icon: Scale, path: '/production/ctrl' },
    ]
  },
  {
    title: "Référentiel",
    workspace: "gestion",
    items: [
      { id: 'clients' as ViewType, label: 'Dossiers', icon: Users, path: '/clients' },
      { id: 'annuaire' as ViewType, label: 'Annuaire Entreprises', icon: Building2, path: '/annuaire' },
      { id: 'temps' as ViewType, label: 'Calendrier', icon: Clock, path: '/production/temps' },
    ]
  },
  {
    title: "Outils",
    workspace: "gestion",
    items: [
      { id: 'outils' as ViewType, label: 'Outils Comptables', icon: Wrench, path: '/outils' },
      { id: 'integrations' as ViewType, label: 'Intégrations', icon: Link2, path: '/integrations' },
      { id: 'aide' as ViewType, label: 'Aide & Support', icon: HelpCircle, path: '/aide' },
    ]
  },
  {
    title: "Intelligence & Veille",
    workspace: "pulse",
    items: [
      { id: 'assistant' as ViewType, label: 'Alfred', icon: Sparkles, path: '/assistant' },
      { id: 'news' as ViewType, label: 'Veille Informationnelle', icon: Newspaper, path: '/veille' },
    ]
  },
  {
    title: "Collaboration",
    workspace: "pulse",
    items: [
      { id: 'messages' as ViewType, label: 'Messagerie', icon: MessageCircle, path: '/messages', badge: 'New' },
    ]
  },
  {
    title: "Réseau",
    workspace: "pulse",
    items: [
      { id: 'discussions' as ViewType, label: 'Pulse Feed', icon: Layout, path: '/discussions' },
    ]
  }
];

export function AppSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentOrg, userRole, accountType } = useOrganization();
  const { activeWorkspace } = useWorkspace();
  const [isCabinetOpen, setIsCabinetOpen] = useState(true);
  const [profile, setProfile] = useState<{ avatar_url?: string | null } | null>(null);

  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
        if (data) setProfile(data);
      };
      fetchProfile();

      // Subscribe to profile changes
      const subscription = supabase.channel('public:profiles')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
          setProfile(payload.new as { avatar_url?: string | null });
        }).subscribe();

      return () => { subscription.unsubscribe() };
    }
  }, [user?.id]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const SidebarContent = () => (
    <>
      {/* Logo & Clock */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => handleNavigate('/dashboard')} className="hover:opacity-80 transition-opacity flex items-center">
            <AppLogo size="md" showSubtext />
          </button>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
              title="Aide et tutoriel"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border/30">
          <DigitalClock />
        </div>
      </div>

      {/* Search shortcut */}
      <div className="px-5 pt-2 pb-0">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-sm transition-all group"
        >
          <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left font-medium">Rechercher...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-background border border-border/50 font-mono shadow-sm">⌘K</kbd>
        </button>
      </div>

      <WorkspaceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide">
        {categories.filter(c => c.workspace === activeWorkspace).map((category, idx) => (
          <div key={idx} className="px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-2 mb-2 block">
              {category.title}
            </span>
            <div className="space-y-0.5">
              {category.items.map((item) => {
                const active = isActive(item.path) && item.path !== '#';
                return (
                  <button key={item.id} onClick={() => item.path !== '#' && handleNavigate(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      item.path === '#' && "cursor-not-allowed opacity-70 hover:bg-transparent hover:text-muted-foreground"
                    )}
                  >
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />}
                    <item.icon className={cn("w-[18px] h-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground", item.path === '#' && "group-hover:text-muted-foreground")} />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Cabinet Section — visible only for managers and team leads - Only in Gestion */}
        {activeWorkspace === 'gestion' && accountType === 'cabinet' && (userRole === 'manager' || userRole === 'team_lead') && (
          <div className="px-2">
            <button onClick={() => setIsCabinetOpen(!isCabinetOpen)}
              className="flex items-center justify-between w-full px-2 mb-2 group/cab"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 group-hover/cab:text-foreground transition-colors flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Espace Cabinet
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200", isCabinetOpen ? "rotate-0" : "-rotate-90")} />
            </button>

            <div className={cn("space-y-0.5 overflow-hidden transition-all duration-300 origin-top", isCabinetOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
              <button onClick={() => handleNavigate('/cabinet')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  isActive('/cabinet') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {isActive('/cabinet') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />}
                <LayoutDashboard className="w-[18px] h-[18px]" />
                <span>Vue Cabinet</span>
              </button>
              {userRole === 'manager' && (
                <button onClick={() => handleNavigate('/team')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                    isActive('/team') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {isActive('/team') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full" />}
                  <Shield className="w-[18px] h-[18px]" />
                  <span>Gestion Équipe</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* User Section - Enhanced Premium Look */}
      <div className="p-4 mx-3 mb-4 rounded-2xl bg-muted/30 border border-border/40 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center gap-3 relative z-10">
          {profile?.avatar_url ? (
            <div className="w-11 h-11 rounded-full border-2 border-background shadow-md overflow-hidden flex-shrink-0 bg-muted transform group-hover:scale-105 transition-transform duration-300">
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover scale-110" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-background shadow-md transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-sm font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{user?.email}</p>
            {currentOrg && (
              <p className="text-[11px] font-medium text-muted-foreground truncate uppercase tracking-wider">{currentOrg.name}</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between relative z-10">
          <button onClick={() => handleNavigate('/settings')} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-background/50">
            <Settings className="w-3.5 h-3.5" />
            Paramètres
          </button>
          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Quitter
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-2xl bg-card border border-border shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={cn(
        "lg:hidden fixed top-0 left-0 h-full w-72 bg-card z-50 transform transition-transform duration-300 flex flex-col",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button onClick={() => setIsMobileOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      <aside className="hidden lg:flex w-72 h-screen flex-col glass-sidebar sticky top-0">
        <SidebarContent />
      </aside>

      <OnboardingWizard isOpen={showHelp} onClose={() => setShowHelp(false)} onComplete={() => setShowHelp(false)} />
    </>
  );
}
