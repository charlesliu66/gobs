import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { getApiDataDir } from '../config/apiDataDir.js';

export type DeploymentPhase = 'idle' | 'preparing' | 'deploying' | 'verifying';
export type DeploymentLevel = 'info' | 'warning' | 'critical';

export interface DeploymentState {
  active: boolean;
  phase: DeploymentPhase;
  level: DeploymentLevel;
  messageZh: string;
  messageEn: string;
  allowWrites: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface NormalizeDeploymentStateOptions {
  now?: Date;
  updatedBy?: string;
}

const VALID_PHASES: DeploymentPhase[] = ['idle', 'preparing', 'deploying', 'verifying'];
const VALID_LEVELS: DeploymentLevel[] = ['info', 'warning', 'critical'];

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolvePhase(value: unknown): DeploymentPhase {
  return VALID_PHASES.includes(value as DeploymentPhase) ? (value as DeploymentPhase) : 'idle';
}

function resolveLevel(phase: DeploymentPhase, value: unknown): DeploymentLevel {
  if (VALID_LEVELS.includes(value as DeploymentLevel)) return value as DeploymentLevel;
  if (phase === 'preparing') return 'warning';
  if (phase === 'deploying') return 'critical';
  return 'info';
}

function resolveAllowWrites(phase: DeploymentPhase, value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return phase !== 'deploying';
}

export function createDefaultDeploymentState(now: Date = new Date()): DeploymentState {
  return {
    active: false,
    phase: 'idle',
    level: 'info',
    messageZh: '',
    messageEn: '',
    allowWrites: true,
    updatedAt: now.toISOString(),
    updatedBy: 'system',
  };
}

export function normalizeDeploymentStateInput(
  input: unknown,
  options: NormalizeDeploymentStateOptions = {},
): DeploymentState {
  const now = options.now ?? new Date();
  const fallback = createDefaultDeploymentState(now);
  if (!input || typeof input !== 'object') {
    return {
      ...fallback,
      updatedBy: asTrimmedString(options.updatedBy) || fallback.updatedBy,
    };
  }

  const record = input as Record<string, unknown>;
  const phase = resolvePhase(record.phase);

  return {
    active: typeof record.active === 'boolean' ? record.active : phase !== 'idle',
    phase,
    level: resolveLevel(phase, record.level),
    messageZh: asTrimmedString(record.messageZh),
    messageEn: asTrimmedString(record.messageEn),
    allowWrites: resolveAllowWrites(phase, record.allowWrites),
    updatedAt: now.toISOString(),
    updatedBy: asTrimmedString(options.updatedBy) || asTrimmedString(record.updatedBy) || fallback.updatedBy,
  };
}

export function getDeploymentStateFilePath(): string {
  return path.join(getApiDataDir(), '.data', 'deployment-state.json');
}

export async function readDeploymentState(filePath: string = getDeploymentStateFilePath()): Promise<DeploymentState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return normalizeDeploymentStateInput(JSON.parse(raw));
  } catch {
    return createDefaultDeploymentState();
  }
}

export async function writeDeploymentState(
  input: unknown,
  options: NormalizeDeploymentStateOptions & { filePath?: string } = {},
): Promise<DeploymentState> {
  const filePath = options.filePath ?? getDeploymentStateFilePath();
  const next = normalizeDeploymentStateInput(input, options);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  return next;
}

export function getAppEnvironmentName(): string {
  const value = asTrimmedString(process.env.APP_ENVIRONMENT);
  return value || 'unknown';
}
