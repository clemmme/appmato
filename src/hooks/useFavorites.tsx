/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadFavorites();
    else { setFavoriteIds(new Set()); setLoading(false); }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const { data } = await (supabase as any).from('favorite_clients').select('client_id');
      setFavoriteIds(new Set((data || []).map((d: any) => d.client_id)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback(async (clientId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(clientId);
    
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(clientId);
      else next.add(clientId);
      return next;
    });

    try {
      if (isFav) {
        await (supabase as any).from('favorite_clients').delete().eq('user_id', user.id).eq('client_id', clientId);
      } else {
        await (supabase as any).from('favorite_clients').insert({ user_id: user.id, client_id: clientId });
      }
    } catch {
      // Revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(clientId);
        else next.delete(clientId);
        return next;
      });
    }
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
