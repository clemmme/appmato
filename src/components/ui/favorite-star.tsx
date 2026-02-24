import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteStarProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

export function FavoriteStar({ isFavorite, onToggle, size = 'sm' }: FavoriteStarProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(e); }}
      className={cn(
        "rounded-lg transition-all hover:scale-110",
        size === 'sm' ? "p-1" : "p-1.5",
        isFavorite ? "text-warning" : "text-muted-foreground/40 hover:text-warning/60"
      )}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Star className={cn(
        size === 'sm' ? "w-4 h-4" : "w-5 h-5",
        isFavorite && "fill-warning"
      )} />
    </button>
  );
}
