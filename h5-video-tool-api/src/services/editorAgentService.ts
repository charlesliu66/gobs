import type { AspectRatioPreset, TimelineProject, Track, VideoClip, AudioClip } from '../editor/timelineSchema.js';
import { compassChatCompletionWithUsage, type CompassChatUsage } from './promptPolish.js';
import { buildPreferencePromptSnippet } from './userPreferenceService.js';
import { sumCompassUsage, type LlmUsageCallRecord } from './editorLlmUsage.js';
import {
  analyzeMusicBeat,
  isBeatAnalysisEnabled,
  formatBeatGuideBlock,
  type BeatInfo,
} from './musicBeatAnalysis.js';
import {
  buildUniformCandidateWindows,
  isCombatLikeIntent,
  parseTargetTimelineSec,
  prioritizeCenterWindows,
  type CandidateWindow,
} from './editorHighlightCandidates.js';
import { getEditorAssetAbsolutePath } from '../routes/editorAssets.js';
import {
  analyzeSingleAssetVideo,
  resolveEditorAnalysisMode,
  type EditorVisionFocus,
} from './video/editorVideoAnalysis.js';
import type { VisionFrameScore } from './video/frameVisionRank.js';
import { loadGameTaxonomy } from './video/gameTaxonomy.js';
import { buildAovDslPlan, looksLikeAovRequest } from './aovDslPlanner.js';
import { getActiveAovRuleset } from './aovRulesetService.js';

export interface EditorAgentAssetContext {
  id: string;
  originalName: string;
  /** 源视频时长（秒），未知时由模型保守估计 */
  durationSec: number;
}

export interface EditorAgentApplyInput {
  userMessage: string;
  aspectRatio: AspectRatioPreset;
  /** 用户选中的素材 id，须为下方 assets 的子集 */
  selectedAssetIds: string[];
  assets: EditorAgentAssetContext[];
  currentProject: TimelineProject;
  /** 仅在 vision/hybrid 下生效：先缩窗再抽帧 Gemini */
  visionFocus?: EditorVisionFocus;
}

function normLabel(s: string): string {
  return s.trim();
}

function detectRoleIntent(userMessage: string): boolean {
  return /角色|镜头|出场|片段|主角|人物/.test(userMessage);
}

function resolveRequestedRoleStrict(userMessage: string, availableRoles: string[]): {
  requestedRole?: string;
  suggestRoles?: string[];
  needConfirm?: boolean;
} {
  const msg = userMessage.trim();
  if (!msg || availableRoles.length === 0) return {};
  const exact = availableRoles.find((r) => msg.includes(r));
  if (exact) return { requestedRole: exact };

  if (!detectRoleIntent(msg)) return {};

  // 未命中精确角色时，仅给出“可能是这些角色吗”的建议，不做自动同义词映射。
  const suggest = availableRoles
    .map((r) => {
      const overlap = [...new Set(r.split(''))].filter((ch) => msg.includes(ch)).length;
      const contains = r.includes(msg) || msg.includes(r) ? 3 : 0;
      return { role: r, score: overlap + contains };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.role)
    .filter(Boolean);

  if (suggest.length > 0) {
    return { needConfirm: true, suggestRoles: suggest };
  }
  return {};
}

function isCombatActivityLabel(activity?: string): boolean {
  if (!activity) return false;
  return /打架|战斗|对战|交火|团战|击杀|combat|fight|battle|pvp|boss/i.test(activity);
}

function intersectsRoleHints(
  roles: string[] | undefined,
  requestedRole: string | undefined,
  note?: string,
): boolean {
  if (!requestedRole) return true;
  if (!roles || roles.length === 0) {
    const n = (note || '').trim();
    return n.includes(requestedRole);
  }
  const roleNorm = roles.map(normLabel);
  return roleNorm.some((r) => r === requestedRole);
}

function mergeIntentWindows(assetId: string, windows: CandidateWindow[]): CandidateWindow[] {
  const sorted = [...windows].sort((a, b) => a.sourceStart - b.sourceStart);
  const out: CandidateWindow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let s = sorted[i]!.sourceStart;
    let e = sorted[i]!.sourceEnd;
    let j = i + 1;
    while (j < sorted.length && sorted[j]!.sourceStart <= e + 0.65) {
      e = Math.max(e, sorted[j]!.sourceEnd);
      j += 1;
    }
    out.push({
      id: `intent_${assetId.slice(-8)}_${out.length}`,
      assetId,
      sourceStart: Math.round(s * 1000) / 1000,
      sourceEnd: Math.round(e * 1000) / 1000,
    });
    i = j;
  }
  return out;
}

function buildIntentPriorityWindows(
  assetId: string,
  durationSec: number,
  requestedRole: string | undefined,
  scores: VisionFrameScore[],
): CandidateWindow[] {
  if (!scores.length) return [];
  // 转折点加权：isTurningPoint=true 等效 score+1.5，intensity=high 等效 score+0.5
  const boosted = scores.map((s) => ({
    ...s,
    score: s.score
      + (s.isTurningPoint ? 1.5 : 0)
      + (s.intensity === 'high' ? 0.5 : 0),
  }));
  const candidates = boosted
    .filter((s) => s.score >= 4.5)
    .filter((s) => isCombatActivityLabel(s.activity))
    .filter((s) => intersectsRoleHints(s.roles, requestedRole, s.note))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  if (!candidates.length) return [];
  const d = Math.max(0.2, durationSec);
  const spans: CandidateWindow[] = candidates.map((s, idx) => {
    const len = Math.min(7, Math.max(3.5, 2 + s.score * 0.45));
    const start = Math.max(0, Math.min(d - 0.12, s.tSec - len * 0.33));
    const end = Math.min(d, Math.max(start + 0.12, start + len));
    return {
      id: `intent_raw_${assetId.slice(-8)}_${idx}`,
      assetId,
      sourceStart: Math.round(start * 1000) / 1000,
      sourceEnd: Math.round(end * 1000) / 1000,
    };
  });
  return mergeIntentWindows(assetId, spans);
}

// ─── 方向2：叙事模板 ────────────────────────────────────────────────────────────

interface NarrativeSlot {
  role: string;         // 叙事角色名
  durationHint: string; // 时长建议
  contentHint: string;  // 内容类型描述
  intensityHint: string;// 期望 intensity
}

interface NarrativeTemplate {
  name: string;
  description: string;
  slots: NarrativeSlot[];
}

