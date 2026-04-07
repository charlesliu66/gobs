/**
 * 可灵 Kling 视频生成（HTTP 异步任务 + 轮询）
 *
 * 支持两套形态（由 KLING_API_BASE_URL 判定）：
 * - 快手官方（北京域）：https://api-beijing.klingai.com
 *   - 文生：POST /v1/videos/text2video，body 使用 model_name、duration 字符串、mode 为 std|pro
 *   - 多模态/Omni（含参考图）：POST /v1/videos/omni-video，body 含 image_list 等（见官网）
 *   - 轮询：GET /v1/videos/text2video/{task_id} 或 GET /v1/videos/omni-video/{task_id}
 * - Garena clipai（ingarena.net OpenAPI）：POST /api/kling/omni-video，GET /api/kling/video-list 轮询
 * - 其它第三方兼容网关：仍可用旧字段 model、/v1/videos/image2video 等
 *
 * 环境变量：
 *   KLING_API_KEY
 *   KLING_API_BASE_URL  默认 https://api-beijing.klingai.com
 *   KLING_POLL_MS / KLING_POLL_MAX / KLING_MODE（standard→std，或 professional→pro）
 *   KLING_CALLBACK_URL  官方创建任务可选 callback_url
 *   KLING_MAX_REF_IMAGES  多图参考时最多张数（默认 7，含素材拉取与 referenceImages）
 *   Omni 参考视频：KlingVideoOptions.videoList → body.video_list（**仅 http(s) URL**，不可 base64）
 *   KLING_HTTP_PROXY / KLING_HTTPS_PROXY  仅当显式设置时，可灵请求才走代理（默认直连，不受全局 HTTPS_PROXY 影响；clipai.ingarena 经公司代理常 403）
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

/** 与官网示例一致，默认走北京域 */
const DEFAULT_BASE = 'https://api-beijing.klingai.com';
const POLL_MS = Math.max(500, parseInt(process.env.KLING_POLL_MS || '2000', 10) || 2000);
/** 默认可轮询约 20 分钟（600×2s）；长任务可调 KLING_POLL_MAX */
const POLL_MAX = Math.max(10, parseInt(process.env.KLING_POLL_MAX || '600', 10) || 600);

/** 单张参考图（多图时组成 image_list） */
export interface KlingRefImage {
  imageBase64: string;
  imageMimeType?: string;
  /** ingarena / 官方 Omni 的 ImageUrlItem.type：首尾帧语义 */
  type?: 'first_frame' | 'end_frame';
}

/**
 * Omni 参考视频（body.video_list）：
 * - **仅**可灵服务端能拉取的 **http(s) URL**（公网 CDN、或本 API 的 `/api/video/kling/ref-cache/:id`）。
 * - 不支持 base64 / data: 内嵌（与参考图不同）。
 */
export interface KlingRefVideo {
  /** 可拉取的成片 URL，必须以 http:// 或 https:// 开头 */
  videoUrl: string;
  /** 特征参考（动作/风格）或待编辑底片 */
  referType?: 'feature' | 'base';
  keepOriginalSound?: 'yes' | 'no';
}

export interface KlingVideoOptions {
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  model?: string;
  /** 单张参考（与 imageList 二选一；imageList 优先） */
  imageBase64?: string;
  imageMimeType?: string;
  /** 多图参考：对应网关 body 的 image_list */
  imageList?: KlingRefImage[];
  /** 参考视频：对应 body.video_list（与 image_list 可并存，具体互斥规则见平台文档） */
  videoList?: KlingRefVideo[];
}

export interface KlingVideoResult {
  taskId: string;
  videoUrl: string;
}

export function isKlingModel(model?: string): boolean {
  if (!model?.trim()) return false;
  const m = model.trim().toLowerCase();
  return m.startsWith('kling') || m.includes('kling-v') || m.startsWith('kling/') || m.startsWith('kling-video');
}

/**
 * clipai.ingarena 等接口在 JSON 里把 task_id 写成数字时，超过 JS 安全整数会精度丢失，
 * 导致与 H5 保存的字符串 task_id 永远对不上。在解析前把大数字段改为字符串。
 */
function quoteJsonBigIntTaskIds(jsonStr: string): string {
  return jsonStr
    .replace(/"task_id"\s*:\s*(\d{15,})/g, '"task_id":"$1"')
    .replace(/"taskId"\s*:\s*(\d{15,})/g, '"taskId":"$1"');
}

