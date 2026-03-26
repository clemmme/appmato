// ============================================================================
// Bloc 1 — Trésorerie Cards (Payé / Dû / Verdict)
// ============================================================================

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TNSTresorerie } from '@/lib/tns/types';

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

// Animated counter component
function AnimatedValue({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className={cn('text-3xl lg:text-4xl font-black tracking-tight tabular-nums', className)}
    >
      {formatEuro(value)}
    </motion.span>
  );
}

interface TresorerieCardsProps {
  tresorerie: TNSTresorerie;
}

export function TresorerieCards({ tresorerie }: TresorerieCardsProps) {
  const { totalPaye, totalDu, solde, verdict } = tresorerie;

  const verdictConfig = {
    dette: {
      label: 'Charge à payer',
      sublabel: 'Vous devez régulariser',
      color: 'from-red-500/10 via-red-500/5 to-transparent',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-600 dark:text-red-400',
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      icon: TrendingDown,
      iconColor: 'text-red-500',
    },
    creance: {
      label: 'Charge à recevoir',
      sublabel: 'Trop-versé à récupérer',
      color: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
    },
    neutre: {
      label: 'Équilibré',
      sublabel: 'Aucune régularisation',
      color: 'from-blue-500/10 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-600 dark:text-blue-400',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      icon: Minus,
      iconColor: 'text-blue-500',
    },
  };

  const vConfig = verdictConfig[verdict];
  const VerdictIcon = vConfig.icon;

  const cards = [
    {
      title: 'Total payé',
      sublabel: "Acomptes versés sur l'exercice",
      value: totalPaye,
      icon: ArrowUpRight,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      valueColor: 'text-foreground',
    },
    {
      title: 'Total dû',
      sublabel: 'Cotisations recalculées',
      value: totalDu,
      icon: ArrowDownRight,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
      {/* Payé & Dû */}
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className="bento-card flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className={cn('p-2.5 rounded-xl', card.iconBg)}>
              <card.icon className={cn('w-5 h-5', card.iconColor)} />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {card.title}
            </span>
          </div>
          <div>
            <AnimatedValue value={card.value} className={card.valueColor} />
            <p className="text-xs text-muted-foreground mt-1">{card.sublabel}</p>
          </div>
        </motion.div>
      ))}

      {/* Verdict */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
        className={cn(
          'relative overflow-hidden rounded-3xl p-6 border-2 flex flex-col gap-4',
          vConfig.borderColor
        )}
      >
        {/* Background gradient */}
        <div className={cn('absolute inset-0 bg-gradient-to-br', vConfig.color)} />

        {/* Floating icon */}
        <motion.div
          className="absolute -right-4 -bottom-4 opacity-10"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <Scale className="w-32 h-32" />
        </motion.div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className={cn('p-2.5 rounded-xl', vConfig.badgeColor.split(' ')[0])}>
              <VerdictIcon className={cn('w-5 h-5', vConfig.iconColor)} />
            </div>
            <span className={cn('text-xs font-black px-3 py-1 rounded-full', vConfig.badgeColor)}>
              Le Verdict
            </span>
          </div>
          <AnimatedValue value={Math.abs(solde)} className={vConfig.textColor} />
          <div className="mt-2">
            <p className={cn('text-sm font-bold', vConfig.textColor)}>{vConfig.label}</p>
            <p className="text-xs text-muted-foreground">{vConfig.sublabel}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