const NARRATIVE_TEMPLATES: Record<string, NarrativeTemplate> = {
  classic_highlight: {
    name: '经典高光',
    description: '适合混剪爽点：开场钩子 → 铺垫积累 → 战斗高潮 → 收尾',
    slots: [
      { role: '开场钩子', durationHint: '3-5s', contentHint: '角色登场 / 转折点 / 最强击杀镜头，isTurningPoint=true 或 score≥8', intensityHint: 'high 或 mid' },
      { role: '铺垫积累', durationHint: '8-12s', contentHint: '奔跑、探索、接近目标，中等强度动作', intensityHint: 'mid' },
      { role: '战斗高潮', durationHint: '10-18s', contentHint: '连续战斗高光，isActionPeak=true 的击杀瞬间密集快切', intensityHint: 'high' },
      { role: '收尾落定', durationHint: '3-5s', contentHint: '胜利庆祝、结局镜头或 score 最高的单帧', intensityHint: 'low 或 mid' },
    ],
  },
  character_story: {
    name: '角色故事',
    description: '适合角色宣传片：登场 → 能力展示 → 危机时刻 → 逆转',
    slots: [
      { role: '角色登场', durationHint: '4-6s', contentHint: '角色特写或标志性场景，cameraMotion=static 或 zoom', intensityHint: 'low' },
      { role: '能力展示', durationHint: '10-15s', contentHint: '技能使用、连招展示，isActionPeak 帧优先', intensityHint: 'mid 至 high' },
      { role: '危机时刻', durationHint: '5-8s', contentHint: '被围困、血量危急、逃命奔跑，isTurningPoint=true', intensityHint: 'high' },
      { role: '逆转胜利', durationHint: '4-6s', contentHint: '反杀 / 最终击杀 / 逃脱成功，isTurningPoint=true', intensityHint: 'high' },
    ],
  },
  beat_sync: {
    name: '节奏混剪',
    description: '完全由音乐节拍驱动，内容服从节奏段落',
    slots: [
      { role: 'intro 段', durationHint: '视 BGM 而定', contentHint: '平静建立，角色登场或场景全景', intensityHint: 'low' },
      { role: 'build 段', durationHint: '视 BGM 而定', contentHint: '中等强度动作，节奏加快', intensityHint: 'mid' },
      { role: 'drop 段', durationHint: '视 BGM 而定', contentHint: '高强度战斗，每拍一切，isActionPeak 帧优先', intensityHint: 'high' },
      { role: 'outro 段', durationHint: '视 BGM 而定', contentHint: '收尾，回落到低张力镜头', intensityHint: 'low' },
    ],
  },
};

function selectNarrativeTemplate(combatLike: boolean, hasBeat: boolean): NarrativeTemplate {
  if (hasBeat) return NARRATIVE_TEMPLATES.beat_sync!;
  if (combatLike) return NARRATIVE_TEMPLATES.classic_highlight!;
  return NARRATIVE_TEMPLATES.character_story!;
}

// ─── 方向2：内容地图（Content Manifest）────────────────────────────────────────

function buildContentManifest(
  scoresByAsset: Map<string, VisionFrameScore[]>,
  assets: EditorAgentAssetContext[],
): string {
  if (scoresByAsset.size === 0) return '';

  const assetNameMap = new Map(assets.map((a) => [a.id, a.originalName]));

  // 分组：hook（转折点高分）/ combat_peak（战斗 high）/ build_up（mid）/ calm（low/静态）
  const hooks: string[] = [];
  const combatPeaks: string[] = [];
  const buildUps: string[] = [];
  const calms: string[] = [];
  const actionPeaks: string[] = [];

  for (const [assetId, scores] of scoresByAsset) {
    const name = assetNameMap.get(assetId) ?? assetId.slice(-6);
    for (const s of scores) {
      const loc = `「${name}」t=${s.tSec.toFixed(1)}s`;
      const tag = `${s.activity ?? '未知'}${s.activitySecondary ? '/' + s.activitySecondary : ''}`;
      const scoreStr = `score=${s.score.toFixed(1)}`;
      const tensionStr = s.tension != null ? ` tension=${s.tension.toFixed(0)}` : '';
      const emotionStr = s.emotionTag ? ` [${s.emotionTag}]` : '';
      if (s.isActionPeak) {
        actionPeaks.push(`${loc} [${tag} ${scoreStr}${tensionStr}${emotionStr}]`);
      }
      if (s.isTurningPoint || (s.score >= 8 && s.intensity === 'high')) {
        hooks.push(`${loc} [${tag} ${scoreStr}${tensionStr}${emotionStr}${s.isTurningPoint ? ' ★转折' : ''}]`);
      } else if (s.intensity === 'high') {
        combatPeaks.push(`${loc} [${tag} ${scoreStr}${tensionStr}${emotionStr}]`);
      } else if (s.intensity === 'mid') {
        buildUps.push(`${loc} [${tag} ${scoreStr}${tensionStr}${emotionStr}]`);
      } else {
        calms.push(`${loc} [${tag} ${scoreStr}${tensionStr}${emotionStr}]`);
      }
    }
  }

  // 情绪分布统计
  const emotionCounts: Record<string, number> = {};
  let tensionSum = 0;
  let tensionCount = 0;
  for (const scores of scoresByAsset.values()) {
    for (const s of scores) {
      if (s.emotionTag) emotionCounts[s.emotionTag] = (emotionCounts[s.emotionTag] ?? 0) + 1;
      if (s.tension != null) { tensionSum += s.tension; tensionCount++; }
    }
  }
  const avgTension = tensionCount > 0 ? (tensionSum / tensionCount).toFixed(1) : '未知';
  const emotionSummary = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}×${v}`)
    .join(' / ');

  const lines: string[] = ['## 内容地图（Content Manifest）'];
  lines.push('*基于视觉分析自动生成，指导叙事排片使用*');
  lines.push(`*情绪分布：${emotionSummary || '暂无数据'} | 平均张力：${avgTension}/10*`);
  lines.push('');
  if (hooks.length) {
    lines.push(`### 🎯 钩子/转折点候选（${hooks.length} 帧）——适合开场或高潮节点`);
    hooks.slice(0, 6).forEach((h) => lines.push(`- ${h}`));
  }
  if (actionPeaks.length) {
    lines.push(`### ⚡ 动作顶点候选（${actionPeaks.length} 帧）——isActionPeak=true，适合切入点`);
    actionPeaks.slice(0, 6).forEach((h) => lines.push(`- ${h}`));
  }
  if (combatPeaks.length) {
    lines.push(`### 🔥 战斗高光候选（${combatPeaks.length} 帧）——高强度，适合高潮段`);
    combatPeaks.slice(0, 8).forEach((h) => lines.push(`- ${h}`));
  }
  if (buildUps.length) {
    lines.push(`### 🏃 铺垫积累候选（${buildUps.length} 帧）——中强度，适合铺垫段`);
    buildUps.slice(0, 6).forEach((h) => lines.push(`- ${h}`));
  }
  if (calms.length) {
    lines.push(`### 🌅 平静/登场候选（${calms.length} 帧）——低强度，适合开场或收尾`);
    calms.slice(0, 4).forEach((h) => lines.push(`- ${h}`));
  }

  return lines.join('\n');
}

