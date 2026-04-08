import { createConnection } from 'node:net';
import { Router, type Request, type Response } from 'express';
import type { GobsFeatureCode, GobsUserRecord, MatrixFeatureCode } from '../gobs/gobsAuthTypes.js';
import {
  ALL_GOBS_FEATURES,
  ALL_MATRIX_FEATURES,
  DEFAULT_GOBS_FEATURES,
  DEFAULT_MATRIX_FEATURES,
  normalizeIdArray,
  userToGobsSession,
} from '../gobs/gobsAuthTypes.js';
import { fetchMatrixGroupTagOptions, loadPublishAccountsFromConfig } from '../gobs/gobsPublishCatalog.js';
import {
  coerceGobsUserFeatures,
  countGobsSuperAdmins,
  deleteGobsUserById,
  findGobsUserByEmail,
  findGobsUserById,
  listGobsUsers,
  loadGobsUsersBlob,
  newGobsUserId,
  upsertGobsUser,
} from '../gobs/gobsAuthStore.js';
import { hashGobsPassword, verifyGobsPassword } from '../gobs/gobsAuthPassword.js';
import {
  COOKIE_NAME,
  getGobsAuthCookieDeleteOptions,
  getGobsAuthCookieWriteOptions,
  signGobsSessionToken,
  signMatrixBridgeToken,
  verifyGobsSessionToken,
} from '../gobs/gobsAuthSession.js';

const router = Router();

