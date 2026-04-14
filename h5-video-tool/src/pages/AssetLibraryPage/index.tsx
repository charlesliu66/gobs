/**
 * TASK-C: AssetLibraryPage — 资产中台入口页
 * Tab 切换：总览 / 导入 / 待确认 / 检索
 */
import { useState, useEffect, useCallback } from 'react';
import { listAssets } from '../../api/assetLibraryApi';
import { AssetImportPanel } from './AssetImportPanel';
import { AssetReviewQueue } from './AssetReviewQueue';
import { AssetSearchPanel } from './AssetSearchPanel';
type Tab = 'overview' | 'import' | 'review' | 'search';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: '总览', icon: '📊' },
  { id: 'import', label: '导入', icon: '📤' },
  { id: 'review', label: '待确认', icon: '🔖' },
  { id: 'search', label: '检索', icon: '🔍' },
];

export function AssetLibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [all, pending] = await Promise.all([
        listAssets({ pageSize: '1' }),
        listAssets({ pageSize: '200' }),
      ]);
      setTotalCount(all.total);
      // 计算 pending 标签数
      let pendingTagCount = 0;
      for (const asset of pending.assets) {
        pendingTagCount += asset.tags.filter((t) => t.status === 'pending').length;
      }
      setPendingCount(pendingTagCount);
    } catch {
      // silently fail — stats are supplementary
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">素材中台</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">导入、审核、检索你的所有素材</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="素材总数"
          value={loading ? '…' : String(totalCount)}
          icon="🗂"
          onClick={() => setActiveTab('overview')}
        />
        <StatCard
          label="待确认标签"
          value={loading ? '…' : String(pendingCount)}
          icon="🔖"
          highlight={pendingCount > 0}
          onClick={() => setActiveTab('review')}
        />
        <StatCard
          label="导入素材"
          value=""
          icon="📤"
          onClick={() => setActiveTab('import')}
          action="点击导入"
        />
        <StatCard
          label="检索素材"
          value=""
          icon="🔍"
          onClick={() => setActiveTab('search')}
          action="点击检索"
        />
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'review' && pendingCount > 0 && (
              <span className="text-[10px] bg-white/30 rounded-full px-1.5 font-bold">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div>
        {activeTab === 'overview' && <OverviewTab total={totalCount} pending={pendingCount} loading={loading} onRefresh={loadStats} />}
        {activeTab === 'import' && <AssetImportPanel />}
        {activeTab === 'review' && <AssetReviewQueue />}
        {activeTab === 'search' && <AssetSearchPanel />}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
  onClick,
  action,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
  onClick: () => void;
  action?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-[var(--color-surface-elevated)] border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer ${
        highlight
          ? 'border-orange-500/40 bg-orange-500/6'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]/50'
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-[var(--color-text-muted)] mb-0.5">{label}</div>
      {value ? (
        <div className={`text-2xl font-bold ${highlight ? 'text-orange-500' : 'text-[var(--color-text)]'}`}>
          {value}
        </div>
      ) : (
        <div className="text-sm text-[var(--color-primary)] font-medium">{action}</div>
      )}
    </button>
  );
}

function OverviewTab({
  total,
  pending,
  loading,
  onRefresh,
}: {
  total: number;
  pending: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">资产总览</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-60 transition flex items-center gap-2"
        >
          {loading && <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          刷新
        </button>
      </div>

      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">素材总数</p>
            <p className="text-3xl font-bold text-[var(--color-text)]">{loading ? '…' : total}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">待确认标签</p>
            <p className={`text-3xl font-bold ${pending > 0 ? 'text-orange-500' : 'text-[var(--color-text)]'}`}>
              {loading ? '…' : pending}
            </p>
          </div>
        </div>

        {pending > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm text-orange-500 font-medium">
              有 {pending} 个标签待审核，请前往「待确认」Tab 处理
            </p>
          </div>
        )}

        {total === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--color-text-muted)]">素材库为空，请前往「导入」Tab 上传素材</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetLibraryPage;
