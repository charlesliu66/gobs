import { Router } from 'express';
import { queryDailyKeyUsage } from '../services/keyUsageStats.js';

const router = Router();

function isAdminUsername(username: string): boolean {
  const raw = process.env.ADMIN_USERNAMES?.trim();
  const allowed = raw
    ? raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    : ['admin'];
  return allowed.includes(username);
}

router.get('/key-usage/daily', async (req, res) => {
  try {
    const username = req.user?.username?.trim() ?? '';
    if (!username) {
      return res.status(401).json({ error: '未登录' });
    }
    if (!isAdminUsername(username)) {
      return res.status(403).json({ error: '仅管理员可查看' });
    }
    const days = Number.parseInt(String(req.query.days ?? '7'), 10);
    const rows = await queryDailyKeyUsage(Number.isFinite(days) ? days : 7);
    return res.json({ ok: true, days: Number.isFinite(days) ? days : 7, rows });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : '查询失败' });
  }
});

export default router;