/** 从 LLM 输出中鲁棒提取 JSON：优先 code-block → 最外层 {…} 花括号配对 → 原文 */
function extractJson(s: string): string {
  // 1. 尝试所有 markdown code block，取最长的
  const codeBlockRe = /```(?:json)?\s*([\s\S]*?)```/g;
  let best = '';
  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(s)) !== null) {
    const content = m[1].trim();
    if (content.length > best.length) best = content;
  }
  if (best) return best;

  // 2. 找最外层 { ... } 配对（处理嵌套）
  const firstBrace = s.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = firstBrace; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return s.slice(firstBrace, i + 1);
      }
    }
    // 花括号未闭合，返回从 { 到末尾（后续 repairJson 补齐）
    return s.slice(firstBrace);
  }

  return s.trim();
}

/** 尝试修复常见 LLM JSON 缺陷：尾逗号、行注释、未闭合括号 */
function repairJson(raw: string): string {
  let s = raw;
  // 去掉 // 行注释（不在引号内的）
  s = s.replace(/(?<="[^"]*"[^"]*?)\/\/[^\n]*/g, '');
  s = s.replace(/^(\s*)\/\/[^\n]*/gm, '$1');
  // 去掉尾逗号 ,} 和 ,]
  s = s.replace(/,(\s*[}\]])/g, '$1');
  // 补齐未闭合的花括号/方括号
  let braces = 0;
  let brackets = 0;
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }
  return s;
}

/**
 * 从时间轴项目中找 BGM 的 assetId，用于 beat 分析。
 *
 * 工程结构：`a1` 是视频原声镜像轨（与视频同 assetId），`a2` 才是用户配的 BGM。
 * 以前实现遍历所有 audio 轨取「第一个命中」，会命中 a1 上的视频原声 → 节拍分析
 * 实际跑在对白/游戏声上。这里改为：
 *   1) 优先按 track.id 匹配 `a2` / `bgm` / `music`
 *   2) 其次找「assetId 与 video 轨不同」的 audio clip
 *   3) 再兜底任取一个（保持向后兼容）
 */
function findBgmAssetId(project: TimelineProject): string | null {
  const videoAssetIds = new Set<string>();
  for (const track of project.tracks) {
    if (track.type !== 'video') continue;
    for (const c of track.clips) {
      const vid = (c as { assetId?: string }).assetId;
      if (vid) videoAssetIds.add(vid);
    }
  }

  const isBgmTrackId = (id: string): boolean => /^(a2|bgm|music)$/i.test(id);

  for (const track of project.tracks) {
    if (track.type !== 'audio' || !isBgmTrackId(track.id)) continue;
    for (const clip of track.clips) {
      const ac = clip as Partial<AudioClip>;
      if (ac.assetId) return ac.assetId;
    }
  }
  for (const track of project.tracks) {
    if (track.type !== 'audio') continue;
    for (const clip of track.clips) {
      const ac = clip as Partial<AudioClip>;
      if (ac.assetId && !videoAssetIds.has(ac.assetId)) return ac.assetId;
    }
  }
  for (const track of project.tracks) {
    if (track.type !== 'audio') continue;
    for (const clip of track.clips) {
      const ac = clip as Partial<AudioClip>;
      if (ac.assetId) return ac.assetId;
    }
  }
  return null;
}

// ─── 模型配置 ─────────────────────────────────────────────────────────────────

function getEditorAgentModels() {
  return {
    plan: process.env.EDITOR_AGENT_PLAN_MODEL?.trim() || 'DeepSeek-R1',
    build: process.env.EDITOR_AGENT_BUILD_MODEL?.trim() || 'gpt-4.1',
    fallback: process.env.EDITOR_AGENT_FALLBACK_MODEL?.trim() || 'gpt-4o',
  };
}

// ─── Plan 阶段 prompt（自然语言输出，不要求 JSON）──────────────────────────────

function buildPlanSystemPrompt(ctx: {
  targetTimelineSec: number;
  combatLike: boolean;
  narrativeTemplate?: NarrativeTemplate;
  beatInfo?: BeatInfo | null;
  userPreferenceSnippet?: string;
  contentManifest?: string;
  beatGuide?: string;
  currentClipsMetaBlock?: string;
}): string {
  const sections: string[] = [];
  sections.push(`你是专业的「剪辑策划师」。根据用户指令和候选素材片段，输出一份**剪辑选段方案**。

## 你的任务
分析用户想要的视频风格和内容，从 candidateWindows 中挑选最合适的片段，规划成片结构。

## 输出格式（纯文本，非 JSON）
按以下结构回答，每行一条：

SUMMARY: 一句话总结你的剪辑思路
TOTAL_DURATION: 预计成片总时长（秒）
CLIPS:
1. [候选窗ID] [assetId] [sourceStart]-[sourceEnd] [时长s] [用途说明]
2. [候选窗ID] [assetId] [sourceStart]-[sourceEnd] [时长s] [用途说明]
...

## 选段原则
- 成片总时长目标 **${ctx.targetTimelineSec} 秒**（±2s 可接受）
- 每个片段的 sourceStart/sourceEnd 必须在对应候选窗范围内
- 开场选最抓眼球的片段（score 高或 isTurningPoint），收尾选高分片段
- 混剪节奏：快切（1-3s）与中长镜（3-6s）交替，比例约 3:1
${ctx.combatLike ? '- 战斗类内容：优先选 score 高的候选窗，战斗片段间穿插非战斗片段避免视觉疲劳' : ''}
${ctx.narrativeTemplate ? `- 按「${ctx.narrativeTemplate.name}」叙事结构排片：${ctx.narrativeTemplate.slots.map((s) => `${s.role}(${s.durationHint})`).join(' → ')}` : ''}`);

  if (ctx.contentManifest && ctx.contentManifest.trim()) {
    sections.push(`## 素材内容总览（用于挑选角色/场景/情绪）
${ctx.contentManifest.trim()}`);
  }

  if (ctx.beatGuide && ctx.beatGuide.trim()) {
    sections.push(`## BGM 节拍结构（切点尽量对齐以下节拍时间）
${ctx.beatGuide.trim()}`);
  } else if (ctx.beatInfo) {
    sections.push(`## BGM 节拍
- 有 BGM 节拍信息（BPM=${ctx.beatInfo.bpm}），片段切点尽量对齐节拍。`);
  }

  if (ctx.currentClipsMetaBlock && ctx.currentClipsMetaBlock.trim()) {
    sections.push(`## 当前工程已有片段（带分镜/角色/备注，供延续风格与顺序参考）
${ctx.currentClipsMetaBlock.trim()}

优先延续这些片段的叙事线索与角色出场顺序；若新需求明确冲突以新需求为准。`);
  }

  if (ctx.userPreferenceSnippet) {
    sections.push(ctx.userPreferenceSnippet);
  }

  return sections.join('\n\n');
}

