import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  showSubtext?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const textSizeMap = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

const logoLetterSizeMap = {
  xs: 'text-sm',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export function AppLogo({ size = 'md', className, showText = true, showSubtext = false }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(sizeMap[size], "bg-primary rounded-xl flex items-center justify-center shadow-sm shrink-0")}
      >
        <span
          className={cn("font-black text-white leading-none", logoLetterSizeMap[size])}
          style={{ letterSpacing: '-0.05em' }}
        >
          A
        </span>
      </div>
      {showText && (
        <div>
          <h1 className={cn("font-bold text-foreground tracking-tight leading-none", textSizeMap[size])}>
            APPMATO
          </h1>
          {showSubtext && (
            <p className="text-xs text-muted-foreground">by Clément AMATO</p>
          )}
        </div>
      )}
    </div>
  );
}
