
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorTheme = 'orange' | 'blue' | 'green' | 'red' | 'pink' | 'yellow';

interface CabinetBranding {
  primaryColor?: string; // hex e.g. "#F97316"
  bgColor?: string;      // hex e.g. "#FAFAFA"
}

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  setColorTheme: (color: ColorTheme) => void;
  setCabinetBranding: (branding: CabinetBranding | null) => void;
  cabinetBranding: CabinetBranding | null;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colorTheme: 'orange',
  toggleTheme: () => { },
  setColorTheme: () => { },
  setCabinetBranding: () => { },
  cabinetBranding: null,
});

// Convert hex (#RRGGBB) to HSL string "H S% L%"
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // We cannot use useAuth hook here if AuthProvider is inside ThemeProvider or vice versa 
  // without risking circular dependencies if not careful, but we will assume we can subscribe 
  // to supabase auth state directly here to be safe and global.
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import supabase to avoid circular dependencies if any
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUserId(session?.user?.id || null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user?.id || null);
      });

      return () => subscription.unsubscribe();
    });
  }, []);

  const [theme, setTheme] = useState<Theme>('light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('orange');
  const [cabinetBranding, setCabinetBrandingState] = useState<CabinetBranding | null>(null);

  // Load user specific preferences when userId changes
  useEffect(() => {
    if (userId) {
      const storedTheme = localStorage.getItem(`appmato_theme_${userId}`) as Theme;
      const storedColor = localStorage.getItem(`appmato_color_theme_${userId}`) as ColorTheme;

      if (storedTheme) setTheme(storedTheme);
      else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

      if (storedColor) setColorThemeState(storedColor);
      else setColorThemeState('orange');
    } else {
      // Force default global theme for unauthenticated users (Landing, Auth)
      setTheme('light');
      setColorThemeState('orange');
    }
  }, [userId]);

  // Apply Theme & Save to LocalStorage (only if logged in)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    if (userId) {
      localStorage.setItem(`appmato_theme_${userId}`, theme);
    }
  }, [theme, userId]);

  // Apply Color Theme & Save to LocalStorage (only if logged in)
  useEffect(() => {
    const root = document.documentElement;
    const classes = Array.from(root.classList);
    const colorClasses = classes.filter(c => c.startsWith('theme-'));
    colorClasses.forEach(c => root.classList.remove(c));
    root.classList.add(`theme-${colorTheme}`);

    if (userId) {
      localStorage.setItem(`appmato_color_theme_${userId}`, colorTheme);
    }
  }, [colorTheme, userId]);

  // Apply cabinet branding as inline CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (cabinetBranding?.primaryColor) {
      const hsl = hexToHsl(cabinetBranding.primaryColor);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
        root.style.setProperty('--sidebar-primary', hsl);
        root.style.setProperty('--sidebar-ring', hsl);
      }
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    }
    if (cabinetBranding?.bgColor) {
      const hsl = hexToHsl(cabinetBranding.bgColor);
      if (hsl) {
        root.style.setProperty('--background', hsl);
      }
    } else {
      root.style.removeProperty('--background');
    }
  }, [cabinetBranding]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const setColorTheme = (color: ColorTheme) => setColorThemeState(color);
  const setCabinetBranding = useCallback((b: CabinetBranding | null) => setCabinetBrandingState(b), []);

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setColorTheme, setCabinetBranding, cabinetBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