/** 可灵专用：默认直连（proxy:false），避免系统/终端里的 HTTPS_PROXY 把 clipai.ingarena 走公司代理导致 403 */
function klingAxiosConnectionConfig(): Pick<AxiosRequestConfig, 'httpsAgent' | 'httpAgent' | 'proxy'> {
  const explicit = process.env.KLING_HTTP_PROXY?.trim() || process.env.KLING_HTTPS_PROXY?.trim();
  if (explicit) {
    try {
      const agent = new HttpsProxyAgent(explicit);
      return { httpsAgent: agent, httpAgent: agent, proxy: false };
    } catch {
      return { proxy: false };
    }
  }
  return { proxy: false };
}

function getClient(): { baseURL: string; axios: AxiosInstance } {
  const token = process.env.KLING_API_KEY?.trim();
  if (!token) {
    throw new Error('未配置 KLING_API_KEY，无法使用可灵模型。请在 .env 中设置 KLING_API_KEY。');
  }
  const baseURL = (process.env.KLING_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  const ingarena = isIngarenaGateway(baseURL);
  const client = axios.create({
    baseURL,
    timeout: 120000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    validateStatus: (s) => s < 500,
    ...klingAxiosConnectionConfig(),
    ...(ingarena
      ? {
          transformResponse: [
            (data: unknown): unknown => {
              if (typeof data !== 'string' || data === '') return data;
              try {
                return JSON.parse(quoteJsonBigIntTaskIds(data));
              } catch {
                try {
                  return JSON.parse(data);
                } catch {
                  return data;
                }
              }
            },
          ],
        }
      : {}),
  });
  return { baseURL, axios: client };
}

/** 官方文档使用北京域 *.klingai.com；其它域名走网关兼容逻辑 */
function isOfficialKlingBase(baseURL: string): boolean {
  return /klingai\.com/i.test(baseURL);
}

/** clipai.ingarena.net：OpenAPI 仅暴露 omni-video / video-list / video-delete */
function isIngarenaGateway(baseURL: string): boolean {
  return /ingarena\.net/i.test(baseURL);
}

/** 供路由判断是否走异步创建 + video-list 轮询（H5） */
export function isIngarenaKlingBaseUrl(): boolean {
  const base = (process.env.KLING_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  return isIngarenaGateway(base);
}

/**
 * ingarena omni 接口 model_name 仅允许 kling-video-o1 | kling-v3-omni（见 Text2VideoO1Request）
 */
function normalizeImageB64(s: string): string {
  return s.replace(/^data:image\/\w+;base64,/, '');
}

/** 合并单张与多张字段 */
function resolveRefImages(options: KlingVideoOptions): KlingRefImage[] {
  if (options.imageList?.length) return options.imageList;
  if (options.imageBase64) {
    return [{ imageBase64: options.imageBase64, imageMimeType: options.imageMimeType }];
  }
  return [];
}

function resolveRefVideos(options: KlingVideoOptions): KlingRefVideo[] {
  const list = options.videoList?.filter((v) => typeof v.videoUrl === 'string' && v.videoUrl.trim().length > 0);
  return list ?? [];
}

/** 参考视频仅允许 URL，禁止把整段 MP4 当 base64 传入 */
function assertRefVideoUrl(raw: string): string {
  const video_url = raw.trim();
  if (/^https?:\/\//i.test(video_url)) return video_url;
  throw new Error(
    '参考视频 video_list 仅支持 **http(s) URL**（可灵侧需能 GET 拉取），不支持 base64 或 data: 内嵌。请使用 API_PUBLIC_BASE_URL + /api/video/kling/ref-cache/:id、或 OSS/CDN 公网链接。',
  );
}

/** Omni video_list 项（官方：video_url 为可拉取 URL） */
function toOmniVideoListPayload(
  items: KlingRefVideo[],
): { video_url: string; refer_type: 'feature' | 'base'; keep_original_sound: 'yes' | 'no' }[] {
  return items.map((v) => ({
    video_url: assertRefVideoUrl(v.videoUrl),
    refer_type: (v.referType === 'base' ? 'base' : 'feature') as 'feature' | 'base',
    keep_original_sound: v.keepOriginalSound === 'yes' ? ('yes' as const) : ('no' as const),
  }));
}

/** clipai.ingarena：video_url 与官方一致，仅 https 或 http URL */
function toIngarenaVideoListPayload(
  items: KlingRefVideo[],
): { video_url: string; refer_type: 'feature' | 'base'; keep_original_sound: 'yes' | 'no' }[] {
  return items.map((v) => ({
    video_url: assertRefVideoUrl(v.videoUrl),
    refer_type: (v.referType === 'base' ? 'base' : 'feature') as 'feature' | 'base',
    keep_original_sound: v.keepOriginalSound === 'yes' ? ('yes' as const) : ('no' as const),
  }));
}

/** Omni image_list 项：image_url 为 data URL 或 https URL */
function toOmniImageListPayload(refs: KlingRefImage[]): { image_url: string; type?: 'first_frame' | 'end_frame' }[] {
  return refs.map((item) => {
    const mime = item.imageMimeType || 'image/png';
    const b64 = normalizeImageB64(item.imageBase64);
    const cell: { image_url: string; type?: 'first_frame' | 'end_frame' } = {
      image_url: `data:${mime};base64,${b64}`,
    };
    if (item.type) cell.type = item.type;
    return cell;
  });
}

/**
 * clipai.ingarena：部分任务对 data URL 报「not valid base64」，image_url 传**纯 base64**（无 data: 前缀）。
 * 若需改回 data URL，设 KLING_INGARENA_IMAGE_DATAURL=1
 */
function toIngarenaImageListPayload(refs: KlingRefImage[]): { image_url: string; type?: 'first_frame' | 'end_frame' }[] {
  return refs.map((item) => {
    const b64 = normalizeImageB64(item.imageBase64);
    const cell: { image_url: string; type?: 'first_frame' | 'end_frame' } = {
      image_url: b64,
    };
    if (item.type) cell.type = item.type;
    return cell;
  });
}

function mapIngarenaOmniModelName(model: string): string {
  const m = model.trim().toLowerCase();
  if (m === 'kling-video-o1') return 'kling-video-o1';
  if (m === 'kling-v3-omni' || m === 'kling-v3') return 'kling-v3-omni';
  if (m.startsWith('kling')) return 'kling-v3-omni';
  return 'kling-v3-omni';
}

/** video-list 返回的 data.data 数组项 */
interface IngarenaVideoRow {
  task_id?: string;
  task_status?: number;
  video_url?: string;
  task_status_msg?: string;
}

function extractIngarenaVideoRows(data: unknown): IngarenaVideoRow[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const wrap = o.data;
  if (Array.isArray(wrap)) return wrap as IngarenaVideoRow[];
  if (!wrap || typeof wrap !== 'object') return [];
  const inner = wrap as Record<string, unknown>;
  const rows = inner.data ?? inner.list ?? inner.records;
  if (Array.isArray(rows)) return rows as IngarenaVideoRow[];
  return [];
}

function ingarenaTaskFailed(status: number | string | undefined): boolean {
  if (status === 3) return true;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    return s === 'failed' || s === 'error';
  }
  return false;
}

/** video-list 里 task_status：2 / succeed 等为成功；创建接口 tasks 里可能是字符串 pending */
function ingarenaTaskSucceed(status: number | string | undefined): boolean {
  if (status === 2) return true;
  if (status === '2') return true;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    if (s === 'succeed' || s === 'success' || s === 'completed' || s === 'done') return true;
    const n = parseInt(s, 10);
    if (!Number.isNaN(n) && n === 2) return true;
  }
  if (typeof status === 'number' && Number.isFinite(status) && Math.trunc(status) === 2) return true;
  return false;
}

/** 部分网关状态码未文档化，但已有可播放地址且非失败态，视为成功 */
function ingarenaRowLooksReady(row: IngarenaVideoRow): boolean {
  if (ingarenaTaskFailed(row.task_status)) return false;
  return !!pickVideoUrl(row);
}

function sameTaskId(a: unknown, b: string): boolean {
  const sa = readTaskIdField(a);
  return sa != null && sa === b;
}

/** 按 task_id 查 video-list：先带 video_name，再分页全表（避免任务不在第一页） */
async function findIngarenaRowByTaskId(http: AxiosInstance, tid: string): Promise<IngarenaVideoRow | undefined> {
  const base = { pageSize: 100, task_type: 6, order_by_desc: 1 };
  const { data: d1 } = await http.get('/api/kling/video-list', {
    params: { ...base, page: 1, video_name: tid },
  });
  throwIfOfficialBusinessError(d1, '可灵 video-list 失败');
  let rows = extractIngarenaVideoRows(d1);
  const hit = rows.find((r) => sameTaskId(r.task_id, tid));
  if (hit) return hit;

  for (let page = 1; page <= 10; page++) {
    const { data } = await http.get('/api/kling/video-list', {
      params: { ...base, page },
    });
    throwIfOfficialBusinessError(data, '可灵 video-list 失败');
    rows = extractIngarenaVideoRows(data);
    const row = rows.find((r) => sameTaskId(r.task_id, tid));
    if (row) return row;
    if (rows.length < base.pageSize) break;
  }
  return undefined;
}

function pickVideoUrl(row: IngarenaVideoRow): string | undefined {
  const r = row as IngarenaVideoRow & Record<string, unknown>;
  const u = r.video_url;
  if (typeof u === 'string' && u.trim()) return u.trim();
  const w = r.watermark_url;
  if (typeof w === 'string' && w.trim()) return w.trim();
  const dl = r.download_url ?? r.downloadUrl;
  if (typeof dl === 'string' && dl.trim()) return dl.trim();
  const out = r.output ?? r.result;
  if (out && typeof out === 'object') {
    const o = out as Record<string, unknown>;
    const vu = o.video_url ?? o.videoUrl ?? o.url;
    if (typeof vu === 'string' && vu.trim()) return vu.trim();
  }
  const tr = r.task_result;
  if (tr && typeof tr === 'object') {
    const t = tr as Record<string, unknown>;
    const vu = t.video_url ?? t.videoUrl ?? t.url;
    if (typeof vu === 'string' && vu.trim()) return vu.trim();
    const videos = t.videos;
    if (Array.isArray(videos) && videos[0] && typeof videos[0] === 'object') {
      const u0 = (videos[0] as Record<string, unknown>).url;
      if (typeof u0 === 'string' && u0.trim()) return u0.trim();
    }
  }
  return undefined;
}

function mapAspectRatio(ar?: string): string {
  const a = (ar || '16:9').trim();
  if (a === '9:16' || a === '16:9' || a === '1:1') return a;
  return '16:9';
}

/** Omni 常用档位：5 / 10 / 15（秒）；超出则夹到最近档 */
function mapDurationSec(sec?: number): number {
  const s = sec != null ? Number(sec) : 5;
  if (Number.isNaN(s)) return 5;
  if (s <= 5) return 5;
  if (s <= 10) return 10;
  return 15;
}

/** 官方 mode：std | pro */
function mapOfficialMode(raw: string): 'std' | 'pro' {
  const x = raw.trim().toLowerCase();
  if (x === 'pro' || x === 'professional') return 'pro';
  return 'std';
}

/** 网关 mode：standard | professional 等 */
function mapGatewayMode(raw: string): string {
  const x = raw.trim().toLowerCase();
  if (x === 'professional' || x === 'pro') return 'professional';
  if (x === 'std') return 'standard';
  return raw.trim() || 'standard';
}

type CreateKind = 'text' | 'omni' | 'gateway-text' | 'gateway-image' | 'ingarena-omni';

/** 创建任务接口可能返回 string 或 number */
function readTaskIdField(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function extractTaskId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const top = readTaskIdField(o.task_id) ?? readTaskIdField(o.taskId);
  if (top) return top;
  const code = o.code;
  if ((code === 0 || code === '0') && o.data && typeof o.data === 'object') {
    const inner = o.data as Record<string, unknown>;
    const a = readTaskIdField(inner.task_id) ?? readTaskIdField(inner.taskId);
    if (a) return a;
    const tasks = inner.tasks;
    if (Array.isArray(tasks) && tasks[0] && typeof tasks[0] === 'object') {
      const tid = readTaskIdField((tasks[0] as Record<string, unknown>).task_id);
      if (tid) return tid;
    }
  }
  const d = o.data;
  if (d && typeof d === 'object') {
    const inner = d as Record<string, unknown>;
    const b = readTaskIdField(inner.task_id) ?? readTaskIdField(inner.taskId);
    if (b) return b;
    const tasks = inner.tasks;
    if (Array.isArray(tasks) && tasks[0] && typeof tasks[0] === 'object') {
      const tid = readTaskIdField((tasks[0] as Record<string, unknown>).task_id);
      if (tid) return tid;
    }
  }
  return null;
}

/** 从轮询响应取状态与视频 URL（官方 task_status / task_result 与网关混合格式） */
function extractStatusAndUrl(data: unknown): { status: string; videoUrl: string | null; error?: string } {
  if (!data || typeof data !== 'object') {
    return { status: 'unknown', videoUrl: null };
  }
  const root = data as Record<string, unknown>;
  const payload = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;

  const tryVideoFromOfficial = (obj: Record<string, unknown>): string | null => {
    const tr = obj.task_result;
    if (tr && typeof tr === 'object') {
      const t = tr as Record<string, unknown>;
      const videos = t.videos;
      if (Array.isArray(videos) && videos[0] && typeof videos[0] === 'object') {
        const u = (videos[0] as Record<string, unknown>).url;
        if (typeof u === 'string') return u;
      }
      if (typeof t.video_url === 'string') return t.video_url;
    }
    return null;
  };

  const tryRead = (obj: Record<string, unknown>): { status: string; url: string | null; err?: string } => {
    const st = (obj.task_status ?? obj.status ?? obj.state ?? obj.task_status_msg ?? '') as string;
    let url: string | null = tryVideoFromOfficial(obj);
    if (!url) {
      if (typeof obj.video_url === 'string') url = obj.video_url;
      else if (typeof obj.videoUrl === 'string') url = obj.videoUrl;
      else {
        const out = obj.output ?? obj.result ?? obj.task_result;
        if (out && typeof out === 'object') {
          const ou = out as Record<string, unknown>;
          if (typeof ou.video_url === 'string') url = ou.video_url;
          else if (typeof ou.videoUrl === 'string') url = ou.videoUrl;
          else if (typeof ou.url === 'string') url = ou.url;
        }
      }
    }
    const err =
      (typeof obj.error === 'string' && obj.error) ||
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.task_status_msg === 'string' && obj.task_status_msg) ||
      undefined;
    return { status: String(st || '').toLowerCase(), url, err };
  };

  let r = tryRead(payload);
  if (!r.url && payload.data && typeof payload.data === 'object') {
    r = tryRead(payload.data as Record<string, unknown>);
  }

  const terminalFail = ['failed', 'error', 'cancelled', 'canceled'].some((x) => r.status.includes(x));
  const terminalOk = ['completed', 'success', 'succeeded', 'done', 'succeed'].some((x) => r.status.includes(x));

  let status = r.status;
  if (terminalOk) status = 'completed';
  if (terminalFail) status = 'failed';

  return { status, videoUrl: r.url, error: r.err };
}

