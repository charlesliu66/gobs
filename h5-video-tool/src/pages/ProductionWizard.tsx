import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getVeoModels,
} from '../api/video';
import {
  emptyProductionProject,
  PRODUCTION_STORAGE_KEY,
  type ProductionProject,
  type StructureTemplate,
  type CharacterSheet,
  type SceneSheet,
  type StoryArcLayer,
  type ProductionShot,
  type ProductionShotVideoVersion,
  type PropSheet,
} from '../studio/productionTypes';
import {
  loadStored,
  mergeCharacterSheetsPreservingLooks,
  mergeSceneSheetsPreservingImages,
  mergeShotVideoVersions,
  migrateProject,
  saveStored,
  type StoredWizard,
} from '../studio/productionWizardStorage';
import {
  buildCharacterSheetsFromStory,
  buildSceneSheetsFromStory,
  mergeSceneSheetsFromL2,
  buildCharacterImagePrompt,
  buildSceneImagePrompt,
  buildPropImagePrompt,
  buildPropSheetsFromProductionDesign,
  mergePropSheetsPreservingImages,
  formatWardrobeSupplementForCharacter,
  buildShotMultimodalRefPackAsync,
  buildProductionShotVideoStoryboardText,
  buildShotBlobText,
  ensureCharacterLookTree,
  getCharacterActiveNode,
} from '../studio/productionAssets';
import { buildProductionShotFramePrompt, updateVariantImage } from '../studio/productionWizardHelpers';
import { useProductionStep2Handlers } from '../studio/useProductionStep2Handlers';
import {
  postStoryArc,
  postProductionDesign,
  postStoryboardTable,
  postExtractCharacterVisuals,
  postAssemblePrompts,
  postExtractStyleReference,
} from '../api/studio';
import {
  type PortraitEditIntent,
} from '../components/production/CharacterPortraitEditorModal';
import { getPortraitJobKey, type PortraitJobState } from '../components/production/portraitJobKey';
import { generateCharacterPortrait, generateFrames, type GenerateCharacterPortraitRequest } from '../api/storyboard';
import { saveProductionProject, loadProductionProject, listProductionProjects, uploadProductionImage, type ProjectListItem } from '../api/production';
import { toast } from '../components/Toast';
import { requestNotificationPermission, sendBrowserNotification } from '../utils/notification';
import { resolveProductionShotPreviewVideoSrc, saveVideoToHistory } from '../utils/videoHistory';
import { getDreaminaTaskStatus, submitDreaminaAsync } from '../api/video';
import { submitBatchJobs, pollBatchJobNow, type BatchJobDto } from '../api/batchJobs';
import { postShotReview, postContinuityCheck, type ShotReviewResult, type ShotReviewSuggestion, type ContinuityIssue } from '../api/shotReview';
import { ImageLightbox } from '../components/ImageLightbox';
import { ProductionProvider } from '../studio/ProductionContext';
import { ProductionWizardShell } from '../studio/ProductionWizardShell';
import { ProductionProjectListModal } from '../studio/components/ProductionProjectListModal';
import { ProductionBootstrappingView } from '../studio/components/ProductionBootstrappingView';
import { StepInput } from '../studio/steps/StepInput';
import { StepStoryArc } from '../studio/steps/StepStoryArc';
import { StepDesignWorkspace } from '../studio/steps/StepDesignWorkspace';
import { StepExportWorkspace } from '../studio/steps/StepExportWorkspace';
import { StepStoryboardWorkspace } from '../studio/steps/StepStoryboardWorkspace';
import { StepStoryboardContinuousPlay } from '../studio/steps/StepStoryboardContinuousPlay';
import { StepStoryboardAbCompare } from '../studio/steps/StepStoryboardAbCompare';

const TEMPLATE_OPTIONS: { value: StructureTemplate; label: string }[] = [
  { value: 'three_act', label: '三幕式' },
  { value: 'five_act', label: '五幕式' },
  { value: 'save_the_cat', label: 'Save the Cat 节拍' },
];

const ASPECT_OPTIONS = ['16:9', '9:16', '1:1', '4:3'] as const;

const STEPS = [
  { id: 0, label: '输入' },
  { id: 1, label: '剧本大纲' },
  { id: 2, label: '角色·场景·道具' },
  { id: 3, label: '分镜' },
  { id: 4, label: '导出' },
];

type L2Tab = 'characters' | 'scenes' | 'props' | 'checklist';

type BatchTask = { kind: 'char' | 'scene' | 'prop'; sheetId: string; variantId: string; prompt: string };

interface BatchAssetGenState {
  current: number;
  total: number;
  success: number;
  failed: number;
  startedAt: number;
  currentLabel?: string;
  failedTasks: BatchTask[];
}

