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
  // 系统信息接口（版本查询无需鉴权）
  if (req.path.startsWith('/api/system/')) {
    next();
    return;
  }
  // 浏览器 <video>/<audio> 标签无法附带 Bearer，放行媒体文件流读取
  if (req.method === 'GET' && req.path.startsWith('/api/editor/assets/files/')) {
    next();
    return;
  }
  if (req.method === 'GET' && req.path.startsWith('/api/editor/music/files/')) {
    next();
    return;
  }
  // 高级制片分镜视频回放：<video src="/api/video/file?path=..."> 无法附带 Bearer
  if (req.method === 'GET' && req.path === '/api/video/file') {
    next();
    return;
  }
  // TASK-D: 资产库文件访问（支持 ?token= 认证，路由内部自行验证 token）
  if (req.method === 'GET' && /^\/api\/asset-library\/assets\/[^/]+\/file/.test(req.path)) {
    next();
    return;
  }
  // 高级制片图片回显：<img src> 无法带 Bearer，放行只读图片接口
  if (req.method === 'GET' && req.path === '/api/production/image') {
    next();
    return;
  }
  // 兼容部分代理转发后前缀被剥离的情况
  if (req.method === 'GET' && req.path === '/image') {
    next();
    return;
  }
  // 风控大师封面代理：<img src> 无法附带 Authorization
  if (req.method === 'GET' && req.path === '/api/risk-sentiment/cover-proxy') {
    next();
    return;
  }
  // 批量任务视频回放：<video src="/api/batch-jobs/video/xxx"> 无法附带 Bearer
  if (req.method === 'GET' && req.path.startsWith('/api/batch-jobs/video/')) {
    next();
    return;
  }
  // SSE 实时推送端点：使用 ?token= 查询参数鉴权，路由内部自行验证
  if (req.method === 'GET' && req.path === '/api/batch-jobs/stream') {
    next();
    return;
  }
  if (req.method === 'GET' && /^\/api\/quickfilm\/[^/]+\/stream$/.test(req.path)) {
    next();
    return;
  }
  /** Cookie 会话（GOBS 账号 / 矩阵桥接），不使用 Bearer */
  if (req.path === '/api/prompt/templates') {
    return next();
  }
  if (req.path.startsWith('/api/gobs-auth')) {
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
