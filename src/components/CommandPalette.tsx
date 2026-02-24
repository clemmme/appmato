/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  ClipboardList,
  Calculator,
  FileCheck,
  Eye,
  Archive,
  Scale,
  Clock,
  Users,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Building2,
  Star,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';

const pages = [
  { label: 'Pilotage Cabinet', path: '/dashboard', icon: LayoutDashboard, keywords: 'dashboard accueil home' },
  { label: 'Suivi des Dossiers', path: '/production/suivi-dossiers', icon: ClipboardList, keywords: 'suivi production kpi' },
  { label: 'Pilotage TVA', path: '/production/tva', icon: Calculator, keywords: 'tva déclaration' },
  { label: 'Révision', path: '/production/revision', icon: FileCheck, keywords: 'bilan révision cycles' },
  { label: 'Supervision', path: '/production/supervision', icon: Eye, keywords: 'supervision chef validation' },
  { label: 'Clôture Annuelle', path: '/production/cloture', icon: Archive, keywords: 'clôture annuelle liasse' },
  { label: 'Calcul de TVA', path: '/production/ctrl', icon: Scale, keywords: 'calcul tva cadrage contrôle' },
  { label: 'Calendrier', path: '/production/temps', icon: Clock, keywords: 'temps calendrier agenda chrono' },
  { label: 'Mes Dossiers', path: '/clients', icon: Users, keywords: 'clients dossiers portefeuille' },
  { label: 'Paramètres', path: '/settings', icon: Settings, keywords: 'settings profil préférences' },
  { label: 'Aide', path: '/aide', icon: HelpCircle, keywords: 'aide help tutoriel' },
];

interface ClientResult {
  id: string;
  name: string;
  ref: string;
  form: string;
  regime: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { isFavorite } = useFavorites();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Load clients when palette opens
  useEffect(() => {
    if (open && user && clients.length === 0) {
      (supabase as any).from('clients').select('id, name, ref, form, regime').order('name')
        .then(({ data }: any) => {
          if (data) setClients(data as ClientResult[]);
        });
    }
  }, [open, user]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients, isFavorite]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher un module, un dossier..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        {/* Dossiers clients */}
        {sortedClients.length > 0 && (
          <>
            <CommandGroup heading="Dossiers">
              {sortedClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.ref} ${client.form} dossier client`}
                  onSelect={() => handleSelect(`/clients?focus=${client.id}`)}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                >
                  {isFavorite(client.id) ? (
                    <Star className="w-4 h-4 text-primary fill-primary" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.ref} · {client.form} · {client.regime === 'M' ? 'Mensuel' : client.regime === 'T' ? 'Trimestriel' : client.regime === 'A' ? 'Annuel' : 'Non assujetti'}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              value={`${page.label} ${page.keywords}`}
              onSelect={() => handleSelect(page.path)}
              className="flex items-center gap-3 py-3 cursor-pointer"
            >
              <page.icon className="w-4 h-4 text-muted-foreground" />
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
            <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
