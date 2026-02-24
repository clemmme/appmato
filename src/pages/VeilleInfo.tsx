import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { Newspaper, Search, CalendarDays, Sparkles } from 'lucide-react';
import { NewsFeed } from '@/components/veille/NewsFeed';
import { BofipSearch } from '@/components/veille/BofipSearch';
import { FiscalCalendar } from '@/components/veille/FiscalCalendar';

const TABS = [
    { id: 'news', label: 'Actualités', icon: Newspaper, description: 'Flux comptable & fiscal' },
    { id: 'bofip', label: 'Recherche BOFiP', icon: Search, description: 'Bulletin officiel' },
    { id: 'calendar', label: 'Échéances', icon: CalendarDays, description: 'Calendrier fiscal' },
];

export default function VeilleInfo() {
    const [activeTab, setActiveTab] = useState(TABS[0].id);

    const CurrentView = () => {
        switch (activeTab) {
            case 'news':
                return <NewsFeed />;
            case 'bofip':
                return <BofipSearch />;
            case 'calendar':
                return <FiscalCalendar />;
            default:
                return null;
        }
    };

    return (
        <MainLayout>
            <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-slate-50/50 dark:bg-background">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 via-blue-400/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 lg:px-10 pt-8 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">Veille Informationnelle</h1>
                                <p className="text-muted-foreground font-medium">Actualités, recherche BOFiP et échéances fiscales</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="px-6 lg:px-10 pb-6">
                        <div className="flex gap-2 bg-white/40 dark:bg-card/20 backdrop-blur-md rounded-2xl p-1.5 border border-white/50 dark:border-white/10 shadow-sm w-fit">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25"
                                                : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive && "text-white")} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 lg:px-10 pb-10">
                        <CurrentView />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
