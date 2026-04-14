import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getVeoModels,
} from '../api/video';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
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
import { getDreaminaTaskStatus } from '../api/video';
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
  // 防止“服务端项目尚未加载完成时”把空白初始态覆盖回服务端
  const [isServerBootstrapping, setIsServerBootstrapping] = useState(shouldLoadFromServer);
  const [canAutoPersist, setCanAutoPersist] = useState(!shouldLoadFromServer);

  /** 防抖同步到服务端：project 变化后 3 秒触发 */
  const scheduleServerSync = useCallback((data: StoredWizard) => {
    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    serverSyncTimerRef.current = setTimeout(async () => {
      try {
        const result = await saveProductionProject(data as unknown as Record<string, unknown>, serverProjectId ?? undefined);
        setServerProjectId(result.id);
        // 写入 localStorage，供下次打开页面自动续接
        try { localStorage.setItem('gobs_last_project_id', result.id); } catch { /* ignore */ }
        // 把 projectId 写入 URL，避免刷新丢失（不产生历史记录）
        const url = new URL(window.location.href);
        if (url.searchParams.get('projectId') !== result.id) {
          url.searchParams.set('projectId', result.id);
          window.history.replaceState(null, '', url.toString());
        }
      } catch (e) {
        console.warn('[production] 服务端同步失败（localStorage 仍有数据）', e);
      }
    }, 3000);
  }, [serverProjectId]);

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
  // Per-shot cancel tokens (ref so mutations don't trigger re-render)
  const shotCancelMap = useRef<Record<string, { cancelled: boolean }>>({});
  // Dreamina allows only 1 concurrent generation (ExceedConcurrencyLimit / ret=1310)
  // Serialize all shot-video submissions through this promise chain.
  const dreaminaQueueRef = useRef<Promise<void>>(Promise.resolve());
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
  const shotVideoGen = useVideoGeneration({
    onError: (msg) => setErr(msg),
  });

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
    },
    [project.shots, project.meta.title, setProject],
  );

  /** 页面加载时恢复所有带 pendingVideoSubmitId 的分镜视频轮询（刷新前已提交但未完成的任务）。 */
  useEffect(() => {
    const shotsWithPending = project.shots
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => !!s.pendingVideoSubmitId);
    if (!shotsWithPending.length) return;

    for (const { s, idx } of shotsWithPending) {
      const submitId = s.pendingVideoSubmitId!;
      const shotId = String(s.shotIndex);
      setShotBusy(shotId, 'video');
      void (async () => {
        const MAX_POLL_MS = 10 * 60 * 1000;
        const startedAt = Date.now();
        try {
          while (Date.now() - startedAt < MAX_POLL_MS) {
            const st = await getDreaminaTaskStatus(submitId);
            if (st.status === 'failed') {
              throw new Error(st.failReason || '即梦任务失败');
            }
            if (st.status === 'completed' && st.videoUrl) {
              saveShotVideo(idx, st.videoUrl, st.taskId || `dreamina-${submitId}`, st.videoPath);
              return;
            }
            await new Promise<void>((r) => setTimeout(r, 5000));
          }
          throw new Error('即梦生成等待超时');
        } catch {
          // Clear the pending marker on failure so the user can retry
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[idx];
            if (!cur) return p;
            shots[idx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
        } finally {
          clearShotBusy(shotId);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

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
          setProject(migrateProject(s.project));
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
    scheduleServerSync(data);
  }, [
    project,
    characterBible,
    synopsis,
    structureTemplate,
    maxTotalDurationSec,
    step,
    storyGenre,
    scheduleServerSync,
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

  const handleGenerateShotVideo = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s) return;
    const shotId = String(s.shotIndex);
    setShotBusy(shotId, 'video');
    const cancelToken = { cancelled: false };
    shotCancelMap.current[shotId] = cancelToken;
    setErr(null);

    // Queue: wait for any in-flight Dreamina task to finish before submitting.
    // Use an object so TypeScript's control-flow analysis can't narrow the ref to never.
    const queueSlot = { resolve: (() => { /* replaced below */ }) as () => void };
    const prevQueue = dreaminaQueueRef.current;
    dreaminaQueueRef.current = new Promise<void>((resolve) => { queueSlot.resolve = resolve; });
    await prevQueue;
    if (cancelToken.cancelled) {
      queueSlot.resolve();
      clearShotBusy(shotId);
      delete shotCancelMap.current[shotId];
      return;
    }

    const persistShotVideo = (url: string, taskId: string, videoPath: string | undefined) => {
      saveShotVideo(selectedShotIdx, url, taskId, videoPath);
    };

    // Callback fired right after Dreamina task is submitted — saves submitId so a
    // page refresh during polling doesn't permanently lose the in-progress task.
    const onShotSubmitted = (submitId: string) => {
      setProject((p) => {
        const shots = [...p.shots];
        const cur = shots[selectedShotIdx];
        if (!cur) return p;
        shots[selectedShotIdx] = { ...cur, pendingVideoSubmitId: submitId };
        return { ...p, shots };
      });
    };

    try {
      const pref = project.meta.shotVideoDreaminaModel?.trim();
      const mv = project.meta.dreaminaModelVersion?.trim();
      const dur = Math.min(60, Math.max(4, Math.round(s.durationSec || 6)));

      if (pref === 'dreamina-multimodal') {
        const pack = await buildShotMultimodalRefPackAsync(
          s,
          project.characterAssets ?? [],
          project.sceneAssets ?? [],
          project.propAssets ?? [],
          s.manualRefOverrides,
        );
        if (!pack.multimodalImages.length) {
          setErr(
            '全能参考需要至少一张角色、场景或道具参考图：请在对应资产卡生成图，并确保本镜文案中出现角色姓名或道具名称。',
          );
          return;
        }
        const base = buildProductionShotVideoStoryboardText(s);
        if (!base.trim()) {
          setErr('请先填写本镜的结构化 Prompt 或对白，再生成视频');
          return;
        }
        const autoPrompt = pack.defaultVideoPrompt;
        const storyboardText = (s.videoStoryboardOverride?.trim() || autoPrompt).trim();

        if (dreaminaAsync) {
          const polled = await shotVideoGen.submitAsync('dreamina', {
            storyboardText,
            materials: [],
            duration: dur,
            aspectRatio: ar,
            model: 'dreamina-multimodal',
            multimodalImages: pack.multimodalImages,
            ...(mv ? { dreaminaModelVersion: mv } : {}),
          }, cancelToken, onShotSubmitted);
          if (polled?.videoUrl) {
            persistShotVideo(polled.videoUrl, polled.taskId, polled.videoPath);
          }
          return;
        }

        const res = await shotVideoGen.generateSync({
          storyboardText,
          materials: [],
          duration: dur,
          aspectRatio: ar,
          model: 'dreamina-multimodal',
          multimodalImages: pack.multimodalImages,
          ...(mv ? { dreaminaModelVersion: mv } : {}),
        });
        const url = res?.videoUrl;
        if (url && res.taskId) persistShotVideo(url, res.taskId, res.videoPath);
        else setErr('视频生成未返回地址');
        return;
      }

      const storyboardText = buildProductionShotVideoStoryboardText(s);
      if (!storyboardText.trim()) {
        setErr('请先填写本镜的结构化 Prompt 或对白，再生成视频');
        return;
      }
      const base64Raw = s.previewStillDataUrl?.replace(/^data:image\/\w+;base64,/, '');
      const hasStill = !!base64Raw?.trim();
      let model: string;
      if (pref === 'dreamina-text2video' || pref === 'dreamina-image2video') {
        model = pref;
      } else {
        model = hasStill ? 'dreamina-image2video' : 'dreamina-text2video';
      }
      if (model === 'dreamina-image2video' && !hasStill) {
        setErr('即梦图生视频需要本镜分镜静帧：请先「生成分镜图」，或在下拉里改选「即梦·文生视频」。');
        return;
      }

      if (dreaminaAsync) {
        const polled = await shotVideoGen.submitAsync('dreamina', {
          storyboardText,
          materials: [],
          duration: dur,
          aspectRatio: ar,
          model,
          ...(mv ? { dreaminaModelVersion: mv } : {}),
          ...(hasStill && model === 'dreamina-image2video'
            ? { imageBase64: base64Raw, imageMimeType: 'image/png' }
            : {}),
        }, cancelToken, onShotSubmitted);
        if (polled?.videoUrl) {
          persistShotVideo(polled.videoUrl, polled.taskId, polled.videoPath);
        }
        return;
      }

      const res = await shotVideoGen.generateSync({
        storyboardText,
        materials: [],
        duration: dur,
        aspectRatio: ar,
        model,
        ...(mv ? { dreaminaModelVersion: mv } : {}),
        ...(hasStill && model === 'dreamina-image2video'
          ? { imageBase64: base64Raw, imageMimeType: 'image/png' }
          : {}),
      });
      const url = res?.videoUrl;
      if (url && res.taskId) persistShotVideo(url, res.taskId, res.videoPath);
      else setErr('视频生成未返回地址');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '分镜视频生成失败');
    } finally {
      queueSlot.resolve(); // release the Dreamina queue so the next shot can submit
      clearShotBusy(shotId);
      delete shotCancelMap.current[shotId];
    }
  }, [
    project.shots,
    project.meta.title,
    project.characterAssets,
    project.sceneAssets,
    project.propAssets,
    project.meta.shotVideoDreaminaModel,
    project.meta.dreaminaModelVersion,
    ar,
    selectedShotIdx,
    patchShot,
    dreaminaAsync,
    shotVideoGen,
    setShotBusy,
    clearShotBusy,
    saveShotVideo,
    setProject,
  ]);

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
    patchShot(selectedShotIdx, { selectedPreviewVideoVersionId: versionId });
  }, [patchShot, selectedShotIdx]);
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
            onKeepOnlyCurrentVersion={keepOnlyShotVideoVersion}
            onSelectVideoVersion={selectShotVideoVersion}
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
    </>
  );
}
