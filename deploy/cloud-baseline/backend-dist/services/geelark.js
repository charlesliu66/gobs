/**
 * GeeLark API 服务：设备列表、视频上传、发布、任务详情
 * 参考：open.geelark.com/api, geelark-publish skill
 */
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://openapi.geelark.cn/open/v1';
const PHONE_LIST_URL = `${BASE}/phone/list`;
const UPLOAD_GET_URL = `${BASE}/upload/getUrl`;
const TASK_ADD_URL = `${BASE}/task/add`;
const TASK_DETAIL_URL = `${BASE}/task/detail`;
const TASK_HISTORY_URL = `${BASE}/task/historyRecords`;
function getApiKey() {
    return process.env.GEELARK_API_KEY || '';
}
function getAppId() {
    return process.env.GEELARK_APP_ID || '';
}
function uuid() {
    return crypto.randomUUID?.()?.replace(/-/g, '').toUpperCase() ??
        'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16).toUpperCase();
        });
}
function keyAuthSign(appId, traceId, ts, nonce, apiKey) {
    const str = `${appId}${traceId}${ts}${nonce}${apiKey}`;
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex').toUpperCase();
}
/**
 * 访问 GeeLark API、拉取境外视频 CDN 时，直连常出现 ETIMEDOUT。
 * 优先读 GEELARK_HTTP_PROXY，其次 HTTPS_PROXY / HTTP_PROXY（与 Clash 等本地代理一致）。
 */
