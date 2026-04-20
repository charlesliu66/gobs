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
import {
  recordSubmitIntent,
  resolveIntentWithSubmitId,
  markIntentFailed,
  listPendingIntents,
  runRecoveryScan,
  kickScanner,
} from '../services/dreaminaRecovery.js';

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

/**
 * 对外暴露：在 videoMultishot 等其他路由里走同一个全局并发闸门，
 * 避免绕过 /dreamina/submit 直接调用 generateDreaminaVideo 造成并发超配。
 */
export { acquireDreaminaSlot };


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
    source,
    projectId,
    shotIndex,
    shotDescription,
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
    source?: 'production' | 'quickfilm';
    /** 高级制片项目 id，用于孤儿任务恢复时重建 batch-job（可选，仅 source=production 时使用） */
    projectId?: string;
    /** 0-based 分镜序号，用于恢复后回写到对应 shot */
    shotIndex?: number;
    /** 分镜描述文案，仅用于 batch-job 展示 */
    shotDescription?: string;
  };
  const isProductionSource = source === 'production';

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

  // 孤儿恢复 intent：出于诊断和 scanner 兜底，只对 production 源 + 已带 projectId 的提交才登记。
  // 实际 id 在各分支把 resolvedPrompt 算出来后再赋值。
  let intentId: string | undefined;

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
      // 孤儿恢复：提交前先落 intent（若 CLI/网络挂了，scanner 会通过 list_task 反查回来）
      if (isProductionSource && projectId) {
        intentId = await recordSubmitIntent({
          username: req.user?.username,
          projectId,
          shotIndex,
          shotDescription,
          model: modelTrim!,
          taskType: 'video',
          prompt: resolvedPrompt,
        }).catch((e) => {
          console.warn('[dreamina] recordSubmitIntent failed:', (e as Error).message);
          return undefined;
        });
      }
      // Acquire the global Dreamina slot — blocks until any previous task is done.
      // This prevents ExceedConcurrencyLimit (ret=1310) from concurrent users.
      const { waitForSlot, release: releaseSlot } = acquireDreaminaSlot();
      await waitForSlot;

      // TOS upload is occasionally flaky (one of N images fails to upload).
      // Retry up to 2 times for transient upload failures.
      // Also retry once (after 45s) for ret=1310 (ExceedConcurrencyLimit) —
      // this handles the common case where a previous server session's task is
      // still running on the Dreamina account when the backend restarts.
      const MAX_MM_RETRIES = 2;
      // 批量生成时即梦经常 1310，做到最多 5 次 × 45s = ~4 分钟自然排队
      // （以前只重试 1 次，批量用户极易看到假失败）
      const MAX_1310_RETRIES = 5;
      let mm1310Attempts = 0;
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
            if (mm1310Attempts < MAX_1310_RETRIES) {
              mm1310Attempts++;
              console.warn(
                `[dreamina] ExceedConcurrencyLimit (ret=1310): another task is running. ` +
                `Waiting 45s before retry ${mm1310Attempts}/${MAX_1310_RETRIES}…`,
              );
              await new Promise<void>((resolve) => setTimeout(resolve, 45_000));
              attempt--; // don't consume an upload-retry slot for 1310 waits
              continue;
            }
            console.warn(
              `[dreamina] ExceedConcurrencyLimit (ret=1310): all retries exhausted. ` +
              `Consider lowering DREAMINA_MAX_CONCURRENT (currently ${DREAMINA_MAX_CONCURRENT}).`,
            );
            releaseSlot();
            throw new Error('即梦账号当前有生成任务排队中，请 2-3 分钟后重试');
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
      if (intentId) {
        await resolveIntentWithSubmitId(intentId, submitId).catch(() => void 0);
      }
      if (isProductionSource) {
        releaseSlot();
      } else {
        activeSlotReleases.set(submitId, releaseSlot);
      }
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
    // 孤儿恢复：非 multimodal 的 prompt 就是 storyboardText.trim()
    const nonMmPrompt = storyboardText.trim();
    if (isProductionSource && projectId) {
      intentId = await recordSubmitIntent({
        username: req.user?.username,
        projectId,
        shotIndex,
        shotDescription,
        model: modelTrim!,
        taskType: 'video',
        prompt: nonMmPrompt,
      }).catch((e) => {
        console.warn('[dreamina] recordSubmitIntent failed:', (e as Error).message);
        return undefined;
      });
    }
    // Non-multimodal Dreamina (text2video / image2video) also shares the same account slot.
    const { waitForSlot: waitNonMm, release: releaseNonMm } = acquireDreaminaSlot();
    await waitNonMm;

    // For non-multimodal: retry up to 5 times (45s each) on ret=1310.
    const MAX_NMM_1310_RETRIES = 5;
    let nonMm1310Attempts = 0;
    let nonMmResult: { submitId: string; taskId: string } | null = null;
    let nonMmLastErr: Error | null = null;
    while (true) {
      try {
        nonMmResult = await submitDreaminaVideo({
          prompt: storyboardText.trim(),
          aspectRatio: aspectRatio ?? '16:9',
          duration: duration != null ? duration : undefined,
          model: modelTrim!,
          imageBase64,
          imageMimeType,
          modelVersion: mvSubmit,
        });
        break;
      } catch (submitErr) {
        nonMmLastErr = submitErr instanceof Error ? submitErr : new Error(String(submitErr));
        const is1310 = /ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(nonMmLastErr.message);
        if (is1310 && nonMm1310Attempts < MAX_NMM_1310_RETRIES) {
          nonMm1310Attempts++;
          console.warn(
            `[dreamina] ExceedConcurrencyLimit (ret=1310): another task is running. ` +
            `Waiting 45s before retry ${nonMm1310Attempts}/${MAX_NMM_1310_RETRIES}…`,
          );
          await new Promise<void>((resolve) => setTimeout(resolve, 45_000));
          continue;
        }
        if (is1310) {
          console.warn(
            `[dreamina] ExceedConcurrencyLimit (ret=1310): all retries exhausted. ` +
            `Consider lowering DREAMINA_MAX_CONCURRENT (currently ${DREAMINA_MAX_CONCURRENT}).`,
          );
          releaseNonMm();
          throw new Error('即梦账号当前有生成任务排队中，请 2-3 分钟后重试');
        }
        releaseNonMm();
        throw nonMmLastErr;
      }
    }
    if (!nonMmResult) { releaseNonMm(); throw nonMmLastErr ?? new Error('submit failed'); }
    if (intentId) {
      await resolveIntentWithSubmitId(intentId, nonMmResult.submitId).catch(() => void 0);
    }
    if (isProductionSource) {
      releaseNonMm();
    } else {
      activeSlotReleases.set(nonMmResult.submitId, releaseNonMm);
    }
    res.json({ submitId: nonMmResult.submitId, taskId: nonMmResult.taskId, status: 'pending' as const });
  } catch (err) {
    console.error('[video/dreamina/submit]', err);
    // 保留 intent 为 pending 让 scanner 兜底；只在 error 字段打上原因方便排查。
    if (intentId) {
      const reason = err instanceof Error ? err.message : String(err);
      await markIntentFailed(intentId, reason).catch(() => void 0);
    }
    // submit 失败的瞬间，很可能 CLI 已经把任务提交到即梦但我们丢了响应：
    // 立刻 kick 一次 scanner 扫 list_task，3-10s 内就能找回 submitId 而不必等下一轮（30s）
    kickScanner();
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

// ── 孤儿恢复：诊断 + 手动触发 ───────────────────────────────────────────

/** GET /api/video/dreamina/recover/pending — 查看当前所有 pending intent */
dreaminaRouter.get('/recover/pending', async (req: Request, res: Response) => {
  try {
    const uname = req.user?.username;
    const list = await listPendingIntents(uname);
    res.json({ count: list.length, intents: list });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'list pending failed' });
  }
});

