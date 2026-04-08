/**
 * QuickFilm 服务：一键成片异步 Job 管理
 */
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { generateStoryArc, generateProductionDesign, generateStoryboardTable } from './studioPipeline.js';
import { matchAssetsForShot } from './assetLibrary.js';
import { getApiDataDir } from '../config/apiDataDir.js';
import type { ProductionShot, StoryArcLayer, ProductionDesignLayer } from './studioPipeline.js';
import type { MatchedAssets } from './assetLibrary.js';

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface JobStep {
  name: string;
  done: boolean;
  error?: string;
}

export interface ShotWithAssets extends ProductionShot {
  matchedAssets?: MatchedAssets;
}

export interface QuickFilmJob {
  id: string;
  createdAt: string;
  status: JobStatus;
  progress: number;
  steps: JobStep[];
  error?: string;
  // inputs
  story: string;
  protagonist: string;
  protagonistDesc: string;
  style: string;
  // outputs
  storyArc?: StoryArcLayer;
  productionDesign?: ProductionDesignLayer;
  storyboard?: ShotWithAssets[];
  batchJobId?: string;
}

function getJobPath(jobId: string): string {
  return path.join(getApiDataDir(), 'quickfilm', `${jobId}.json`);
}

function ensureJobDir(): void {
  fs.mkdirSync(path.join(getApiDataDir(), 'quickfilm'), { recursive: true });
}

export async function createJob(input: {
  story: string;
  protagonist: string;
  protagonistDesc: string;
  style: string;
}): Promise<string> {
  ensureJobDir();
  const jobId = nanoid();
  const job: QuickFilmJob = {
    id: jobId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    progress: 0,
    steps: [
      { name: '分析故事结构', done: false },
      { name: '生成角色设定', done: false },
      { name: '生成分镜脚本', done: false },
      { name: '匹配素材库', done: false },
      { name: '准备视频生成', done: false },
    ],
    story: input.story,
    protagonist: input.protagonist,
    protagonistDesc: input.protagonistDesc,
    style: input.style,
  };
  fs.writeFileSync(getJobPath(jobId), JSON.stringify(job, null, 2), 'utf-8');
  return jobId;
}

export function loadJob(jobId: string): QuickFilmJob | null {
  const p = getJobPath(jobId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as QuickFilmJob;
  } catch {
    return null;
  }
}

function saveJob(job: QuickFilmJob): void {
  ensureJobDir();
  fs.writeFileSync(getJobPath(job.id), JSON.stringify(job, null, 2), 'utf-8');
}

function updateStep(job: QuickFilmJob, stepName: string, done: boolean, error?: string): void {
  const step = job.steps.find((s) => s.name === stepName);
  if (step) {
    step.done = done;
    if (error) step.error = error;
  }
  const doneCount = job.steps.filter((s) => s.done).length;
  job.progress = Math.round((doneCount / job.steps.length) * 100);
  saveJob(job);
}

/** 异步执行 QuickFilm 流水线（fire-and-forget） */
export function runJobAsync(jobId: string, extras?: {
  styleImageBase64?: string;
  assetFiles?: Array<{ name: string; base64: string }>;
}): void {
  void (async () => {
    const job = loadJob(jobId);
    if (!job) return;

    job.status = 'running';
    saveJob(job);

    try {
      // Step 1: 生成故事结构
      const characterBible = job.protagonistDesc
        ? `主角：${job.protagonist}\n设定：${job.protagonistDesc}`
        : `主角：${job.protagonist}`;
      const storyArc = await generateStoryArc({
        characterBible,
        synopsis: job.story,
        styleRef: job.style,
        structureTemplate: 'three_act',
      });
      job.storyArc = storyArc;
      updateStep(job, '分析故事结构', true);

      // Step 2: 生成服化道
      const productionDesign = await generateProductionDesign(storyArc);
      job.productionDesign = productionDesign;
      updateStep(job, '生成角色设定', true);

      // Step 3: 生成分镜
      const shots = await generateStoryboardTable({
        story: storyArc,
        productionDesign,
        maxTotalDurationSec: 60,
        extraNotes: extras?.styleImageBase64 ? '使用了风格参考图，请保持画面风格统一' : undefined,
      });
      updateStep(job, '生成分镜脚本', true);

      // Step 4: 匹配素材
      const shotsWithAssets: ShotWithAssets[] = [];
      for (const shot of shots) {
        try {
          const matched = await matchAssetsForShot(shot);
          shotsWithAssets.push({ ...shot, matchedAssets: matched });
        } catch {
          shotsWithAssets.push({ ...shot });
        }
      }
      job.storyboard = shotsWithAssets;
      updateStep(job, '匹配素材库', true);

      // Step 5: 完成
      updateStep(job, '准备视频生成', true);
      job.status = 'done';
      job.progress = 100;
      saveJob(job);
    } catch (err) {
      job.status = 'error';
      job.error = err instanceof Error ? err.message : '未知错误';
      // 标记哪个步骤出了问题
      const failedStep = job.steps.find((s) => !s.done);
      if (failedStep) {
        failedStep.error = job.error;
      }
      saveJob(job);
      console.error('[quickFilmService] job failed:', jobId, err);
    }
  })();
}
