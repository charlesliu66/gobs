import { useCallback, useEffect, useState } from 'react';
import type { GobsFeatureCode, MatrixFeatureCode } from '../types/gobsAuth';

type Row = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  features: GobsFeatureCode[];
  matrixFeatures: MatrixFeatureCode[];
  publishAccountIds?: string[];
  matrixAllowedGroups?: string[];
  createdAt: number;
  updatedAt: number;
};

type Catalog = {
  publishAccounts: { id: string; username?: string; remark?: string; platform?: string }[];
  matrixGroups: string[];
};

const GOBS_FEATURE_OPTIONS: { id: GobsFeatureCode; label: string }[] = [
  { id: 'home', label: '首页' },
  { id: 'studio', label: '生成视频' },
  { id: 'production', label: '高级制片' },
  { id: 'editor', label: '视频剪辑' },
  { id: 'materials', label: '素材管理' },
  { id: 'templates', label: '模板市场' },
  { id: 'distribute', label: '视频分发' },
  { id: 'tiktok_matrix', label: 'TikTok 矩阵' },
  { id: 'history', label: '历史记录' },
  { id: 'admin_accounts', label: '账号管理（后台）' },
];

const MATRIX_FEATURE_OPTIONS: { id: MatrixFeatureCode; label: string }[] = [
  { id: 'home', label: '批量评论' },
  { id: 'devices', label: '设备台' },
  { id: 'batch_login', label: '批量登录账号' },
  { id: 'tasks', label: '任务日志' },
  { id: 'settings', label: '代理设置' },
  { id: 'warmup', label: '批量养号 / 定时' },
];

function toggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function defaultPubIds(row: Row, cat: Catalog | null): string[] {
  if (row.publishAccountIds !== undefined) return row.publishAccountIds;
  return cat?.publishAccounts.map((a) => a.id) ?? [];
}

function defaultMg(row: Row, cat: Catalog | null): string[] {
  if (row.matrixAllowedGroups !== undefined) return row.matrixAllowedGroups;
  return cat ? [...cat.matrixGroups] : [];
}

