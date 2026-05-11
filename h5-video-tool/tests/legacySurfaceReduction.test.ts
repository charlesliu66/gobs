import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), 'utf8');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css']);

function collectSourceFiles(dir: string, skipDir: (path: string) => boolean): string[] {
  const absDir = join(root, dir);
  const files: string[] = [];

  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const absPath = join(absDir, entry.name);
    const relPath = relative(root, absPath);
    if (entry.isDirectory()) {
      if (!skipDir(relPath)) files.push(...collectSourceFiles(relPath, skipDir));
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(relPath);
    }
  }

  return files;
}

test('legacy TikTok matrix stays direct-routeable but hidden from primary sidebar', () => {
  const layout = source('src/components/Layout.tsx');
  const app = source('src/App.tsx');

  assert.match(layout, /const LEGACY_DIRECT_ONLY_PATHS = new Set\(\[[\s\S]*'\/tiktok-matrix'/);
  assert.match(layout, /return items\.filter\(\(item\) => !LEGACY_DIRECT_ONLY_PATHS\.has\(item\.to\)\)/);
  assert.match(app, /<Route path="\/tiktok-matrix" element=\{<RiskMasterPanel \/>\} \/>/);
  assert.match(app, /<Route path="\/geelark-batch" element=\{<Navigate to="\/tiktok-matrix" replace \/>\} \/>/);
  assert.match(app, /<Route path="\/geelark" element=\{<Navigate to="\/tiktok-matrix" replace \/>\} \/>/);
});

test('platform planning routes remain direct-link-only and routeable', () => {
  const layout = source('src/components/Layout.tsx');
  const app = source('src/App.tsx');

  for (const path of ['/platform', '/platform/memory', '/platform/learning-lab', '/platform/ops']) {
    assert.match(layout, new RegExp(`'${path}'`));
    assert.match(app, new RegExp(`<Route path="${path}"`));
  }
  assert.match(layout, /const LEGACY_DIRECT_ONLY_PATHS = new Set\(\[[\s\S]*\.\.\.PLANNING_PATHS/);
});

test('core Campaign, Studio, and Distribution nav targets remain visible candidates', () => {
  const layout = source('src/components/Layout.tsx');
  const directOnlyBlock = layout.match(/const LEGACY_DIRECT_ONLY_PATHS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';

  for (const path of ['/campaign-creative', '/distribute', '/studio', '/studio/production', '/asset-library']) {
    assert.match(layout, new RegExp(`to: '${path}'`));
    assert.doesNotMatch(directOnlyBlock, new RegExp(`'${path}'`));
  }
});

test('sj-ui remains isolated from app source imports', () => {
  const files = collectSourceFiles('src', (path) => path === 'src/sj-ui' || path.startsWith('src/sj-ui/'));
  const forbiddenReference = /(from\s+['"][^'"]*(sj-ui|@sj)|import\(['"][^'"]*(sj-ui|@sj)|require\(['"][^'"]*(sj-ui|@sj)|@sj\/|src\/sj-ui|\.?\.?\/sj-ui)/;
  const offenders = files.filter((file) => forbiddenReference.test(source(file)));

  assert.deepEqual(offenders, []);
});

test('sj-ui deletion boundary remains explicit in tooling only', () => {
  assert.match(source('vite.config.ts'), /'@sj': path\.resolve\(__dirname, 'src\/sj-ui'\)/);
  assert.match(source('tsconfig.app.json'), /"src\/sj-ui"/);
  assert.match(source('eslint.config.js'), /'src\/sj-ui\/\*\*'/);
});
