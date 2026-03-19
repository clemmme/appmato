import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TimerProvider } from "@/contexts/TimerContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { OrganizationProvider, useOrganization } from "@/contexts/OrganizationContext";
import { GlobalTimerWidget } from "@/components/time/GlobalTimerWidget";
import { CommandPalette } from "@/components/CommandPalette";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { EasterEggProvider } from "@/contexts/EasterEggContext";
import SuiviDossiers from "./pages/production/SuiviDossiers";
import Revision from "./pages/production/Bilan";
import Supervision from "./pages/production/Supervision";
import Cloture from "./pages/production/Cloture";
import Ctrl from "./pages/production/Ctrl";
import TimeTracking from "./pages/production/TimeTracking";
import Clients from "./pages/Clients";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import AccountSetup from "./pages/AccountSetup";
import TeamManagement from "./pages/TeamManagement";
import CabinetOverview from "./pages/CabinetOverview";
import NotFound from "./pages/NotFound";
import OutilsComptables from "./pages/tools/OutilsComptables";
import VeilleInfo from "./pages/VeilleInfo";
import Annuaire from "./pages/Annuaire";
import Assistant from "./pages/Assistant";
import Discussions from "./pages/Discussions";
import { Messages } from './pages/Messages';
import { lazy, Suspense, useEffect } from 'react';
import { prefetchFeeds } from '@/lib/rssFetcher';

const Integrations = lazy(() => import('./pages/Integrations'));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasCompletedSetup, loading: orgLoading } = useOrganization();
  const location = useLocation();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to setup if not completed (except if already on /setup)
  if (!hasCompletedSetup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      prefetchFeeds();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {user && <CommandPalette />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/setup" element={user ? <AccountSetup /> : <Navigate to="/auth" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/production/suivi-dossiers" element={<ProtectedRoute><SuiviDossiers /></ProtectedRoute>} />
        <Route path="/production/revision" element={<ProtectedRoute><Revision /></ProtectedRoute>} />
        <Route path="/production/supervision" element={<ProtectedRoute><Supervision /></ProtectedRoute>} />
        <Route path="/production/cloture" element={<ProtectedRoute><Cloture /></ProtectedRoute>} />
        <Route path="/production/ctrl" element={<ProtectedRoute><Ctrl /></ProtectedRoute>} />
        <Route path="/production/temps" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
        <Route path="/cabinet" element={<ProtectedRoute><CabinetOverview /></ProtectedRoute>} />
        <Route path="/outils" element={<ProtectedRoute><OutilsComptables /></ProtectedRoute>} />
        <Route path="/assistant" element={
          <ProtectedRoute>
            <Assistant />
          </ProtectedRoute>
        } />

        <Route path="/news" element={
          <Navigate to="/veille" replace />
        } />
        <Route path="/veille" element={
          <ProtectedRoute>
            <VeilleInfo />
          </ProtectedRoute>
        } />

        <Route path="/annuaire" element={<ProtectedRoute><Annuaire /></ProtectedRoute>} />
        <Route path="/discussions" element={
          <ProtectedRoute>
            <Discussions />
          </ProtectedRoute>
        } />

        <Route path="/messages" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />

        <Route path="/integrations" element={<ProtectedRoute><Suspense fallback={null}><Integrations /></Suspense></ProtectedRoute>} />
        <Route path="/aide" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <TimerProvider>
            <EasterEggProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <OrganizationProvider>
                  <WorkspaceProvider>
                    <AppRoutes />
                    <GlobalTimerWidget />
                  </WorkspaceProvider>
                </OrganizationProvider>
              </BrowserRouter>
            </EasterEggProvider>
          </TimerProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
