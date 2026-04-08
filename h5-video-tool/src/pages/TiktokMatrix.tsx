import { useEffect } from 'react';

function resolveMatrixUrl(): string {
  const full = import.meta.env.VITE_SJ_MATRIX_BASE_URL?.trim();
  if (full) return full.replace(/\/$/, '');
  return `${window.location.origin}/sj`;
}

export default function TiktokMatrix() {
  const matrixUrl = resolveMatrixUrl();

  useEffect(() => {
    // 自动在新标签页打开矩阵
    window.open(matrixUrl, '_blank');
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#25F4EE] to-[#FE2C55]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">TikTok 矩阵管理</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          矩阵管理面板已在新标签页中打开
        </p>
      </div>

      <a
        href={matrixUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        重新打开矩阵面板
      </a>

      <p className="text-xs text-[var(--color-text-subtle)]">
        如果新标签页未自动打开，请点击上方按钮手动打开
      </p>
    </div>
  );
}
