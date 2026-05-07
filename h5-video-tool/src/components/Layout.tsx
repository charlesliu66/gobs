import { useState, useEffect, useMemo, type JSX } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { GlobalJobsContext, useGlobalJobsProvider } from '../hooks/useGlobalJobs';
import { GlobalJobsPanel, GlobalJobsTrigger } from './GlobalJobsPanel';
import { clearAuthStorage, clearPostLoginRedirect } from '../api/client';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { buildLocaleHeaders } from '../i18n/locale.ts';
import { LocalePresetSwitcher } from './LocalePresetSwitcher.tsx';
import {
  formatRuntimeVersionLabel,
  resolveDeploymentBanner,
  type DeploymentStatePayload,
} from '../utils/deploymentBanner.ts';

type NavIcon = () => JSX.Element;
type NavItemDef = { to: string; labelKey: string; icon: NavIcon; end?: boolean; highlight?: boolean };
type RuntimeVersionResponse = {
  success: boolean;
  branch?: string;
  commitShort?: string;
  commitSha?: string;
  environment?: string;
};

type DeploymentStateResponse = {
  success: boolean;
  environment?: string;
  state?: DeploymentStatePayload;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function getStoredUser(): { username: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem('gobs_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function QuickFilmIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function CampaignCreativeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.7 5.48L21 9.36l-4.5 4.38 1.06 6.2L12 17.25 6.44 19.94l1.06-6.2L3 9.36l6.3-.88L12 3z" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
      <line x1="18" y1="6" x2="18.01" y2="6" />
      <line x1="18" y1="18" x2="18.01" y2="18" />
    </svg>
  );
}

function ProductionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="6" y1="4" x2="6" y2="22" />
      <line x1="12" y1="4" x2="12" y2="22" />
      <line x1="18" y1="4" x2="18" y2="22" />
      <line x1="2" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function EditorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="12" rx="1" />
      <line x1="6" y1="8" x2="6" y2="16" />
      <line x1="10" y1="8" x2="10" y2="16" />
      <line x1="14" y1="8" x2="14" y2="16" />
      <polygon points="18,10 22,12 18,14" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AssetLibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DistributeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function MatrixIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const NAV_GROUPS: { labelKey: string; items: NavItemDef[] }[] = [
  {
    labelKey: 'layout.navCreate',
    items: [
      { to: '/campaign-creative', labelKey: 'layout.campaignCreative', icon: CampaignCreativeIcon, highlight: true },
      { to: '/distribute', labelKey: 'layout.distribute', icon: DistributeIcon },
      { to: '/projects', labelKey: 'layout.projects', icon: ProjectsIcon },
      { to: '/history', labelKey: 'layout.history', icon: HistoryIcon },
    ],
  },
  {
    labelKey: 'layout.navPost',
    items: [
      { to: '/gallery', labelKey: 'layout.gallery', icon: GalleryIcon },
      { to: '/tiktok-matrix', labelKey: 'layout.matrix', icon: MatrixIcon },
    ],
  },
  {
    labelKey: 'layout.navDistribution',
    items: [
      { to: '/studio', labelKey: 'layout.studio', icon: StudioIcon, end: true },
      { to: '/studio/production', labelKey: 'layout.production', icon: ProductionIcon },
      { to: '/editor', labelKey: 'layout.editor', icon: EditorIcon },
      { to: '/quickfilm', labelKey: 'layout.quickfilm', icon: QuickFilmIcon },
      { to: '/asset-library', labelKey: 'layout.assets', icon: AssetLibraryIcon },
    ],
  },
];

function isStudioMainNavActive(pathname: string, search: string): boolean {
  if (pathname !== '/studio') return false;
  return new URLSearchParams(search).get('tab') !== 'templates';
}

function getProductionNavTo(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  const currentId = pathname === '/studio/production' ? params.get('projectId') : null;
  let projectId = currentId;
  if (!projectId) {
    try {
      projectId = localStorage.getItem('gobs_last_project_id');
    } catch {
      projectId = null;
    }
  }
  return projectId
    ? `/studio/production?projectId=${encodeURIComponent(projectId)}`
    : '/studio/production';
}

const PLANNING_PATHS = new Set([
  '/platform',
  '/platform/memory',
  '/platform/learning-lab',
  '/platform/ops',
]);

function filterNavItems(items: NavItemDef[]): NavItemDef[] {
  return items.filter((item) => !PLANNING_PATHS.has(item.to));
}

function navLinkClass(active: boolean, highlight?: boolean): string {
  const base = 'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200';
  if (highlight && !active) {
    return `${base} text-[var(--color-accent)] bg-[var(--color-accent)]/8 hover:bg-[var(--color-accent)]/14 border border-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/40`;
  }
  if (active) {
    return `${base} bg-[var(--color-primary)]/14 text-[var(--color-text)] border border-[var(--color-primary)]/30 shadow-[0_0_20px_rgba(124,141,255,0.1)]`;
  }
  return `${base} text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] border border-transparent`;
}

export function Layout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { uiLocale, contentLocale, t } = useLocale();
  const user = getStoredUser();
  const isEditor = pathname === '/editor';
  const isProductionWizard = pathname === '/studio/production';
  const isTiktokMatrix = pathname === '/tiktok-matrix';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [runtimeVersion, setRuntimeVersion] = useState('GOBS');
  const [deploymentState, setDeploymentState] = useState<DeploymentStatePayload | null>(null);
  const globalJobs = useGlobalJobsProvider();
  const deploymentBanner = useMemo(
    () => resolveDeploymentBanner(deploymentState, uiLocale),
    [deploymentState, uiLocale],
  );

  useEffect(() => {
    setSidebarOpen(false);
    globalJobs.closePanel();
  }, [globalJobs.closePanel, pathname]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void fetch(`${API_BASE}/api/system/version`, {
      signal: controller.signal,
      headers: buildLocaleHeaders(uiLocale, contentLocale),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`version ${res.status}`);
        return res.json() as Promise<RuntimeVersionResponse>;
      })
      .then((data) => {
        if (cancelled || !data?.success) return;
        const branch = (data.branch || 'unknown').trim();
        const commit = (data.commitShort || data.commitSha?.slice(0, 7) || 'unknown').trim();
        setRuntimeVersion(formatRuntimeVersionLabel({
          productName: 'GOBS',
          environment: data.environment,
          branch,
          commit,
        }));
      })
      .catch(() => {
        if (!cancelled) setRuntimeVersion(t('layout.runtimeFallback'));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contentLocale, t, uiLocale]);

  useEffect(() => {
    let cancelled = false;

    const loadDeploymentState = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/system/deployment-state`, {
          headers: buildLocaleHeaders(uiLocale, contentLocale),
        });
        if (!res.ok) throw new Error(`deployment-state ${res.status}`);
        const data = await res.json() as DeploymentStateResponse;
        if (!cancelled) {
          setDeploymentState(data?.success ? (data.state ?? null) : null);
        }
      } catch {
        if (!cancelled) setDeploymentState(null);
      }
    };

    void loadDeploymentState();
    const timer = window.setInterval(() => {
      void loadDeploymentState();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [contentLocale, uiLocale]);

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: filterNavItems(g.items),
    })).filter((g) => g.items.length > 0);
  }, []);

  const bannerClassName = (() => {
    if (deploymentBanner.tone === 'critical') {
      return 'border-[var(--color-error)]/35 bg-[var(--color-error)]/12 text-[var(--color-text)]';
    }
    if (deploymentBanner.tone === 'warning') {
      return 'border-amber-500/35 bg-amber-500/12 text-[var(--color-text)]';
    }
    return 'border-sky-500/30 bg-sky-500/10 text-[var(--color-text)]';
  })();

  const sidebar = (
    <div className={`sticky top-0 flex flex-col ${isEditor || isTiktokMatrix ? 'h-[100dvh]' : 'h-screen'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--color-border)]/40">
        <img src="/logo.png" alt="GOBS" className="h-10 w-auto max-w-full object-contain" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label={t('layout.closeSidebar')}
          className="sm:hidden p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            <p className="section-overline px-3 mb-2">{t(group.labelKey)}</p>
            <div className="space-y-0.5 nav-stagger">
              {group.items.map(({ to, labelKey, icon: Icon, end: endProp, highlight }) => (
                <NavLink
                  key={`${to}:${labelKey}`}
                  to={to === '/studio/production' ? getProductionNavTo(pathname, search) : to}
                  end={endProp ?? to === '/'}
                  className={({ isActive }) => {
                    let active = isActive;
                    if (to === '/studio') active = isStudioMainNavActive(pathname, search);
                    return navLinkClass(active, highlight);
                  }}
                >
                  {({ isActive }) => {
                    let active = isActive;
                    if (to === '/studio') active = isStudioMainNavActive(pathname, search);
                    return (
                      <>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(124,141,255,0.5)]" />
                        )}
                        <span className={`flex-shrink-0 ${active ? 'text-[var(--color-primary)] opacity-100' : 'opacity-60'}`}><Icon /></span>
                        {t(labelKey)}
                        {highlight && (
                          <span className="chip-cyan ml-auto !text-[9px] !py-0 !px-1.5">NEW</span>
                        )}
                      </>
                    );
                  }}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — User Area */}
      <div className="mt-auto border-t border-[var(--color-border)]/40 px-3 py-3 space-y-2">
        <LocalePresetSwitcher />
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(124,141,255,0.2)]">
              {(user.displayName || user.username || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--color-text)] truncate">{user.displayName || user.username}</p>
              <p className="text-[10px] text-[var(--color-text-subtle)] truncate">{user.username}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <NavLink
            to="/settings/accounts"
            aria-label={t('layout.settings')}
            title={t('layout.settings')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all"
          >
            <SettingsIcon />
          </NavLink>
          {user && String(user.username || '').trim().toLowerCase() === 'admin' && (
            <NavLink
              to="/settings/usage"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all"
              title={t('layout.usageMonitor')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => {
              clearAuthStorage();
              clearPostLoginRedirect();
              localStorage.removeItem('gobs_last_project_id');
              localStorage.removeItem('h5-production-project-v1');
              localStorage.removeItem('production_compass_api_key');
              localStorage.removeItem('quickfilm_active_job');
              localStorage.removeItem('gobs_multishot_job_id');
              globalJobs.closePanel();
              navigate('/login', { replace: true });
            }}
            className="flex-1 flex items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-all"
            aria-label={t('layout.logout')}
            title={t('layout.logout')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <ThemeToggle />
        <p className="text-[10px] text-center text-[var(--color-text-subtle)] opacity-50">{runtimeVersion}</p>
      </div>
    </div>
  );

  return (
    <GlobalJobsContext.Provider value={globalJobs}>
      <div
        className={`flex bg-[var(--color-surface)] ${
          isEditor || isProductionWizard || isTiktokMatrix ? 'h-[100dvh] min-h-0 overflow-hidden' : 'min-h-screen'
        }`}
      >
        {sidebarOpen && (
          <div
            role="presentation"
            className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`
            fixed sm:relative inset-y-0 left-0 z-[200]
            w-60 flex-shrink-0 border-r border-[var(--color-border)]/50
            bg-[var(--color-surface-elevated)]/90 backdrop-blur-xl
            transition-transform duration-300 ease-in-out
            sm:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
          `}
        >
          {sidebar}
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          {deploymentBanner.visible && (
            <div className="px-4 pt-4 sm:px-6 sm:pt-5 flex-shrink-0">
              <div className={`rounded-2xl border px-4 py-3 shadow-sm ${bannerClassName}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-[15px]">
                    {deploymentBanner.tone === 'critical' ? '!' : deploymentBanner.tone === 'warning' ? '~' : 'i'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight">{deploymentBanner.title}</div>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{deploymentBanner.message}</p>
                    {!deploymentBanner.allowWrites && (
                      <p className="mt-2 text-[11px] font-medium opacity-80">
                        {uiLocale === 'en'
                          ? 'New submissions are not recommended during this window.'
                          : '当前发布窗口内不建议继续发起新的提交类操作。'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <main
            className={`flex-1 min-w-0 flex flex-col ${
              isEditor || isProductionWizard || isTiktokMatrix
                ? `min-h-0 overflow-hidden bg-[var(--color-surface)] p-0 ${
                    isTiktokMatrix ? 'h-full max-h-[100dvh] [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:flex-1' : ''
                  }`
                : 'overflow-auto p-4 sm:p-6 bg-[var(--color-surface)]'
            }`}
          >
            {!isEditor && !isProductionWizard && !isTiktokMatrix && (
              <div className="sm:hidden flex items-center gap-3 mb-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={t('layout.openMenu')}
                  className="p-2 rounded-lg border border-[var(--color-border)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="18" y2="18" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-[var(--color-text)] tracking-tight">GOBS</span>
              </div>
            )}
            <Outlet />
          </main>
        </div>
        <GlobalJobsTrigger />
        <GlobalJobsPanel />
      </div>
    </GlobalJobsContext.Provider>
  );
}
