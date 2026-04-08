import { SignJWT, jwtVerify } from 'jose';
import type { GobsFeatureCode, GobsUserRecord, MatrixFeatureCode } from './gobsAuthTypes.js';

const COOKIE_NAME = 'gobs_auth';

export { COOKIE_NAME };

function getAuthSecretBytes(): Uint8Array | null {
  const s = process.env.GOBS_AUTH_SECRET?.trim();
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('gobs-dev-secret-change-me-min-32-chars!!');
  }
  return null;
}

function getBridgeSecretBytes(): Uint8Array | null {
  const s = process.env.GOBS_MATRIX_BRIDGE_SECRET?.trim() || process.env.GOBS_AUTH_SECRET?.trim();
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('gobs-dev-secret-change-me-min-32-chars!!');
  }
  return null;
}

export function getGobsAuthCookieWriteOptions(maxAgeSeconds: number) {
  const prod = process.env.NODE_ENV === 'production';
  if (prod) {
    return {
      httpOnly: true as const,
      path: '/',
      maxAge: maxAgeSeconds,
      sameSite: 'lax' as const,
      secure: true,
    };
  }
  return {
    httpOnly: true as const,
    path: '/',
    maxAge: maxAgeSeconds,
    sameSite: 'lax' as const,
    secure: false,
  };
}

export function getGobsAuthCookieDeleteOptions() {
  const prod = process.env.NODE_ENV === 'production';
  if (prod) {
    return {
      httpOnly: true as const,
      path: '/',
      maxAge: 0,
      sameSite: 'lax' as const,
      secure: true,
    };
  }
  return {
    httpOnly: true as const,
    path: '/',
    maxAge: 0,
    sameSite: 'lax' as const,
    secure: false,
  };
}

export async function signGobsSessionToken(record: GobsUserRecord): Promise<string> {
  const key = getAuthSecretBytes();
  if (!key) throw new Error('请配置 GOBS_AUTH_SECRET（至少 32 字符）');
  return await new SignJWT({
    sub: record.id,
    email: record.email,
    isa: record.isSuperAdmin,
    feat: record.isSuperAdmin ? 'all' : record.features,
    cv: record.credentialVersion ?? 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export type GobsJwtPayload = {
  sub: string;
  email: string;
  isa: boolean;
  feat: 'all' | GobsFeatureCode[];
  cv: number;
};

export async function verifyGobsSessionToken(token: string): Promise<GobsJwtPayload | null> {
  const key = getAuthSecretBytes();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const p = payload as Record<string, unknown>;
    const sub = String(p.sub ?? '');
    if (!sub) return null;
    const email = String(p.email ?? '');
    const isa = Boolean(p.isa);
    const cv = typeof p.cv === 'number' && Number.isFinite(p.cv) ? p.cv : 1;
    const feat = p.feat;
    if (feat === 'all') {
      return { sub, email, isa, feat: 'all', cv };
    }
    if (Array.isArray(feat)) {
      return { sub, email, isa, feat: feat as GobsFeatureCode[], cv };
    }
    return null;
  } catch {
    return null;
  }
}

export async function signMatrixBridgeToken(params: {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  matrixFeatures: MatrixFeatureCode[];
  credentialVersion: number;
  /** TikTok 矩阵可见 group，与矩阵端 filter 一致；超管不传 */
  /** 非超管：undefined=不在 JWT 内（矩阵端视为不限制 group）；[] = 无设备 */
  matrixAllowedGroups?: string[];
}): Promise<string> {
  const key = getBridgeSecretBytes();
  if (!key) throw new Error('请配置 GOBS_MATRIX_BRIDGE_SECRET 或 GOBS_AUTH_SECRET（至少 32 字符）');
  const body: Record<string, unknown> = {
    typ: 'matrix_bridge',
    sub: params.userId,
    email: params.email,
    mf: params.matrixFeatures,
    isa: params.isSuperAdmin,
    cv: params.credentialVersion,
  };
  if (!params.isSuperAdmin && params.matrixAllowedGroups !== undefined) {
    body.mg = params.matrixAllowedGroups;
  }
  return await new SignJWT(body)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('3m')
    .sign(key);
}
