/**
 * 认证路由
 * POST /api/auth/login  — 账号密码登录，返回 JWT token
 * GET  /api/auth/me     — 返回当前用户信息
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtUser } from '../middleware/auth.js';
import { signFileAccessToken } from '../utils/fileAccessToken.js';

const router = Router();

interface UserConfig {
  username: string;
  password: string;
  displayName: string;
}

function getUsers(): UserConfig[] {
  try {
    const raw = process.env.USERS_CONFIG;
    if (!raw) {
      // 默认账号
      return [
        { username: 'admin', password: 'admin123', displayName: '管理员' },
        { username: 'user1', password: 'pass123', displayName: '用户1' },
      ];
    }
    return JSON.parse(raw) as UserConfig[];
  } catch {
    console.error('[auth] USERS_CONFIG 解析失败，使用默认账号');
    return [
      { username: 'admin', password: 'admin123', displayName: '管理员' },
    ];
  }
}

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Response: { success: true, data: { token, user } }
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ success: false, error: '请提供用户名和密码' });
    return;
  }

  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    res.status(401).json({ success: false, error: '用户名或密码错误' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
  const payload: JwtUser = { username: user.username, displayName: user.displayName };
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  /**
   * fileAccessToken 用于 <video>/<img> 等无法携带 Bearer 的媒体 GET 接口。
   * 与 JWT 生命周期一致；前端读取后附加到 media URL 的 ?fat= 参数。
   */
  const fileAccessToken = signFileAccessToken(user.username);

  res.json({
    success: true,
    data: {
      token,
      fileAccessToken,
      user: payload,
    },
  });
});

/**
 * GET /api/auth/file-access-token
 * 已登录用户刷新 fileAccessToken。便于 JWT 未过期但 FAT 临近过期时续签。
 */
router.get('/file-access-token', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }
  res.json({ success: true, data: { fileAccessToken: signFileAccessToken(req.user.username) } });
});

/**
 * GET /api/auth/me
 * 需要 JWT 鉴权（中间件已在 index.ts 挂载）
 * Response: { success: true, data: { user } }
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }
  res.json({ success: true, data: { user: req.user } });
});

/**
 * GET /api/auth/matrix-bridge-token
 * 为当前已登录用户签发短期 bridge token，供前端在 iframe 中换取 SJ 的 sj_auth cookie
 */
router.get('/matrix-bridge-token', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
  const bridgePayload = {
    typ: 'matrix_bridge',
    email: `${req.user.username}@gobs.local`,
    // Current deployment uses Gobs as the single identity source.
    // Any successfully authenticated Gobs user gets full SJ console capability.
    isa: true,
    mf: ['home', 'devices', 'batch_login', 'tasks', 'settings', 'warmup'],
    cv: 1,
  };
  const bridgeToken = jwt.sign(bridgePayload, secret, { expiresIn: '5m' });

  res.json({ success: true, data: { token: bridgeToken } });
});

export default router;
