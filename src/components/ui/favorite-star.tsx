import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteStarProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export function FavoriteStar({ isFavorite, onToggle, size = 'sm' }: FavoriteStarProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(e); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(e as any); } }}
      className={cn(
        "rounded-lg transition-all hover:scale-110 cursor-pointer flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        size === 'sm' ? "p-1" : "p-1.5",
        isFavorite ? "text-warning" : "text-muted-foreground/40 hover:text-warning/60"
      )}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Star className={cn(
        size === 'sm' ? "w-4 h-4" : "w-5 h-5",
        isFavorite && "fill-warning"
      )} />
    </div>
  );
}
