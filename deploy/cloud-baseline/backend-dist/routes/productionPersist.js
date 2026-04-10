/**
 * 高级制片持久化接口
 * POST /api/production/upload-image  — 上传单张图（base64），返回服务端路径
 * GET  /api/production/image?path=   — 读取图片文件（静态托管）
 * POST /api/production/project/save  — 保存整个项目 JSON
 * GET  /api/production/project/load?id= — 读取项目 JSON
 * GET  /api/production/project/list  — 列出所有项目
 * DELETE /api/production/project?id= — 删除项目
 */
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
export const productionPersistRouter = Router();
const OUTPUT_BASE = getDefaultVideoOutputDir();
const IMG_DIR = path.join(OUTPUT_BASE, 'production', 'images');
const PROJ_DIR = path.join(OUTPUT_BASE, 'production', 'projects');
function resolveReadableImagePath(rawPath) {
    const cleaned = rawPath.trim().replace(/\\/g, '/');
    if (!cleaned)
        return null;
    const allowedDirs = [
        path.resolve(getApiDataDir(), 'output', 'production', 'images'),
        path.resolve(process.cwd(), 'output', 'production', 'images'),
        path.resolve(getDefaultVideoOutputDir(), 'production', 'images'),
    ];
    const inAllowedDir = (p) => allowedDirs.some((base) => p === base || p.startsWith(base + path.sep));
    // 1) 绝对路径（历史数据可能直接存了绝对路径）
    if (path.isAbsolute(cleaned)) {
        const abs = path.resolve(cleaned);
        return inAllowedDir(abs) ? abs : null;
    }
    // 2) 标准相对路径：output/production/images/xxx
    const normalized = path.normalize(cleaned);
    if (normalized.startsWith('output/production/images/') || normalized.startsWith('output\\production\\images\\')) {
        const abs = path.resolve(getApiDataDir(), normalized);
        return inAllowedDir(abs) ? abs : null;
    }
    // 3) 旧相对路径：production/images/xxx
    if (normalized.startsWith('production/images/') || normalized.startsWith('production\\images\\')) {
        const abs = path.resolve(getApiDataDir(), 'output', normalized);
        return inAllowedDir(abs) ? abs : null;
    }
    // 4) 仅文件名：默认落在 output/production/images
    if (!normalized.includes('/') && !normalized.includes('\\') && !normalized.includes('..')) {
        const abs = path.resolve(getApiDataDir(), 'output', 'production', 'images', normalized);
        return inAllowedDir(abs) ? abs : null;
    }
    return null;
}
async function ensureDirs() {
    await fs.mkdir(IMG_DIR, { recursive: true });
    await fs.mkdir(PROJ_DIR, { recursive: true });
}
// ── 上传图片 ──────────────────────────────────────────────────────────────────
/**
 * POST /api/production/upload-image
 * Body: { base64: string, mimeType?: string, label?: string }
 * Returns: { path: string, url: string }
 */
productionPersistRouter.post('/upload-image', async (req, res) => {
    const { base64, mimeType, label } = req.body;
    if (!base64 || typeof base64 !== 'string') {
        res.status(400).json({ error: '请提供 base64 图片数据' });
        return;
    }
    // 去掉 data URL 前缀
    const raw = base64.replace(/^data:[^;]+;base64,/, '').trim();
    if (!raw) {
        res.status(400).json({ error: 'base64 数据为空' });
        return;
    }
    const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('webp') ? 'webp' : 'jpg';
    const slug = label
        ? label.replace(/[^\w\u4e00-\u9fff-]/g, '_').slice(0, 30)
        : randomBytes(4).toString('hex');
    const filename = `${slug}_${Date.now()}.${ext}`;
    try {
        await ensureDirs();
        const absPath = path.join(IMG_DIR, filename);
        await fs.writeFile(absPath, Buffer.from(raw, 'base64'));
        const relPath = `output/production/images/${filename}`;
        const url = `/api/production/image?path=${encodeURIComponent(relPath)}`;
        res.json({ path: relPath, url, filename });
    }
    catch (err) {
        console.error('[production/upload-image]', err);
        res.status(500).json({ error: '图片保存失败' });
    }
});
// ── 读取图片 ──────────────────────────────────────────────────────────────────
/**
 * GET /api/production/image?path=output/production/images/xxx.png
 */
