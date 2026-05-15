import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import {
  polishPrompt,
  getTemplates,
  type PromptTemplate,
  type PromptReferenceAsset,
} from '../api/promptPolish';
import { listCharacterLibrary } from '../api/characterLibrary';
import { useGoogleDrive, type DriveFile } from '../hooks/useGoogleDrive';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { DriveMaterialPicker } from '../components/DriveMaterialPicker';
import { DriveExplorer } from '../components/DriveExplorer';
import { ViralDanceMaterialPicker } from '../components/ViralDanceMaterialPicker';
import { MultiShotPromptInput } from '../components/MultiShotPromptInput';
import { StepVideo } from '../components/StepVideo';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';
import {
  UnifiedAssetSelector,
  type UnifiedAssetLibrarySaveState,
  type UnifiedAssetSlot,
  type UnifiedAssetSourceSelection,
} from '../components/UnifiedAssetSelector';
import { RunningStatus } from '../components/RunningStatus';
import {
  buildAssetFileUrl,
  getJobStatus,
  importAssets,
  recordUsage,
  type LibraryAsset,
} from '../api/assetLibraryApi';
import { useLocale } from '../i18n/LocaleContext.tsx';
import {
  filterVisibleStudioTemplates,
  getStudioTemplateAspectRatioOptions,
  getStudioTemplateDurationOptions,
  isValidStudioAspectRatio,
  isValidStudioDuration,
} from '../config/studioTemplateOptions';
import { PROMPT_INSPIRATIONS } from '../config/promptInspirations';
import type { StudioPresetLocale } from '../config/studioQualityPresets';
import {
  inferSeedanceMediaKind,
  isSeedanceReferenceFileSupported,
  validateSeedanceReferenceSet,
  type SeedanceMediaKind,
} from '../config/seedanceSourceConstraints';
import type { DreaminaMultimodalItem } from '../context/CreateFlowContext';
import {
  assignPromptReferenceTokens,
  getPromptReferenceUsage,
  insertPromptReferenceToken,
} from '../utils/promptReferenceTokens';
import { buildStudioPromptFallback, isWeakPolishedPrompt } from '../utils/studioPromptFallback';

const LOCALIZED_SEEDANCE_MODEL_KEYS = [
  { value: 'dreamina-multimodal', labelKey: 'generate.modelMultimodal' },
  { value: 'dreamina-text2video', labelKey: 'generate.modelTextToVideo' },
  { value: 'dreamina-image2video', labelKey: 'generate.modelImageToVideo' },
] as const;