function readCookie(req: Request, name: string): string | undefined {
  const h = req.headers.cookie;
  if (!h) return undefined;
  for (const part of h.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

function setSessionCookie(res: Response, token: string) {
  const o = getGobsAuthCookieWriteOptions(60 * 60 * 24 * 7);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${o.path}`,
    `Max-Age=${o.maxAge}`,
    'HttpOnly',
    `SameSite=${o.sameSite}`,
  ];
  if (o.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res: Response) {
  const o = getGobsAuthCookieDeleteOptions();
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=${o.path}`,
    'Max-Age=0',
    'HttpOnly',
    `SameSite=${o.sameSite}`,
  ];
  if (o.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function getSessionUser(req: Request) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifyGobsSessionToken(token);
  if (!payload) return null;
  const record = await findGobsUserById(payload.sub);
  if (!record) return null;
  if ((record.credentialVersion ?? 1) !== payload.cv) return null;
  return { record, payload };
}

async function requireUser(req: Request, res: Response) {
  const s = await getSessionUser(req);
  if (!s) {
    res.status(401).json({ error: '未登录' });
    return null;
  }
  return s;
}

async function requireSuper(req: Request, res: Response) {
  const s = await requireUser(req, res);
  if (!s) return null;
  if (!s.record.isSuperAdmin) {
    res.status(403).json({ error: '需要超级管理员权限' });
    return null;
  }
  return s;
}

/** GET /api/gobs-auth/bootstrap */
router.get('/bootstrap', async (_req, res) => {
  try {
    const blob = await loadGobsUsersBlob();
    res.json({ needsBootstrap: blob.users.length === 0 });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** POST /api/gobs-auth/bootstrap — 首个超级管理员 */
router.post('/bootstrap', async (req, res) => {
  try {
    const blob = await loadGobsUsersBlob();
    if (blob.users.length > 0) {
      return res.status(400).json({ error: '已初始化，请使用登录' });
    }
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: '邮箱与密码必填，密码至少 8 位' });
    }
    const now = Date.now();
    const user: GobsUserRecord = {
      id: newGobsUserId(),
      email,
      passwordHash: await hashGobsPassword(password),
      isSuperAdmin: true,
      features: [...ALL_GOBS_FEATURES],
      matrixFeatures: [...ALL_MATRIX_FEATURES],
      credentialVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    await upsertGobsUser(user);
    const token = await signGobsSessionToken(user);
    setSessionCookie(res, token);
    res.json({ ok: true, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** POST /api/gobs-auth/login */
router.post('/login', async (req, res) => {
  try {
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱与密码' });
    }
    const record = await findGobsUserByEmail(email);
    if (!record) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    const ok = await verifyGobsPassword(password, record.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    const token = await signGobsSessionToken(record);
    setSessionCookie(res, token);
    res.json({ ok: true, user: userToGobsSession(record) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** POST /api/gobs-auth/logout */
router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** GET /api/gobs-auth/session */
router.get('/session', async (req, res) => {
  try {
    const s = await getSessionUser(req);
    if (!s) {
      return res.json({ user: null });
    }
    res.json({ user: userToGobsSession(s.record) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** GET /api/gobs-auth/matrix-tcp-probe?host=&port= — 检测本机/内网矩阵端口是否有进程监听（避免 iframe 仅显示 refused to connect） */
router.get('/matrix-tcp-probe', async (req, res) => {
  try {
    const s = await requireUser(req, res);
    if (!s) return;
    const rawHost = String(req.query.host ?? '127.0.0.1').trim().toLowerCase();
    const port = Math.min(65535, Math.max(1, parseInt(String(req.query.port ?? '3000'), 10) || 3000));
    const allowLocal =
      rawHost === 'localhost' ||
      rawHost === '127.0.0.1' ||
      rawHost === '::1' ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d{1,3}\.\d{1,3}$/.test(rawHost);
    if (!allowLocal) {
      return res.json({ ok: true, skipped: true as const, host: rawHost, port });
    }
    const connectHost = rawHost === 'localhost' ? '127.0.0.1' : rawHost === '::1' ? '::1' : rawHost;
    const ok = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ port, host: connectHost }, () => {
        socket.end();
        resolve(true);
      });
      socket.setTimeout(2000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });
    res.json({ ok, skipped: false as const, host: rawHost, port });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** GET /api/gobs-auth/matrix-bridge-token — 用于矩阵 iframe 免二次登录 */
router.get('/matrix-bridge-token', async (req, res) => {
  try {
    const s = await requireUser(req, res);
    if (!s) return;
    const { record } = s;
    const u = userToGobsSession(record);
    if (!u.isSuperAdmin && !u.features.includes('tiktok_matrix')) {
      return res.status(403).json({ error: '无 TikTok 矩阵权限' });
    }
    const mf = u.matrixFeatures;
    const token = await signMatrixBridgeToken({
      userId: record.id,
      email: record.email,
      isSuperAdmin: record.isSuperAdmin,
      matrixFeatures: mf,
      credentialVersion: record.credentialVersion ?? 1,
      matrixAllowedGroups: record.isSuperAdmin ? undefined : record.matrixAllowedGroups,
    });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** GET /api/gobs-auth/publish-matrix-catalog — 超管：配置发布账号与矩阵分组选项 */
router.get('/publish-matrix-catalog', async (req, res) => {
  try {
    const s = await requireSuper(req, res);
    if (!s) return;
    const [publishAccounts, matrixGroups] = await Promise.all([
      loadPublishAccountsFromConfig(),
      fetchMatrixGroupTagOptions(),
    ]);
    res.json({ publishAccounts, matrixGroups });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** GET /api/gobs-auth/users */
router.get('/users', async (req, res) => {
  try {
    const s = await requireSuper(req, res);
    if (!s) return;
    const users = await listGobsUsers();
    res.json({
      users: users.map((u) => {
        const su = userToGobsSession(u);
        return {
          id: u.id,
          email: u.email,
          isSuperAdmin: u.isSuperAdmin,
          features: su.features,
          matrixFeatures: su.matrixFeatures,
          publishAccountIds: u.publishAccountIds,
          matrixAllowedGroups: u.matrixAllowedGroups,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** POST /api/gobs-auth/users */
router.post('/users', async (req, res) => {
  try {
    const s = await requireSuper(req, res);
    if (!s) return;
    const body = req.body as {
      email?: string;
      password?: string;
      isSuperAdmin?: boolean;
      features?: GobsFeatureCode[];
      matrixFeatures?: MatrixFeatureCode[];
      publishAccountIds?: string[];
      matrixAllowedGroups?: string[];
    };
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: '邮箱与密码必填，密码至少 8 位' });
    }
    if (await findGobsUserByEmail(email)) {
      return res.status(400).json({ error: '邮箱已存在' });
    }
    const isSuperAdmin = Boolean(body.isSuperAdmin);
    const { features, matrixFeatures } = coerceGobsUserFeatures(
      body.features ?? DEFAULT_GOBS_FEATURES,
      body.matrixFeatures ?? DEFAULT_MATRIX_FEATURES,
      isSuperAdmin,
    );
    const now = Date.now();
    const pubIds = normalizeIdArray(body.publishAccountIds);
    const mg = normalizeIdArray(body.matrixAllowedGroups);
    const user: GobsUserRecord = {
      id: newGobsUserId(),
      email,
      passwordHash: await hashGobsPassword(password),
      isSuperAdmin,
      features,
      matrixFeatures,
      credentialVersion: 1,
      createdAt: now,
      updatedAt: now,
      ...(isSuperAdmin
        ? {}
        : {
            ...(pubIds !== undefined ? { publishAccountIds: pubIds } : {}),
            ...(mg !== undefined ? { matrixAllowedGroups: mg } : {}),
          }),
    };
    await upsertGobsUser(user);
    res.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** PATCH /api/gobs-auth/users/:id */
router.patch('/users/:id', async (req, res) => {
  try {
    const s = await requireSuper(req, res);
    if (!s) return;
    const id = req.params.id;
    const record = await findGobsUserById(id);
    if (!record) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const body = req.body as {
      password?: string;
      isSuperAdmin?: boolean;
      features?: GobsFeatureCode[];
      matrixFeatures?: MatrixFeatureCode[];
      publishAccountIds?: string[];
      matrixAllowedGroups?: string[];
    };
    let next = { ...record };
    if (typeof body.password === 'string' && body.password.length >= 8) {
      next.passwordHash = await hashGobsPassword(body.password);
      next.credentialVersion = (next.credentialVersion ?? 1) + 1;
    }
    if (typeof body.isSuperAdmin === 'boolean') {
      next.isSuperAdmin = body.isSuperAdmin;
    }
    const { features, matrixFeatures } = coerceGobsUserFeatures(
      body.features ?? next.features,
      body.matrixFeatures ?? next.matrixFeatures,
      next.isSuperAdmin,
    );
    next.features = features;
    next.matrixFeatures = matrixFeatures;
    if (body.publishAccountIds !== undefined) {
      next.publishAccountIds = normalizeIdArray(body.publishAccountIds) ?? [];
    }
    if (body.matrixAllowedGroups !== undefined) {
      next.matrixAllowedGroups = normalizeIdArray(body.matrixAllowedGroups) ?? [];
    }
    if (next.isSuperAdmin) {
      delete (next as { publishAccountIds?: string[] }).publishAccountIds;
      delete (next as { matrixAllowedGroups?: string[] }).matrixAllowedGroups;
    }
    next.updatedAt = Date.now();
    if (!next.isSuperAdmin && (await countGobsSuperAdmins()) === 1 && record.isSuperAdmin) {
      return res.status(400).json({ error: '至少保留一名超级管理员' });
    }
    await upsertGobsUser(next);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

/** DELETE /api/gobs-auth/users/:id */
router.delete('/users/:id', async (req, res) => {
  try {
    const s = await requireSuper(req, res);
    if (!s) return;
    const id = req.params.id;
    if (id === s.record.id) {
      return res.status(400).json({ error: '不能删除当前登录账号' });
    }
    const target = await findGobsUserById(id);
    if (!target) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (target.isSuperAdmin && (await countGobsSuperAdmins()) <= 1) {
      return res.status(400).json({ error: '至少保留一名超级管理员' });
    }
    await deleteGobsUserById(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'failed' });
  }
});

export default router;
