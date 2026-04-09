import jwt from 'jsonwebtoken';
export function jwtAuthMiddleware(req, res, next) {
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
    // 浏览器 <video>/<audio> 标签无法附带 Bearer，放行媒体文件流读取
    if (req.method === 'GET' && req.path.startsWith('/api/editor/assets/files/')) {
        next();
        return;
    }
    if (req.method === 'GET' && req.path.startsWith('/api/editor/music/files/')) {
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
        const payload = jwt.verify(token, secret);
        req.user = { username: payload.username, displayName: payload.displayName };
        next();
    }
    catch {
        res.status(401).json({ error: 'token 无效或已过期' });
    }
}