/** 官方接口可能 HTTP 200 但 body.code != 0 */
function throwIfOfficialBusinessError(data: unknown, label: string): void {
  if (!data || typeof data !== 'object') return;
  const o = data as Record<string, unknown>;
  const c = o.code;
  if (c === undefined || c === null) return;
  if (c === 0 || c === '0') return;
  const msg =
    (typeof o.msg === 'string' && o.msg) ||
    (typeof o.message === 'string' && o.message) ||
    JSON.stringify(data);
  throw new Error(`${label}: ${msg}`);
}

function pollPathForKind(baseURL: string, kind: CreateKind, taskId: string): string {
  if (isOfficialKlingBase(baseURL)) {
    if (kind === 'omni') return `/v1/videos/omni-video/${encodeURIComponent(taskId)}`;
    return `/v1/videos/text2video/${encodeURIComponent(taskId)}`;
  }
  return `/v1/videos/${encodeURIComponent(taskId)}`;
}

/** ingarena 对无效 video_url 等偶发返回 DatabaseError，补充可读提示 */
function enrichIngarenaOmniError(message: string): string {
  if (/DatabaseError/i.test(message)) {
    return `${message}（参考视频须为可灵侧可拉取的 **http(s) URL**：配置 API_PUBLIC_BASE_URL + 本服务 GET /api/video/kling/ref-cache/:id，或将 MP4 传到 OSS/CDN 后填公网链接。不支持 base64。TikTok CDN 直链可设 KLING_ALLOW_SOCIAL_VIDEO_URL=1 尝试。参考视频时长常见要求约 3～10 秒。）`;
  }
  return message;
}

