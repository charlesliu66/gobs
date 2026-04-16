/**
 * storageResolver — 路径唯一入口
 *
 * 所有业务代码通过 resolvePath(type, ...segments) 获取绝对路径，
 * 不得直接拼接 process.cwd() 或 process.env.API_DATA_DIR。
 *
 * 根目录优先级：process.env.API_DATA_DIR → process.cwd()
 */
import path from 'path';
import { getApiDataDir, getDefaultVideoOutputDir } from '../../config/apiDataDir.js';

// ── 支持的路径类型 ─────────────────────────────────────────────────────────────
export type StorageType =
  // 数据库
  | 'db'                    // <root>/db — SQLite 数据库文件
  // 视频与媒体输出
  | 'video-output'          // <root>/output — 默认视频输出
  | 'production-images'     // <root>/output/production/images — 高级制片分镜图
  | 'batch-jobs'            // <root>/output/batch-jobs — 批量任务产物
  | 'multishot-jobs'        // <root>/output/multishot-jobs — 多镜头任务
  | 'exports'               // <root>/exports — 剪辑导出
  | 'remix'                 // <root>/output/remix — 混剪输出
  | 'kling-ref-cache'       // <root>/output/kling-ref-cache — 可灵参考视频缓存
  | 'character-library'     // <root>/output/character-library — 形象库
  // 上传文件
  | 'uploads'               // <root>/uploads
  | 'uploads/editor'        // <root>/uploads/editor
  | 'uploads/editor/music'  // <root>/uploads/editor/music
  | 'uploads/dreamina-mm'   // <root>/uploads/dreamina-mm — 即梦多模态暂存
  | 'uploads/assets'        // <root>/uploads/assets
  // 项目数据
  | 'projects'              // <root>/data/projects — Studio 项目 JSON
  | 'editor-projects'       // <root>/editor-projects — 剪辑项目 JSON
  | 'quickfilm/drafts'      // <root>/quickfilm/drafts
  | 'quickfilm/sessions'    // <root>/quickfilm/sessions
  // 内部状态
  | '.data'                 // <root>/.data — 内部数据（key 统计、规则等）
  | '.data/remix-rules'     // <root>/.data/remix-rules
  | 'assets-index'          // <root>/asset-index.json 所在目录（根目录）
  | 'assets-ingest'         // <root>/assets — 素材摄入
  | 'drive-cache'           // <root>/drive-cache — Google Drive 缓存

// ── 路径映射表 ─────────────────────────────────────────────────────────────────
const PATH_MAP: Record<StorageType, () => string> = {
  'db':                   () => path.join(getApiDataDir(), 'db'),
  'video-output':         () => getDefaultVideoOutputDir(),
  'production-images':    () => path.join(getDefaultVideoOutputDir(), 'production', 'images'),
  'batch-jobs':           () => path.join(getDefaultVideoOutputDir(), 'batch-jobs'),
  'multishot-jobs':       () => path.join(getDefaultVideoOutputDir(), 'multishot-jobs'),
  'exports':              () => path.join(getApiDataDir(), 'exports'),
  'remix':                () => path.join(getDefaultVideoOutputDir(), 'remix'),
  'kling-ref-cache':      () => path.join(getDefaultVideoOutputDir(), 'kling-ref-cache'),
  'character-library':    () => path.join(getDefaultVideoOutputDir(), 'character-library'),
  'uploads':              () => path.join(getApiDataDir(), 'uploads'),
  'uploads/editor':       () => path.join(getApiDataDir(), 'uploads', 'editor'),
  'uploads/editor/music': () => path.join(getApiDataDir(), 'uploads', 'editor', 'music'),
  'uploads/dreamina-mm':  () => path.join(getApiDataDir(), 'uploads', 'dreamina-mm'),
  'uploads/assets':       () => path.join(getApiDataDir(), 'uploads', 'assets'),
  'projects':             () => path.join(getApiDataDir(), 'data', 'projects'),
  'editor-projects':      () => path.join(getApiDataDir(), 'editor-projects'),
  'quickfilm/drafts':     () => path.join(getApiDataDir(), 'quickfilm', 'drafts'),
  'quickfilm/sessions':   () => path.join(getApiDataDir(), 'quickfilm', 'sessions'),
  '.data':                () => path.join(getApiDataDir(), '.data'),
  '.data/remix-rules':    () => path.join(getApiDataDir(), '.data', 'remix-rules'),
  'assets-index':         () => getApiDataDir(),
  'assets-ingest':        () => path.join(getApiDataDir(), 'assets'),
  'drive-cache':          () => path.join(getApiDataDir(), 'drive-cache'),
};

// ── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 获取指定业务类型的绝对路径
 * @param type 路径类型
 * @param segments 可选子路径片段（如用户名、文件名）
 * @returns 绝对路径字符串
 *
 * @example
 * resolvePath('db')                           // .../db
 * resolvePath('projects', 'admin')            // .../data/projects/admin
 * resolvePath('uploads/editor', 'user1', 'f') // .../uploads/editor/user1/f
 */
export function resolvePath(type: StorageType, ...segments: string[]): string {
  const base = PATH_MAP[type]();
  if (segments.length === 0) return base;
  return path.join(base, ...segments);
}

/**
 * 将绝对路径转换为相对于数据根目录的相对路径（用于存储到 JSON）
 */
export function toRelativePath(absPath: string): string {
  const root = getApiDataDir();
  return path.relative(root, absPath).replace(/\\/g, '/');
}

/**
 * 将相对路径还原为绝对路径（从 JSON 读取时用）
 */
export function toAbsolutePath(relPath: string): string {
  return path.resolve(getApiDataDir(), relPath);
}
