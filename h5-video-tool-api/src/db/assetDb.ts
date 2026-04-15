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

  CREATE INDEX IF NOT EXISTS idx_assets_username ON assets(username);
  CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
  CREATE INDEX IF NOT EXISTS idx_import_jobs_username ON import_jobs(username);
`);

export default db;
export { Database };
