import { MainLayout } from '@/components/layout/MainLayout';
import { EntrepriseSearch } from '@/components/tools/EntrepriseSearch';

export default function Annuaire() {
    return (
        <MainLayout>
            <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-slate-50/50 dark:bg-background">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 p-6 md:p-8 max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Annuaire des Entreprises</h1>
                            <p className="text-sm text-muted-foreground">Recherchez n'importe quelle entreprise française — données INSEE en temps réel</p>
                        </div>
                    </div>

                    {/* Search Component */}
                    <EntrepriseSearch />
                </div>
            </div>
        </MainLayout>
    );
}
