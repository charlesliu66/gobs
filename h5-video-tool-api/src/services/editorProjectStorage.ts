import fs from 'node:fs/promises';
import path from 'node:path';
import { getApiDataDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

function normalizeUniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((item) => path.resolve(item)))];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function getEditorProjectDir(username: string): string {
  return path.join(getApiDataDir(), 'editor-projects', sanitizeUsername(username));
}

export function getLegacyEditorProjectDirs(username: string): string[] {
  const safeUser = sanitizeUsername(username);
  const primaryDir = path.resolve(getEditorProjectDir(safeUser));
  const candidates = normalizeUniquePaths([
    path.join(process.cwd(), 'editor-projects', safeUser),
    path.join(process.cwd(), '..', '..', 'api', 'editor-projects', safeUser),
  ]);
  return candidates.filter((candidate) => candidate !== primaryDir);
}

export async function resolveExistingEditorProjectFile(username: string, projectId: string): Promise<string> {
  const primaryDir = getEditorProjectDir(username);
  const primaryFile = path.join(primaryDir, `${projectId}.json`);
  if (await pathExists(primaryFile)) return primaryFile;

  for (const legacyDir of getLegacyEditorProjectDirs(username)) {
    const legacyFile = path.join(legacyDir, `${projectId}.json`);
    if (!(await pathExists(legacyFile))) continue;
    await fs.mkdir(primaryDir, { recursive: true });
    await fs.copyFile(legacyFile, primaryFile);
    return primaryFile;
  }

  return primaryFile;
}

export async function rehomeAllLegacyEditorProjects(username: string): Promise<void> {
  const primaryDir = getEditorProjectDir(username);
  await fs.mkdir(primaryDir, { recursive: true });

  for (const legacyDir of getLegacyEditorProjectDirs(username)) {
    let files: string[] = [];
    try {
      files = await fs.readdir(legacyDir);
    } catch {
      continue;
    }

    for (const fileName of files) {
      if (!fileName.endsWith('.json')) continue;
      const sourcePath = path.join(legacyDir, fileName);
      const targetPath = path.join(primaryDir, fileName);
      if (await pathExists(targetPath)) continue;
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}