/** 仅创建任务（不轮询），返回 task_id 与 createKind */
async function klingSubmitTask(options: KlingVideoOptions): Promise<{ taskId: string; createKind: CreateKind }> {
  const { baseURL, axios: http } = getClient();
  const model = options.model?.trim() || process.env.KLING_DEFAULT_MODEL?.trim() || 'kling-v2.6-pro';
  const prompt = options.prompt.trim();
  if (!prompt) {
    throw new Error('prompt 不能为空');
  }

  const aspect_ratio = mapAspectRatio(options.aspectRatio);
  const durationNum = mapDurationSec(options.duration);
  const durationStr = String(durationNum);
  const modeRaw = (process.env.KLING_MODE || 'standard').trim() || 'standard';
  const official = isOfficialKlingBase(baseURL);
  const ingarena = isIngarenaGateway(baseURL);
  const refImages = resolveRefImages(options);
  const refVideos = resolveRefVideos(options);

  let taskId: string | null = null;
  let createKind: CreateKind = 'gateway-text';

  if (ingarena) {
    createKind = 'ingarena-omni';
    const modelName = mapIngarenaOmniModelName(model);
    const callback_url = process.env.KLING_CALLBACK_URL ?? '';
    const external_task_id = '';
    const baseBody: Record<string, unknown> = {
      model_name: modelName,
      multi_shot: 0,
      prompt,
      mode: mapOfficialMode(modeRaw),
      aspect_ratio,
      duration: durationStr,
      callback_url,
      external_task_id,
    };
    if (refImages.length) {
      const useDataUrl = process.env.KLING_INGARENA_IMAGE_DATAURL === '1';
      baseBody.image_list = useDataUrl ? toOmniImageListPayload(refImages) : toIngarenaImageListPayload(refImages);
    }
    if (refVideos.length) {
      baseBody.video_list = toIngarenaVideoListPayload(refVideos);
    }
    const { data, status } = await http.post('/api/kling/omni-video', baseBody);
    if (status >= 400) {
      const msg =
        (data as { msg?: string })?.msg ||
        (data as { message?: string })?.message ||
        JSON.stringify(data);
      const hint403 =
        status === 403
          ? ' [HTTP 403 常见原因：① 当前出口 IP 不在公司网关/ingarena 白名单（需连办公 VPN 或公司网络）；② 在 Cursor 等远程环境执行脚本时，出口与本人电脑不同；③ 勿对 ingarena 走会拦截的 HTTP 代理——可灵客户端已默认直连，勿设 KLING_HTTP_PROXY 除非平台要求]'
          : '';
      throw new Error(enrichIngarenaOmniError(`可灵 omni-video 失败 [HTTP ${status}]: ${msg}${hint403}`));
    }
    try {
      throwIfOfficialBusinessError(data, '可灵 omni-video 失败');
    } catch (e) {
      if (e instanceof Error) throw new Error(enrichIngarenaOmniError(e.message));
      throw e;
    }
    taskId = extractTaskId(data);
    if (!taskId) {
      throw new Error(
        `可灵 omni-video 未解析到 task_id，请对照网关文档检查响应字段。原始响应: ${JSON.stringify(data).slice(0, 4000)}`,
      );
    }
  } else if (official) {
    const callback_url = process.env.KLING_CALLBACK_URL ?? '';
    const external_task_id = '';

    if (refImages.length || refVideos.length) {
      createKind = 'omni';
      const body: Record<string, unknown> = {
        model_name: model,
        prompt,
        duration: durationStr,
        mode: mapOfficialMode(modeRaw),
        aspect_ratio,
        callback_url,
        external_task_id,
      };
      if (refImages.length) body.image_list = toOmniImageListPayload(refImages);
      if (refVideos.length) body.video_list = toOmniVideoListPayload(refVideos);
      const { data, status } = await http.post('/v1/videos/omni-video', body);
      if (status >= 400) {
        const msg =
          (data as { message?: string })?.message ||
          (data as { msg?: string })?.msg ||
          JSON.stringify(data);
        throw new Error(`可灵 Omni 视频失败: ${msg}`);
      }
      throwIfOfficialBusinessError(data, '可灵 Omni 视频失败');
      taskId = extractTaskId(data);
    } else {
      createKind = 'text';
      const body = {
        model_name: model,
        prompt,
        duration: durationStr,
        mode: mapOfficialMode(modeRaw),
        aspect_ratio,
        callback_url,
        external_task_id,
      };
      const { data, status } = await http.post('/v1/videos/text2video', body);
      if (status >= 400) {
        const msg =
          (data as { message?: string })?.message ||
          (data as { msg?: string })?.msg ||
          JSON.stringify(data);
        throw new Error(`可灵文生视频失败: ${msg}`);
      }
      throwIfOfficialBusinessError(data, '可灵文生视频失败');
      taskId = extractTaskId(data);
    }
  } else if (refImages.length) {
    createKind = 'gateway-image';
    const mime = refImages[0].imageMimeType || 'image/png';
    const dataUrl = `data:${mime};base64,${normalizeImageB64(refImages[0].imageBase64)}`;
    const { data, status } = await http.post('/v1/videos/image2video', {
      model,
      prompt,
      image: dataUrl,
      duration: durationNum,
      aspect_ratio,
      mode: mapGatewayMode(modeRaw),
    });
    if (status >= 400) {
      const msg = (data as { message?: string })?.message || (data as { error?: string })?.error || JSON.stringify(data);
      throw new Error(`可灵图生视频失败: ${msg}`);
    }
    taskId = extractTaskId(data);
  } else {
    createKind = 'gateway-text';
    const { data, status } = await http.post('/v1/videos/text2video', {
      model,
      prompt,
      duration: durationNum,
      aspect_ratio,
      mode: mapGatewayMode(modeRaw),
    });
    if (status >= 400) {
      const msg = (data as { message?: string })?.message || (data as { error?: string })?.error || JSON.stringify(data);
      throw new Error(`可灵文生视频失败: ${msg}`);
    }
    taskId = extractTaskId(data);
  }

  if (!taskId) {
    throw new Error('可灵未返回 task_id，请检查 KLING_API_BASE_URL 与接口文档是否一致');
  }

  return { taskId, createKind };
}

