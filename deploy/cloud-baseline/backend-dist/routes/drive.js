import { Router } from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
export const driveRouter = Router();
/** 加载 config/assets.json 中的 folderSemantics */
function loadFolderSemantics() {
    const candidates = [
        path.join(process.cwd(), 'config', 'assets.json'),
        path.join(process.cwd(), '..', 'config', 'assets.json'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            try {
                const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
                return cfg.folderSemantics || {};
            }
            catch {
                /* ignore */
            }
        }
    }
    return {};
}
/**
 * POST /api/drive/search
 * Body: { keywords: string[], folderId?: string }
 * Header: Authorization: Bearer <access_token>
 *
 * 代理调用 Drive API files.list，按关键词搜索图片/视频
 */
/**
 * POST /api/drive/verify-folder
 * Body: { folderId: string }
 * Header: Authorization: Bearer <access_token>
 *
 * 验证当前账号是否有该文件夹的访问权限
 */
driveRouter.post('/verify-folder', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: '请先连接 Google Drive' });
        return;
    }
    const token = authHeader.slice(7);
    const { folderId } = req.body;
    if (!folderId || typeof folderId !== 'string') {
        res.status(400).json({ error: '请提供有效的 folderId' });
        return;
    }
    console.log('[drive/verify-folder] 请求已到达, folderId:', folderId);
    try {
        const { data } = await axios.get('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId), {
            params: {
                fields: 'id,name,mimeType',
                supportsAllDrives: true, // 支持共享雲端硬碟，需为 boolean
            },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000, // 15 秒超时，避免 Drive API 无响应时无限等待
        });
        if (data.mimeType !== 'application/vnd.google-apps.folder') {
            res.status(400).json({ error: '该链接不是文件夹，请提供文件夹链接' });
            return;
        }
        console.log('[drive/verify-folder] 成功, folderName:', data.name);
        res.json({ ok: true, folderId: data.id, folderName: data.name });
    }
    catch (err) {
        // 详细记录 Google API 返回，便于排查
        if (axios.isAxiosError(err)) {
            const status = err.response?.status;
            const body = err.response?.data;
            const googleMsg = body?.error?.message;
            console.error('[drive/verify-folder] 失败 status=%s code=%s msg=%s body=%s', status, err.code, googleMsg || err.message, JSON.stringify(body));
        }
        else {
            console.error('[drive/verify-folder]', err);
        }
        const status = axios.isAxiosError(err) ? err.response?.status ?? 500 : 500;
        const isTimeout = axios.isAxiosError(err) && err.code === 'ECONNABORTED';
        const data = axios.isAxiosError(err) ? err.response?.data : undefined;
        const googleMsg = data?.error?.message;
        const msg = isTimeout
            ? 'Google Drive API 响应超时，若在中国大陆请确认网络可访问 Google 或使用代理'
            : googleMsg || (axios.isAxiosError(err) ? '无法访问该文件夹' : err instanceof Error ? err.message : '验证失败');
        const errorMsg = isTimeout ? msg :
            status === 404 ? '文件夹不存在或你无访问权限' :
                status === 403 ? (msg || '你暂无该文件夹的访问权限。若为共享盘，请确认已开通 Drive API 且应用有相应权限') :
                    msg;
        res.status(isTimeout ? 504 : status).json({ error: errorMsg });
    }
});
/** 递归获取文件夹下所有子文件夹 ID（含自身），最多 3 层深度 */
async function collectFolderIds(token, rootId, maxDepth = 3) {
    const ids = new Set([rootId]);
    let current = [rootId];
    let depth = 0;
    const headers = { Authorization: `Bearer ${token}` };
    while (depth < maxDepth && current.length > 0) {
        const next = [];
        for (const folderId of current) {
            try {
                const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
                    params: {
                        q: `'${folderId.replace(/'/g, "\\'")}' in parents and mimeType='application/vnd.google-apps.folder'`,
                        pageSize: 50,
                        fields: 'files(id,mimeType)',
                        supportsAllDrives: true,
                        includeItemsFromAllDrives: true,
                    },
                    headers,
                    timeout: 8000,
                });
                for (const f of data.files || []) {
                    if (f.id && !ids.has(f.id)) {
                        ids.add(f.id);
                        next.push(f.id);
                    }
                }
            }
            catch {
                /* 忽略单个文件夹的失败 */
            }
        }
        current = next;
        depth++;
    }
    return Array.from(ids);
}
/** 递归获取子文件夹 ID + 名称（含 root），用于按文件夹语义过滤 */
async function collectFoldersWithNames(token, rootId, maxDepth = 3) {
    const result = [];
    const headers = { Authorization: `Bearer ${token}` };
    const fetchFolderMeta = async (id) => {
        try {
            const { data } = await axios.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`, {
                params: { fields: 'id,name' },
                headers,
                timeout: 5000,
            });
            return data?.id ? { id: data.id, name: data.name || '' } : null;
        }
        catch {
            return null;
        }
    };
    const rootMeta = await fetchFolderMeta(rootId);
    if (rootMeta)
        result.push(rootMeta);
    let current = [rootId];
    let depth = 0;
    while (depth < maxDepth && current.length > 0) {
        const next = [];
        for (const folderId of current) {
            try {
                const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
                    params: {
                        q: `'${folderId.replace(/'/g, "\\'")}' in parents and mimeType='application/vnd.google-apps.folder'`,
                        pageSize: 50,
                        fields: 'files(id,name)',
                        supportsAllDrives: true,
                        includeItemsFromAllDrives: true,
                    },
                    headers,
                    timeout: 8000,
                });
                for (const f of data.files || []) {
                    if (f.id && !result.some((r) => r.id === f.id)) {
                        result.push({ id: f.id, name: f.name || '' });
                        next.push(f.id);
                    }
                }
            }
            catch {
                /* ignore */
            }
        }
        current = next;
        depth++;
    }
    return result;
}
/** 根据 folderHints 过滤出匹配的文件夹 ID（文件夹名包含 folderSemantics 中的 pattern） */
function filterFolderIdsByHints(folders, folderHints) {
    const semantics = loadFolderSemantics();
    const patternsToMatch = new Set();
    for (const hint of folderHints) {
        const s = semantics[hint];
        if (s?.folderPatterns) {
            for (const p of s.folderPatterns) {
                patternsToMatch.add(p.toLowerCase());
            }
        }
    }
    if (patternsToMatch.size === 0)
        return folders.map((f) => f.id);
    return folders
        .filter((f) => {
        const nameLower = f.name.toLowerCase();
        return [...patternsToMatch].some((p) => nameLower.includes(p));
    })
        .map((f) => f.id);
}
driveRouter.post('/search', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: '缺少或无效的 Authorization 头' });
        return;
    }
    const token = authHeader.slice(7);
    const { keywords = [], folderId, folderHints } = req.body;
    const mimePart = "(mimeType contains 'image/' or mimeType contains 'video/')";
    const nameParts = keywords.length > 0
        ? keywords
            .filter((k) => k && k.trim())
            .map((k) => `name contains '${String(k).replace(/'/g, "\\'")}'`)
            .join(' or ')
        : '';
    try {
        let q;
        if (folderId) {
            let folderIds;
            if (folderHints && folderHints.length > 0) {
                const foldersWithNames = await collectFoldersWithNames(token, folderId);
                const filtered = filterFolderIdsByHints(foldersWithNames, folderHints);
                folderIds = filtered.length > 0 ? filtered : foldersWithNames.map((f) => f.id);
            }
            else {
                folderIds = await collectFolderIds(token, folderId);
            }
            const parentPart = folderIds.length === 1
                ? `'${folderIds[0]}' in parents`
                : '(' + folderIds.map((id) => `'${id.replace(/'/g, "\\'")}' in parents`).join(' or ') + ')';
            q = [mimePart, nameParts ? `(${nameParts})` : '', parentPart].filter(Boolean).join(' and ');
        }
        else {
            q = [mimePart, nameParts ? `(${nameParts})` : ''].filter(Boolean).join(' and ');
        }
        const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
            params: {
                q,
                pageSize: 50,
                fields: 'files(id,name,mimeType,thumbnailLink,webContentLink)',
                supportsAllDrives: 'true',
                includeItemsFromAllDrives: 'true',
            },
            headers: { Authorization: `Bearer ${token}` },
        });
        res.json({ files: data.files || [] });
    }
    catch (err) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message : 'Drive API 调用失败';
        const status = axios.isAxiosError(err) ? (err.response?.status ?? 500) : 500;
        res.status(status).json({ error: msg || 'Drive 搜索失败' });
    }
});
/**
 * POST /api/drive/list
 * Body: { folderId: string }
 * Header: Authorization: Bearer <access_token>
 *
 * 列出文件夹内的直接子项：子文件夹 + 图片/视频文件（类似 Drive 浏览视图）
 */
