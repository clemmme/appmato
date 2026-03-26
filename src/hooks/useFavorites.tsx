/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const FAVORITES_KEY = 'appmato_favorite_clients';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem(`${FAVORITES_KEY}_${user.id}`);
        if (stored) {
          setFavoriteIds(new Set(JSON.parse(stored)));
        }
      } catch {
        // ignore
      }
    } else {
      setFavoriteIds(new Set());
    }
    setLoading(false);
  }, [user]);

  const toggleFavorite = useCallback(async (clientId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(clientId);
    
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(clientId);
      else next.add(clientId);
      
      // Save to localStorage
      try {
        localStorage.setItem(`${FAVORITES_KEY}_${user.id}`, JSON.stringify(Array.from(next)));
      } catch { /* ignore */ }
      
      return next;
    });
  }, [user, favoriteIds]);

  const isFavorite = useCallback((clientId: string) => favoriteIds.has(clientId), [favoriteIds]);

  /** Sort comparator: favorites first, then alphabetically by name */
  const sortWithFavorites = useCallback(<T extends { id: string; name: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const aFav = favoriteIds.has(a.id);
      const bFav = favoriteIds.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [favoriteIds]);

  return { isFavorite, toggleFavorite, sortWithFavorites, favoriteIds, loading };
}
