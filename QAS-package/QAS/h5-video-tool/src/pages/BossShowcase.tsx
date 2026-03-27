/**
 * BOSS 展示：创作下的子功能
 * 创意描述 → 一键 Prompt / 选预设 → 分镜编辑 → 选素材 → 生成
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { BOSS_PRESETS, createLocalBossStoryboard, personalizePresetShots } from '../config/boss-promo-presets';
import { polishPrompt } from '../api/promptPolish';
import { useCreateFlow } from '../context/CreateFlowContext';
import { useMaterials } from '../context/MaterialsContext';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { DriveMaterialPicker } from '../components/DriveMaterialPicker';
import { DriveExplorer } from '../components/DriveExplorer';
import { MultiShotPromptInput } from '../components/MultiShotPromptInput';
import { StepVideo } from '../components/StepVideo';

const BOSS_TEMPLATE_ID = 'boss-showcase';
const BOSS_DURATION = 15;
const BOSS_ASPECT_RATIO = '16:9';

/** 从创意描述中提取关键词（中文、英文）用于素材搜索 */
function extractKeywordsFromPrompt(prompt: string): string[] {
  const m = prompt.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g);
  return m ? [...new Set(m)] : [];
}

export function BossShowcase({ onBackToPicker }: { onBackToPicker?: () => void }) {
  const {
    setTemplateId,
    setVideoDuration,
    setVideoAspectRatio,
    prompt,
    setPrompt,
    setKeywords,
    setFolderHints,
    setShots,
    setMultiShotEnabled,
    setHasPolishedPrompt,
    setHasMatchedMaterials,
    selectedOrder,
    setSelectedOrder,
    shots,
    setShotFrames,
  } = useCreateFlow();

  const { verifiedFolderId, verifiedFolderName, accessToken, setAccessToken } = useMaterials();
  const { files, loading, error, search } = useGoogleDrive(accessToken);
  const selectedIds = new Set(selectedOrder.map((f) => f.id));

  const [presetId, setPresetId] = useState<string | null>(null);
  const [showGenerationFlow, setShowGenerationFlow] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [polishLoading, setPolishLoading] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  /** 是否展开「在 Drive 文件夹中勾选」浏览器 */
  const [showDriveBrowse, setShowDriveBrowse] = useState(false);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    onSuccess: (res) => setAccessToken(res.access_token),
    onError: () => setAccessToken(null),
  });

  // 初始化 BOSS 展示：15 秒、16:9，清空其他流程遗留的分镜（仅挂载时执行，避免依赖变化导致 shots 被反复清空）
  useEffect(() => {
    setTemplateId(BOSS_TEMPLATE_ID);
    setVideoDuration(BOSS_DURATION);
    setVideoAspectRatio(BOSS_ASPECT_RATIO);
    setMultiShotEnabled(true);
    setShots([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 一键 Prompt：立即展示 15 秒分镜（本地生成），后台 API 成功后替换为 LLM 结果，体验与 CG trailer 一致 */
  const handleOneClickPrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    setPolishError(null);

    // 1. 立即展示本地生成的分镜（无需等待 API），用户即刻看到 3 镜 × 5s
    const localShots = createLocalBossStoryboard(prompt);
    setShots(localShots);
    setPresetId(null);
    setKeywords(['boss', 'character', 'scenario', ...extractKeywordsFromPrompt(prompt)].slice(0, 6));
    setFolderHints(['Character', 'Scenario']);
    setHasPolishedPrompt(true);

    setPolishLoading(true);
    try {
      const { searchKeywords, folderHints, shots: polishedShots } = await polishPrompt(prompt, {
        templateId: BOSS_TEMPLATE_ID,
      });
      setKeywords(searchKeywords);
      setFolderHints(folderHints || ['Character', 'Scenario']);
      if (polishedShots?.length) {
        setShots(polishedShots);
        setPolishError(null);
      }
      // 若 API 未返回 shots，保留本地生成结果，不提示错误
    } catch {
      // API 失败时保留本地生成结果，提示可手动编辑
      setPolishError('AI 优化暂不可用，已使用本地分镜。您可直接编辑下方镜头或选择预设。');
    } finally {
      setPolishLoading(false);
    }
  }, [prompt, setKeywords, setFolderHints, setHasPolishedPrompt, setShots]);

  const handleSelectPreset = useCallback(
    (preset: (typeof BOSS_PRESETS)[0]) => {
      setPresetId(preset.id);
      const subject = prompt.trim() ? prompt : 'BOSS';
      const personalized = personalizePresetShots(preset, subject);
      setShots(personalized);
      setKeywords(['boss', 'character', 'scenario', ...extractKeywordsFromPrompt(subject)].slice(0, 6));
      setFolderHints(['Character', 'Scenario']);
      setHasPolishedPrompt(true);
      setPrompt(personalized.map((s) => s.prompt).join('\n\n'));
    },
    [prompt, setShots, setKeywords, setFolderHints, setHasPolishedPrompt, setPrompt]
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
    [files, setSelectedOrder]
  );

  /** 从 Drive 文件夹浏览器勾选/取消素材（搜索未匹配到时可手动选择） */
  const handleToggleFromExplorer = useCallback(
    (id: string, item: { id: string; name: string; mimeType: string }) => {
      setSelectedOrder((order) => {
        const exists = order.some((f) => f.id === id);
        if (exists) return order.filter((f) => f.id !== id);
        return [...order, { id: item.id, name: item.name, mimeType: item.mimeType }];
      });
    },
    [setSelectedOrder]
  );

  const handleMatchMaterials = useCallback(async () => {
    if (!verifiedFolderId || !accessToken) return;
    try {
      const kw = ['boss', 'character', 'scenario', ...extractKeywordsFromPrompt(prompt)].slice(0, 8);
      await search(kw.length ? kw : ['boss', 'character'], verifiedFolderId, ['Character', 'Scenario']);
      setHasMatchedMaterials(true);
    } catch {
      // ignore
    }
  }, [verifiedFolderId, accessToken, prompt, search, setHasMatchedMaterials]);

  const totalShotsDuration = shots.reduce((s, shot) => s + shot.duration, 0);
  const shotsValid = shots.length >= 1 && shots.every((s) => s.prompt.trim().length > 0) && totalShotsDuration <= BOSS_DURATION;
  const materialOk = selectedOrder.length >= 2;
  const canStartGenerate = shotsValid && materialOk;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">BOSS 展示</h2>
        {onBackToPicker && (
          <button type="button" onClick={onBackToPicker} className="text-sm text-[var(--color-primary)] hover:underline">
            重新选择功能
          </button>
        )}
      </div>

      {/* 1. 主体与场景描述（主体必填） */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">要展示的主体（必填）</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="例如：骷髅王、浪人、暗黑地牢中的骷髅国王（可补充场景）"
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border-focus)] focus:outline-none resize-none"
        />
      </section>

      {/* 2. 素材选择（可选）：第 1 张=主体设定图，第 2 张=场景设定图 */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">添加素材（可选）</p>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          <strong>第 1 张 = 主体设定图</strong>，<strong>第 2 张 = 场景设定图</strong>。从「{verifiedFolderName || '素材库'}」中搜索。
        </p>
        {verifiedFolderId ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={handleMatchMaterials}
                disabled={loading}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? '搜索中…' : '搜索主体 / 场景素材'}
              </button>
              <button
                type="button"
                onClick={() => setShowDriveBrowse((v) => !v)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-sm"
              >
                {showDriveBrowse ? '收起' : '未匹配到？在 Drive 文件夹中勾选'}
              </button>
            </div>
            <DriveMaterialPicker
              keywords={['boss', 'character', ...extractKeywordsFromPrompt(prompt)]}
              accessToken={accessToken}
              onLogin={() => login()}
              files={files}
              loading={loading}
              error={error}
              onSearch={(kw) => search(kw.length ? kw : ['boss', 'character'], verifiedFolderId, ['Character', 'Scenario'])}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              selectedOrder={selectedOrder}
              onReorder={() => {}}
              folderId={verifiedFolderId}
            />
            {showDriveBrowse && verifiedFolderId && verifiedFolderName && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  浏览「{verifiedFolderName}」内的文件夹，点击图片/视频勾选为素材，按选择顺序作为 @图片1、@图片2…
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
            {selectedOrder.length >= 2 && <p className="mt-3 text-sm text-[var(--color-success)]">已选 {selectedOrder.length} 个素材</p>}
          </>
        ) : (
          <div>
            <p className="text-sm text-[var(--color-text-muted)] mb-2">请先在「素材管理」中设置 Drive 文件夹（如 GNG Assets Library）</p>
            <Link to="/materials" className="inline-flex gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium">
              去素材管理设置
            </Link>
          </div>
        )}
      </section>

      {/* 3. 一键 Prompt 或 镜头节奏预设 */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <p className="text-sm font-medium text-[var(--color-text)] mb-3">生成分镜</p>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <button
            type="button"
            onClick={handleOneClickPrompt}
            disabled={polishLoading || !prompt.trim()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {polishLoading ? '优化中…' : '一键 Prompt（生成 15 秒分镜）'}
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">或选择下方预设（会根据主体自动调整）</span>
        </div>
        {polishError && (
          <p className="mb-3 text-sm text-[var(--color-error)]">
            {polishError}
            <button type="button" onClick={() => setPolishError(null)} className="ml-2 text-[var(--color-primary)] hover:underline">关闭</button>
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mb-2">镜头节奏预设</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BOSS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`flex flex-col items-stretch text-left p-4 rounded-xl border transition-colors ${
                presetId === preset.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span className="text-base font-semibold text-[var(--color-text)]">{preset.name}</span>
              <span className="mt-1 text-xs text-[var(--color-text-muted)]">{preset.description}</span>
              <span className="mt-2 text-xs text-[var(--color-text-subtle)]">
                {preset.shots.length} 镜 · 共 {preset.shots.reduce((s, sh) => s + sh.duration, 0)} 秒
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. 分镜编辑 */}
      {shots.length > 0 && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">分镜编辑</p>
          <MultiShotPromptInput
            shots={shots}
            setShots={setShots}
            maxTotalDuration={BOSS_DURATION}
            aspectRatio={BOSS_ASPECT_RATIO}
            onShotFramesChange={setShotFrames}
          />
        </section>
      )}

      {/* BOSS 展示技巧 */}
      <section>
        <button
          type="button"
          onClick={() => setTipsExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${tipsExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          BOSS 展示 Prompt 技巧
        </button>
        {tipsExpanded && (
          <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] space-y-2">
            <p><strong className="text-[var(--color-text)]">素材：</strong>第 1 张 = 主体设定图，第 2 张 = 场景设定图。Prompt 中用 @img1(BOSS设定) @img2(场景设定) 引用。</p>
            <p><strong className="text-[var(--color-text)]">运镜：</strong>希区柯克变焦、低角度仰拍、远景→中景推进、环绕出场、极近景特写。</p>
            <p><strong className="text-[var(--color-text)]">生成首尾帧：</strong>点击时按当前镜头描述文生图预览；素材图主要在生成视频时作参考，不再用素材图垫图覆盖分镜场景。</p>
          </div>
        )}
      </section>

      {/* 5. 开始生成 */}
      <section>
        <button
          type="button"
          onClick={() => setShowGenerationFlow(true)}
          disabled={!canStartGenerate}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          开始生成
        </button>
        {!materialOk && selectedOrder.length < 2 && <p className="mt-2 text-xs text-[var(--color-text-muted)]">需选择至少 2 张素材（BOSS + 场景）</p>}
      </section>

      {showGenerationFlow && (
        <section>
          <StepVideo />
        </section>
      )}
    </div>
  );
}
