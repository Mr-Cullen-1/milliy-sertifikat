'use client';

import { useCallback, useState } from 'react';
import { toggleSavedAction } from '@/app/saved/actions';

export type SavedError = 'limit' | 'unavailable' | 'auth' | 'error' | null;

/**
 * Saqlangan savollar holati (id -> saqlanganmi). Server bilan almashtiradi; javob kelguncha tugma band.
 * Boshlang'ich holat sahifa serveridan keladi; keyin faqat shu hook o'zgartiradi (oyna ichida savollar almashganda ham saqlanadi).
 */
export function useSaved(initialIds: string[]) {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<SavedError>(null);

  const toggle = useCallback(
    async (id: string) => {
      if (pendingId) return;
      setPendingId(id);
      setError(null);
      try {
        const r = await toggleSavedAction(id);
        if (r.ok) {
          setSaved((prev) => {
            const next = new Set(prev);
            if (r.saved) next.add(id);
            else next.delete(id);
            return next;
          });
        } else {
          setError(r.code === 'invalid' ? 'error' : r.code);
        }
      } catch {
        setError('error');
      } finally {
        setPendingId(null);
      }
    },
    [pendingId],
  );

  return { isSaved: (id: string) => saved.has(id), toggle, pendingId, error, clearError: () => setError(null) };
}
