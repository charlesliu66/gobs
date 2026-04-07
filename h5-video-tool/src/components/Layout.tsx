import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: '首页', icon: HomeIcon },
  { to: '/studio', label: '生成视频', icon: StudioIcon, end: true },
  { to: '/studio/production', label: '高级制片', icon: ProductionIcon },
  { to: '/editor', label: '视频剪辑', icon: EditorIcon },
  { to: '/materials', label: '素材管理', icon: MaterialsIcon },
  { to: '/studio?tab=templates', label: '模板市场', icon: TemplateIcon },
  { to: '/distribute', label: '视频分发', icon: DistributeIcon },
  { to: '/geelark-batch', label: 'TikTok 矩阵', icon: GeelarkIcon },
  { to: '/history', label: '历史记录', icon: HistoryIcon },
];

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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

/** 分镜 / 制片向导 */
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

function GeelarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const isEditor = pathname === '/editor';
  const isProductionWizard = pathname === '/studio/production';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 路由切换时关闭移动端侧边栏
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const sidebar = (
    <div className={`sticky top-0 flex flex-col ${isEditor ? 'h-[100dvh]' : 'h-screen'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--color-border)]">
        <img src="/logo.png" alt="GOBS" className="h-12 w-auto max-w-full object-contain" />
        {/* 移动端关闭按钮 */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="sm:hidden p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {/* 导航 */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end: endProp }, idx) => (
          <>
            {(idx === 4 || idx === 6) && (
              <div key={`sep-${idx}`} className="my-1.5 border-t border-[var(--color-border)]/40" />
            )}
            <NavLink
              key={to}
              to={to}
              end={endProp ?? to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)] pl-[10px]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] hover:translate-x-0.5 border-l-2 border-transparent pl-[10px]'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          </>
        ))}
      </nav>
      <div className="p-3 border-t border-[var(--color-border)]">
        <ThemeToggle />
        <p className="text-[11px] text-center text-[var(--color-text-subtle)] pb-1 opacity-70">GOBS v0.1</p>
      </div>
    </div>
  );

  return (
    <div className={`flex bg-[var(--color-surface)] ${
      isEditor || isProductionWizard ? 'h-[100dvh] min-h-0 overflow-hidden' : 'min-h-screen'
    }`}>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 — 桌面端固定，移动端抽屉 */}
      <aside
        className={`
          fixed sm:relative inset-y-0 left-0 z-40
          w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]
          transition-transform duration-300 ease-in-out
          sm:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}
      >
        {sidebar}
      </aside>

      {/* 主内容区 */}
      <main className={`flex-1 min-w-0 flex flex-col ${
        isEditor || isProductionWizard
          ? 'min-h-0 overflow-hidden bg-[var(--color-surface)] p-0'
          : 'overflow-auto p-4 sm:p-6 bg-[var(--color-surface)]'
      }`}>
        {/* 移动端顶部栏：全屏页（editor/production）隐藏 */}
        {!isEditor && !isProductionWizard && (
          <div className="sm:hidden flex items-center gap-3 mb-4 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
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
