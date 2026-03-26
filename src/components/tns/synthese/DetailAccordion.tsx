// ============================================================================
// Bloc 3 — Détail du calcul (Accordion)
// ============================================================================

import { motion } from 'framer-motion';
import { ChevronDown, Calculator, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

interface DetailAccordionProps {
  baseCalcul: { label: string; montant: number }[];
}

export function DetailAccordion({ baseCalcul }: DetailAccordionProps) {
  if (!baseCalcul || baseCalcul.length === 0) return null;

  const assietteBrute = baseCalcul.find(b => b.label.includes('Assiette brute'));

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="detail" className="border-0">
        <AccordionTrigger className="px-5 py-4 rounded-2xl bg-muted/20 border border-border/30 hover:bg-muted/30 hover:no-underline transition-all group [&[data-state=open]]:rounded-b-none [&[data-state=open]]:border-b-0">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-xl bg-primary/10">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Détail de la base de calcul
              </p>
              <p className="text-xs text-muted-foreground">
                Cliquez pour voir la reconstitution de l'assiette
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="border border-border/30 border-t-0 rounded-b-2xl px-5 pb-5">
          <div className="pt-4 space-y-0.5">
            {baseCalcul.map((item, index) => {
              const isTotal = item.label.includes('Assiette brute');
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between py-3 px-3 rounded-xl transition-colors',
                    isTotal
                      ? 'bg-primary/5 border border-primary/20 mt-3 font-extrabold'
                      : 'hover:bg-muted/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isTotal ? (
                      <Calculator className="w-4 h-4 text-primary" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                    <span className={cn(
                      'text-sm',
                      isTotal ? 'text-primary font-extrabold' : 'text-foreground font-medium'
                    )}>
                      {item.label}
                    </span>
                  </div>
                  <span className={cn(
                    'text-sm tabular-nums',
                    isTotal ? 'text-primary font-extrabold text-base' : 'text-foreground font-bold'
                  )}>
                    {formatEuro(item.montant)}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/30 dark:border-blue-800/30">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <span className="font-bold">ℹ️ Note :</span> L'assiette sociale correspond à la rémunération nette majorée des avantages en nature,
              des dividendes excédentaires et des cotisations obligatoires reconstituées (méthode itérative simplifiée).
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
