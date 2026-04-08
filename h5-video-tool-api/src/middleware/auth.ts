/**
 * JWT 鉴权中间件
 * - 从 Authorization: Bearer <token> 读取 token
 * - 验证后把 user 信息挂到 req.user
 * - 跳过 /api/auth/login
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtUser {
  username: string;
  displayName: string;
}

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 只对 /api/ 路径鉴权，且跳过登录接口
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }
  if (req.path === '/api/auth/login') {
    next();
    return;
  }
  if (req.path === '/api/health') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证 token' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'gobs-secret-change-in-production';

  try {
    const payload = jwt.verify(token, secret) as JwtUser & { iat: number; exp: number };
    req.user = { username: payload.username, displayName: payload.displayName };
    next();
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' });
  }
}
