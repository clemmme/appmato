// ============================================================================
// Bloc 2 — Ventilation Fiscale (Donut Chart + Badges)
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TNSVentilationLigne } from '@/lib/tns/types';

const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

const formatEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

// Custom active shape for donut hover
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
        cornerRadius={4}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
      {/* Center text */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground text-sm font-bold">
        {payload.label}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
};

interface VentilationDonutProps {
  ventilation: TNSVentilationLigne[];
  totalCotisations: number;
}

export function VentilationDonut({ ventilation, totalCotisations }: VentilationDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = ventilation.map((v, i) => ({
    name: v.type,
    label: v.label,
    value: v.montant,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    deductible: v.deductible,
    alerteFiscale: v.alerteFiscale,
    pourcentage: v.pourcentage,
  }));

  const totalDeductible = ventilation.filter(v => v.deductible).reduce((s, v) => s + v.montant, 0);
  const totalNonDeductible = ventilation.filter(v => !v.deductible).reduce((s, v) => s + v.montant, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Donut Chart (2 cols) */}
      <div className="lg:col-span-2 flex flex-col items-center justify-center">
        <div className="w-full aspect-square max-w-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="75%"
                paddingAngle={3}
                cornerRadius={6}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
                animationBegin={200}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    className="transition-opacity duration-300"
                    opacity={activeIndex !== undefined && activeIndex !== index ? 0.4 : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center overlay (when no segment active) */}
          <AnimatePresence>
            {activeIndex === undefined && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black text-foreground">{formatEuro(totalCotisations)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary badges */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Déductible : {formatEuro(totalDeductible)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Non déductible : {formatEuro(totalNonDeductible)}
          </div>
        </div>
      </div>

      {/* Detail list (3 cols) */}
      <div className="lg:col-span-3 space-y-2">
        <h4 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          Ventilation détaillée
        </h4>

        {ventilation.map((ligne, index) => (
          <motion.div
            key={ligne.type}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl transition-all group',
              'hover:bg-muted/30',
              activeIndex === index && 'bg-muted/40 shadow-sm'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-background transition-transform group-hover:scale-125"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />

              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{ligne.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Deductibility badge */}
                  {ligne.deductible ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Déductible
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Non déductible
                    </span>
                  )}

                  {/* Fiscal alert badge */}
                  {ligne.alerteFiscale && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1">
                      ⚠️ {ligne.alerteFiscale}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-extrabold text-foreground">{formatEuro(ligne.montant)}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{ligne.pourcentage.toFixed(1)}%</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
