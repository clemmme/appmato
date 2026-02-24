import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { QuickActions } from '@/components/ui/QuickActions';
import { GlobalTimer } from './GlobalTimer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { CalculatorWidget } from '@/components/tools/CalculatorWidget';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <QuickActions />
      <GlobalTimer />
      <CalculatorWidget />
      <ChatWidget />
    </div>
  );
}
