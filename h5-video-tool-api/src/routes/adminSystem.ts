import { Router } from 'express';

import { readDeploymentState, writeDeploymentState } from '../services/deploymentState.js';

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

function assertAdminUsername(username: string): string | null {
  const normalized = username.trim();
  if (!normalized) return 'unauthorized';
  if (!isAdminUsername(normalized)) return 'forbidden';
  return null;
}

router.get('/deployment-state', async (req, res) => {
  try {
    const username = req.user?.username?.trim() ?? '';
    const authError = assertAdminUsername(username);
    if (authError === 'unauthorized') {
      return res.status(401).json({ error: '未登录' });
    }
    if (authError === 'forbidden') {
      return res.status(403).json({ error: '仅管理员可查看' });
    }

    const state = await readDeploymentState();
    return res.json({ success: true, state });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : '读取部署状态失败' });
  }
});

router.put('/deployment-state', async (req, res) => {
  try {
    const username = req.user?.username?.trim() ?? '';
    const authError = assertAdminUsername(username);
    if (authError === 'unauthorized') {
      return res.status(401).json({ error: '未登录' });
    }
    if (authError === 'forbidden') {
      return res.status(403).json({ error: '仅管理员可修改' });
    }

    const state = await writeDeploymentState(req.body, { updatedBy: username });
    return res.json({ success: true, state });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : '更新部署状态失败' });
  }
});

export default router;
