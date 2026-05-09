import { useCallback, useState, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import {
  polishPrompt,
  getTemplates,
  type PromptTemplate,
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
import { AssetPicker } from '../components/AssetPicker';
import { UnifiedAssetSelector, type UnifiedAssetSlot } from '../components/UnifiedAssetSelector';
import { RunningStatus } from '../components/RunningStatus';
import { buildAssetFileUrl, recordUsage, type LibraryAsset } from '../api/assetLibraryApi';
import { useLocale } from '../i18n/LocaleContext.tsx';
import {
  filterVisibleStudioTemplates,
  getStudioTemplateAspectRatioOptions,
  getStudioTemplateDurationOptions,
  isValidStudioAspectRatio,
  isValidStudioDuration,
} from '../config/studioTemplateOptions';
import { PROMPT_INSPIRATIONS } from '../config/promptInspirations';
import {
  getStudioQualityPresetGroups,
  localizedPresetLabel,
  localizedPresetPrompt,
  type StudioPresetLocale,
} from '../config/studioQualityPresets';

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

/** Prompt 风格选项，id 需与后端 STYLE_HINTS 对应；后续可改为从 API 或配置加载 */
const LOCALIZED_PROMPT_STYLE_KEYS = [
  { id: 'viral', labelKey: 'generate.styleViral' },
  { id: 'formal', labelKey: 'generate.styleFormal' },
  { id: 'story', labelKey: 'generate.styleStory' },
] as const;

function assetFileUrl(asset: LibraryAsset): string {
  return asset.file_url || buildAssetFileUrl(asset.id);
}

function absoluteAssetUrl(asset: LibraryAsset): string {
  return new URL(assetFileUrl(asset), window.location.origin).toString();
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

function getUnifiedAssetSlots(templateId: string, locale: StudioPresetLocale): UnifiedAssetSlot[] {
  const isEn = locale === 'en';
  if (templateId === 'viral-dance') {
    return [
      {
        id: 'viral-character',
        title: isEn ? 'Character image' : '角色图',
        description: isEn ? 'Maps to @image1 for the moving subject.' : '对应 @图片1，作为动作迁移的主体角色。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character hero',
        required: true,
      },
      {
        id: 'viral-scene',
        title: isEn ? 'Optional scene' : '可选场景',
        description: isEn ? 'Maps to @image2 for the environment or mood.' : '对应 @图片2，可补充场景或氛围。',
        mediaType: 'image',
        semanticRole: 'scene',
        initialQuery: 'scene background',
      },
      {
        id: 'viral-motion',
        title: isEn ? 'Reference motion video' : '参考动作视频',
        description: isEn ? 'Sets the Motion Transfer reference video URL.' : '填入 Motion Transfer 的参考视频直链。',
        mediaType: 'video',
        initialQuery: 'motion dance gameplay',
      },
    ];
  }
  if (templateId === 'boss-showcase') {
    return [
      {
        id: 'showcase-character',
        title: isEn ? 'Hero or boss art' : '角色 / Boss 图',
        description: isEn ? 'Primary approved character reference.' : '主角色参考图，优先使用已授权素材。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character boss hero',
        required: true,
      },
      {
        id: 'showcase-scene',
        title: isEn ? 'Scene mood' : '场景氛围',
        description: isEn ? 'Key art, gameplay frame, or environment mood.' : '主视觉、玩法截图或环境氛围参考。',
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
        title: isEn ? 'Primary reference' : '主参考图',
        description: isEn ? 'Game character, key art, or product visual.' : '角色、主视觉或产品素材的主参考图。',
        mediaType: 'image',
        semanticRole: 'role',
        initialQuery: 'character key art',
      },
      {
        id: 'quick-scene-reference',
        title: isEn ? 'Scene or mood reference' : '场景 / 氛围参考',
        description: isEn ? 'Optional image for background, setting, or mood.' : '可选，用于补充背景、场景或画面情绪。',
        mediaType: 'image',
        semanticRole: 'scene',
        initialQuery: 'scene mood background',
      },
    ];
  }
  return [];
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
  const localizedPromptStyles = LOCALIZED_PROMPT_STYLE_KEYS.map((item) => ({
    id: item.id,
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
  const selectedIds = new Set(selectedOrder.map((f) => f.id));

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  /** TASK-D: 资产选择器状态 */
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerMode, setAssetPickerMode] = useState<'image' | 'video'>('image');
  const [unifiedSlotAssets, setUnifiedSlotAssets] = useState<Record<string, LibraryAsset | null>>({});
  const [unifiedAssetError, setUnifiedAssetError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  /** 模板切换时清理模板专属状态，避免旧素材或分镜误带到新模板。 */
  useEffect(() => {
    setShowGenerationFlow(false);
    setPolishError(null);
    setHasPolishedPrompt(false);
    setHasMatchedMaterials(false);
    setSelectedOrder([]);
    setShots([]);
    setShotFrames({});
    setMultiShotEnabled(false);
    setDreaminaMultimodalItems([]);
    setUnifiedSlotAssets({});
    setUnifiedAssetError(null);
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
  ]);

  /** Motion Transfer + 参考视频自动预填 prompt（越懒越好） */
  useEffect(() => {
    if (templateId === 'viral-dance' && viralDanceReferenceVideoUrl.trim() && !prompt.trim()) {
      setPrompt(
        contentLocale === 'en'
          ? 'The character in @图片1 follows the motion from @视频1 inside the optional scene from @图片2. Smooth rhythm, consistent character design, vertical 9:16, energetic.'
          : '角色（@图片1）在参考场景（@图片2，可选）中，跟随参考视频（@视频1）的动作节奏动起来，动作清晰，角色造型保持一致，竖屏 9:16',
      );
    }
  }, [contentLocale, prompt, setPrompt, templateId, viralDanceReferenceVideoUrl]);

  const handleOneClickPrompt = useCallback(
    async (styleId?: string) => {
      let effectivePrompt = prompt;
      if (templateId === 'viral-dance' && viralDanceReferenceVideoUrl.trim()) {
        const referenceVideoHeader =
          contentLocale === 'en'
            ? '[Reference video URL provided by the user. This is the motion source and maps to API video_list.]'
            : '【用户提供的参考视频直链（动作来源，与 API video_list 对应）】';
        effectivePrompt = `${referenceVideoHeader}\n${viralDanceReferenceVideoUrl.trim()}\n\n${effectivePrompt}`;
      }
      if (!effectivePrompt.trim()) return;
      setDropdownOpen(false);
      setPolishLoading(true);
      setPolishError(null);
      try {
        // 自定义模式：不传 templateId，仅用导演知识；多镜头时传 multishot 获取分镜
        let opts: { templateId?: string; styleId?: string; multishot?: boolean; duration?: number; aspectRatio?: string } | undefined;
        if (templateId === 'custom') {
          opts = styleId ? { styleId } : undefined;
          if (multiShotEnabled) {
            opts = { ...(opts ?? {}), multishot: true, duration: videoDuration, aspectRatio: videoAspectRatio };
          }
        } else if (templateId) {
          opts = { templateId };
        } else {
          opts = styleId ? { styleId } : undefined;
        }
        const { polishedPrompt, searchKeywords, folderHints: hints, template, shots: polishedShots } = await polishPrompt(effectivePrompt, opts);
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
        setPolishError(e instanceof Error ? e.message : t('generate.promptPolishFailedError'));
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

  /** TASK-D: 从资产库选中素材后处理 */
  const handleAssetPickerSelect = useCallback(
    async (assets: LibraryAsset[]) => {
      if (assets.length === 0) return;
      const asset = assets[0];
      const mime = asset.mimetype ?? asset.mime_type ?? '';
      const fileUrl = assetFileUrl(asset);
      // 记录素材使用，更新「最近使用」
      for (const a of assets) void recordUsage(a.id, 'generate');

      if (mime.startsWith('video/') || assetPickerMode === 'video') {
        // 视频参考：直接设置 URL（用于 viralDanceReferenceVideoUrl）
        setViralDanceReferenceVideoUrl(absoluteAssetUrl(asset));
      } else {
        // 图片参考：fetch → base64 → dreaminaMultimodalItems
        try {
          const resp = await fetch(fileUrl);
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] ?? dataUrl;
            const mimeType = blob.type || 'image/jpeg';
            setDreaminaMultimodalItems((prev) => {
              // 多选：追加；单选：替换第一个位置
              if (assets.length > 1) {
                const next = assets.map((a, i) => ({
                  id: `asset-${a.id}-${i}`,
                  kind: 'image' as const,
                  base64,
                  mimeType,
                  fileName: a.filename,
                }));
                return next;
              }
              const next = [...prev];
              next[0] = {
                id: `asset-${asset.id}`,
                kind: 'image' as const,
                base64,
                mimeType,
                fileName: asset.filename,
              };
              return next;
            });
          };
          reader.readAsDataURL(blob);
        } catch {
          // 静默失败
        }
      }
    },
    [assetPickerMode, setViralDanceReferenceVideoUrl, setDreaminaMultimodalItems],
  );

  const presetLocale: StudioPresetLocale = contentLocale === 'en' ? 'en' : 'zh';
  const unifiedAssetSlots = getUnifiedAssetSlots(templateId, presetLocale);
  const qualityPresetGroups = getStudioQualityPresetGroups(templateId, presetLocale);

  const handleAppendPresetPrompt = useCallback(
    (hint: string) => {
      setPrompt(prompt.trim() ? `${prompt.trim()}\n\n${hint}` : hint);
      setHasPolishedPrompt(false);
    },
    [prompt, setHasPolishedPrompt, setPrompt],
  );

  const handleUnifiedAssetSelect = useCallback(
    async (slot: UnifiedAssetSlot, asset: LibraryAsset | null) => {
      const itemId = `studio-slot-${slot.id}`;
      setUnifiedAssetError(null);
      setUnifiedSlotAssets((current) => ({ ...current, [slot.id]: asset }));

      if (!asset) {
        setDreaminaMultimodalItems((prev) => prev.filter((item) => item.id !== itemId));
        if (slot.mediaType === 'video') setViralDanceReferenceVideoUrl('');
        return;
      }

      if (slot.mediaType === 'video') {
        setViralDanceReferenceVideoUrl(absoluteAssetUrl(asset));
        void recordUsage(asset.id, `studio-unified-slot:${slot.id}`);
        return;
      }

      try {
        const resp = await fetch(assetFileUrl(asset));
        const blob = await resp.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('Selected asset is not an image');
        }
        const base64 = await readBlobAsBase64(blob);
        setDreaminaMultimodalItems((prev) => [
          ...prev.filter((item) => item.id !== itemId),
          {
            id: itemId,
            kind: 'image',
            base64,
            mimeType: blob.type || asset.mimetype || asset.mime_type || 'image/jpeg',
            fileName: asset.filename,
            semanticRole: slot.semanticRole,
          },
        ]);
        void recordUsage(asset.id, `studio-unified-slot:${slot.id}`);
      } catch {
        setUnifiedAssetError(
          contentLocale === 'en'
            ? 'Asset selected, but Studio could not load it as a reference. Try another file or use the legacy picker.'
            : '素材已选择，但 Studio 无法把它加载为参考图。可以换一个文件，或使用原有素材选择入口。',
        );
        setDreaminaMultimodalItems((prev) => prev.filter((item) => item.id !== itemId));
      }
    },
    [contentLocale, setDreaminaMultimodalItems, setViralDanceReferenceVideoUrl],
  );

  const maxDuration = currentTemplate?.duration ?? videoDuration;
  const totalShotsDuration = shots.reduce((s, shot) => s + shot.duration, 0);
  const shotsValid = shots.length >= 1 && shots.every((shot) => shot.prompt.trim().length > 0) && totalShotsDuration <= maxDuration;

  // 单镜：有 prompt 即可；多镜：shots 有效
  const hasValidPrompt = multiShotEnabled
    ? shotsValid
    : hasPolishedPrompt || prompt.trim().length > 0;
  const hasUnifiedReferenceImage = dreaminaMultimodalItems.some((item) => item.kind === 'image');
  const materialOk = isViralDanceTemplate
    ? selectedOrder.length >= 1 || hasUnifiedReferenceImage  // @图片1 必填；Asset Library refs can satisfy Dreamina flow
    : !hasMatchedMaterials || selectedOrder.length >= 1;
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
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={7}
              placeholder={
                isViralDanceTemplate
                  ? t('generate.viralPromptPlaceholder')
                  : t('generate.promptPlaceholder')
              }
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
            />
            {isCustomMode && (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)]">{t('generate.quickInspirationTitle')}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{t('generate.quickInspirationDesc')}</p>
                </div>
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
              </div>
            )}
            {isViralDanceTemplate && (
              <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-4 space-y-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎵</span>
                  <span className="text-sm font-semibold text-[var(--color-text)]">{t('generate.tiktokReferenceVideo')}</span>
                  <span className="ml-auto text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5">@视频1</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={viralDanceReferenceVideoUrl}
                    onChange={(e) => setViralDanceReferenceVideoUrl(e.target.value)}
                    placeholder={t('generate.tiktokUrlPlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                  {viralDanceReferenceVideoUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setViralDanceReferenceVideoUrl('')}
                      className="px-2 py-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {t('generate.tiktokReferenceHint')}
                </p>
              </div>
            )}
          </>
        )}
        {/* 写稿要点 */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setTipsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${tipsExpanded ? 'rotate-180' : ''}`} />
            {isViralDanceTemplate
              ? t('generate.viralDanceTipsTitle')
              : t('generate.veoTipsTitle')}
          </button>
          {tipsExpanded && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2">
              {isViralDanceTemplate ? (
                <>
                  <p><strong className="text-[var(--color-text)]">{t('generate.viralTipMotionLabel')}:</strong> {t('generate.viralTipMotionBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.viralTipOrderLabel')}:</strong> {t('generate.viralTipOrderBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.viralTipPromptLabel')}:</strong> {t('generate.viralTipPromptBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.viralTipLinkLabel')}:</strong> {t('generate.viralTipLinkBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.viralTipComplianceLabel')}:</strong> {t('generate.viralTipComplianceBody')}</p>
                </>
              ) : (
                <>
                  <p><strong className="text-[var(--color-text)]">{t('generate.veoTipStructureLabel')}:</strong> {t('generate.veoTipStructureBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.veoTipTechniqueLabel')}:</strong> {t('generate.veoTipTechniqueBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.veoTipCameraLabel')}:</strong> {t('generate.veoTipCameraBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.veoTipStyleLabel')}:</strong> {t('generate.veoTipStyleBody')}</p>
                  <p><strong className="text-[var(--color-text)]">{t('generate.veoTipReferenceLabel')}:</strong> {t('generate.veoTipReferenceBody')}</p>
                </>
              )}
            </div>
          )}
        </div>

        {qualityPresetGroups.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3" data-section="studioQualityPresets">
            <div>
              <p className="text-xs font-semibold text-[var(--color-text)]">
                {contentLocale === 'en' ? 'Quality presets' : '质量预设'}
              </p>
              <p className="text-[11px] leading-5 text-[var(--color-text-muted)]">
                {contentLocale === 'en'
                  ? 'Append production-ready direction without changing provider settings.'
                  : '把制片方向追加到 prompt，不改底层生成参数。'}
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {qualityPresetGroups.map((group) => (
                <div key={group.id} className="space-y-1.5" data-preset-group={group.id}>
                  <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleAppendPresetPrompt(localizedPresetPrompt(preset, presetLocale))}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-left text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]"
                      >
                        {localizedPresetLabel(preset, presetLocale)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {unifiedAssetSlots.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4" data-section="unifiedAssetSelector">
          <div className="mb-3">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {contentLocale === 'en' ? 'Studio source assets' : 'Studio 源素材'}
            </p>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              {contentLocale === 'en'
                ? 'Use approved Asset Library files as structured Studio references. Legacy Drive selection remains available below.'
                : '直接把素材中台的已授权文件装配成 Studio 参考位；下方 Google Drive 旧流程仍保留。'}
            </p>
          </div>
          <UnifiedAssetSelector
            slots={unifiedAssetSlots}
            selectedAssets={unifiedSlotAssets}
            locale={presetLocale}
            onSelectAsset={(slot, asset) => void handleUnifiedAssetSelect(slot, asset)}
          />
          {unifiedAssetError ? (
            <p className="mt-3 text-sm text-[var(--color-error)]">{unifiedAssetError}</p>
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
            {expertMode && veoModels.map((m) => (
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
        {templateId && !isCustomMode ? (
          <button
            type="button"
            onClick={() => handleOneClickPrompt()}
            disabled={polishLoading || !prompt.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {polishLoading ? t('generate.optimizing') : formatText('generate.optimizePromptWithTemplate', { template: visibleTemplates.find((t) => t.id === templateId)?.name ?? t('generate.templateFallback') })}
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={polishLoading || !prompt.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {polishLoading ? t('generate.optimizing') : t('generate.optimizePrompt')}
              <ChevronIcon className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-1 py-1 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg z-10">
                {isCustomMode && (
                  <button
                    type="button"
                    onClick={() => handleOneClickPrompt()}
                    disabled={polishLoading || !prompt.trim()}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {t('generate.promptDefaultMode')}
                  </button>
                )}
                {localizedPromptStyles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleOneClickPrompt(s.id)}
                    disabled={polishLoading || !prompt.trim()}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!isViralDanceTemplate && (
          <>
            <button
              type="button"
              onClick={handleOneClickMatch}
              disabled={matchLoading || loading}
              className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {matchLoading || loading ? t('generate.matchingAssets') : t('generate.matchAssets')}
            </button>
            {verifiedFolderId && (
              <button
                type="button"
                onClick={() => setShowDriveManualBrowse((v) => !v)}
                className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {showDriveManualBrowse ? t('generate.hideManualDriveSelect') : t('generate.showManualDriveSelect')}
              </button>
            )}
            {/* TASK-D: 从资产库选参考图 */}
            <button
              type="button"
              onClick={() => { setAssetPickerMode('image'); setAssetPickerOpen(true); }}
              className="px-5 py-2.5 border border-[var(--color-primary)]/50 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
            >
              {t('generate.chooseReferenceFromLibrary')}
            </button>
          </>
        )}
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

      {/* 结果区：素材选择 */}
      {verifiedFolderId && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">
            {isViralDanceTemplate ? t('generate.viralAssetsTitle') : t('generate.libraryAssetsTitle')}
          </p>
          {isViralDanceTemplate ? (
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
                    // fetch → base64 → 设为 dreaminaMultimodalItems[0]（@图片1）
                    const resp = await fetch(imageUrl);
                    const blob = await resp.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const dataUrl = reader.result as string;
                      // data:image/jpeg;base64,XXXX → 去掉前缀
                      const base64 = dataUrl.split(',')[1] ?? dataUrl;
                      const mimeType = blob.type || 'image/jpeg';
                      setDreaminaMultimodalItems((prev) => {
                        const next = [...prev];
                        next[0] = {
                          id: `lib-char-${Date.now()}`,
                          kind: 'image',
                          base64,
                          mimeType,
                          fileName: 'character.jpg',
                        };
                        return next;
                      });
                    };
                    reader.readAsDataURL(blob);
                  } catch {
                    // 静默失败，用户可手动选图
                  }
                }}
              />
              {selectedOrder.length > 0 ? (
                <p className="mt-3 text-sm text-[var(--color-success)]">
                  {selectedOrder.length === 1 ? t('generate.viralBindingReadySingle') : t('generate.viralBindingReadyBoth')}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-error)]">
                  ⚠️ {t('generate.viralBindingMissingCharacter')}
                </p>
              )}
            </>
          ) : (
            <>
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
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    {t('generate.driveExplorerHint')}
                  </p>
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
          )}
        </section>
      )}

      {/* 未设置素材库时的引导（含去设置链接） */}
      {!verifiedFolderId && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-2">
            {t('generate.configureDriveHint')}
          </p>
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
          >
            {t('generate.goConfigureMaterials')}
          </Link>
        </div>
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

      {/* TASK-D: 资产库选择器弹窗 */}
      {assetPickerOpen && (
        <AssetPicker
          filterType={assetPickerMode}
          onSelect={(assets) => void handleAssetPickerSelect(assets)}
          onClose={() => setAssetPickerOpen(false)}
        />
      )}
    </div>
  );
}