function PublishMatrixFields(props: {
  title?: string;
  publishAccounts: Catalog['publishAccounts'];
  matrixGroups: string[];
  publishAccountIds: string[];
  matrixAllowedGroups: string[];
  onPublishChange: (ids: string[]) => void;
  onMatrixChange: (groups: string[]) => void;
}) {
  const {
    title = '发布账号',
    publishAccounts,
    matrixGroups,
    publishAccountIds,
    matrixAllowedGroups,
    onPublishChange,
    onMatrixChange,
  } = props;
  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)]/50 p-3">
      <p className="text-xs font-semibold text-[var(--color-text)]">{title}</p>
      <div>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">内容发布账号（视频分发目标）</p>
        {publishAccounts.length === 0 ? (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            未读取到 config/geelark-accounts.json 中的账号，请检查 API 工作目录与配置文件路径。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {publishAccounts.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px]"
              >
                <input
                  type="checkbox"
                  checked={publishAccountIds.includes(a.id)}
                  onChange={() => onPublishChange(toggle(publishAccountIds, a.id))}
                />
                <span className="font-mono">{a.id}</span>
                {a.username && <span className="text-[var(--color-text-muted)]">{a.username}</span>}
              </label>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">TikTok 矩阵 — 按分组（GeeLark 云手机 tag/group）</p>
        {matrixGroups.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            未拉取到分组：请在仓库根或 h5-video-tool-api/.env 配置 GEELARK_BEARER_TOKEN 或 GEELARK_API_KEY（与 GeeLark
            OpenAPI 一致）；也可使用仓库 config/geelark.json 的 apiKey。国内区请设 GEELARK_BASE_URL 或 GEELARK_SJ_BASE_URL
            为 https://openapi.geelark.cn/open/v1。重启 API 后再试。仍可保存为空以禁止矩阵设备。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {matrixGroups.map((g) => (
              <label
                key={g}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px]"
              >
                <input
                  type="checkbox"
                  checked={matrixAllowedGroups.includes(g)}
                  onChange={() => onMatrixChange(toggle(matrixAllowedGroups, g))}
                />
                {g}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsAccounts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cSuper, setCSuper] = useState(false);
  const [cFeat, setCFeat] = useState<GobsFeatureCode[]>(GOBS_FEATURE_OPTIONS.map((x) => x.id).filter((x) => x !== 'admin_accounts'));
  const [cMatrix, setCMatrix] = useState<MatrixFeatureCode[]>(['home', 'devices', 'tasks', 'warmup']);
  const [cPubIds, setCPubIds] = useState<string[]>([]);
  const [cMg, setCMg] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/gobs-auth/publish-matrix-catalog', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载目录失败');
      setCatalog({
        publishAccounts: data.publishAccounts ?? [],
        matrixGroups: data.matrixGroups ?? [],
      });
    } catch {
      setCatalog({ publishAccounts: [], matrixGroups: [] });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch('/api/gobs-auth/users', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setRows(data.users as Row[]);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const createUser = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch('/api/gobs-auth/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cEmail,
          password: cPassword,
          isSuperAdmin: cSuper,
          features: cFeat,
          matrixFeatures: cMatrix,
          ...(!cSuper ? { publishAccountIds: cPubIds, matrixAllowedGroups: cMg } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      setMsg('已创建账号');
      setCreateOpen(false);
      setCEmail('');
      setCPassword('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '失败');
    } finally {
      setBusy(false);
    }
  };

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/gobs-auth/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMsg('已保存');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '失败');
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该账号？')) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/gobs-auth/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMsg('已删除');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">账号与权限</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          创建子账号、分配 GOBS 功能、矩阵页签权限，以及<strong>内容发布账号</strong>（视频分发目标）与
          <strong>TikTok 矩阵分组</strong>（按 GeeLark 云手机 group/tag）。矩阵在 GOBS 内嵌时沿用此处权限。
        </p>
      </div>

      {msg && (
        <div className="text-sm text-[var(--color-primary)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 rounded-lg px-3 py-2">
          {msg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium"
        >
          {createOpen ? '取消创建' : '新建账号'}
        </button>
      </div>

      {createOpen && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">新建账号</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">邮箱</label>
              <input
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)]">密码（≥8 位）</label>
              <input
                type="password"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={cSuper} onChange={(e) => setCSuper(e.target.checked)} />
            超级管理员（拥有全部功能）
          </label>
          {!cSuper && (
            <>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">GOBS 功能</p>
                <div className="flex flex-wrap gap-2">
                  {GOBS_FEATURE_OPTIONS.map((o) => (
                    <label key={o.id} className="flex items-center gap-1.5 text-xs text-[var(--color-text)]">
                      <input
                        type="checkbox"
                        checked={cFeat.includes(o.id)}
                        onChange={() => setCFeat((f) => toggle(f, o.id))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">矩阵内权限</p>
                <div className="flex flex-wrap gap-2">
                  {MATRIX_FEATURE_OPTIONS.map((o) => (
                    <label key={o.id} className="flex items-center gap-1.5 text-xs text-[var(--color-text)]">
                      <input
                        type="checkbox"
                        checked={cMatrix.includes(o.id)}
                        onChange={() => setCMatrix((f) => toggle(f, o.id))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              {!cSuper && catalog === null && (
                <p className="text-xs text-[var(--color-text-muted)]">正在加载发布账号目录…</p>
              )}
              {!cSuper && catalog && (
                <PublishMatrixFields
                  title="发布账号（新建子账号）"
                  publishAccounts={catalog.publishAccounts}
                  matrixGroups={catalog.matrixGroups}
                  publishAccountIds={cPubIds}
                  matrixAllowedGroups={cMg}
                  onPublishChange={setCPubIds}
                  onMatrixChange={setCMg}
                />
              )}
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createUser()}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium"
          >
            创建
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">加载中…</p>
      ) : loadErr ? (
        <p className="text-sm text-red-600">{loadErr}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((u) => (
            <UserCard
              key={u.id}
              row={u}
              catalog={catalog}
              busy={busy}
              onPatch={(body) => void patchUser(u.id, body)}
              onDelete={() => void deleteUser(u.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({
  row,
  catalog,
  busy,
  onPatch,
  onDelete,
}: {
  row: Row;
  catalog: Catalog | null;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [pw, setPw] = useState('');
  const [superA, setSuperA] = useState(row.isSuperAdmin);
  const [feat, setFeat] = useState<GobsFeatureCode[]>(row.features);
  const [mf, setMf] = useState<MatrixFeatureCode[]>(row.matrixFeatures);
  const [pubIds, setPubIds] = useState<string[]>([]);
  const [mg, setMg] = useState<string[]>([]);

  useEffect(() => {
    setSuperA(row.isSuperAdmin);
    setFeat(row.features);
    setMf(row.matrixFeatures);
    setPubIds(defaultPubIds(row, catalog));
    setMg(defaultMg(row, catalog));
  }, [row, catalog]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{row.email}</p>
          <p className="text-[10px] text-[var(--color-text-subtle)]">id: {row.id}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="text-xs text-red-600 hover:underline"
        >
          删除
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={superA}
          onChange={(e) => {
            const v = e.target.checked;
            setSuperA(v);
            onPatch(
              v
                ? { isSuperAdmin: true }
                : {
                    isSuperAdmin: false,
                    features: feat,
                    matrixFeatures: mf,
                    publishAccountIds: pubIds,
                    matrixAllowedGroups: mg,
                  },
            );
          }}
        />
        超级管理员
      </label>
      {!superA && (
        <>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">GOBS 功能</p>
            <div className="flex flex-wrap gap-2">
              {GOBS_FEATURE_OPTIONS.map((o) => (
                <label key={o.id} className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={feat.includes(o.id)}
                    onChange={() => {
                      const next = toggle(feat, o.id);
                      setFeat(next);
                      onPatch({
                        features: next,
                        matrixFeatures: mf,
                        publishAccountIds: pubIds,
                        matrixAllowedGroups: mg,
                      });
                    }}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">矩阵权限</p>
            <div className="flex flex-wrap gap-2">
              {MATRIX_FEATURE_OPTIONS.map((o) => (
                <label key={o.id} className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={mf.includes(o.id)}
                    onChange={() => {
                      const next = toggle(mf, o.id);
                      setMf(next);
                      onPatch({
                        features: feat,
                        matrixFeatures: next,
                        publishAccountIds: pubIds,
                        matrixAllowedGroups: mg,
                      });
                    }}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          {catalog && (
            <PublishMatrixFields
              publishAccounts={catalog.publishAccounts}
              matrixGroups={catalog.matrixGroups}
              publishAccountIds={pubIds}
              matrixAllowedGroups={mg}
              onPublishChange={(next) => {
                setPubIds(next);
                onPatch({
                  features: feat,
                  matrixFeatures: mf,
                  publishAccountIds: next,
                  matrixAllowedGroups: mg,
                });
              }}
              onMatrixChange={(next) => {
                setMg(next);
                onPatch({
                  features: feat,
                  matrixFeatures: mf,
                  publishAccountIds: pubIds,
                  matrixAllowedGroups: next,
                });
              }}
            />
          )}
        </>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-[var(--color-text-muted)]">重置密码（可选）</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="≥8 位"
            className="mt-1 block px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy || pw.length < 8}
          onClick={() => {
            onPatch({ password: pw });
            setPw('');
          }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs"
        >
          更新密码
        </button>
      </div>
    </div>
  );
}
