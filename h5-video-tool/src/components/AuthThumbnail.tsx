import { useEffect, useState } from 'react';

const API_BASE = '/api';

interface AuthThumbnailProps {
  fileId: string;
  accessToken: string | null;
  name: string;
  mimeType: string;
  className?: string;
}

/** 通过后端代理加载需认证的 Drive 缩略图 */
export function AuthThumbnail({ fileId, accessToken, name, mimeType, className = '' }: AuthThumbnailProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !fileId) {
      setLoading(false);
      setError(!accessToken ? '请先连接 Drive' : null);
      return;
    }
    setError(null);
    let revoked = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ fileId });
        if (mimeType?.startsWith('image/')) params.set('mimeType', mimeType);
        const res = await fetch(`${API_BASE}/drive/thumbnail?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (revoked) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError((body as { error?: string })?.error || `HTTP ${res.status}`);
          return;
        }
        const blob = await res.blob();
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        if (!revoked) setError('网络错误');
      } finally {
        if (!revoked) setLoading(false);
      }
    };
    load();
    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [fileId, accessToken, mimeType]);

  if (loading || !blobUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-1 bg-[var(--color-surface)] text-[var(--color-text-subtle)] ${className}`}>
        {mimeType?.startsWith('video/') ? (
          <svg className="w-12 h-12 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
        ) : (
          <svg className="w-12 h-12 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        )}
        {error && (
          <span className="text-[10px] text-[var(--color-error)] px-1 truncate max-w-full" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return <img src={blobUrl} alt={name} className={`w-full h-full object-cover ${className}`} />;
}