export async function createKlingVideoTaskOnly(options: KlingVideoOptions): Promise<string> {
  const { taskId } = await klingSubmitTask(options);
  return taskId;
}

export async function generateKlingVideo(options: KlingVideoOptions): Promise<KlingVideoResult> {
  const { baseURL, axios: http } = getClient();
  const { taskId, createKind } = await klingSubmitTask(options);
  const ingarena = isIngarenaGateway(baseURL);

  if (ingarena) {
    const tid = String(taskId);
    for (let i = 0; i < POLL_MAX; i++) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      const row = await findIngarenaRowByTaskId(http, tid);
      if (!row) continue;
      if (ingarenaTaskFailed(row.task_status)) {
        throw new Error(`可灵任务失败: ${row.task_status_msg || 'task_status=3'}`);
      }
      if (ingarenaTaskSucceed(row.task_status) || ingarenaRowLooksReady(row)) {
        const url = pickVideoUrl(row);
        if (url) {
          const res = await axios.get<ArrayBuffer>(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            ...klingAxiosConnectionConfig(),
          });
          const buf = Buffer.from(res.data);
          const b64 = buf.toString('base64');
          return {
            taskId: `kling-${tid}`,
            videoUrl: `data:video/mp4;base64,${b64}`,
          };
        }
      }
    }
    throw new Error(
      '可灵任务超时未完成，请稍后重试或缩短时长。可在 .env 增大 KLING_POLL_MAX（默认 600 次）或 KLING_POLL_MS，或到平台后台查看该任务是否仍在排队/失败。',
    );
  }

  const pollPath = pollPathForKind(baseURL, createKind, taskId);

  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const { data } = await http.get(pollPath);
    const { status, videoUrl, error } = extractStatusAndUrl(data);

    if (status === 'failed') {
      throw new Error(`可灵任务失败: ${error || JSON.stringify(data)}`);
    }
    if (videoUrl) {
      const res = await axios.get<ArrayBuffer>(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        ...klingAxiosConnectionConfig(),
      });
      const buf = Buffer.from(res.data);
      const b64 = buf.toString('base64');
      return {
        taskId: `kling-${taskId}`,
        videoUrl: `data:video/mp4;base64,${b64}`,
      };
    }
  }

  throw new Error('可灵任务超时未完成，请稍后重试或缩短时长');
}

