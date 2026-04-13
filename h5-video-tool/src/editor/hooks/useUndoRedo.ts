import { useCallback, useMemo, useState } from 'react';

type Setter<T> = T | ((prev: T) => T);

export function useUndoRedo<T>(initial: T, maxHistory = 50) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  const setState = useCallback((next: Setter<T>) => {
    setPresent((current) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
      if (Object.is(resolved, current)) return current;
      setPast((p) => {
        const appended = [...p, current];
        return appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      });
      setFuture([]);
      return resolved;
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1]!;
      setFuture((f) => [present, ...f]);
      setPresent(prev);
      return p.slice(0, -1);
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0]!;
      setPast((p) => {
        const appended = [...p, present];
        return appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      });
      setPresent(next);
      return f.slice(1);
    });
  }, [present, maxHistory]);

  const reset = useCallback((next: T) => {
    setPast([]);
    setFuture([]);
    setPresent(next);
  }, []);

  return useMemo(
    () => ({
      state: present,
      setState,
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      reset,
    }),
    [present, setState, undo, redo, past.length, future.length, reset],
  );
}

