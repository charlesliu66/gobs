/**
 * 可灵/ingarena 拉取「本 API 托管的参考视频」时需要的 **公网或公司网可达** 的 API 根地址（无尾斜杠）。
 *
 * 应与前端 H5 的 `VITE_API_BASE_URL` 指向 **同一 Node 服务**（例如 H5 请求 `https://api.xxx.com/api/video/models`，
 * 平台则拉取 `https://api.xxx.com/api/video/kling/ref-cache/<uuid>`）。
 *
 * 优先级：API_PUBLIC_BASE_URL → KLING_REF_VIDEO_PUBLIC_BASE → H5_PUBLIC_API_BASE_URL（与 VITE 对齐的别名）
 * → 若 API_SELF_BASE_URL 看起来像非本机地址则作为兜底。
 */
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/i;

function normalizeBase(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** 是否可能被远端服务（ingarena）发起 HTTP GET 访问（排除纯本机 loopback） */
export function looksReachableFromRemoteServers(baseUrl: string): boolean {
  try {
    const u = new URL(baseUrl);
    if (!/^https?:$/i.test(u.protocol)) return false;
    return !LOOPBACK_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * 返回供 `prepareSocialVideoUrlForKling` 拼接 `/api/video/kling/ref-cache/:id` 的根地址；未配置时返回 null。
 */
export function getPublicApiBaseUrlForKlingRef(): string | null {
  const explicit =
    process.env.API_PUBLIC_BASE_URL?.trim() ||
    process.env.KLING_REF_VIDEO_PUBLIC_BASE?.trim() ||
    process.env.H5_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    return normalizeBase(explicit);
  }

  const self = process.env.API_SELF_BASE_URL?.trim();
  if (self && looksReachableFromRemoteServers(self)) {
    return normalizeBase(self);
  }

  return null;
}