/** H5 展示用：从 video-list 行映射 */
export interface KlingVideoListRow {
  taskId: string;
  taskStatus?: number | string;
  taskStatusMsg?: string;
  videoUrl?: string;
  coverUrl?: string;
  modelName?: string;
  aspectRatio?: string;
  modeLabel?: string;
  soundLabel?: string;
  createdAt?: string;
  /** video-list 文案（若有） */
  prompt?: string;
  raw?: Record<string, unknown>;
}

export type KlingPollPhase = 'pending' | 'processing' | 'succeeded' | 'failed';

function normalizeTaskIdParam(raw: string): string {
  const s = raw.trim();
  if (s.toLowerCase().startsWith('kling-')) return s.slice(6);
  return s;
}

function mapIngarenaRowToPublic(row: IngarenaVideoRow & Record<string, unknown>): KlingVideoListRow {
  const taskId = readTaskIdField(row.task_id) ?? '';
  const videoUrl = pickVideoUrl(row);
  const coverUrl =
    (typeof row.cover_url === 'string' && row.cover_url.trim()) ||
    (typeof row.cover_image_url === 'string' && row.cover_image_url.trim()) ||
    (typeof row.cover === 'string' && row.cover.trim()) ||
    undefined;
  const modelName =
    (typeof row.model_name === 'string' && row.model_name.trim()) ||
    (typeof row.model === 'string' && row.model.trim()) ||
    undefined;
  const aspectRatio = typeof row.aspect_ratio === 'string' ? row.aspect_ratio : undefined;
  const modeRaw = row.mode ?? row.video_mode ?? row.quality;
  const modeLabel =
    typeof modeRaw === 'string'
      ? modeRaw
      : modeRaw != null
        ? String(modeRaw)
        : undefined;
  let soundLabel: string | undefined;
  const snd = row.sound ?? row.audio ?? row.has_audio;
  if (typeof snd === 'boolean') soundLabel = snd ? '有声' : '无声';
  else if (typeof snd === 'string' || typeof snd === 'number') soundLabel = String(snd);
  const createdAt =
    (typeof row.create_time === 'string' && row.create_time) ||
    (typeof row.created_at === 'string' && row.created_at) ||
    (typeof row.createTime === 'string' && row.createTime) ||
    undefined;
  const prompt =
    typeof row.prompt === 'string' && row.prompt.trim() ? row.prompt.trim() : undefined;
  return {
    taskId,
    taskStatus: row.task_status,
    taskStatusMsg: typeof row.task_status_msg === 'string' ? row.task_status_msg : undefined,
    videoUrl,
    coverUrl,
    modelName,
    aspectRatio,
    modeLabel,
    soundLabel,
    createdAt,
    prompt,
    raw: { ...row },
  };
}