driveRouter.post('/list', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: '请先连接 Google Drive' });
        return;
    }
    const token = authHeader.slice(7);
    const { folderId } = req.body;
    if (!folderId || typeof folderId !== 'string') {
        res.status(400).json({ error: '请提供有效的 folderId' });
        return;
    }
    try {
        const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
            params: {
                q: `'${folderId.replace(/'/g, "\\'")}' in parents`,
                pageSize: 100,
                fields: 'files(id,name,mimeType,thumbnailLink,webContentLink)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                orderBy: 'folder,name',
            },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
        });
        const files = data.files || [];
        const folders = files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
        const mediaFiles = files.filter((f) => f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/'));
        res.json({ folders, files: mediaFiles });
    }
    catch (err) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error?.message : 'Drive 列出失败';
        const status = axios.isAxiosError(err) ? (err.response?.status ?? 500) : 500;
        res.status(status).json({ error: msg || '列出文件夹内容失败' });
    }
});
/**
 * GET /api/drive/thumbnail?fileId=xxx&mimeType=image%2Fpng（mimeType 可选，用于图片时优先走 alt=media）
 * Header: Authorization: Bearer <access_token>
 *
 * 代理获取缩略图，多种方式兜底：
 * 1. 图片：若前端传入 mimeType 以 image/ 开头，直接尝试 alt=media（免去 meta 请求，最可靠）
 * 2. 否则先获取 meta，再按 thumbnailLink、drive.google.com/thumbnail、alt=media 尝试
 */
