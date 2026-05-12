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

const DEFAULT_TEAM_ID = 'default-team';

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
    team_category TEXT,
    team_id TEXT DEFAULT '${DEFAULT_TEAM_ID}',
    visibility TEXT DEFAULT 'private',
    storage_provider TEXT DEFAULT 'local',
    storage_key TEXT,
    source_provider TEXT DEFAULT 'upload',
    source_external_id TEXT,
    source_name TEXT,
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
  db.exec(`ALTER TABLE assets ADD COLUMN team_category TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN team_id TEXT DEFAULT '${DEFAULT_TEAM_ID}'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN visibility TEXT DEFAULT 'private'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN storage_provider TEXT DEFAULT 'local'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN storage_key TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN source_provider TEXT DEFAULT 'upload'`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN source_external_id TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN source_name TEXT`);
} catch { /* column already exists */ }
try {
  db.exec(`ALTER TABLE assets ADD COLUMN folder_id TEXT`);
} catch { /* column already exists */ }

try {
  db.exec(`ALTER TABLE assets ADD COLUMN deleted_at TEXT`);
} catch { /* column already exists */ }

// 依赖新列的索引放在迁移之后
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(ai_category)`);
} catch { /* index or column issue */ }
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_team_category ON assets(team_category)`);
} catch { /* index or column issue */ }
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_team_id ON assets(team_id)`);
} catch { /* index or column issue */ }
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_visibility ON assets(visibility)`);
} catch { /* index or column issue */ }
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets(deleted_at)`);
} catch { /* index or column issue */ }

try {
  db.exec(`
    UPDATE assets
    SET team_id = '${DEFAULT_TEAM_ID}'
    WHERE team_id IS NULL OR trim(team_id) = ''
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET visibility = 'private'
    WHERE visibility IS NULL OR visibility NOT IN ('private', 'team')
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET storage_provider = 'local'
    WHERE storage_provider IS NULL OR trim(storage_provider) = ''
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET storage_key = filepath
    WHERE storage_key IS NULL OR trim(storage_key) = ''
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET source_provider = CASE
      WHEN project_id = 'character-library' THEN 'generated'
      ELSE 'upload'
    END
    WHERE source_provider IS NULL OR trim(source_provider) = ''
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET source_name = filename
    WHERE source_name IS NULL OR trim(source_name) = ''
  `);
} catch { /* column may not exist yet */ }
try {
  db.exec(`
    UPDATE assets
    SET source_provider = 'generated'
    WHERE project_id = 'character-library' AND source_provider = 'upload'
  `);
} catch { /* column may not exist yet */ }

export default db;
export { Database };
