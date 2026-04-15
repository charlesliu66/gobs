import type { AspectRatioPreset, TimelineProject, Track, VideoClip, AudioClip } from '../editor/timelineSchema.js';
import { compassChatCompletionWithUsage, type CompassChatUsage } from './promptPolish.js';
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

/** 从时间轴项目中找到 audio 轨第一个 AudioClip 的 assetId（用于 BGM beat 分析） */
function findBgmAssetId(project: TimelineProject): string | null {
  for (const track of project.tracks) {
    if (track.type !== 'audio') continue;
    for (const clip of track.clips) {
      const ac = clip as Partial<AudioClip>;
      if (ac.assetId) return ac.assetId;
    }
  }
  return null;
}

function buildSystemPrompt(ctx: {
  targetTimelineSec: number;
  combatLike: boolean;
  hasCandidates: boolean;
  requestedRole?: string;
  beatInfo?: BeatInfo | null;
  contentManifest?: string;
  narrativeTemplate?: NarrativeTemplate;
}): string {
  const cand = ctx.hasCandidates
    ? `
## 候选时间段（规则层已切好，你必须在此基础上选段）
- 服务端已把每条素材**沿时间轴均分**为若干「候选窗」candidateWindows（见用户 JSON）。
- **每一条 VideoClip 的 [sourceStart, sourceEnd] 必须完全落在某一个候选窗的范围内**（可取该窗内的子区间，不可跨窗、不可超出素材时长）。
- ${ctx.combatLike ? '候选列表已把**更接近视频几何中段**的窗排在前面，请**优先**从前面的候选里挑选，以贴合常见游戏战斗节奏（仍为启发式，非真实画面识别）。' : '在候选中挑选最符合用户描述的若干段。'}
- **成片总时长**：用户目标约 **${ctx.targetTimelineSec} 秒**（时间轴多段首尾相接时的总长）。请使总长接近该值（±2 秒可接受），并在 summary 写明选了哪些时间段/候选。
`
    : '';

  return `你是「剪辑 Agent」，根据用户指令从已选素材规划时间轴。

## 诚实边界（summary 必须交代）
- 若 candidateWindows 来自「音频能量 + 抽帧多模态」混合管线，则已含启发式高光候选；**并非**人工逐帧审片。
- 若请求中带有 visionFocus（缩窗），则多模态仅在约 1 分钟左右的子区间内抽帧，候选应优先落在该时间附近。
- 若仅有均匀切段候选，你能用的是：文件名、素材时长、以及 **candidateWindows**。
${ctx.requestedRole ? `- 用户指定角色：${ctx.requestedRole}。仅当画面角色标签与该名称完全一致时才优先。` : ''}

## 输出格式（仅 JSON，勿 markdown）
{
  "summary": "中文：假设、目标时长、选段依据",
  "project": { ... TimelineProject 完整对象 ... }
}

## project 结构要求
- 保留与输入 currentProject 相同的 project.id、fps、aspectRatio（除非用户明确要求改画幅）。
- tracks 须含 video 轨 v1 与 audio 轨 a1（a1 可为空）。
- **仅可使用** selectedAssetIds 中的 asset id。
- 每个 VideoClip：sourceStart、sourceEnd 在 [0, 该素材 durationSec] 内，sourceEnd > sourceStart。
- timelineStart：多段通常顺序衔接。
- clip id 唯一。
- 可选：每个 VideoClip 可带 shotIndex（镜号，从 1 递增）与 note（一句中文说明该段取自原素材的哪类内容），便于用户微调时溯源。
- durationSec = 最后一镜结束时间。
${cand}
## 目标成片长度（时间轴）
- 用户目标总长约 **${ctx.targetTimelineSec} 秒**（若用户话里写了「20 秒」等，以解析为准）。

## 内容多样性约束（必须遵守，不得跳过）
- **行为重复**：同一 activity（一级行为）连续出现不得超过 3 次；连续 3 个战斗片段后必须穿插 ≥ 1 个非战斗片段（奔跑/探索/场景过渡等）
- **钩子优先**：时间轴第一个片段，优先选 isTurningPoint=true 或 score≥8 的片段作为开场钩子
- **收尾优先**：时间轴最后一个片段，优先选 score 最高的片段
- **片段时长建议**：combat 类（打架/击杀）建议 0.8-4s（高能快切）；非 combat 类（奔跑/探索/撤退）建议 2-6s
- **总节奏**：不要全程快切（<1s），建议混合快切与慢镜（3-5s），比例约 3:1
${ctx.beatInfo ? formatBeatGuideBlock(ctx.beatInfo) : ''}
## 切点质量规则（必须遵守）
- **动作顶点切入**：优先在 isActionPeak=true 的帧附近切入（如击杀落地、技能命中瞬间），可带来强烈爆发感
- **镜头运动多样性**：连续 5 个以上 cameraMotion=static 的片段需插入 ≥ 1 个运动镜头（pan/zoom/shake）
- **动接动原则**：运动镜头（pan/zoom/shake）后面优先接运动镜头，视觉更流畅；避免 shake→static→shake 的跳切
- **避免模糊帧作开头**：shake（抖动）帧不适合作片段起点，适合作切点本身

## 画面-音乐情绪对齐规则
*内容地图中每帧附有 tension（情绪张力 0-10）和 emotionTag（情绪标签），排片时须与 BGM 段落能量匹配：*
- **BGM high energy 段（drop）**：优先选 tension ≥ 7 且 emotionTag 为 exciting / triumphant 的片段
- **BGM mid energy 段（build）**：优先选 tension 4-6 且 emotionTag 为 tense 的片段
- **BGM low energy 段（intro/outro）**：优先选 tension ≤ 3 且 emotionTag 为 calm / sad 的片段
- **无 BGM 段落信息时**：根据叙事模板段落位置推断：高潮段 → tension ≥ 7，铺垫段 → tension 4-6，开场/收尾 → tension ≤ 4
- **强制约束**：同一段 BGM 内，画面 tension 变化幅度应≤5（避免 high energy 段出现 tension=1 的静态画面）
${ctx.narrativeTemplate ? `
## 叙事模板：「${ctx.narrativeTemplate.name}」
${ctx.narrativeTemplate.description}

**请按以下叙事结构排片**（各段时长仅为参考，总长须接近目标时长）：
${ctx.narrativeTemplate.slots.map((s, i) => `${i + 1}. **${s.role}**（${s.durationHint}）\n   内容：${s.contentHint}\n   强度：${s.intensityHint}`).join('\n')}

> 注意：叙事结构是排片指导，候选窗仍是片段选取边界，不可超出候选窗范围。
` : ''}
${ctx.contentManifest ? `
${ctx.contentManifest}

> 上述内容地图为视觉分析结果，**请参考对应时间戳在候选窗中找到最接近的片段**，按叙事模板分配到各段落。
` : ''}
## 若选中素材为空
- 在 summary 说明无法执行，project 可与 currentProject 相同或清空 v1 clips。`;
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
        console.warn('[editor agent] analyzeSingleAssetVideo', a.id, e);
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

  const systemPrompt = buildSystemPrompt({
    targetTimelineSec,
    combatLike,
    hasCandidates: candidateWindows.length > 0,
    requestedRole,
    beatInfo,
    contentManifest: contentManifest || undefined,
    narrativeTemplate,
  });

  const userText = buildUserPayload(
    { ...input, userMessage: effectiveUserMessage },
    {
      candidateWindows,
      targetTimelineSec,
      combatLike,
      analysisMode,
      requestedRole,
    },
  );

  report({
    stage: 'llm',
    percent: 48,
    message: '正在调用剪辑模型生成时间轴（Compass）…',
    etaSec: eta(48),
  });

  const { text: rawText, usage: agentUsage } = await compassChatCompletionWithUsage({
    systemPrompt,
    userText,
    temperature: 0.22,
    maxTokens: 8192,
    responseFormat: { type: 'json_object' },
  });
  usageSink('editor_agent', agentUsage);

  report({
    stage: 'llm',
    percent: 82,
    message: '正在解析模型输出…',
    etaSec: eta(82),
  });

  let parsed: { summary?: string; project?: TimelineProject };
  const extracted = extractJson(rawText);
  try {
    parsed = JSON.parse(extracted) as { summary?: string; project?: TimelineProject };
  } catch {
    // 第二层：尝试修复常见 LLM JSON 缺陷后重新解析
    try {
      parsed = JSON.parse(repairJson(extracted)) as { summary?: string; project?: TimelineProject };
      console.warn('[editor agent] JSON repair succeeded (raw had defects)');
    } catch {
      const snippet = rawText.slice(0, 300).replace(/\n/g, '↵');
      console.error('[editor agent] JSON parse failed, raw snippet:', snippet);
      throw new Error(`模型返回不是合法 JSON（已尝试自动修复）。模型原始输出片段：${snippet}`);
    }
  }

  if (!parsed.project || typeof parsed.project !== 'object') {
    throw new Error('JSON 缺少 project 字段');
  }

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : '已根据指令更新时间轴。';

  const merged: TimelineProject = {
    ...input.currentProject,
    ...parsed.project,
    id: input.currentProject.id,
    aspectRatio: parsed.project.aspectRatio ?? input.currentProject.aspectRatio,
    tracks: parsed.project.tracks?.length ? parsed.project.tracks : input.currentProject.tracks,
  };

  report({
    stage: 'sanitize',
    percent: 92,
    message: '校验片段与候选窗对齐…',
    etaSec: eta(92),
  });

  const sanitized = sanitizeAgentProject(merged, allowed, durationMap, candidateWindows);

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
