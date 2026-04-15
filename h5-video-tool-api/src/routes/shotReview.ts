/**
 * POST /shot-review — AI 单镜分镜提示词质量评审
 * POST /continuity-check — 相邻镜头连续性检查
 */
import { Router, Request, Response } from 'express';
import { compassChatCompletion } from '../services/compassLlm.js';

export const shotReviewRouter = Router();

const SHOT_REVIEW_SYSTEM = `你是一名资深分镜导演，负责评审用于 AI 视频生成（Seedance 2.0）的单镜结构化提示词。请从完整性、一致性、可执行性与行业最佳实践角度进行分析。

你必须仅输出一段合法 JSON，不要包含任何 markdown 代码块、前言或后记。JSON 结构必须严格为：
{"overallScore": number, "suggestions": [{"field": string, "currentValue": string, "suggestedValue": string, "reason": string}]}

其中 overallScore 为 1-10 的整数。

评审要点：
1. 检查 sp_subject（或 subject 等主体字段）是否足够具体，能否支撑视频生成所需的视觉信息。
2. 检查 structuredStill 中的 sp_lighting、sp_style 是否与「全局风格参考」一致或协调。
3. 检查 structuredMotion 中的 mp_camera、mp_tempo 是否足够明确、可执行。
4. 检查 mp_motion（或等价运动描述）是否包含足够的动作与节奏细节。
5. 对薄弱字段给出可落地的改写建议；suggestions 中 field 必须使用真实字段路径，例如 structuredStill.sp_lighting、structuredMotion.mp_camera、structuredMotion.mp_motion 等。`;

const CONTINUITY_SYSTEM = `你是一名影视连续性监督（Continuity Supervisor），负责检查相邻镜头之间的视觉与叙事连续性。

你必须仅输出一段合法 JSON，不要包含任何 markdown 代码块、前言或后记。JSON 结构必须严格为：
{"issues": [{"shotIndexA": number, "shotIndexB": number, "category": string, "description": string, "severity": "warning" | "error"}]}

检查维度：
1. 相邻镜头的色彩与影调（色温、对比度、整体色调）是否一致或过渡合理。
2. 角色外观（服装、发型、体型等）是否连续。
3. 场景切换与空间逻辑是否合理。
4. 动作是否在镜头间连贯（起承转合、动线）。
5. 光线方向与氛围是否一致或符合叙事意图。

shotIndexA、shotIndexB 为从 0 起的镜头下标，表示相邻的一对（如 0 与 1）。若无问题，issues 可为空数组。`;

function parseLlmJson<T>(raw: string): T {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(s) as T;
}

function buildShotUserPayload(shot: unknown, globalStyleRef?: string, projectTitle?: string): string {
  const base: Record<string, unknown> = {
    structuredStill: (shot as Record<string, unknown>)?.structuredStill,
    structuredMotion: (shot as Record<string, unknown>)?.structuredMotion,
    subject: (shot as Record<string, unknown>)?.subject,
    action: (shot as Record<string, unknown>)?.action,
    dialogue: (shot as Record<string, unknown>)?.dialogue,
    audioCue: (shot as Record<string, unknown>)?.audioCue,
    lighting: (shot as Record<string, unknown>)?.lighting,
    emotion: (shot as Record<string, unknown>)?.emotion,
    rawShot: shot,
  };
  return JSON.stringify(
    {
      projectTitle: projectTitle ?? '',
      globalStyleRef: globalStyleRef ?? '',
      shotFields: base,
    },
    null,
    2,
  );
}

function buildContinuityUserPayload(shots: unknown[], globalStyleRef?: string): string {
  const pairs: Array<{ indexA: number; indexB: number; shotA: unknown; shotB: unknown }> = [];
  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i];
    const b = shots[i + 1];
    const pick = (s: unknown) => {
      const o = s as Record<string, unknown>;
      return {
        structuredStill: o?.structuredStill,
        structuredMotion: o?.structuredMotion,
        subject: o?.subject,
        action: o?.action,
        dialogue: o?.dialogue,
        lighting: o?.lighting,
        emotion: o?.emotion,
        sp_subject: o?.sp_subject,
      };
    };
    pairs.push({
      indexA: i,
      indexB: i + 1,
      shotA: pick(a),
      shotB: pick(b),
    });
  }
  return JSON.stringify(
    {
      globalStyleRef: globalStyleRef ?? '',
      adjacentPairs: pairs,
    },
    null,
    2,
  );
}

shotReviewRouter.post('/shot-review', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      shot?: unknown;
      globalStyleRef?: string;
      projectTitle?: string;
    };
    if (body?.shot === undefined) {
      res.status(400).json({ error: '缺少必填字段 shot' });
      return;
    }

    const userText = buildShotUserPayload(body.shot, body.globalStyleRef, body.projectTitle);
    const text = await compassChatCompletion({
      systemPrompt: SHOT_REVIEW_SYSTEM,
      userText,
      temperature: 0.4,
      maxTokens: 8192,
    });

    let parsed: {
      overallScore: number;
      suggestions: Array<{
        field: string;
        currentValue: string;
        suggestedValue: string;
        reason: string;
      }>;
    };
    try {
      parsed = parseLlmJson(text);
    } catch {
      res.status(500).json({ error: 'AI 返回内容无法解析为合法 JSON' });
      return;
    }

    res.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});

shotReviewRouter.post('/continuity-check', async (req: Request, res: Response) => {
  try {
    const body = req.body as { shots?: unknown[]; globalStyleRef?: string };
    if (!Array.isArray(body?.shots) || body.shots.length < 2) {
      res.status(400).json({ error: 'shots 必须为至少包含 2 个元素的数组' });
      return;
    }

    const userText = buildContinuityUserPayload(body.shots, body.globalStyleRef);
    const text = await compassChatCompletion({
      systemPrompt: CONTINUITY_SYSTEM,
      userText,
      temperature: 0.3,
      maxTokens: 8192,
    });

    let parsed: {
      issues: Array<{
        shotIndexA: number;
        shotIndexB: number;
        category: string;
        description: string;
        severity: 'warning' | 'error';
      }>;
    };
    try {
      parsed = parseLlmJson(text);
    } catch {
      res.status(500).json({ error: 'AI 返回内容无法解析为合法 JSON' });
      return;
    }

    res.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  }
});
