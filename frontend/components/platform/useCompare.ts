'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  COMPARE_EVENT,
  COMPARE_MAX,
  readCompareIds,
  toggleCompareId,
  writeCompareIds,
} from '@/lib/platform/compare';

/** Shared compare selection (localStorage-backed, synced across components and tabs). */
export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COMPARE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    writeCompareIds(toggleCompareId(readCompareIds(), id));
  }, []);

  const remove = useCallback((id: string) => {
    writeCompareIds(readCompareIds().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => writeCompareIds([]), []);

  return { ids, toggle, remove, clear, isFull: ids.length >= COMPARE_MAX };
}
