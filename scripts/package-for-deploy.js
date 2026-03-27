/**
 * QAS deploy package - creates ZIP with QAS, video-pipeline, skills, scripts, materials
 * Run: node scripts/package-for-deploy.js
 * Output: QAS-deploy-YYYYMMDD-HHmm.zip
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QAS_ROOT = path.resolve(__dirname, '..');
const CURSOR_TRY = path.resolve(QAS_ROOT, '..');
const USER_HOME = process.env.USERPROFILE || process.env.HOME;
const OUT_DIR = path.join(QAS_ROOT, 'QAS-package');
const CURSOR_SKILLS = path.join(USER_HOME, '.cursor', 'skills');
const QAS_SKILLS = path.join(QAS_ROOT, '.cursor', 'skills');
const VIDEO_PIPELINE = path.join(CURSOR_TRY, 'video-pipeline');

const SKILL_NAMES = [
  'video-create-distribute', 'video-pipeline', 'geelark-publish',
  'video-director', 'storyboard-studio', 'game-director-pro', 'viral-agent'
];

function copyDir(src, dest, exclude = []) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (exclude.includes(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d, exclude);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function copyRecursive(src, dest, exclude = []) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    const destDir = path.join(dest, base);
    fs.mkdirSync(destDir, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (exclude.includes(name)) continue;
      copyRecursive(path.join(src, name), destDir, exclude);
    }
  } else {
    fs.copyFileSync(src, path.join(dest, path.basename(src)));
  }
}

function removeRecursive(dir, predicate) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      removeRecursive(p, predicate);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else if (predicate(name, p)) {
      fs.unlinkSync(p);
    }
  }
}

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) getAllFiles(p, list);
    else list.push(p);
  }
  return list;
}

console.log('=== QAS Deploy Package ===\n');

// Clean
if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Copy QAS
console.log('[1/5] Copying QAS...');
const qasDest = path.join(OUT_DIR, 'QAS');
const excludeTop = new Set(['node_modules', '.git', 'QAS-package', 'QAS-deploy-temp', '.next', 'dist', 'build']);
for (const name of fs.readdirSync(QAS_ROOT)) {
  if (excludeTop.has(name) || name.match(/\.(env|log|pdf)$/) || name === 'gmail.env' || name.match(/^QAS-deploy-.*\.zip$/)) continue;
  const src = path.join(QAS_ROOT, name);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyRecursive(src, qasDest, ['node_modules']);
  } else {
    fs.copyFileSync(src, path.join(qasDest, name));
  }
}

// Remove node_modules from subdirs
for (const sub of ['h5-video-tool', 'h5-video-tool-api', path.join('scripts', 'emulator-distribute')]) {
  const nm = path.join(qasDest, sub, 'node_modules');
  if (fs.existsSync(nm)) fs.rmSync(nm, { recursive: true });
}

// Copy .env.example as .env.template
const envExample = path.join(qasDest, 'h5-video-tool-api', '.env.example');
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(qasDest, 'h5-video-tool-api', '.env.template'));
}

// 2. Copy video-pipeline
console.log('[2/5] Copying video-pipeline...');
if (fs.existsSync(VIDEO_PIPELINE)) {
  const vpDest = path.join(OUT_DIR, 'video-pipeline');
  copyRecursive(VIDEO_PIPELINE, OUT_DIR, ['node_modules', '.git']);
  const vpNm = path.join(vpDest, 'node_modules');
  if (fs.existsSync(vpNm)) fs.rmSync(vpNm, { recursive: true });
} else {
  console.log('  WARN: video-pipeline not found at', VIDEO_PIPELINE);
}

// 3. Copy skills
console.log('[3/5] Copying Cursor Skills...');
const skillsDest = path.join(OUT_DIR, 'cursor-skills');
fs.mkdirSync(skillsDest, { recursive: true });
for (const name of SKILL_NAMES) {
  const src = fs.existsSync(path.join(QAS_SKILLS, name)) ? path.join(QAS_SKILLS, name) : path.join(CURSOR_SKILLS, name);
  if (fs.existsSync(src)) {
    copyRecursive(src, skillsDest, []);
    console.log('  -', name);
  } else {
    console.log('  WARN: skill not found', name);
  }
}

// 4. Config templates
console.log('[4/5] Creating config templates...');
const configDest = path.join(OUT_DIR, 'config-templates');
fs.mkdirSync(configDest, { recursive: true });
fs.writeFileSync(path.join(configDest, 'geelark.json.template'), JSON.stringify({
  appId: 'YOUR_GEELARK_APP_ID',
  apiKey: 'YOUR_GEELARK_API_KEY',
  devices: [],
  defaultEnvIds: [],
  aiVideosPath: '/path/to/Ai Videos',
  latestJsonPath: '/path/to/Ai Videos/latest.json'
}, null, 2), 'utf8');

const deployReadme = `# QAS Deploy Package

## Structure
- QAS/ - main project
- video-pipeline/
- cursor-skills/ - copy to ~/.cursor/skills/
- config-templates/

## Deploy (Linux)
1. cd QAS/h5-video-tool-api && npm install && npm run build && cp .env.template .env
2. cd ../h5-video-tool && npm install && npm run build
3. pm2 start QAS/h5-video-tool-api/dist/index.js --name qas-api
4. pm2 serve QAS/h5-video-tool/dist 5173 --name qas-h5

See QAS/docs/deploy-ssh.md for details.
`;
fs.writeFileSync(path.join(OUT_DIR, 'SERVER-DEPLOY.md'), deployReadme, 'utf8');

// 5. Remove .env, gmail.env, *.mp4
console.log('[5/5] Cleaning sensitive files and output videos...');
const vidExt = ['.mp4', '.webm', '.mov', '.avi'];
getAllFiles(OUT_DIR).forEach((file) => {
  const name = path.basename(file);
  if (name === '.env' || name === 'gmail.env' || vidExt.includes(path.extname(name).toLowerCase())) {
    try { fs.unlinkSync(file); } catch (_) {}
  }
});

// 6. Create ZIP
console.log('[6/6] Creating ZIP...');
const dateFmt = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const zipName = `QAS-deploy-${dateFmt}.zip`;
const zipPath = path.join(QAS_ROOT, zipName);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const isWindows = process.platform === 'win32';
if (isWindows) {
  // Use PowerShell Compress-Archive
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT_DIR}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal"`, { stdio: 'inherit', cwd: QAS_ROOT });
} else {
  execSync(`cd "${OUT_DIR}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
}

const sizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log('\n=== Done ===');
console.log('ZIP:', zipPath, `(${sizeMB} MB)`);
console.log('\nNext:');
console.log('  1. Upload: scp', zipName, 'user@host:/home/user/');
console.log('  2. Unzip: unzip', zipName);
console.log('  3. Follow SERVER-DEPLOY.md or QAS/docs/deploy-ssh.md');
console.log('  4. Fill .env and config keys\n');
