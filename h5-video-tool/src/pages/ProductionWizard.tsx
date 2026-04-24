import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getVeoModels,
} from '../api/video';
import { buildAssetFileUrl, recordUsage } from '../api/assetLibraryApi';
import {
  emptyProductionProject,
  hasProductionShotPreviewMedia,
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
  sanitizeShotVideoVersions,
  saveStored,
  shouldMergeStoredShotVideoVersions,
  type KnownBatchJobOwnership,
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
import {
  deleteProductionProject,
  loadProductionProject,
  listProductionProjects,
  renameProductionProject,
  saveProductionProject,
  uploadProductionImage,
  type ProjectListItem,
} from '../api/production';
import { ApiError } from '../api/client';
import { toast } from '../components/Toast';
import { requestNotificationPermission, sendBrowserNotification } from '../utils/notification';
import { resolveProductionShotPreviewVideoSrc, saveVideoToHistory } from '../utils/videoHistory';
import { getDreaminaTaskStatus } from '../api/video';
import {
  cancelBatchByProject,
  cancelBatchJob,
  enqueueProductionShot,
  getBatchJobs,
  pollBatchJobNow,
  type BatchJobDto,
  type QueueSnapshotDto,
} from '../api/batchJobs';
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
import { useProductionShotReview } from '../studio/useProductionShotReview';
import { useProductionShotVersions } from '../studio/useProductionShotVersions';
import { useGlobalJobs } from '../hooks/useGlobalJobs';
import { resolveEnqueueJobState, resolveStoryboardQueueSnapshot } from '../studio/storyboardQueueState';
import { apiPost } from '../api/client';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { resolveReplyLocale } from '../i18n/replyLocale.ts';
import {
  hasMeaningfulProductionDraft,
  isUnnamedProductionProjectTitle,
  resolveUnnamedProjectGovernanceAction,
  shouldRequireProductionProjectNaming,
  suggestProductionProjectTitle,
} from '../utils/projectLifecycle.ts';

const TEMPLATE_OPTION_VALUES: StructureTemplate[] = ['three_act', 'five_act', 'save_the_cat'];

const ASPECT_OPTIONS = ['16:9', '9:16', '1:1', '4:3'] as const;

const STEP_IDS = [0, 1, 2, 3, 4] as const;

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
  const { contentLocale, t } = useLocale();
  const formatText = useCallback((path: string, values?: Record<string, string | number>) => {
    let message = t(path);
    if (!values) return message;
    for (const [key, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key}}`, String(value));
    }
    return message;
  }, [t]);
  const formatEta = useCallback((etaSec?: number): string => {
    if (!etaSec || etaSec <= 0) return t('productionWizard.etaSoon');
    if (etaSec < 60) return formatText('productionWizard.etaSeconds', { count: Math.max(1, Math.round(etaSec)) });
    if (etaSec < 3600) return formatText('productionWizard.etaMinutes', { count: Math.max(1, Math.round(etaSec / 60)) });
    return formatText('productionWizard.etaHours', { count: Math.max(1, Math.round(etaSec / 3600)) });
  }, [formatText, t]);
  const formatAssetKind = useCallback((kind: BatchTask['kind']) => {
    if (kind === 'char') return t('productionWizard.assetKindCharacter');
    if (kind === 'scene') return t('productionWizard.assetKindScene');
    return t('productionWizard.assetKindProp');
  }, [t]);
  const [searchParams] = useSearchParams();
  // URL ?projectId=xxx 优先；没有则读 localStorage 上次记录的 id
  const urlProjectId = searchParams.get('projectId');
  const urlAssetId = searchParams.get('assetId');
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
    initialTab?: 'portrait' | 'wardrobe';
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
  const [projectNamingModal, setProjectNamingModal] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  const [projectGovernanceBusy, setProjectGovernanceBusy] = useState(false);
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

  const resolveStudioReplyLocale = useCallback((sampleObject?: unknown, values?: Array<string | null | undefined>) => {
    return resolveReplyLocale({
      values,
      sampleObject,
      fallbackContentLocale: contentLocale,
    });
  }, [contentLocale]);

  const draftRequiresProjectNaming = useMemo(
    () =>
      shouldRequireProductionProjectNaming({
        projectTitle: project.meta.title,
        hasPersistedProject: Boolean(serverProjectId),
        draftIsMeaningful: hasMeaningfulProductionDraft({
          project,
          characterBible,
          synopsis,
        }),
      }),
    [characterBible, project, serverProjectId, synopsis],
  );

  const buildSuggestedProductionTitle = useCallback((input?: {
    storySummary?: string | null;
    synopsis?: string | null;
    fallbackDate?: Date;
  }) => {
    return suggestProductionProjectTitle({
      storySummary: input?.storySummary ?? project.story?.synopsis,
      synopsis: input?.synopsis ?? synopsis,
      fallbackDate: input?.fallbackDate,
    });
  }, [project.story?.synopsis, synopsis]);

  const closeProjectNamingModal = useCallback(() => {
    setProjectNamingModal({ open: false, name: '' });
  }, []);

  const localizedSteps = useMemo(
    () => STEP_IDS.map((id) => ({
      id,
      label:
        id === 0
          ? t('productionWizard.stepInput')
          : id === 1
            ? t('productionWizard.stepStoryOutline')
            : id === 2
              ? t('productionWizard.stepDesign')
              : id === 3
                ? t('productionWizard.stepStoryboard')
                : t('productionWizard.stepExport'),
    })),
    [t],
  );
  const localizedTemplateOptions = useMemo(
    () =>
      TEMPLATE_OPTION_VALUES.map((value) => ({
        value,
        label:
          value === 'three_act'
            ? t('productionWizard.templateThreeAct')
            : value === 'five_act'
              ? t('productionWizard.templateFiveAct')
              : t('productionWizard.templateSaveTheCat'),
      })),
    [t],
  );

  const loadKnownBatchJobsById = useCallback(async () => {
    try {
      const { jobs } = await getBatchJobs();
      return new Map<string, KnownBatchJobOwnership>(
        jobs
          .filter((job) => !!job.id && !!job.projectId && typeof job.shotIndex === 'number')
          .map((job) => [
            job.id,
            {
              projectId: job.projectId,
              shotIndex: job.shotIndex,
            },
          ]),
      );
    } catch (error) {
      console.warn('[production] 加载 batch-jobs 归属失败，跳过版本清理', error);
      return new Map<string, KnownBatchJobOwnership>();
    }
  }, []);

  const hydrateStoredProject = useCallback((
    stored: StoredWizard,
    projectId: string,
    knownBatchJobsById: Map<string, KnownBatchJobOwnership>,
  ) => {
    const nextProject = migrateProject(stored.project);
    const local = loadStored();
    const mergedShots = local && shouldMergeStoredShotVideoVersions(local, projectId)
      ? mergeShotVideoVersions(nextProject.shots, local.project.shots)
      : nextProject.shots;
    return {
      ...nextProject,
      shots: sanitizeShotVideoVersions(mergedShots, {
        projectId,
        knownBatchJobsById,
      }),
    } as ProductionProject;
  }, []);

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
      const [raw, knownBatchJobsById] = await Promise.all([
        loadProductionProject(id),
        loadKnownBatchJobsById(),
      ]);
      if (raw && typeof raw === 'object' && 'project' in raw) {
        const s = raw as unknown as StoredWizard;
        setProject(hydrateStoredProject(s, id, knownBatchJobsById));
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
      if (e instanceof ApiError && e.status === 404) {
        try { localStorage.removeItem('gobs_last_project_id'); } catch { /* ignore */ }
        const url = new URL(window.location.href);
        url.searchParams.delete('projectId');
        window.history.replaceState(null, '', url.toString());
        setServerProjectId(null);
        setErr(t('productionWizard.projectMissingInEnv'));
      } else {
        setErr(t('productionWizard.projectLoadFailedRetry'));
      }
      setShowProjectList(true);
    } finally {
      setIsServerBootstrapping(false);
      setLoadingProjectTitle(null);
    }
  }, [hydrateStoredProject, loadKnownBatchJobsById, t]);

  const handleRenameServerProject = useCallback(async (id: string, title: string) => {
    await renameProductionProject(id, title);
    setProjectList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title, updatedAt: new Date().toISOString() } : item)),
    );
    if (id === serverProjectId) {
      setProject((current) => ({ ...current, meta: { ...current.meta, title } }));
    }
  }, [serverProjectId]);

  const handleDeleteServerProject = useCallback(async (id: string) => {
    await deleteProductionProject(id);
    setProjectList((prev) => prev.filter((item) => item.id !== id));
    if (id === serverProjectId) {
      stylePreviewRevokeRef.current?.();
      stylePreviewRevokeRef.current = null;
      setStyleRefPreview(null);
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
      try { localStorage.removeItem('gobs_last_project_id'); } catch { /* ignore */ }
      const url = new URL(window.location.href);
      url.searchParams.delete('projectId');
      window.history.replaceState(null, '', url.toString());
    }
  }, [serverProjectId]);

  const handleGovernUnnamedProjects = useCallback(async () => {
    const targets = projectList.filter((item) => isUnnamedProductionProjectTitle(item.title));
    if (targets.length === 0) {
      toast.info(t('productionWizard.noUnnamedProjects'));
      return;
    }
    setProjectGovernanceBusy(true);
    let renamed = 0;
    let deleted = 0;
    let failed = 0;
    try {
      for (const target of targets) {
        try {
          const raw = await loadProductionProject(target.id);
          const stored = raw as unknown as StoredWizard;
          const loadedProject = migrateProject((stored.project as ProductionProject | undefined) ?? emptyProductionProject());
          const action = resolveUnnamedProjectGovernanceAction({
            isUnnamed: true,
            draftIsMeaningful: hasMeaningfulProductionDraft({
              project: loadedProject,
              characterBible: stored.characterBible ?? '',
              synopsis: stored.synopsis ?? '',
            }),
          });
          if (action === 'delete') {
            await handleDeleteServerProject(target.id);
            deleted += 1;
            continue;
          }
          if (action === 'rename') {
            const nextTitle = buildSuggestedProductionTitle({
              storySummary: loadedProject.story?.synopsis,
              synopsis: stored.synopsis ?? '',
              fallbackDate: target.updatedAt ? new Date(target.updatedAt) : undefined,
            });
            await handleRenameServerProject(target.id, nextTitle);
            renamed += 1;
          }
        } catch {
          failed += 1;
        }
      }
      const refreshed = await listProductionProjects();
      setProjectList(refreshed.projects);
      toast.success(
        failed > 0
          ? formatText('productionWizard.governanceDoneWithFailed', { renamed, deleted, failed })
          : formatText('productionWizard.governanceDone', { renamed, deleted }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('productionWizard.governanceFailed'));
    } finally {
      setProjectGovernanceBusy(false);
    }
  }, [buildSuggestedProductionTitle, formatText, handleDeleteServerProject, handleRenameServerProject, projectList, t]);

  /** 仅内存：未确认的肖像预览；刷新页面即丢失，不写入 localStorage */
  const [portraitJobs, setPortraitJobs] = useState<Record<string, PortraitJobState>>({});
  const [shotBusyMap, setShotBusyMap] = useState<Record<string, 'frame' | 'video'>>({});
  const {
    jobs: globalJobs,
    snapshot,
    refreshJobs,
    upsertJobs,
  } = useGlobalJobs();
  const [syncing, setSyncing] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [bulkCancelling, setBulkCancelling] = useState(false);

  const projectJobs = useMemo(
    () => globalJobs.filter((j) => j.source === 'production' && j.projectId === serverProjectId),
    [globalJobs, serverProjectId],
  );

  const shotActiveJobMap = useMemo<Record<string, BatchJobDto>>(() => {
    const out: Record<string, BatchJobDto> = {};
    const byShot = new Map<number, BatchJobDto[]>();
    const activeRank: Record<string, number> = {
      processing: 4,
      queuing: 3,
      pending: 2,
      awaiting_submit: 1,
    };
    for (const job of projectJobs) {
      if (typeof job.shotIndex !== 'number') continue;
      if (!activeRank[job.status]) continue;
      const arr = byShot.get(job.shotIndex) ?? [];
      arr.push(job);
      byShot.set(job.shotIndex, arr);
    }
    for (const [idx, arr] of byShot) {
      out[String(idx)] = [...arr].sort((a, b) => {
        const rankDiff = activeRank[b.status] - activeRank[a.status];
        if (rankDiff !== 0) return rankDiff;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })[0];
    }
    return out;
  }, [projectJobs]);

  const shotJobStatusMap = useMemo<Record<string, 'awaiting_submit' | 'queuing' | 'processing' | 'failed' | 'cancelled'>>(() => {
    const out: Record<string, 'awaiting_submit' | 'queuing' | 'processing' | 'failed' | 'cancelled'> = {};
    const byShot = new Map<number, BatchJobDto[]>();
    for (const job of projectJobs) {
      if (typeof job.shotIndex !== 'number') continue;
      const arr = byShot.get(job.shotIndex) ?? [];
      arr.push(job);
      byShot.set(job.shotIndex, arr);
    }
    for (const [idx, arr] of byShot) {
      const activeJob = shotActiveJobMap[String(idx)];
      if (activeJob) {
        if (activeJob.status === 'processing') out[String(idx)] = 'processing';
        else if (activeJob.status === 'awaiting_submit') out[String(idx)] = 'awaiting_submit';
        else out[String(idx)] = 'queuing';
        continue;
      }
      const latestDoneTs = Math.max(
        -1,
        ...arr.filter((job) => job.status === 'done').map((job) => new Date(job.updatedAt).getTime()),
      );
      const latestTerminal = [...arr]
        .filter((job) => job.status === 'failed' || job.status === 'cancelled')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      if (!latestTerminal) continue;
      if (new Date(latestTerminal.updatedAt).getTime() < latestDoneTs) continue;
      out[String(idx)] = latestTerminal.status === 'cancelled' ? 'cancelled' : 'failed';
    }
    return out;
  }, [projectJobs, shotActiveJobMap]);

  const shotJobQueueInfoMap = useMemo<Record<string, {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
    globalQueuePos?: number;
    etaSec?: number;
  }>>(() => {
    const out: Record<string, {
      queue_idx?: number;
      queue_length?: number;
      queue_status?: string;
      globalQueuePos?: number;
      etaSec?: number;
    }> = {};
    for (const [key, job] of Object.entries(shotActiveJobMap)) {
      out[key] = {
        ...(job.queueInfo ?? {}),
        ...(typeof job.globalQueuePos === 'number' ? { globalQueuePos: job.globalQueuePos } : {}),
        ...(typeof job.etaSec === 'number' ? { etaSec: job.etaSec } : {}),
      };
    }
    return out;
  }, [shotActiveJobMap]);

  const handleSyncBatchJobsNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const data = await apiPost<{
        polled: number;
        results: Array<{ id: string; status: string; videoUrl?: string; failReason?: string }>;
        scan: { matched: string[]; expired: string[]; skipped: number } | null;
      }>('/api/batch-jobs/sync-now', {});
      const doneCount = data.results.filter((r) => r.status === 'done').length;
      const failCount = data.results.filter((r) => r.status === 'failed').length;
      const parts: string[] = [];
      if (doneCount) parts.push(formatText('productionWizard.syncDone', { count: doneCount }));
      if (failCount) parts.push(formatText('productionWizard.syncFailedPart', { count: failCount }));
      if (data.scan?.matched?.length) {
        parts.push(formatText('productionWizard.syncFallbackRestored', { count: data.scan.matched.length }));
      }
      if (data.polled === 0 && !parts.length) parts.push(t('productionWizard.syncNoActiveTasks'));
      toast.success(formatText('productionWizard.syncCompleted', {
        summary: parts.join(' / ') || formatText('productionWizard.syncChecked', { count: data.polled }),
      }));
      await refreshJobs();
    } catch (e) {
      toast.error(formatText('productionWizard.syncFailed', { reason: e instanceof Error ? e.message : String(e) }));
    } finally {
      setSyncing(false);
    }
  }, [formatText, refreshJobs, syncing, t]);
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
    (
      shotIdx: number,
      url: string,
      taskId: string,
      videoPath: string | undefined,
      batchJobId?: string,
    ) => {
      const s = project.shots[shotIdx];
      if (!s) return;
      const vp = videoPath?.trim();
      const normalizedProjectId = serverProjectId?.trim();
      const versionId = `${taskId || `production-shot-${s.shotIndex}`}-${Date.now()}`;
      const version: ProductionShotVideoVersion = {
        id: versionId,
        taskId: taskId || `production-shot-${s.shotIndex}`,
        createdAt: Date.now(),
        ...(vp ? { videoPath: vp } : {}),
        ...(url?.trim() ? { videoUrl: url } : {}),
        ...(normalizedProjectId ? { sourceProjectId: normalizedProjectId } : {}),
        sourceShotIndex: s.shotIndex,
        ...(batchJobId?.trim() ? { batchJobId: batchJobId.trim() } : {}),
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
      const title = (project.meta.title || t('productionWizard.untitledHistoryProject')).trim();
      saveVideoToHistory({
        taskId: taskId || `production-shot-${s.shotIndex}-${Date.now()}`,
        videoPath: videoPath ?? '',
        prompt: formatText('productionWizard.historyPromptPrefix', {
          title,
          shotIndex: s.shotIndex,
          line,
        }).slice(0, 12000),
        ...(videoPath?.trim() ? {} : { videoUrl: url }),
      });
      toast.success(t('productionWizard.shotVideoSavedToHistory'));
      needsFlushRef.current = true;
    },
    [formatText, project.shots, project.meta.title, serverProjectId, setProject, t],
  );

  const handledJobStateRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (isServerBootstrapping || !serverProjectId) return;
    for (const job of projectJobs) {
      const idx = project.shots.findIndex((s) => s.shotIndex === job.shotIndex);
      if (idx < 0) continue;
      const cur = project.shots[idx];
      if (!cur) continue;
      if (
        job.submitId &&
        (job.status === 'pending' || job.status === 'queuing' || job.status === 'processing') &&
        cur.pendingVideoSubmitId !== job.submitId
      ) {
        setProject((p) => {
          const shots = [...p.shots];
          const shotCur = shots[idx];
          if (!shotCur || shotCur.pendingVideoSubmitId === job.submitId) return p;
          shots[idx] = { ...shotCur, pendingVideoSubmitId: job.submitId };
          return { ...p, shots };
        });
      }
      const stateKey = `${job.status}:${job.updatedAt}:${job.videoUrl ?? ''}:${job.failReason ?? ''}:${job.cancelledAt ?? ''}`;
      if (handledJobStateRef.current[job.id] === stateKey) continue;
      if (job.status === 'done' && job.videoUrl) {
        handledJobStateRef.current[job.id] = stateKey;
        saveShotVideo(idx, job.videoUrl, job.taskId || `dreamina-${job.submitId}`, undefined, job.id);
        clearShotBusy(String(job.shotIndex));
        continue;
      }
      if (job.status === 'failed' || job.status === 'cancelled') {
        handledJobStateRef.current[job.id] = stateKey;
        const reason = job.status === 'cancelled'
          ? job.failReason || t('productionWizard.userCancelledTask')
          : job.failReason || t('productionWizard.unknownFailure');
        setProject((p) => {
          const shots = [...p.shots];
          const shotCur = shots[idx];
          if (!shotCur) return p;
          shots[idx] = {
            ...shotCur,
            pendingVideoSubmitId: undefined,
            lastVideoError: {
              submitId: job.submitId || shotCur.pendingVideoSubmitId,
              jobId: job.id,
              cancelled: job.status === 'cancelled',
              reason,
              at: job.cancelledAt || job.updatedAt,
            },
          };
          return { ...p, shots };
        });
        clearShotBusy(String(job.shotIndex));
        needsFlushRef.current = true;
        if (job.status === 'cancelled') {
          toast.info(formatText('productionWizard.shotCancelled', { shotIndex: job.shotIndex, reason }));
        } else {
          toast.error(formatText('productionWizard.shotGenerationFailed', { shotIndex: job.shotIndex, reason }));
        }
      }
    }
    const hasActiveProductionJob = projectJobs.some((job) =>
      job.status === 'awaiting_submit' ||
      job.status === 'pending' ||
      job.status === 'queuing' ||
      job.status === 'processing',
    );
    if (!hasActiveProductionJob) {
      const batchKey = `gobs_batch_gen_${serverProjectId ?? 'local'}`;
      try { localStorage.removeItem(batchKey); } catch { /* ignore */ }
    }
  }, [clearShotBusy, formatText, isServerBootstrapping, project.shots, projectJobs, saveShotVideo, serverProjectId, setProject, t]);

  useEffect(() => {
    if (isServerBootstrapping || projectJobs.length === 0) return;
    const activeStatuses = new Set(['awaiting_submit', 'pending', 'queuing', 'processing']);
    const terminalStatuses = new Set(['done', 'failed', 'cancelled']);
    const activeByShot = new Set(
      projectJobs
        .filter((job) => activeStatuses.has(job.status))
        .map((job) => String(job.shotIndex)),
    );
    const terminalSubmitIds = new Set(
      projectJobs
        .filter((job) => terminalStatuses.has(job.status) && job.submitId)
        .map((job) => job.submitId),
    );

    setProject((current) => {
      let changed = false;
      const shots = current.shots.map((shot) => {
        const pendingSubmitId = shot.pendingVideoSubmitId?.trim();
        if (!pendingSubmitId) return shot;
        if (activeByShot.has(String(shot.shotIndex))) return shot;
        if (!hasProductionShotPreviewMedia(shot) && !terminalSubmitIds.has(pendingSubmitId)) return shot;
        changed = true;
        return { ...shot, pendingVideoSubmitId: undefined };
      });
      if (!changed) return current;
      // Flush once so the server copy stops reviving stale submitId state on reload.
      needsFlushRef.current = true;
      return { ...current, shots };
    });
  }, [isServerBootstrapping, projectJobs, setProject]);

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
        const msg = e instanceof Error ? e.message : formatText('productionWizard.generateFailed');
        setPortraitJobs((prev) => ({ ...prev, [jobKey]: { status: 'error', error: msg } }));
      }
    })();
  }, [t]);

  /** 列表「AI」同款：缺图的角色定稿节点 + 场景主变体；跳过弹窗中待确认的肖像任务 */
  const [batchAssetGen, setBatchAssetGen] = useState<BatchAssetGenState | null>(null);
  const batchCancelRef = useRef<boolean>(false);
  const failedTasksRef = useRef<BatchTask[]>([]);
  const [failedTaskCount, setFailedTaskCount] = useState(0);
  const [batchAssetSummary, setBatchAssetSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    cancelled?: boolean;
  } | null>(null);
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
      setErr(t('productionWizard.noMissingAssets'));
      return;
    }

    setErr(null);
    batchCancelRef.current = false;
    failedTasksRef.current = [];
    setFailedTaskCount(0);
    setBatchAssetSummary(null);
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
      setBatchAssetGen((prev) => prev ? { ...prev, currentLabel: `${formatAssetKind(t.kind)} ${t.sheetId}` } : null);
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
            setTimeout(() => reject(new Error(formatText('productionWizard.generationTimeout', { seconds: Math.round(timeoutMs / 1000) }))), timeoutMs),
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
        const msg = e instanceof Error ? e.message : formatText('productionWizard.generateFailed');
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

      setBatchAssetSummary({
        total: tasks.length,
        success: successCount,
        failed: failedCount,
        cancelled: batchCancelRef.current || undefined,
      });

      if (batchCancelRef.current) {
        setErr(t('productionWizard.missingAssetCancelled'));
      } else if (successCount === 0) {
        setErr(formatText('productionWizard.missingAssetFailed', {
          reason: failMessages[0] ?? t('productionWizard.compassImagenHint'),
        }));
      } else if (failedCount > 0) {
        const hint = failMessages[0] ? formatText('productionWizard.firstErrorHint', { reason: failMessages[0] }) : '';
        setErr(formatText('productionWizard.missingAssetPartial', { success: successCount, failed: failedCount, hint }));
        toast.error(formatText('productionWizard.missingAssetDone', { success: successCount, failed: failedCount }));
        sendBrowserNotification(
          successCount > 0 ? t('productionWizard.imageGenerationDone') : t('productionWizard.imageGenerationFinished'),
          formatText('productionWizard.assetGenerationSummary', { success: successCount, failed: failedCount }),
        );
      } else {
        toast.success(formatText('productionWizard.missingAssetCompleted', { count: successCount }));
        sendBrowserNotification(
          successCount > 0 ? t('productionWizard.imageGenerationDone') : t('productionWizard.imageGenerationFinished'),
          formatText('productionWizard.assetGenerationSummary', { success: successCount, failed: failedCount }),
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
    formatAssetKind,
    formatText,
    t,
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
    setBatchAssetSummary(null);
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
      setBatchAssetGen((prev) => prev ? { ...prev, currentLabel: `${formatAssetKind(t.kind)} ${t.sheetId}` } : null);
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
            setTimeout(() => reject(new Error(formatText('productionWizard.generationTimeout', { seconds: Math.round(timeoutMs / 1000) }))), timeoutMs),
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
        const msg = e instanceof Error ? e.message : formatText('productionWizard.generateFailed');
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
      setBatchAssetSummary({
        total: tasks.length,
        success: successCount,
        failed: failedCount,
        cancelled: batchCancelRef.current || undefined,
      });
      if (failedCount > 0) {
        const hint = failMessages[0] ? formatText('productionWizard.firstErrorHint', { reason: failMessages[0] }) : '';
        setErr(formatText('productionWizard.retryAssetPartial', { success: successCount, failed: failedCount, hint }));
      } else {
        toast.success(formatText('productionWizard.retryAssetSuccess', { count: successCount }));
      }
    } finally {
      setGenKey(null);
      setBatchAssetGen(null);
      batchCancelRef.current = false;
    }
  }, [project.meta.styleRefImageDataUrl, ar, formatAssetKind, formatText, t]);

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
        const [raw, knownBatchJobsById] = await Promise.all([
          loadProductionProject(idToLoad),
          loadKnownBatchJobsById(),
        ]);
        if (raw && typeof raw === 'object' && 'project' in raw) {
          const s = raw as unknown as StoredWizard;
          setProject(hydrateStoredProject(s, idToLoad, knownBatchJobsById));
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
            const fallbackProject = migrateProject(fallback.project);
            setProject({
              ...fallbackProject,
              shots: sanitizeShotVideoVersions(fallbackProject.shots, {
                projectId: fallback.projectPersistId,
              }),
            });
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
          setErr(t('productionWizard.projectLoadAutoSavePaused'));
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

  // 从素材库跳转过来时：获取素材文件并设为风格参考
  useEffect(() => {
    if (!urlAssetId || isServerBootstrapping) return;
    void (async () => {
      try {
        const fileUrl = buildAssetFileUrl(urlAssetId);
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        if (!blob.type.startsWith('image/')) {
          toast.info(t('productionWizard.assetSelectedNonImage'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setStyleRefPreview(dataUrl);
          const mime = blob.type || 'image/jpeg';
          // P1-14：风格参考图不直接落入项目 JSON（避免 data: URL 让 JSON 膨胀到 MB 级），
          // 改为上传到 production/images 拿到服务端 URL 再存入 meta。
          uploadProductionImage(dataUrl, mime, 'style-ref')
            .then(({ url }) => {
              setProject((p) => ({ ...p, meta: { ...p.meta, styleRefImageDataUrl: url } }));
              toast.success(t('productionWizard.styleReferenceSet'));
            })
            .catch(() => {
              // 退化：上传失败时仍存 data URL，至少功能可用
              setProject((p) => ({ ...p, meta: { ...p.meta, styleRefImageDataUrl: dataUrl } }));
              toast.warning(t('productionWizard.styleReferenceSetUploadFailed'));
            });
        };
        reader.readAsDataURL(blob);
        void recordUsage(urlAssetId, 'production');
        // 清除 URL 中的 assetId 避免重复加载
        const url = new URL(window.location.href);
        url.searchParams.delete('assetId');
        window.history.replaceState(null, '', url.toString());
      } catch {
        toast.error(t('productionWizard.assetLoadFailed'));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlAssetId, isServerBootstrapping]);

  /**
   * 从草稿恢复立项参考图缩略。
   * 兼容两种存储形态：
   *   - data:image/…（历史草稿 / 上传失败回退）
   *   - /api/production/image?path=… 或 http(s):// URL（P1-14 新策略）
   */
  useEffect(() => {
    const d = project.meta.styleRefImageDataUrl?.trim();
    if (!d) return;
    if (d.startsWith('data:image/') || d.startsWith('/api/') || /^https?:\/\//i.test(d)) {
      setStyleRefPreview((prev) => prev ?? d);
    }
  }, [project.meta.styleRefImageDataUrl]);

  useEffect(() => {
    if (!draftRequiresProjectNaming || serverProjectId) return;
    setProjectNamingModal((current) => {
      if (current.open) return current;
      return {
        open: true,
        name: project.meta.title?.trim() || buildSuggestedProductionTitle(),
      };
    });
  }, [buildSuggestedProductionTitle, draftRequiresProjectNaming, project.meta.title, serverProjectId]);

  useEffect(() => {
    if (draftRequiresProjectNaming) return;
    setProjectNamingModal((current) => (current.open ? { open: false, name: '' } : current));
  }, [draftRequiresProjectNaming]);

  useEffect(() => {
    if (isServerBootstrapping || !canAutoPersist) return;
    const persistedProject = {
      ...project,
      shots: sanitizeShotVideoVersions(project.shots, {
        projectId: serverProjectId,
      }),
    } as ProductionProject;
    const data: StoredWizard = {
      project: persistedProject,
      characterBible,
      synopsis,
      structureTemplate,
      maxTotalDurationSec,
      step,
      storyGenre,
      projectPersistId: serverProjectId,
    };
    saveStored(data);
    if (!draftRequiresProjectNaming) {
      if (needsFlushRef.current) {
        needsFlushRef.current = false;
        flushServerSync(data);
      } else {
        scheduleServerSync(data);
      }
    }
  }, [
    project,
    characterBible,
    synopsis,
    structureTemplate,
    maxTotalDurationSec,
    step,
    storyGenre,
    serverProjectId,
    scheduleServerSync,
    flushServerSync,
    isServerBootstrapping,
    canAutoPersist,
    draftRequiresProjectNaming,
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
    setTreeFocusCharacterId((id) => (id && list.some((c) => c.id === id) ? id : null));
  }, [step, l2Tab, project.characterAssets]);

  const handleStoryArc = useCallback(async () => {
    if (!characterBible.trim() || !synopsis.trim()) {
      setErr(t('productionWizard.storyInputsRequired'));
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
        replyLocale: resolveStudioReplyLocale(project.meta.styleRefAnalysis, [
          characterBible,
          synopsis,
          storyGenre,
          project.meta.styleRefSummary,
        ]),
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
      setErr(e instanceof Error ? e.message : t('productionWizard.generateFailed'));
    } finally {
      setBusyL1(false);
    }
  }, [
    characterBible,
    synopsis,
    storyGenre,
    project.meta.styleRefAnalysis,
    project.meta.styleRefSummary,
    resolveStudioReplyLocale,
    structureTemplate,
    t,
  ]);

  const handleL2 = useCallback(async () => {
    if (!project.story) {
      setErr(t('productionWizard.storyStructureRequired'));
      return;
    }
    setErr(null);
    setBusyL2(true);
    try {
      const { productionDesign } = await postProductionDesign({
        story: project.story,
        replyLocale: resolveStudioReplyLocale(project.story),
      });
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
      setErr(e instanceof Error ? e.message : t('productionWizard.generateFailed'));
    } finally {
      setBusyL2(false);
    }
  }, [project.story, resolveStudioReplyLocale, t]);

  const handleL3 = useCallback(async () => {
    if (!project.story || !project.productionDesign) return;
    const existingShots = project.shots ?? [];
    const hasExistingMedia = existingShots.some(
      (s) =>
        !!s.previewStillDataUrl ||
        !!s.previewVideoUrl ||
        !!s.previewVideoPath ||
        (s.previewVideoVersions?.length ?? 0) > 0 ||
        !!s.pendingVideoSubmitId,
    );
    if (hasExistingMedia) {
      const ok = window.confirm(t('productionWizard.regenerateStoryboardConfirm'));
      if (!ok) return;
    }
    setErr(null);
    setBusyL3(true);
    try {
      const { shots } = await postStoryboardTable({
        story: project.story,
        productionDesign: project.productionDesign,
        maxTotalDurationSec,
        replyLocale: resolveStudioReplyLocale({
          story: project.story,
          productionDesign: project.productionDesign,
        }),
      });
      setProject((p) => {
        const mediaByIdx = new Map<
          number,
          Partial<
            Pick<
              ProductionShot,
              | 'previewStillDataUrl'
              | 'previewVideoUrl'
              | 'previewVideoPath'
              | 'previewVideoVersions'
              | 'selectedPreviewVideoVersionId'
              | 'pendingVideoSubmitId'
              | 'videoStoryboardOverride'
              | 'characterStateOverrides'
              | 'manualRefOverrides'
            >
          >
        >();
        (p.shots ?? []).forEach((s) => {
          mediaByIdx.set(s.shotIndex, {
            previewStillDataUrl: s.previewStillDataUrl,
            previewVideoUrl: s.previewVideoUrl,
            previewVideoPath: s.previewVideoPath,
            previewVideoVersions: s.previewVideoVersions,
            selectedPreviewVideoVersionId: s.selectedPreviewVideoVersionId,
            pendingVideoSubmitId: s.pendingVideoSubmitId,
            videoStoryboardOverride: s.videoStoryboardOverride,
            characterStateOverrides: s.characterStateOverrides,
            manualRefOverrides: s.manualRefOverrides,
          });
        });
        const merged = shots.map((ns) => {
          const carry = mediaByIdx.get(ns.shotIndex);
          return carry ? { ...ns, ...carry } : ns;
        });
        return { ...p, shots: merged, assembled: null };
      });
      setStep(3);
      setSelectedShotIdx(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('productionWizard.generateFailed'));
    } finally {
      setBusyL3(false);
    }
  }, [project.story, project.productionDesign, project.shots, maxTotalDurationSec, resolveStudioReplyLocale, t]);

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
    confirmPortraitForTarget,
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

  const characterStoryBio = useCallback((name: string) => {
    const c = project.story?.characters?.find((x) => x.name === name);
    if (!c) return undefined;
    return [c.goal, c.conflict, c.arc].filter(Boolean).join(' ');
  }, [project.story?.characters]);

  const handleQuickGenerateCharacterMainLook = useCallback((sheet: CharacterSheet) => {
    const productionDesign = project.productionDesign;
    if (!productionDesign) return;
    const ensured = ensureCharacterLookTree(sheet);
    const node = getCharacterActiveNode(ensured) ?? ensured.lookTree?.[0];
    if (!node) return;
    const jobKey = getPortraitJobKey(sheet.id, { mode: 'replace', nodeId: node.id });
    if (portraitJobs[jobKey]?.status === 'generating') return;

    const basePrompt = buildCharacterImagePrompt(
      ensured,
      { id: node.id, label: node.label, imageDataUrl: node.imageDataUrl },
      project.meta.styleRefSummary,
      productionDesign,
      { enforceGlobalStyleLock: !!project.meta.styleRefImageDataUrl?.trim() },
    );
    const supplement = (
      formatWardrobeSupplementForCharacter(sheet.name, productionDesign.wardrobe) ||
      characterStoryBio(sheet.name) ||
      ''
    ).trim();
    const prompt = supplement ? `${basePrompt}\n\n用户补充：${supplement}` : basePrompt;

    handleStartPortraitGenerate(jobKey, {
      prompt,
      aspectRatio: '9:16',
      ...(project.meta.styleRefImageDataUrl?.trim()
        ? { globalStyleReferenceFrame: project.meta.styleRefImageDataUrl.trim() }
        : {}),
    });
  }, [
    characterStoryBio,
    handleStartPortraitGenerate,
    portraitJobs,
    project.meta.styleRefImageDataUrl,
    project.meta.styleRefSummary,
    project.productionDesign,
  ]);

  const handleConfirmCharacterMainLook = useCallback((sheetId: string, nodeId: string) => {
    const sheet = (project.characterAssets ?? []).find((item) => item.id === sheetId);
    if (!sheet) return;
    const job = portraitJobs[getPortraitJobKey(sheetId, { mode: 'replace', nodeId })];
    if (job?.status !== 'done') return;
    confirmPortraitForTarget(
      {
        sheet,
        intent: { mode: 'replace', nodeId },
        initialTab: 'portrait',
      },
      job.previewDataUrl,
    );
  }, [confirmPortraitForTarget, portraitJobs, project.characterAssets]);

  const handleOpenCharacterWardrobe = useCallback((sheet: CharacterSheet) => {
    const ensured = ensureCharacterLookTree(sheet);
    const node = getCharacterActiveNode(ensured) ?? ensured.lookTree?.[0];
    if (!node) return;
    setPortraitEdit({
      sheet: ensured,
      intent: { mode: 'replace', nodeId: node.id },
      initialTab: 'wardrobe',
    });
  }, []);

  const handleDismissBatchSummary = useCallback(() => {
    setBatchAssetSummary(null);
  }, []);

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
            replyLocale: resolveStudioReplyLocale(project, [characterBible, synopsis, storyGenre]),
          });
          setProject((p) => ({ ...p, characterVisualProfile, assembled: null }));
        } catch (e) {
          setErr(e instanceof Error ? e.message : t('productionWizard.visualExtractFailed'));
        } finally {
          setBusyVis(false);
        }
      })();
    };
    reader.readAsDataURL(file);
  }, [characterBible, project, resolveStudioReplyLocale, storyGenre, synopsis, t]);

  const handleAssemble = useCallback(async () => {
    if (!project.shots.length) {
      setErr(t('productionWizard.storyboardRequired'));
      return;
    }
    setErr(null);
    setBusyAsm(true);
    try {
      const assembled = await postAssemblePrompts({
        shots: project.shots,
        characterVisualProfile: project.characterVisualProfile,
        replyLocale: resolveStudioReplyLocale({
          shots: project.shots,
          characterVisualProfile: project.characterVisualProfile,
        }, [characterBible, synopsis, storyGenre]),
      });
      setProject((p) => ({ ...p, assembled }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('productionWizard.assembleFailed'));
    } finally {
      setBusyAsm(false);
    }
  }, [characterBible, project.characterVisualProfile, project.shots, resolveStudioReplyLocale, storyGenre, synopsis, t]);

  const copyAllSeedance = useCallback(() => {
    if (!project.assembled?.shots.length) return;
    const text = project.assembled.shots.map((s) => `${formatText('productionWizard.copySeedanceShotHeader', { shotIndex: s.shotIndex })}\n${s.seedanceBlock}`).join('\n\n');
    void navigator.clipboard.writeText(text);
  }, [formatText, project.assembled]);

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
        // 立刻把 data URL 写入 meta，保证 UI 能马上使用参考图
        setProject((p) => ({
          ...p,
          meta: { ...p.meta, styleRefImageDataUrl: dataUrl },
        }));
        // P1-14：并行把图片上传到服务端，拿到 URL 后再替换 meta，避免草稿 JSON 里长期携带 data:URL
        void (async () => {
          try {
            const { url } = await uploadProductionImage(dataUrl, file.type || 'image/jpeg', 'style-ref');
            setProject((p) =>
              p.meta.styleRefImageDataUrl && !p.meta.styleRefImageDataUrl.startsWith('data:')
                ? p
                : { ...p, meta: { ...p.meta, styleRefImageDataUrl: url } },
            );
          } catch (e) {
            console.warn('[styleRef upload]', e);
          }
        })();
        void (async () => {
          setErr(null);
          setBusyStyle(true);
          try {
            const { styleReference } = await postExtractStyleReference({
              imageBase64: dataUrl,
              mimeType: file.type,
              replyLocale: resolveStudioReplyLocale(project, [characterBible, synopsis, storyGenre]),
            });
            setProject((p) => ({
              ...p,
              meta: {
                ...p.meta,
                // 保留 styleRefImageDataUrl（可能已被上传协程替换为 URL，不覆盖）
                styleRefSummary: styleReference.styleRefSummary,
                styleRefAnalysis: styleReference,
              },
            }));
          } catch (e) {
            setErr(e instanceof Error ? e.message : t('productionWizard.styleReverseFailed'));
          } finally {
            setBusyStyle(false);
          }
        })();
      };
      reader.readAsDataURL(file);
    },
    [characterBible, clearStylePreview, project, resolveStudioReplyLocale, storyGenre, synopsis, t],
  );

  const resetDraft = useCallback(() => {
    if (!confirm(t('productionWizard.clearDraftConfirm'))) return;
    clearStylePreview();
    closeProjectNamingModal();
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
  }, [clearStylePreview, closeProjectNamingModal, t]);

  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(localizedSteps.length - 1, s + 1));
  const handleProjectTitleChange = (nextTitle: string) => {
    setProject((p) => ({ ...p, meta: { ...p.meta, title: nextTitle } }));
    if (nextTitle.trim()) {
      setTimeout(() => setTitleSaved(true), 1000);
      setTimeout(() => setTitleSaved(false), 3000);
    }
  };
  const handleConfirmProjectNaming = useCallback(() => {
    const nextTitle = projectNamingModal.name.trim();
    if (!nextTitle) {
      toast.error(t('productionWizard.projectNameRequired'));
      return;
    }
    handleProjectTitleChange(nextTitle);
    closeProjectNamingModal();
  }, [closeProjectNamingModal, handleProjectTitleChange, projectNamingModal.name, t]);

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
      setErr(e instanceof Error ? e.message : t('productionWizard.storyboardFrameFailed'));
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
    t,
  ]);

  /** 核心：将镜头生成请求入队到后端全局调度器。 */
  const generateVideoForShotIdx = useCallback(async (shotIdx: number) => {
    const s = project.shots[shotIdx];
    if (!s) return;
    if (!serverProjectId) {
      setErr(t('productionWizard.saveProjectBeforeShotVideo'));
      toast.error(t('productionWizard.saveProjectBeforeShotVideo'));
      return;
    }
    const shotId = String(s.shotIndex);
    setShotBusy(shotId, 'video');

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
          setErr(t('productionWizard.multimodalRefsRequired'));
          return;
        }
        const base = buildProductionShotVideoStoryboardText(s);
        if (!base.trim()) { setErr(t('productionWizard.shotPromptRequired')); return; }
        storyboardText = (s.videoStoryboardOverride?.trim() || pack.defaultVideoPrompt).trim();
        model = 'dreamina-multimodal';
        extraBody = { multimodalImages: pack.multimodalImages };
      } else {
        storyboardText = buildProductionShotVideoStoryboardText(s);
        if (!storyboardText.trim()) { setErr(t('productionWizard.shotPromptRequired')); return; }
        const base64Raw = s.previewStillDataUrl?.replace(/^data:image\/\w+;base64,/, '');
        const hasStill = !!base64Raw?.trim();
        if (pref === 'dreamina-text2video' || pref === 'dreamina-image2video') {
          model = pref;
        } else {
          model = hasStill ? 'dreamina-image2video' : 'dreamina-text2video';
        }
        if (model === 'dreamina-image2video' && !hasStill) {
          setErr(t('productionWizard.imageToVideoRequiresStill'));
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
        lighting && !storyboardText.includes(lighting) ? formatText('productionWizard.lightingPromptPrefix', { value: lighting }) : '',
        color && !storyboardText.includes(color) ? formatText('productionWizard.colorPromptPrefix', { value: color }) : '',
        styleRef && !storyboardText.includes(styleRef) ? formatText('productionWizard.visualStylePromptPrefix', { value: styleRef }) : '',
      ].filter(Boolean).join('\n');
      if (styleSuffix) storyboardText = `${storyboardText}\n${styleSuffix}`;

      const submitReq = {
        storyboardText,
        duration: dur,
        aspectRatio: ar,
        model,
        ...(mv ? { dreaminaModelVersion: mv } : {}),
        ...extraBody,
      };
      const { globalQueuePos, etaSec, job } = await enqueueProductionShot(serverProjectId, s.shotIndex, submitReq);
      if (job) {
        upsertJobs([job]);
      } else {
        void refreshJobs();
      }
      const enqueueState = resolveEnqueueJobState(job);
      if (enqueueState.isError) {
        const message = enqueueState.message || t('productionWizard.queueFailed');
        setProject((p) => {
          const shots = [...p.shots];
          const cur = shots[shotIdx];
          if (!cur) return p;
          shots[shotIdx] = {
            ...cur,
            lastVideoError: {
              submitId: job?.submitId || undefined,
              jobId: job?.id,
              reason: message,
              cancelled: job?.status === 'cancelled',
              at: new Date().toISOString(),
            },
          };
          return { ...p, shots };
        });
        setErr(message);
        toast.error(message);
        return;
      }
      setProject((p) => {
        const shots = [...p.shots];
        const cur = shots[shotIdx];
        if (!cur) return p;
        shots[shotIdx] = { ...cur, lastVideoError: undefined };
        return { ...p, shots };
      });
      toast.success(
        formatText('productionWizard.shotQueued', {
          shotIndex: s.shotIndex,
          position: globalQueuePos + 1,
          eta: formatEta(etaSec),
        }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : t('productionWizard.queueFailed');
      setErr(message);
      toast.error(message);
    } finally {
      clearShotBusy(shotId);
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
    formatText,
    formatEta,
    refreshJobs,
    t,
    upsertJobs,
  ]);

  const handleGenerateShotVideo = useCallback(async () => {
    setErr(null);
    await generateVideoForShotIdx(selectedShotIdx);
  }, [generateVideoForShotIdx, selectedShotIdx]);

  /** 批量生成所有缺少视频的分镜。 */
  const handleBatchGenerateAllVideos = useCallback(() => {
    const missing = project.shots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) =>
        !s.previewVideoUrl &&
        !s.previewVideoPath &&
        !(s.previewVideoVersions?.length) &&
        !shotActiveJobMap[String(s.shotIndex)],
      );
    if (missing.length === 0) {
      toast.info(t('productionWizard.allShotsHaveVideos'));
      return;
    }
    const batchKey = `gobs_batch_gen_${serverProjectId ?? 'local'}`;
    try { localStorage.setItem(batchKey, '1'); } catch { /* ignore */ }
    toast.info(formatText('productionWizard.batchGenerateVideosStart', { count: missing.length }));
    for (const { i } of missing) {
      void generateVideoForShotIdx(i);
    }
  }, [formatText, generateVideoForShotIdx, project.shots, serverProjectId, shotActiveJobMap, t]);

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
          saveShotVideo(selectedShotIdx, job.videoUrl, job.taskId || `dreamina-${s.pendingVideoSubmitId}`, undefined, bj.id);
          toast.success(formatText('productionWizard.shotVideoReady', { shotIndex: s.shotIndex }));
        } else if (job.status === 'cancelled') {
          toast.info(formatText('productionWizard.shotCancelled', {
            shotIndex: s.shotIndex,
            reason: job.failReason || t('productionWizard.backgroundStopped'),
          }));
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[selectedShotIdx];
            if (!cur) return p;
            shots[selectedShotIdx] = {
              ...cur,
              pendingVideoSubmitId: undefined,
              lastVideoError: {
                submitId: job.submitId || cur.pendingVideoSubmitId,
                jobId: job.id,
                cancelled: true,
                reason: job.failReason || t('productionWizard.userCancelledTask'),
                at: job.cancelledAt || job.updatedAt,
              },
            };
            return { ...p, shots };
          });
        } else if (job.status === 'failed') {
          toast.error(formatText('productionWizard.shotGenerationFailed', {
            shotIndex: s.shotIndex,
            reason: job.failReason || t('productionWizard.unknownFailure'),
          }));
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[selectedShotIdx];
            if (!cur) return p;
            shots[selectedShotIdx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
        } else {
          toast.info(formatText('productionWizard.shotStillGeneratingWithStatus', { shotIndex: s.shotIndex, status: job.status }));
        }
      } else {
        // 没有 batch-job 记录——直接查即梦
        const st = await getDreaminaTaskStatus(s.pendingVideoSubmitId);
        if (st.status === 'completed' && st.videoUrl) {
          saveShotVideo(selectedShotIdx, st.videoUrl, st.taskId || `dreamina-${s.pendingVideoSubmitId}`, st.videoPath);
          toast.success(formatText('productionWizard.shotVideoReady', { shotIndex: s.shotIndex }));
        } else if (st.status === 'failed') {
          toast.error(formatText('productionWizard.shotGenerationFailed', {
            shotIndex: s.shotIndex,
            reason: st.failReason || t('productionWizard.unknownFailure'),
          }));
          setProject((p) => {
            const shots = [...p.shots];
            const cur = shots[selectedShotIdx];
            if (!cur) return p;
            shots[selectedShotIdx] = { ...cur, pendingVideoSubmitId: undefined };
            return { ...p, shots };
          });
        } else {
          toast.info(formatText('productionWizard.shotStillGenerating', { shotIndex: s.shotIndex }));
        }
      }
    } catch (e) {
      toast.error(formatText('productionWizard.checkFailed', {
        reason: e instanceof Error ? e.message : t('productionWizard.networkError'),
      }));
    } finally {
      setCheckingProgress(false);
    }
  }, [formatText, project.shots, selectedShotIdx, serverProjectId, saveShotVideo, setProject, t]);

  const selectedShotJob = project.shots[selectedShotIdx]
    ? shotActiveJobMap[String(project.shots[selectedShotIdx].shotIndex)] ?? null
    : null;
  const queueSnapshot: QueueSnapshotDto = resolveStoryboardQueueSnapshot(
    snapshot ?? { totalActive: 0, totalWaiting: 0, avgSecPerJob: 120 },
    projectJobs,
  ).snapshot;

  const handleCancelActiveJob = useCallback(async (job: BatchJobDto) => {
    if (!job?.id) return;
    if (job.status === 'processing') {
      const confirmed = window.confirm(t('productionWizard.confirmCancelRendering'));
      if (!confirmed) return;
    }
    setCancellingJobId(job.id);
    try {
      const result = await cancelBatchJob(job.id);
      if (!result.ok && result.reason === 'already_terminal') {
        toast.info(t('productionWizard.taskAlreadyFinished'));
        await refreshJobs();
        return;
      }
      toast.info(result.note);
      await refreshJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('productionWizard.cancelFailed'));
    } finally {
      setCancellingJobId((current) => (current === job.id ? null : current));
    }
  }, [refreshJobs, t]);

  const handleCancelQueuedByProject = useCallback(async () => {
    if (!serverProjectId) return;
    setBulkCancelling(true);
    try {
      const result = await cancelBatchByProject(serverProjectId);
      toast.info(result.cancelled > 0
        ? formatText('productionWizard.cancelledQueuedCount', { count: result.cancelled })
        : t('productionWizard.noQueuedTasks'));
      await refreshJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('productionWizard.bulkCancelFailed'));
    } finally {
      setBulkCancelling(false);
    }
  }, [formatText, refreshJobs, serverProjectId, t]);

  // ── AI 审片助手 ──────────────────────────────────────────────────────────
  // ── AI 审片 + 一致性检查 ────────────────────────────────────────────────────
  const {
    aiReviewResult, aiReviewing, handleAiReview,
    handleApplySuggestion, handleApplyAllAndRegenerate,
    continuityIssues, continuityChecking, handleContinuityCheck,
  } = useProductionShotReview({
    project, selectedShotIdx, patchShot, generateVideoForShotIdx,
  });

  // ── 连续播放 / AB 对比 ─────────────────────────────────────────────────────
  const [showContinuousPlay, setShowContinuousPlay] = useState(false);
  const [showAbCompare, setShowAbCompare] = useState(false);

  const story = project.story;
  const chSheets = project.characterAssets ?? [];
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

  // ── 分镜视频版本管理 ────────────────────────────────────────────────────────
  const {
    shotVideoVersions, selectedShotVideoVersion, shotPreviewPlaySrc,
    selectShotVideoVersion, keepOnlyShotVideoVersion,
  } = useProductionShotVersions({
    project, selectedShotIdx, setProject, serverProjectId,
  });

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
      ? t('productionWizard.footerStep0')
      : step === 1
        ? t('productionWizard.footerStep1')
        : step === 2
          ? t('productionWizard.footerStep2')
          : step === 3
            ? t('productionWizard.footerStep3')
            : t('productionWizard.footerStep4');

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
          steps={localizedSteps}
          step={step}
          maxReachableStep={
            project.shots?.some((s) => (s as unknown as Record<string, unknown>).videoUrl || (s as unknown as Record<string, unknown>).videoPath || ((s as unknown as Record<string, unknown>).videoVersions as unknown[] | undefined)?.length) ? 4
            : project.productionDesign ? 3
            : project.story ? 2
            : 1
          }
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
            templateOptions={localizedTemplateOptions}
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
            batchAssetSummary={batchAssetSummary}
            onGenerateMissingAssets={() => void handleBatchGenerateMissingAssets()}
            onCancelBatch={() => {
              batchCancelRef.current = true;
            }}
            failedTaskCount={failedTaskCount}
            onRetryFailed={() => void handleRetryFailed()}
            onDismissBatchSummary={handleDismissBatchSummary}
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
            onQuickGenerateCharacterMainLook={handleQuickGenerateCharacterMainLook}
            onConfirmCharacterMainLook={handleConfirmCharacterMainLook}
            onOpenCharacterWardrobe={handleOpenCharacterWardrobe}
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
            shotActiveJobMap={shotActiveJobMap}
            shotJobStatusMap={shotJobStatusMap}
            shotJobQueueInfoMap={shotJobQueueInfoMap}
            onSyncBatchJobs={handleSyncBatchJobsNow}
            syncingBatchJobs={syncing}
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
            onCancelActiveJob={selectedShotJob ? () => void handleCancelActiveJob(selectedShotJob) : undefined}
            onCancelShotJob={(job) => void handleCancelActiveJob(job)}
            cancelBusy={!!(selectedShotJob && cancellingJobId === selectedShotJob.id)}
            onCancelProjectQueue={() => void handleCancelQueuedByProject()}
            bulkCancelling={bulkCancelling}
            onBatchGenerateAllVideos={handleBatchGenerateAllVideos}
            onKeepOnlyCurrentVersion={keepOnlyShotVideoVersion}
            onSelectVideoVersion={selectShotVideoVersion}
            onCheckVideoProgress={() => void handleCheckVideoProgress()}
            checkingProgress={checkingProgress}
            selectedShotJob={selectedShotJob}
            queueSnapshot={queueSnapshot}
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
            productionProjectId={serverProjectId ?? undefined}
            shotActiveJobMap={shotActiveJobMap}
            shotJobStatusMap={shotJobStatusMap}
            queueSnapshot={queueSnapshot}
          />
        )}

        {step === 1 && !story && (
          <p className="text-sm text-[var(--color-text-muted)]">{t('productionWizard.stepInputRequired')}</p>
        )}
        {step === 2 && !project.productionDesign && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('productionWizard.stepStoryRequired')}
          </p>
        )}
        {step === 3 && !project.shots.length && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('productionWizard.stepDesignRequired')}
          </p>
        )}
        </ProductionWizardShell>
      </ProductionProvider>

      <ProductionProjectListModal
        visible={showProjectList}
        projects={projectList}
        governanceBusy={projectGovernanceBusy}
        onClose={() => setShowProjectList(false)}
        onLoadProject={handleLoadServerProject}
        onRenameProject={handleRenameServerProject}
        onDeleteProject={handleDeleteServerProject}
        onGovernUnnamed={handleGovernUnnamedProjects}
      />
      {projectNamingModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeProjectNamingModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[var(--color-text)]">{t('productionWizard.namingModalTitle')}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {t('productionWizard.namingModalDesc')}
            </p>
            <input
              autoFocus
              type="text"
              value={projectNamingModal.name}
              onChange={(event) => setProjectNamingModal((current) => ({ ...current, name: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleConfirmProjectNaming();
                if (event.key === 'Escape') closeProjectNamingModal();
              }}
              placeholder={t('productionWizard.namingPlaceholder')}
              className="mt-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProjectNamingModal}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmProjectNaming}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
              >
                {t('productionWizard.nameAndSave')}
              </button>
            </div>
          </div>
        </div>
      )}
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
