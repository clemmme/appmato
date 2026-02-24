import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn("bento-card animate-pulse", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-muted rounded-lg" />
        <div className="w-12 h-12 rounded-2xl bg-muted" />
      </div>
      <div className="h-8 w-20 bg-muted rounded-lg mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-muted rounded-lg mb-2" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="md:col-span-2 lg:col-span-4">
          <SkeletonCard className="h-24" lines={0} />
        </div>
        <SkeletonCard />
        <div className="lg:col-span-2"><SkeletonCard lines={5} /></div>
        <SkeletonCard />
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      </div>
    </div>
  );
}
