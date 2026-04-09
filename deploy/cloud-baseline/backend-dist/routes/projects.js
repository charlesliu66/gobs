/**
 * 项目持久化路由（按用户隔离）
 * GET    /api/projects        — 列出当前用户所有项目
 * POST   /api/projects        — 创建项目，返回 project_id
 * GET    /api/projects/:id    — 读取项目完整数据
 * PUT    /api/projects/:id    — 保存/更新项目数据
 * DELETE /api/projects/:id    — 删除项目
 *
 * 存储路径: {API_DATA_DIR}/projects/{username}/{project_id}.json
 *
 * 响应格式统一：
 *   成功: { success: true, data: {...} }  或直接返回数据对象（兼容现有前端）
 *   失败: { success: false, error: "错误信息" }
 */
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
const router = Router();
function isSafeUsername(username) {
    // Only allow alphanumeric, underscore, hyphen — no path separators
    return /^[\w-]{1,64}$/.test(username);
}
function getProjectsDir(username) {
    if (!isSafeUsername(username)) {
        throw new Error('非法用户名');
    }
    const dataDir = process.env.API_DATA_DIR
        ? path.resolve(process.env.API_DATA_DIR)
        : path.resolve(process.cwd(), 'data');
    return path.join(dataDir, 'projects', username);
}
function getProjectPath(username, projectId) {
    return path.join(getProjectsDir(username), `${projectId}.json`);
}
function isSafeProjectId(id) {
    return /^[\w-]+$/.test(id) && id.length <= 64;
}
/**
 * GET /api/projects
 * 列出当前用户的所有项目
 * Response: { success: true, projects: ProjectMeta[] }
 */
router.get('/', async (req, res) => {
    const username = req.user.username;
    const dir = getProjectsDir(username);
    try {
        await fs.mkdir(dir, { recursive: true });
        const files = await fs.readdir(dir);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));
        const metas = [];
        for (const f of jsonFiles) {
            try {
                const raw = await fs.readFile(path.join(dir, f), 'utf-8');
                const data = JSON.parse(raw);
                metas.push({
                    id: String(data.id ?? f.replace('.json', '')),
                    name: String(data.name ?? '未命名项目'),
                    updatedAt: String(data.updatedAt ?? ''),
                    createdAt: String(data.createdAt ?? ''),
                });
            }
            catch {
                /* skip corrupt files */
            }
        }
        // 按更新时间倒序
        metas.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
        res.json({ success: true, projects: metas });
    }
    catch (err) {
        console.error('[projects] list error', err);
        res.status(500).json({ success: false, error: '读取项目列表失败' });
    }
});
/**
 * POST /api/projects
 * Body: { name?: string, ...data }
 * 创建项目，返回 project_id
 * Response: { success: true, id, name, createdAt, updatedAt }
 */
router.post('/', async (req, res) => {
    const username = req.user.username;
    const body = req.body;
    const id = nanoid(12);
    const now = new Date().toISOString();
    const project = {
        id,
        name: String(body.name ?? '未命名项目'),
        createdAt: now,
        updatedAt: now,
        username,
        data: body.data ?? {},
    };
    const dir = getProjectsDir(username);
    try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(getProjectPath(username, id), JSON.stringify(project, null, 2), 'utf-8');
        res.json({ success: true, id, name: project.name, createdAt: now, updatedAt: now });
    }
    catch (err) {
        console.error('[projects] create error', err);
        res.status(500).json({ success: false, error: '创建项目失败' });
    }
});
/**
 * GET /api/projects/:id
 * 读取项目完整数据（直接返回原始 JSON，前端依赖此格式）
 * Response: 原始项目 JSON 对象
 */
router.get('/:id', async (req, res) => {
    const username = req.user.username;
    const { id } = req.params;
    if (!isSafeProjectId(id)) {
        res.status(400).json({ success: false, error: '无效的项目 id' });
        return;
    }
    try {
        const raw = await fs.readFile(getProjectPath(username, id), 'utf-8');
        res.json(JSON.parse(raw));
    }
    catch {
        res.status(404).json({ success: false, error: '项目不存在' });
    }
});
/**
 * PUT /api/projects/:id
 * 更新项目数据
 * Response: { success: true, id, updatedAt, name }
 */
router.put('/:id', async (req, res) => {
    const username = req.user.username;
    const { id } = req.params;
    const body = req.body;
    if (!isSafeProjectId(id)) {
        res.status(400).json({ success: false, error: '无效的项目 id' });
        return;
    }
    const filePath = getProjectPath(username, id);
    try {
        // 读取现有数据以保留 createdAt
        let existing = {};
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            existing = JSON.parse(raw);
        }
        catch {
            /* file might not exist yet */
        }
        const now = new Date().toISOString();
        const updated = {
            ...existing,
            ...body,
            id,
            username,
            updatedAt: now,
            createdAt: existing.createdAt ?? now,
        };
        await fs.mkdir(getProjectsDir(username), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
        const updatedName = String(body.name ?? existing.name ?? '未命名项目');
        res.json({ success: true, id, updatedAt: now, name: updatedName });
    }
    catch (err) {
        console.error('[projects] update error', err);
        res.status(500).json({ success: false, error: '保存项目失败' });
    }
});
/**
 * DELETE /api/projects/:id
 * Response: { success: true, ok: true }
 */
router.delete('/:id', async (req, res) => {
    const username = req.user.username;
    const { id } = req.params;
    if (!isSafeProjectId(id)) {
        res.status(400).json({ success: false, error: '无效的项目 id' });
        return;
    }
    try {
        await fs.unlink(getProjectPath(username, id));
        res.json({ success: true, ok: true });
    }
    catch {
        res.status(404).json({ success: false, error: '项目不存在' });
    }
});
export default router;
