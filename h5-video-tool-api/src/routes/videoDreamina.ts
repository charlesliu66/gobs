import { Router, type Request, type Response } from 'express';
import {
  checkDreaminaAuth,
  isDreaminaEnabled,
  isDreaminaModel,
  isDreaminaMultimodalModel,
  pollDreaminaTask,
  submitDreaminaMultimodalVideo,
  submitDreaminaVideo,
} from '../services/dreaminaVideo.js';
import { composeDreaminaPrompt, type DreaminaPromptHints } from '../services/dreaminaPromptComposer.js';
import { persistVideoUrlToOutput } from '../services/videoUtils.js';
import { resolveFirstDriveImageIfMissing } from '../services/videoReferenceUtils.js';
import { classifyError, classifyDreaminaFailReason } from '../domain/job-status.js';

const dreaminaRouter = Router();

// ---------------------------------------------------------------------------
// Global Dreamina concurrency slot
// Dreamina allows only 1 concurrent generation task per account (ret=1310).
// All incoming submissions (any user/session) wait here before calling the CLI.
// The slot is released when the task poll returns a terminal state (done/failed),
// or after DREAMINA_SLOT_TIMEOUT_MS as a safety net (frontend disconnect, etc.).
// ---------------------------------------------------------------------------
const DREAMINA_SLOT_TIMEOUT_MS = 3 * 60_000; // 3 min — max Dreamina generation time
let dreaminaSlotEnd: Promise<void> = Promise.resolve();
const activeSlotReleases = new Map<string, () => void>(); // submitId → releaseSlot fn

function acquireDreaminaSlot(): { waitForSlot: Promise<void>; release: () => void } {
  let release!: () => void;
  const prev = dreaminaSlotEnd;
  dreaminaSlotEnd = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, DREAMINA_SLOT_TIMEOUT_MS);
    release = () => { clearTimeout(timer); resolve(); };
  });
  return { waitForSlot: prev, release };
}


async function ensureDreaminaAuthOrRespond(res: Response): Promise<boolean> {
  const status = await checkDreaminaAuth();
  if (status.loggedIn) return true;
  res.status(400).json({
    error: status.error || '即梦 CLI 未登录，请在服务器执行 dreamina login',
    errorCode: 'DREAMINA_NOT_LOGGED_IN',
  });
  return false;
}

/** GET /api/video/dreamina/auth-status — 检测即梦 CLI 登录态 */
dreaminaRouter.get('/auth-status', async (_req: Request, res: Response) => {
  const status = await checkDreaminaAuth();
  res.json(status);
});

