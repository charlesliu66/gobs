import { useState, useEffect, useMemo, type JSX } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

type NavIcon = () => JSX.Element;
type NavItemDef = { to: string; label: string; icon: NavIcon; end?: boolean; highlight?: boolean };
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

const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: '创作',
    items: [
      { to: '/quickfilm', label: '一键成片', icon: QuickFilmIcon },
      { to: '/studio/production', label: '高级制片', icon: ProductionIcon },
      { to: '/studio', label: '生成视频', icon: StudioIcon, end: true },
    ],
  },
  {
    label: '后期 & 素材',
    items: [
      { to: '/editor', label: '视频剪辑', icon: EditorIcon },
      { to: '/gallery', label: '我的成片', icon: GalleryIcon },
      { to: '/asset-library', label: '素材库', icon: AssetLibraryIcon },
    ],
  },
  {
    label: '分发 & 工具',
    items: [
      { to: '/distribute', label: '视频分发', icon: DistributeIcon },
      { to: '/tiktok-matrix', label: '风控大师', icon: MatrixIcon },
      { to: '/projects', label: '我的项目', icon: ProjectsIcon },
      { to: '/history', label: '历史记录', icon: HistoryIcon },
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
  const user = getStoredUser();
  const isEditor = pathname === '/editor';
  const isProductionWizard = pathname === '/studio/production';
  const isTiktokMatrix = pathname === '/tiktok-matrix';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: filterNavItems(g.items),
    })).filter((g) => g.items.length > 0);
  }, []);

  const sidebar = (
    <div className={`sticky top-0 flex flex-col ${isEditor || isTiktokMatrix ? 'h-[100dvh]' : 'h-screen'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--color-border)]/40">
        <img src="/logo.png" alt="GOBS" className="h-10 w-auto max-w-full object-contain" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭侧边栏"
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
            <p className="section-overline px-3 mb-2">{group.label}</p>
            <div className="space-y-0.5 nav-stagger">
              {group.items.map(({ to, label, icon: Icon, end: endProp, highlight }) => (
                <NavLink
                  key={`${to}:${label}`}
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
                        {label}
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
            aria-label="设置"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all"
          >
            <SettingsIcon />
          </NavLink>
          {user && String(user.username || '').trim().toLowerCase() === 'admin' && (
            <NavLink
              to="/settings/usage"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all"
              title="Key 调用监控"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('gobs_token');
              localStorage.removeItem('gobs_user');
              localStorage.removeItem('gobs_last_project_id');
              localStorage.removeItem('h5-production-project-v1');
              localStorage.removeItem('production_compass_api_key');
              localStorage.removeItem('quickfilm_active_job');
              localStorage.removeItem('gobs_multishot_job_id');
              navigate('/login', { replace: true });
            }}
            className="flex-1 flex items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-all"
            aria-label="退出登录"
            title="退出登录"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <ThemeToggle />
        <p className="text-[10px] text-center text-[var(--color-text-subtle)] opacity-50">GOBS v0.1</p>
      </div>
    </div>
  );

  return (
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
              aria-label="打开菜单"
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
  );
}