/**
 * 拉取可灵 video-list 一页（与 clipai.ingarena.net 同一账号下列表一致，含网页端创建的任务）。
 */
export async function fetchIngarenaVideoListPage(options?: {
  page?: number;
  pageSize?: number;
}): Promise<KlingVideoListRow[]> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const base = (process.env.KLING_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  if (!isIngarenaGateway(base)) {
    throw new Error('仅 ingarena 网关支持 video-list');
  }
  const { axios: http } = getClient();
  const { data } = await http.get('/api/kling/video-list', {
    params: { page, pageSize, task_type: 6, order_by_desc: 1 },
  });
  throwIfOfficialBusinessError(data, '可灵 video-list 失败');
  const rows = extractIngarenaVideoRows(data);
  return rows.map((r) => mapIngarenaRowToPublic(r as IngarenaVideoRow & Record<string, unknown>));
}

/**
 * 查询 ingarena video-list 中某 task 的状态（供 H5 每 5 分钟轮询）。
 * 未出现在列表中视为仍排队：phase = pending。
 */
export async function queryIngarenaKlingTask(rawTaskId: string): Promise<{
  phase: KlingPollPhase;
  row?: KlingVideoListRow;
  error?: string;
}> {
  const tid = normalizeTaskIdParam(rawTaskId);
  if (!tid) {
    return { phase: 'failed', error: '无效的 task_id' };
  }
  const { axios: http } = getClient();
  const row = await findIngarenaRowByTaskId(http, tid);
  if (!row) {
    return { phase: 'pending' };
  }
  const ext = row as IngarenaVideoRow & Record<string, unknown>;
  const pub = mapIngarenaRowToPublic(ext);
  if (ingarenaTaskFailed(row.task_status)) {
    return {
      phase: 'failed',
      error: String(row.task_status_msg || '可灵任务失败'),
      row: pub,
    };
  }
  if (ingarenaTaskSucceed(row.task_status) || ingarenaRowLooksReady(row)) {
    const url = pickVideoUrl(row);
    if (url) {
      return { phase: 'succeeded', row: pub };
    }
    return { phase: 'processing', row: pub };
  }
  return { phase: 'processing', row: pub };
}

