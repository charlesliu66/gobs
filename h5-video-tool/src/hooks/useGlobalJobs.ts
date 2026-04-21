import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { BatchJobDto, QueueSnapshotDto } from '../api/batchJobs';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface GlobalJobsState {
  jobs: BatchJobDto[];
  snapshot: QueueSnapshotDto;
  activeCount: number;
  panelOpen: boolean;
  togglePanel: () => void;
  dismissJob: (id: string) => void;
}

const DEFAULT_SNAPSHOT: QueueSnapshotDto = {
  totalActive: 0,
  totalWaiting: 0,
  avgSecPerJob: 120,
};

const GlobalJobsContext = createContext<GlobalJobsState>({
  jobs: [],
  snapshot: DEFAULT_SNAPSHOT,
  activeCount: 0,
  panelOpen: false,
  togglePanel: () => {},
  dismissJob: () => {},
});

export const useGlobalJobs = () => useContext(GlobalJobsContext);
export { GlobalJobsContext };

export function useGlobalJobsProvider(): GlobalJobsState {
  const [jobMap, setJobMap] = useState<Map<string, BatchJobDto>>(new Map());
  const [snapshot, setSnapshot] = useState<QueueSnapshotDto>(DEFAULT_SNAPSHOT);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('gobs_token') ?? '';
    if (!token) return;

    const url = `${API_BASE}/api/batch-jobs/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (event: MessageEvent) => {
      try {
        const job = JSON.parse(event.data as string) as BatchJobDto;
        setJobMap((prev) => {
          const next = new Map(prev);
          next.set(job.id, job);
          return next;
        });
      } catch {
        // Ignore malformed events.
      }
    };

    es.addEventListener('queue-snapshot', (event: MessageEvent) => {
      try {
        const next = JSON.parse(event.data as string) as QueueSnapshotDto;
        setSnapshot(next);
      } catch {
        // Ignore malformed events.
      }
    });

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  const jobs = useMemo(() => (
    Array.from(jobMap.values())
      .filter((job) => !dismissed.has(job.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  ), [jobMap, dismissed]);

  const activeCount = useMemo(
    () => jobs.filter((job) => !['done', 'failed', 'cancelled'].includes(job.status)).length,
    [jobs],
  );

  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);
  const dismissJob = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  return { jobs, snapshot, activeCount, panelOpen, togglePanel, dismissJob };
}