/** 专家模式额外可选的 Veo 模型（仍依赖后端） */
const VIDEO_MODEL_LABELS: Record<string, string> = {
  'veo-2.0-generate-001': 'Veo 2.0 Generate',
  'veo-3.0-generate-preview': 'Veo 3.0 Preview',
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function assetFileUrl(asset: LibraryAsset): string {
  return asset.file_url || buildAssetFileUrl(asset.id);
}

function absoluteAssetUrl(asset: LibraryAsset): string {
  return new URL(assetFileUrl(asset), window.location.origin).toString();
}

function assetPreviewUrl(asset: LibraryAsset): string {
  return asset.thumbnail_url || asset.file_url || buildAssetFileUrl(asset.id);
}

function dreaminaSlotItemId(slot: UnifiedAssetSlot): string {
  return `studio-slot-${slot.id}`;
}

function sortDreaminaItemsBySlotOrder(items: DreaminaMultimodalItem[], slots: UnifiedAssetSlot[]): DreaminaMultimodalItem[] {
  const order = new Map(slots.map((slot, index) => [dreaminaSlotItemId(slot), index]));
  return [...items].sort((a, b) => {
    const aIndex = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function upsertDreaminaSlotItem(
  previous: DreaminaMultimodalItem[],
  slot: UnifiedAssetSlot,
  item: DreaminaMultimodalItem,
  slots: UnifiedAssetSlot[],
): DreaminaMultimodalItem[] {
  return sortDreaminaItemsBySlotOrder(
    [...previous.filter((current) => current.id !== dreaminaSlotItemId(slot)), item],
    slots,
  );
}

function buildUnifiedSourceTokenMap(
  slots: UnifiedAssetSlot[],
  sources: Record<string, UnifiedAssetSourceSelection | null>,
): Record<string, string> {
  const sourceList = slots.flatMap((slot) => {
    const source = sources[slot.id];
    if (!source || source.status === 'error') return [];
    return [{ ...source, id: slot.id }];
  });
  const withTokens = assignPromptReferenceTokens(sourceList);
  return Object.fromEntries(withTokens.map((source) => [source.id, source.token]));
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result ?? '');
      resolve(dataUrl.split(',')[1] ?? dataUrl);
    };
    reader.onerror = () => reject(new Error('Failed to read asset file'));
    reader.readAsDataURL(blob);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForAssetImportDone(jobId: string): Promise<void> {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const job = await getJobStatus(jobId);
    if (job.status === 'done') {
      if (job.failed > 0 && job.processed === 0 && job.skipped === 0) {
        throw new Error(job.errors?.[0] || 'Asset import failed');
      }
      return;
    }
    if (job.status === 'error') {
      throw new Error(job.errors?.[0] || 'Asset import failed');
    }
    await wait(1000);
  }
  throw new Error('Asset import is still processing. Check Asset Library later.');
}

function getUnifiedAssetSlots(templateId: string, locale: StudioPresetLocale): UnifiedAssetSlot[] {
  const isEn = locale === 'en';
  if (templateId === 'viral-dance') {
    return [
      {
        id: 'viral-character',
        title: isEn ? 'Character image' : '角色图',
        description: isEn ? 'The subject that will perform the motion.' : '动作迁移的主体角色。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character hero',
        required: true,
      },
      {
        id: 'viral-scene',
        title: isEn ? 'Scene image' : '场景图',
        description: isEn ? 'Optional background or mood reference.' : '可选，用于补充背景或氛围。',
        mediaType: 'image',
        semanticRole: 'scene',
        initialQuery: 'scene background',
      },
      {
        id: 'viral-motion',
        title: isEn ? 'Motion video' : '动作参考视频',
        description: isEn ? 'The movement source for motion transfer.' : '动作迁移的节奏和动作来源。',
        mediaType: 'video',
        initialQuery: 'motion dance gameplay',
        required: true,
      },
    ];
  }
  if (templateId === 'boss-showcase') {
    return [
      {
        id: 'showcase-character',
        title: isEn ? 'Character or boss' : '角色 / Boss',
        description: isEn ? 'The main subject to showcase.' : '角色展示的主体素材。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character boss hero',
        required: true,
      },
      {
        id: 'showcase-scene',
        title: isEn ? 'Scene mood' : '场景氛围',
        description: isEn ? 'Optional key art or environment mood.' : '可选，主视觉或环境氛围。',
        mediaType: 'image',
        semanticRole: 'scene',
        initialQuery: 'key art scene gameplay',
      },
    ];
  }
  if (templateId === 'custom') {
    return [
      {
        id: 'quick-primary-reference',
        title: isEn ? 'Subject asset' : '主体素材',
        description: isEn ? 'Character, key art, or product visual.' : '角色、主视觉或产品素材。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character key art',
        required: true,
      },
      {
        id: 'quick-scene-reference',
        title: isEn ? 'Scene or mood reference' : '场景 / 氛围参考',
        description: isEn ? 'Optional background or mood image.' : '可选，用于补充背景或画面情绪。',
        mediaType: 'image',
        semanticRole: 'scene',
        initialQuery: 'scene mood background',
      },
    ];
  }
  return [];
}

function normalizeUnifiedAssetSlots(slots: UnifiedAssetSlot[], locale: StudioPresetLocale): UnifiedAssetSlot[] {
  const isEn = locale === 'en';
  const copyById: Record<string, Pick<UnifiedAssetSlot, 'title' | 'description'>> = {
    'viral-character': {
      title: isEn ? 'Character reference' : '主角/产品参考',
      description: isEn ? 'Keeps the subject consistent. Maps to @图片1.' : '决定角色或产品一致性，会映射到 @图片1。',
    },
    'viral-motion': {
      title: isEn ? 'Motion reference' : '动作参考视频',
      description: isEn ? 'Supplies rhythm and body movement. Maps to @视频1.' : '提供动作节奏与肢体细节，会映射到 @视频1。',
    },
    'viral-scene': {
      title: isEn ? 'Environment reference' : '环境/氛围参考',
      description: isEn ? 'Optional background or mood. Maps to @图片2.' : '补充背景、光线和画面情绪，会映射到 @图片2。',
    },
    'showcase-character': {
      title: isEn ? 'Character or boss reference' : '主角/Boss 参考',
      description: isEn ? 'Keeps the showcased subject consistent. Maps to @图片1.' : '决定展示主体的一致性，会映射到 @图片1。',
    },
    'showcase-scene': {
      title: isEn ? 'Environment reference' : '环境/氛围参考',
      description: isEn ? 'Optional key art, background, or mood. Maps to @图片2.' : '补充背景、光线和展示氛围，会映射到 @图片2。',
    },
    'quick-primary-reference': {
      title: isEn ? 'Subject reference' : '主角/产品参考',
      description: isEn ? 'Character, key art, or product visual. Maps to @图片1.' : '决定角色或产品一致性，会映射到 @图片1。',
    },
    'quick-scene-reference': {
      title: isEn ? 'Environment reference' : '环境/氛围参考',
      description: isEn ? 'Optional background, lighting, or mood image. Maps to @图片2.' : '补充背景、光线和画面情绪，会映射到 @图片2。',
    },
  };
  const order = new Map([
    ['viral-character', 0],
    ['viral-motion', 1],
    ['viral-scene', 2],
    ['showcase-character', 0],
    ['showcase-scene', 1],
    ['quick-primary-reference', 0],
    ['quick-scene-reference', 1],
  ]);

  return [...slots]
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    .map((slot) => ({ ...slot, ...(copyById[slot.id] ?? {}) }));
}

interface TabGenerateProps {
  onBrowseTemplates?: () => void;
  /** 返回功能选择（重新选择模板） */
  onBackToPicker?: () => void;
}

export function TabGenerate({ onBrowseTemplates, onBackToPicker }: TabGenerateProps = {}) {
  const { contentLocale, t } = useLocale();
  const formatText = useCallback((path: string, values?: Record<string, string | number>) => {
    let message = t(path);
    if (!values) return message;
    for (const [key, value] of Object.entries(values)) {
      message = message.replaceAll(`{${key}}`, String(value));
    }
    return message;
  }, [t]);
  const localizedSeedanceModels = LOCALIZED_SEEDANCE_MODEL_KEYS.map((item) => ({
    value: item.value,
    label: t(item.labelKey),
  }));
  const {
    prompt,
    setPrompt,
    keywords,
    setKeywords,
    folderHints,
    setFolderHints,
    selectedOrder,
    setSelectedOrder,
    hasPolishedPrompt,
    setHasPolishedPrompt,
    hasMatchedMaterials,
    setHasMatchedMaterials,
    templateId,
    setTemplateId,
    videoModel,
    setVideoModel,
    videoAspectRatio,
    setVideoAspectRatio,
    videoDuration,
    setVideoDuration,
    videoResolution,
    setVideoResolution,
    shots,
    setShots,
    setShotFrames,
    multiShotEnabled,
    setMultiShotEnabled,
    viralDanceReferenceVideoUrl,
    setViralDanceReferenceVideoUrl,
    dreaminaMultimodalItems,
    setDreaminaMultimodalItems,
  } = useCreateFlow();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const visibleTemplates = filterVisibleStudioTemplates(templates);
  const currentTemplate = visibleTemplates.find((t) => t.id === templateId);
  const isMultishotTemplate = currentTemplate?.pipelineMode === 'multishot';

  const {
    verifiedFolderId,
    verifiedFolderName,
    accessToken,
    setAccessToken,
  } = useMaterials();

  const [polishLoading, setPolishLoading] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [showGenerationFlow, setShowGenerationFlow] = useState(false);
  const [veoModels, setVeoModels] = useState<string[]>([]);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    onSuccess: (res) => setAccessToken(res.access_token),
    onError: () => setAccessToken(null),
  });

  const { files, loading, error, search, listFolder } = useGoogleDrive(accessToken);
  /** 默认模板：在文件夹树中手动勾选（不依赖关键词搜索） */
  const [showDriveManualBrowse, setShowDriveManualBrowse] = useState(false);
  const [showMoreAssetSources, setShowMoreAssetSources] = useState(false);
  const selectedIds = new Set(selectedOrder.map((f) => f.id));

  const [quickInspirationsExpanded, setQuickInspirationsExpanded] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  const [unifiedSources, setUnifiedSources] = useState<Record<string, UnifiedAssetSourceSelection | null>>({});
  const [unifiedAssetError, setUnifiedAssetError] = useState<string | null>(null);
  const [librarySaveStatuses, setLibrarySaveStatuses] = useState<Record<string, UnifiedAssetLibrarySaveState>>({});
  const [polishNotice, setPolishNotice] = useState<string | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const localPreviewUrlsRef = useRef<Record<string, string>>({});
  const localSourceFilesRef = useRef<Record<string, File>>({});

  const revokeLocalPreview = useCallback((slotId: string) => {
    const previewUrl = localPreviewUrlsRef.current[slotId];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      delete localPreviewUrlsRef.current[slotId];
    }
  }, []);

  const revokeAllLocalPreviews = useCallback(() => {
    Object.keys(localPreviewUrlsRef.current).forEach((slotId) => revokeLocalPreview(slotId));
  }, [revokeLocalPreview]);

  const clearLocalSourceFile = useCallback((slotId: string) => {
    delete localSourceFilesRef.current[slotId];
    setLibrarySaveStatuses((current) => {
      if (!current[slotId]) return current;
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }, []);

  useEffect(() => () => revokeAllLocalPreviews(), [revokeAllLocalPreviews]);

  useEffect(() => {
    if (expertMode) {
      import('../api/video').then(({ getVeoModels }) => {
        getVeoModels()
          .then((r) => setVeoModels(r.models))
          .catch(() => {});
      });
    }
  }, [expertMode]);

  /** 切换离「全能参考」时清空已选素材，避免误带大 payload */
  useEffect(() => {
    if (videoModel !== 'dreamina-multimodal') {
      setDreaminaMultimodalItems([]);
    }
  }, [videoModel, setDreaminaMultimodalItems]);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const presetLocale: StudioPresetLocale = contentLocale === 'en' ? 'en' : 'zh';
  const unifiedAssetSlots = useMemo(
    () => normalizeUnifiedAssetSlots(getUnifiedAssetSlots(templateId, presetLocale), presetLocale),
    [templateId, presetLocale],
  );
  const unifiedSourceTokenMap = useMemo(
    () => buildUnifiedSourceTokenMap(unifiedAssetSlots, unifiedSources),
    [unifiedAssetSlots, unifiedSources],
  );
  const selectedUnifiedSources = useMemo<Record<string, UnifiedAssetSourceSelection | null>>(
    () => Object.fromEntries(
      Object.entries(unifiedSources).map(([slotId, source]) => [
        slotId,
        source ? { ...source, token: unifiedSourceTokenMap[slotId] } : null,
      ]),
    ),
    [unifiedSourceTokenMap, unifiedSources],
  );
  const promptReferenceAssets = useMemo<PromptReferenceAsset[]>(
    () => unifiedAssetSlots.flatMap((slot) => {
      const source = selectedUnifiedSources[slot.id];
      if (!source?.token || source.status === 'reading' || source.status === 'error') return [];
      return [{
        slotId: slot.id,
        title: slot.title,
        kind: source.kind,
        filename: source.filename,
        token: source.token,
        semanticRole: slot.semanticRole,
      }];
    }),
    [selectedUnifiedSources, unifiedAssetSlots],
  );
  const promptReferenceUsage = useMemo(
    () => getPromptReferenceUsage(prompt, promptReferenceAssets),
    [prompt, promptReferenceAssets],
  );
  const handleInsertPromptToken = useCallback(
    (selection: UnifiedAssetSourceSelection) => {
      if (!selection.token) return;
      const textarea = promptTextareaRef.current;
      const start = textarea?.selectionStart ?? prompt.length;
      const end = textarea?.selectionEnd ?? start;
      const next = insertPromptReferenceToken(prompt, selection.token, start, end);
      setPrompt(next.value);
      setHasPolishedPrompt(false);
      window.requestAnimationFrame(() => {
        promptTextareaRef.current?.focus();
        promptTextareaRef.current?.setSelectionRange(next.cursor, next.cursor);
      });
    },
    [prompt, setHasPolishedPrompt, setPrompt],
  );

  /** 模板切换时清理模板专属状态，避免旧素材或分镜误带到新模板。 */
  useEffect(() => {
    setShowGenerationFlow(false);
    setPolishError(null);
    setPolishNotice(null);
    setHasPolishedPrompt(false);
    setHasMatchedMaterials(false);
    setSelectedOrder([]);
    setShots([]);
    setShotFrames({});
    setMultiShotEnabled(false);
    setDreaminaMultimodalItems([]);
    revokeAllLocalPreviews();
    localSourceFilesRef.current = {};
    setUnifiedSources({});
    setLibrarySaveStatuses({});
    setUnifiedAssetError(null);
    setShowMoreAssetSources(false);
    setShowDriveManualBrowse(false);
    if (templateId !== 'viral-dance') setViralDanceReferenceVideoUrl('');
  }, [
    templateId,
    setDreaminaMultimodalItems,
    setHasMatchedMaterials,
    setHasPolishedPrompt,
    setMultiShotEnabled,
    setSelectedOrder,
    setShotFrames,
    setShots,
    setViralDanceReferenceVideoUrl,
    revokeAllLocalPreviews,
  ]);

  /** Motion Transfer + 参考视频自动预填 prompt（越懒越好） */
  useEffect(() => {
    if (templateId === 'viral-dance' && viralDanceReferenceVideoUrl.trim() && !prompt.trim()) {
      setPrompt(
        contentLocale === 'en'
          ? 'The subject in @\u56fe\u72471 follows the motion from @\u89c6\u98911, with @\u56fe\u72472 as the optional environment reference. Smooth rhythm, consistent subject design, vertical 9:16.'
          : '\u4e3b\u4f53\u53c2\u8003 @\u56fe\u72471 \u8ddf\u968f\u52a8\u4f5c\u53c2\u8003 @\u89c6\u98911 \u7684\u8282\u594f\u5b8c\u6210\u52a8\u4f5c\uff1b\u5982\u6709 @\u56fe\u72472\uff0c\u5219\u4f5c\u4e3a\u73af\u5883\u4e0e\u6c1b\u56f4\u53c2\u8003\u3002\u52a8\u4f5c\u6e05\u6670\uff0c\u4e3b\u4f53\u9020\u578b\u4fdd\u6301\u4e00\u81f4\uff0c\u7ad6\u5c4f 9:16\u3002',
      );
    }
  }, [contentLocale, prompt, setPrompt, templateId, viralDanceReferenceVideoUrl]);

  const handleOneClickPrompt = useCallback(
    async () => {
      let effectivePrompt = prompt;
      if (templateId === 'viral-dance' && viralDanceReferenceVideoUrl.trim()) {
        const referenceVideoHeader =
          contentLocale === 'en'
            ? '[Reference video URL provided by the user. This is the motion source and maps to API video_list.]'
            : '【用户提供的参考视频直链（动作来源，与 API video_list 对应）】';
        effectivePrompt = `${referenceVideoHeader}\n${viralDanceReferenceVideoUrl.trim()}\n\n${effectivePrompt}`;
      }
      if (!effectivePrompt.trim()) return;
      setPolishLoading(true);
      setPolishError(null);
      setPolishNotice(null);

      try {
        // 自定义模式：不传 templateId，仅用导演知识；多镜头时传 multishot 获取分镜
        let opts: {
          templateId?: string;
          mode?: 'custom' | 'viral-dance' | 'boss-showcase';
          multishot?: boolean;
          duration?: number;
          aspectRatio?: string;
          referenceAssets?: PromptReferenceAsset[];
        } = {
          mode: templateId === 'viral-dance' || templateId === 'boss-showcase' ? templateId : 'custom',
          referenceAssets: promptReferenceAssets,
        };
        if (templateId === 'custom') {
          if (multiShotEnabled) {
            opts = { ...(opts ?? {}), multishot: true, duration: videoDuration, aspectRatio: videoAspectRatio };
          }
        } else if (templateId) {
          opts = { ...opts, templateId };
        } else {
          opts = { ...opts };
        }
        const { polishedPrompt, searchKeywords, folderHints: hints, template, shots: polishedShots } = await polishPrompt(effectivePrompt, opts);
        if (isWeakPolishedPrompt(polishedPrompt, effectivePrompt)) {
          const fallbackPrompt = buildStudioPromptFallback(effectivePrompt, {
            mode: opts.mode,
            duration: videoDuration,
            aspectRatio: videoAspectRatio,
            locale: contentLocale === 'en' ? 'en' : 'zh',
            referenceAssets: promptReferenceAssets,
            referenceVideoUrl: viralDanceReferenceVideoUrl,
          });
          setKeywords([prompt.trim() || fallbackPrompt.slice(0, 80)]);
          setFolderHints([]);
          setHasPolishedPrompt(true);
          setPrompt(fallbackPrompt);
          setPolishNotice(
            contentLocale === 'en'
              ? 'Cloud prompt polish returned unstable text. Studio used local rules, and you can keep editing.'
              : '云端优化返回不稳定，已用本地规则整理，可继续编辑或直接生成。',
          );
          return;
        }
        setKeywords(searchKeywords);
        setFolderHints(hints || []);
        setHasPolishedPrompt(true);
        if (template) {
          if (!isValidStudioDuration(templateId, videoDuration, multiShotEnabled)) {
            setVideoDuration(template.duration);
          }
          if (!isValidStudioAspectRatio(templateId, videoAspectRatio, multiShotEnabled)) {
            setVideoAspectRatio(template.aspectRatio);
          }
        }
        if (polishedShots?.length && template?.pipelineMode === 'multishot') {
          setMultiShotEnabled(true);
          setShots(polishedShots);
          setPrompt(polishedPrompt);
        } else {
          setPrompt(polishedPrompt);
        }
      } catch (e) {
        const fallbackPrompt = buildStudioPromptFallback(effectivePrompt, {
          mode: templateId === 'viral-dance' || templateId === 'boss-showcase' ? templateId : 'custom',
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
          locale: contentLocale === 'en' ? 'en' : 'zh',
          referenceAssets: promptReferenceAssets,
          referenceVideoUrl: viralDanceReferenceVideoUrl,
        });
        setKeywords([prompt.trim() || fallbackPrompt.slice(0, 80)]);
        setFolderHints([]);
        setHasPolishedPrompt(true);
        setPrompt(fallbackPrompt);
        setPolishNotice(
          contentLocale === 'en'
            ? 'Cloud prompt polish was slow or unavailable. Studio used local rules, and you can keep editing.'
            : '云端优化暂时不可用，已用本地规则整理，可继续编辑或直接生成。',
        );
        setPolishError(null);
      } finally {
        setPolishLoading(false);
      }
    },
    [
      prompt,
      templateId,
      multiShotEnabled,
      videoDuration,
      videoAspectRatio,
      viralDanceReferenceVideoUrl,
      contentLocale,
      promptReferenceAssets,
      setPrompt,
      setKeywords,
      setFolderHints,
      setHasPolishedPrompt,
      setVideoDuration,
      setVideoAspectRatio,
      setMultiShotEnabled,
      setShots,
      t,
    ]
  );

  const isCustomMode = templateId === 'custom';
  const isViralDanceTemplate = templateId === 'viral-dance';
  const expertVideoModels = useMemo(() => {
    const models = [...veoModels];
    const isSeedanceModel = LOCALIZED_SEEDANCE_MODEL_KEYS.some((item) => item.value === videoModel);
    if (videoModel && !isSeedanceModel && !models.includes(videoModel)) models.unshift(videoModel);
    return models;
  }, [veoModels, videoModel]);

  const handleViralDanceReferenceUrlChange = useCallback(
    (nextUrl: string) => {
      setViralDanceReferenceVideoUrl(nextUrl);
      if (nextUrl.trim()) {
        setExpertMode(true);
        if (!videoModel.toLowerCase().startsWith('kling')) {
          setVideoModel('kling-v3-omni');
        }
      }
    },
    [setVideoModel, setViralDanceReferenceVideoUrl, videoModel],
  );

  const handleOneClickMatch = useCallback(async () => {
    if (!verifiedFolderId || !accessToken) return;
    if (keywords.length === 0) {
      setPolishError(t('generate.optimizePromptFirstError'));
      return;
    }
    setMatchLoading(true);
    setPolishError(null);
    try {
      const matched = await search(keywords, verifiedFolderId, folderHints.length > 0 ? folderHints : undefined);
      setHasMatchedMaterials(matched.length > 0);
      if (matched.length === 0) {
        setPolishError(t('generate.matchNoResultsError'));
      }
    } catch {
      setPolishError(t('generate.matchSearchFailedError'));
      setHasMatchedMaterials(false);
    } finally {
      setMatchLoading(false);
    }
  }, [verifiedFolderId, accessToken, keywords, folderHints, search, setHasMatchedMaterials, t]);

  /** 与 Boss 展示一致：从资源管理器勾选的文件并入已选顺序（用于默认模板 / Drive 检索流） */
  const handleToggleFromExplorer = useCallback(
    (id: string, item: { id: string; name: string; mimeType: string }) => {
      const file: DriveFile = { id, name: item.name, mimeType: item.mimeType };
      setSelectedOrder((order) => {
        const exists = order.some((f) => f.id === id);
        if (exists) return order.filter((f) => f.id !== id);
        return [...order, file];
      });
      setHasMatchedMaterials(true);
    },
    [setSelectedOrder, setHasMatchedMaterials],
  );

  const handleToggleSelect = useCallback(
    (id: string) => {
      setSelectedOrder((order) => {
        const exists = order.some((f) => f.id === id);
        if (exists) return order.filter((f) => f.id !== id);
        const file = files.find((f) => f.id === id);
        return file ? [...order, file] : order;
      });
    },
    [files, setSelectedOrder],
  );

  const handleStartGenerate = useCallback(() => {
    setShowGenerationFlow(true);
  }, []);

  const formatSeedanceValidationError = useCallback(
    (reason: ReturnType<typeof validateSeedanceReferenceSet>['reason']) => {
      if (contentLocale === 'en') {
        const messages: Record<typeof reason, string> = {
          ok: '',
          'missing-visual-reference': 'Add at least one image or video reference for Seedance all-in-one mode.',
          'audio-only': 'Audio can be a supplement, but cannot be the only Seedance reference.',
          'too-many-images': 'Seedance supports up to 9 image references.',
          'too-many-videos': 'Seedance supports up to 3 video references.',
          'too-many-audios': 'Seedance supports up to 3 audio references.',
          'too-many-total': 'Seedance supports up to 12 total references.',
        };
        return messages[reason];
      }
      const messages: Record<typeof reason, string> = {
        ok: '',
        'missing-visual-reference': 'Seedance 全能参考至少需要 1 张图片或 1 段视频。',
        'audio-only': '音频只能作为补充，不能单独作为 Seedance 参考素材。',
        'too-many-images': 'Seedance 最多支持 9 张图片参考。',
        'too-many-videos': 'Seedance 最多支持 3 段视频参考。',
        'too-many-audios': 'Seedance 最多支持 3 段音频参考。',
        'too-many-total': 'Seedance 最多支持 12 个参考素材。',
      };
      return messages[reason];
    },
    [contentLocale],
  );

  const validateNextDreaminaSlot = useCallback(
    (slot: UnifiedAssetSlot, kind: SeedanceMediaKind): boolean => {
      const itemId = dreaminaSlotItemId(slot);
      const validation = validateSeedanceReferenceSet([
        ...dreaminaMultimodalItems.filter((item) => item.id !== itemId).map((item) => ({ kind: item.kind })),
        { kind },
      ]);
      if (!validation.ok) {
        setUnifiedAssetError(formatSeedanceValidationError(validation.reason));
        return false;
      }
      return true;
    },
    [dreaminaMultimodalItems, formatSeedanceValidationError],
  );

  const handleUnifiedSourceClear = useCallback(
    (slot: UnifiedAssetSlot) => {
      revokeLocalPreview(slot.id);
      clearLocalSourceFile(slot.id);
      setUnifiedSources((current) => ({ ...current, [slot.id]: null }));
      setDreaminaMultimodalItems((prev) => prev.filter((item) => item.id !== dreaminaSlotItemId(slot)));
      if (slot.mediaType === 'video') setViralDanceReferenceVideoUrl('');
      setUnifiedAssetError(null);
    },
    [clearLocalSourceFile, revokeLocalPreview, setDreaminaMultimodalItems, setViralDanceReferenceVideoUrl],
  );

  const handleUnifiedAssetSelect = useCallback(
    async (slot: UnifiedAssetSlot, asset: LibraryAsset | null) => {
      const itemId = dreaminaSlotItemId(slot);
      setUnifiedAssetError(null);
      clearLocalSourceFile(slot.id);

      if (!asset) {
        handleUnifiedSourceClear(slot);
        return;
      }

      const assetMime = asset.mimetype ?? asset.mime_type ?? '';
      if (!isSeedanceReferenceFileSupported({ filename: asset.filename, mimeType: assetMime }, slot.mediaType)) {
        setUnifiedAssetError(
          contentLocale === 'en'
            ? 'This file type is not supported by Seedance for this slot.'
            : '该素材类型不符合 Seedance 对这个参考位的要求。',
        );
        return;
      }

      try {
        setUnifiedSources((current) => ({
          ...current,
          [slot.id]: {
            id: `library-${asset.id}`,
            source: 'library',
            kind: slot.mediaType,
            filename: asset.filename,
            mimeType: assetMime,
            previewUrl: assetPreviewUrl(asset),
            assetId: asset.id,
            status: 'reading',
          },
        }));
        const resp = await fetch(assetFileUrl(asset));
        const blob = await resp.blob();
        const kind = inferSeedanceMediaKind({ filename: asset.filename, mimeType: blob.type || assetMime });
        if (!kind || kind !== slot.mediaType) {
          throw new Error('Unsupported reference asset type');
        }
        if (!validateNextDreaminaSlot(slot, kind)) {
          setUnifiedSources((current) => ({ ...current, [slot.id]: null }));
          return;
        }
        const base64 = await readBlobAsBase64(blob);
        revokeLocalPreview(slot.id);
        setDreaminaMultimodalItems((prev) => upsertDreaminaSlotItem(
          prev,
          slot,
          {
            id: itemId,
            kind,
            base64,
            mimeType: blob.type || assetMime || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
            fileName: asset.filename,
            semanticRole: slot.semanticRole,
          },
          unifiedAssetSlots,
        ));
        setUnifiedSources((current) => ({
          ...current,
          [slot.id]: {
            id: `library-${asset.id}`,
            source: 'library',
            kind,
            filename: asset.filename,
            mimeType: blob.type || assetMime,
            previewUrl: assetPreviewUrl(asset),
            assetId: asset.id,
            status: 'ready',
          },
        }));
        if (kind === 'video') setViralDanceReferenceVideoUrl(absoluteAssetUrl(asset));
        void recordUsage(asset.id, `studio-unified-slot:${slot.id}`);
      } catch {
        const errorMessage = contentLocale === 'en'
          ? 'Studio could not load this asset as a Seedance reference. Try another file.'
          : '无法读取这个资产，请换一个文件。';
        setUnifiedAssetError(errorMessage);
        setUnifiedSources((current) => ({
          ...current,
          [slot.id]: {
            id: `library-${asset.id}`,
            source: 'library',
            kind: slot.mediaType,
            filename: asset.filename,
            mimeType: assetMime,
            previewUrl: assetPreviewUrl(asset),
            assetId: asset.id,
            status: 'error',
            error: errorMessage,
          },
        }));
        setDreaminaMultimodalItems((prev) => prev.filter((item) => item.id !== itemId));
      }
    },
    [
      contentLocale,
      clearLocalSourceFile,
      handleUnifiedSourceClear,
      revokeLocalPreview,
      setDreaminaMultimodalItems,
      setViralDanceReferenceVideoUrl,
      unifiedAssetSlots,
      validateNextDreaminaSlot,
    ],
  );

  const handleUnifiedLocalFileSelect = useCallback(
    async (slot: UnifiedAssetSlot, file: File) => {
      const itemId = dreaminaSlotItemId(slot);
      setUnifiedAssetError(null);

      const kind = inferSeedanceMediaKind(file);
      if (!kind || kind !== slot.mediaType || !isSeedanceReferenceFileSupported(file, slot.mediaType)) {
        setUnifiedAssetError(
          contentLocale === 'en'
            ? 'This local file type is not supported by Seedance for this slot.'
            : '该本地文件类型不符合 Seedance 对这个参考位的要求。',
        );
        return;
      }
      if (!validateNextDreaminaSlot(slot, kind)) {
        return;
      }

      clearLocalSourceFile(slot.id);
      localSourceFilesRef.current[slot.id] = file;
      const previewUrl = URL.createObjectURL(file);
      setUnifiedSources((current) => ({
        ...current,
        [slot.id]: {
          id: `local-${slot.id}-${Date.now()}`,
          source: 'local',
          kind,
          filename: file.name,
          mimeType: file.type,
          previewUrl,
          status: 'reading',
        },
      }));
      try {
        const base64 = await readBlobAsBase64(file);
        revokeLocalPreview(slot.id);
        localPreviewUrlsRef.current[slot.id] = previewUrl;
        setDreaminaMultimodalItems((prev) => upsertDreaminaSlotItem(
          prev,
          slot,
          {
            id: itemId,
            kind,
            base64,
            mimeType: file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
            fileName: file.name,
            semanticRole: slot.semanticRole,
          },
          unifiedAssetSlots,
        ));
        setUnifiedSources((current) => ({
          ...current,
          [slot.id]: {
            id: `local-${slot.id}-${Date.now()}`,
            source: 'local',
            kind,
            filename: file.name,
            mimeType: file.type,
            previewUrl,
            status: 'ready',
          },
        }));
        if (kind === 'video') setViralDanceReferenceVideoUrl('');
      } catch {
        URL.revokeObjectURL(previewUrl);
        clearLocalSourceFile(slot.id);
        const errorMessage = contentLocale === 'en'
          ? 'Studio could not read this local file.'
          : '\u65e0\u6cd5\u8bfb\u53d6\u8fd9\u4e2a\u672c\u5730\u6587\u4ef6\u3002';
        setUnifiedAssetError(errorMessage);
        setUnifiedSources((current) => ({
          ...current,
          [slot.id]: {
            id: `local-${slot.id}-${Date.now()}`,
            source: 'local',
            kind,
            filename: file.name,
            mimeType: file.type,
            status: 'error',
            error: errorMessage,
          },
        }));
      }
    },
    [
      contentLocale,
      clearLocalSourceFile,
      revokeLocalPreview,
      setDreaminaMultimodalItems,
      setViralDanceReferenceVideoUrl,
      unifiedAssetSlots,
      validateNextDreaminaSlot,
    ],
  );

  const handleSaveLocalSourceToLibrary = useCallback(
    async (slot: UnifiedAssetSlot, selection: UnifiedAssetSourceSelection) => {
      const file = localSourceFilesRef.current[slot.id];
      if (!file || selection.source !== 'local') {
        setLibrarySaveStatuses((current) => ({
          ...current,
          [slot.id]: {
            status: 'error',
            message: contentLocale === 'en'
              ? 'Choose a local file first.'
              : '请先选择本地文件。',
          },
        }));
        return;
      }
      setLibrarySaveStatuses((current) => ({
        ...current,
        [slot.id]: {
          status: 'saving',
          message: contentLocale === 'en'
            ? 'Saving to Asset Library...'
            : '正在保存到素材库...',
        },
      }));
      try {
        const { jobId } = await importAssets([file]);
        await waitForAssetImportDone(jobId);
        setLibrarySaveStatuses((current) => ({
          ...current,
          [slot.id]: {
            status: 'saved',
            message: contentLocale === 'en'
              ? 'Saved. You can reuse it from Asset Library.'
              : '已保存到素材库，可在资产库复用。',
          },
        }));
      } catch (error) {
        setLibrarySaveStatuses((current) => ({
          ...current,
          [slot.id]: {
            status: 'error',
            message: error instanceof Error
              ? error.message
              : contentLocale === 'en'
                ? 'Failed to save to Asset Library.'
                : '保存到素材库失败。',
          },
        }));
      }
    },
    [contentLocale],
  );

  const maxDuration = currentTemplate?.duration ?? videoDuration;
  const totalShotsDuration = shots.reduce((s, shot) => s + shot.duration, 0);
  const shotsValid = shots.length >= 1 && shots.every((shot) => shot.prompt.trim().length > 0) && totalShotsDuration <= maxDuration;

  // 单镜：有 prompt 即可；多镜：shots 有效
  const hasValidPrompt = multiShotEnabled
    ? shotsValid
    : hasPolishedPrompt || prompt.trim().length > 0;
  const seedanceReferenceValidation = validateSeedanceReferenceSet(
    dreaminaMultimodalItems.map((item) => ({ kind: item.kind })),
  );
  const requiredUnifiedSourcesReady =
    videoModel !== 'dreamina-multimodal' ||
    unifiedAssetSlots.every((slot) => !slot.required || selectedUnifiedSources[slot.id]?.status === 'ready');
  const seedanceReferencesReady = videoModel !== 'dreamina-multimodal' || seedanceReferenceValidation.canGenerate;
  const driveMaterialReady = !hasMatchedMaterials || selectedOrder.length >= 1;
  const materialOk = requiredUnifiedSourcesReady && seedanceReferencesReady && driveMaterialReady;
  const canStartGenerate = hasValidPrompt && materialOk;
  const durationOptions = getStudioTemplateDurationOptions(templateId, multiShotEnabled);
  const aspectRatioOptions = getStudioTemplateAspectRatioOptions(templateId, multiShotEnabled);

  useEffect(() => {
    const nextDurationOptions = getStudioTemplateDurationOptions(templateId, multiShotEnabled);
    const nextAspectRatioOptions = getStudioTemplateAspectRatioOptions(templateId, multiShotEnabled);
    if (!nextDurationOptions.includes(videoDuration)) {
      setVideoDuration(nextDurationOptions[0] ?? 8);
    }
    if (!nextAspectRatioOptions.includes(videoAspectRatio)) {
      setVideoAspectRatio(nextAspectRatioOptions[0] ?? '9:16');
    }
  }, [
    templateId,
    multiShotEnabled,
    videoDuration,
    videoAspectRatio,
    setVideoDuration,
    setVideoAspectRatio,
  ]);

  return (
    <div className="max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('generate.pageTitle')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpertMode((v) => !v)}
            title={expertMode ? t('generate.switchToSimple') : t('generate.switchToExpert')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              expertMode
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M12 2v2M12 20v2M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2"/></svg>
            {expertMode ? `⚡ ${t('generate.expertMode')}` : t('generate.simpleMode')}
          </button>
          {templateId && onBackToPicker && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowGenerationFlow(false);
                onBackToPicker();
              }}
              className="relative z-10 text-sm text-[var(--color-primary)] hover:underline"
            >
              {t('generate.reselectFeature')}
            </button>
          )}
        </div>
      </div>

      {/* 输入区 */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-sm font-medium text-[var(--color-text)]">{t('generate.inputTitle')}</span>
          {expertMode && (isMultishotTemplate || isCustomMode) && (
            <>
              <span className="text-xs text-[var(--color-text-muted)]">
                {t('generate.totalShotDurationLabel')}{' '}
                <span className={totalShotsDuration > maxDuration ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}>{totalShotsDuration}s</span> / {maxDuration}s
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-[var(--color-text-muted)]">{t('generate.multiShotDescription')}</span>
                <input
                  type="checkbox"
                  checked={multiShotEnabled}
                  onChange={(e) => {
                    setMultiShotEnabled(e.target.checked);
                    if (e.target.checked && shots.length === 0) setShots([{ duration: 5, prompt: '' }]);
                    if (!e.target.checked) setShots([]);
                  }}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>
            </>
          )}
          {!multiShotEnabled && prompt.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {t('generate.saveAsTemplate')}
            </button>
          )}
        </div>
        {multiShotEnabled && (isMultishotTemplate || isCustomMode) ? (
          <MultiShotPromptInput
            shots={shots}
            setShots={setShots}
            maxTotalDuration={maxDuration}
            aspectRatio={videoAspectRatio}
            onShotFramesChange={setShotFrames}
          />
        ) : (
          <>
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setHasPolishedPrompt(false);
              }}
              rows={7}
              placeholder={
                isViralDanceTemplate
                  ? t('generate.viralPromptPlaceholder')
                  : t('generate.promptPlaceholder')
              }
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
            />
            {promptReferenceUsage.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2" data-section="promptReferencePreview">
                <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                  {contentLocale === 'en' ? 'Prompt references' : '\u5df2\u5f15\u7528\u7d20\u6750'}
                </span>
                {promptReferenceUsage.map(({ source, referenced }) => (
                  <button
                    key={`${source.slotId}-${source.token}`}
                    type="button"
                    onClick={() => handleInsertPromptToken({
                      id: source.slotId ?? source.token,
                      source: 'local',
                      kind: source.kind,
                      filename: source.filename ?? source.title ?? source.token,
                      token: source.token,
                    })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      referenced
                        ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {source.token} - {referenced ? (contentLocale === 'en' ? 'referenced' : '\u5df2\u5199\u5165 Prompt') : (contentLocale === 'en' ? 'not in Prompt' : '\u672a\u5199\u5165 Prompt')}
                  </button>
                ))}
              </div>
            ) : null}
            {isCustomMode && (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setQuickInspirationsExpanded((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-xs font-semibold text-[var(--color-text)]">{t('generate.quickInspirationTitle')}</span>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">{t('generate.quickInspirationDesc')}</span>
                  </span>
                  <ChevronIcon className={`h-4 w-4 shrink-0 transition-transform ${quickInspirationsExpanded ? 'rotate-180' : ''}`} />
                </button>
                {quickInspirationsExpanded ? (
                <div className="space-y-2">
                  {PROMPT_INSPIRATIONS.map((category) => (
                    <div key={category.id} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
                        {contentLocale === 'en' ? category.nameEn : category.nameZh}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.prompts.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setPrompt(item);
                              setHasPolishedPrompt(false);
                            }}
                            className="max-w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-left text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                ) : null}
              </div>
            )}
          </>
        )}
        {/* 写稿要点 */}
      </section>

      {unifiedAssetSlots.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4" data-section="unifiedAssetSelector">
          <div className="mb-3">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {t('generate.referenceAssetsTitle')}
            </p>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              {t('generate.referenceAssetsDesc')}
            </p>
          </div>
          <UnifiedAssetSelector
            slots={unifiedAssetSlots}
            selectedSources={selectedUnifiedSources}
            librarySaveStatuses={librarySaveStatuses}
            locale={presetLocale}
            onSelectAsset={(slot, asset) => void handleUnifiedAssetSelect(slot, asset)}
            onSelectLocalFile={(slot, file) => void handleUnifiedLocalFileSelect(slot, file)}
            onClearSource={handleUnifiedSourceClear}
            onInsertToken={handleInsertPromptToken}
            onSaveLocalToLibrary={(slot, selection) => void handleSaveLocalSourceToLibrary(slot, selection)}
          />
          {isViralDanceTemplate ? (
            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" data-section="viralReferenceVideoUrl">
              <p className="mb-1 text-xs font-medium text-[var(--color-text)]">
                {contentLocale === 'en' ? 'Motion reference link' : '动作参考链接'}
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  data-field="viral-reference-video-url"
                  value={viralDanceReferenceVideoUrl}
                  onChange={(e) => handleViralDanceReferenceUrlChange(e.target.value)}
                  placeholder={t('generate.tiktokUrlPlaceholder')}
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                {viralDanceReferenceVideoUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setViralDanceReferenceVideoUrl('')}
                    className="rounded-lg px-2 py-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                    aria-label={contentLocale === 'en' ? 'Clear motion reference link' : '清除动作参考链接'}
                  >
                    x
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                {contentLocale === 'en'
                  ? 'Paste a TikTok/Douyin/public video URL to use it as the motion source. Studio switches to Kling for URL references; uploaded videos still work with Seedance multimodal.'
                  : '可粘贴 TikTok/抖音/公开视频链接作为动作来源。使用链接时会自动切到可灵；上传视频仍按 Seedance 全能参考使用。'}
              </p>
            </div>
          ) : null}
          {unifiedAssetError ? (
            <p className="mt-3 text-sm text-[var(--color-error)]">{unifiedAssetError}</p>
          ) : null}
          {videoModel === 'dreamina-multimodal' && !seedanceReferenceValidation.canGenerate ? (
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              {formatSeedanceValidationError(seedanceReferenceValidation.reason)}
            </p>
          ) : null}
        </section>
      )}

      {/* Pipeline 模板选择 / 自定义模式说明 */}
      {visibleTemplates.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          {isCustomMode ? (
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">{t('generate.customModeTitle')}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('generate.customModeDesc')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">{t('generate.pipelineTitle')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                {t('generate.pipelineDesc')}
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTemplateId(id);
                      const t = visibleTemplates.find((x) => x.id === id);
                      if (t) {
                        setVideoDuration(t.duration);
                        setVideoAspectRatio(t.aspectRatio);
                      }
                    }}
                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none min-w-[180px]"
                  >
                    <option value="">{t('generate.pipelineDefaultOption')}</option>
                    {visibleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.description}
                      </option>
                    ))}
                  </select>
                </label>
                {templateId && (
                  <span className="text-xs text-[var(--color-text-muted)] self-center">
                    {videoDuration}s · {videoAspectRatio}
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* 配置行 */}
      <section className="flex flex-wrap gap-4 items-center text-sm text-[var(--color-text-muted)]">
        <label className="flex items-center gap-2">
          <span>{t('generate.model')}</span>
          <select
            value={videoModel}
            onChange={(e) => setVideoModel(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            {localizedSeedanceModels.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            {expertMode && expertVideoModels.map((m) => (
              <option key={m} value={m}>
                {VIDEO_MODEL_LABELS[m] ?? m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>{t('generate.aspectRatio')}</span>
          <select
            value={videoAspectRatio}
            onChange={(e) => setVideoAspectRatio(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            {aspectRatioOptions.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio === '16:9' ? t('generate.landscape') : ratio === '9:16' ? t('generate.portrait') : ratio}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>{t('generate.duration')}</span>
          <select
            value={videoDuration}
            onChange={(e) => setVideoDuration(Number(e.target.value))}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            {durationOptions.map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
            ))}
          </select>
        </label>
        {expertMode && (
          <label className="flex items-center gap-2">
            <span>{t('generate.resolution')}</span>
            <select
              value={videoResolution}
              onChange={(e) => setVideoResolution(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </label>
        )}
      </section>

      {/* 操作按钮 */}
      <section className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={() => handleOneClickPrompt()}
          disabled={polishLoading || !prompt.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {polishLoading
            ? t('generate.optimizing')
            : templateId && !isCustomMode
              ? formatText('generate.optimizePromptWithTemplate', { template: visibleTemplates.find((t) => t.id === templateId)?.name ?? t('generate.templateFallback') })
              : t('generate.optimizePrompt')}
        </button>
        <button
          type="button"
          onClick={() => setShowMoreAssetSources((v) => !v)}
          className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          {t('generate.moreAssetSources')}
        </button>
        <button
          type="button"
          onClick={handleStartGenerate}
          disabled={!canStartGenerate}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {t('generate.startGeneration')}
        </button>
        {onBrowseTemplates && (
          <button
            type="button"
            onClick={onBrowseTemplates}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
          >
            <span>{t('generate.browseTemplateIdeas')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
      </section>

      <RunningStatus active={polishLoading} label={t('generate.runningPromptPolish')} stallAfterSec={15} scene="writers-room" />

      {polishNotice && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--color-success)]">{polishNotice}</p>
          <button
            type="button"
            onClick={() => setPolishNotice(null)}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {polishError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--color-error)]">{polishError}</p>
          <button
            type="button"
            onClick={() => setPolishError(null)}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* 关键词仅用于 一键匹配素材，不展示给用户；对话框中只显示优化后的创意描述 */}

      {showMoreAssetSources && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--color-text)] mb-1">{t('generate.moreAssetSources')}</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">{t('generate.moreAssetSourcesHint')}</p>

          {verifiedFolderId ? (
            isViralDanceTemplate ? (
              <>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  {formatText('generate.viralBindingHint', { folderName: verifiedFolderName ?? '' })}
                </p>
                <ViralDanceMaterialPicker
                  accessToken={accessToken}
                  verifiedFolderId={verifiedFolderId}
                  verifiedFolderName={verifiedFolderName}
                  listFolder={listFolder}
                  selectedOrder={selectedOrder}
                  setSelectedOrder={setSelectedOrder}
                  onLogin={() => login()}
                  onLoadCharacterLibrary={async () => {
                    const { characters } = await listCharacterLibrary();
                    return characters
                      .filter((c) => c.baseImageDataUrl)
                      .map((c) => ({
                        id: c.id,
                        name: c.name,
                        imageUrl: c.baseImageDataUrl || '',
                      }));
                  }}
                  onCharacterSelected={async (imageUrl: string) => {
                    try {
                      const resp = await fetch(imageUrl);
                      const blob = await resp.blob();
                      const base64 = await readBlobAsBase64(blob);
                      setDreaminaMultimodalItems((prev) => [
                        ...prev.filter((item) => item.id !== 'legacy-drive-character'),
                        {
                          id: 'legacy-drive-character',
                          kind: 'image',
                          base64,
                          mimeType: blob.type || 'image/jpeg',
                          fileName: 'character.jpg',
                        },
                      ]);
                    } catch {
                      // User can still use the unified reference slots above.
                    }
                  }}
                />
                {selectedOrder.length > 0 && (
                  <p className="mt-3 text-sm text-[var(--color-success)]">
                    {selectedOrder.length === 1 ? t('generate.viralBindingReadySingle') : t('generate.viralBindingReadyBoth')}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOneClickMatch}
                    disabled={matchLoading || loading}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {matchLoading || loading ? t('generate.matchingAssets') : t('generate.matchAssets')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDriveManualBrowse((v) => !v)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  >
                    {showDriveManualBrowse ? t('generate.hideManualDriveSelect') : t('generate.showManualDriveSelect')}
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  {formatText('generate.librarySelectionHint', { folderName: verifiedFolderName ?? '' })}
                </p>
                <DriveMaterialPicker
                  keywords={keywords}
                  accessToken={accessToken}
                  onLogin={() => login()}
                  files={files}
                  loading={loading}
                  error={error}
                  onSearch={(kw) => void search(kw, verifiedFolderId)}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  selectedOrder={selectedOrder}
                  onReorder={() => {}}
                  folderId={verifiedFolderId}
                />
                {showDriveManualBrowse && verifiedFolderId && verifiedFolderName && (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">{t('generate.driveExplorerHint')}</p>
                    <DriveExplorer
                      rootFolderId={verifiedFolderId}
                      rootFolderName={verifiedFolderName}
                      accessToken={accessToken}
                      onLogin={() => login()}
                      selectable
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleFromExplorer}
                    />
                  </div>
                )}
                {selectedOrder.length > 0 && (
                  <p className="mt-3 text-sm text-[var(--color-success)]">
                    {formatText('generate.selectedAssetCount', { count: selectedOrder.length })}
                  </p>
                )}
              </>
            )
          ) : (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-sm text-[var(--color-text-muted)] mb-2">{t('generate.configureDriveHint')}</p>
              <Link
                to="/materials"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                {t('generate.goConfigureMaterials')}
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 开始生成后内联展示：生成视频 */}
      {showGenerationFlow && (
        <section>
          <StepVideo />
        </section>
      )}

      {saveModalOpen && (
        <SaveAsTemplateModal
          prompt={prompt}
          defaultDuration={videoDuration}
          defaultAspectRatio={videoAspectRatio}
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => {
            setSaveModalOpen(false);
            onBrowseTemplates?.();
          }}
        />
      )}
    </div>
  );
}