/** POST /api/video/dreamina/recover/scan — 手动触发一次扫描，返回命中的 intentId */
dreaminaRouter.post('/recover/scan', async (_req: Request, res: Response) => {
  try {
    const result = await runRecoveryScan();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'scan failed' });
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

    // Try to persist the video; retry once after a short delay on failure.
    let videoPath: string | undefined;
    if (rawVideoUrl) {
      videoPath = await persistVideoUrlToOutput(rawVideoUrl, slug, req.user?.username);
      if (!videoPath) {
        console.warn(`[video/dreamina/task] persist failed on 1st attempt for ${polled.submitId}, retrying in 1.5s…`);
        await new Promise<void>((r) => setTimeout(r, 1500));
        videoPath = await persistVideoUrlToOutput(rawVideoUrl, slug, req.user?.username);
        if (!videoPath) {
          console.error(`[video/dreamina/task] persist failed after retry for ${polled.submitId}`);
        }
      }
    }

    const serveUrl = videoPath ? `/api/video/file?path=${encodeURIComponent(videoPath)}` : undefined;

    // Fallback: if local persistence failed but the raw URL is a playable https
    // link (not a huge data: URL), return it so the frontend can still play.
    const fallbackUrl = !serveUrl && rawVideoUrl && /^https?:\/\//i.test(rawVideoUrl)
      ? rawVideoUrl
      : undefined;

    const finalUrl = serveUrl || fallbackUrl;

    // If the video was generated but we couldn't persist or serve it, tell the
    // frontend explicitly so it can stop polling and show a meaningful error.
    if (!finalUrl && rawVideoUrl) {
      res.json({
        taskId,
        submitId: polled.submitId,
        status: 'failed' as const,
        phase: polled.phase,
        genStatus: polled.genStatus,
        failReason: '视频已生成但服务端落盘失败，请重试或检查服务器磁盘空间',
        errorCode: 'PERSIST_FAILED',
      });
      return;
    }

    res.json({
      taskId,
      submitId: polled.submitId,
      status: 'completed' as const,
      phase: polled.phase,
      genStatus: polled.genStatus,
      videoUrl: finalUrl,
      videoPath,
    });
  } catch (err) {
    console.error('[video/dreamina/task]', err);
    const { errorCode, errorMessage } = classifyError(err);
    res.status(500).json({ error: errorMessage, errorCode });
  }
});

export default dreaminaRouter;

