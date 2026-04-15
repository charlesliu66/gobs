/**
 * BGM 节拍分析服务
 * 调用 scripts/beat_analysis.py（依赖 librosa），返回 BPM、节拍时间点、段落结构。
 * 若 Python 或 librosa 不可用，返回 null（调用方降级处理）。
 *
 * 启用条件（满足其一）：
 *   - 环境变量 EDITOR_BEAT_ANALYSIS=1
 *   - 或 currentProject 的 audio 轨有 BGM 且本服务已被显式调用
 */
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BeatSection {
  name: 'intro' | 'build' | 'drop' | 'outro' | 'bridge' | 'main';
  startSec: number;
  endSec: number;
  energy: 'low' | 'mid' | 'high';
}

export interface BeatInfo {
  bpm: number;
  /** 每拍间隔（秒） */
  beatInterval: number;
  /** 音频总时长（秒） */
  duration: number;
  /** 节拍时间点列表（最多 200 个） */
  beatTimes: number[];
  /** 能量段落结构 */
  sections: BeatSection[];
}

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'beat_analysis.py');
const TIMEOUT_MS = 60_000;

function getPythonExe(): string | null {
  const env = process.env.PYTHON_EXE?.trim();
  if (env && fs.existsSync(env)) return env;
  // 尝试系统 python3 / python
  for (const cmd of ['python3', 'python']) {
    try {
      // 快速探测（同步）
      const { spawnSync } = require('child_process') as typeof import('child_process');
      const r = spawnSync(cmd, ['--version'], { timeout: 3000, windowsHide: true });
      if (r.status === 0) return cmd;
    } catch { /* continue */ }
  }
  return null;
}

/**
 * 分析指定音频文件的节拍信息。
 * 失败时返回 null（调用方应跳过节拍引导，正常剪辑）。
 */
export async function analyzeMusicBeat(audioPath: string): Promise<BeatInfo | null> {
  if (!fs.existsSync(audioPath)) {
    console.warn('[musicBeat] audio file not found:', audioPath);
    return null;
  }
  if (!fs.existsSync(SCRIPT_PATH)) {
    console.warn('[musicBeat] beat_analysis.py not found at', SCRIPT_PATH);
    return null;
  }
  const python = getPythonExe();
  if (!python) {
    console.warn('[musicBeat] Python executable not found');
    return null;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.kill();
      console.warn('[musicBeat] timeout');
      resolve(null);
    }, TIMEOUT_MS);

    let stdout = '';
    let stderr = '';
    const proc = spawn(python, [SCRIPT_PATH, audioPath], { windowsHide: true });
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      try {
        const json = JSON.parse(stdout.trim()) as Record<string, unknown>;
        if (json.error) {
          console.warn('[musicBeat] script error:', json.error, stderr.slice(0, 200));
          resolve(null);
          return;
        }
        const info: BeatInfo = {
          bpm: Number(json.bpm) || 120,
          beatInterval: Number(json.beatInterval) || 0.5,
          duration: Number(json.duration) || 0,
          beatTimes: Array.isArray(json.beatTimes)
            ? (json.beatTimes as unknown[]).map(Number).filter(Number.isFinite)
            : [],
          sections: Array.isArray(json.sections)
            ? (json.sections as unknown[])
                .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
                .map((s) => ({
                  name: String(s.name || 'main') as BeatSection['name'],
                  startSec: Number(s.startSec) || 0,
                  endSec: Number(s.endSec) || 0,
                  energy: (String(s.energy || 'mid')) as BeatSection['energy'],
                }))
            : [],
        };
        resolve(info);
      } catch (e) {
        console.warn('[musicBeat] parse failed', e, 'stdout:', stdout.slice(0, 300));
        resolve(null);
      }
    });
    proc.on('error', (e) => {
      clearTimeout(timer);
      console.warn('[musicBeat] spawn error:', e);
      resolve(null);
    });
  });
}

/** 检查是否启用了节拍分析功能 */
export function isBeatAnalysisEnabled(): boolean {
  const v = (process.env.EDITOR_BEAT_ANALYSIS ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on' || v === 'yes';
}

/**
 * 将节拍信息格式化为 LLM prompt 插入块。
 * 注入位置：buildSystemPrompt 的「内容多样性约束」之后。
 */
export function formatBeatGuideBlock(beat: BeatInfo): string {
  const secLines = beat.sections
    .map((s) => {
      const dur = (s.endSec - s.startSec).toFixed(1);
      const contentHint =
        s.name === 'intro' ? '角色登场/场景建立，片段时长 3-5s'
        : s.name === 'build' ? '奔跑/探索/接近目标，片段时长 2-3s'
        : s.name === 'drop' ? '战斗高光/击杀瞬间，快切，片段时长 0.5-2s'
        : s.name === 'outro' ? '结局/庆祝/收尾，片段时长 3-5s'
        : '过渡/桥段，片段时长 2-4s';
      return `  - [${s.name}] ${s.startSec.toFixed(1)}s-${s.endSec.toFixed(1)}s (${dur}s, 能量:${s.energy}) → ${contentHint}`;
    })
    .join('\n');

  const dropSection = beat.sections.find((s) => s.name === 'drop' || s.energy === 'high');
  const dropHint = dropSection
    ? `drop 段（${dropSection.startSec.toFixed(1)}s-${dropSection.endSec.toFixed(1)}s）请选 intensity=high 或 isTurningPoint=true 的战斗片段，每片段时长约 ${(beat.beatInterval * 2).toFixed(2)}-${(beat.beatInterval * 4).toFixed(2)}s（2-4 拍）`
    : '';

  return `
## 🎵 音乐先行 · 节拍剪辑约束（BGM 已分析，请按节拍排片）
BPM: ${beat.bpm} | 每拍: ${beat.beatInterval.toFixed(3)}s | BGM 时长: ${beat.duration.toFixed(1)}s

段落安排（时间轴上的片段分配应尽量对应以下段落）：
${secLines}

切点约束：
- 每个片段的**结束时间点**尽量对齐最近节拍（偏差 < ${(beat.beatInterval * 0.25).toFixed(2)}s）
- 参考节拍点（前 20 个）：${beat.beatTimes.slice(0, 20).map((t) => t.toFixed(2)).join(', ')} ...
${dropHint ? `- ${dropHint}` : ''}
- 时间轴总时长不超过 BGM 时长（${beat.duration.toFixed(1)}s）`;
}
