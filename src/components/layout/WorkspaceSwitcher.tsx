import { motion } from 'framer-motion';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Briefcase, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useEasterEgg } from '@/contexts/EasterEggContext';

export function WorkspaceSwitcher() {
    const { activeWorkspace, setActiveWorkspace } = useWorkspace();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { isBatmanMode } = useEasterEgg();

    const handleSwitch = (workspace: 'gestion' | 'pulse') => {
        if (workspace === 'gestion' && !isBatmanMode) {
            toast({
                title: '🔒 Accès limité',
                description: 'L\'espace Gestion sera disponible prochainement.',
            });
            return;
        }
        setActiveWorkspace(workspace);
        if (workspace === 'pulse') navigate('/discussions');
        if (workspace === 'gestion') navigate('/dashboard');
    };

    return (
        <div className="mx-3 mt-4 mb-2 p-1 bg-muted/40 backdrop-blur-md border border-border/40 rounded-2xl flex relative overflow-hidden shadow-sm">
            {/* Animated Background Pill */}
            <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-xl shadow-sm border border-border/50"
                initial={false}
                animate={{
                    x: activeWorkspace === 'gestion' ? '4px' : 'calc(100% + 4px)'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />

            <button
                onClick={() => handleSwitch('gestion')}
                className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors z-10",
                    !isBatmanMode && "opacity-50 cursor-not-allowed",
                    activeWorkspace === 'gestion' ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
                )}
            >
                {isBatmanMode ? <Briefcase className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Gestion</span>
            </button>

            <button
                onClick={() => handleSwitch('pulse')}
                className={cn(
                    "relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-colors z-10",
                    activeWorkspace === 'pulse' ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
                )}
            >
                <Sparkles className="w-4 h-4" />
                <span>Pulse</span>
            </button>
        </div>
    );
}
