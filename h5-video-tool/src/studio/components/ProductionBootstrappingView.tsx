export function ProductionBootstrappingView({
  loadingProjectTitle,
}: {
  loadingProjectTitle: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(124,141,255,0.12),transparent_45%)]">
      <div className="gobs-card rounded-2xl px-7 py-6 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-text)]">项目加载中…</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {loadingProjectTitle
            ? `正在加载「${loadingProjectTitle}」，请稍候`
            : '正在同步云端项目数据，请稍候'}
        </p>
      </div>
    </div>
  );
}

