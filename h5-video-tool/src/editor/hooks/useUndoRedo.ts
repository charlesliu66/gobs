import { useCallback, useMemo, useState } from 'react';

type Setter<T> = T | ((prev: T) => T);
type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function useUndoRedo<T>(initial: T, maxHistory = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const setState = useCallback((next: Setter<T>) => {
    setHistory((current) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current.present) : next;
      if (Object.is(resolved, current.present)) return current;
      const appended = [...current.past, current.present];
      const past = appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      return {
        past,
        present: resolved,
        future: [],
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const prev = current.past[current.past.length - 1]!;
      return {
        past: current.past.slice(0, -1),
        present: prev,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0]!;
      const appended = [...current.past, current.present];
      const past = appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      return {
        past,
        present: next,
        future: current.future.slice(1),
      };
    });
  }, [maxHistory]);

  const reset = useCallback((next: T) => {
    setHistory({
      past: [],
      present: next,
      future: [],
    });
  }, []);

  return useMemo(
    () => ({
      state: history.present,
      setState,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      reset,
    }),
    [history, setState, undo, redo, reset],
  );
}

