import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { GobsFeatureCode, GobsUserRecord, MatrixFeatureCode } from './gobsAuthTypes.js';
import {
  ALL_GOBS_FEATURES,
  ALL_MATRIX_FEATURES,
  normalizeGobsFeatures,
  normalizeMatrixFeatures,
} from './gobsAuthTypes.js';

type Blob = { users: GobsUserRecord[]; version: 1 };

function emptyBlob(): Blob {
  return { users: [], version: 1 };
}

function dataPath(): string {
  return join(process.cwd(), '.data', 'gobs-users.json');
}

async function readBlob(): Promise<Blob> {
  try {
    const raw = await readFile(dataPath(), 'utf8');
    const parsed = JSON.parse(raw) as Blob;
    return { users: parsed.users ?? [], version: 1 };
  } catch {
    return emptyBlob();
  }
}

async function writeBlob(blob: Blob): Promise<void> {
  await mkdir(join(process.cwd(), '.data'), { recursive: true });
  await writeFile(dataPath(), JSON.stringify(blob, null, 2), 'utf8');
}

export function newGobsUserId(): string {
  return randomBytes(16).toString('hex');
}

export async function loadGobsUsersBlob(): Promise<Blob> {
  return readBlob();
}

export async function saveGobsUsersBlob(blob: Blob): Promise<void> {
  await writeBlob(blob);
}

export async function findGobsUserByEmail(email: string): Promise<GobsUserRecord | undefined> {
  const b = await readBlob();
  const lower = email.trim().toLowerCase();
  return b.users.find((u) => u.email.toLowerCase() === lower);
}

export async function findGobsUserById(id: string): Promise<GobsUserRecord | undefined> {
  const b = await readBlob();
  return b.users.find((u) => u.id === id);
}

export async function listGobsUsers(): Promise<GobsUserRecord[]> {
  const b = await readBlob();
  return [...b.users].sort((a, b) => b.createdAt - a.createdAt);
}

export async function upsertGobsUser(user: GobsUserRecord): Promise<void> {
  const b = await readBlob();
  const i = b.users.findIndex((u) => u.id === user.id);
  if (i >= 0) b.users[i] = user;
  else b.users.push(user);
  await writeBlob(b);
}

export async function deleteGobsUserById(id: string): Promise<boolean> {
  const b = await readBlob();
  const next = b.users.filter((u) => u.id !== id);
  if (next.length === b.users.length) return false;
  b.users = next;
  await writeBlob(b);
  return true;
}

export async function countGobsSuperAdmins(): Promise<number> {
  const b = await readBlob();
  return b.users.filter((u) => u.isSuperAdmin).length;
}

export function coerceGobsUserFeatures(
  features: unknown,
  matrixFeatures: unknown,
  isSuperAdmin: boolean,
): { features: GobsFeatureCode[]; matrixFeatures: MatrixFeatureCode[] } {
  if (isSuperAdmin) {
    return {
      features: [...ALL_GOBS_FEATURES],
      matrixFeatures: [...ALL_MATRIX_FEATURES],
    };
  }
  return {
    features: normalizeGobsFeatures(features),
    matrixFeatures: normalizeMatrixFeatures(matrixFeatures),
  };
}
