import { Router, type Request } from 'express';
import { COOKIE_NAME, verifyGobsSessionToken } from '../gobs/gobsAuthSession.js';
import { findGobsUserById } from '../gobs/gobsAuthStore.js';
import {
  filterAccountIdsByAllowedIds,
  filterAccountsByAllowedIds,
  getTaskDetail,
  getTaskHistory,
  listAccounts,
  publishVideo,
} from '../services/geelark.js';

export const geelarkRouter = Router();

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

async function getSessionUser(req: Request) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifyGobsSessionToken(token);
  if (!payload) return null;
  const record = await findGobsUserById(payload.sub);
  if (!record) return null;
  if ((record.credentialVersion ?? 1) !== payload.cv) return null;
  return record;
}

function resolveAllowedPublishAccountIds(record: Awaited<ReturnType<typeof getSessionUser>>): string[] | null {
  if (!record || record.isSuperAdmin || record.publishAccountIds === undefined) {
    return null;
  }
  return record.publishAccountIds;
}

geelarkRouter.get('/accounts', async (req, res) => {
  try {
    const record = await getSessionUser(req);
    const allowedIds = resolveAllowedPublishAccountIds(record);
    res.json({ accounts: filterAccountsByAllowedIds(listAccounts(), allowedIds) });
  } catch (err) {
    console.error('[geelark/accounts]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load GeeLark accounts' });
  }
});

geelarkRouter.post('/publish', async (req, res) => {
  const { videoUrl, videoPath, accountIds, caption, hashtags, markAI, needShareLink } = req.body as {
    videoUrl?: string;
    videoPath?: string;
    accountIds?: string[];
    caption?: string;
    hashtags?: string;
    markAI?: boolean;
    needShareLink?: boolean;
  };
  const input = typeof videoPath === 'string' ? videoPath : videoUrl;
  if (!input || typeof input !== 'string') {
    res.status(400).json({ error: 'Please provide videoUrl or videoPath' });
    return;
  }

  const requestedIds = Array.isArray(accountIds)
    ? accountIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (requestedIds.length === 0) {
    res.status(400).json({ error: 'Please select at least one target account' });
    return;
  }

  try {
    const record = await getSessionUser(req);
    const allowedIds = resolveAllowedPublishAccountIds(record);
    const permittedIds = filterAccountIdsByAllowedIds(requestedIds, allowedIds);
    if (permittedIds.length === 0) {
      res.status(403).json({ error: 'Current user has no permitted GeeLark publish accounts' });
      return;
    }

    const result = await publishVideo({
      videoUrl: input,
      accountIds: permittedIds,
      caption: typeof caption === 'string' ? caption : undefined,
      hashtags: typeof hashtags === 'string' ? hashtags : undefined,
      markAI: !!markAI,
      needShareLink: !!needShareLink,
    });
    res.json(result);
  } catch (err) {
    console.error('[geelark/publish]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to publish through GeeLark' });
  }
});

geelarkRouter.get('/task/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Please provide task id' });
    return;
  }
  try {
    res.json(await getTaskDetail(id));
  } catch (err) {
    console.error('[geelark/task]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load task detail' });
  }
});

geelarkRouter.get('/tasks', async (req, res) => {
  const size = Math.min(Number.parseInt(String(req.query.size ?? '20'), 10) || 20, 100);
  try {
    res.json({ items: await getTaskHistory(size) });
  } catch (err) {
    console.error('[geelark/tasks]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load task history' });
  }
});
