import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calculator, FileCheck, Users, Clock, Scale, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { icon: Calculator, label: 'Pilotage TVA', path: '/production/ctrl', color: 'bg-primary text-primary-foreground' },
  { icon: FileCheck, label: 'Révision', path: '/production/revision', color: 'bg-emerald-500 text-white' },
  { icon: Scale, label: 'Calcul TVA', path: '/production/ctrl', color: 'bg-violet-500 text-white' },
  { icon: Clock, label: 'Calendrier', path: '/production/temps', color: 'bg-sky-500 text-white' },
  { icon: Users, label: 'Mes Dossiers', path: '/clients', color: 'bg-primary text-white' },
];

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            />
            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 space-y-3">
              {actions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  onClick={() => handleAction(action.path)}
                  className="flex items-center gap-3 whitespace-nowrap"
                >
                  <span className="px-3 py-1.5 rounded-xl bg-card border border-border shadow-lg text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                  <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shadow-lg", action.color)}>
                    <action.icon className="w-5 h-5" />
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-colors relative",
          isOpen
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground shadow-primary/30"
        )}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {isOpen ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </motion.div>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
        )}
      </motion.button>
    </div>
  );
}
