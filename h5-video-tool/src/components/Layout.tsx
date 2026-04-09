import { Fragment, useState, useEffect, useMemo, type JSX } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

type NavIcon = () => JSX.Element;
type NavItemDef = { to: string; label: string; icon: NavIcon; end?: boolean; highlight?: boolean };

function PlatformIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M10 7h4" />
      <path d="M17 10v4" />
      <path d="M7 10v4" />
      <path d="M7 14h7" />
    </svg>
  );
}

function getStoredUser(): { username: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem('gobs_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function QuickFilmIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DistributeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function MatrixIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

const NAV_GROUPS: NavItemDef[][] = [
  [
    { to: '/', label: '首页', icon: HomeIcon },
    { to: '/platform', label: '平台框架', icon: PlatformIcon, highlight: true },
    { to: '/quickfilm', label: '一键成片', icon: QuickFilmIcon },
    { to: '/projects', label: '我的项目', icon: ProjectsIcon },
    { to: '/studio', label: '生成视频', icon: StudioIcon, end: true },
    { to: '/studio/production', label: '高级制片', icon: ProductionIcon },
    { to: '/editor', label: '视频剪辑', icon: EditorIcon },
  ],
  [
    { to: '/asset-library', label: '素材库', icon: AssetLibraryIcon },
    { to: '/materials', label: '素材管理', icon: MaterialsIcon },
    { to: '/studio?tab=templates', label: '模板市场', icon: TemplateIcon },
    { to: '/distribute', label: '视频分发', icon: DistributeIcon },
  ],
  [
    { to: '/tiktok-matrix', label: 'TikTok 矩阵', icon: MatrixIcon },
    { to: '/history', label: '历史记录', icon: HistoryIcon },
  ],
];

function isStudioMainNavActive(pathname: string, search: string): boolean {
  if (pathname !== '/studio') return false;
  return new URLSearchParams(search).get('tab') !== 'templates';
}

function isStudioTemplatesNavActive(pathname: string, search: string): boolean {
  if (pathname !== '/studio') return false;
  return new URLSearchParams(search).get('tab') === 'templates';
}

function filterNavGroup(group: NavItemDef[]): NavItemDef[] {
  return group;
}

function navLinkClass(active: boolean, highlight?: boolean): string {
  if (highlight && !active) {
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-[var(--color-primary)] bg-[var(--color-primary)]/8 hover:bg-[var(--color-primary)]/15 border-l-2 border-transparent pl-[10px] hover:translate-x-0.5`;
  }
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    active
      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)] pl-[10px]'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] hover:translate-x-0.5 border-l-2 border-transparent pl-[10px]'
  }`;
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
    return NAV_GROUPS.map((g) => filterNavGroup(g));
  }, []);

  const sidebar = (
    <div className={`sticky top-0 flex flex-col ${isEditor || isTiktokMatrix ? 'h-[100dvh]' : 'h-screen'}`}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--color-border)]">
        <img src="/logo.png" alt="GOBS" className="h-12 w-auto max-w-full object-contain" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="sm:hidden p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleGroups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && group.length > 0 && visibleGroups[gi - 1]?.length > 0 && (
              <div className="my-1.5 border-t border-[var(--color-border)]/40" />
            )}
            {group.map(({ to, label, icon: Icon, end: endProp, highlight }) => (
              <NavLink
                key={to}
                to={to}
                end={endProp ?? to === '/'}
                className={({ isActive }) => {
                  let active = isActive;
                  if (to === '/studio') active = isStudioMainNavActive(pathname, search);
                  else if (to === '/studio?tab=templates') active = isStudioTemplatesNavActive(pathname, search);
                  return navLinkClass(active, highlight);
                }}
              >
                <Icon />
                {label}
                {highlight && (
                  <span className="ml-auto text-[9px] bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded font-bold tracking-wide">
                    NEW
                  </span>
                )}
              </NavLink>
            ))}
          </Fragment>
        ))}
      </nav>
      <div className="mt-auto p-3 border-t border-[var(--color-border)] space-y-2">
        {user && (
          <NavLink
            to="/settings/accounts"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)] pl-[10px]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] border-l-2 border-transparent pl-[10px]'
              }`
            }
          >
            <SettingsIcon />
            账号设置
          </NavLink>
        )}
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('gobs_token');
            localStorage.removeItem('gobs_user');
            navigate('/login', { replace: true });
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] border-l-2 border-transparent pl-[10px] text-left"
        >
          <span className="text-lg leading-none">⎋</span>
          退出登录
        </button>
        <ThemeToggle />
        <p className="text-[11px] text-center text-[var(--color-text-subtle)] pb-1 opacity-70">GOBS v0.1</p>
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
          className="fixed inset-0 z-[190] bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`
          fixed sm:relative inset-y-0 left-0 z-[200]
          w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]
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
              className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-[var(--color-text)]">GOBS</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
