export interface FiscalDeadline {
    id: string;
    label: string;
    type: 'tva' | 'is' | 'cfe' | 'das2' | 'cvae' | 'ts' | 'other';
    dayOfMonth: number;
    months: number[];
    color: string;
    textColor: string;
    description: string;
}

export const DEADLINE_TYPES: Record<string, { label: string; color: string; textColor: string }> = {
    tva: { label: 'TVA', color: 'bg-blue-500', textColor: 'text-blue-600' },
    is: { label: 'IS', color: 'bg-purple-500', textColor: 'text-purple-600' },
    cfe: { label: 'CFE', color: 'bg-amber-500', textColor: 'text-amber-600' },
    das2: { label: 'DAS2', color: 'bg-rose-500', textColor: 'text-rose-600' },
    cvae: { label: 'CVAE', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    ts: { label: 'Taxe Salaires', color: 'bg-orange-500', textColor: 'text-orange-600' },
    other: { label: 'Autre', color: 'bg-slate-500', textColor: 'text-slate-600' },
};

export const FISCAL_DEADLINES: FiscalDeadline[] = [
    {
        id: 'tva-15',
        label: 'TVA - Regime reel normal (CA3)',
        type: 'tva',
        dayOfMonth: 15,
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        description: "Date limite de depot de la declaration CA3 et telepaiement de la TVA pour les entreprises au regime reel normal (date usuelle le 15-24).",
    },
    {
        id: 'tva-trim',
        label: 'TVA - Regime simplifie (CA12)',
        type: 'tva',
        dayOfMonth: 24,
        months: [4, 7, 10, 12],
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        description: "Acomptes trimestriels de TVA pour les entreprises au regime simplifie.",
    },
    {
        id: 'is-acompte-1',
        label: 'IS - 1er acompte',
        type: 'is',
        dayOfMonth: 15,
        months: [3],
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        description: "Versement du 1er acompte d'Impot sur les Societes.",
    },
    {
        id: 'is-acompte-2',
        label: 'IS - 2eme acompte',
        type: 'is',
        dayOfMonth: 15,
        months: [6],
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        description: "Versement du 2eme acompte d'Impot sur les Societes.",
    },
    {
        id: 'is-acompte-3',
        label: 'IS - 3eme acompte',
        type: 'is',
        dayOfMonth: 15,
        months: [9],
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        description: "Versement du 3eme acompte d'Impot sur les Societes.",
    },
    {
        id: 'is-acompte-4',
        label: 'IS - 4eme acompte',
        type: 'is',
        dayOfMonth: 15,
        months: [12],
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        description: "Versement du 4eme et dernier acompte d'Impot sur les Societes.",
    },
    {
        id: 'is-solde',
        label: 'IS - Solde + Liasse fiscale',
        type: 'is',
        dayOfMonth: 15,
        months: [5],
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        description: "Date limite de depot de la liasse fiscale et paiement du solde IS (exercices clos au 31/12).",
    },
    {
        id: 'cfe-1',
        label: 'CFE - 1er acompte',
        type: 'cfe',
        dayOfMonth: 15,
        months: [6],
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        description: "Acompte de Cotisation Fonciere des Entreprises (si montant > 3000 euros).",
    },
    {
        id: 'cfe-solde',
        label: 'CFE - Solde',
        type: 'cfe',
        dayOfMonth: 15,
        months: [12],
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        description: "Paiement du solde de la CFE.",
    },
    {
        id: 'das2',
        label: 'DAS2 - Declaration honoraires',
        type: 'das2',
        dayOfMonth: 31,
        months: [1],
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
        description: "Date limite de declaration des honoraires, commissions et vacations verses (DAS2).",
    },
    {
        id: 'cvae-1328',
        label: 'CVAE - Declaration 1330-CVAE',
        type: 'cvae',
        dayOfMonth: 3,
        months: [5],
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        description: "Declaration de la Valeur Ajoutee et des Effectifs (1330-CVAE).",
    },
    {
        id: 'ts-mensuel',
        label: 'Taxe sur les Salaires',
        type: 'ts',
        dayOfMonth: 15,
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        description: "Versement mensuel de la taxe sur les salaires (employeurs non assujettis TVA).",
    },
    {
        id: 'liasse-bic-bnc',
        label: 'Liasse - BIC/BNC',
        type: 'other',
        dayOfMonth: 3,
        months: [5],
        color: 'bg-slate-500',
        textColor: 'text-slate-600',
        description: "Date limite de depot des declarations de resultats BIC, BNC, BA (exercices clos au 31/12).",
    },
];

export function getDeadlinesForMonth(month: number): FiscalDeadline[] {
    return FISCAL_DEADLINES.filter(d => d.months.includes(month));
}

export function getDeadlinesForDay(month: number, day: number): FiscalDeadline[] {
    return FISCAL_DEADLINES.filter(d => d.months.includes(month) && d.dayOfMonth === day);
}

export function getDeadlineDaysForMonth(month: number): number[] {
    const days = new Set<number>();
    FISCAL_DEADLINES.forEach(d => {
        if (d.months.includes(month)) days.add(d.dayOfMonth);
    });
    return Array.from(days).sort((a, b) => a - b);
}
