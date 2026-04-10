import type { AspectRatioPreset, TimelineProject, Track, VideoClip } from '../editor/timelineSchema.js';
import { compassChatCompletionWithUsage, type CompassChatUsage } from './promptPolish.js';
import { sumCompassUsage, type LlmUsageCallRecord } from './editorLlmUsage.js';
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
  const candidates = scores
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

function extractJson(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  return s.trim();
}

function buildSystemPrompt(ctx: {
  targetTimelineSec: number;
  combatLike: boolean;
  hasCandidates: boolean;
  requestedRole?: string;
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

  const combatLike = isCombatLikeIntent(input.userMessage);
  const parsedTarget = parseTargetTimelineSec(input.userMessage);
  const targetTimelineSec = parsedTarget ?? 30;

  report({
    stage: 'prepare',
    percent: 2,
    message: '准备剪辑参数与候选策略…',
    etaSec: eta(2),
  });

  const analysisMode = resolveEditorAnalysisMode();
  const candidateWindows: CandidateWindow[] = [];
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
          input.userMessage,
          targetTimelineSec,
          usageSink,
          input.visionFocus,
        );
        wins = r.windows;
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

  const systemPrompt = buildSystemPrompt({
    targetTimelineSec,
    combatLike,
    hasCandidates: candidateWindows.length > 0,
    requestedRole,
  });

  const userText = buildUserPayload(
    input,
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
  });
  usageSink('editor_agent', agentUsage);

  report({
    stage: 'llm',
    percent: 82,
    message: '正在解析模型输出…',
    etaSec: eta(82),
  });

  let parsed: { summary?: string; project?: TimelineProject };
  try {
    parsed = JSON.parse(extractJson(rawText)) as { summary?: string; project?: TimelineProject };
  } catch {
    throw new Error('模型返回不是合法 JSON');
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
