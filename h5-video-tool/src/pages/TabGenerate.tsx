import { useCallback, useState, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import {
  polishPrompt,
  getTemplates,
  getShortDramaPresets,
  expandShortDramaFromIdea,
  type PromptTemplate,
  type ShortDramaPreset,
  type ShortDramaExpandResult,
} from '../api/promptPolish';
import { getVeoModels } from '../api/video';
import { useGoogleDrive, type DriveFile } from '../hooks/useGoogleDrive';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { DriveMaterialPicker } from '../components/DriveMaterialPicker';
import { DriveExplorer } from '../components/DriveExplorer';
import { ViralDanceMaterialPicker } from '../components/ViralDanceMaterialPicker';
import { ShortDramaMaterialPicker } from '../components/ShortDramaMaterialPicker';
import { MultiShotPromptInput } from '../components/MultiShotPromptInput';
import { StepVideo } from '../components/StepVideo';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';

function formatDramaOutlineForPrompt(r: ShortDramaExpandResult): string {
  const { summary, scriptContent } = r;
  return [
    '【剧本摘要】',
    `主角：${summary.protagonist}`,
    `故事类型：${summary.storyGenre}`,
    `故事梗概：${summary.synopsis}`,
    `故事背景：${summary.background}`,
    `故事设定：${summary.setting}`,
    `一句话故事：${summary.oneLineStory}`,
    '',
    '【剧本正文】',
    scriptContent,
  ].join('\n');
}

const VIDEO_MODEL_LABELS: Record<string, string> = {
  'dreamina-multimodal': '即梦 · 全能参考 (Seedance 2.0 Fast)',
  'dreamina-text2video': '即梦 · 文生视频',
  'dreamina-image2video': '即梦 · 图生视频',
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Prompt 风格选项，id 需与后端 STYLE_HINTS 对应；后续可改为从 API 或配置加载 */
const PROMPT_STYLES = [
  { id: 'viral', label: '社群Viral风' },
  { id: 'formal', label: '正式宣传风' },
  { id: 'story', label: '剧情叙事风' },
] as const;

interface TabGenerateProps {
  onBrowseTemplates?: () => void;
  /** 返回功能选择（重新选择模板） */
  onBackToPicker?: () => void;
}

export function TabGenerate({ onBrowseTemplates, onBackToPicker }: TabGenerateProps = {}) {
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
    characters,
    setCharacters,
    viralDanceReferenceVideoUrl,
    setViralDanceReferenceVideoUrl,
    setDreaminaMultimodalItems,
  } = useCreateFlow();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [shortDramaPresets, setShortDramaPresets] = useState<ShortDramaPreset[]>([]);
  const [shortDramaPresetId, setShortDramaPresetId] = useState<string>('custom');
  const currentTemplate = templates.find((t) => t.id === templateId);
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
  const [veoModels, setVeoModels] = useState<string[]>(['veo-2.0-generate-001']);

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
  const [dramaExpandLoading, setDramaExpandLoading] = useState(false);
  const [dramaExpandError, setDramaExpandError] = useState<string | null>(null);
  const [dramaExpanded, setDramaExpanded] = useState<ShortDramaExpandResult | null>(null);
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
    getVeoModels()
      .then((r) => setVeoModels(r.models))
      .catch(() => {});
  }, []);

  /** 切换离「全能参考」时清空已选素材，避免误带大 payload */
  useEffect(() => {
    if (videoModel !== 'dreamina-multimodal') {
      setDreaminaMultimodalItems([]);
    }
  }, [videoModel, setDreaminaMultimodalItems]);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    getShortDramaPresets().then(setShortDramaPresets).catch(() => {});
  }, []);

  /** 短剧：templateId 与 presetId 同步（cat-harem ↔ preset cat-harem） */
  useEffect(() => {
    if (templateId === 'cat-harem' && shortDramaPresetId !== 'cat-harem') setShortDramaPresetId('cat-harem');
    if (templateId === 'short-drama' && shortDramaPresetId === 'cat-harem') setShortDramaPresetId('custom');
  }, [templateId]);

  /** 离开人类短剧模板时清空剧本摘要展开状态 */
  useEffect(() => {
    if (templateId !== 'short-drama') {
      setDramaExpanded(null);
      setDramaExpandError(null);
    }
  }, [templateId]);

  /** 离开 Viral 舞蹈模板时清空参考视频链接 */
  useEffect(() => {
    if (templateId !== 'viral-dance') {
      setViralDanceReferenceVideoUrl('');
    }
  }, [templateId, setViralDanceReferenceVideoUrl]);

  const handleOneClickPrompt = useCallback(
    async (styleId?: string) => {
      const catHaremPreset = shortDramaPresets.find((p) => p.id === 'cat-harem');
      let effectivePrompt =
        templateId === 'cat-harem' && !prompt.trim() && catHaremPreset ? catHaremPreset.defaultPrompt : prompt;
      if (templateId === 'viral-dance' && viralDanceReferenceVideoUrl.trim()) {
        effectivePrompt = `【用户将提供的参考视频直链（动作来源，与 API video_list 对应）】\n${viralDanceReferenceVideoUrl.trim()}\n\n${effectivePrompt}`;
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
        const { polishedPrompt, searchKeywords, folderHints: hints, template, shots: polishedShots, characters: extractedChars } = await polishPrompt(effectivePrompt, opts);
        setKeywords(searchKeywords);
        setFolderHints(hints || []);
        setHasPolishedPrompt(true);
        if (extractedChars?.length) {
          setCharacters(extractedChars);
          setSelectedOrder([]);
        }
        if (template) {
          setVideoDuration(template.duration);
          setVideoAspectRatio(template.aspectRatio);
        }
        if (polishedShots?.length && template?.pipelineMode === 'multishot') {
          setMultiShotEnabled(true);
          setShots(polishedShots);
          setPrompt(polishedPrompt);
        } else {
          setPrompt(polishedPrompt);
        }
      } catch (e) {
        setPolishError(e instanceof Error ? e.message : '优化失败');
      } finally {
        setPolishLoading(false);
      }
    },
    [
      prompt,
      templateId,
      shortDramaPresets,
      multiShotEnabled,
      videoDuration,
      videoAspectRatio,
      viralDanceReferenceVideoUrl,
      setPrompt,
      setKeywords,
      setFolderHints,
      setHasPolishedPrompt,
      setVideoDuration,
      setVideoAspectRatio,
      setMultiShotEnabled,
      setShots,
      setCharacters,
      setSelectedOrder,
    ]
  );

  const handleShortDramaPresetChange = useCallback(
    (presetId: string) => {
      const preset = shortDramaPresets.find((p) => p.id === presetId);
      if (!preset) return;
      setShortDramaPresetId(presetId);
      setTemplateId(preset.templateId);
      setPrompt(preset.defaultPrompt);
      setCharacters([]);
      setSelectedOrder([]);
      const t = templates.find((x) => x.id === preset.templateId);
      if (t) {
        setVideoDuration(t.duration);
        setVideoAspectRatio(t.aspectRatio);
      }
    },
    [shortDramaPresets, setTemplateId, setPrompt, setVideoDuration, setVideoAspectRatio, setCharacters, setSelectedOrder, templates]
  );

  const isCatHaremTemplate = templateId === 'cat-harem';
  const isShortDramaTemplate = templateId === 'short-drama';
  const isShortDramaFlow = isShortDramaTemplate || isCatHaremTemplate;
  /** 人类短剧（非猫猫后宫）：支持「模糊创意 → 剧本摘要 + 正文」 */
  const isHumanShortDrama = isShortDramaTemplate && !isCatHaremTemplate;
  const isCustomMode = templateId === 'custom';
  const isViralDanceTemplate = templateId === 'viral-dance';

  const handleExpandShortDrama = useCallback(async () => {
    if (!prompt.trim()) {
      setDramaExpandError('请先输入一句或一段短剧创意');
      return;
    }
    setDramaExpandLoading(true);
    setDramaExpandError(null);
    try {
      const result = await expandShortDramaFromIdea(prompt.trim());
      setDramaExpanded(result);
      setPrompt(formatDramaOutlineForPrompt(result));
      setHasPolishedPrompt(false);
    } catch (e) {
      setDramaExpandError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setDramaExpandLoading(false);
    }
  }, [prompt, setPrompt, setHasPolishedPrompt]);

  const handleOneClickMatch = useCallback(async () => {
    if (!verifiedFolderId || !accessToken) return;
    if (keywords.length === 0) {
      setPolishError('请先点击「一键Prompt」优化创意并提取关键词');
      return;
    }
    setMatchLoading(true);
    setPolishError(null);
    try {
      const matched = await search(keywords, verifiedFolderId, folderHints.length > 0 ? folderHints : undefined);
      setHasMatchedMaterials(matched.length > 0);
      if (matched.length === 0) {
        setPolishError('未匹配到素材。可点击「手动从 Drive 选择」在文件夹中勾选，或调整创意后重新一键 Prompt 再匹配。');
      }
    } catch {
      setPolishError('素材搜索失败');
      setHasMatchedMaterials(false);
    } finally {
      setMatchLoading(false);
    }
  }, [verifiedFolderId, accessToken, keywords, folderHints, search, setHasMatchedMaterials]);

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

  const maxDuration = currentTemplate?.duration ?? videoDuration;
  const totalShotsDuration = shots.reduce((s, shot) => s + shot.duration, 0);
  const shotsValid = shots.length >= 1 && shots.every((shot) => shot.prompt.trim().length > 0) && totalShotsDuration <= maxDuration;

  // 单镜：有 prompt 即可；多镜：shots 有效
  const hasValidPrompt = multiShotEnabled
    ? shotsValid
    : hasPolishedPrompt || prompt.trim().length > 0;
  const shortDramaCharsFilled =
    !isShortDramaFlow ||
    (characters.length > 0 &&
      selectedOrder.length >= characters.length &&
      selectedOrder.slice(0, characters.length).every((f) => f && !f.id.startsWith('empty-')));
  const materialOk = isShortDramaFlow
    ? shortDramaCharsFilled
    : !hasMatchedMaterials || selectedOrder.length >= 1;
  const canStartGenerate = hasValidPrompt && materialOk;

  return (
    <div className="max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">
          开启你的 视频生成 即刻造梦!
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpertMode((v) => !v)}
            title={expertMode ? '切换为简洁模式（隐藏高级选项）' : '切换为专家模式（显示全部选项）'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              expertMode
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M12 2v2M12 20v2M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2"/></svg>
            {expertMode ? '⚡ 专家模式' : '简洁模式'}
          </button>
          {templateId && onBackToPicker && (
            <button
              type="button"
              onClick={onBackToPicker}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              重新选择功能
            </button>
          )}
        </div>
      </div>

      {/* 输入区 */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-sm font-medium text-[var(--color-text)]">视频创意描述</span>
          {expertMode && (isMultishotTemplate || isCustomMode) && (
            <>
              <span className="text-xs text-[var(--color-text-muted)]">
                当前分镜时长总和: <span className={totalShotsDuration > maxDuration ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}>{totalShotsDuration}秒</span> / {maxDuration}秒
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-[var(--color-text-muted)]">多镜头描述</span>
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
              保存为模板
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
        ) : isShortDramaFlow ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              {isCatHaremTemplate ? (
                <>点击「一键Prompt」→ 系统识别人物 → 为每个角色选择 1 张图片（必填）→ 可选参考场景 → 开始生成。可选：修改下方剧本自定义剧情。</>
              ) : (
                <>
                  可先输入<strong className="text-[var(--color-text)]">模糊创意</strong>，点「生成剧本摘要与正文」得到结构化摘要与剧本文案；再点「一键Prompt」生成分镜。或直接写长剧本后一键 Prompt。
                </>
              )}
            </p>
            {isHumanShortDrama && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleExpandShortDrama()}
                  disabled={dramaExpandLoading || !prompt.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {dramaExpandLoading ? '生成中…' : '生成剧本摘要与正文'}
                </button>
                {dramaExpanded && (
                  <span className="text-xs text-[var(--color-success)]">已生成，下方可继续编辑后点「一键Prompt」</span>
                )}
              </div>
            )}
            {dramaExpandError && (
              <p className="text-sm text-[var(--color-error)]">{dramaExpandError}</p>
            )}
            {dramaExpanded && isHumanShortDrama && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-left space-y-3 max-h-[min(70vh,480px)] overflow-y-auto">
                <p className="text-sm font-semibold text-[var(--color-text)] border-b border-[var(--color-border)] pb-2">
                  剧本摘要
                </p>
                <dl className="space-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">主角</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed">{dramaExpanded.summary.protagonist}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">故事类型</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed">{dramaExpanded.summary.storyGenre}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">故事梗概</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{dramaExpanded.summary.synopsis}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">故事背景</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{dramaExpanded.summary.background}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">故事设定</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{dramaExpanded.summary.setting}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">一句话故事</dt>
                    <dd className="text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{dramaExpanded.summary.oneLineStory}</dd>
                  </div>
                </dl>
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">剧本正文（已合并至下方编辑区）</p>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {dramaExpanded.scriptContent}
                  </p>
                </div>
              </div>
            )}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={isHumanShortDrama ? 14 : 5}
              placeholder={isCatHaremTemplate ? '预设《橘座的三选一》剧本已填入。可从素材库选 4 张猫咪图（橘猫/白猫/布偶/黑猫），或修改此处自定义剧情。' : '例：一句模糊创意——「订婚宴上被妹妹和未婚夫联手背叛的养女」；或先生成摘要与正文后再编辑。'}
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none font-mono text-sm"
            />
          </div>
        ) : (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={7}
              placeholder={
                isViralDanceTemplate
                  ? '参考使用【TikTok视频】中舞者的动作，让【图片1】中的角色在【图片2】中的场景中动起来。可补充光线、镜头与画风。'
                  : '在此输入 prompt，支持 @图片1 引用。点击「一键Prompt」优化（含分镜格式）→ 匹配素材 → 开始生成'
              }
              className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
            />
            {expertMode && isViralDanceTemplate && (
              <div className="mt-3 space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <label className="block text-xs font-medium text-[var(--color-text)]">
                  TikTok / 参考视频直链（可灵 Omni · <span className="font-mono text-[10px]">video_list</span>）
                </label>
                <input
                  type="url"
                  value={viralDanceReferenceVideoUrl}
                  onChange={(e) => setViralDanceReferenceVideoUrl(e.target.value)}
                  placeholder="粘贴 TikTok 分享链接，或公网 MP4 直链"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none"
                />
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed rounded-md bg-[var(--color-primary)]/8 px-2 py-1.5 border border-[var(--color-primary)]/25">
                  <strong className="text-[var(--color-text)]">说明：</strong>
                  可直接粘贴浏览器里的 <strong className="text-[var(--color-text)]">TikTok 视频链接</strong>
                  ，服务端会用 <code className="text-[10px]">yt-dlp</code> 解析为可下载地址后再提交可灵（首次解析可能需数十秒）。
                  若已自有 MP4 直链也可直接粘贴；无法解析时请检查服务器是否安装 yt-dlp 或配置 YT_DLP_PROXY。
                </p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  素材顺序：<span className="text-[var(--color-text)] font-medium">第 1 张</span> = 角色，
                  <span className="text-[var(--color-text)] font-medium">第 2 张</span> = 场景；只选 1 张图时请在创意里用文字写清另一项。
                  模型选可灵 Omni 且后端为 ingarena 时，提交生成会附带该链接。
                </p>
              </div>
            )}
          </>
        )}
        {/* 写稿要点：短剧模式显示 drama-creator 方法论，否则显示 Veo 通用要点 */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setTipsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${tipsExpanded ? 'rotate-180' : ''}`} />
            {isShortDramaTemplate || isCatHaremTemplate
              ? isCatHaremTemplate
                ? '猫猫后宫写稿要点'
                : '短剧写稿要点（drama-creator）'
              : isViralDanceTemplate
                ? 'Viral 舞蹈（可灵 Omni）要点'
                : 'Veo 写稿要点'}
          </button>
          {tipsExpanded && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2">
              {isShortDramaTemplate ? (
                <>
                  <p><strong className="text-[var(--color-text)]">情绪弹簧：</strong>每镜要么「压弹簧」（误会、压制、反派嚣张）要么「放弹簧」（打脸、反转、身份揭晓）；无中间状态。</p>
                  <p><strong className="text-[var(--color-text)]">钩子-反转-再钩子：</strong>首镜5秒内建立冲突；中段30-45秒小反转；末镜留悬念或未完成的打脸。</p>
                  <p><strong className="text-[var(--color-text)]">信息前置：</strong>台词直白，第一时间抛出身份、冲突、目标；消灭绕弯子对话。</p>
                  <p><strong className="text-[var(--color-text)]">动作可视化：</strong>用动词和短句，避免形容词堆砌；预设竖屏特写与快剪镜头。</p>
                  <p><strong className="text-[var(--color-text)]">格式：</strong>每镜 5-8 秒；景别（特写/中景/全景）+ 运镜（推/拉/跟）；风格自然、生活化。</p>
                </>
              ) : isCatHaremTemplate ? (
                <>
                  <p><strong className="text-[var(--color-text)]">主角映射：</strong>系统识别 4 个角色（橘猫男主/白猫/布偶/黑猫），为每个角色选择 1 张对应图片（必填）。</p>
                  <p><strong className="text-[var(--color-text)]">预设剧本：</strong>《橘座的三选一》6镜30秒，争宠吃醋→橘座选中布偶打脸。可修改创意自定义剧情。</p>
                  <p><strong className="text-[var(--color-text)]">风格：</strong>宠物拟人、温馨搞笑、竖屏特写；适合全年龄段。</p>
                </>
              ) : isViralDanceTemplate ? (
                <>
                  <p><strong className="text-[var(--color-text)]">占位符：</strong>成品 prompt 应体现「【TikTok视频】」中的动作来源，以及「【图片1】」角色与「【图片2】」场景的对应关系（与 Omni 多模态引用一致）。</p>
                  <p><strong className="text-[var(--color-text)]">参考视频：</strong>可粘贴 TikTok 分享链接，由服务端解析；亦可直接填公网 MP4 直链。</p>
                  <p><strong className="text-[var(--color-text)]">素材顺序：</strong>Drive 勾选顺序 = @图片1、@图片2；单图时在正文里写明缺失的角色或场景。</p>
                  <p><strong className="text-[var(--color-text)]">合规：</strong>不写具体艺人名或曲名；前 3 秒抓眼、竖屏 9:16 友好。</p>
                </>
              ) : (
                <>
                  <p><strong className="text-[var(--color-text)]">结构：</strong>主体 + 动作 + 场景 + 镜头 + 光线 + 风格。主体要具体（如「经验丰富的侦探」而非「男人」）。</p>
                  <p><strong className="text-[var(--color-text)]">技巧：</strong>一次只讲一个场景；人物描述要细（年龄、发型、特征）；对话用冒号不用引号。</p>
                  <p><strong className="text-[var(--color-text)]">镜头：</strong>特写、中景、俯拍、跟拍、航拍、慢速变焦等。</p>
                  <p><strong className="text-[var(--color-text)]">风格：</strong>Cinematic 8K、35mm 胶片、日式动漫、逆光、黄金时刻等。</p>
                  <p><strong className="text-[var(--color-text)]">参考图：</strong>最多 3 张，多角度清晰，有助于保持人物一致。</p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Pipeline 模板选择 / 短剧剧情预设 / 自定义模式说明 */}
      {templates.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          {isCustomMode ? (
            <div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">自定义模式</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                无预设，自由发挥。点击「一键Prompt」时，优化逻辑仅使用导演知识（VEO 通用规则、景别运镜等），不依赖任何模板。
              </p>
            </div>
          ) : isShortDramaFlow ? (
            <>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">短剧 · 剧情预设</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                选择预设剧情或自定义，一键 Prompt 将按 drama-creator 方法论生成分镜
              </p>
              <div className="flex flex-wrap gap-2">
                {shortDramaPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleShortDramaPresetChange(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shortDramaPresetId === p.id
                        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/50'
                        : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {p.nameZh}
                    <span className="ml-1 text-xs opacity-80">— {p.description}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {videoDuration}秒 · {videoAspectRatio} · 人物图必填，参考场景可选
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">Pipeline 模板</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                选择生成模式后，一键 Prompt 将按模板产出不同风格的视频（单镜 Viral 或 多镜 CG）
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTemplateId(id);
                      const t = templates.find((x) => x.id === id);
                      if (t) {
                        setVideoDuration(t.duration);
                        setVideoAspectRatio(t.aspectRatio);
                      }
                    }}
                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none min-w-[180px]"
                  >
                    <option value="">默认（按风格优化）</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.description}
                      </option>
                    ))}
                  </select>
                </label>
                {templateId && (
                  <span className="text-xs text-[var(--color-text-muted)] self-center">
                    {videoDuration}秒 · {videoAspectRatio}
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
          <span>模型:</span>
          <select
            value={videoModel}
            onChange={(e) => setVideoModel(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            {veoModels.map((m) => (
              <option key={m} value={m}>
                {VIDEO_MODEL_LABELS[m] ?? m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>比例:</span>
          <select
            value={videoAspectRatio}
            onChange={(e) => setVideoAspectRatio(e.target.value)}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            <option value="16:9">16:9 横屏</option>
            <option value="9:16">9:16 竖屏</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>时长:</span>
          <select
            value={videoDuration}
            onChange={(e) => setVideoDuration(Number(e.target.value))}
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
          >
            {[4, 5, 6, 7, 8, 10, 15, 30, 60].map((s) => (
              <option key={s} value={s}>
                {s}秒
              </option>
            ))}
          </select>
        </label>
        {expertMode && (
          <label className="flex items-center gap-2">
            <span>分辨率:</span>
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
            {polishLoading ? '优化中…' : `一键Prompt（${templates.find((t) => t.id === templateId)?.name ?? '模板'}）`}
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={polishLoading || !prompt.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {polishLoading ? '优化中…' : '一键Prompt'}
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
                    默认（仅导演知识）
                  </button>
                )}
                {PROMPT_STYLES.map((s) => (
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
        {!isShortDramaFlow && !isViralDanceTemplate && (
          <>
            <button
              type="button"
              onClick={handleOneClickMatch}
              disabled={matchLoading || loading}
              className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {matchLoading || loading ? '匹配中…' : '一键匹配素材'}
            </button>
            {verifiedFolderId && (
              <button
                type="button"
                onClick={() => setShowDriveManualBrowse((v) => !v)}
                className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {showDriveManualBrowse ? '收起手动选择' : '手动从 Drive 选择'}
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={handleStartGenerate}
          disabled={!canStartGenerate}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          开始生成
        </button>
        {onBrowseTemplates && (
          <button
            type="button"
            onClick={onBrowseTemplates}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
          >
            <span>去模板里面找找 idea</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
      </section>

      {polishError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--color-error)]">{polishError}</p>
          <button
            type="button"
            onClick={() => setPolishError(null)}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* 关键词仅用于 一键匹配素材，不展示给用户；对话框中只显示优化后的创意描述 */}

      {/* 结果区：素材选择 */}
      {verifiedFolderId && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">
            {isShortDramaFlow ? '人物与场景素材' : isViralDanceTemplate ? 'Viral 舞蹈 · 素材绑定（@图片1 / @图片2）' : '从素材库选择'}
          </p>
          {isShortDramaFlow ? (
            characters.length > 0 ? (
              <ShortDramaMaterialPicker
                characters={characters}
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                accessToken={accessToken}
                verifiedFolderId={verifiedFolderId ?? undefined}
                verifiedFolderName={verifiedFolderName ?? undefined}
                files={files}
                filesLoading={loading}
                onBrowseFiles={() => search([], verifiedFolderId ?? undefined)}
                onLogin={() => login()}
              />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                请先点击「一键Prompt」生成分镜，系统将自动识别人物数量
              </p>
            )
          ) : isViralDanceTemplate ? (
            <>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                在下方进入「{verifiedFolderName}」下的<strong className="text-[var(--color-text)]">任意子文件夹</strong>
                ，先点「从下方选择」绑定 <strong className="text-[var(--color-text)]">@图片1</strong>（角色），再绑定{' '}
                <strong className="text-[var(--color-text)]">@图片2</strong>（场景，可选）。无需使用「一键匹配素材」。
              </p>
              <ViralDanceMaterialPicker
                accessToken={accessToken}
                verifiedFolderId={verifiedFolderId}
                verifiedFolderName={verifiedFolderName}
                listFolder={listFolder}
                selectedOrder={selectedOrder}
                setSelectedOrder={setSelectedOrder}
                onLogin={() => login()}
              />
              {selectedOrder.length > 0 && (
                <p className="mt-3 text-sm text-[var(--color-success)]">
                  已绑定：{selectedOrder.length === 1 ? '@图片1 已选' : '@图片1 + @图片2 已选'}，与上方 prompt 中【图片1】【图片2】一致。
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                从「{verifiedFolderName}」中检索并勾选；或点击上方「手动从 Drive
                选择」在子文件夹中浏览。无需依赖「一键匹配」即可勾选素材。
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
                    浏览文件夹树，点击图片/视频即可加入已选（再点一次取消）。顺序对应 @图片1、@图片2…
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
                  已选 {selectedOrder.length} 个素材，顺序映射 @图片1、@图片2…
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
            点击「一键匹配素材」前，请先在「素材管理」中设置 Drive 文件夹
          </p>
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
          >
            去素材管理设置
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
    </div>
  );
}
