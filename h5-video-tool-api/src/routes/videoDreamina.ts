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
// Global Dreamina concurrency semaphore
// DREAMINA_MAX_CONCURRENT (env, default 5) controls parallel submissions.
// Premium accounts typically support multiple concurrent tasks; if ret=1310
// (ExceedConcurrencyLimit) is returned, lower the value in .env.
// Each slot has a DREAMINA_SLOT_TIMEOUT_MS safety-net timer so a crashed
// frontend can't permanently block the semaphore.
// ---------------------------------------------------------------------------
const DREAMINA_SLOT_TIMEOUT_MS = 5 * 60_000; // 5 min per-slot safety net

const DREAMINA_MAX_CONCURRENT = (() => {
  const n = parseInt(process.env.DREAMINA_MAX_CONCURRENT ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
})();

console.log(`[dreamina] concurrency slots: ${DREAMINA_MAX_CONCURRENT}`);

/** Counting semaphore — limits how many Dreamina CLI submissions run in parallel. */
class DreaminaSemaphore {
  private available: number;
  private readonly timeoutMs: number;
  private readonly queue: Array<() => void> = [];

  constructor(max: number, timeoutMs: number) {
    this.available = max;
    this.timeoutMs = timeoutMs;
  }

  private releaseSlot(): void {
    const next = this.queue.shift();
    if (next) {
      next(); // hand the slot to the next waiter
    } else {
      this.available++;
    }
  }

  acquire(): { waitForSlot: Promise<void>; release: () => void } {
    // Build a release function once the caller actually holds a slot.
    const makeHolderRelease = (): (() => void) => {
      let done = false;
      let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        console.warn('[dreamina] slot safety-net timeout fired — releasing automatically');
        rel();
      }, this.timeoutMs);
      const rel = () => {
        if (done) return;
        done = true;
        if (timer) { clearTimeout(timer); timer = null; }
        this.releaseSlot();
      };
      return rel;
    };

    if (this.available > 0) {
      this.available--;
      return { waitForSlot: Promise.resolve(), release: makeHolderRelease() };
    }

    // All slots busy — queue up and wait.
    let resolveWait!: () => void;
    const waitForSlot = new Promise<void>((resolve) => { resolveWait = resolve; });

    let holderRelease: (() => void) | null = null;
    const release = () => { holderRelease?.(); };

    this.queue.push(() => {
      // This waiter is next — give it a slot and start its safety timer.
      holderRelease = makeHolderRelease();
      resolveWait();
    });

    return { waitForSlot, release };
  }
}

const dreaminaSemaphore = new DreaminaSemaphore(DREAMINA_MAX_CONCURRENT, DREAMINA_SLOT_TIMEOUT_MS);
const activeSlotReleases = new Map<string, () => void>(); // submitId → releaseSlot fn

function acquireDreaminaSlot(): { waitForSlot: Promise<void>; release: () => void } {
  return dreaminaSemaphore.acquire();
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
          const is1310 = /ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(mmLastErr.message);
          if (is1310) {
            console.warn(
              `[dreamina] ExceedConcurrencyLimit (ret=1310): account concurrent limit reached. ` +
              `Consider lowering DREAMINA_MAX_CONCURRENT (currently ${DREAMINA_MAX_CONCURRENT}).`,
            );
            releaseSlot();
            throw mmLastErr;
          }
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
      const errMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
      if (/ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(errMsg)) {
        console.warn(
          `[dreamina] ExceedConcurrencyLimit (ret=1310): account concurrent limit reached. ` +
          `Consider lowering DREAMINA_MAX_CONCURRENT (currently ${DREAMINA_MAX_CONCURRENT}).`,
        );
      }
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
    const serveUrl = videoPath ? `/api/video/file?path=${encodeURIComponent(videoPath)}` : undefined;

    // Fallback: if local persistence failed but the raw URL is a playable https
    // link (not a huge data: URL), return it so the frontend can still play.
    const fallbackUrl = !serveUrl && rawVideoUrl && /^https?:\/\//i.test(rawVideoUrl)
      ? rawVideoUrl
      : undefined;

    res.json({
      taskId,
      submitId: polled.submitId,
      status: 'completed' as const,
      phase: polled.phase,
      genStatus: polled.genStatus,
      videoUrl: serveUrl || fallbackUrl,
      videoPath,
    });
  } catch (err) {
    console.error('[video/dreamina/task]', err);
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

export default dreaminaRouter;

