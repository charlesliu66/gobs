import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '../api/client';

type UsageRow = {
  date: string;
  account: string;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  successRate: number;
};

type UsageResp = {
  ok: boolean;
  days: number;
  rows: UsageRow[];
};

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function SettingsUsageMonitor() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UsageRow[]>([]);

  const load = useCallback(async (nextDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<UsageResp>(`/api/admin/key-usage/daily?days=${encodeURIComponent(String(nextDays))}`);
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalCalls += r.totalCalls;
        acc.successCalls += r.successCalls;
        acc.failedCalls += r.failedCalls;
        acc.totalTokens += r.totalTokens;
        return acc;
      },
      { totalCalls: 0, successCalls: 0, failedCalls: 0, totalTokens: 0 },
    );
  }, [rows]);

  const totalRate = totals.totalCalls > 0 ? totals.successCalls / totals.totalCalls : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Key 调用监控（管理员）</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">按天、按账号查看总调用次数、成功率与 token 消耗。</p>
        </div>
        <label className="text-sm text-[var(--color-text-muted)]">
          统计天数
          <select
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(90, Number.parseInt(e.target.value, 10) || 7)))}
            className="ml-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
          >
            <option value={3}>近 3 天</option>
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="总调用" value={String(totals.totalCalls)} />
        <MetricCard label="成功率" value={fmtPct(totalRate)} />
        <MetricCard label="失败调用" value={String(totals.failedCalls)} />
        <MetricCard label="总 Token" value={String(totals.totalTokens)} />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">暂无数据</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--color-surface)]">
              <tr className="text-left text-[var(--color-text-muted)]">
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">账号</th>
                <th className="px-3 py-2">调用数</th>
                <th className="px-3 py-2">成功</th>
                <th className="px-3 py-2">失败</th>
                <th className="px-3 py-2">成功率</th>
                <th className="px-3 py-2">Token</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.date}-${r.account}`} className="border-t border-[var(--color-border)]/70 text-[var(--color-text)]">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.account}</td>
                  <td className="px-3 py-2">{r.totalCalls}</td>
                  <td className="px-3 py-2">{r.successCalls}</td>
                  <td className="px-3 py-2">{r.failedCalls}</td>
                  <td className="px-3 py-2">{fmtPct(r.successRate)}</td>
                  <td className="px-3 py-2">{r.totalTokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

