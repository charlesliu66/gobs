import { SignJWT, jwtVerify } from 'jose';
const COOKIE_NAME = 'gobs_auth';
export { COOKIE_NAME };
function getAuthSecretBytes() {
    const s = process.env.GOBS_AUTH_SECRET?.trim();
    if (s && s.length >= 32)
        return new TextEncoder().encode(s);
    if (process.env.NODE_ENV !== 'production') {
        return new TextEncoder().encode('gobs-dev-secret-change-me-min-32-chars!!');
    }
    return null;
}
function getBridgeSecretBytes() {
    const s = process.env.GOBS_MATRIX_BRIDGE_SECRET?.trim() || process.env.GOBS_AUTH_SECRET?.trim();
    if (s && s.length >= 32)
        return new TextEncoder().encode(s);
    if (process.env.NODE_ENV !== 'production') {
        return new TextEncoder().encode('gobs-dev-secret-change-me-min-32-chars!!');
    }
    return null;
}
export function getGobsAuthCookieWriteOptions(maxAgeSeconds) {
    const prod = process.env.NODE_ENV === 'production';
    if (prod) {
        return {
            httpOnly: true,
            path: '/',
            maxAge: maxAgeSeconds,
            sameSite: 'lax',
            secure: true,
        };
    }
    return {
        httpOnly: true,
        path: '/',
        maxAge: maxAgeSeconds,
        sameSite: 'lax',
        secure: false,
    };
}
export function getGobsAuthCookieDeleteOptions() {
    const prod = process.env.NODE_ENV === 'production';
    if (prod) {
        return {
            httpOnly: true,
            path: '/',
            maxAge: 0,
            sameSite: 'lax',
            secure: true,
        };
    }
    return {
        httpOnly: true,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: false,
    };
}
export async function signGobsSessionToken(record) {
    const key = getAuthSecretBytes();
    if (!key)
        throw new Error('请配置 GOBS_AUTH_SECRET（至少 32 字符）');
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
export async function verifyGobsSessionToken(token) {
    const key = getAuthSecretBytes();
    if (!key)
        return null;
    try {
        const { payload } = await jwtVerify(token, key);
        const p = payload;
        const sub = String(p.sub ?? '');
        if (!sub)
            return null;
        const email = String(p.email ?? '');
        const isa = Boolean(p.isa);
        const cv = typeof p.cv === 'number' && Number.isFinite(p.cv) ? p.cv : 1;
        const feat = p.feat;
        if (feat === 'all') {
            return { sub, email, isa, feat: 'all', cv };
        }
        if (Array.isArray(feat)) {
            return { sub, email, isa, feat: feat, cv };
        }
        return null;
    }
    catch {
        return null;
    }
}
export async function signMatrixBridgeToken(params) {
    const key = getBridgeSecretBytes();
    if (!key)
        throw new Error('请配置 GOBS_MATRIX_BRIDGE_SECRET 或 GOBS_AUTH_SECRET（至少 32 字符）');
    const body = {
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
