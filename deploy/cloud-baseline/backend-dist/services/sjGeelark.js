/**
 * SJ GeeLark API：TikTok 矩阵（批量评论、云手机、任务日志）
 * 与 SJ 项目一致：默认国际区 openapi.geelark.com + Bearer Token
 * 若需国内区可配置 GEELARK_SJ_BASE_URL=https://openapi.geelark.cn/open/v1
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 与 SJ 一致：默认国际区 geelark.com（避免 Bearer token signature verification failure）；需国内区时配置 GEELARK_SJ_BASE_URL */
const BASE = (process.env.GEELARK_SJ_BASE_URL || process.env.GEELARK_BASE_URL || 'https://openapi.geelark.com/open/v1').replace(/\/$/, '');
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
/** Bearer 认证用：GEELARK_BEARER_TOKEN 或 GEELARK_API_KEY */
function getApiKey() {
    return process.env.GEELARK_BEARER_TOKEN || process.env.GEELARK_API_KEY || '';
}
/** Key 验证用：必须用 GEELARK_API_KEY（与 appId 配套），不能用 Bearer Token */
function getKeyAuthApiKey() {
    return process.env.GEELARK_API_KEY || '';
}
/** 加载配置并检查是否有有效认证（供 geelark-status 等路由使用） */
export function ensureConfigLoaded() {
    loadGeelarkConfig();
    const appId = getAppId();
    const keyAuthApiKey = getKeyAuthApiKey();
    const bearerToken = getApiKey();
    return !!(appId && keyAuthApiKey.length >= 10) || (bearerToken.length >= 10);
}
function getAppId() {
    return process.env.GEELARK_APP_ID || '';
}
function traceId() {
    return crypto.randomUUID?.()?.replace(/-/g, '').toUpperCase() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16).toUpperCase();
        }).replace(/-/g, '');
}
function keySign(traceIdVal, ts, nonce, appId, apiKey) {
    const raw = `${appId}${traceIdVal}${ts}${nonce}${apiKey}`;
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').toUpperCase();
}
function getHeaders() {
    loadGeelarkConfig();
    const appId = getAppId();
    const keyAuthApiKey = getKeyAuthApiKey();
    const bearerToken = getApiKey();
    // Key 验证：需 appId + GEELARK_API_KEY（不能用 Bearer Token 做签名，否则会 signature verification failure）
    const useKeyAuth = !!(appId && keyAuthApiKey.length >= 10);
    const tid = traceId();
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        traceId: tid,
    };
    if (useKeyAuth) {
        const ts = String(Date.now());
        const nonce = tid.slice(0, 6);
        headers.appId = appId;
        headers.ts = ts;
        headers.nonce = nonce;
        headers.sign = keySign(tid, ts, nonce, appId, keyAuthApiKey);
    }
    else if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
    }
    return headers;
}
async function post(path, body) {
    const url = `${BASE}/${path.replace(/^\//, '')}`;
    const res = await axios.post(url, body, {
        headers: getHeaders(),
        timeout: 30000,
        validateStatus: () => true,
    });
    const data = res.data;
    if (data.code !== undefined && data.code !== 0) {
        throw new Error(data.msg || 'GeeLark 请求失败');
    }
    return (data.data ?? data);
}
export async function getCloudPhones(params) {
    const data = await post('phone/list', { page: params?.page ?? 1, pageSize: params?.pageSize ?? 100 });
    return data?.items ?? [];
}
export async function phoneStart(ids) {
    const data = await post('phone/start', { ids });
    return {
        totalAmount: data?.totalAmount ?? 0,
        successAmount: data?.successAmount ?? 0,
        failAmount: data?.failAmount ?? 0,
    };
}
export async function phoneStop(ids) {
    const data = await post('phone/stop', { ids });
    return {
        totalAmount: data?.totalAmount ?? 0,
        successAmount: data?.successAmount ?? 0,
        failAmount: data?.failAmount ?? 0,
    };
}
export async function phoneDelete(ids) {
    const data = await post('phone/delete', { ids });
    return {
        totalAmount: data?.totalAmount ?? 0,
        successAmount: data?.successAmount ?? 0,
        failAmount: data?.failAmount ?? 0,
    };
}
export async function phoneDetailUpdate(params) {
    await post('phone/detail/update', params);
}
export async function proxyList(params) {
    const data = await post('proxy/list', params);
    return {
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        pageSize: data?.pageSize ?? 10,
        list: data?.list ?? [],
    };
}
export async function proxyAdd(list) {
    const data = await post('proxy/add', { list });
    return { successAmount: data?.successAmount ?? 0, failAmount: data?.failAmount ?? 0 };
}
export async function proxyUpdate(list) {
    await post('proxy/update', { list });
}
export async function proxyDelete(ids) {
    await post('proxy/delete', { ids });
}
export async function taskHistoryRecords(params) {
    const data = await post('task/historyRecords', params ?? { size: 100 });
    return { total: data?.total ?? 0, items: data?.items ?? [] };
}
export async function taskQuery(ids) {
    const data = await post('task/query', { ids });
    return { total: data?.total ?? 0, items: data?.items ?? [] };
}
export async function taskDetail(id, searchAfter) {
    const data = await post('task/detail', { id, ...(searchAfter?.length ? { searchAfter } : {}) });
    return (data ?? {});
}
export async function taskCancel(ids) {
    const data = await post('task/cancel', { ids });
    return { successAmount: data?.successAmount ?? 0, failAmount: data?.failAmount ?? 0 };
}
export async function scheduleTiktokComment(params) {
    const apiPath = params.useAsia ? 'rpa/task/tiktokRandomCommentAsia' : 'rpa/task/tiktokRandomComment';
    const body = {
        id: params.phoneId,
        scheduleAt: params.scheduleAt,
        useAi: 2,
        comment: (params.comment || '').trim().slice(0, 500),
        links: params.tiktokUrl ? [String(params.tiktokUrl).trim()] : [],
        commentProbability: 100,
        name: 'TikTok评论',
    };
    if (!body.comment)
        throw new Error('评论内容不能为空');
    if (body.links.length === 0)
        throw new Error('请填写视频链接');
    const data = await post(apiPath, body);
    return { taskId: data?.taskId ?? '' };
}
