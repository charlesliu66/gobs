/**
 * 全局生成任务 SSE 订阅 hook
 * 连接 /api/batch-jobs/stream，维护所有活跃任务的实时状态。
 * 整个 App 只需一个实例（通过 Layout 挂载），子组件通过 context 消费。
 */
import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import type { BatchJobDto } from '../api/batchJobs';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface GlobalJobsState {
  jobs: BatchJobDto[];
  activeCount: number;
  panelOpen: boolean;
  togglePanel: () => void;
  dismissJob: (id: string) => void;
}

const GlobalJobsContext = createContext<GlobalJobsState>({
  jobs: [],
  activeCount: 0,
  panelOpen: false,
  togglePanel: () => {},
  dismissJob: () => {},
});

export const useGlobalJobs = () => useContext(GlobalJobsContext);
export { GlobalJobsContext };

export function useGlobalJobsProvider(): GlobalJobsState {
  const [jobMap, setJobMap] = useState<Map<string, BatchJobDto>>(new Map());
  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('gobs_token') ?? '';
    if (!token) return;

    const url = `${API_BASE}/api/batch-jobs/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e: MessageEvent) => {
      try {
        const job = JSON.parse(e.data as string) as BatchJobDto;
        setJobMap((prev) => {
          const next = new Map(prev);
          next.set(job.id, job);
          return next;
        });
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        // 连接断开后 5s 重连
      }, 5000);
    };

    return () => es.close();
  }, []);

  const jobs = useMemo(() => {
    const all = Array.from(jobMap.values())
      .filter((j) => !dismissed.has(j.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all;
  }, [jobMap, dismissed]);

  const activeCount = useMemo(
    () => jobs.filter((j) => !['done', 'failed', 'cancelled'].includes(j.status)).length,
    [jobs],
  );

  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);
  const dismissJob = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  return { jobs, activeCount, panelOpen, togglePanel, dismissJob };
}