productionPersistRouter.get('/image', async (req, res) => {
    const rawPath = req.query.path;
    if (!rawPath) {
        res.status(400).json({ error: '请提供 path 参数' });
        return;
    }
    const absPath = resolveReadableImagePath(rawPath);
    if (!absPath) {
        res.status(403).json({ error: '无权访问该路径' });
        return;
    }
    try {
        await fs.access(absPath);
        const ext = path.extname(absPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png'
            : ext === '.webp' ? 'image/webp'
                : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(absPath);
    }
    catch {
        res.status(404).json({ error: '图片不存在' });
    }
});
/**
 * POST /api/production/project/save
 * Body: { id?: string, project: object, characterBible, synopsis, structureTemplate, maxTotalDurationSec, step, storyGenre }
 * Returns: { id: string, updatedAt: string }
 */
productionPersistRouter.post('/project/save', async (req, res) => {
    const body = req.body;
    const projectData = body.project;
    if (!projectData || typeof projectData !== 'object') {
        res.status(400).json({ error: '请提供 project 数据' });
        return;
    }
    try {
        await ensureDirs();
        // 用现有 id 或生成新 id
        const id = (typeof body.id === 'string' && body.id.trim())
            ? body.id.trim()
            : `proj_${Date.now()}_${randomBytes(4).toString('hex')}`;
        const updatedAt = new Date().toISOString();
        const title = projectData.meta?.title || '未命名项目';
        const payload = {
            ...body,
            id,
            updatedAt,
        };
        const filePath = path.join(PROJ_DIR, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        res.json({ id, updatedAt, title });
    }
    catch (err) {
        console.error('[production/project/save]', err);
        res.status(500).json({ error: '项目保存失败' });
    }
});
/**
 * GET /api/production/project/load?id=xxx
 */
productionPersistRouter.get('/project/load', async (req, res) => {
    const id = req.query.id;
    if (!id || !/^[\w-]+$/.test(id)) {
        res.status(400).json({ error: '无效的项目 id' });
        return;
    }
    const filePath = path.join(PROJ_DIR, `${id}.json`);
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        res.json(JSON.parse(raw));
    }
    catch {
        res.status(404).json({ error: '项目不存在' });
    }
});
/**
 * GET /api/production/project/list
 * Returns: { projects: ProjectMeta[] }
 */
productionPersistRouter.get('/project/list', async (_req, res) => {
    try {
        await ensureDirs();
        const files = await fs.readdir(PROJ_DIR);
        const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();
        const metas = [];
        for (const f of jsonFiles.slice(0, 50)) {
            try {
                const raw = await fs.readFile(path.join(PROJ_DIR, f), 'utf-8');
                const data = JSON.parse(raw);
                const proj = data.project;
                const meta = proj?.meta;
                metas.push({
                    id: String(data.id ?? f.replace('.json', '')),
                    title: String(meta?.title ?? '未命名项目'),
                    updatedAt: String(data.updatedAt ?? ''),
                    step: Number(data.step ?? 0),
                });
            }
            catch {
                /* skip corrupt files */
            }
        }
        res.json({ projects: metas });
    }
    catch (err) {
        console.error('[production/project/list]', err);
        res.status(500).json({ error: '读取项目列表失败' });
    }
});
/**
 * DELETE /api/production/project?id=xxx
 */
productionPersistRouter.delete('/project', async (req, res) => {
    const id = req.query.id;
    if (!id || !/^[\w-]+$/.test(id)) {
        res.status(400).json({ error: '无效的项目 id' });
        return;
    }
    const filePath = path.join(PROJ_DIR, `${id}.json`);
    try {
        await fs.unlink(filePath);
        res.json({ ok: true });
    }
    catch {
        res.status(404).json({ error: '项目不存在' });
    }
});
export default productionPersistRouter;
