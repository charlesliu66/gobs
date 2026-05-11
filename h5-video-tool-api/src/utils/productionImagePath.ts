import { existsSync } from 'fs';
import path from 'path';
import { getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from './safeUsername.js';

export function getProductionImageDir(username: string): string {
  return path.join(getDefaultVideoOutputDir(), 'production', 'images', sanitizeUsername(username));
}

export function getLegacyProductionImageDirs(username: string): string[] {
  const safeUser = sanitizeUsername(username);
  const candidates = [
    path.resolve(process.cwd(), 'output', 'production', 'images', safeUser),
    path.resolve(process.cwd(), '..', '..', 'api', 'output', 'production', 'images', safeUser),
  ];
  return [...new Set(candidates.map((item) => path.normalize(item)))].filter(
    (item) => item !== path.normalize(getProductionImageDir(username)),
  );
}

function isSafeImageSuffix(suffix: string): string | null {
  const normalized = path.normalize(suffix);
  if (!normalized || path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    return null;
  }
  return normalized;
}

export function resolveReadableProductionImagePath(rawPath: string, username: string): string | null {
  const safeUser = sanitizeUsername(username);
  const cleaned = rawPath.trim().replace(/\\/g, '/');
  if (!cleaned) return null;

  const allowedDirs = [
    path.resolve(getProductionImageDir(safeUser)),
    ...getLegacyProductionImageDirs(safeUser).map((item) => path.resolve(item)),
  ];

  const inAllowedDir = (candidatePath: string) =>
    allowedDirs.some((base) => candidatePath === base || candidatePath.startsWith(base + path.sep));

  const chooseReadable = (candidates: string[]) => {
    const safeCandidates = candidates
      .map((item) => path.resolve(item))
      .filter(inAllowedDir);
    return safeCandidates.find((item) => existsSync(item)) ?? safeCandidates[0] ?? null;
  };

  if (path.isAbsolute(cleaned)) {
    const absPath = path.resolve(cleaned);
    return inAllowedDir(absPath) ? absPath : null;
  }

  const normalized = path.normalize(cleaned);
  const outputPrefix = `output/production/images/${safeUser}/`;
  const legacyPrefix = `production/images/${safeUser}/`;

  if (normalized.startsWith(outputPrefix) || normalized.startsWith(outputPrefix.replace(/\//g, '\\'))) {
    const suffix = isSafeImageSuffix(cleaned.slice(outputPrefix.length));
    if (!suffix) return null;
    return chooseReadable([
      path.join(getProductionImageDir(safeUser), suffix),
      ...getLegacyProductionImageDirs(safeUser).map((dir) => path.join(dir, suffix)),
    ]);
  }

  if (normalized.startsWith(legacyPrefix) || normalized.startsWith(legacyPrefix.replace(/\//g, '\\'))) {
    const suffix = isSafeImageSuffix(cleaned.slice(legacyPrefix.length));
    if (!suffix) return null;
    return chooseReadable([
      path.join(getProductionImageDir(safeUser), suffix),
      ...getLegacyProductionImageDirs(safeUser).map((dir) => path.join(dir, suffix)),
    ]);
  }

  if (!normalized.includes('/') && !normalized.includes('\\') && !normalized.includes('..')) {
    return chooseReadable([
      path.join(getProductionImageDir(safeUser), normalized),
      ...getLegacyProductionImageDirs(safeUser).map((dir) => path.join(dir, normalized)),
    ]);
  }

  return null;
}

function extractPathQueryFromProductionImageUrl(rawValue: string): string | null {
  try {
    const parsed = new URL(rawValue, 'http://localhost');
    if (parsed.pathname !== '/api/production/image') return null;
    const pathParam = parsed.searchParams.get('path')?.trim();
    return pathParam || null;
  } catch {
    return null;
  }
}

export function resolveProductionImageReference(rawValue: string, username: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const urlPath = extractPathQueryFromProductionImageUrl(trimmed);
  if (urlPath) {
    return resolveReadableProductionImagePath(urlPath, username);
  }

  return resolveReadableProductionImagePath(trimmed, username);
}
