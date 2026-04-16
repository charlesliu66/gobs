/**
 * Google Drive 素材源路由
 * 前缀: /api/drive
 */
import { Router, type Request, type Response } from 'express';
import {
  getAuthUrl,
  handleCallback,
  isConnected,
  disconnect,
  listFiles,
  downloadFile,
  getCachedPath,
} from '../services/googleDriveService.js';

const router = Router();

function requireUser(req: Request, res: Response): string | null {
  const username = req.user?.username;
  if (!username) {
    res.status(401).json({ error: '未鉴权' });
    return null;
  }
  return username;
}

// ── GET /status ─────────────────────────────────────────────────────────────

router.get('/status', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  try {
    res.json({ connected: isConnected(username) });
  } catch (err) {
    res.json({ connected: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── POST /connect ───────────────────────────────────────────────────────────

router.post('/connect', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  try {
    const url = getAuthUrl(username);
    res.json({ authUrl: url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'OAuth 配置错误' });
  }
});

// ── GET /callback ───────────────────────────────────────────────────────────
// Google OAuth 回调（浏览器重定向到此）

router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code) {
    res.status(400).send('缺少授权码');
    return;
  }

  const username = state || req.user?.username;
  if (!username) {
    res.status(400).send('无法识别用户');
    return;
  }

  try {
    await handleCallback(code, username);
    res.send(`
      <html><body>
        <h2>Google Drive 授权成功</h2>
        <p>你可以关闭此窗口，回到素材库继续操作。</p>
        <script>window.opener?.postMessage({type:'drive-connected'},'*');setTimeout(()=>window.close(),2000);</script>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send(`授权失败：${err instanceof Error ? err.message : String(err)}`);
  }
});

// ── POST /disconnect ────────────────────────────────────────────────────────

router.post('/disconnect', (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  disconnect(username);
  res.json({ ok: true });
});

// ── GET /files ──────────────────────────────────────────────────────────────
// 列出指定文件夹下的文件（含缩略图）

router.get('/files', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const folderId = (req.query.folder as string) || 'root';
  const pageToken = req.query.pageToken as string | undefined;

  try {
    const result = await listFiles(username, folderId, pageToken);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('未连接')) {
      res.status(401).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
});

// ── POST /cache ─────────────────────────────────────────────────────────────
// 按需下载文件到服务器

router.post('/cache', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { fileId, filename } = req.body as { fileId?: string; filename?: string };
  if (!fileId) {
    res.status(400).json({ error: '缺少 fileId' });
    return;
  }

  try {
    const existing = getCachedPath(username, fileId);
    if (existing) {
      res.json({ cached: true, path: existing });
      return;
    }

    const filePath = await downloadFile(username, fileId, filename ?? fileId);
    res.json({ cached: true, path: filePath });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '下载失败' });
  }
});

// ── GET /thumbnail ──────────────────────────────────────────────────────────
// 代理 Google Drive 缩略图（解决跨域问题）

router.get('/thumbnail', async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url || !url.startsWith('https://')) {
    res.status(400).json({ error: '无效的缩略图 URL' });
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ error: '缩略图加载失败' });
      return;
    }
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: '代理请求失败' });
  }
});

export default router;