/** 本地排查：代理相关环境（不打印密钥） */
export function getKlingIngarenaDiagnosticsEnv(): {
  baseURL: string;
  klingHttpProxySet: boolean;
  httpsProxyGlobalSet: boolean;
  httpProxyGlobalSet: boolean;
} {
  const baseURL = (process.env.KLING_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  return {
    baseURL,
    klingHttpProxySet: !!(process.env.KLING_HTTP_PROXY?.trim() || process.env.KLING_HTTPS_PROXY?.trim()),
    httpsProxyGlobalSet: !!process.env.HTTPS_PROXY?.trim(),
    httpProxyGlobalSet: !!process.env.HTTP_PROXY?.trim(),
  };
}

/**
 * GET /api/kling/video-list 最小探测（用于排查 403）。
 * 使用与业务相同的 Bearer 与 klingAxiosConnectionConfig（直连 / KLING_HTTP_PROXY）。
 */
export async function probeIngarenaKlingVideoList(): Promise<{ status: number; bodyPreview: string }> {
  const baseURL = (process.env.KLING_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  if (!isIngarenaGateway(baseURL)) {
    throw new Error('仅当 KLING_API_BASE_URL 为 clipai.ingarena 时可探测');
  }
  const token = process.env.KLING_API_KEY?.trim();
  if (!token) throw new Error('缺少 KLING_API_KEY');
  const http = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    validateStatus: () => true,
    ...klingAxiosConnectionConfig(),
    transformResponse: [
      (data: unknown): unknown => {
        if (typeof data !== 'string' || data === '') return data;
        try {
          return JSON.parse(quoteJsonBigIntTaskIds(data));
        } catch {
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        }
      },
    ],
  });
  const r = await http.get('/api/kling/video-list', { params: { page: 1, pageSize: 1 } });
  const preview =
    typeof r.data === 'string' ? r.data.slice(0, 600) : JSON.stringify(r.data).slice(0, 800);
  return { status: r.status, bodyPreview: preview };
}