driveRouter.get('/thumbnail', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: '请先连接 Google Drive' });
        return;
    }
    const token = authHeader.slice(7);
    const fileId = req.query.fileId;
    const mimeTypeParam = req.query.mimeType || '';
    if (!fileId || typeof fileId !== 'string') {
        res.status(400).json({ error: '请提供有效的 fileId' });
        return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const opts = { responseType: 'arraybuffer', timeout: 10000 };
    const sendBuffer = (buf, contentType) => {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.send(buf);
    };
    const tryAltMedia = async (contentTypeFallback) => {
        try {
            const { data, status, headers: resHeaders } = await axios.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
                params: { alt: 'media', supportsAllDrives: true },
                ...opts,
                headers,
                validateStatus: (s) => s < 500,
            });
            if (status >= 400)
                return false;
            const ct = resHeaders['content-type']?.split(';')[0]?.trim() || contentTypeFallback;
            sendBuffer(Buffer.from(data), ct);
            return true;
        }
        catch {
            return false;
        }
    };
    try {
        // 1. 图片：若已知 mimeType 为 image/*，直接 alt=media，省去 meta 请求且最可靠
        if (mimeTypeParam.startsWith('image/')) {
            if (await tryAltMedia(mimeTypeParam))
                return;
        }
        // 2. 获取文件元信息（未传 mimeType 或 alt=media 失败时）
        let meta = null;
        try {
            const { data } = await axios.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
                params: { fields: 'thumbnailLink,mimeType', supportsAllDrives: true },
                headers,
                timeout: 8000,
            });
            meta = data;
        }
        catch (e) {
            const st = axios.isAxiosError(e) ? e.response?.status : '-';
            console.warn('[drive/thumbnail] meta 失败 fileId=%s status=%s', fileId, st);
        }
        // 3. 图片：再次尝试 alt=media（可能上次未传 mimeType）
        if (meta?.mimeType?.startsWith('image/')) {
            if (await tryAltMedia(meta.mimeType || 'image/png'))
                return;
        }
        // 4. thumbnailLink + Bearer
        if (meta?.thumbnailLink) {
            try {
                const { data, status } = await axios.get(meta.thumbnailLink, {
                    ...opts,
                    headers,
                    validateStatus: (s) => s < 500,
                });
                if (status < 400) {
                    sendBuffer(Buffer.from(data), meta.mimeType?.startsWith('image/') ? meta.mimeType : 'image/png');
                    return;
                }
            }
            catch {
                /* 失败 */
            }
        }
        // 5. drive.google.com/thumbnail + access_token
        const thumbUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400&access_token=${encodeURIComponent(token)}`;
        try {
            const { data, status } = await axios.get(thumbUrl, {
                ...opts,
                validateStatus: (s) => s < 500,
            });
            if (status < 400) {
                sendBuffer(Buffer.from(data), meta?.mimeType?.startsWith('image/') ? meta.mimeType : 'image/png');
                return;
            }
        }
        catch {
            /* 失败 */
        }
        // 6. 最后再试一次 alt=media（未带 mimeType 的请求）
        if (await tryAltMedia('image/png'))
            return;
        res.status(404).json({ error: '缩略图不可用' });
    }
    catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status ?? 500 : 500;
        console.error('[drive/thumbnail] fileId=%s error=%s', fileId, axios.isAxiosError(err) ? err.message : err);
        res.status(status).json({ error: '缩略图获取失败' });
    }
});
export default driveRouter;
