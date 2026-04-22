import fs from 'fs/promises';
import path from 'path';
import { Router, type Request } from 'express';
import { getApiDataDir } from '../config/apiDataDir.js';
import type { AspectRatioPreset, TimelineProject, VideoClip } from '../editor/timelineSchema.js';
import { routeEditorAgentMessage } from '../services/editorAgentIntent.js';
import { runEditorAgentChat } from '../services/editorAgentChat.js';
import {
  rememberProjectFeedback,
  removeProjectMemoryItem,
  weakenUserProfileDimension,
  type ProjectMemoryBucket,
  type UserProfileDimensionKey,
} from '../services/editorMemoryControls.js';
import {
  buildDefaultCreativeUserMessage,
  normalizeEditorCreativeBrief,
} from '../services/editorCreativeBrief.js';
import {
  collectStringSamples,
  resolveReplyLocale,
  type ReplyLocale,
} from '../services/replyLocale.js';
import type { EditorAgentApplyInput } from '../services/editorAgentService.js';
import { runEditorAgentApply } from '../services/editorAgentService.js';
import { parseEditorVisionFocusBody } from '../services/video/editorVideoAnalysis.js';
import {
  updatePreferenceFromExport,
  loadPreference,
  type ExportBehaviorReport,
} from '../services/userPreferenceService.js';
import {
  appendAgentMessageEvent,
  promoteProjectMemory,
  type ProjectMemoryPromotionInput,
} from '../services/editorAgentMemoryStore.js';
import {
  loadEditorUserCommunicationProfile,
  saveEditorUserCommunicationProfile,
  updateEditorUserCommunicationProfileForUser,
} from '../services/editorUserProfileService.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

function isSafeProjectId(id: string): boolean {
  return /^[\w-]{1,64}$/.test(id);
}

function getEditorProjectFile(username: string, projectId: string): string {
  return path.join(getApiDataDir(), 'editor-projects', sanitizeUsername(username), `${projectId}.json`);
}

