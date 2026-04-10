/**
 * 抽帧 + Gemini 多模态打分 → 高光候选时间段（按分数与互不重叠贪心选取）。
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { getFfmpegPath } from './ffmpegPaths.js';
import { compassChatCompletionWithContentWithUsage } from '../promptPolish.js';
import { buildReferenceAnchorParts, formatTaxonomyForPrompt, loadGameTaxonomy, } from './gameTaxonomy.js';
function extractJsonArray(s) {
    const m = s.match(/\[[\s\S]*\]/);
    if (!m)
        throw new Error('模型未返回 JSON 数组');
    return JSON.parse(m[0]);
}
async function extractOneJpeg(videoPath, tSec, outPath) {
    const ffmpeg = getFfmpegPath();
    await new Promise((resolve, reject) => {
        const ff = spawn(ffmpeg, [
            '-hide_banner',
            '-loglevel',
            'error',
            '-ss',
            String(tSec),
            '-i',
            videoPath,
            '-vframes',
            '1',
            '-vf',
            'scale=768:-2',
            '-q:v',
            '3',
            outPath,
        ], { windowsHide: true });
        ff.on('close', (code) => {
            if (code !== 0)
                reject(new Error(`抽帧失败 t=${tSec}`));
            else
                resolve();
        });
        ff.on('error', reject);
    });
}
/**
 * 在时间轴上**均匀**取若干帧（不是固定 Hz，随总长变）。
 * 等价「平均间隔」≈ duration / (帧数+1)。
 * 调参：EDITOR_VISION_MIN_INTERVAL_SEC、EDITOR_VISION_MAX_FRAMES、EDITOR_VISION_FRAMES_PER_MINUTE
 */
