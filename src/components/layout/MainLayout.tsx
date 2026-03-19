import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { QuickActions } from '@/components/ui/QuickActions';
import { GlobalTimer } from './GlobalTimer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { CalculatorWidget } from '@/components/tools/CalculatorWidget';
import { AIAssistantWidget } from '@/components/tools/AIAssistantWidget';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useEasterEgg } from '@/contexts/EasterEggContext';
import { Sun, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { activeWorkspace } = useWorkspace();
  const { isBatmanMode, lockBatmanMode } = useEasterEgg();

  return (
    <div className="min-h-screen flex w-full bg-background relative transition-colors duration-500">
      <AnimatePresence>
        {isBatmanMode && (
          <motion.button
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={lockBatmanMode}
            className="fixed top-6 right-6 z-[100] flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all group"
          >
            <Sun className="w-5 h-5 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em]">Quitter la Bat-Cave</span>
            <ShieldAlert className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      {activeWorkspace === 'gestion' && <QuickActions />}
      <GlobalTimer />
      <CalculatorWidget />
      <AIAssistantWidget />
      {activeWorkspace === 'gestion' && <ChatWidget />}
    </div>
  );
}
