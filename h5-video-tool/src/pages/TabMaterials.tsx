import { useCallback, useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { parseFolderIdFromUrl, isFileLink } from '../utils/driveUrl';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useMaterials } from '../context/MaterialsContext';
import { useCreateFlow } from '../context/CreateFlowContext';
import { DriveExplorer } from '../components/DriveExplorer';

export function TabMaterials() {
  const materialsCtx = useMaterials();
  const {
    folderUrl,
    setFolderUrl,
    folderStatus,
    setFolderStatus,
    setMaterialsReady,
    setAccessToken,
    setVerifyError,
    verifiedFolderName,
    verifyError,
    accessToken,
    resetFolder,
  } = materialsCtx;

  const { selectedOrder } = useCreateFlow();
  const [localFolderUrl, setLocalFolderUrl] = useState(folderUrl);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive',
    onSuccess: (res) => {
      setAccessToken(res.access_token);
    },
    onError: () => {
      setAccessToken(null);
      setFolderStatus('disconnected');
    },
  });

  const { verifyFolder, checkBackendHealth } = useGoogleDrive(accessToken);

  /** 兜底：若超过 18 秒仍处于 verifying，强制结束 */
  useEffect(() => {
    if (folderStatus !== 'verifying') return;
    const t = setTimeout(() => {
      setFolderStatus('denied');
      setVerifyError('验证超时。请确认：1) 后端 h5-video-tool-api 已启动  2) 网络可访问 Google (若在国内需代理)');
    }, 18000);
    return () => clearTimeout(t);
  }, [folderStatus, setFolderStatus, setVerifyError]);

  const folderId = parseFolderIdFromUrl(localFolderUrl);

  const handleVerify = useCallback(async () => {
    if (!folderId) {
      setFolderStatus(localFolderUrl.trim() ? 'invalid_link' : 'no_link');
      return;
    }
    if (!accessToken) {
      setFolderStatus('disconnected');
      return;
    }
    setFolderStatus('verifying');
    setVerifyError(null);
    try {
      const health = await checkBackendHealth();
      if (!health.ok) {
        setFolderStatus('denied');
        setVerifyError(health.error || '无法连接后端');
        return;
      }
      const result = await verifyFolder(folderId);
      if (result.ok && result.folderName) {
        const name = String(result.folderName).trim() || '素材库';
        setMaterialsReady(folderId, name, localFolderUrl);
        setFolderUrl(localFolderUrl);
        setVerifyError(null);
        setFolderStatus('verified'); // 显式更新，确保 UI 响应
      } else {
        setFolderStatus('denied');
        setVerifyError(result.error || '无该文件夹权限');
      }
    } catch (e) {
      setFolderStatus('denied');
      setVerifyError(e instanceof Error ? e.message : '验证过程发生异常');
    }
  }, [folderId, localFolderUrl, accessToken, setMaterialsReady, setFolderUrl, setFolderStatus, setVerifyError, verifyFolder, checkBackendHealth]);

  const handleConnectAndVerify = useCallback(async () => {
    if (!folderId) {
      setFolderStatus(localFolderUrl.trim() ? 'invalid_link' : 'no_link');
      return;
    }
    if (!accessToken) {
      login();
      return;
    }
    await handleVerify();
  }, [folderId, localFolderUrl, accessToken, login, handleVerify]);

  return (
    <div className="max-w-6xl w-full space-y-6">
        <h1 className="page-title">素材管理</h1>

        <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <h2 className="section-title mb-4">
            设置素材库（Drive 文件夹）
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            连接 Google Drive 并指定素材文件夹后，在「视频生成」中可使用「一键匹配素材」自动检索
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                粘贴你的 Google Drive 素材文件夹链接
              </label>
              <input
                type="url"
                value={localFolderUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalFolderUrl(v);
                  setFolderStatus('idle');
                  setVerifyError(null);
                  if (materialsCtx.verifiedFolderId) {
                    resetFolder();
                  }
                }}
                placeholder="https://drive.google.com/drive/folders/xxxxxx"
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />
              {isFileLink(localFolderUrl) && (
                <p className="mt-1 text-sm text-[var(--color-warning)]">
                  您粘贴的是<strong>文件</strong>链接。素材库需要<strong>文件夹</strong>链接。请打开 Drive 中的素材文件夹，点击「分享」→ 复制链接，格式应为 drive.google.com/drive/folders/xxxxxx
                </p>
              )}
              {folderStatus === 'invalid_link' && localFolderUrl.trim() && !isFileLink(localFolderUrl) && (
                <p className="mt-1 text-sm text-[var(--color-error)]">
                  无法识别该链接，请粘贴完整的 Drive 文件夹链接
                </p>
              )}
              {folderStatus === 'no_link' && (
                <p className="mt-1 text-sm text-[var(--color-warning)]">请先输入 Drive 文件夹链接</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleConnectAndVerify}
                disabled={!folderId || folderStatus === 'verifying' || isFileLink(localFolderUrl)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {!materialsCtx.accessToken
                  ? '连接 Google Drive'
                  : folderStatus === 'verified'
                    ? '已就绪'
                    : '验证权限'}
              </button>
              {folderStatus === 'verifying' && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  正在验证…（约 12 秒内完成，超时请确认后端已启动且网络可访问 Google）
                </span>
              )}
              {folderStatus === 'verified' && verifiedFolderName && (
                <span className="text-sm text-[var(--color-success)]">
                  ✓ 素材库已就绪：{verifiedFolderName}
                </span>
              )}
              {folderStatus === 'denied' && (
                <span className="text-sm text-[var(--color-error)]">
                  {verifyError || '无该文件夹权限，请检查链接或分享设置'}
                  <br />
                  <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
                    排查：F12 → Network → 查看 verify-folder 响应；或查看后端终端日志。若为共享盘，请在 Google Cloud 控制台为项目启用 Drive API。
                  </span>
                </span>
              )}
            </div>
          </div>
        </section>

        {materialsCtx.verifiedFolderId && materialsCtx.verifiedFolderName && (
          <section>
            <h2 className="section-title mb-4">素材库内容</h2>
            <DriveExplorer
              rootFolderId={materialsCtx.verifiedFolderId}
              rootFolderName={materialsCtx.verifiedFolderName}
              accessToken={accessToken}
              onLogin={login}
            />
          </section>
        )}

        {selectedOrder.length > 0 && (
          <section className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            <h2 className="section-title mb-4">当前已选素材</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              已在「视频生成」中选择 {selectedOrder.length} 个素材，顺序映射为 @图片1、@图片2…
            </p>
          </section>
        )}
    </div>
  );
}