export function pickFrameTimes(durationSec) {
    const d = Math.max(0.5, durationSec);
    /** 默认更密采样，便于判断片段在做什么；成本与 MAX_FRAMES 成正比 */
    const maxCap = Math.min(96, Math.max(12, Number(process.env.EDITOR_VISION_MAX_FRAMES || 56)));
    const minInterval = Math.max(0.55, Number(process.env.EDITOR_VISION_MIN_INTERVAL_SEC || 1.0));
    const fpmRaw = process.env.EDITOR_VISION_FRAMES_PER_MINUTE?.trim();
    let n;
    if (fpmRaw && Number(fpmRaw) > 0) {
        n = Math.ceil((d / 60) * Number(fpmRaw));
    }
    else {
        n = Math.floor(d / minInterval);
    }
    n = Math.min(maxCap, Math.max(8, n));
    const step = d / (n + 1);
    const times = [];
    for (let i = 1; i <= n; i++) {
        times.push(Math.min(d - 0.1, i * step));
    }
    return times;
}
async function scoreBatch(batch, userIntent, referenceAnchors, usageSink, batchIndex) {
    const tax = loadGameTaxonomy();
    const taxBlock = formatTaxonomyForPrompt(tax);
    const rogueIntent = /盗贼|潜行者|刺客|rogue|thief|assassin/i.test(userIntent);
    const combatIntent = /战斗|打斗|高光|击杀|对决|激战|combat|fight|battle|boss|pvp/i.test(userIntent);
    const intentRule = rogueIntent || combatIntent
        ? `\n额外打分约束（按用户意图）：
- 当前意图偏向「${[rogueIntent ? '盗贼主体' : '', combatIntent ? '战斗高光' : ''].filter(Boolean).join(' + ')}」。
- 若画面明确是战斗/交火/击杀瞬间，应提高 score（通常 >=7）。
- 若画面主体明显不是目标（如非盗贼、非战斗、静态 UI/菜单），应降低 score（通常 <=4）。`
        : '';
    const intro = `用户剪辑意图：${userIntent || '高光/精彩镜头'}

${taxBlock}
${intentRule}

以下 ${batch.length} 张图按时间顺序对应时间戳（秒）：${batch.map((b) => b.tSec.toFixed(2)).join(', ')}
请输出 **仅一个** JSON 数组，每项字段：
- tSec: number（须与上列对应时间一致，允许小数点后两位）
- score: number，0–10，综合「剪辑价值」：动作/战斗/冲突/视觉冲击；静态 UI、加载、纯对话可给低分
- roles: string[]，0~2 个，须优先从上面「可选职业/角色标签」中选；无法判断用 []
- scene: string，单个词或短语，优先从「可选场景标签」中选，否则填「未知」
- activity: string，单个标签，优先从「可选行为标签」中选（搜打撤：搜索/打架/交互/撤退 等）；无法判断填「未知」
- note: string，可选，极短中文（画面里看到了什么）

若前面附有「参考图」，请用它与录屏帧比对后再选标签；不要 markdown，不要多余文字。`;
    const parts = [{ type: 'text', text: intro }];
    if (referenceAnchors?.length) {
        parts.push(...referenceAnchors);
    }
    for (const f of batch) {
        const buf = await fs.readFile(f.jpegPath);
        const b64 = buf.toString('base64');
        parts.push({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${b64}` },
        });
    }
    const { text: raw, usage } = await compassChatCompletionWithContentWithUsage({
        systemPrompt: `你是游戏录屏与 PV 剪辑分析助手。必须严格输出 JSON 数组。画面看不清标签时不要编造具体地名/人名，用「未知」或空数组。
若配置了职业/场景/行为列表，必须优先从列表中选标签；列表为空时自行用简短中文描述。`,
        userContent: parts,
        temperature: 0.12,
        maxTokens: 6144,
    });
    usageSink?.(`vision_batch_${batchIndex}`, usage);
    const arr = extractJsonArray(raw);
    const out = [];
    for (const row of arr) {
        if (!row || typeof row !== 'object')
            continue;
        const o = row;
        const tSec = typeof o.tSec === 'number' ? o.tSec : parseFloat(String(o.tSec));
        const score = typeof o.score === 'number' ? o.score : parseFloat(String(o.score));
        if (!Number.isFinite(tSec) || !Number.isFinite(score))
            continue;
        let roles;
        if (Array.isArray(o.roles)) {
            roles = o.roles.filter((x) => typeof x === 'string').slice(0, 3);
        }
        const scene = typeof o.scene === 'string' ? o.scene : undefined;
        const activity = typeof o.activity === 'string' ? o.activity : undefined;
        out.push({
            tSec,
            score: Math.min(10, Math.max(0, score)),
            note: typeof o.note === 'string' ? o.note : undefined,
            roles,
            scene,
            activity,
        });
    }
    return out;
}
function overlaps(a, b) {
    return !(a.endSec <= b.startSec || a.startSec >= b.endSec);
}
function pickNonOverlapping(segments, targetTotalSec, maxCount) {
    const sorted = [...segments].sort((a, b) => b.score - a.score);
    const picked = [];
    let total = 0;
    for (const s of sorted) {
        if (picked.length >= maxCount || total >= targetTotalSec * 1.02)
            break;
        const len = Math.min(14, Math.max(0.35, s.endSec - s.startSec));
        const adj = { startSec: s.startSec, endSec: s.startSec + len, score: s.score };
        if (picked.some((p) => overlaps(p, adj)))
            continue;
        picked.push(adj);
        total += len;
    }
    picked.sort((a, b) => a.startSec - b.startSec);
    return picked;
}
/** 高分帧扩成区间并贪心选取 */
export function visionScoresToSegments(scores, durationSec, targetTotalSec) {
    const d = Math.max(0.2, durationSec);
    const minScore = Number(process.env.EDITOR_VISION_SCORE_THRESHOLD || 4.5);
    const padBefore = 1.8;
    const padAfter = 4.5;
    const raw = scores
        .filter((s) => s.score >= minScore)
        .map((s) => ({
        startSec: Math.max(0, s.tSec - padBefore),
        endSec: Math.min(d, s.tSec + padAfter),
        score: s.score / 10,
    }));
    if (raw.length === 0) {
        const fallback = scores.map((s) => ({
            startSec: Math.max(0, s.tSec - 1),
            endSec: Math.min(d, s.tSec + 3),
            score: (s.score ?? 3) / 10,
        }));
        return pickNonOverlapping(fallback, targetTotalSec, 12);
    }
    return pickNonOverlapping(raw, targetTotalSec, 12);
}
/**
 * 对整段视频（或指定时间窗）抽帧并调用 Gemini（分批），返回候选能量段与抽帧元信息。
 */
export async function analyzeVisionHighlightSegments(videoPath, durationSec, userIntent, targetTotalSec, usageSink, timeRange) {
    const d = Math.max(0.2, durationSec);
    let rangeStart = 0;
    let rangeEnd = d;
    if (timeRange) {
        rangeStart = Math.max(0, Math.min(timeRange.startSec, d - 0.2));
        rangeEnd = Math.max(rangeStart + 0.2, Math.min(timeRange.endSec, d));
    }
    const winLen = rangeEnd - rangeStart;
    const timesRel = pickFrameTimes(winLen);
    const times = timesRel.map((t) => rangeStart + t);
    const approxIntervalSec = times.length > 0 ? winLen / (times.length + 1) : 0;
    const tmp = path.join(os.tmpdir(), `editor-vision-${randomUUID()}`);
    await fs.mkdir(tmp, { recursive: true });
    const frames = [];
    try {
        for (let i = 0; i < times.length; i++) {
            const tSec = times[i];
            const out = path.join(tmp, `f_${String(i).padStart(3, '0')}.jpg`);
            await extractOneJpeg(videoPath, tSec, out);
            frames.push({ tSec, jpegPath: out });
        }
        const batchSize = Math.min(8, Number(process.env.EDITOR_VISION_BATCH_SIZE || 8));
        const taxOnce = loadGameTaxonomy();
        const referenceAnchors = buildReferenceAnchorParts(taxOnce);
        /** 首批含参考图时略减录屏帧；参考图已压缩后可多放几帧录屏 */
        const firstBatchFrames = referenceAnchors.length > 0 ? Math.min(6, Math.max(3, batchSize - 2)) : batchSize;
        const allScores = [];
        let offset = 0;
        let batchIndex = 0;
        while (offset < frames.length) {
            const bs = batchIndex === 0 ? firstBatchFrames : batchSize;
            const batch = frames.slice(offset, offset + bs);
            const part = await scoreBatch(batch, userIntent, batchIndex === 0 && referenceAnchors.length > 0 ? referenceAnchors : undefined, usageSink, batchIndex);
            allScores.push(...part);
            offset += bs;
            batchIndex += 1;
        }
        const segments = visionScoresToSegments(allScores, durationSec, targetTotalSec);
        const analyzedRange = timeRange != null ? { startSec: rangeStart, endSec: rangeEnd } : undefined;
        return {
            scores: allScores,
            segments,
            meta: {
                frameCount: times.length,
                approxIntervalSec,
                durationSec: d,
                analyzedRange,
            },
        };
    }
    finally {
        await fs.rm(tmp, { recursive: true, force: true }).catch(() => { });
    }
}
