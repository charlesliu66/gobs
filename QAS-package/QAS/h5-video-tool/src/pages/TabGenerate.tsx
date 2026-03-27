import { useCallback, useState, useRef, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { polishPrompt, getTemplates, type PromptTemplate } from '../api/promptPolish';
import { getVeoModels } from '../api/video';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { DriveMaterialPicker } from '../components/DriveMaterialPicker';
import { MultiShotPromptInput } from '../components/MultiShotPromptInput';
import { StepVideo } from '../components/StepVideo';
import { SaveAsTemplateModal } from '../components/SaveAsTemplateModal';

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
    multiShotEnabled,
    setMultiShotEnabled,
  } = useCreateFlow();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
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

  const { files, loading, error, search } = useGoogleDrive(accessToken);
  const selectedIds = new Set(selectedOrder.map((f) => f.id));

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
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
    getVeoModels().then(setVeoModels).catch(() => {});
  }, []);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleOneClickPrompt = useCallback(
    async (styleId?: string) => {
      if (!prompt.trim()) return;
      setDropdownOpen(false);
      setPolishLoading(true);
      setPolishError(null);
      try {
        const opts = templateId ? { templateId } : (styleId ? { styleId } : undefined);
        const { polishedPrompt, searchKeywords, folderHints: hints, template, shots: polishedShots } = await polishPrompt(prompt, opts);
        setKeywords(searchKeywords);
        setFolderHints(hints || []);
        setHasPolishedPrompt(true);
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
    [prompt, templateId, setPrompt, setKeywords, setFolderHints, setHasPolishedPrompt, setVideoDuration, setVideoAspectRatio, setMultiShotEnabled, setShots]
  );

  const handleOneClickMatch = useCallback(async () => {
    if (!verifiedFolderId || !accessToken) return;
    if (keywords.length === 0) {
      setPolishError('请先点击「一键Prompt」优化创意并提取关键词');
      return;
    }
    setMatchLoading(true);
    setPolishError(null);
    try {
      await search(keywords, verifiedFolderId, folderHints.length > 0 ? folderHints : undefined);
      setHasMatchedMaterials(true);
    } catch {
      setPolishError('素材搜索失败');
    } finally {
      setMatchLoading(false);
    }
  }, [verifiedFolderId, accessToken, keywords, folderHints, search, setHasMatchedMaterials]);

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
  const materialOk = !hasMatchedMaterials || selectedOrder.length >= 1;
  const canStartGenerate = hasValidPrompt && materialOk;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          开启你的 视频生成 即刻造梦!
        </h1>
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

      {/* 输入区 */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-sm font-medium text-[var(--color-text)]">视频创意描述</span>
          {isMultishotTemplate && (
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
        {multiShotEnabled && isMultishotTemplate ? (
          <MultiShotPromptInput
            shots={shots}
            setShots={setShots}
            maxTotalDuration={maxDuration}
            aspectRatio={videoAspectRatio}
          />
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            placeholder="在此输入 prompt，支持 @图片1 引用。点击「一键Prompt」优化（含分镜格式）→ 匹配素材 → 开始生成"
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
          />
        )}
        {/* Veo 写稿要点 */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setTipsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ChevronIcon className={`w-3.5 h-3.5 transition-transform ${tipsExpanded ? 'rotate-180' : ''}`} />
            Veo 写稿要点
          </button>
          {tipsExpanded && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2">
              <p><strong className="text-[var(--color-text)]">结构：</strong>主体 + 动作 + 场景 + 镜头 + 光线 + 风格。主体要具体（如「经验丰富的侦探」而非「男人」）。</p>
              <p><strong className="text-[var(--color-text)]">技巧：</strong>一次只讲一个场景；人物描述要细（年龄、发型、特征）；对话用冒号不用引号。</p>
              <p><strong className="text-[var(--color-text)]">镜头：</strong>特写、中景、俯拍、跟拍、航拍、慢速变焦等。</p>
              <p><strong className="text-[var(--color-text)]">风格：</strong>Cinematic 8K、35mm 胶片、日式动漫、逆光、黄金时刻等。</p>
              <p><strong className="text-[var(--color-text)]">参考图：</strong>最多 3 张，多角度清晰，有助于保持人物一致。</p>
            </div>
          )}
        </div>
      </section>

      {/* Pipeline 模板选择 */}
      {templates.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
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
          {templateId === 'short-drama' && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              短剧模板：传入剧情人物参考 → 自动生成短剧剧情与脚本 → 生成视频。人物参考输入与剧情生成功能后端开发中。
            </p>
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
                {m}
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
      </section>

      {/* 操作按钮 */}
      <section className="flex flex-wrap gap-3 items-center">
        {templateId ? (
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
        <button
          type="button"
          onClick={handleOneClickMatch}
          disabled={matchLoading || loading}
          className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {matchLoading || loading ? '匹配中…' : '一键匹配素材'}
        </button>
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
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">从素材库选择</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            从「{verifiedFolderName}」中检索，点击勾选素材
          </p>
          <DriveMaterialPicker
            keywords={keywords}
            accessToken={accessToken}
            onLogin={() => login()}
            files={files}
            loading={loading}
            error={error}
            onSearch={(kw) => search(kw, verifiedFolderId)}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            selectedOrder={selectedOrder}
            onReorder={() => {}}
            folderId={verifiedFolderId}
          />
          {selectedOrder.length > 0 && (
            <p className="mt-3 text-sm text-[var(--color-success)]">
              已选 {selectedOrder.length} 个素材，顺序映射 @图片1、@图片2…
            </p>
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