async function readProjectDocForMemory(username: string, projectId: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(getEditorProjectFile(username, projectId), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

async function writeProjectDocForMemory(
  username: string,
  projectId: string,
  doc: Record<string, unknown>,
): Promise<void> {
  await fs.writeFile(
    getEditorProjectFile(username, projectId),
    JSON.stringify(doc, null, 2),
    'utf-8',
  );
}

function videoAssetIdsFromProject(project: TimelineProject): string[] {
  const ids = new Set<string>();
  for (const track of project.tracks) {
    if (track.type !== 'video') continue;
    for (const clip of track.clips) {
      ids.add((clip as VideoClip).assetId);
    }
  }
  return [...ids];
}

function getEditorReplyLocale(
  req: Request,
  body: ApplyBody | { userMessage?: string; projectMemory?: unknown },
): ReplyLocale {
  return resolveReplyLocale({
    explicit:
      typeof (body as { replyLocale?: unknown }).replyLocale === 'string'
        ? String((body as { replyLocale?: string }).replyLocale)
        : req.get('X-Reply-Locale'),
    contentLocale: req.get('X-Content-Locale'),
    samples: [
      ...collectStringSamples((body as { userMessage?: unknown }).userMessage),
      ...collectStringSamples((body as { creativeBrief?: unknown }).creativeBrief),
    ],
  });
}

function buildInstructionMemoryPromotion(
  message: string,
  creativeBrief: ReturnType<typeof normalizeEditorCreativeBrief>,
): ProjectMemoryPromotionInput {
  const stableFacts: ProjectMemoryPromotionInput['stableFacts'] = [];
  const preferenceSignals: ProjectMemoryPromotionInput['preferenceSignals'] = [];
  const negativePreferenceSignals: ProjectMemoryPromotionInput['negativePreferenceSignals'] = [];

  if (creativeBrief) {
    stableFacts?.push({ key: 'creative_mode', value: creativeBrief.mode });
    stableFacts?.push({ key: 'platform_goal', value: creativeBrief.platform });
    if (creativeBrief.objective) {
      stableFacts?.push({ key: 'objective', value: creativeBrief.objective });
    }
    if (creativeBrief.audience) {
      stableFacts?.push({ key: 'target_audience', value: creativeBrief.audience });
    }
    if (creativeBrief.cta) {
      stableFacts?.push({ key: 'cta', value: creativeBrief.cta });
    }
    if (creativeBrief.referenceStyle) {
      preferenceSignals?.push({ key: 'reference_style', value: creativeBrief.referenceStyle });
    }
    creativeBrief.sellingPoints.slice(0, 3).forEach((value, index) => {
      stableFacts?.push({ key: `selling_point_${index + 1}`, value });
    });
  }

  if (/快节奏|快一点|更快|节奏再快/u.test(message)) {
    preferenceSignals?.push({ key: 'pace', value: 'fast' });
  }
  if (/大字字幕|bold subtitles|大标题/u.test(message)) {
    preferenceSignals?.push({ key: 'subtitle_style', value: 'big_bold' });
  }
  if (/不要慢节奏开头|别慢开头|slow intro/i.test(message)) {
    negativePreferenceSignals?.push({ key: 'hook', value: 'slow_intro' });
  }
  if (/不要太长解释|别讲太多原因|不用讲太多原因/u.test(message)) {
    negativePreferenceSignals?.push({ key: 'response_style', value: 'long_explanations' });
  }

  return {
    stableFacts,
    preferenceSignals,
    negativePreferenceSignals,
  };
}

router.post('/agent/chat', async (req, res) => {
  const msg =
    typeof (req.body as { userMessage?: string }).userMessage === 'string'
      ? String((req.body as { userMessage: string }).userMessage).trim()
      : '';
  if (!msg) {
    res.status(400).json({ error: 'Please provide userMessage' });
    return;
  }
  try {
    const username = sanitizeUsername(req.user?.username);
    const replyLocale = getEditorReplyLocale(req, req.body as { userMessage?: string; projectMemory?: unknown });
    const reply = await runEditorAgentChat(msg, replyLocale);
    const userCommunicationProfile = await updateEditorUserCommunicationProfileForUser(username, {
      userMessage: msg,
    });
    const withUserEvent = appendAgentMessageEvent((req.body as { projectMemory?: unknown }).projectMemory, {
      role: 'user',
      kind: 'chat',
      route: 'chat',
      content: msg,
    });
    const projectMemory = appendAgentMessageEvent(withUserEvent, {
      role: 'assistant',
      kind: 'chat',
      route: 'chat',
      content: reply,
    });
    res.json({ reply, projectMemory, userCommunicationProfile });
  } catch (error) {
    console.error('[editor/agent/chat]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
  }
});

router.get('/agent/memory', async (req, res) => {
  const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : '';
  if (!projectId || !isSafeProjectId(projectId)) {
    res.status(400).json({ error: 'Please provide a valid projectId' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const doc = await readProjectDocForMemory(username, projectId);
    const userCommunicationProfile = await loadEditorUserCommunicationProfile(username);
    res.json({
      projectMemory: doc.memory,
      userCommunicationProfile,
    });
  } catch (error) {
    console.error('[editor/agent/memory:get]', error);
    res.status(404).json({ error: 'Memory state was not found for this project' });
  }
});

router.post('/agent/memory/project-feedback', async (req, res) => {
  const body = req.body as { projectId?: string; mode?: 'remember' | 'avoid'; text?: string };
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!projectId || !isSafeProjectId(projectId) || !text || (body.mode !== 'remember' && body.mode !== 'avoid')) {
    res.status(400).json({ error: 'Please provide projectId, mode, and text' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const doc = await readProjectDocForMemory(username, projectId);
    const projectMemory = rememberProjectFeedback(doc.memory, {
      mode: body.mode,
      text,
    });
    await writeProjectDocForMemory(username, projectId, {
      ...doc,
      updatedAt: new Date().toISOString(),
      memory: projectMemory,
    });
    res.json({ projectMemory });
  } catch (error) {
    console.error('[editor/agent/memory:project-feedback]', error);
    res.status(404).json({ error: 'Unable to update project memory' });
  }
});

router.post('/agent/memory/project-delete', async (req, res) => {
  const body = req.body as { projectId?: string; bucket?: ProjectMemoryBucket; id?: string; value?: string };
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const allowedBuckets: ProjectMemoryBucket[] = [
    'stableFacts',
    'preferenceSignals',
    'negativePreferenceSignals',
    'decisionLog',
    'openIssues',
  ];
  if (!projectId || !isSafeProjectId(projectId) || !body.bucket || !allowedBuckets.includes(body.bucket)) {
    res.status(400).json({ error: 'Please provide projectId and a valid memory bucket' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const doc = await readProjectDocForMemory(username, projectId);
    const projectMemory = removeProjectMemoryItem(doc.memory, {
      bucket: body.bucket,
      id: typeof body.id === 'string' ? body.id : undefined,
      value: typeof body.value === 'string' ? body.value : undefined,
    });
    await writeProjectDocForMemory(username, projectId, {
      ...doc,
      updatedAt: new Date().toISOString(),
      memory: projectMemory,
    });
    res.json({ projectMemory });
  } catch (error) {
    console.error('[editor/agent/memory:project-delete]', error);
    res.status(404).json({ error: 'Unable to delete project memory item' });
  }
});

router.post('/agent/memory/profile-weaken', async (req, res) => {
  const body = req.body as { dimension?: UserProfileDimensionKey };
  const allowedDimensions: UserProfileDimensionKey[] = [
    'responseStyle',
    'collaborationMode',
    'controlPreference',
    'pacePreference',
    'platformLanguageStyle',
  ];
  if (!body.dimension || !allowedDimensions.includes(body.dimension)) {
    res.status(400).json({ error: 'Please provide a valid communication dimension' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const existing = await loadEditorUserCommunicationProfile(username);
    const userCommunicationProfile = weakenUserProfileDimension(existing, body.dimension, {
      username,
    });
    await saveEditorUserCommunicationProfile(userCommunicationProfile);
    res.json({ userCommunicationProfile });
  } catch (error) {
    console.error('[editor/agent/memory:profile-weaken]', error);
    res.status(500).json({ error: 'Unable to weaken communication memory' });
  }
});

router.post('/agent/route', async (req, res) => {
  const msg =
    typeof (req.body as { userMessage?: string }).userMessage === 'string'
      ? String((req.body as { userMessage: string }).userMessage).trim()
      : '';
  if (!msg) {
    res.status(400).json({ error: 'Please provide userMessage' });
    return;
  }
  try {
    const out = await routeEditorAgentMessage(msg);
    res.json(out);
  } catch (error) {
    console.error('[editor/agent/route]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Intent routing failed' });
  }
});

interface ApplyBody {
  userMessage?: string;
  aspectRatio?: AspectRatioPreset;
  selectedAssetIds?: string[];
  assets?: Array<{ id: string; originalName: string; durationSec?: number }>;
  currentProject?: TimelineProject;
  projectMemory?: unknown;
  creativeBrief?: unknown;
  visionFocus?: unknown;
  replyLocale?: string;
}

function buildEditorApplyInput(
  body: ApplyBody,
  replyLocale: ReplyLocale,
): { ok: true; input: EditorAgentApplyInput } | { ok: false; error: string } {
  const creativeBrief = normalizeEditorCreativeBrief(body.creativeBrief);
  const rawMessage = typeof body.userMessage === 'string' ? body.userMessage.trim() : '';
  const msg = rawMessage || (creativeBrief ? buildDefaultCreativeUserMessage(creativeBrief, replyLocale) : '');

  if (!msg) {
    return { ok: false, error: 'Please provide userMessage or creativeBrief' };
  }
  if (!body.currentProject || typeof body.currentProject !== 'object') {
    return { ok: false, error: 'Please provide currentProject' };
  }

  let selectedAssetIds = Array.isArray(body.selectedAssetIds)
    ? body.selectedAssetIds.filter((item): item is string => typeof item === 'string')
    : [];
  if (selectedAssetIds.length === 0) {
    selectedAssetIds = videoAssetIdsFromProject(body.currentProject);
  }

  const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
  const fromClient = new Map(
    assetsRaw.map((asset) => {
      const id = String(asset.id);
      return [
        id,
        {
          id,
          originalName: typeof asset.originalName === 'string' ? asset.originalName : 'Untitled',
          durationSec:
            typeof asset.durationSec === 'number' &&
            Number.isFinite(asset.durationSec) &&
            asset.durationSec > 0
              ? Math.min(asset.durationSec, 36000)
              : 60,
        },
      ] as const;
    }),
  );

  const assets = selectedAssetIds.map((id) => {
    const hit = fromClient.get(id);
    if (hit) return hit;
    return { id, originalName: id, durationSec: 60 };
  });

  if (selectedAssetIds.length === 0) {
    return {
      ok: false,
      error: 'Please select media first, or place at least one video clip on the timeline.',
    };
  }

  const aspectRatio: AspectRatioPreset =
    body.aspectRatio === '9:16' ||
    body.aspectRatio === '16:9' ||
    body.aspectRatio === '1:1' ||
    body.aspectRatio === '4:3'
      ? body.aspectRatio
      : body.currentProject.aspectRatio ?? '9:16';

  const visionFocus = parseEditorVisionFocusBody(body.visionFocus);

  return {
    ok: true,
    input: {
      userMessage: msg,
      aspectRatio,
      selectedAssetIds,
      assets,
      currentProject: body.currentProject,
      projectMemory: body.projectMemory,
      creativeBrief,
      visionFocus,
      replyLocale,
    },
  };
}

router.post('/agent/apply', async (req, res) => {
  const body = req.body as ApplyBody;
  const replyLocale = getEditorReplyLocale(req, body);
  const parsed = buildEditorApplyInput(body, replyLocale);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const { summary, project, llmUsage, creativeStrategy } = await runEditorAgentApply(parsed.input, {
      username,
    });
    const promotedMemory = promoteProjectMemory(
      appendAgentMessageEvent(body.projectMemory, {
        role: 'user',
        kind: 'apply_request',
        route: 'apply',
        content: parsed.input.userMessage,
      }),
      {
        ...buildInstructionMemoryPromotion(parsed.input.userMessage, parsed.input.creativeBrief),
        decisions: [{ decision: summary, outcome: 'accepted' }],
      },
    );
    const projectMemory = appendAgentMessageEvent(promotedMemory, {
      role: 'assistant',
      kind: 'apply_result',
      route: 'apply',
      content: summary,
    });
    const userCommunicationProfile = await updateEditorUserCommunicationProfileForUser(username, {
      userMessage: body.userMessage,
    });
    res.json({ summary, project, llmUsage, creativeStrategy, projectMemory, userCommunicationProfile });
  } catch (error) {
    console.error('[editor/agent/apply]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Agent apply failed' });
  }
});

router.post('/agent/apply-stream', async (req, res) => {
  const body = req.body as ApplyBody;
  const replyLocale = getEditorReplyLocale(req, body);
  const parsed = buildEditorApplyInput(body, replyLocale);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  (res as { flushHeaders?: () => void }).flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const username = sanitizeUsername(req.user?.username);
    const result = await runEditorAgentApply(parsed.input, {
      onProgress: (progress) => send({ type: 'progress', ...progress }),
      username,
    });
    const promotedMemory = promoteProjectMemory(
      appendAgentMessageEvent(body.projectMemory, {
        role: 'user',
        kind: 'apply_request',
        route: 'apply_stream',
        content: parsed.input.userMessage,
      }),
      {
        ...buildInstructionMemoryPromotion(parsed.input.userMessage, parsed.input.creativeBrief),
        decisions: [{ decision: result.summary, outcome: 'accepted' }],
      },
    );
    const projectMemory = appendAgentMessageEvent(promotedMemory, {
      role: 'assistant',
      kind: 'apply_result',
      route: 'apply_stream',
      content: result.summary,
    });
    const userCommunicationProfile = await updateEditorUserCommunicationProfileForUser(username, {
      userMessage: body.userMessage,
    });

    send({
      type: 'done',
      summary: result.summary,
      project: result.project,
      projectMemory,
      userCommunicationProfile,
      llmUsage: result.llmUsage,
      creativeStrategy: result.creativeStrategy,
    });
    res.end();
  } catch (error) {
    console.error('[editor/agent/apply-stream]', error);
    send({ type: 'error', error: error instanceof Error ? error.message : 'Agent apply failed' });
    res.end();
  }
});

router.post('/preference/report', async (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  const report = req.body as ExportBehaviorReport;
  if (!Array.isArray(report?.clips)) {
    res.status(400).json({ error: 'Please provide clips array' });
    return;
  }
  try {
    const pref = await updatePreferenceFromExport(username, report);
    res.json({ ok: true, totalExports: pref.totalExports });
  } catch (error) {
    console.error('[editor/preference/report]', error);
    res.status(500).json({ error: 'Preference update failed' });
  }
});

router.get('/preference', async (req, res) => {
  const username = sanitizeUsername(req.user?.username);
  try {
    const pref = await loadPreference(username);
    res.json({ preference: pref });
  } catch (error) {
    console.error('[editor/preference]', error);
    res.status(500).json({ error: 'Preference load failed' });
  }
});

export default router;
