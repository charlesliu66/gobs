/**
 * TASK-A: SQLite DB 初始化单例
 * 使用 createRequire 适配 ESM 模块系统
 */
import { createRequire } from 'module';
import fs from 'fs';
import { resolvePath } from '../infra/storage/resolver.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

const dbPath = resolvePath('db', 'assets.db');

// 确保目录存在
fs.mkdirSync(resolvePath('db'), { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = new Database(dbPath);

// WAL 模式（防并发写冲突）
db.pragma('journal_mode = WAL');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    project_id TEXT DEFAULT 'default',
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    duration REAL,
    fps REAL,
    orientation TEXT,
    has_audio INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    ai_category TEXT DEFAULT '未分类',
    ai_description TEXT,
    folder_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS asset_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    total INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS asset_folders (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS asset_favorites (
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, asset_id)
  );

  CREATE TABLE IF NOT EXISTS asset_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    context TEXT,
    used_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_assets_username ON assets(username);
  CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
  CREATE INDEX IF NOT EXISTS idx_import_jobs_username ON import_jobs(username);
  CREATE INDEX IF NOT EXISTS idx_asset_folders_username ON asset_folders(username);
  CREATE INDEX IF NOT EXISTS idx_asset_favorites_user ON asset_favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_asset_usage_user ON asset_usage_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_asset_usage_time ON asset_usage_log(used_at);
`);

// 迁移：为已有 assets 表加新列（SQLite 不支持 IF NOT EXISTS for columns）
try {
  db.exec(`ALTER TABLE assets ADD COLUMN ai_category TEXT DEFAULT '未分类'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN ai_description TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN folder_id TEXT`);
} catch { /* column already exists */ }

// 依赖新列的索引放在迁移之后
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(ai_category)`);
} catch { /* index or column issue */ }

export default db;
export { Database };
