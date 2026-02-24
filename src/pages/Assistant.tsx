import { MainLayout } from '@/components/layout/MainLayout';
import { AIAssistant } from '@/components/tools/AIAssistant';

export default function Assistant() {
    return (
        <MainLayout>
            <div className="relative h-[calc(100vh-5rem)] overflow-hidden bg-slate-50/50 dark:bg-background">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 h-full max-w-4xl mx-auto">
                    <AIAssistant />
                </div>
            </div>
        </MainLayout>
    );
}