/** POST /api/video/dreamina/submit — 仅提交即梦任务，立即返回 submitId */
dreaminaRouter.post('/submit', async (req: Request, res: Response) => {
  if (!isDreaminaEnabled()) {
    res.status(400).json({ error: '即梦未启用或未安装 dreamina-cli-skill' });
    return;
  }
  const {
    storyboardText,
    materials,
    driveToken,
    duration,
    aspectRatio,
    model,
    imageBase64: bodyImageBase64,
    imageMimeType: bodyImageMimeType,
    multimodalImages,
    multimodalVideos,
    multimodalAudios,
    dreaminaModelVersion,
    autoComposePrompt,
    dreaminaPromptHints,
  } = req.body as {
    storyboardText?: string;
    materials?: { id: string; name: string; mimeType?: string }[];
    driveToken?: string;
    duration?: number;
    aspectRatio?: string;
    model?: string;
    imageBase64?: string;
    imageMimeType?: string;
    multimodalImages?: { base64: string; mimeType?: string }[];
    multimodalVideos?: { base64: string; mimeType?: string }[];
    multimodalAudios?: { base64: string; mimeType?: string }[];
    dreaminaModelVersion?: string;
    autoComposePrompt?: boolean;
    dreaminaPromptHints?: DreaminaPromptHints;
  };

  if (!storyboardText || typeof storyboardText !== 'string' || !storyboardText.trim()) {
    res.status(400).json({ error: '请提供 storyboardText（分镜文本）' });
    return;
  }

  const modelTrim = model?.trim();
  if (!isDreaminaModel(modelTrim)) {
    res
      .status(400)
      .json({ error: '仅支持即梦模型（dreamina-multimodal / dreamina-text2video / dreamina-image2video）' });
    return;
  }

  if (!(await ensureDreaminaAuthOrRespond(res))) {
    return;
  }

  try {
    if (isDreaminaMultimodalModel(modelTrim)) {
      const imgs = Array.isArray(multimodalImages) ? multimodalImages : [];
      const vids = Array.isArray(multimodalVideos) ? multimodalVideos : [];
      const auds = Array.isArray(multimodalAudios) ? multimodalAudios : [];
      const basePrompt = storyboardText.trim();
      const resolvedPrompt =
        autoComposePrompt === false
          ? basePrompt
          : await composeDreaminaPrompt({
              rawPrompt: basePrompt,
              imageCount: imgs.length,
              videoCount: vids.length,
              audioCount: auds.length,
              hints: dreaminaPromptHints,
            });
      const mvAsync =
        typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
          ? dreaminaModelVersion.trim()
          : undefined;
      // Acquire the global Dreamina slot — blocks until any previous task is done.
      // This prevents ExceedConcurrencyLimit (ret=1310) from concurrent users.
      const { waitForSlot, release: releaseSlot } = acquireDreaminaSlot();
      await waitForSlot;

      // TOS upload is occasionally flaky (one of N images fails to upload).
      // Retry up to 2 times when the error looks like a transient upload failure.
      const MAX_MM_RETRIES = 2;
      let mmResult: { submitId: string; taskId: string } | null = null;
      let mmLastErr: Error | null = null;
      for (let attempt = 0; attempt <= MAX_MM_RETRIES; attempt++) {
        try {
          mmResult = await submitDreaminaMultimodalVideo({
            prompt: resolvedPrompt,
            aspectRatio: aspectRatio ?? '16:9',
            duration: duration != null ? duration : undefined,
            images: imgs.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
            videos: vids.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
            audios: auds.filter((x: { base64?: string }) => x && typeof x.base64 === 'string'),
            modelVersion: mvAsync,
          });
          mmLastErr = null;
          break;
        } catch (mmErr) {
          mmLastErr = mmErr instanceof Error ? mmErr : new Error(String(mmErr));
          const isTransientUpload = /upload phase.*no file upload|upload resource.*upload image/i.test(mmLastErr.message);
          if (!isTransientUpload || attempt >= MAX_MM_RETRIES) {
            releaseSlot(); // failed to submit — free the slot immediately
            throw mmLastErr;
          }
          console.warn(
            `[video/dreamina/submit] TOS upload transient failure (attempt ${attempt + 1}/${MAX_MM_RETRIES + 1}), retrying in 2s…`,
            mmLastErr.message,
          );
          await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        }
      }
      if (!mmResult) { releaseSlot(); throw mmLastErr ?? new Error('multimodal submit failed'); }
      const { submitId, taskId } = mmResult;
      // Register the release fn — the GET /task endpoint will call it when done/failed.
      // A 3-min safety-net timer is already baked into acquireDreaminaSlot().
      activeSlotReleases.set(submitId, releaseSlot);
      res.json({ submitId, taskId, status: 'pending' as const, resolvedPrompt });
      return;
    }

    let imageBase64: string | undefined = bodyImageBase64;
    let imageMimeType: string | undefined = bodyImageMimeType;
    const r = await resolveFirstDriveImageIfMissing(imageBase64, imageMimeType, driveToken, materials);
    imageBase64 = r.imageBase64;
    imageMimeType = r.imageMimeType;

    const mvSubmit =
      typeof dreaminaModelVersion === 'string' && dreaminaModelVersion.trim()
        ? dreaminaModelVersion.trim()
        : undefined;
    // Non-multimodal Dreamina (text2video / image2video) also shares the same account slot.
    const { waitForSlot: waitNonMm, release: releaseNonMm } = acquireDreaminaSlot();
    await waitNonMm;

    let nonMmSubmitId: string | undefined;
    try {
      const { submitId, taskId } = await submitDreaminaVideo({
        prompt: storyboardText.trim(),
        aspectRatio: aspectRatio ?? '16:9',
        duration: duration != null ? duration : undefined,
        model: modelTrim!,
        imageBase64,
        imageMimeType,
        modelVersion: mvSubmit,
      });
      nonMmSubmitId = submitId;
      activeSlotReleases.set(submitId, releaseNonMm);
      res.json({ submitId, taskId, status: 'pending' as const });
    } catch (submitErr) {
      releaseNonMm();
      throw submitErr;
    }
  } catch (err) {
    console.error('[video/dreamina/submit]', err);
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

/** GET /api/video/dreamina/task/:submitId — 排队/成片；成功时返回 videoUrl、videoPath */
dreaminaRouter.get('/task/:submitId', async (req: Request, res: Response) => {
  if (!isDreaminaEnabled()) {
    res.status(400).json({ error: '即梦未启用' });
    return;
  }
  const raw = req.params.submitId?.trim();
  if (!raw) {
    res.status(400).json({ error: '缺少 submitId' });
    return;
  }
  try {
    const decoded = decodeURIComponent(raw);
    const polled = await pollDreaminaTask(decoded);
    const taskId = `dreamina-${polled.submitId}`;

    if (polled.phase === 'failed') {
      // Task is terminal — release the global concurrency slot.
      const rel = activeSlotReleases.get(polled.submitId);
      rel?.();
      activeSlotReleases.delete(polled.submitId);
      res.json({
        taskId,
        submitId: polled.submitId,
        status: 'failed' as const,
        phase: polled.phase,
        genStatus: polled.genStatus,
        queueInfo: polled.queueInfo,
        failReason: polled.failReason,
        errorCode: classifyDreaminaFailReason(polled.failReason),
      });
      return;
    }

    if (polled.phase === 'querying') {
      // Still running — keep the slot held.
      res.json({
        taskId,
        submitId: polled.submitId,
        status: 'pending' as const,
        phase: polled.phase,
        genStatus: polled.genStatus,
        queueInfo: polled.queueInfo,
      });
      return;
    }

    // Task completed — release the slot before downloading the video.
    const rel = activeSlotReleases.get(polled.submitId);
    rel?.();
    activeSlotReleases.delete(polled.submitId);

    const rawVideoUrl = polled.videoUrl;
    const slug = `dreamina_${polled.submitId.slice(0, 12)}`;
    const videoPath = rawVideoUrl ? await persistVideoUrlToOutput(rawVideoUrl, slug, req.user?.username) : undefined;
    // Return a small serving URL instead of the raw data URL (which can be 100 MB+).
    const serveUrl = videoPath ? `/api/video/file?path=${encodeURIComponent(videoPath)}` : undefined;

    res.json({
      taskId,
      submitId: polled.submitId,
      status: 'completed' as const,
      phase: polled.phase,
      genStatus: polled.genStatus,
      videoUrl: serveUrl,
      videoPath,
    });
  } catch (err) {
    console.error('[video/dreamina/task]', err);
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

export default dreaminaRouter;