/** 把当前工程已有 VideoClip 的 meta（shotIndex/note/characters/productionShotId）格式化为 Markdown 表 */
function formatCurrentClipsMetaBlock(project: TimelineProject): string {
  const vTrack = project.tracks.find((t) => t.id === 'v1' && t.type === 'video');
  if (!vTrack) return '';
  const clips = vTrack.clips as unknown as Array<{
    assetId: string;
    shotIndex?: number;
    note?: string;
    sourceStart: number;
    sourceEnd: number;
    meta?: { characters?: string[]; productionShotId?: string; productionVersionId?: string };
  }>;
  if (clips.length === 0) return '';
  const lines: string[] = [
    '| # | 镜号 | 角色 | 素材 ID | 入→出 (s) | 备注 |',
    '|:-:|:---:|:---|:---|:---:|:---|',
  ];
  clips.forEach((c, i) => {
    const shot = c.shotIndex != null ? String(c.shotIndex) : '—';
    const chars = Array.isArray(c.meta?.characters) && c.meta!.characters!.length > 0
      ? c.meta!.characters!.join(',')
      : '—';
    const note = (c.note ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
    lines.push(
      `| ${i + 1} | ${shot} | ${chars} | ${c.assetId.slice(0, 12)} | ${c.sourceStart.toFixed(1)}→${c.sourceEnd.toFixed(1)} | ${note} |`,
    );
  });
  return lines.join('\n');
}

// ─── Build 阶段 prompt（纯 JSON 输出，极简）───────────────────────────────────

function buildBuildSystemPrompt(ctx: {
  projectId: string;
  fps: number;
  aspectRatio: string;
}): string {
  return `你是 JSON 生成器。把用户给出的「剪辑选段方案」转换为 TimelineProject JSON。

仅输出合法 JSON，不要 markdown 代码块，不要解释文字。

输出格式：
{
  "summary": "从选段方案中复制 SUMMARY 内容",
  "project": {
    "id": "${ctx.projectId}",
    "fps": ${ctx.fps},
    "aspectRatio": "${ctx.aspectRatio}",
    "durationSec": (最后一个 clip 的 timelineStart + 其时长),
    "mix": { "sourceAudio": 1, "bgm": 0 },
    "tracks": [
      {
        "id": "v1",
        "kind": "video",
        "clips": [
          {
            "id": "clip-1",
            "assetId": "(素材 ID)",
            "sourceStart": (秒),
            "sourceEnd": (秒),
            "timelineStart": (秒，首个=0，后续=前一个结束时间),
            "speed": 1,
            "shotIndex": 1,
            "note": "(用途说明)"
          }
        ]
      },
      { "id": "a1", "kind": "audio", "clips": [] }
    ]
  }
}

规则：
- clips 按 timelineStart 顺序排列，首尾衔接
- sourceEnd > sourceStart，每段时长 = sourceEnd - sourceStart
- durationSec = 最后一个 clip 的 timelineStart + 该 clip 时长
- clip id 从 clip-1 递增`;
}

// ─── 旧版单阶段 prompt（作为 fallback 保留）───────────────────────────────────

function buildLegacySystemPrompt(ctx: {
  targetTimelineSec: number;
  combatLike: boolean;
  hasCandidates: boolean;
  requestedRole?: string;
  narrativeTemplate?: NarrativeTemplate;
}): string {
  return `你是「剪辑 Agent」，根据用户指令从已选素材规划时间轴。

## 输出格式（仅 JSON，勿 markdown code block）
{"summary": "中文：选段理由", "project": { ... TimelineProject ... }}

## project 结构
- tracks 含 video 轨 v1（clips 数组）与 audio 轨 a1（空 clips）。
- 仅可使用 selectedAssetIds 中的 asset id。
- VideoClip 字段：id, assetId, sourceStart, sourceEnd, timelineStart, speed(=1), shotIndex, note。
- sourceStart/sourceEnd 在 [0, 素材 durationSec] 内且必须落在某个 candidateWindow 范围内。
- clips 按 timelineStart 顺序首尾衔接，durationSec = 最后 clip 结束时间。
- 成片总时长目标约 ${ctx.targetTimelineSec} 秒（±2s）。
${ctx.combatLike ? '- 战斗混剪：优先选 score 高的候选窗，快切（1-3s）为主，间插中长镜避免疲劳。' : ''}
${ctx.requestedRole ? `- 用户指定角色：${ctx.requestedRole}。` : ''}
${ctx.narrativeTemplate ? `- 叙事结构「${ctx.narrativeTemplate.name}」：${ctx.narrativeTemplate.slots.map((s) => `${s.role}(${s.durationHint})`).join(' → ')}` : ''}`;
}

function buildUserPayload(
  input: EditorAgentApplyInput,
  extra: {
    candidateWindows: CandidateWindow[];
    targetTimelineSec: number;
    combatLike: boolean;
    analysisMode: string;
    requestedRole?: string;
  },
): string {
  return JSON.stringify(
    {
      userMessage: input.userMessage,
      aspectRatio: input.aspectRatio,
      selectedAssetIds: input.selectedAssetIds,
      assets: input.assets,
      currentProject: input.currentProject,
      candidateWindows: extra.candidateWindows,
      targetTimelineSec: extra.targetTimelineSec,
      combatLikeIntent: extra.combatLike,
      requestedRole: extra.requestedRole,
      analysisPipeline: extra.analysisMode,
      visionFocus: input.visionFocus,
    },
    null,
    2,
  );
}

function clampClip(c: VideoClip, maxDur: number): VideoClip {
  let { sourceStart, sourceEnd } = c;
  const max = Math.max(0.1, maxDur);
  sourceStart = Math.max(0, Math.min(sourceStart, max - 0.05));
  sourceEnd = Math.max(sourceStart + 0.1, Math.min(sourceEnd, max));
  return { ...c, sourceStart, sourceEnd };
}

/** 将片段源区间约束到某一候选窗内（与候选中心最近者） */
function snapClipToCandidateWindows(vc: VideoClip, windows: CandidateWindow[]): VideoClip {
  if (windows.length === 0) return vc;
  const list = windows.filter((w) => w.assetId === vc.assetId);
  if (list.length === 0) return vc;
  const mid = (vc.sourceStart + vc.sourceEnd) / 2;
  let host = list[0]!;
  let best = Infinity;
  for (const w of list) {
    const c = (w.sourceStart + w.sourceEnd) / 2;
    const dist = Math.abs(c - mid);
    if (dist < best) {
      best = dist;
      host = w;
    }
  }
  const inner = list.find((w) => mid >= w.sourceStart && mid <= w.sourceEnd);
  if (inner) host = inner;

  let s = Math.max(vc.sourceStart, host.sourceStart);
  let e = Math.min(vc.sourceEnd, host.sourceEnd);
  if (e - s < 0.12) {
    s = host.sourceStart;
    e = Math.min(host.sourceEnd, host.sourceStart + Math.max(0.35, vc.sourceEnd - vc.sourceStart));
  }
  return { ...vc, sourceStart: s, sourceEnd: e };
}

/** 校验并修正 LLM 输出的工程 */
export function sanitizeAgentProject(
  raw: TimelineProject,
  allowedIds: Set<string>,
  durationByAssetId: Map<string, number>,
  candidateWindows?: CandidateWindow[],
): TimelineProject {
  const tracks: Track[] = raw.tracks.map((t) => {
    if (t.type !== 'video') return t;
    const clips: VideoClip[] = [];
    for (const c of t.clips) {
      const vc = c as VideoClip;
      if (!allowedIds.has(vc.assetId)) continue;
      const maxDur = durationByAssetId.get(vc.assetId) ?? 300;
      let next = clampClip(vc, maxDur);
      if (candidateWindows && candidateWindows.length > 0) {
        next = snapClipToCandidateWindows(next, candidateWindows);
        next = clampClip(next, maxDur);
      }
      const shotIndex =
        typeof vc.shotIndex === 'number' && Number.isFinite(vc.shotIndex)
          ? Math.round(vc.shotIndex)
          : undefined;
      const note =
        typeof vc.note === 'string' ? vc.note.slice(0, 800) : undefined;
      const transitionAfter =
        vc.transitionAfter === 'crossfade' ? ('crossfade' as const) : undefined;
      clips.push({
        ...next,
        ...(shotIndex != null && shotIndex > 0 ? { shotIndex } : {}),
        ...(note ? { note } : {}),
        ...(transitionAfter ? { transitionAfter } : {}),
      });
    }
    clips.sort((a, b) => a.timelineStart - b.timelineStart);
    return { ...t, clips };
  });

  let durationSec = 0;
  for (const t of tracks) {
    for (const c of t.clips) {
      // TextClip 用 timelineEnd，VideoClip/AudioClip 用 timelineStart + 源区间
      const end = 'timelineEnd' in c
        ? (c as { timelineEnd: number }).timelineEnd
        : c.timelineStart + ((c as { sourceEnd: number; sourceStart: number }).sourceEnd - (c as { sourceStart: number }).sourceStart);
      if (end > durationSec) durationSec = end;
    }
  }

  return {
    ...raw,
    tracks,
    durationSec,
  };
}

/** 剪辑管线进度（用于 SSE / UI）；percent 0–100；etaSec 为粗估剩余秒数（启发式） */
export type EditorAgentProgressPayload = {
  stage: string;
  percent: number;
  message: string;
  etaSec?: number;
};

function roughTotalMsForApply(assetCount: number): number {
  const n = Math.max(1, assetCount);
  return 50000 + n * 38000;
}

function etaSecFromPercent(percent: number, roughTotalMs: number): number {
  const remaining = Math.max(0, (1 - Math.min(100, percent) / 100) * roughTotalMs);
  return Math.max(5, Math.round(remaining / 1000));
}

export interface RunEditorAgentApplyOptions {
  onProgress?: (p: EditorAgentProgressPayload) => void;
  username?: string;
}

export async function runEditorAgentApply(
  input: EditorAgentApplyInput,
  options?: RunEditorAgentApplyOptions,
): Promise<{
  summary: string;
  project: TimelineProject;
  llmUsage: { byCall: LlmUsageCallRecord[]; totals: CompassChatUsage };
}> {
  const onProgress = options?.onProgress;
  const report = (p: EditorAgentProgressPayload) => onProgress?.(p);

  const roughTotal = roughTotalMsForApply(input.assets.length);
  const eta = (pct: number) => etaSecFromPercent(pct, roughTotal);

  const allowed = new Set(input.assets.map((a) => a.id));
  const durationMap = new Map(input.assets.map((a) => [a.id, a.durationSec]));

  const usageRecords: LlmUsageCallRecord[] = [];
  const usageSink = (stage: string, usage: CompassChatUsage | undefined) => {
    usageRecords.push({ stage, usage });
  };

  let effectiveUserMessage = input.userMessage;
  const combatLike = isCombatLikeIntent(effectiveUserMessage);
  const parsedTarget = parseTargetTimelineSec(effectiveUserMessage);
  let targetTimelineSec = parsedTarget ?? 30;

  if (looksLikeAovRequest(effectiveUserMessage)) {
    try {
      const rules = await getActiveAovRuleset();
      const aov = buildAovDslPlan(effectiveUserMessage, rules);
      targetTimelineSec = aov.plan.durationSec;
      effectiveUserMessage = `${effectiveUserMessage}

[AOV DSL 约束]
- durationSec=${aov.plan.durationSec}
- aspectRatio=${aov.plan.aspectRatio}
- structure=${aov.plan.structure.join('>')}
- mustEvents=${aov.plan.mustEvents.join(',')}
- style=${aov.plan.style.join(',')}
- rulesetVersion=${rules.version}`;
      if (aov.warnings.length > 0) {
        effectiveUserMessage += `\n- warnings=${aov.warnings.join(' | ')}`;
      }
    } catch (e) {
      console.warn('[editor agent] aov plan fallback', e);
    }
  }

  report({
    stage: 'prepare',
    percent: 2,
    message: '准备剪辑参数与候选策略…',
    etaSec: eta(2),
  });

  const analysisMode = resolveEditorAnalysisMode();
  const candidateWindows: CandidateWindow[] = [];
  /** 收集各素材的视觉评分，用于构建内容地图（方向2） */
  const scoresByAsset = new Map<string, VisionFrameScore[]>();
  const nAssets = Math.max(1, input.assets.length);
  const taxonomy = loadGameTaxonomy();
  const availableRoles = taxonomy.roles ?? [];
  const roleResolve = resolveRequestedRoleStrict(input.userMessage, availableRoles);
  const requestedRole = roleResolve.requestedRole;

  if (roleResolve.needConfirm) {
    throw new Error(
      `未找到与参考角色目录完全一致的命名。你要找的角色是不是：${(roleResolve.suggestRoles ?? []).join(' / ')}？请在指令里使用完全一致的角色名。`,
    );
  }

  for (let i = 0; i < input.assets.length; i++) {
    const a = input.assets[i];
    const pctStart = 5 + Math.round((i / nAssets) * 40);
    report({
      stage: 'analyze',
      percent: Math.min(44, pctStart),
      message: `正在分析素材「${a.originalName}」…（${i + 1}/${input.assets.length}）`,
      etaSec: eta(5 + Math.round(((i + 0.5) / nAssets) * 40)),
    });

    const d = Math.max(0.2, a.durationSec);
    let wins: CandidateWindow[] = [];
    const abs = getEditorAssetAbsolutePath(a.id);
    if (analysisMode !== 'off' && abs) {
      try {
        const r = await analyzeSingleAssetVideo(
          abs,
          a.id,
          d,
          analysisMode,
          effectiveUserMessage,
          targetTimelineSec,
          usageSink,
          input.visionFocus,
        );
        wins = r.windows;
        // 收集视觉评分用于构建内容地图（方向2）
        if (r.visionDetail?.scores?.length) {
          scoresByAsset.set(a.id, r.visionDetail.scores);
        }
        // 针对“盗贼战斗高光”等意图：优先注入视觉识别出的战斗主体窗，避免只靠能量/中段启发式。
        if (combatLike && r.visionDetail?.scores?.length) {
          const intentWins = buildIntentPriorityWindows(
            a.id,
            d,
            requestedRole,
            r.visionDetail.scores,
          );
          if (intentWins.length) {
            wins = [...intentWins, ...wins];
          }
        }
      } catch (e) {
        const code = (e as { code?: string } | undefined)?.code;
        if (code === 'NO_AUDIO_STREAM') {
          console.info(`[editor agent] analyzeSingleAssetVideo ${a.id}: 素材无音频轨，已降级为视觉分析`);
        } else {
          console.warn('[editor agent] analyzeSingleAssetVideo', a.id, e);
        }
      }
    }
    if (wins.length === 0) {
      let uw = buildUniformCandidateWindows(a.id, d);
      if (combatLike) {
        uw = prioritizeCenterWindows(uw, d);
      }
      wins = uw;
    }
    candidateWindows.push(...wins);

    const pctDone = 5 + Math.round(((i + 1) / nAssets) * 40);
    report({
      stage: 'analyze',
      percent: Math.min(45, pctDone),
      message: `素材「${a.originalName}」候选段已就绪`,
      etaSec: eta(pctDone),
    });
  }

  // 音乐先行：若项目已有 BGM 且节拍分析功能开启，注入节拍结构约束
  let beatInfo: BeatInfo | null = null;
  if (isBeatAnalysisEnabled()) {
    const bgmAssetId = findBgmAssetId(input.currentProject);
    if (bgmAssetId) {
      const bgmPath = getEditorAssetAbsolutePath(bgmAssetId);
      if (bgmPath) {
        report({ stage: 'beat', percent: 47, message: '分析 BGM 节拍结构…', etaSec: eta(47) });
        beatInfo = await analyzeMusicBeat(bgmPath);
        if (beatInfo) {
          console.log(`[editor agent] beat analysis done: BPM=${beatInfo.bpm}, sections=${beatInfo.sections.length}`);
        }
      }
    }
  }

  // 方向2：构建内容地图 + 选择叙事模板
  const contentManifest = buildContentManifest(scoresByAsset, input.assets);
  const narrativeTemplate = selectNarrativeTemplate(combatLike, beatInfo != null);

  const prefUsername = options?.username || 'default';
  const userPreferenceSnippet = await buildPreferencePromptSnippet(prefUsername).catch(() => '');
  const models = getEditorAgentModels();

  // 候选窗只传 top 20，减少 token 消耗
  const topWindows = candidateWindows.slice(0, 20);

  const userPayloadForPlan = JSON.stringify({
    userMessage: effectiveUserMessage,
    aspectRatio: input.aspectRatio,
    selectedAssetIds: input.selectedAssetIds,
    assets: input.assets,
    candidateWindows: topWindows,
    targetTimelineSec,
    combatLikeIntent: combatLike,
    requestedRole,
  }, null, 2);

  // ─── 阶段 1: Plan（自然语言选段方案）────────────────────────────────────────

  report({
    stage: 'plan',
    percent: 48,
    message: `正在规划剪辑方案（${models.plan}）…`,
    etaSec: eta(48),
  });

  const beatGuideBlock = beatInfo ? formatBeatGuideBlock(beatInfo) : '';
  const currentClipsMetaBlock = formatCurrentClipsMetaBlock(input.currentProject);

  const planSystemPrompt = buildPlanSystemPrompt({
    targetTimelineSec,
    combatLike,
    narrativeTemplate,
    beatInfo,
    userPreferenceSnippet: userPreferenceSnippet || undefined,
    contentManifest,
    beatGuide: beatGuideBlock,
    currentClipsMetaBlock,
  });

  /**
   * Plan 阶段失败不再直接抛出，改为"跳过 Build，直接走 Legacy 单阶段兜底"，
   * 保证 Agent 在 Gemini 返回空 / safety filter / 偶发网关异常时依然能出结果，
   * 避免前端看到 "network error" / "Compass Gemini 返回内容为空"。
   */
  let planText = '';
  let planFailed = false;
  try {
    const planCall = await compassChatCompletionWithUsage({
      systemPrompt: planSystemPrompt,
      userText: userPayloadForPlan,
      temperature: 0.3,
      maxTokens: 2048,
      model: models.plan,
    });
    planText = planCall.text;
    usageSink('editor_plan', planCall.usage);
    console.log(`[editor agent] Plan complete (${models.plan}), length=${planText.length}`);
  } catch (e) {
    planFailed = true;
    console.warn(`[editor agent] Plan 阶段失败，将跳过 Build 直接走 Legacy 兜底: ${e instanceof Error ? e.message : String(e)}`);
    report({
      stage: 'plan_fallback',
      percent: 65,
      message: '规划模型暂时不可用，切换到兜底剪辑方案…',
      etaSec: eta(65),
    });
  }

  // ─── 阶段 2: Build（Plan → JSON）──────────────────────────────────────────

  report({
    stage: 'build',
    percent: 70,
    message: `正在生成时间轴 JSON（${models.build}）…`,
    etaSec: eta(70),
  });

  const buildSystemPrompt = buildBuildSystemPrompt({
    projectId: input.currentProject.id,
    fps: input.currentProject.fps ?? 30,
    aspectRatio: input.currentProject.aspectRatio ?? '16:9',
  });

  const buildUserText = `以下是剪辑策划师输出的选段方案，请转换为 TimelineProject JSON：

${planText}`;

  let parsed: { summary?: string; project?: TimelineProject } | null = null;

  // Plan 失败时跳过 Build 两次尝试，直接进入 Legacy 兜底，节省 1-2 次无谓调用。
  const buildAttempts: Array<{ model: string; label: string }> = planFailed
    ? []
    : [
        { model: models.build, label: 'build' },
        { model: models.fallback, label: 'fallback' },
      ];

  for (const attempt of buildAttempts) {
    try {
      const { text: rawText, usage: buildUsage } = await compassChatCompletionWithUsage({
        systemPrompt: buildSystemPrompt,
        userText: buildUserText,
        temperature: 0.1,
        maxTokens: 4096,
        responseFormat: { type: 'json_object' },
        model: attempt.model,
      });
      usageSink(`editor_build_${attempt.label}`, buildUsage);

      const extracted = extractJson(rawText);
      try {
        parsed = JSON.parse(extracted) as { summary?: string; project?: TimelineProject };
      } catch {
        try {
          parsed = JSON.parse(repairJson(extracted)) as { summary?: string; project?: TimelineProject };
          console.warn(`[editor agent] JSON repair succeeded (${attempt.model})`);
        } catch {
          console.warn(`[editor agent] JSON parse failed (${attempt.model}), snippet: ${rawText.slice(0, 200).replace(/\n/g, '↵')}`);
          parsed = null;
        }
      }

      if (parsed?.project && typeof parsed.project === 'object') {
        console.log(`[editor agent] Build succeeded with ${attempt.model}`);
        break;
      }
      parsed = null;
    } catch (e) {
      console.warn(`[editor agent] Build attempt ${attempt.model} error: ${e instanceof Error ? e.message : String(e)}`);
      parsed = null;
    }

    // 下一轮重试前报进度
    if (attempt.label === 'build') {
      report({
        stage: 'build_retry',
        percent: 80,
        message: `JSON 生成失败，正在用备选模型（${models.fallback}）重试…`,
        etaSec: eta(80),
      });
    }
  }

  // 两个 Build 模型都失败 → 最后兜底：用 legacy 单阶段 prompt 直接生成
  if (!parsed?.project) {
    report({
      stage: 'build_legacy',
      percent: 85,
      message: `两阶段失败，正在用兜底方案生成…`,
      etaSec: eta(85),
    });

    const legacyPrompt = buildLegacySystemPrompt({
      targetTimelineSec,
      combatLike,
      hasCandidates: candidateWindows.length > 0,
      requestedRole,
      narrativeTemplate,
    });

    const { text: legacyRaw, usage: legacyUsage } = await compassChatCompletionWithUsage({
      systemPrompt: legacyPrompt,
      userText: userPayloadForPlan,
      temperature: 0.15,
      maxTokens: 4096,
      responseFormat: { type: 'json_object' },
      model: models.fallback,
    });
    usageSink('editor_build_legacy', legacyUsage);

    const legacyExtracted = extractJson(legacyRaw);
    try {
      parsed = JSON.parse(legacyExtracted) as { summary?: string; project?: TimelineProject };
    } catch {
      try {
        parsed = JSON.parse(repairJson(legacyExtracted)) as { summary?: string; project?: TimelineProject };
      } catch {
        const snippet = legacyRaw.slice(0, 300).replace(/\n/g, '↵');
        console.error('[editor agent] All 3 attempts failed, raw snippet:', snippet);
        throw new Error(`剪辑模型三次生成均失败。最后一次输出片段：${snippet}`);
      }
    }
  }

  report({
    stage: 'parse',
    percent: 88,
    message: '正在解析模型输出…',
    etaSec: eta(88),
  });

  if (!parsed!.project || typeof parsed!.project !== 'object') {
    throw new Error('模型输出 JSON 缺少 project 字段');
  }

  const agentResult = parsed!;
  const summary =
    typeof agentResult.summary === 'string' && agentResult.summary.trim()
      ? agentResult.summary.trim()
      : '已根据指令更新时间轴。';

  /**
   * 合并策略（改进版）：
   *
   * Agent 主要负责视频剪接，但若用户工程里 BGM / 文字 / 字幕仍是空的，
   * 接受 Agent 的补充是合理的；一旦用户亲手配了内容（任一非空），就必须保留。
   *
   * 轨道级规则：
   *   - v1（视频）：Agent 非空 → 采用 Agent；否则保留
   *   - a1（原声镜像）：Agent 存在即采用（与 v1 对齐，由下游 sanitize 再校正）
   *   - a2（BGM）：当前为空 → Agent 非空则采用；当前非空 → 保留
   *   - t1（文字）：当前为空 → Agent 非空则采用；当前非空 → 保留
   *   - subtitles：当前为空 → Agent 非空则采用；当前非空 → 保留
   *   - mix：始终保留用户的 mix（若 Agent 返回非空也不覆盖，避免破坏用户调过的音量比）
   */
  /**
   * Legacy 兜底模型偶发会把 tracks 生成成非数组形态（object / null / 字符串 JSON）。
   * 这里做严格的形状校验，任何非数组都归一化为 []，避免 `tracks.find is not a function`。
   * 每个 track 的 clips 也强制成数组。
   */
  const rawAgentTracks = agentResult.project!.tracks;
  const agentTracks = Array.isArray(rawAgentTracks) ? rawAgentTracks : [];
  for (const t of agentTracks) {
    if (!Array.isArray((t as { clips?: unknown }).clips)) {
      (t as { clips: unknown[] }).clips = [];
    }
  }
  if (!Array.isArray(rawAgentTracks)) {
    console.warn('[editor agent] agentResult.project.tracks 不是数组，已归一化为空数组。原值:', typeof rawAgentTracks);
  }
  const agentV1 = agentTracks.find((t) => t.type === 'video' && t.id === 'v1');
  const agentA1 = agentTracks.find((t) => t.type === 'audio' && t.id === 'a1');
  const agentA2 = agentTracks.find((t) => t.type === 'audio' && t.id === 'a2');
  const agentT1 = agentTracks.find((t) => t.type === 'text' && t.id === 't1');

  const mergedTracks = input.currentProject.tracks.map((t) => {
    if (t.type === 'video' && t.id === 'v1') {
      if (agentV1 && agentV1.clips.length > 0) return agentV1;
      return t;
    }
    if (t.type === 'audio' && t.id === 'a1') {
      if (agentA1) return agentA1;
      return t;
    }
    if (t.type === 'audio' && t.id === 'a2') {
      // 用户 a2 为空 → 允许 Agent 填 BGM；用户已有 BGM → 保留
      if ((t.clips?.length ?? 0) === 0 && agentA2 && agentA2.clips.length > 0) return agentA2;
      return t;
    }
    if (t.type === 'text' && t.id === 't1') {
      if ((t.clips?.length ?? 0) === 0 && agentT1 && agentT1.clips.length > 0) return agentT1;
      return t;
    }
    return t;
  });

  const userHasSubtitles = (input.currentProject.subtitles?.length ?? 0) > 0;
  const rawAgentSubtitles = agentResult.project!.subtitles;
  const agentSubtitles = Array.isArray(rawAgentSubtitles) ? rawAgentSubtitles : undefined;
  const mergedSubtitles = userHasSubtitles
    ? input.currentProject.subtitles
    : (agentSubtitles && agentSubtitles.length > 0 ? agentSubtitles : input.currentProject.subtitles);

  const merged: TimelineProject = {
    ...input.currentProject,
    id: input.currentProject.id,
    aspectRatio: agentResult.project!.aspectRatio ?? input.currentProject.aspectRatio,
    durationSec: agentResult.project!.durationSec ?? input.currentProject.durationSec,
    fps: agentResult.project!.fps ?? input.currentProject.fps,
    tracks: mergedTracks,
    mix: input.currentProject.mix,
    subtitles: mergedSubtitles,
    sourceProductionProjectId: input.currentProject.sourceProductionProjectId,
    sourceProductionTitle: input.currentProject.sourceProductionTitle,
  };

  report({
    stage: 'sanitize',
    percent: 92,
    message: '校验片段与候选窗对齐…',
    etaSec: eta(92),
  });

  /**
   * 终极兜底：若模型返回或合并后 v1 轨仍为空（completion 过短、Plan/Build 都没挑出片段），
   * 用均分候选窗按目标时长按素材轮流采样填充，保证用户一定看到一条可编辑的初稿。
   * 这比"200 success 但时间轴空白"好得多（后者会让用户困惑为什么消耗了 token 却没结果）。
   */
  const v1BeforeSanitize = merged.tracks.find((t) => t.type === 'video' && t.id === 'v1');
  const v1BeforeClips = v1BeforeSanitize?.clips ?? [];
  if (v1BeforeClips.length === 0) {
    if (candidateWindows.length === 0) {
      throw new Error('剪辑失败：Agent 未挑出任何片段，且候选窗不足以兜底。请更换素材或重新发送更具体的指令。');
    }
    console.warn(`[editor agent] merged v1 clips 为空（Agent 未输出选段），启动均分候选窗兜底，候选窗数=${candidateWindows.length}，目标时长=${targetTimelineSec}s`);
    report({
      stage: 'fallback_fill',
      percent: 94,
      message: `模型未挑出片段，自动用均分候选段填满 ${targetTimelineSec} 秒…`,
      etaSec: 6,
    });

    // 按 asset 分桶，轮流抽窗；每段目标 2.5–4s，最后一段裁到不超过 targetTimelineSec
    const byAsset = new Map<string, CandidateWindow[]>();
    for (const w of candidateWindows) {
      if (!byAsset.has(w.assetId)) byAsset.set(w.assetId, []);
      byAsset.get(w.assetId)!.push(w);
    }
    const assetIds = Array.from(byAsset.keys());
    const iters: number[] = assetIds.map(() => 0);
    const fallbackVideoClips: VideoClip[] = [];
    let timelineStart = 0;
    let guard = 0;
    while (timelineStart < targetTimelineSec && guard++ < 60) {
      let picked: CandidateWindow | null = null;
      for (let k = 0; k < assetIds.length; k++) {
        const ai = (guard - 1 + k) % assetIds.length;
        const aid = assetIds[ai]!;
        const wlist = byAsset.get(aid)!;
        if (iters[ai]! < wlist.length) {
          picked = wlist[iters[ai]!]!;
          iters[ai]! += 1;
          break;
        }
      }
      if (!picked) break;
      const rawDur = picked.sourceEnd - picked.sourceStart;
      const wantDur = Math.min(rawDur, 3.2, targetTimelineSec - timelineStart);
      if (wantDur < 0.4) break;
      fallbackVideoClips.push({
        id: `fb_v_${Date.now()}_${fallbackVideoClips.length}`,
        assetId: picked.assetId,
        sourceStart: Math.round(picked.sourceStart * 100) / 100,
        sourceEnd: Math.round((picked.sourceStart + wantDur) * 100) / 100,
        timelineStart: Math.round(timelineStart * 100) / 100,
      } as VideoClip);
      timelineStart += wantDur;
    }

    if (fallbackVideoClips.length === 0) {
      throw new Error('剪辑失败：候选窗均无法产出有效片段，请检查素材。');
    }

    // 镜像生成 a1 原声轨（与 v1 等长等位）
    const fallbackAudioClips: AudioClip[] = fallbackVideoClips.map((vc, i) => ({
      id: `fb_a_${Date.now()}_${i}`,
      assetId: vc.assetId,
      sourceStart: vc.sourceStart,
      sourceEnd: vc.sourceEnd,
      timelineStart: vc.timelineStart,
      gain: 1,
    } as AudioClip));

    merged.tracks = merged.tracks.map((t) => {
      if (t.type === 'video' && t.id === 'v1') {
        return { ...t, clips: fallbackVideoClips } as Track;
      }
      if (t.type === 'audio' && t.id === 'a1') {
        return { ...t, clips: fallbackAudioClips } as Track;
      }
      return t;
    });
    merged.durationSec = timelineStart;
  }

  const sanitized = sanitizeAgentProject(merged, allowed, durationMap, candidateWindows);

  // 最终再校验一次：sanitize 后可能因 allowed/durationMap 过滤掉所有 clip
  const v1Final = sanitized.tracks.find((t) => t.type === 'video' && t.id === 'v1');
  if (!v1Final || v1Final.clips.length === 0) {
    throw new Error('剪辑失败：所有候选片段在校验阶段被过滤。请确认素材仍在资产库中，或重新发送指令。');
  }

  report({
    stage: 'done',
    percent: 100,
    message: '剪辑方案已生成',
    etaSec: 0,
  });

  return {
    summary,
    project: sanitized,
    llmUsage: { byCall: usageRecords, totals: sumCompassUsage(usageRecords) },
  };
}
