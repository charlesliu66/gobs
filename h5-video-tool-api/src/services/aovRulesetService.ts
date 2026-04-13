import fs from 'fs/promises';
import path from 'path';
import { getApiDataDir } from '../config/apiDataDir.js';

export type AovAspectRatio = '9:16' | '16:9';

export interface AovRuleset {
  game: 'aov';
  version: string;
  publishedAt: string;
  note?: string;
  modes: Array<{
    key: string;
    name: string;
    objectivePriority: string[];
    eventWeights: Record<string, number>;
  }>;
  taxonomy: {
    heroes: string[];
    lanes: string[];
    objectives: string[];
    terms: Record<string, string[]>;
  };
  policy: {
    allowedAspectRatios: AovAspectRatio[];
    durationRangeSec: { min: number; max: number };
    subtitleReplaceMap: Record<string, string>;
  };
}

interface RulesetManifest {
  activeVersion: string;
  versions: string[];
  updatedAt: string;
}

export interface AovBenchmarkSample {
  id: string;
  clipPath: string;
  startSec: number;
  endSec: number;
  labels: string[];
  note?: string;
}

const DEFAULT_VERSION = 'aov-rules-v1';

function rulesRootDir(): string {
  return path.join(getApiDataDir(), '.data', 'remix-rules', 'aov');
}

function manifestPath(): string {
  return path.join(rulesRootDir(), 'manifest.json');
}

function versionPath(version: string): string {
  return path.join(rulesRootDir(), `${version}.json`);
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultRuleset(): AovRuleset {
  return {
    game: 'aov',
    version: DEFAULT_VERSION,
    publishedAt: nowIso(),
    note: 'bootstrap default ruleset',
    modes: [
      {
        key: '5v5',
        name: '经典 5v5',
        objectivePriority: ['abyssal_dragon', 'tower_push', 'dark_slayer'],
        eventWeights: {
          kill: 1.2,
          multi_kill: 1.6,
          team_fight: 1.5,
          abyssal_dragon: 1.4,
          dark_slayer: 1.7,
          tower_push: 1.3,
        },
      },
      {
        key: 'ranked',
        name: '排位赛',
        objectivePriority: ['dark_slayer', 'abyssal_dragon', 'tower_push'],
        eventWeights: {
          kill: 1.1,
          multi_kill: 1.7,
          team_fight: 1.6,
          abyssal_dragon: 1.5,
          dark_slayer: 1.9,
          tower_push: 1.4,
        },
      },
    ],
    taxonomy: {
      heroes: ['Nakroth', 'Florentino', 'Yorn', 'Raz', 'Butterfly'],
      lanes: ['dark_slayer_lane', 'mid_lane', 'abyssal_lane', 'jungle'],
      objectives: ['abyssal_dragon', 'dark_slayer', 'tower'],
      terms: {
        dragon_fight: ['龙团', '开龙', '拿龙', '控龙'],
        multi_kill: ['双杀', '三杀', '四杀', '五杀', '连杀'],
        counter_engage: ['反打', '反开', '回头打'],
        split_push: ['带线', '分推', '偷塔'],
        cleanup: ['收割', '追击收割'],
      },
    },
    policy: {
      allowedAspectRatios: ['9:16', '16:9'],
      durationRangeSec: { min: 6, max: 60 },
      subtitleReplaceMap: {
        击杀: '淘汰',
      },
    },
  };
}

async function ensureBootstrap(): Promise<void> {
  const root = rulesRootDir();
  await fs.mkdir(root, { recursive: true });
  try {
    await fs.access(manifestPath());
    return;
  } catch {
    const seed = defaultRuleset();
    const manifest: RulesetManifest = {
      activeVersion: seed.version,
      versions: [seed.version],
      updatedAt: nowIso(),
    };
    await fs.writeFile(versionPath(seed.version), JSON.stringify(seed, null, 2), 'utf-8');
    await fs.writeFile(manifestPath(), JSON.stringify(manifest, null, 2), 'utf-8');
  }
}

async function readManifest(): Promise<RulesetManifest> {
  await ensureBootstrap();
  const raw = await fs.readFile(manifestPath(), 'utf-8');
  const parsed = JSON.parse(raw) as Partial<RulesetManifest>;
  return {
    activeVersion: String(parsed.activeVersion ?? DEFAULT_VERSION),
    versions: Array.isArray(parsed.versions) ? parsed.versions.map((x) => String(x)) : [DEFAULT_VERSION],
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : nowIso(),
  };
}

async function writeManifest(next: RulesetManifest): Promise<void> {
  await fs.writeFile(manifestPath(), JSON.stringify(next, null, 2), 'utf-8');
}

async function readRuleset(version: string): Promise<AovRuleset> {
  const raw = await fs.readFile(versionPath(version), 'utf-8');
  return JSON.parse(raw) as AovRuleset;
}

export async function getActiveAovRuleset(): Promise<AovRuleset> {
  const m = await readManifest();
  try {
    return await readRuleset(m.activeVersion);
  } catch {
    const seed = defaultRuleset();
    await publishAovRuleset(seed, 'auto-recover-default');
    return seed;
  }
}

export async function listAovRulesetVersions(): Promise<{ activeVersion: string; versions: string[] }> {
  const m = await readManifest();
  return { activeVersion: m.activeVersion, versions: m.versions };
}

export async function publishAovRuleset(
  input: Omit<AovRuleset, 'game' | 'publishedAt'> & { publishedAt?: string },
  note?: string,
): Promise<AovRuleset> {
  const m = await readManifest();
  const version = input.version.trim();
  if (!version) {
    throw new Error('ruleset version 不能为空');
  }
  const next: AovRuleset = {
    ...input,
    game: 'aov',
    note: note ?? input.note,
    publishedAt: input.publishedAt?.trim() || nowIso(),
  };
  await fs.writeFile(versionPath(version), JSON.stringify(next, null, 2), 'utf-8');
  const versions = m.versions.includes(version) ? m.versions : [...m.versions, version];
  await writeManifest({
    activeVersion: version,
    versions,
    updatedAt: nowIso(),
  });
  return next;
}

export async function rollbackAovRuleset(version: string): Promise<AovRuleset> {
  const m = await readManifest();
  if (!m.versions.includes(version)) {
    throw new Error(`版本不存在: ${version}`);
  }
  const rules = await readRuleset(version);
  await writeManifest({
    ...m,
    activeVersion: version,
    updatedAt: nowIso(),
  });
  return rules;
}

export function buildAovBenchmarkTemplate(count = 50): AovBenchmarkSample[] {
  const n = Math.max(10, Math.min(200, Math.floor(count)));
  const out: AovBenchmarkSample[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `aov_sample_${String(i + 1).padStart(3, '0')}`,
      clipPath: '',
      startSec: 0,
      endSec: 8,
      labels: [],
      note: '填写真实标注：例如 ["team_fight","multi_kill"]',
    });
  }
  return out;
}