function axiosProxyConfig(timeoutMs) {
    const proxyUrl = process.env.GEELARK_HTTP_PROXY?.trim() || process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim();
    if (!proxyUrl) {
        return { timeout: timeoutMs, proxy: false };
    }
    try {
        const agent = new HttpsProxyAgent(proxyUrl);
        return { timeout: timeoutMs, httpsAgent: agent, httpAgent: agent, proxy: false };
    }
    catch {
        return { timeout: timeoutMs, proxy: false };
    }
}
function enhanceNetworkError(err, context) {
    const e = err;
    const code = e?.code;
    const target = e?.address && e?.port != null ? ` ${e.address}:${e.port}` : '';
    if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
        return new Error(`${context}：${code}${target}。常见于跨境网络/防火墙拦截。请尝试：1) 在 .env 设置 GEELARK_HTTP_PROXY 或 HTTPS_PROXY（例 http://127.0.0.1:7890）；2) 检查公司网络是否限制 443；3) 将成片保存到服务器 output/ 后改用本地路径发布（避免拉取外网视频直链）。`);
    }
    return err instanceof Error ? err : new Error(String(err));
}
async function geelarkPost(url, body) {
    loadGeelarkConfig();
    const traceId = uuid();
    const apiKey = getApiKey();
    const appId = getAppId();
    const useKeyAuth = !!appId && !!apiKey;
    const headers = {
        'Content-Type': 'application/json',
        traceId,
    };
    if (useKeyAuth) {
        const ts = String(Date.now());
        const nonce = traceId.slice(0, 6);
        headers.appId = appId;
        headers.ts = ts;
        headers.nonce = nonce;
        headers.sign = keyAuthSign(appId, traceId, ts, nonce, apiKey);
    }
    else {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    let res;
    try {
        res = await axios.post(url, body, {
            headers,
            validateStatus: () => true,
            ...axiosProxyConfig(60000),
        });
    }
    catch (err) {
        throw enhanceNetworkError(err, 'GeeLark API 请求失败');
    }
    const json = res.data;
    if (json.code !== undefined && json.code !== 0) {
        throw new Error(`GeeLark [${json.code}]: ${json.msg || '未知错误'}`);
    }
    if (res.status >= 400) {
        throw new Error(`GeeLark HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    return { data: json.data };
}
function loadGeelarkConfig() {
    const paths = [
        process.env.GEELARK_CONFIG,
        path.join(process.cwd(), 'config', 'geelark.json'),
        path.join(process.cwd(), '..', 'config', 'geelark.json'),
        path.join(__dirname, '..', '..', '..', 'config', 'geelark.json'),
    ].filter(Boolean);
    for (const p of paths) {
        if (p && fs.existsSync(p)) {
            try {
                const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
                if (cfg.apiKey)
                    process.env.GEELARK_API_KEY = cfg.apiKey;
                if (cfg.appId)
                    process.env.GEELARK_APP_ID = cfg.appId;
                return cfg;
            }
            catch { }
        }
    }
    return null;
}
/** 加载账号映射表：优先 geelark-accounts.json，其次 geelark.json.accounts */
function loadAccountsConfig() {
    const accountPaths = [
        process.env.GEELARK_ACCOUNTS_CONFIG,
        path.join(process.cwd(), 'config', 'geelark-accounts.json'),
        path.join(process.cwd(), '..', 'config', 'geelark-accounts.json'),
        path.join(__dirname, '..', '..', '..', 'config', 'geelark-accounts.json'),
    ].filter(Boolean);
    for (const p of accountPaths) {
        if (p && fs.existsSync(p)) {
            try {
                const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
                const list = data?.accounts ?? data;
                if (Array.isArray(list) && list.length > 0) {
                    return list.filter((a) => a.id && a.username && a.envId);
                }
            }
            catch { }
        }
    }
    const cfg = loadGeelarkConfig();
    const list = cfg?.accounts ?? [];
    if (Array.isArray(list)) {
        return list.filter((a) => a.id && a.username && a.envId);
    }
    return [];
}
/** 获取可发布的 TT 账号列表（从账号映射表读取，仅返回展示字段） */
export function listAccounts() {
    loadGeelarkConfig();
    const accounts = loadAccountsConfig();
    return accounts
        .filter((a) => a.canPost !== false)
        .map((a) => ({
        id: a.id,
        username: a.username,
        region: a.region,
        platform: a.platform,
        remark: a.remark,
        canPost: a.canPost !== false,
    }));
}
/** 根据账号 ID 解析为 envId 列表 */
function resolveAccountIdsToEnvIds(accountIds) {
    const accounts = loadAccountsConfig();
    const envIds = [];
    for (const aid of accountIds) {
        const acc = accounts.find((a) => a.id === aid);
        if (acc?.envId)
            envIds.push(acc.envId);
    }
    return [...new Set(envIds)];
}
/** 获取设备列表：优先 API，失败则用 config */
export async function listDevices() {
    const apiKey = getApiKey();
    if (!apiKey) {
        const cfg = loadGeelarkConfig();
        if (!cfg?.apiKey && !process.env.GEELARK_API_KEY) {
            throw new Error('未配置 GEELARK_API_KEY');
        }
    }
    try {
        const { data } = await geelarkPost(PHONE_LIST_URL, { pageSize: 100 });
        const items = data?.items || [];
        return items.map((d) => ({
            id: d.id,
            name: d.serialName || d.remark || d.id,
            status: d.status,
            serialName: d.serialName,
        }));
    }
    catch {
        const cfg = loadGeelarkConfig();
        const devices = cfg?.devices || [];
        return devices.map((d) => ({
            id: typeof d === 'string' ? d : d.id,
            name: typeof d === 'object' && d.name ? d.name : (typeof d === 'object' ? d.id : d),
            region: typeof d === 'object' ? d.region : undefined,
        }));
    }
}
/** 使用 Node 原生 http(s) 发送最简 PUT，仅 Content-Length，避免 OSS 403 */
function putBinaryToUrl(uploadUrl, buffer) {
    const u = new URL(uploadUrl);
    const isHttps = u.protocol === 'https:';
    const mod = isHttps ? https : http;
    const proxyUrl = process.env.GEELARK_UPLOAD_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    return new Promise((resolve, reject) => {
        const options = {
            hostname: u.hostname,
            port: u.port || (isHttps ? 443 : 80),
            path: u.pathname + u.search,
            method: 'PUT',
            headers: { 'Content-Length': buffer.length },
        };
        if (agent)
            options.agent = agent;
        const req = mod.request(options, (res) => {
            res.resume();
            resolve(res.statusCode || 0);
        });
        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('上传超时'));
        });
        req.write(buffer);
        req.end();
    });
}
/** 本机拉取视频时使用的 API 根（默认同进程 Express，供 /api/video/kling/video-proxy 等同源路径） */
function resolveSelfApiBase() {
    const port = process.env.PORT || '3001';
    const raw = process.env.API_SELF_BASE_URL?.trim() || `http://127.0.0.1:${port}`;
    return raw.replace(/\/+$/, '');
}
/** 将视频（URL、base64 data URL、本机 API 路径或本地文件路径）上传到 GeeLark，返回 resourceUrl */
async function uploadVideoToGeelark(videoInput) {
    let buffer;
    if (videoInput.startsWith('data:video/')) {
        const base64 = videoInput.replace(/^data:video\/[^;]+;base64,/, '');
        buffer = Buffer.from(base64, 'base64');
    }
    else if (videoInput.startsWith('http://') || videoInput.startsWith('https://')) {
        let res;
        try {
            res = await axios.get(videoInput, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                ...axiosProxyConfig(180000),
            });
        }
        catch (err) {
            throw enhanceNetworkError(err, '下载视频直链失败（若为可灵 CDN，跨境网络易超时）');
        }
        buffer = Buffer.from(res.data);
    }
    else if (videoInput.startsWith('/api/')) {
        /** 前端可灵代理等为相对路径，Node 内需回环请求本服务 */
        const absoluteUrl = `${resolveSelfApiBase()}${videoInput}`;
        const loopback = /127\.0\.0\.1|localhost/i.test(absoluteUrl);
        let res;
        try {
            res = await axios.get(absoluteUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                ...(loopback ? { timeout: 300000, proxy: false } : axiosProxyConfig(300000)),
            });
        }
        catch (err) {
            throw enhanceNetworkError(err, '本机拉取 /api/video 代理失败（请确认 API 已启动、API_SELF_BASE_URL 正确）');
        }
        buffer = Buffer.from(res.data);
    }
    else {
        const fp = path.isAbsolute(videoInput) ? videoInput : path.join(process.cwd(), videoInput);
        if (!fs.existsSync(fp)) {
            throw new Error(`无效的视频输入：需为 data URL、HTTP URL、以 /api/ 开头的本服务路径或本地文件路径。路径不存在: ${videoInput}`);
        }
        buffer = fs.readFileSync(fp);
    }
    const { data } = await geelarkPost(UPLOAD_GET_URL, {
        fileType: 'mp4',
    });
    const uploadUrl = data?.uploadUrl;
    const resourceUrl = data?.resourceUrl;
    if (!uploadUrl || !resourceUrl) {
        throw new Error('GeeLark 获取上传地址失败');
    }
    const status = await putBinaryToUrl(uploadUrl, buffer);
    if (status >= 400) {
        throw new Error(`视频上传失败 HTTP ${status}。若为 403：1) 尝试设置环境变量 GEELARK_UPLOAD_PROXY 走代理；2) 或将视频保存到服务器 output/ 后传 videoPath 代替 videoUrl。`);
    }
    return resourceUrl;
}
/** 发布视频到指定账号/设备（TikTok） */
export async function publishVideo(options) {
    const { videoUrl, accountIds, envIds, caption = '', hashtags = '', markAI = false, needShareLink = false } = options;
    const targetEnvIds = accountIds?.length
        ? resolveAccountIdsToEnvIds(accountIds)
        : (envIds ?? []);
    if (!targetEnvIds.length) {
        throw new Error('请选择至少一个目标账号');
    }
    const resourceUrl = await uploadVideoToGeelark(videoUrl);
    const planName = `task${Date.now()}`;
    const scheduleAt = Math.floor(Date.now() / 1000);
    const list = targetEnvIds.map((envId) => ({
        scheduleAt,
        envId,
        video: resourceUrl,
        videoDesc: [caption, hashtags].filter(Boolean).join(' ').trim() || undefined,
        markAI,
        needShareLink,
    }));
    const { data } = await geelarkPost(TASK_ADD_URL, {
        planName,
        taskType: 1,
        list,
    });
    return {
        taskIds: data?.taskIds || [],
        planName,
    };
}
const STATUS_MAP = {
    1: '等待执行',
    2: '执行中',
    3: '已完成',
    4: '任务失败',
    7: '已取消',
};
/** 获取任务详情（运行报告） */
export async function getTaskDetail(taskId) {
    const { data } = await geelarkPost(TASK_DETAIL_URL, { id: taskId });
    if (!data) {
        throw new Error('任务不存在');
    }
    return {
        ...data,
        statusText: STATUS_MAP[data.status ?? 0] ?? `状态${data.status}`,
    };
}
/** 获取最近任务列表 */
export async function getTaskHistory(size = 20) {
    const { data } = await geelarkPost(TASK_HISTORY_URL, { size });
    return data?.items || [];
}
