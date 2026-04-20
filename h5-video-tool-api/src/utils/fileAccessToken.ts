/**
 * 文件访问签名 token（File Access Token, 简称 FAT）
 *
 * 使用场景：浏览器 <video>/<img> 等标签无法携带 Authorization: Bearer，
 * 对 `/api/video/file`、`/api/batch-jobs/video/:id` 等需要验证调用者身份
 * 的只读媒体接口，用短时 HMAC token 作为旁路。
 *
 * Token 格式：base64url(payload) + '.' + base64url(hmac)
 * payload 为 { u: username, exp: unixSeconds }
 *
 * 签名密钥复用 JWT_SECRET；过期时间默认与登录 JWT 一致（7 天）。
 */
import { createHmac, timingSafeEqual } from 'crypto';

export interface FileAccessPayload {
  u: string;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

function getSecret(): string {
  return process.env.JWT_SECRET || 'gobs-secret-change-in-production';
}

export function signFileAccessToken(username: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const payload: FileAccessPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds),
  };
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

export function verifyFileAccessToken(token: string | undefined | null): FileAccessPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;
  const expectedSig = createHmac('sha256', getSecret()).update(payloadB64).digest();
  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;
  let payload: FileAccessPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as FileAccessPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/**
 * 统一解析视频/文件媒体请求的调用者身份：
 * 1. 有 JWT (req.user) 时直接返回；
 * 2. 否则尝试 ?fat=<token> 或 ?u=<token> 查询参数；
 * 3. 两者都没有返回 null。
 */
export function resolveMediaRequestUsername(req: {
  user?: { username?: string | null };
  query?: Record<string, unknown>;
}): string | null {
  const jwtName = req.user?.username?.trim();
  if (jwtName) return jwtName;
  const raw = req.query?.['fat'] ?? req.query?.['u'];
  if (typeof raw !== 'string') return null;
  const payload = verifyFileAccessToken(raw);
  return payload?.u ?? null;
}