export function ProductionWizard() {
  const [searchParams] = useSearchParams();
  // URL ?projectId=xxx 优先；没有则读 localStorage 上次记录的 id
  const urlProjectId = searchParams.get('projectId');
  const lastStoredId = (() => {
    try { return localStorage.getItem('gobs_last_project_id'); } catch { return null; }
  })();
  // 决定初始加载来源：URL > localStorage 记录 > 本地 StoredWizard
  const shouldLoadFromServer = !!(urlProjectId || lastStoredId);

  const initial = shouldLoadFromServer ? null : loadStored();
  const [project, setProject] = useState<ProductionProject>(() =>
    migrateProject(initial?.project ?? emptyProductionProject()),
  );
  const [characterBible, setCharacterBible] = useState(initial?.characterBible ?? '');
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? '');
  const [storyGenre, setStoryGenre] = useState(initial?.storyGenre ?? '');
  const [structureTemplate, setStructureTemplate] = useState<StructureTemplate>(
    initial?.structureTemplate ?? 'three_act',
  );
  const [maxTotalDurationSec, setMaxTotalDurationSec] = useState(initial?.maxTotalDurationSec ?? 60);
  const [step, setStep] = useState(initial?.step ?? 0);
  const [l2Tab, setL2Tab] = useState<L2Tab>('characters');
  /** 制作清单子视图：默认服化道 wardrobe */
  const [checklistSubTab, setChecklistSubTab] = useState<'wardrobe' | 'props' | 'raw'>('wardrobe');
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);

  const [busyL1, setBusyL1] = useState(false);
  const [busyL2, setBusyL2] = useState(false);
  const [busyL3, setBusyL3] = useState(false);
  const [busyVis, setBusyVis] = useState(false);
  const [busyAsm, setBusyAsm] = useState(false);
  const [busyStyle, setBusyStyle] = useState(false);
  const [genKey, setGenKey] = useState<string | null>(null);
  const [styleRefPreview, setStyleRefPreview] = useState<string | null>(null);
  const stylePreviewRevokeRef = useRef<(() => void) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [titleSaved, setTitleSaved] = useState(false);
  /** Step2：形象树聚焦的角色 id + 肖像弹窗意图 */
  const [treeFocusCharacterId, setTreeFocusCharacterId] = useState<string | null>(null);
  const [portraitEdit, setPortraitEdit] = useState<{
    sheet: CharacterSheet;
    intent: PortraitEditIntent;
  } | null>(null);
  const [scenePropModal, setScenePropModal] = useState<{
    kind: 'scene' | 'prop';
    sheetId: string;
    variantId: string;
    name: string;
    basePrompt: string;
    currentImageDataUrl?: string;
  } | null>(null);
  const [scenePropGenBusy, setScenePropGenBusy] = useState(false);
  const [scenePropPreview, setScenePropPreview] = useState<string | null>(null);
  const [scenePropError, setScenePropError] = useState<string | null>(null);
  // ── 服务端持久化 ────────────────────────────────────────────────────────────
  const [serverProjectId, setServerProjectId] = useState<string | null>(() => {
    // URL 参数优先，否则读 localStorage 里记录的上次 id
    if (urlProjectId) return urlProjectId;
    try { return localStorage.getItem('gobs_last_project_id') ?? null; } catch { return null; }
  });
  const [showProjectList, setShowProjectList] = useState(false);
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [loadingProjectTitle, setLoadingProjectTitle] = useState<string | null>(null);
  const [showLibraryImport, setShowLibraryImport] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const serverSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When true, the next auto-persist cycle flushes to the server immediately. */
  const needsFlushRef = useRef(false);
  // 防止“服务端项目尚未加载完成时”把空白初始态覆盖回服务端
  const [isServerBootstrapping, setIsServerBootstrapping] = useState(shouldLoadFromServer);
  const [canAutoPersist, setCanAutoPersist] = useState(!shouldLoadFromServer);
  // SSE 监听 batch-jobs 完成事件（替代旧的前端轮询恢复）

  /** 执行一次服务端保存（共享逻辑） */
  const doServerSync = useCallback(async (data: StoredWizard) => {
    try {
      const result = await saveProductionProject(data as unknown as Record<string, unknown>, serverProjectId ?? undefined);
      setServerProjectId(result.id);
      try { localStorage.setItem('gobs_last_project_id', result.id); } catch { /* ignore */ }
      const url = new URL(window.location.href);
      if (url.searchParams.get('projectId') !== result.id) {
        url.searchParams.set('projectId', result.id);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {
      console.warn('[production] 服务端同步失败（localStorage 仍有数据）', e);
    }
  }, [serverProjectId]);

  /** 防抖同步到服务端：project 变化后 3 秒触发 */
  const scheduleServerSync = useCallback((data: StoredWizard) => {
    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    serverSyncTimerRef.current = setTimeout(() => void doServerSync(data), 3000);
  }, [doServerSync]);

  /** 立即同步到服务端（用于视频保存等关键数据，绕过 3s 防抖） */
  const flushServerSync = useCallback((data: StoredWizard) => {
    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    void doServerSync(data);
  }, [doServerSync]);

  /** 从服务端加载项目列表 */
  const handleLoadProjectList = useCallback(async () => {
    try {
      const { projects } = await listProductionProjects();
      setProjectList(projects);
      setShowProjectList(true);
    } catch (e) {
      console.warn('[production] 加载项目列表失败', e);
    }
  }, []);

  /** 加载指定服务端项目 */
  const handleLoadServerProject = useCallback(async (id: string, title?: string) => {
    setErr(null);
    setShowProjectList(false);
    setLoadingProjectTitle(title?.trim() || null);
    setIsServerBootstrapping(true);
    try {
      const raw = await loadProductionProject(id);
      if (raw && typeof raw === 'object' && 'project' in raw) {
        const s = raw as unknown as StoredWizard;
        setProject(migrateProject(s.project));
        if (s.characterBible) setCharacterBible(s.characterBible);
        if (s.synopsis) setSynopsis(s.synopsis);
        if (s.structureTemplate) setStructureTemplate(s.structureTemplate);
        if (s.maxTotalDurationSec) setMaxTotalDurationSec(s.maxTotalDurationSec);
        if (typeof s.step === 'number') setStep(s.step);
        if (s.storyGenre) setStoryGenre(s.storyGenre);
        setServerProjectId(id);
        // 写入 localStorage + URL，确保续接
        try { localStorage.setItem('gobs_last_project_id', id); } catch { /* ignore */ }
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', id);
        window.history.replaceState(null, '', url.toString());
        setCanAutoPersist(true);
      }
    } catch (e) {
      console.warn('[production] 加载项目失败', e);
      setErr('加载项目失败，请重试');
      setShowProjectList(true);
    } finally {
      setIsServerBootstrapping(false);
      setLoadingProjectTitle(null);
    }
  }, []);

  /** 仅内存：未确认的肖像预览；刷新页面即丢失，不写入 localStorage */
  const [portraitJobs, setPortraitJobs] = useState<Record<string, PortraitJobState>>({});
  const [shotBusyMap, setShotBusyMap] = useState<Record<string, 'frame' | 'video'>>({});
  // Tracks shots waiting in the submission queue (before their turn to submit to Dreamina)
  const [shotQueuedMap, setShotQueuedMap] = useState<Record<string, boolean>>({});
  // Per-shot cancel tokens (ref so mutations don't trigger re-render)
  const shotCancelMap = useRef<Record<string, { cancelled: boolean }>>({});
  // Serialize Dreamina submissions: each shot waits for the previous shot's submit_id to be
  // received before it sends its own request (not until polling completes — that runs concurrently).
  const dreaminaQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Adaptive queue: slow mode waits for previous job to fully complete before next submission
  const dreaminaSlowModeRef = useRef(false);
  const slowModeSuccessCountRef = useRef(0);
  // SSE completion listeners for slow-mode queue gating
  const sseCompletionListenersRef = useRef<Set<(job: BatchJobDto) => void>>(new Set());
  const setShotBusy = useCallback(
    (shotId: string, status: 'frame' | 'video') =>
      setShotBusyMap((prev) => ({ ...prev, [shotId]: status })),
    [],
  );
  const clearShotBusy = useCallback(
    (shotId: string) =>
      setShotBusyMap((prev) => {
        const n = { ...prev };
        delete n[shotId];
        return n;
      }),
    [],
  );
  /** 与 GET /api/video/models 一致：启用时「生成分镜视频」走 submit + 轮询，成片后写入本镜预览 */
  const [dreaminaAsync, setDreaminaAsync] = useState(false);
  // shotVideoGen (useVideoGeneration) 已被 batch-jobs 后端轮询取代

  const ar = project.meta.aspectRatio ?? '16:9';

  /**
   * 将已完成的分镜视频保存到 project.shots[shotIdx] 并写入历史记录。
   * 提取为独立 callback 以便 mount-time resume 也能调用。
   */
  const saveShotVideo = useCallback(
    (shotIdx: number, url: string, taskId: string, videoPath: string | undefined) => {
      const s = project.shots[shotIdx];
      if (!s) return;
      const vp = videoPath?.trim();
      const versionId = `${taskId || `production-shot-${s.shotIndex}`}-${Date.now()}`;
      const version: ProductionShotVideoVersion = {
        id: versionId,
        taskId: taskId || `production-shot-${s.shotIndex}`,
        createdAt: Date.now(),
        ...(vp ? { videoPath: vp } : {}),
        ...(url?.trim() ? { videoUrl: url } : {}),
      };
      setProject((p) => {
        const shots = [...p.shots];
        const cur = shots[shotIdx];
        if (!cur) return p;
        const prev = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
        const dedup = prev.filter((x) => x.id !== version.id && x.taskId !== version.taskId);
        const nextVersions = [version, ...dedup].sort((a, b) => b.createdAt - a.createdAt);
        shots[shotIdx] = {
          ...cur,
          pendingVideoSubmitId: undefined, // clear on completion
          previewVideoVersions: nextVersions,
          selectedPreviewVideoVersionId: version.id,
          previewVideoUrl: version.videoUrl,
          previewVideoPath: version.videoPath,
        } as ProductionShot;
        return { ...p, shots, assembled: null };
      });
      const line = buildProductionShotVideoStoryboardText(s);
      const title = (project.meta.title || '未命名').trim();
      saveVideoToHistory({
        taskId: taskId || `production-shot-${s.shotIndex}-${Date.now()}`,
        videoPath: videoPath ?? '',
        prompt: `[高级制片·${title}·镜${s.shotIndex}] ${line}`.slice(0, 12000),
        ...(videoPath?.trim() ? {} : { videoUrl: url }),
      });
      toast.success('分镜视频已填入本镜预览，并已写入「生成视频 → 历史内容」');
      needsFlushRef.current = true;
    },
    [project.shots, project.meta.title, setProject],
  );

  /**
   * SSE 监听 batch-jobs 完成事件。当后端轮询到即梦视频已生成并落盘后，
   * 通过 SSE 推送到前端，自动将视频填入对应分镜。
   * 同时用于刷新后恢复——后端持续轮询不受前端刷新影响。
   */
  useEffect(() => {
    if (isServerBootstrapping) return;
    const pid = serverProjectId;
    if (!pid) return;
    const token = localStorage.getItem('gobs_token') ?? '';
    if (!token) return;
    const BASE = import.meta.env.VITE_API_BASE_URL || '';
    const es = new EventSource(`${BASE}/api/batch-jobs/stream?token=${encodeURIComponent(token)}`);
    es.onmessage = (e: MessageEvent) => {
      try {
        const job = JSON.parse(e.data as string) as BatchJobDto;
        if (job.source !== 'production' || job.projectId !== pid) return;
        if (job.status === 'done' && job.videoUrl) {
          // 找到对应 shot 并填入视频
          setProject((p) => {
            const idx = p.shots.findIndex((s) => s.shotIndex === job.shotIndex);
            if (idx < 0) return p;
            const cur = p.shots[idx];
            if (!cur) return p;
            const versionId = `batch-${job.id}-${Date.now()}`;
            const version: ProductionShotVideoVersion = {
              id: versionId,
              taskId: job.taskId,
              createdAt: Date.now(),
              videoUrl: job.videoUrl,
            };
            const prev = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
            // 跳过已经有这个 taskId 的版本（避免重复）
            if (prev.some((v) => v.taskId === job.taskId)) return p;
            const shots = [...p.shots];
            shots[idx] = {
              ...cur,
              pendingVideoSubmitId: undefined,
              previewVideoVersions: [version, ...prev],
              selectedPreviewVideoVersionId: versionId,
              previewVideoUrl: job.videoUrl,
              previewVideoPath: undefined,
            } as ProductionShot;
            return { ...p, shots, assembled: null };
          });
          toast.success(`分镜 ${job.shotIndex} 视频已就绪`);
          needsFlushRef.current = true;
          // 清除对应分镜的 busy 状态（刷新恢复时设置的）
          setShotBusyMap((prev) => {
            const n = { ...prev };
            delete n[String(job.shotIndex)];
            return n;
          });
        }
        if (job.status === 'failed') {
          setProject((p) => {
            const idx = p.shots.findIndex((s) => s.shotIndex === job.shotIndex);
            if (idx < 0) return p;
            const shots = [...p.shots];
            const cur = shots[idx];
            if (!cur) return p;
            shots[idx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
          toast.error(`分镜 ${job.shotIndex} 生成失败：${job.failReason || '未知错误'}`);
          setShotBusyMap((prev) => {
            const n = { ...prev };
            delete n[String(job.shotIndex)];
            return n;
          });
        }
        // Notify slow-mode queue listeners when any production job reaches terminal state
        if (job.status === 'done' || job.status === 'failed') {
          for (const listener of sseCompletionListenersRef.current) {
            try { listener(job); } catch { /* ignore */ }
          }
          // 检查是否所有 pending 分镜都已完成，清除批量标记
          setProject((p) => {
            const stillPending = p.shots.some((s) => s.pendingVideoSubmitId);
            if (!stillPending) {
              const bk = `gobs_batch_gen_${pid ?? 'local'}`;
              try { localStorage.removeItem(bk); } catch { /* ignore */ }
            }
            return p;
          });
        }
      } catch { /* ignore parse errors */ }
    };
    return () => { es.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerBootstrapping, serverProjectId]);

  useEffect(() => {
    requestNotificationPermission();
    void getVeoModels()
      .then((r) => setDreaminaAsync(!!r.dreaminaAsync))
      .catch(() => {});
  }, []);

  const handleStartPortraitGenerate = useCallback((jobKey: string, req: GenerateCharacterPortraitRequest) => {
    setPortraitJobs((prev) => ({ ...prev, [jobKey]: { status: 'generating' } }));
    void (async () => {
      try {
        const { imageDataUrl } = await generateCharacterPortrait(req);
        setPortraitJobs((prev) => ({ ...prev, [jobKey]: { status: 'done', previewDataUrl: imageDataUrl } }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '生成失败';
        setPortraitJobs((prev) => ({ ...prev, [jobKey]: { status: 'error', error: msg } }));
      }
    })();
  }, []);

  /** 列表「AI」同款：缺图的角色定稿节点 + 场景主变体；跳过弹窗中待确认的肖像任务 */
  const [batchAssetGen, setBatchAssetGen] = useState<BatchAssetGenState | null>(null);
  const batchCancelRef = useRef<boolean>(false);
  const failedTasksRef = useRef<BatchTask[]>([]);
  const [failedTaskCount, setFailedTaskCount] = useState(0);
  const handleBatchGenerateMissingAssets = useCallback(async () => {
    const pd = project.productionDesign;
    const styleLock = !!project.meta.styleRefImageDataUrl?.trim();
    const styleRef = project.meta.styleRefSummary;
    type Task = { kind: 'char' | 'scene' | 'prop'; sheetId: string; variantId: string; prompt: string };
    const tasks: Task[] = [];

    for (const ch of project.characterAssets ?? []) {
      const ensured = ensureCharacterLookTree(ch);
      const node = getCharacterActiveNode(ensured) ?? ensured.lookTree?.[0];
      if (!node?.id || node.imageDataUrl) continue;
      const pk = getPortraitJobKey(ch.id, { mode: 'replace', nodeId: node.id });
      const pj = portraitJobs[pk];
      if (pj?.status === 'generating' || pj?.status === 'done') continue;
      const prompt = buildCharacterImagePrompt(
        ensured,
        { id: node.id, label: node.label, imageDataUrl: node.imageDataUrl },
        styleRef,
        pd,
        { enforceGlobalStyleLock: styleLock },
      );
      tasks.push({ kind: 'char', sheetId: ch.id, variantId: node.id, prompt });
    }

    for (const sc of project.sceneAssets ?? []) {
      const v0 = sc.variants[0];
      if (!v0?.id || v0.imageDataUrl) continue;
      const prompt = buildSceneImagePrompt(sc, v0, styleRef, pd, { enforceGlobalStyleLock: styleLock });
      tasks.push({ kind: 'scene', sheetId: sc.id, variantId: v0.id, prompt });
    }

    for (const pr of project.propAssets ?? []) {
      const v0 = pr.variants[0];
      if (!v0?.id || v0.imageDataUrl) continue;
      const prompt = buildPropImagePrompt(
        pr,
        v0,
        styleRef,
        pd,
        { enforceGlobalStyleLock: styleLock },
      );
      tasks.push({ kind: 'prop', sheetId: pr.id, variantId: v0.id, prompt });
    }

    if (tasks.length === 0) {
      setErr('没有可补全项：角色定稿/场景/道具主变体已有图，或肖像弹窗中有待确认预览。');
      return;
    }

    setErr(null);
    batchCancelRef.current = false;
    failedTasksRef.current = [];
    setFailedTaskCount(0);
    setBatchAssetGen({
      current: 0,
      total: tasks.length,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
      currentLabel: '',
      failedTasks: [],
    });
    const g = project.meta.styleRefImageDataUrl?.trim();

    // 并发控制：线性执行，避免并发放大生图失败率
    const CONCURRENCY = 1;
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const failMessages: string[] = [];
    const runTask = async (t: Task) => {
      if (batchCancelRef.current) return;
      setGenKey(`${t.kind}:${t.sheetId}:${t.variantId}`);
      setBatchAssetGen((prev) => prev ? { ...prev, currentLabel: `${t.kind === 'char' ? '角色' : t.kind === 'scene' ? '场景' : '道具'} ${t.sheetId}` } : null);
      try {
        const timeoutMs = 180_000;
        const res = await Promise.race([
          generateFrames({
            prompt: t.prompt,
            aspectRatio: ar,
            shotIndex: 0,
            singleFrameOnly: true,
            ...(g ? { globalStyleReferenceFrame: g } : {}),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`生成超时（>${Math.round(timeoutMs / 1000)}s）`)), timeoutMs),
          ),
        ]);
        if (batchCancelRef.current) return;
        const img = res.firstFrame;
        // 每张完成立刻更新画面，后台上传替换为持久 URL
        const applyBatchImg = (url: string) => {
          setProject((p) => {
            if (t.kind === 'char') {
              const sheets = p.characterAssets ?? [];
              return {
                ...p,
                characterAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'char') as CharacterSheet[],
              };
            }
            if (t.kind === 'scene') {
              const sheets = p.sceneAssets ?? [];
              return {
                ...p,
                sceneAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'scene') as SceneSheet[],
              };
            }
            const sheets = p.propAssets ?? [];
            return {
              ...p,
              propAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'prop') as PropSheet[],
            };
          });
        };
        applyBatchImg(img);
        if (img.startsWith('data:')) {
          const mime = img.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
          uploadProductionImage(img, mime, `${t.kind}-${t.sheetId}`).then(({ url }) => applyBatchImg(url)).catch(() => {});
        }
        successCount++;
      } catch (e) {
        failedCount++;
        const msg = e instanceof Error ? e.message : '生成失败';
        if (failMessages.length < 3) failMessages.push(msg);
        if (!batchCancelRef.current) {
          console.warn(`[batch] ${t.kind} ${t.sheetId} 生成失败:`, msg);
        }
        setBatchAssetGen((prev) => prev ? {
          ...prev,
          failedTasks: [...(prev.failedTasks ?? []), t],
        } : null);
        failedTasksRef.current = [...failedTasksRef.current, t];
        setFailedTaskCount((n) => n + 1);
      } finally {
        completedCount++;
        setBatchAssetGen((prev) => prev
          ? {
              ...prev,
              current: completedCount,
              success: successCount,
              failed: failedCount,
            }
          : null);
      }
    };

    // 任务队列并发执行（worker 池）
    try {
      let cursor = 0;
      const worker = async () => {
        while (!batchCancelRef.current) {
          const idx = cursor++;
          if (idx >= tasks.length) break;
          const task = tasks[idx];
          if (!task) break;
          await runTask(task);
        }
      };
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, tasks.length) },
        () => worker(),
      );
      await Promise.all(workers);

      if (batchCancelRef.current) {
        setErr('已取消补全缺图。');
      } else if (successCount === 0) {
        setErr(`补全失败：${failMessages[0] ?? '请检查云端 API 的 Compass/Imagen 配置是否可用。'}`);
      } else if (failedCount > 0) {
        const hint = failMessages[0] ? `；首个错误：${failMessages[0]}` : '';
        setErr(`部分补全成功：${successCount} 项成功，${failedCount} 项失败${hint}`);
        toast.error(`补全完成：${successCount} 成功，${failedCount} 失败`);
        sendBrowserNotification(
          successCount > 0 ? '生图完成' : '生图任务结束',
          `成功 ${successCount} 项，失败 ${failedCount} 项`
        );
      } else {
        toast.success(`已补全 ${successCount} 项缺图`);
        sendBrowserNotification(
          successCount > 0 ? '生图完成' : '生图任务结束',
          `成功 ${successCount} 项，失败 ${failedCount} 项`
        );
      }
    } finally {
      setGenKey(null);
      setBatchAssetGen(null);
      batchCancelRef.current = false;
    }
  }, [
    project.characterAssets,
    project.sceneAssets,
    project.propAssets,
    project.productionDesign,
    project.meta.styleRefSummary,
    project.meta.styleRefImageDataUrl,
    portraitJobs,
    ar,
  ]);

  const clearStylePreview = useCallback(() => {
    stylePreviewRevokeRef.current?.();
    stylePreviewRevokeRef.current = null;
    setStyleRefPreview(null);
  }, []);

  const handleRetryFailed = useCallback(async () => {
    const tasks = failedTasksRef.current;
    if (tasks.length === 0) return;
    setErr(null);
    batchCancelRef.current = false;
    failedTasksRef.current = [];
    setFailedTaskCount(0);
    setBatchAssetGen({
      current: 0,
      total: tasks.length,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
      currentLabel: '',
      failedTasks: [],
    });
    const g = project.meta.styleRefImageDataUrl?.trim();
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const failMessages: string[] = [];
    const runTask = async (t: BatchTask) => {
      if (batchCancelRef.current) return;
      setGenKey(`${t.kind}:${t.sheetId}:${t.variantId}`);
      setBatchAssetGen((prev) => prev ? { ...prev, currentLabel: `${t.kind === 'char' ? '角色' : t.kind === 'scene' ? '场景' : '道具'} ${t.sheetId}` } : null);
      try {
        const timeoutMs = 180_000;
        const res = await Promise.race([
          generateFrames({
            prompt: t.prompt,
            aspectRatio: ar,
            shotIndex: 0,
            singleFrameOnly: true,
            ...(g ? { globalStyleReferenceFrame: g } : {}),
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`生成超时（>${Math.round(timeoutMs / 1000)}s）`)), timeoutMs),
          ),
        ]);
        if (batchCancelRef.current) return;
        const img = res.firstFrame;
        const applyImg = (url: string) => {
          setProject((p) => {
            if (t.kind === 'char') {
              const sheets = p.characterAssets ?? [];
              return { ...p, characterAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'char') as CharacterSheet[] };
            }
            if (t.kind === 'scene') {
              const sheets = p.sceneAssets ?? [];
              return { ...p, sceneAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'scene') as SceneSheet[] };
            }
            const sheets = p.propAssets ?? [];
            return { ...p, propAssets: updateVariantImage(sheets, t.sheetId, t.variantId, url, 'prop') as PropSheet[] };
          });
        };
        applyImg(img);
        if (img.startsWith('data:')) {
          const mime = img.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
          uploadProductionImage(img, mime, `${t.kind}-${t.sheetId}`).then(({ url }) => applyImg(url)).catch(() => {});
        }
        successCount++;
      } catch (e) {
        failedCount++;
        const msg = e instanceof Error ? e.message : '生成失败';
        if (failMessages.length < 3) failMessages.push(msg);
        setBatchAssetGen((prev) => prev ? { ...prev, failedTasks: [...(prev.failedTasks ?? []), t] } : null);
        failedTasksRef.current = [...failedTasksRef.current, t];
        setFailedTaskCount((n) => n + 1);
      } finally {
        completedCount++;
        setBatchAssetGen((prev) => prev ? { ...prev, current: completedCount, success: successCount, failed: failedCount } : null);
      }
    };
    try {
      let cursor = 0;
      const worker = async () => {
        while (!batchCancelRef.current) {
          const idx = cursor++;
          if (idx >= tasks.length) break;
          const task = tasks[idx];
          if (!task) break;
          await runTask(task);
        }
      };
      await worker();
      if (failedCount > 0) {
        const hint = failMessages[0] ? `；首个错误：${failMessages[0]}` : '';
        setErr(`重试完成：${successCount} 成功，${failedCount} 仍失败${hint}`);
      } else {
        toast.success(`重试成功：${successCount} 项已补全`);
      }
    } finally {
      setGenKey(null);
      setBatchAssetGen(null);
      batchCancelRef.current = false;
    }
  }, [project.meta.styleRefImageDataUrl, ar]);

  // 优先从服务端加载（URL 参数 > localStorage 记录的上次 id）
  useEffect(() => {
    const idToLoad = urlProjectId || lastStoredId;
    if (!idToLoad) {
      setIsServerBootstrapping(false);
      setCanAutoPersist(true);
      return;
    }
    void (async () => {
      try {
        const raw = await loadProductionProject(idToLoad);
        if (raw && typeof raw === 'object' && 'project' in raw) {
          const s = raw as unknown as StoredWizard;
          const serverProject = migrateProject(s.project);
          // Merge video data from localStorage: the server sync is debounced
          // (3 s), so a page refresh right after video generation may leave the
          // server copy stale.  localStorage is written synchronously on every
          // state change, so it may contain newer video paths/versions.
          const local = loadStored();
          if (local?.project?.shots?.length) {
            serverProject.shots = mergeShotVideoVersions(
              serverProject.shots,
              local.project.shots,
            );
          }
          setProject(serverProject);
          if (s.characterBible) setCharacterBible(s.characterBible);
          if (s.synopsis) setSynopsis(s.synopsis);
          if (s.structureTemplate) setStructureTemplate(s.structureTemplate);
          if (s.maxTotalDurationSec) setMaxTotalDurationSec(s.maxTotalDurationSec);
          if (typeof s.step === 'number') setStep(s.step);
          if (s.storyGenre) setStoryGenre(s.storyGenre);
          setServerProjectId(idToLoad);
          // 确保 URL 带上 projectId
          const url = new URL(window.location.href);
          if (url.searchParams.get('projectId') !== idToLoad) {
            url.searchParams.set('projectId', idToLoad);
            window.history.replaceState(null, '', url.toString());
          }
          setCanAutoPersist(true);
        }
      } catch {
        // 服务端加载失败（项目不存在），降级读 localStorage
        if (!urlProjectId) {
          const fallback = loadStored();
          if (fallback) {
            setProject(migrateProject(fallback.project));
            setCharacterBible(fallback.characterBible);
            setSynopsis(fallback.synopsis);
            setStructureTemplate(fallback.structureTemplate);
            setMaxTotalDurationSec(fallback.maxTotalDurationSec);
            setStep(fallback.step);
            setStoryGenre(fallback.storyGenre);
          }
          setCanAutoPersist(true);
        } else {
          // URL 指定项目加载失败时，暂停自动保存，避免把空白初始态覆盖回服务端
          setCanAutoPersist(false);
          setErr('项目加载失败，已暂停自动保存以避免覆盖云端数据。请刷新重试。');
        }
      } finally {
        setIsServerBootstrapping(false);
      }
    })();
  // 仅在挂载时执行一次
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stylePreviewRevokeRef.current?.();
    };
  }, []);

  /** 从草稿恢复立项参考图缩略（blob 仅内存，持久化靠 meta.styleRefImageDataUrl） */
  useEffect(() => {
    const d = project.meta.styleRefImageDataUrl?.trim();
    if (d?.startsWith('data:image/')) {
      setStyleRefPreview((prev) => prev ?? d);
    }
  }, [project.meta.styleRefImageDataUrl]);

  useEffect(() => {
    if (isServerBootstrapping || !canAutoPersist) return;
    const data: StoredWizard = {
      project,
      characterBible,
      synopsis,
      structureTemplate,
      maxTotalDurationSec,
      step,
      storyGenre,
    };
    saveStored(data);
    if (needsFlushRef.current) {
      needsFlushRef.current = false;
      flushServerSync(data);
    } else {
      scheduleServerSync(data);
    }
  }, [
    project,
    characterBible,
    synopsis,
    structureTemplate,
    maxTotalDurationSec,
    step,
    storyGenre,
    scheduleServerSync,
    flushServerSync,
    isServerBootstrapping,
    canAutoPersist,
  ]);

  useEffect(() => {
    if (project.shots.length && selectedShotIdx >= project.shots.length) {
      setSelectedShotIdx(Math.max(0, project.shots.length - 1));
    }
  }, [project.shots.length, selectedShotIdx]);

  useEffect(() => {
    if (step !== 2) {
      setPortraitEdit(null);
      setTreeFocusCharacterId(null);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 2 || l2Tab !== 'characters') {
      setTreeFocusCharacterId(null);
      return;
    }
    const list = project.characterAssets ?? [];
    if (!list.length) {
      setTreeFocusCharacterId(null);
      return;
    }
    setTreeFocusCharacterId((id) => (id && list.some((c) => c.id === id) ? id : list[0]!.id));
  }, [step, l2Tab, project.characterAssets]);

  const handleStoryArc = useCallback(async () => {
    if (!characterBible.trim() || !synopsis.trim()) {
      setErr('请填写角色设定与故事梗概');
      return;
    }
    setErr(null);
    setBusyL1(true);
    try {
      const { story } = await postStoryArc({
        characterBible: characterBible.trim(),
        synopsis: synopsis.trim(),
        styleRef: project.meta.styleRefSummary.trim(),
        structureTemplate,
      });
      const characterAssets = buildCharacterSheetsFromStory(story);
      const sceneAssets = buildSceneSheetsFromStory(story);
      setProject((p) => ({
        ...p,
        story,
        productionDesign: null,
        shots: [],
        assembled: null,
        characterAssets,
        sceneAssets,
        propAssets: [],
      }));
      setStep(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusyL1(false);
    }
  }, [characterBible, synopsis, project.meta.styleRefSummary, structureTemplate]);

  const handleL2 = useCallback(async () => {
    if (!project.story) {
      setErr('请先生成故事结构');
      return;
    }
    setErr(null);
    setBusyL2(true);
    try {
      const { productionDesign } = await postProductionDesign({ story: project.story });
      setProject((p) => {
        const baseScenes = p.sceneAssets?.length ? p.sceneAssets : buildSceneSheetsFromStory(p.story!);
        const nextProps = buildPropSheetsFromProductionDesign(productionDesign);
        return {
          ...p,
          productionDesign,
          shots: [],
          assembled: null,
          sceneAssets: mergeSceneSheetsFromL2(baseScenes, productionDesign),
          propAssets: mergePropSheetsPreservingImages(nextProps, p.propAssets ?? []),
        };
      });
      setStep(2);
      setL2Tab('characters');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusyL2(false);
    }
  }, [project.story]);

  const handleL3 = useCallback(async () => {
    if (!project.story || !project.productionDesign) return;
    setErr(null);
    setBusyL3(true);
    try {
      const { shots } = await postStoryboardTable({
        story: project.story,
        productionDesign: project.productionDesign,
        maxTotalDurationSec,
      });
      setProject((p) => ({ ...p, shots, assembled: null }));
      setStep(3);
      setSelectedShotIdx(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusyL3(false);
    }
  }, [project.story, project.productionDesign, maxTotalDurationSec]);

  const {
    runGenerateFrame,
    handleUploadVariant,
    addCharacterVariant,
    addSceneVariant,
    addPropVariant,
    handleScenePropGenerate,
    handleScenePropConfirm,
    handleScenePropReset,
    addManualCharacter,
    handleImportFromLibrary,
    handleTreeSheetChange,
    handleRemoveCharacterVariant,
    handlePortraitSheetUpdate,
    handleConfirmPortrait,
  } = useProductionStep2Handlers({
    ar,
    styleRefImageDataUrl: project.meta.styleRefImageDataUrl,
    scenePropModal,
    scenePropPreview,
    portraitEdit,
    setProject,
    setErr,
    setGenKey,
    setScenePropGenBusy,
    setScenePropError,
    setScenePropPreview,
    setScenePropModal,
    setShowLibraryImport,
    setPortraitJobs,
    setPortraitEdit,
  });

  const handleFile = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      void (async () => {
        setErr(null);
        setBusyVis(true);
        try {
          const { characterVisualProfile } = await postExtractCharacterVisuals({
            imageBase64: dataUrl,
            mimeType: file.type,
          });
          setProject((p) => ({ ...p, characterVisualProfile, assembled: null }));
        } catch (e) {
          setErr(e instanceof Error ? e.message : '视觉提取失败');
        } finally {
          setBusyVis(false);
        }
      })();
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAssemble = useCallback(async () => {
    if (!project.shots.length) {
      setErr('请先生成分镜表');
      return;
    }
    setErr(null);
    setBusyAsm(true);
    try {
      const assembled = await postAssemblePrompts({
        shots: project.shots,
        characterVisualProfile: project.characterVisualProfile,
      });
      setProject((p) => ({ ...p, assembled }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : '组装失败');
    } finally {
      setBusyAsm(false);
    }
  }, [project.shots, project.characterVisualProfile]);

  const copyAllSeedance = useCallback(() => {
    if (!project.assembled?.shots.length) return;
    const text = project.assembled.shots.map((s) => `--- 镜${s.shotIndex} ---\n${s.seedanceBlock}`).join('\n\n');
    void navigator.clipboard.writeText(text);
  }, [project.assembled]);

  const handleStyleRefFile = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith('image/')) return;
      clearStylePreview();
      const url = URL.createObjectURL(file);
      stylePreviewRevokeRef.current = () => URL.revokeObjectURL(url);
      setStyleRefPreview(url);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProject((p) => ({
          ...p,
          meta: { ...p.meta, styleRefImageDataUrl: dataUrl },
        }));
        void (async () => {
          setErr(null);
          setBusyStyle(true);
          try {
            const { styleReference } = await postExtractStyleReference({
              imageBase64: dataUrl,
              mimeType: file.type,
            });
            setProject((p) => ({
              ...p,
              meta: {
                ...p.meta,
                styleRefImageDataUrl: dataUrl,
                styleRefSummary: styleReference.styleRefSummary,
                styleRefAnalysis: styleReference,
              },
            }));
          } catch (e) {
            setErr(e instanceof Error ? e.message : '风格反解析失败');
          } finally {
            setBusyStyle(false);
          }
        })();
      };
      reader.readAsDataURL(file);
    },
    [clearStylePreview],
  );

  const resetDraft = useCallback(() => {
    if (!confirm('清空本地草稿并恢复初始状态？')) return;
    clearStylePreview();
    setProject(emptyProductionProject());
    setCharacterBible('');
    setSynopsis('');
    setStoryGenre('');
    setStructureTemplate('three_act');
    setMaxTotalDurationSec(60);
    setStep(0);
    setPortraitEdit(null);
    setPortraitJobs({});
    setServerProjectId(null);
    localStorage.removeItem(PRODUCTION_STORAGE_KEY);
    localStorage.removeItem('gobs_last_project_id');
    // 清除 URL 中的 projectId
    const url = new URL(window.location.href);
    url.searchParams.delete('projectId');
    window.history.replaceState(null, '', url.toString());
  }, [clearStylePreview]);

  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const handleProjectTitleChange = (nextTitle: string) => {
    setProject((p) => ({ ...p, meta: { ...p.meta, title: nextTitle } }));
    if (nextTitle.trim()) {
      setTimeout(() => setTitleSaved(true), 1000);
      setTimeout(() => setTitleSaved(false), 3000);
    }
  };

  const patchStory = useCallback((fn: (s: StoryArcLayer) => StoryArcLayer) => {
    setProject((p) => {
      if (!p.story) return p;
      return { ...p, story: fn(p.story) };
    });
  }, []);

  const patchShot = useCallback((idx: number, patch: Partial<ProductionShot>) => {
    setProject((p) => {
      const shots = [...p.shots];
      if (!shots[idx]) return p;
      shots[idx] = { ...shots[idx], ...patch } as ProductionShot;
      return { ...p, shots, assembled: null };
    });
  }, []);

  const syncAssetsFromStory = useCallback(() => {
    setProject((p) => {
      if (!p.story) return p;
      const builtCh = buildCharacterSheetsFromStory(p.story).map((s) => ensureCharacterLookTree(s));
      const prevCh = p.characterAssets ?? [];
      const characterAssets = mergeCharacterSheetsPreservingLooks(builtCh, prevCh);
      let sceneAssets = buildSceneSheetsFromStory(p.story);
      if (p.productionDesign) sceneAssets = mergeSceneSheetsFromL2(sceneAssets, p.productionDesign);
      const prevSc = p.sceneAssets ?? [];
      sceneAssets = mergeSceneSheetsPreservingImages(sceneAssets, prevSc);
      let propAssets = p.propAssets ?? [];
      if (p.productionDesign?.props?.length) {
        const built = buildPropSheetsFromProductionDesign(p.productionDesign);
        propAssets = mergePropSheetsPreservingImages(built, propAssets);
      }
      return { ...p, characterAssets, sceneAssets, propAssets };
    });
  }, []);

  const handleGenerateShotFrame = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s || !project.productionDesign) return;
    const shotId = String(s.shotIndex);
    setShotBusy(shotId, 'frame');
    setErr(null);
    try {
      const prompt = buildProductionShotFramePrompt(
        s,
        project.meta.styleRefSummary,
        project.productionDesign,
        { lockGlobalStyle: !!project.meta.styleRefImageDataUrl?.trim() },
      );
      const res = await generateFrames({
        prompt,
        aspectRatio: ar,
        shotIndex: 0,
        singleFrameOnly: true,
        ...(project.meta.styleRefImageDataUrl?.trim()
          ? { globalStyleReferenceFrame: project.meta.styleRefImageDataUrl }
          : {}),
      });
      patchShot(selectedShotIdx, { previewStillDataUrl: res.firstFrame });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '分镜图生成失败');
    } finally {
      clearShotBusy(shotId);
    }
  }, [
    project.shots,
    project.productionDesign,
    project.meta.styleRefSummary,
    project.meta.styleRefImageDataUrl,
    ar,
    selectedShotIdx,
    patchShot,
    setShotBusy,
    clearShotBusy,
  ]);

  /** 核心：提交即梦 + 注册 batch-job（参数化版本，供单镜 / 批量共用）。 */
  const generateVideoForShotIdx = useCallback(async (shotIdx: number) => {
    const s = project.shots[shotIdx];
    if (!s) return;
    const shotId = String(s.shotIndex);
    setShotBusy(shotId, 'video');
    const cancelToken = { cancelled: false };
    shotCancelMap.current[shotId] = cancelToken;

    const queueSlot = { resolve: (() => { /* replaced below */ }) as () => void };
    const prevQueue = dreaminaQueueRef.current;
    dreaminaQueueRef.current = new Promise<void>((resolve) => { queueSlot.resolve = resolve; });
    setShotQueuedMap((prev) => ({ ...prev, [shotId]: true }));
    await prevQueue;
    setShotQueuedMap((prev) => { const n = { ...prev }; delete n[shotId]; return n; });
    if (cancelToken.cancelled) {
      queueSlot.resolve();
      clearShotBusy(shotId);
      delete shotCancelMap.current[shotId];
      return;
    }

    try {
      const pref = project.meta.shotVideoDreaminaModel?.trim();
      const mv = project.meta.dreaminaModelVersion?.trim();
      const dur = Math.min(60, Math.max(4, Math.round(s.durationSec || 6)));

      let storyboardText = '';
      let model = '';
      let extraBody: Record<string, unknown> = {};

      if (pref === 'dreamina-multimodal') {
        const pack = await buildShotMultimodalRefPackAsync(
          s,
          project.characterAssets ?? [],
          project.sceneAssets ?? [],
          project.propAssets ?? [],
          s.manualRefOverrides,
        );
        if (!pack.multimodalImages.length) {
          setErr('全能参考需要至少一张角色、场景或道具参考图：请在对应资产卡生成图，并确保本镜文案中出现角色姓名或道具名称。');
          return;
        }
        const base = buildProductionShotVideoStoryboardText(s);
        if (!base.trim()) { setErr('请先填写本镜的结构化 Prompt 或对白，再生成视频'); return; }
        storyboardText = (s.videoStoryboardOverride?.trim() || pack.defaultVideoPrompt).trim();
        model = 'dreamina-multimodal';
        extraBody = { multimodalImages: pack.multimodalImages };
      } else {
        storyboardText = buildProductionShotVideoStoryboardText(s);
        if (!storyboardText.trim()) { setErr('请先填写本镜的结构化 Prompt 或对白，再生成视频'); return; }
        const base64Raw = s.previewStillDataUrl?.replace(/^data:image\/\w+;base64,/, '');
        const hasStill = !!base64Raw?.trim();
        if (pref === 'dreamina-text2video' || pref === 'dreamina-image2video') {
          model = pref;
        } else {
          model = hasStill ? 'dreamina-image2video' : 'dreamina-text2video';
        }
        if (model === 'dreamina-image2video' && !hasStill) {
          setErr('即梦图生视频需要本镜分镜静帧：请先「生成分镜图」，或在下拉里改选「即梦·文生视频」。');
          return;
        }
        if (hasStill && model === 'dreamina-image2video') {
          extraBody = { imageBase64: base64Raw, imageMimeType: 'image/png' };
        }
      }

      const styleRef = project.meta.styleRefSummary?.trim();
      const lighting = s.structuredStill?.sp_lighting?.trim();
      const color = s.structuredStill?.sp_style?.trim();
      const styleSuffix = [
        lighting && !storyboardText.includes(lighting) ? `光影：${lighting}` : '',
        color && !storyboardText.includes(color) ? `色调：${color}` : '',
        styleRef && !storyboardText.includes(styleRef) ? `整体视觉风格：${styleRef}` : '',
      ].filter(Boolean).join('\n');
      if (styleSuffix) storyboardText = `${storyboardText}\n${styleSuffix}`;

      const submitReq = {
        storyboardText,
        materials: [] as { id: string; name: string; mimeType?: string }[],
        duration: dur,
        aspectRatio: ar,
        model,
        source: 'production' as const,
        ...(mv ? { dreaminaModelVersion: mv } : {}),
        ...extraBody,
      };

      const is1310Error = (err: unknown): boolean => {
        const msg = err instanceof Error ? err.message : String(err);
        return /排队|1310|ExceedConcurrency/i.test(msg);
      };

      const waitForAnyJobCompletion = (): Promise<BatchJobDto> =>
        new Promise((resolve) => {
          const handler = (job: BatchJobDto) => {
            sseCompletionListenersRef.current.delete(handler);
            resolve(job);
          };
          sseCompletionListenersRef.current.add(handler);
        });

      let submit: { submitId: string; taskId: string };
      try {
        submit = await submitDreaminaAsync(submitReq);
        slowModeSuccessCountRef.current++;
        if (slowModeSuccessCountRef.current >= 2) {
          dreaminaSlowModeRef.current = false;
        }
      } catch (firstErr) {
        if (!is1310Error(firstErr)) throw firstErr;
        dreaminaSlowModeRef.current = true;
        slowModeSuccessCountRef.current = 0;
        toast.info('即梦并发受限，等待前一个视频完成后自动提交…');
        await waitForAnyJobCompletion();
        await new Promise<void>((r) => setTimeout(r, 5000));
        if (cancelToken.cancelled) throw new Error('已取消');
        try {
          submit = await submitDreaminaAsync(submitReq);
        } catch (retryErr) {
          throw is1310Error(retryErr)
            ? new Error('即梦仍在并发限制中，请稍后手动重试')
            : retryErr;
        }
      }

      setProject((p) => {
        const shots = [...p.shots];
        const cur = shots[shotIdx];
        if (!cur) return p;
        shots[shotIdx] = { ...cur, pendingVideoSubmitId: submit.submitId };
        return { ...p, shots };
      });

      const desc = storyboardText.slice(0, 120);
      try {
        await submitBatchJobs(serverProjectId || 'default', [{
          submitId: submit.submitId,
          taskId: submit.taskId,
          shotIndex: s.shotIndex,
          shotDescription: desc,
          model,
        }]);
      } catch (e) {
        console.warn('[production] batch-job 注册失败，视频仍在即梦生成中', e);
      }

      toast.success(`分镜 #${s.shotIndex} 已提交到即梦`);

      if (dreaminaSlowModeRef.current) {
        await waitForAnyJobCompletion();
      }
      queueSlot.resolve();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '分镜视频提交失败');
      queueSlot.resolve();
    } finally {
      clearShotBusy(shotId);
      setShotQueuedMap((prev) => { const n = { ...prev }; delete n[shotId]; return n; });
      delete shotCancelMap.current[shotId];
    }
  }, [
    project.shots,
    project.characterAssets,
    project.sceneAssets,
    project.propAssets,
    project.meta.shotVideoDreaminaModel,
    project.meta.dreaminaModelVersion,
    project.meta.styleRefSummary,
    ar,
    serverProjectId,
    setShotBusy,
    clearShotBusy,
    setProject,
    setShotQueuedMap,
  ]);

  const handleGenerateShotVideo = useCallback(async () => {
    setErr(null);
    await generateVideoForShotIdx(selectedShotIdx);
  }, [generateVideoForShotIdx, selectedShotIdx]);

  /** 批量生成所有缺少视频的分镜（利用自适应队列串行提交） */
  const handleBatchGenerateAllVideos = useCallback(() => {
    const missing = project.shots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.previewVideoUrl && !s.previewVideoPath && !s.pendingVideoSubmitId
        && !(s.previewVideoVersions?.length));
    if (missing.length === 0) {
      toast.info('所有分镜已有视频，无需生成');
      return;
    }
    // 持久化批量标记，刷新后可自动续接
    const batchKey = `gobs_batch_gen_${serverProjectId ?? 'local'}`;
    try { localStorage.setItem(batchKey, '1'); } catch { /* ignore */ }
    toast.info(`开始批量生成 ${missing.length} 个分镜视频…`);
    for (const { i } of missing) {
      void generateVideoForShotIdx(i);
    }
  }, [project.shots, serverProjectId, generateVideoForShotIdx]);

  // ── 刷新恢复：还原 pending 分镜的"生成中"展示 + 自动续接批量队列 ───────────
  const batchResumedRef = useRef(false);
  useEffect(() => {
    if (isServerBootstrapping || batchResumedRef.current) return;
    if (!project.shots.length) return;
    batchResumedRef.current = true;

    const pendingIds: string[] = [];
    for (const s of project.shots) {
      if (s.pendingVideoSubmitId) {
        pendingIds.push(String(s.shotIndex));
      }
    }
    if (pendingIds.length) {
      setShotBusyMap((prev) => {
        const next = { ...prev };
        for (const id of pendingIds) next[id] = 'video';
        return next;
      });
    }

    const batchKey = `gobs_batch_gen_${serverProjectId ?? 'local'}`;
    const hadBatch = (() => { try { return localStorage.getItem(batchKey) === '1'; } catch { return false; } })();
    if (hadBatch) {
      const remaining = project.shots.filter((s) =>
        !s.previewVideoUrl && !s.previewVideoPath && !s.pendingVideoSubmitId
        && !(s.previewVideoVersions?.length),
      );
      if (remaining.length > 0) {
        toast.info(`检测到 ${remaining.length} 个分镜视频待生成，自动续接批量队列…`);
        setTimeout(() => {
          for (const s of remaining) {
            const idx = project.shots.indexOf(s);
            if (idx >= 0) void generateVideoForShotIdx(idx);
          }
        }, 2000);
      } else {
        try { localStorage.removeItem(batchKey); } catch { /* ignore */ }
      }
    }
  }, [isServerBootstrapping, project.shots, serverProjectId, generateVideoForShotIdx]);

  // ── 手动检查视频生成进度 ─────────────────────────────────────────────────
  const [checkingProgress, setCheckingProgress] = useState(false);
  const handleCheckVideoProgress = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s?.pendingVideoSubmitId) return;
    setCheckingProgress(true);
    try {
      // 先找到 batch-job
      const { jobs } = await import('../api/batchJobs').then((m) => m.getBatchJobs(serverProjectId || undefined));
      const bj = jobs.find((j) => j.submitId === s.pendingVideoSubmitId);
      if (bj) {
        const { job } = await pollBatchJobNow(bj.id);
        if (job.status === 'done' && job.videoUrl) {
          saveShotVideo(selectedShotIdx, job.videoUrl, job.taskId || `dreamina-${s.pendingVideoSubmitId}`, undefined);
          toast.success(`分镜 ${s.shotIndex} 视频已就绪`);
        } else if (job.status === 'failed') {
          toast.error(`分镜 ${s.shotIndex} 生成失败：${job.failReason || '未知'}`);
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[selectedShotIdx];
            if (!cur) return p;
            shots[selectedShotIdx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
        } else {
          toast.info(`分镜 ${s.shotIndex} 仍在生成中（${job.status}）`);
        }
      } else {
        // 没有 batch-job 记录——直接查即梦
        const st = await getDreaminaTaskStatus(s.pendingVideoSubmitId);
        if (st.status === 'completed' && st.videoUrl) {
          saveShotVideo(selectedShotIdx, st.videoUrl, st.taskId || `dreamina-${s.pendingVideoSubmitId}`, st.videoPath);
          toast.success(`分镜 ${s.shotIndex} 视频已就绪`);
        } else if (st.status === 'failed') {
          toast.error(`分镜 ${s.shotIndex} 生成失败：${st.failReason || '未知'}`);
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[selectedShotIdx];
            if (!cur) return p;
            shots[selectedShotIdx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
        } else {
          toast.info(`分镜 ${s.shotIndex} 仍在生成中`);
        }
      }
    } catch (e) {
      toast.error(`检查失败：${e instanceof Error ? e.message : '网络异常'}`);
    } finally {
      setCheckingProgress(false);
    }
  }, [project.shots, selectedShotIdx, serverProjectId, saveShotVideo, setProject]);

  // ── AI 审片助手 ──────────────────────────────────────────────────────────
  const [aiReviewResult, setAiReviewResult] = useState<ShotReviewResult | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  const handleAiReview = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s) return;
    setAiReviewing(true);
    setAiReviewResult(null);
    try {
      const result = await postShotReview(
        s as unknown as Record<string, unknown>,
        project.meta.styleRefSummary,
        project.meta.title,
      );
      setAiReviewResult(result);
    } catch (e) {
      toast.error(`AI 审片失败：${e instanceof Error ? e.message : '网络异常'}`);
    } finally {
      setAiReviewing(false);
    }
  }, [project.shots, selectedShotIdx, project.meta.styleRefSummary, project.meta.title]);

  const handleApplySuggestion = useCallback((suggestion: ShotReviewSuggestion) => {
    const path = suggestion.field.split('.');
    if (path.length === 2) {
      const [group, key] = path;
      if (group === 'structuredStill') {
        patchShot(selectedShotIdx, {
          structuredStill: {
            ...(project.shots[selectedShotIdx]?.structuredStill ?? {} as any),
            [key]: suggestion.suggestedValue,
          },
        });
      } else if (group === 'structuredMotion') {
        patchShot(selectedShotIdx, {
          structuredMotion: {
            ...(project.shots[selectedShotIdx]?.structuredMotion ?? {} as any),
            [key]: suggestion.suggestedValue,
          },
        });
      }
    } else if (path.length === 1) {
      patchShot(selectedShotIdx, { [path[0]]: suggestion.suggestedValue } as any);
    }
    toast.success(`已应用建议：${suggestion.field}`);
  }, [selectedShotIdx, project.shots, patchShot]);

  const handleApplyAllAndRegenerate = useCallback(() => {
    void generateVideoForShotIdx(selectedShotIdx);
  }, [generateVideoForShotIdx, selectedShotIdx]);

  // ── 分镜间一致性检查 ──────────────────────────────────────────────────────
  const [continuityIssues, setContinuityIssues] = useState<ContinuityIssue[] | null>(null);
  const [continuityChecking, setContinuityChecking] = useState(false);
  const handleContinuityCheck = useCallback(async () => {
    if (project.shots.length < 2) {
      toast.info('至少需要 2 个分镜才能进行一致性检查');
      return;
    }
    setContinuityChecking(true);
    setContinuityIssues(null);
    try {
      const result = await postContinuityCheck(
        project.shots as unknown as Record<string, unknown>[],
        project.meta.styleRefSummary,
      );
      setContinuityIssues(result.issues);
      if (result.issues.length === 0) {
        toast.success('分镜间一致性检查通过');
      } else {
        toast.info(`发现 ${result.issues.length} 个连续性问题`);
      }
    } catch (e) {
      toast.error(`一致性检查失败：${e instanceof Error ? e.message : '网络异常'}`);
    } finally {
      setContinuityChecking(false);
    }
  }, [project.shots, project.meta.styleRefSummary]);

  // ── 连续播放 / AB 对比 ─────────────────────────────────────────────────────
  const [showContinuousPlay, setShowContinuousPlay] = useState(false);
  const [showAbCompare, setShowAbCompare] = useState(false);

  const story = project.story;
  const chSheets = project.characterAssets ?? [];

  const characterStoryBio = useCallback((name: string) => {
    const c = project.story?.characters?.find((x) => x.name === name);
    if (!c) return undefined;
    return [c.goal, c.conflict, c.arc].filter(Boolean).join(' ');
  }, [project.story?.characters]);
  const scSheets = project.sceneAssets ?? [];
  const propSheets = project.propAssets ?? [];
  const shot = project.shots[selectedShotIdx];

  const [multimodalRefPack, setMultimodalRefPack] = useState<Awaited<ReturnType<typeof buildShotMultimodalRefPackAsync>> | null>(null);

  useEffect(() => {
    if (!shot) { setMultimodalRefPack(null); return; }
    let cancelled = false;
    buildShotMultimodalRefPackAsync(shot, chSheets, scSheets, propSheets, shot.manualRefOverrides)
      .then((pack) => { if (!cancelled) setMultimodalRefPack(pack); })
      .catch(() => { if (!cancelled) setMultimodalRefPack(null); });
    return () => { cancelled = true; };
  }, [shot, chSheets, scSheets, propSheets]);

  const shotBlob = useMemo(() => (shot ? buildShotBlobText(shot) : ''), [shot]);
  const shotVideoVersions = useMemo(() => {
    if (!shot) return [] as ProductionShotVideoVersion[];
    const list = Array.isArray(shot.previewVideoVersions) ? shot.previewVideoVersions : [];
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [shot]);
  const selectedShotVideoVersion = useMemo(() => {
    if (!shot) return null;
    const selectedId = shot.selectedPreviewVideoVersionId?.trim();
    return shotVideoVersions.find((v) => v.id === selectedId) ?? shotVideoVersions[0] ?? null;
  }, [shot, shotVideoVersions]);
  const shotPreviewPlaySrc = useMemo(
    () =>
      selectedShotVideoVersion
        ? resolveProductionShotPreviewVideoSrc({
            previewVideoPath: selectedShotVideoVersion.videoPath,
            previewVideoUrl: selectedShotVideoVersion.videoUrl,
          })
        : shot
          ? resolveProductionShotPreviewVideoSrc(shot)
          : '',
    [shot, selectedShotVideoVersion],
  );
  const selectShotVideoVersion = useCallback((versionId: string) => {
    setProject((p) => {
      const shots = [...p.shots];
      const cur = shots[selectedShotIdx];
      if (!cur) return p;
      const list = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
      const picked = list.find((v) => v.id === versionId);
      shots[selectedShotIdx] = {
        ...cur,
        selectedPreviewVideoVersionId: versionId,
        previewVideoPath: picked?.videoPath,
        previewVideoUrl: picked?.videoUrl,
      } as ProductionShot;
      return { ...p, shots, assembled: null };
    });
  }, [selectedShotIdx]);
  const keepOnlyShotVideoVersion = useCallback((versionId: string) => {
    setProject((p) => {
      const shots = [...p.shots];
      const cur = shots[selectedShotIdx];
      if (!cur) return p;
      const list = Array.isArray(cur.previewVideoVersions) ? cur.previewVideoVersions : [];
      const keep = list.find((v) => v.id === versionId);
      if (!keep) return p;
      shots[selectedShotIdx] = {
        ...cur,
        previewVideoVersions: [keep],
        selectedPreviewVideoVersionId: keep.id,
        previewVideoPath: keep.videoPath,
        previewVideoUrl: keep.videoUrl,
      } as ProductionShot;
      return { ...p, shots, assembled: null };
    });
    toast.success('已保留当前版本，其余版本已移除');
  }, [selectedShotIdx]);

  const multimodalAutoPrompt = multimodalRefPack?.defaultVideoPrompt ?? '';

  /** L1 场景 id 与当前分镜表 sceneRef 是否一一出现过（用于提示「为何 5 张场景图只用了 3 处」） */
  const storySceneCoverage = useMemo(() => {
    const plan = project.story?.scenePlan ?? [];
    if (!plan.length || !project.shots.length) return null;
    const used = new Set(project.shots.map((s) => String(s.sceneRef || '').trim()).filter(Boolean));
    const missing = plan.filter((p) => !used.has(String(p.id || '').trim()));
    return {
      hit: plan.length - missing.length,
      total: plan.length,
      missingLabels: missing.map((p) => (p.name || p.id || '').trim()).filter(Boolean),
    };
  }, [project.story?.scenePlan, project.shots]);

  const footerHint =
    step === 0
      ? '填写立项信息后可生成剧本大纲'
      : step === 1
        ? '确认故事摘要后可生成服化道并进入角色与场景'
        : step === 2
          ? '角色与场景将用于分镜引用，建议补全后再继续'
          : step === 3
            ? '检查分镜与 @ 引用后可导出 Prompt'
            : '分镜整合与 Seedance 导出；成片可在「生成视频 → 历史内容」查看';

  if (isServerBootstrapping) {
    return <ProductionBootstrappingView loadingProjectTitle={loadingProjectTitle} />;
  }

  return (
    <>
      <ProductionProvider
        value={{
          setStep,
          selectedShotIdx,
          setSelectedShotIdx,
          l2Tab,
          setL2Tab,
          checklistSubTab,
          setChecklistSubTab,
          showLibraryImport,
          setShowLibraryImport,
          portraitEdit,
          setPortraitEdit,
          scenePropModal,
          setScenePropModal,
          scenePropPreview,
          setScenePropPreview,
          scenePropError,
          setScenePropError,
          scenePropGenBusy,
          setLightboxSrc,
          patchShot,
        }}
      >
        <ProductionWizardShell
          projectTitle={project.meta.title}
          onProjectTitleChange={handleProjectTitleChange}
          titleSaved={titleSaved}
          onOpenProjectList={handleLoadProjectList}
          onResetDraft={resetDraft}
          steps={STEPS}
          step={step}
          onStepChange={setStep}
          err={err}
          footerHint={footerHint}
          onPrev={goPrev}
          onNext={goNext}
        >

        {/* Step 0 输入 */}
        {step === 0 && (
          <StepInput
            styleRefSummary={project.meta.styleRefSummary}
            onStyleRefSummaryChange={(next) =>
              setProject((p) => ({ ...p, meta: { ...p.meta, styleRefSummary: next } }))
            }
            aspectRatio={project.meta.aspectRatio ?? '16:9'}
            aspectOptions={ASPECT_OPTIONS}
            onAspectRatioChange={(next) =>
              setProject((p) => ({ ...p, meta: { ...p.meta, aspectRatio: next } }))
            }
            storyGenre={storyGenre}
            onStoryGenreChange={setStoryGenre}
            busyStyle={busyStyle}
            onStyleRefFileChange={handleStyleRefFile}
            styleRefPreview={styleRefPreview}
            characterBible={characterBible}
            onCharacterBibleChange={setCharacterBible}
            synopsis={synopsis}
            onSynopsisChange={setSynopsis}
            structureTemplate={structureTemplate}
            templateOptions={TEMPLATE_OPTIONS}
            onStructureTemplateChange={setStructureTemplate}
            busyL1={busyL1}
            onGenerateStoryArc={handleStoryArc}
          />
        )}

        {/* Step 1 剧本大纲（可编辑） */}
        {step === 1 && story && (
          <StepStoryArc
            styleRefSummary={project.meta.styleRefSummary}
            onStyleRefSummaryChange={(next) =>
              setProject((p) => ({ ...p, meta: { ...p.meta, styleRefSummary: next } }))
            }
            aspectRatioText={ar}
            storyGenre={storyGenre}
            onStoryGenreChange={setStoryGenre}
            story={story}
            patchStory={patchStory}
            busyL2={busyL2}
            onGenerateL2={handleL2}
          />
        )}

        {/* Step 2 角色与场景 */}
        {step === 2 && project.productionDesign && (
          <StepDesignWorkspace
            story={project.story ?? null}
            patchStory={patchStory}
            onSyncAssetsFromStory={syncAssetsFromStory}
            characterCount={chSheets.length}
            sceneCount={scSheets.length}
            propCount={(project.propAssets ?? []).length}
            batchAssetGen={batchAssetGen}
            onGenerateMissingAssets={() => void handleBatchGenerateMissingAssets()}
            onCancelBatch={() => {
              batchCancelRef.current = true;
            }}
            failedTaskCount={failedTaskCount}
            onRetryFailed={() => void handleRetryFailed()}
            onAddManualCharacter={addManualCharacter}
            onImportFromLibrary={handleImportFromLibrary}
            chSheets={chSheets}
            scSheets={scSheets}
            propSheets={propSheets}
            treeFocusCharacterId={treeFocusCharacterId}
            onTreeFocusChange={setTreeFocusCharacterId}
            portraitJobs={portraitJobs}
            onTreeSheetChange={handleTreeSheetChange}
            onUploadCharacterVariant={(file, sheetId, variantId) =>
              handleUploadVariant(file, sheetId, variantId, 'char')
            }
            onUploadSceneVariant={(file, sheetId, variantId) =>
              handleUploadVariant(file, sheetId, variantId, 'scene')
            }
            onUploadPropVariant={(file, sheetId, variantId) =>
              handleUploadVariant(file, sheetId, variantId, 'prop')
            }
            genKey={genKey}
            styleRefSummary={project.meta.styleRefSummary}
            styleRefImageDataUrl={project.meta.styleRefImageDataUrl}
            productionDesign={project.productionDesign}
            onGenerateCharacterFrame={(prompt, sheetId, variantId) => {
              void runGenerateFrame(prompt, sheetId, variantId, 'char');
            }}
            onRemoveCharacterVariant={handleRemoveCharacterVariant}
            onAddCharacterVariant={addCharacterVariant}
            onGenerateSceneFrame={(prompt, sheetId, variantId) => {
              void runGenerateFrame(prompt, sheetId, variantId, 'scene');
            }}
            onAddSceneVariant={addSceneVariant}
            onGeneratePropFrame={(prompt, sheetId, variantId) => {
              void runGenerateFrame(prompt, sheetId, variantId, 'prop');
            }}
            onAddPropVariant={addPropVariant}
            characterStoryBio={characterStoryBio}
            wardrobeSupplementForCharacter={(name) =>
              formatWardrobeSupplementForCharacter(name, project.productionDesign?.wardrobe)
            }
            productionAspectRatio={project.meta.aspectRatio ?? '16:9'}
            portraitJobByKey={(key) => portraitJobs[key]}
            onStartPortraitGenerate={handleStartPortraitGenerate}
            onPortraitSheetUpdate={handlePortraitSheetUpdate}
            onConfirmPortrait={handleConfirmPortrait}
            onGenerateScenePropImage={handleScenePropGenerate}
            onConfirmScenePropImage={handleScenePropConfirm}
            onResetScenePropImage={handleScenePropReset}
            busyL3={busyL3}
            maxTotalDurationSec={maxTotalDurationSec}
            onMaxTotalDurationSecChange={setMaxTotalDurationSec}
            onGenerateStoryboard={handleL3}
          />
        )}

        {/* Step 3 分镜（三栏 + 底条） */}
        {step === 3 && (project.shots.length > 0 || busyL3) && (
          <StepStoryboardWorkspace
            shot={shot}
            shots={project.shots}
            chSheets={chSheets}
            scSheets={scSheets}
            shotMediaBusy={shotBusyMap[String(shot?.shotIndex ?? '')] ?? null}
            shotBusyMap={shotBusyMap}
            shotQueuedMap={shotQueuedMap}
            storySceneCoverage={storySceneCoverage}
            styleRefSummary={project.meta.styleRefSummary}
            shotVideoDreaminaModel={project.meta.shotVideoDreaminaModel}
            dreaminaModelVersion={project.meta.dreaminaModelVersion}
            dreaminaAsync={dreaminaAsync}
            hasProductionDesign={!!project.productionDesign}
            multimodalRefPack={multimodalRefPack}
            multimodalAutoPrompt={multimodalAutoPrompt}
            shotBlob={shotBlob}
            shotPreviewPlaySrc={shotPreviewPlaySrc}
            shotVideoVersions={shotVideoVersions}
            selectedShotVideoVersion={selectedShotVideoVersion}
            busyL3={busyL3}
            onSetShotVideoDreaminaModel={(v) =>
              setProject((p) => ({
                ...p,
                meta: {
                  ...p.meta,
                  shotVideoDreaminaModel: v ? v : undefined,
                },
              }))
            }
            onSetDreaminaModelVersion={(v) =>
              setProject((p) => ({
                ...p,
                meta: { ...p.meta, dreaminaModelVersion: v ? v : undefined },
              }))
            }
            onGenerateShotFrame={() => void handleGenerateShotFrame()}
            onGenerateShotVideo={() => void handleGenerateShotVideo()}
            onBatchGenerateAllVideos={handleBatchGenerateAllVideos}
            onKeepOnlyCurrentVersion={keepOnlyShotVideoVersion}
            onSelectVideoVersion={selectShotVideoVersion}
            onCheckVideoProgress={() => void handleCheckVideoProgress()}
            checkingProgress={checkingProgress}
            aiReviewResult={aiReviewResult}
            aiReviewing={aiReviewing}
            onAiReview={() => void handleAiReview()}
            onApplySuggestion={handleApplySuggestion}
            onApplyAllAndRegenerate={handleApplyAllAndRegenerate}
            continuityIssues={continuityIssues}
            continuityChecking={continuityChecking}
            onContinuityCheck={() => void handleContinuityCheck()}
            onShowContinuousPlay={() => setShowContinuousPlay(true)}
            onShowAbCompare={() => setShowAbCompare(true)}
            projectTitle={project.meta.title}
          />
        )}

        {/* Step 4 导出 */}
        {step === 4 && (
          <StepExportWorkspace
            shots={project.shots}
            scSheets={scSheets}
            buildStoryLine={buildProductionShotVideoStoryboardText}
            resolveVideoSrc={resolveProductionShotPreviewVideoSrc}
            busyVis={busyVis}
            busyAsm={busyAsm}
            consistencySnippet={project.characterVisualProfile?.consistencySnippet ?? null}
            assembledShots={project.assembled?.shots ?? null}
            onPickReferenceImage={handleFile}
            onAssemblePrompts={() => void handleAssemble()}
            onCopyAllSeedance={copyAllSeedance}
            projectTitle={project.meta.title}
            aspectRatio={project.meta.aspectRatio}
            bgmPromptHint={
              project.productionDesign?.soundMusic?.music
                ?.map((m) => m.mood)
                .filter(Boolean)
                .join(', ') || undefined
            }
          />
        )}

        {step === 1 && !story && (
          <p className="text-sm text-[var(--color-text-muted)]">请先在「输入」步骤生成剧本大纲。</p>
        )}
        {step === 2 && !project.productionDesign && (
          <p className="text-sm text-[var(--color-text-muted)]">请先在「剧本大纲」步骤生成服化道。</p>
        )}
        {step === 3 && !project.shots.length && (
          <p className="text-sm text-[var(--color-text-muted)]">请先在「角色与场景」中生成分镜表。</p>
        )}
        </ProductionWizardShell>
      </ProductionProvider>

      <ProductionProjectListModal
        visible={showProjectList}
        projects={projectList}
        onClose={() => setShowProjectList(false)}
        onLoadProject={handleLoadServerProject}
      />
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {showContinuousPlay && (
        <StepStoryboardContinuousPlay
          shots={project.shots}
          resolveVideoSrc={resolveProductionShotPreviewVideoSrc}
          onClose={() => setShowContinuousPlay(false)}
          onSelectShot={(idx) => { setSelectedShotIdx(idx); setStep(3); }}
        />
      )}
      {showAbCompare && (
        <StepStoryboardAbCompare
          versions={shotVideoVersions}
          onClose={() => setShowAbCompare(false)}
        />
      )}
    </>
  );
}
