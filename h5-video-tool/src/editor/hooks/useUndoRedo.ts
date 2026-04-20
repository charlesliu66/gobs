import { useCallback, useMemo, useRef, useState } from 'react';

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

  /**
   * 批量编辑会话：在 beginBatch/endBatch 之间的所有 setState 都不入历史栈，
   * 仅更新 present；endBatch 时把 batchStartRef 作为单条历史写入 past。
   * 用于拖拽/trim 等高频中间态，避免 Undo 栈被填满。
   */
  const batchDepthRef = useRef(0);
  const batchStartRef = useRef<T | null>(null);

  const setState = useCallback((next: Setter<T>) => {
    setHistory((current) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current.present) : next;
      if (Object.is(resolved, current.present)) return current;
      if (batchDepthRef.current > 0) {
        return {
          past: current.past,
          present: resolved,
          future: current.future,
        };
      }
      const appended = [...current.past, current.present];
      const past = appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      return {
        past,
        present: resolved,
        future: [],
      };
    });
  }, [maxHistory]);

  const beginBatch = useCallback(() => {
    if (batchDepthRef.current === 0) {
      setHistory((current) => {
        batchStartRef.current = current.present;
        return current;
      });
    }
    batchDepthRef.current += 1;
  }, []);

  const endBatch = useCallback(() => {
    if (batchDepthRef.current === 0) return;
    batchDepthRef.current -= 1;
    if (batchDepthRef.current > 0) return;
    setHistory((current) => {
      const start = batchStartRef.current;
      batchStartRef.current = null;
      if (start == null || Object.is(start, current.present)) return current;
      const appended = [...current.past, start];
      const past = appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
      return {
        past,
        present: current.present,
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
      beginBatch,
      endBatch,
    }),
    [history, setState, undo, redo, reset, beginBatch, endBatch],
  );
}

