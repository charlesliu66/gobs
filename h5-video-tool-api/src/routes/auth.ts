/**
 * 认证路由
 * POST /api/auth/login  — 账号密码登录，返回 JWT token
 * GET  /api/auth/me     — 返回当前用户信息
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtUser } from '../middleware/auth.js';

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
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: '请提供用户名和密码' });
    return;
  }

  const users = getUsers();
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';
  const payload: JwtUser = { username: user.username, displayName: user.displayName };
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  res.json({
    token,
    user: payload,
  });
});

/**
 * GET /api/auth/me
 * 需要 JWT 鉴权（中间件已在 index.ts 挂载）
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: '未认证' });
    return;
  }
  res.json({ user: req.user });
});

export default router;
