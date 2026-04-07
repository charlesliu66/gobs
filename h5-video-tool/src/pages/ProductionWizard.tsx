import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../api/client';
import { klingVideoProxyUrl, type VideoGenerateResponse } from '../api/video';
import {
  emptyProductionProject,
  PRODUCTION_STORAGE_KEY,
  type ProductionProject,
  type StructureTemplate,
  type CharacterSheet,
  type SceneSheet,
  type AssetVariant,
  type CharacterLookNode,
  type StoryArcLayer,
  type StoryCharacter,
  type ScenePlanItem,
  type StoryBeat,
  type ProductionShot,
  type ProductionDesignLayer,
  type PropSheet,
} from '../studio/productionTypes';
import {
  addCharacterLookBranch,
  buildCharacterSheetsFromStory,
  buildSceneSheetsFromStory,
  mergeSceneSheetsFromL2,
  buildCharacterImagePrompt,
  buildSceneImagePrompt,
  buildPropImagePrompt,
  buildPropSheetsFromProductionDesign,
  mergePropSheetsPreservingImages,
  formatWardrobeSupplementForCharacter,
  computeShotRefTags,
  buildShotMultimodalRefPack,
  buildProductionShotVideoStoryboardText,
  ensureCharacterLookTree,
  flattenLookTreeToVariants,
  getCharacterActiveNode,
  getCharacterLookImage,
  setCharacterLookNodeImage,
  autoMatchCharacterStateBySheet,
} from '../studio/productionAssets';
import {
  postStoryArc,
  postProductionDesign,
  postStoryboardTable,
  postExtractCharacterVisuals,
  postAssemblePrompts,
  postExtractStyleReference,
} from '../api/studio';
import { CharacterLookTreeCanvas } from '../components/production/CharacterLookTreeCanvas';
import { CharacterWardrobePanel } from '../components/production/CharacterWardrobePanel';
import {
  CharacterPortraitEditorModal,
  type PortraitEditIntent,
} from '../components/production/CharacterPortraitEditorModal';
import { getPortraitJobKey, type PortraitJobState } from '../components/production/portraitJobKey';
import { generateCharacterPortrait, generateFrames, type GenerateCharacterPortraitRequest } from '../api/storyboard';
import { saveProductionProject, loadProductionProject, listProductionProjects, uploadProductionImage, type ProjectListItem } from '../api/production';
import { CharacterLibraryPanel } from '../components/CharacterLibraryPanel';
import { type LibraryCharacter } from '../api/characterLibrary';
import { toast } from '../components/Toast';

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
type CharacterCardTab = 'looktree' | 'wardrobe';

interface StoredWizard {
  project: ProductionProject;
  characterBible: string;
  synopsis: string;
  structureTemplate: StructureTemplate;
  maxTotalDurationSec: number;
  step: number;
  storyGenre: string;
}

function migrateProject(p: ProductionProject): ProductionProject {
  const next: ProductionProject = { ...p };
  if (p.story) {
    if (!next.characterAssets?.length) {
      next.characterAssets = buildCharacterSheetsFromStory(p.story);
    }
    if (!next.sceneAssets?.length) {
      next.sceneAssets = buildSceneSheetsFromStory(p.story);
    }
    if (next.productionDesign && next.sceneAssets?.length) {
      next.sceneAssets = mergeSceneSheetsFromL2(next.sceneAssets, next.productionDesign);
    }
  }
  if (next.productionDesign?.props?.length) {
    const built = buildPropSheetsFromProductionDesign(next.productionDesign);
    next.propAssets = mergePropSheetsPreservingImages(built, next.propAssets ?? []);
  }
  if (!next.meta.aspectRatio) {
    next.meta = { ...next.meta, aspectRatio: '16:9' };
  }
  if (next.characterAssets?.length) {
    next.characterAssets = next.characterAssets.map((ch) => ensureCharacterLookTree(ch));
  }
  return next;
}

function loadStored(): StoredWizard | null {
  try {
    const raw = localStorage.getItem(PRODUCTION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && 'project' in data) {
      const s = data as StoredWizard;
      if (s.project?.schemaVersion === '1.0.0') {
        return {
          ...s,
          storyGenre: s.storyGenre ?? '',
          project: migrateProject(s.project),
        };
      }
    }
    const legacy = data as ProductionProject;
    if (legacy?.schemaVersion === '1.0.0') {
      return {
        project: migrateProject(legacy),
        characterBible: '',
        synopsis: '',
        structureTemplate: 'three_act',
        maxTotalDurationSec: 60,
        step: 0,
        storyGenre: '',
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveStored(s: StoredWizard) {
  try {
    localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** 从剧本同步资产时保留已有定妆图 / 场景图 */
function mergeCharacterSheetsPreservingLooks(
  next: CharacterSheet[],
  prev: CharacterSheet[],
): CharacterSheet[] {
  return next.map((sheet) => {
    const old = prev.find((o) => o.name.trim() === sheet.name.trim());
    if (!old) return ensureCharacterLookTree(sheet);
    const ne = ensureCharacterLookTree(sheet);
    const oe = ensureCharacterLookTree(old);
    return {
      ...ne,
      id: oe.id,
      lookTree: oe.lookTree,
      activeLookId: oe.activeLookId,
      variants: oe.variants,
    };
  });
}

function mergeSceneSheetsPreservingImages(next: SceneSheet[], prev: SceneSheet[]): SceneSheet[] {
  return next.map((sheet) => {
    const old = prev.find((o) => o.sceneRef === sheet.sceneRef);
    if (!old) return sheet;
    return { ...sheet, id: old.id, variants: old.variants };
  });
}

function buildProductionShotFramePrompt(
  shot: ProductionShot,
  styleRef: string,
  productionDesign: ProductionDesignLayer | null,
  opts?: { lockGlobalStyle?: boolean },
): string {
  const setRow = productionDesign?.sets.find((s) => s.sceneId === shot.sceneRef);
  const parts = [
    styleRef.trim(),
    opts?.lockGlobalStyle
      ? '【全片画风】必须与立项时上传的画风参考图及风格摘要一致；各镜仅允许叙事与构图变化，禁止切换为无关影调、时代或媒介。'
      : '',
    `景别：${shot.shotScale}，运镜：${shot.cameraMove}，镜头：${shot.lensFeel}`,
    `主体：${shot.subject}`,
    `动作：${shot.action}`,
    shot.structuredStill.sp_environment
      ? `环境：${shot.structuredStill.sp_environment}`
      : setRow?.description
        ? `环境：${setRow.description}`
        : '',
    `光线：${shot.lighting}；构图：${shot.composition}`,
    '电影感分镜静帧，高清，无文字水印。',
  ];
  return parts.filter(Boolean).join('\n');
}

/** Step2：依据剧本核对角色 / 拍摄空间 / 道具（与 story 同步） */
function StoryAssetFieldsFromOutline({
  story,
  patchStory,
}: {
  story: StoryArcLayer;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">角色（来自剧本）</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                characters: [
                  ...s.characters,
                  {
                    name: `角色${s.characters.length + 1}`,
                    goal: '',
                    conflict: '',
                    role: 'supporting',
                  } satisfies StoryCharacter,
                ],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加角色
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {story.characters.map((c, ci) => (
            <div
              key={`${c.name}-${ci}`}
              className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  value={c.name}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, name: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="min-w-[8rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm font-medium"
                  placeholder="姓名"
                />
                <select
                  value={c.role ?? 'other'}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, role: e.target.value as StoryCharacter['role'] } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
                >
                  <option value="protagonist">主角</option>
                  <option value="supporting">配角</option>
                  <option value="antagonist">对立/反派</option>
                  <option value="other">其他</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      characters: s.characters.filter((_, i) => i !== ci),
                    }))
                  }
                  className="text-xs text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
              <label className="block text-[10px] text-[var(--color-text-muted)]">
                动机 / 目标
                <input
                  value={c.goal}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, goal: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-[10px] text-[var(--color-text-muted)]">
                冲突
                <textarea
                  value={c.conflict}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, conflict: e.target.value } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  rows={2}
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-[10px] text-[var(--color-text-muted)]">
                弧光（可选）
                <input
                  value={c.arc ?? ''}
                  onChange={(e) =>
                    patchStory((s) => {
                      const characters = s.characters.map((x, i) =>
                        i === ci ? { ...x, arc: e.target.value || undefined } : x,
                      );
                      return { ...s, characters };
                    })
                  }
                  className="mt-0.5 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">拍摄地点 / 空间</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                scenePlan: [
                  ...s.scenePlan,
                  { id: `loc-${Date.now()}`, name: '', purpose: '' } satisfies ScenePlanItem,
                ],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加地点
          </button>
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
          「地点名称」须为可实拍的空间（如村庄、家中），勿用物件名或抽象节拍名。
        </p>
        <div className="mt-3 space-y-3">
          {story.scenePlan.map((sc, si) => (
            <div
              key={sc.id}
              className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
            >
              <div className="flex flex-wrap gap-2">
                <label className="text-[10px] text-[var(--color-text-muted)]">
                  ID（与分镜 sceneRef 对应）
                  <input
                    value={sc.id}
                    onChange={(e) =>
                      patchStory((s) => {
                        const scenePlan = s.scenePlan.map((x, i) =>
                          i === si ? { ...x, id: e.target.value } : x,
                        );
                        return { ...s, scenePlan };
                      })
                    }
                    className="mt-0.5 block w-full min-w-[6rem] rounded border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      scenePlan: s.scenePlan.filter((_, i) => i !== si),
                    }))
                  }
                  className="ml-auto self-end text-xs text-red-400 hover:underline"
                >
                  删除
                </button>
              </div>
              <label className="mt-2 block text-xs text-[var(--color-text-muted)]">
                地点名称
                <input
                  value={sc.name}
                  onChange={(e) =>
                    patchStory((s) => {
                      const scenePlan = s.scenePlan.map((x, i) =>
                        i === si ? { ...x, name: e.target.value } : x,
                      );
                      return { ...s, scenePlan };
                    })
                  }
                  className="mt-1 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
              <label className="mt-2 block text-xs text-[var(--color-text-muted)]">
                叙事作用
                <textarea
                  value={sc.purpose}
                  onChange={(e) =>
                    patchStory((s) => {
                      const scenePlan = s.scenePlan.map((x, i) =>
                        i === si ? { ...x, purpose: e.target.value } : x,
                      );
                      return { ...s, scenePlan };
                    })
                  }
                  rows={2}
                  className="mt-1 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">重要道具</h3>
          <button
            type="button"
            onClick={() =>
              patchStory((s) => ({
                ...s,
                importantProps: [...(s.importantProps ?? []), { name: '', notes: '' }],
              }))
            }
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加道具
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {(story.importantProps ?? []).map((p, pi) => (
            <div key={pi} className="flex flex-wrap items-start gap-2 rounded-lg bg-[var(--color-surface)] p-2">
              <input
                value={p.name}
                onChange={(e) =>
                  patchStory((s) => {
                    const importantProps = [...(s.importantProps ?? [])];
                    importantProps[pi] = { ...importantProps[pi], name: e.target.value };
                    return { ...s, importantProps };
                  })
                }
                placeholder="道具名"
                className="min-w-[6rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm"
              />
              <input
                value={p.notes ?? ''}
                onChange={(e) =>
                  patchStory((s) => {
                    const importantProps = [...(s.importantProps ?? [])];
                    importantProps[pi] = { ...importantProps[pi], notes: e.target.value };
                    return { ...s, importantProps };
                  })
                }
                placeholder="说明（多次出现的关键物件）"
                className="min-w-[8rem] flex-[2] rounded border border-[var(--color-border)] px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  patchStory((s) => ({
                    ...s,
                    importantProps: (s.importantProps ?? []).filter((_, i) => i !== pi),
                  }))
                }
                className="text-xs text-red-400 hover:underline"
              >
                删
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function updateFlatAssetVariantImage<T extends { id: string; variants: AssetVariant[] }>(
  sheets: T[],
  sheetId: string,
  variantId: string,
  imageDataUrl: string,
): T[] {
  return sheets.map((sh) => {
    if (sh.id !== sheetId) return sh;
    return {
      ...sh,
      variants: sh.variants.map((v) => (v.id === variantId ? { ...v, imageDataUrl } : v)),
    };
  });
}

function updateVariantImage(
  sheets: CharacterSheet[] | SceneSheet[] | PropSheet[],
  sheetId: string,
  variantId: string,
  imageDataUrl: string,
  kind: 'char' | 'scene' | 'prop',
): CharacterSheet[] | SceneSheet[] | PropSheet[] {
  if (kind === 'char') {
    return sheets.map((sh) => {
      if (sh.id !== sheetId) return sh as CharacterSheet;
      return setCharacterLookNodeImage(ensureCharacterLookTree(sh as CharacterSheet), variantId, imageDataUrl);
    }) as CharacterSheet[];
  }
  if (kind === 'scene') {
    return updateFlatAssetVariantImage(sheets as SceneSheet[], sheetId, variantId, imageDataUrl);
  }
  return updateFlatAssetVariantImage(sheets as PropSheet[], sheetId, variantId, imageDataUrl);
}

export function ProductionWizard() {
  const initial = loadStored();
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
  const [charCardTabs, setCharCardTabs] = useState<Record<string, CharacterCardTab>>({});
  const [portraitEdit, setPortraitEdit] = useState<{
    sheet: CharacterSheet;
    intent: PortraitEditIntent;
  } | null>(null);
  // ── 服务端持久化 ────────────────────────────────────────────────────────────
  const [serverProjectId, setServerProjectId] = useState<string | null>(() => {
    try { return localStorage.getItem('h5-production-server-id') ?? null; } catch { return null; }
  });
  const [showProjectList, setShowProjectList] = useState(false);
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [showLibraryImport, setShowLibraryImport] = useState(false);
  const serverSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 防抖同步到服务端：project 变化后 3 秒触发 */
  const scheduleServerSync = useCallback((data: StoredWizard) => {
    if (serverSyncTimerRef.current) clearTimeout(serverSyncTimerRef.current);
    serverSyncTimerRef.current = setTimeout(async () => {
      try {
        const result = await saveProductionProject(data as unknown as Record<string, unknown>, serverProjectId ?? undefined);
        setServerProjectId(result.id);
        try { localStorage.setItem('h5-production-server-id', result.id); } catch { /* ignore */ }
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
  const handleLoadServerProject = useCallback(async (id: string) => {
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
        try { localStorage.setItem('h5-production-server-id', id); } catch { /* ignore */ }
        setShowProjectList(false);
      }
    } catch (e) {
      console.warn('[production] 加载项目失败', e);
      setErr('加载项目失败，请重试');
    }
  }, []);

  /** 仅内存：未确认的肖像预览；刷新页面即丢失，不写入 localStorage */
  const [portraitJobs, setPortraitJobs] = useState<Record<string, PortraitJobState>>({});
  const [shotMediaBusy, setShotMediaBusy] = useState<'frame' | 'video' | null>(null);

  const ar = project.meta.aspectRatio ?? '16:9';

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
  const [batchAssetGen, setBatchAssetGen] = useState<{ current: number; total: number } | null>(null);
  const batchCancelRef = useRef<boolean>(false);
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
    setBatchAssetGen({ current: 0, total: tasks.length });
    const g = project.meta.styleRefImageDataUrl?.trim();

    // 并发控制：最多同时 2 个任务
    const CONCURRENCY = 2;
    let completedCount = 0;
    const runTask = async (t: Task) => {
      if (batchCancelRef.current) return;
      setGenKey(`${t.kind}:${t.sheetId}:${t.variantId}`);
      try {
        const res = await generateFrames({
          prompt: t.prompt,
          aspectRatio: ar,
          shotIndex: 0,
          ...(g ? { globalStyleReferenceFrame: g } : {}),
        });
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
      } catch (e) {
        if (!batchCancelRef.current) {
          console.warn(`[batch] ${t.kind} ${t.sheetId} 生成失败:`, e);
        }
      } finally {
        completedCount++;
        setBatchAssetGen((prev) => prev ? { ...prev, current: completedCount } : null);
      }
    };

    // 任务队列并发执行
    try {
      const pool: Promise<void>[] = [];
      for (const task of tasks) {
        if (batchCancelRef.current) break;
        const p = runTask(task);
        pool.push(p);
        if (pool.length >= CONCURRENCY) {
          await Promise.race(pool);
          // 移除已完成的
          const settled = await Promise.allSettled(pool.map((x) => Promise.race([x, Promise.resolve()])));
          pool.splice(0, pool.length, ...pool.filter((_, i) => settled[i]?.status !== 'fulfilled'));
        }
      }
      await Promise.allSettled(pool);
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
  }, [project, characterBible, synopsis, structureTemplate, maxTotalDurationSec, step, storyGenre, scheduleServerSync]);

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

  const runGenerateFrame = useCallback(
    async (prompt: string, sheetId: string, variantId: string, kind: 'char' | 'scene' | 'prop') => {
      setGenKey(`${kind}:${sheetId}:${variantId}`);
      setErr(null);
      try {
        const g = project.meta.styleRefImageDataUrl?.trim();
        const res = await generateFrames({
          prompt,
          aspectRatio: ar,
          shotIndex: 0,
          ...(g ? { globalStyleReferenceFrame: g } : {}),
        });
        const img = res.firstFrame;
        // 立即显示 base64，后台上传到服务端替换为持久 URL
        const applyImg = (url: string) => {
          setProject((p) => {
            if (kind === 'char') {
              const sheets = p.characterAssets ?? [];
              return {
                ...p,
                characterAssets: updateVariantImage(sheets, sheetId, variantId, url, 'char') as CharacterSheet[],
              };
            }
            if (kind === 'scene') {
              const sheets = p.sceneAssets ?? [];
              return {
                ...p,
                sceneAssets: updateVariantImage(sheets, sheetId, variantId, url, 'scene') as SceneSheet[],
              };
            }
            const sheets = p.propAssets ?? [];
            return {
              ...p,
              propAssets: updateVariantImage(sheets, sheetId, variantId, url, 'prop') as PropSheet[],
            };
          });
        };
        applyImg(img);
        if (img.startsWith('data:')) {
          const mime = img.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
          uploadProductionImage(img, mime, `${kind}-${sheetId}`).then(({ url }) => applyImg(url)).catch(() => {});
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '生图失败');
      } finally {
        setGenKey(null);
      }
    },
    [ar, project.meta.styleRefImageDataUrl],
  );

  const handleUploadVariant = useCallback(
    (file: File | null, sheetId: string, variantId: string, kind: 'char' | 'scene' | 'prop') => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProject((p) => {
          if (kind === 'char') {
            const sheets = p.characterAssets ?? [];
            return {
              ...p,
              characterAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'char') as CharacterSheet[],
            };
          }
          if (kind === 'scene') {
            const sheets = p.sceneAssets ?? [];
            return {
              ...p,
              sceneAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'scene') as SceneSheet[],
            };
          }
          const sheets = p.propAssets ?? [];
          return {
            ...p,
            propAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'prop') as PropSheet[],
          };
        });
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const addCharacterVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.characterAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = ensureCharacterLookTree(sheets[i]!);
      const root = sh.lookTree!.find((n) => n.parentId === null) ?? sh.lookTree![0];
      if (!root) return p;
      const siblings = sh.lookTree!.filter((n) => n.parentId === root.id);
      const newId = `look-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const node: CharacterLookNode = {
        id: newId,
        parentId: root.id,
        label: `状态 ${siblings.length + 1}`,
      };
      const lookTree = [...sh.lookTree!, node];
      sheets[i] = {
        ...sh,
        lookTree,
        variants: flattenLookTreeToVariants(lookTree),
        activeLookId: newId,
      };
      return { ...p, characterAssets: sheets };
    });
  }, []);

  const addSceneVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.sceneAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = sheets[i];
      const n = sh.variants.length + 1;
      const v: AssetVariant = { id: `sv-${sheetId}-${Date.now()}`, label: `变体 ${n}` };
      sheets[i] = { ...sh, variants: [...sh.variants, v] };
      return { ...p, sceneAssets: sheets };
    });
  }, []);

  const addPropVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.propAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = sheets[i]!;
      const n = sh.variants.length + 1;
      const v: AssetVariant = { id: `pv-${sheetId}-${Date.now()}`, label: `变体 ${n}` };
      sheets[i] = { ...sh, variants: [...sh.variants, v] };
      return { ...p, propAssets: sheets };
    });
  }, []);

  const addManualCharacter = useCallback(() => {
    const name = window.prompt('角色名称');
    if (!name?.trim()) return;
    setProject((p) => {
      const sheets = [...(p.characterAssets ?? [])];
      const id = `ch-manual-${Date.now()}`;
      const rootId = `${id}-v0`;
      sheets.push({
        id,
        name: name.trim(),
        isProtagonist: false,
        variants: [{ id: rootId, label: '默认形象' }],
        lookTree: [{ id: rootId, parentId: null, label: '默认形象' }],
        activeLookId: rootId,
      });
      return { ...p, characterAssets: sheets };
    });
  }, []);

  const handleImportFromLibrary = useCallback((libChar: LibraryCharacter) => {
    const id = `ch-lib-${Date.now()}`;
    const rootId = `${id}-v0`;
    const newChar: CharacterSheet = {
      id,
      name: libChar.name,
      isProtagonist: libChar.isProtagonist ?? false,
      variants: [{ id: rootId, label: '基础形象', imageDataUrl: libChar.baseImageDataUrl }],
      lookTree: [{ id: rootId, parentId: null, label: '基础形象', imageDataUrl: libChar.baseImageDataUrl }],
      activeLookId: rootId,
      baseImageDataUrl: libChar.baseImageDataUrl,
      baseConfirmed: libChar.baseConfirmed ?? false,
      states: libChar.states?.map((s) => ({
        id: s.id ?? `state_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: s.label,
        imageDataUrl: s.imageDataUrl,
        statePrompt: s.statePrompt ?? '',
        notes: s.notes ?? '',
      })) ?? [],
    };
    setProject((p) => ({
      ...p,
      characterAssets: [...(p.characterAssets ?? []), newChar],
    }));
    setShowLibraryImport(false);
    toast.success(`已导入角色「${libChar.name}」`);
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
    localStorage.removeItem(PRODUCTION_STORAGE_KEY);
  }, [clearStylePreview]);

  const goPrev = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

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
    setShotMediaBusy('frame');
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
        ...(project.meta.styleRefImageDataUrl?.trim()
          ? { globalStyleReferenceFrame: project.meta.styleRefImageDataUrl }
          : {}),
      });
      patchShot(selectedShotIdx, { previewStillDataUrl: res.firstFrame });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '分镜图生成失败');
    } finally {
      setShotMediaBusy(null);
    }
  }, [
    project.shots,
    project.productionDesign,
    project.meta.styleRefSummary,
    project.meta.styleRefImageDataUrl,
    ar,
    selectedShotIdx,
    patchShot,
  ]);

  const handleGenerateShotVideo = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s) return;
    setShotMediaBusy('video');
    setErr(null);
    try {
      const pref = project.meta.shotVideoDreaminaModel?.trim();
      const mv = project.meta.dreaminaModelVersion?.trim();

      if (pref === 'dreamina-multimodal') {
        const pack = buildShotMultimodalRefPack(
          s,
          project.characterAssets ?? [],
          project.sceneAssets ?? [],
          project.propAssets ?? [],
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
        const res = await apiPost<VideoGenerateResponse>('/api/video/generate', {
          storyboardText,
          materials: [],
          duration: Math.min(60, Math.max(4, Math.round(s.durationSec || 6))),
          aspectRatio: ar,
          model: 'dreamina-multimodal',
          multimodalImages: pack.multimodalImages,
          ...(mv ? { dreaminaModelVersion: mv } : {}),
        });
        const url = res.videoUrl;
        if (url) patchShot(selectedShotIdx, { previewVideoUrl: url });
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
      const res = await apiPost<VideoGenerateResponse>('/api/video/generate', {
        storyboardText,
        materials: [],
        duration: Math.min(60, Math.max(4, Math.round(s.durationSec || 6))),
        aspectRatio: ar,
        model,
        ...(mv ? { dreaminaModelVersion: mv } : {}),
        ...(hasStill && model === 'dreamina-image2video'
          ? { imageBase64: base64Raw, imageMimeType: 'image/png' }
          : {}),
      });
      const url = res.videoUrl;
      if (url) patchShot(selectedShotIdx, { previewVideoUrl: url });
      else setErr('视频生成未返回地址');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '分镜视频生成失败');
    } finally {
      setShotMediaBusy(null);
    }
  }, [
    project.shots,
    project.characterAssets,
    project.sceneAssets,
    project.propAssets,
    project.meta.shotVideoDreaminaModel,
    project.meta.dreaminaModelVersion,
    ar,
    selectedShotIdx,
    patchShot,
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

  const multimodalRefPack = useMemo(() => {
    if (!shot) return null;
    return buildShotMultimodalRefPack(shot, chSheets, scSheets, propSheets);
  }, [shot, chSheets, scSheets, propSheets]);

  const multimodalAutoPrompt = useMemo(() => {
    if (!shot || !multimodalRefPack) return '';
    return multimodalRefPack.defaultVideoPrompt;
  }, [shot, multimodalRefPack]);

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
            : '可复制 Seedance 块或前往 Studio 多镜创作';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 顶栏：标题 + 步骤条（中间区域独立滚动，本区不随内容滚动） */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <input
                value={project.meta.title}
                onChange={(e) => {
                  setProject((p) => ({ ...p, meta: { ...p.meta, title: e.target.value } }));
                  if (e.target.value.trim()) {
                    const t1 = setTimeout(() => setTitleSaved(true), 1000);
                    const t2 = setTimeout(() => setTitleSaved(false), 3000);
                    return () => { clearTimeout(t1); clearTimeout(t2); };
                  }
                }}
                placeholder="项目名称"
                className="w-full max-w-xl border-0 bg-transparent text-lg font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              {titleSaved && (
                <span className="text-[10px] text-[var(--color-success)]">✓ 已保存</span>
              )}
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-[var(--color-text-muted)]">高级制片 · 故事弧 → 角色资产 → 分镜表 → 生成导出</p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-primary)]/20 text-[var(--color-primary)]">BETA</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleLoadProjectList()}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-colors"
              >
                📂 项目列表
              </button>
              <Link to="/studio" className="text-sm text-[var(--color-primary)] hover:underline">
                ← Studio
              </Link>
              <button
                type="button"
                onClick={resetDraft}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                清空草稿
              </button>
            </div>
          </div>
          {/* 步骤进度条 */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                {/* 连接线（步骤间） */}
                {i > 0 && (
                  <div
                    className={`h-0.5 w-8 sm:w-12 transition-colors ${
                      step >= i ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
                {/* 步骤圆圈 + 标签 */}
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === i
                        ? 'bg-[var(--color-primary)] text-white ring-2 ring-[var(--color-primary)]/30 ring-offset-1 ring-offset-[var(--color-surface-elevated)]'
                        : step > i
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-border)]'
                    }`}
                  >
                    {step > i ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap transition-colors ${
                      step === i
                        ? 'text-[var(--color-primary)]'
                        : step > i
                          ? 'text-[var(--color-text-muted)]'
                          : 'text-[var(--color-text-subtle)]'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
        {err && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {/* Step 0 输入 */}
        {step === 0 && (
          <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">立项与梗概</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-[var(--color-text-muted)] sm:col-span-2">
                视频风格（摘要）
                <textarea
                  value={project.meta.styleRefSummary}
                  onChange={(e) =>
                    setProject((p) => ({ ...p, meta: { ...p.meta, styleRefSummary: e.target.value } }))
                  }
                  rows={3}
                  placeholder="可手写；或上传参考图反解析"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                画面比例
                <select
                  value={project.meta.aspectRatio ?? '16:9'}
                  onChange={(e) =>
                    setProject((p) => ({ ...p, meta: { ...p.meta, aspectRatio: e.target.value } }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                >
                  {ASPECT_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[var(--color-text-muted)]">
                故事类型（可选）
                <input
                  value={storyGenre}
                  onChange={(e) => setStoryGenre(e.target.value)}
                  placeholder="如：女频、悬疑、都市"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">参考图反解析</span>
              <input
                type="file"
                accept="image/*"
                disabled={busyStyle}
                onChange={(e) => handleStyleRefFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {busyStyle && <span className="text-xs text-[var(--color-text-muted)]">分析中…</span>}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              上传的参考图将作为全片画风基准；后续各镜分镜图会按该图与上方风格摘要做多模态画风锁定。
            </p>
            {styleRefPreview && (
              <img
                src={styleRefPreview}
                alt=""
                className="h-20 rounded-lg border border-[var(--color-border)] object-cover"
              />
            )}
            <label className="block text-xs text-[var(--color-text-muted)]">
              角色设定 / 背景
              <textarea
                value={characterBible}
                onChange={(e) => setCharacterBible(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[var(--color-text-muted)]">
              故事梗概
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[var(--color-text-muted)]">
              结构模板
              <select
                value={structureTemplate}
                onChange={(e) => setStructureTemplate(e.target.value as StructureTemplate)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                {TEMPLATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busyL1}
              onClick={() => void handleStoryArc()}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyL1 ? '生成中…' : '生成剧本大纲'}
            </button>
          </section>
        )}

        {/* Step 1 剧本大纲（可编辑） */}
        {step === 1 && story && (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 sm:grid-cols-2">
              <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2">
                视频风格摘要（可与「输入」页一致）
                <textarea
                  value={project.meta.styleRefSummary}
                  onChange={(e) =>
                    setProject((p) => ({ ...p, meta: { ...p.meta, styleRefSummary: e.target.value } }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                />
              </label>
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)]">画面比例</div>
                <p className="mt-1 text-sm text-[var(--color-text)]">{ar}（在「输入」页修改）</p>
              </div>
              <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)]">故事类型</div>
                <input
                  value={storyGenre}
                  onChange={(e) => setStoryGenre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  placeholder="如：悬疑、都市"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">剧本摘要（可编辑）</h3>
              <div className="mt-3 space-y-4 text-sm">
                <label className="block text-xs text-[var(--color-text-muted)]">
                  一句话故事（logline）
                  <textarea
                    value={story.logline}
                    onChange={(e) => patchStory((s) => ({ ...s, logline: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
                  />
                </label>
                <label className="block text-xs text-[var(--color-text-muted)]">
                  故事梗概
                  <textarea
                    value={story.synopsis}
                    onChange={(e) => patchStory((s) => ({ ...s, synopsis: e.target.value }))}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
                  />
                </label>
                <label className="block text-xs text-[var(--color-text-muted)]">
                  节奏说明（可选）
                  <textarea
                    value={story.pacingNotes ?? ''}
                    onChange={(e) => patchStory((s) => ({ ...s, pacingNotes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">剧本节拍</h3>
                <button
                  type="button"
                  onClick={() =>
                    patchStory((s) => ({
                      ...s,
                      beats: [
                        ...s.beats,
                        {
                          id: `b-${Date.now()}`,
                          label: `节拍 ${s.beats.length + 1}`,
                          storyPercent: Math.min(1, (s.beats.length + 1) * 0.1),
                          description: '',
                        } satisfies StoryBeat,
                      ],
                    }))
                  }
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  + 添加节拍
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {story.beats.map((b, bi) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--color-text-muted)]">#{bi + 1}</span>
                      <input
                        value={b.label}
                        onChange={(e) =>
                          patchStory((s) => ({
                            ...s,
                            beats: s.beats.map((x, i) => (i === bi ? { ...x, label: e.target.value } : x)),
                          }))
                        }
                        className="min-w-[6rem] flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm font-medium"
                      />
                      <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                        位置 %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round(b.storyPercent * 100)}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) / 100 : 0;
                            patchStory((s) => ({
                              ...s,
                              beats: s.beats.map((x, i) => (i === bi ? { ...x, storyPercent: pct } : x)),
                            }));
                          }}
                          className="w-14 rounded border border-[var(--color-border)] px-1 py-0.5 text-xs"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          patchStory((s) => ({
                            ...s,
                            beats: s.beats.filter((_, i) => i !== bi),
                          }))
                        }
                        className="text-xs text-red-400 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={b.description}
                      onChange={(e) =>
                        patchStory((s) => ({
                          ...s,
                          beats: s.beats.map((x, i) =>
                            i === bi ? { ...x, description: e.target.value } : x,
                          ),
                        }))
                      }
                      rows={2}
                      placeholder="本节拍发生什么"
                      className="mt-2 w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={busyL2}
              onClick={() => void handleL2()}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyL2 ? '生成中…' : '生成服化道并进入角色与场景'}
            </button>
          </div>
        )}

        {/* Step 2 角色与场景 */}
        {step === 2 && project.productionDesign && (
          <div className="space-y-6">
            <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)]">▸</span>
                  剧本要素核对（可选）
                </span>
              </summary>
              <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
                <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4">
                  <h4 className="text-xs font-semibold text-[var(--color-text)]">关键物料</h4>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    依据剧本补全角色、拍摄空间与重要道具；再为各卡生成定妆 / 场景定帧。
                  </p>
                  <button
                    type="button"
                    onClick={syncAssetsFromStory}
                    className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                  >
                    从剧本大纲同步角色与场景资产
                  </button>
                  <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                    同步会尽量保留已有图片（同名角色 / 同 sceneRef）。
                  </p>
                </div>
                {project.story ? (
                  <StoryAssetFieldsFromOutline story={project.story} patchStory={patchStory} />
                ) : null}
              </div>
            </details>

            {/* 主区：参考竞品 — 全部角色 / 全部场景 */}
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] px-4 pt-2 sm:px-6">
                <div className="flex min-w-0 gap-6 sm:gap-10">
                  {(
                    [
                      { id: 'characters' as const, label: `全部角色 ${chSheets.length}` },
                      { id: 'scenes' as const, label: `全部场景 ${scSheets.length}` },
                      { id: 'props' as const, label: `全部道具 ${(project.propAssets ?? []).length}` },
                      { id: 'checklist' as const, label: '制作清单' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setL2Tab(id)}
                      className={`relative pb-3 text-sm font-semibold transition-colors ${
                        l2Tab === id
                          ? 'text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t after:bg-[var(--color-primary)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 pb-2">
                  {l2Tab !== 'checklist' ? (
                    <button
                      type="button"
                      disabled={batchAssetGen !== null}
                      onClick={() => void handleBatchGenerateMissingAssets()}
                      title="按默认 prompt（与列表「AI」相同）为缺图角色定稿节点、场景与道具主变体生图；跳过弹窗待确认项"
                      className="rounded-lg border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/12 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {batchAssetGen
                        ? `一键生成中 ${batchAssetGen.current}/${batchAssetGen.total}`
                        : '一键补全缺图'}
                    </button>
                  ) : null}
                  {batchAssetGen !== null ? (
                    <button
                      type="button"
                      onClick={() => { batchCancelRef.current = true; }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      取消
                    </button>
                  ) : null}
                  {l2Tab === 'characters' ? (
                    <button
                      type="button"
                      onClick={addManualCharacter}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      + 添加角色
                    </button>
                  ) : null}
                  {l2Tab === 'characters' ? (
                    <button
                      type="button"
                      onClick={() => setShowLibraryImport((v) => !v)}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline ml-3"
                    >
                      📚 从形象库导入
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="p-4 sm:p-6">
            {l2Tab === 'characters' && showLibraryImport && (
              <div className="border border-[var(--color-border)] rounded-xl p-3 mb-4">
                <CharacterLibraryPanel onImportToProject={handleImportFromLibrary} />
              </div>
            )}
            {l2Tab === 'characters' && (
              <>
                {chSheets.length > 0 && treeFocusCharacterId ? (
                  <div className="mb-6 space-y-3">
                    <div className="text-xs font-medium text-[var(--color-text-muted)]">形象演化树</div>
                    {(() => {
                      const focused = chSheets.find((c) => c.id === treeFocusCharacterId);
                      if (!focused) return null;
                      return (
                        <CharacterLookTreeCanvas
                          characterSheet={focused}
                          characterSheetId={focused.id}
                          portraitJobs={portraitJobs}
                          onSheetChange={(next) => {
                            setProject((p) => ({
                              ...p,
                              characterAssets: (p.characterAssets ?? []).map((c) =>
                                c.id === next.id ? next : c,
                              ),
                            }));
                          }}
                          onRequestPortrait={(intent) => {
                            setPortraitEdit({ sheet: ensureCharacterLookTree(focused), intent });
                          }}
                        />
                      );
                    })()}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {chSheets.map((ch) => {
                    const ensured = ensureCharacterLookTree(ch);
                    const lookCount = ensured.lookTree?.length ?? ch.variants.length;
                    const mainImg = getCharacterLookImage(ensured);
                    const activeNode = getCharacterActiveNode(ensured);
                    const gridPortraitKey = activeNode
                      ? getPortraitJobKey(ch.id, { mode: 'replace', nodeId: activeNode.id })
                      : '';
                    const gridPj = gridPortraitKey ? portraitJobs[gridPortraitKey] : undefined;
                    return (
                      <div
                        key={ch.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const s = ensureCharacterLookTree(ch);
                            const node = getCharacterActiveNode(s) ?? s.lookTree![0];
                            setTreeFocusCharacterId(ch.id);
                            setPortraitEdit({ sheet: s, intent: { mode: 'replace', nodeId: node.id } });
                          }}
                          className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden bg-[var(--color-surface-hover)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                        >
                          {mainImg ? (
                            <img src={mainImg} alt="" className="h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-[var(--color-text-muted)]">
                              暂无定妆
                            </div>
                          )}
                          {gridPj?.status === 'generating' && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/55">
                              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              <span className="text-[10px] text-white/95">生成中</span>
                            </div>
                          )}
                          {gridPj?.status === 'done' && (
                            <div className="absolute inset-0 z-10 overflow-hidden">
                              <img
                                src={gridPj.previewDataUrl}
                                alt=""
                                className="h-full w-full object-cover object-top"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-amber-600/90 py-1 text-center text-[10px] font-medium text-white">
                                待确认
                              </div>
                            </div>
                          )}
                          {gridPj?.status === 'error' && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-950/80 px-2 text-center text-[10px] leading-snug text-red-100">
                              生成失败
                            </div>
                          )}
                          {ch.isProtagonist ? (
                            <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                              主角
                            </span>
                          ) : null}
                        </button>
                        <div className="border-t border-[var(--color-border)]/60 px-2 py-3 text-center">
                          <div className="truncate text-sm font-semibold text-[var(--color-text)]">{ch.name}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-muted)]">共{lookCount}个形象</div>
                          <div className="mt-2 flex justify-center gap-1">
                            {(['looktree', 'wardrobe'] as CharacterCardTab[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setCharCardTabs((prev) => ({ ...prev, [ch.id]: t }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  (charCardTabs[ch.id] ?? 'looktree') === t
                                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                                }`}
                              >
                                {t === 'looktree' ? '形象树' : '状态衣橱'}
                              </button>
                            ))}
                          </div>
                          {(charCardTabs[ch.id] ?? 'looktree') === 'looktree' ? (
                            <button
                              type="button"
                              onClick={() => setTreeFocusCharacterId(ch.id)}
                              className="mt-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                            >
                              形象演化
                            </button>
                          ) : null}
                        </div>
                        {(charCardTabs[ch.id] ?? 'looktree') === 'wardrobe' ? (
                          <div className="border-t border-[var(--color-border)]/50 p-2">
                            <CharacterWardrobePanel
                              sheet={ch}
                              styleRef={project.meta.styleRefSummary}
                              styleRefImage={project.meta.styleRefImageDataUrl}
                              aspectRatio={project.meta.aspectRatio ?? '16:9'}
                              onUpdate={(updated) =>
                                setProject((p) => ({
                                  ...p,
                                  characterAssets: (p.characterAssets ?? []).map((s) =>
                                    s.id === ch.id ? updated : s,
                                  ),
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-2 py-1.5">
                          <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                            变体与 AI 生图
                          </summary>
                          <div className="mt-2 space-y-2 pb-2">
                            {ch.variants.map((v) => (
                              <div
                                key={v.id}
                                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                              >
                                <span className="max-w-[5rem] truncate text-[10px] text-[var(--color-text-muted)]">
                                  {v.label}
                                </span>
                                {v.imageDataUrl ? (
                                  <img src={v.imageDataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                                ) : null}
                                <label className="cursor-pointer text-[10px] text-[var(--color-primary)]">
                                  上传
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleUploadVariant(e.target.files?.[0] ?? null, ch.id, v.id, 'char')
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={genKey === `char:${ch.id}:${v.id}`}
                                  onClick={() => {
                                    const prompt = buildCharacterImagePrompt(
                                      ch,
                                      v,
                                      project.meta.styleRefSummary,
                                      project.productionDesign,
                                      {
                                        enforceGlobalStyleLock: !!project.meta.styleRefImageDataUrl?.trim(),
                                      },
                                    );
                                    void runGenerateFrame(prompt, ch.id, v.id, 'char');
                                  }}
                                  className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                                >
                                  {genKey === `char:${ch.id}:${v.id}` ? '…' : 'AI'}
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addCharacterVariant(ch.id)}
                              className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                              + 添加状态
                            </button>
                          </div>
                        </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {l2Tab === 'scenes' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {scSheets.map((sc) => {
                  const vCount = sc.variants.length;
                  const cover = sc.variants[0]?.imageDataUrl;
                  return (
                    <div
                      key={sc.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-hover)]">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--color-text-muted)]">
                            暂无场景图
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[var(--color-border)]/60 px-2 py-3 text-center">
                        <div className="truncate text-sm font-semibold text-[var(--color-text)]">{sc.name}</div>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">共{vCount}个变体</div>
                      </div>
                      <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-2 py-1.5">
                        <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                          变体与 AI 生图
                        </summary>
                        <div className="mt-2 space-y-2 pb-2">
                          {sc.variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                            >
                              <span className="max-w-[5rem] truncate text-[10px] text-[var(--color-text-muted)]">
                                {v.label}
                              </span>
                              {v.imageDataUrl ? (
                                <img src={v.imageDataUrl} alt="" className="h-8 w-12 rounded object-cover" />
                              ) : null}
                              <label className="cursor-pointer text-[10px] text-[var(--color-primary)]">
                                上传
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleUploadVariant(e.target.files?.[0] ?? null, sc.id, v.id, 'scene')
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                disabled={genKey === `scene:${sc.id}:${v.id}`}
                                onClick={() => {
                                  const prompt = buildSceneImagePrompt(
                                    sc,
                                    v,
                                    project.meta.styleRefSummary,
                                    project.productionDesign,
                                    {
                                      enforceGlobalStyleLock: !!project.meta.styleRefImageDataUrl?.trim(),
                                    },
                                  );
                                  void runGenerateFrame(prompt, sc.id, v.id, 'scene');
                                }}
                                className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                              >
                                {genKey === `scene:${sc.id}:${v.id}` ? '…' : 'AI'}
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addSceneVariant(sc.id)}
                            className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          >
                            + 场景变体
                          </button>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}

            {l2Tab === 'props' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {propSheets.length === 0 ? (
                  <p className="col-span-full text-sm text-[var(--color-text-muted)]">
                    暂无道具卡。请先生成服化道（L2），制作清单中的 props 会同步为道具卡。
                  </p>
                ) : null}
                {propSheets.map((pr) => {
                  const vCount = pr.variants.length;
                  const cover = pr.variants[0]?.imageDataUrl;
                  return (
                    <div
                      key={pr.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/35 hover:shadow-md"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-surface-hover)]">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--color-text-muted)]">
                            暂无道具图
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[var(--color-border)]/60 px-2 py-3 text-center">
                        <div className="truncate text-sm font-semibold text-[var(--color-text)]">{pr.name}</div>
                        {pr.sceneRef ? (
                          <div className="mt-0.5 truncate text-[10px] text-[var(--color-text-muted)]">
                            场景：{pr.sceneRef}
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">共{vCount}个变体</div>
                      </div>
                      <details className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/50 px-2 py-1.5">
                        <summary className="cursor-pointer list-none text-center text-[10px] text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
                          变体与 AI 生图
                        </summary>
                        <div className="mt-2 space-y-2 pb-2">
                          {pr.variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)]/50 p-1.5"
                            >
                              <span className="max-w-[5rem] truncate text-[10px] text-[var(--color-text-muted)]">
                                {v.label}
                              </span>
                              {v.imageDataUrl ? (
                                <img src={v.imageDataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                              ) : null}
                              <label className="cursor-pointer text-[10px] text-[var(--color-primary)]">
                                上传
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleUploadVariant(e.target.files?.[0] ?? null, pr.id, v.id, 'prop')
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                disabled={genKey === `prop:${pr.id}:${v.id}`}
                                onClick={() => {
                                  const prompt = buildPropImagePrompt(
                                    pr,
                                    v,
                                    project.meta.styleRefSummary,
                                    project.productionDesign,
                                    {
                                      enforceGlobalStyleLock: !!project.meta.styleRefImageDataUrl?.trim(),
                                    },
                                  );
                                  void runGenerateFrame(prompt, pr.id, v.id, 'prop');
                                }}
                                className="text-[10px] text-[var(--color-primary)] disabled:opacity-50"
                              >
                                {genKey === `prop:${pr.id}:${v.id}` ? '…' : 'AI'}
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addPropVariant(pr.id)}
                            className="w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          >
                            + 道具变体
                          </button>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}

            {l2Tab === 'checklist' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'wardrobe' as const, label: '服化道·服装 (wardrobe)' },
                      { id: 'props' as const, label: '道具 (props)' },
                      { id: 'raw' as const, label: '完整 JSON' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChecklistSubTab(id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        checklistSubTab === id
                          ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                          : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {checklistSubTab === 'raw' ? (
                  <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs">
                    {JSON.stringify(project.productionDesign, null, 2)}
                  </pre>
                ) : (
                  <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs">
                    {JSON.stringify(
                      checklistSubTab === 'wardrobe'
                        ? project.productionDesign?.wardrobe ?? []
                        : project.productionDesign?.props ?? [],
                      null,
                      2,
                    )}
                  </pre>
                )}
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  默认展示服化道服装清单；道具清单与「全部道具」卡一致，可在道具页上传/生图以保证成片一致。
                </p>
              </div>
            )}
              </div>
            </div>

            {portraitEdit && project.productionDesign ? (
              <CharacterPortraitEditorModal
                onClose={() => setPortraitEdit(null)}
                characterSheet={portraitEdit.sheet}
                editIntent={portraitEdit.intent}
                storyBio={characterStoryBio(portraitEdit.sheet.name)}
                wardrobeSupplementDefault={formatWardrobeSupplementForCharacter(
                  portraitEdit.sheet.name,
                  project.productionDesign?.wardrobe,
                )}
                styleRef={project.meta.styleRefSummary}
                productionDesign={project.productionDesign}
                globalStyleReferenceFrame={project.meta.styleRefImageDataUrl}
                aspectRatio="9:16"
                portraitJob={portraitJobs[getPortraitJobKey(portraitEdit.sheet.id, portraitEdit.intent)]}
                onStartPortraitGenerate={handleStartPortraitGenerate}
                onConfirm={(imageDataUrl) => {
                  const { sheet, intent } = portraitEdit;
                  const key = getPortraitJobKey(sheet.id, intent);
                  setPortraitJobs((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });

                  // 先以 base64 写入（立即可见），再异步上传到服务端替换为持久 URL
                  const applyImage = (url: string) => {
                    setProject((p) => {
                      const list = p.characterAssets ?? [];
                      if (intent.mode === 'replace') {
                        const next = setCharacterLookNodeImage(
                          ensureCharacterLookTree(sheet),
                          intent.nodeId,
                          url,
                        );
                        return {
                          ...p,
                          characterAssets: list.map((c) => (c.id === next.id ? next : c)),
                        };
                      }
                      const s0 = ensureCharacterLookTree(sheet);
                      const children = (s0.lookTree ?? []).filter((n) => n.parentId === intent.parentNodeId);
                      const label = `变体 ${children.length + 1}`;
                      const next = addCharacterLookBranch(s0, intent.parentNodeId, label, url);
                      return {
                        ...p,
                        characterAssets: list.map((c) => (c.id === next.id ? next : c)),
                      };
                    });
                  };

                  // 1. 立刻用 base64 显示
                  applyImage(imageDataUrl);
                  setPortraitEdit(null);

                  // 2. 后台上传到服务端，成功后替换 URL（避免 localStorage 爆炸）
                  if (imageDataUrl.startsWith('data:')) {
                    const mime = imageDataUrl.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
                    uploadProductionImage(imageDataUrl, mime, sheet.name)
                      .then(({ url }) => applyImage(url))
                      .catch((e) => console.warn('[portrait upload]', e));
                  }
                }}
              />
            ) : null}

            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface-elevated)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                <span className="mr-1.5 inline-block text-[var(--color-primary)]" aria-hidden>
                  ◆
                </span>
                角色、场景与关键道具会应用到后续分镜与成片，建议定妆、场景图与道具图确认后再继续。
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <label className="text-xs text-[var(--color-text-muted)]">
                分镜总时长上限（秒）
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={maxTotalDurationSec}
                  onChange={(e) => setMaxTotalDurationSec(Number(e.target.value) || 60)}
                  className="mt-1 block w-28 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={busyL3}
                onClick={() => void handleL3()}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyL3 ? '生成中…' : '生成分镜表'}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              分镜表会尽量让 L1 中<strong className="text-[var(--color-text)]">每一个场景 id</strong>
              至少在某一镜出现（与「全部场景」定帧对应）。若你增删过故事场景，请重新点「生成分镜表」以同步。
            </p>
          </div>
        )}

        {/* Step 3 分镜（三栏 + 底条） */}
        {step === 3 && project.shots.length > 0 && shot && (
          <div className="flex flex-col gap-4">
            <div className="flex min-h-[480px] flex-col gap-4 lg:flex-row">
              {/* 左侧资产 */}
              <aside className="w-full shrink-0 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 lg:w-52">
                <div className="text-xs font-semibold text-[var(--color-text)]">角色</div>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {chSheets.map((ch) => {
                    const thumb = getCharacterLookImage(ensureCharacterLookTree(ch));
                    const autoMatchId = shot ? autoMatchCharacterStateBySheet(ch, [shot.action, shot.subject, shot.emotion, shot.notes].filter(Boolean).join(' ')) : null;
                    const effectiveStateId = shot?.characterStateOverrides?.[ch.id] ?? autoMatchId;
                    const effectiveState = ch.states?.find((s) => s.id === effectiveStateId);
                    const isManual = !!shot?.characterStateOverrides?.[ch.id];
                    return (
                    <div key={ch.id} className="w-16 text-center">
                      <div className="mx-auto h-14 w-14 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                            —
                          </div>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-[var(--color-text)]">{ch.name}</div>
                      {ch.states && ch.states.length > 0 && shot ? (
                        <div className="mt-0.5 flex flex-col items-center gap-0.5">
                          <span className="text-[9px] leading-tight text-[var(--color-text-muted)]">
                            {effectiveState ? (
                              <span className={isManual ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}>
                                {isManual ? '✎ ' : '⚡ '}{effectiveState.label}
                              </span>
                            ) : (
                              <span>未匹配</span>
                            )}
                          </span>
                          <select
                            className="w-full rounded border border-[var(--color-border)]/50 bg-transparent px-0.5 text-[9px] text-[var(--color-text)]"
                            value={effectiveStateId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const newOverrides = { ...(shot.characterStateOverrides ?? {}), [ch.id]: v };
                              if (!v) delete newOverrides[ch.id];
                              patchShot(selectedShotIdx, { characterStateOverrides: newOverrides });
                            }}
                          >
                            <option value="">（自动）</option>
                            {ch.states.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                </div>
                <div className="text-xs font-semibold text-[var(--color-text)]">场景</div>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {scSheets.map((sc) => (
                    <div key={sc.id} className="w-20 text-center">
                      <div className="h-12 w-full overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                        {sc.variants[0]?.imageDataUrl ? (
                          <img src={sc.variants[0].imageDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px]">—</div>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[10px] text-[var(--color-text)]">{sc.name}</div>
                    </div>
                  ))}
                </div>
              </aside>

              {/* 中间分镜（可编辑） */}
              <main className="min-w-0 flex-1 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                <div className="text-xs text-[var(--color-text-muted)]">
                  全局风格：{project.meta.styleRefSummary.slice(0, 120)}
                  {project.meta.styleRefSummary.length > 120 ? '…' : ''}
                </div>
                {storySceneCoverage && storySceneCoverage.total > 0 ? (
                  <div
                    className={`rounded-lg border px-3 py-2 text-[11px] leading-snug ${
                      storySceneCoverage.hit < storySceneCoverage.total
                        ? 'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100'
                        : 'border-[var(--color-border)]/80 bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <span className="font-medium text-[var(--color-text)]">L1 场景覆盖：</span>
                    {storySceneCoverage.hit}/{storySceneCoverage.total} 个地点已在分镜中出现（sceneRef）。
                    {storySceneCoverage.hit < storySceneCoverage.total && storySceneCoverage.missingLabels.length > 0 ? (
                      <span>
                        {' '}
                        尚未安排镜头：
                        {storySceneCoverage.missingLabels.join('、')}。请回到上一步重新点击「生成分镜表」以拉齐（服务端已要求模型全覆盖）。
                      </span>
                    ) : (
                      <span> 与故事里的场景规划一致。</span>
                    )}
                  </div>
                ) : null}
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">
                      分镜 {shot.shotIndex}
                    </h3>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {computeShotRefTags(shot, chSheets, scSheets).join(' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    修改后需重新「组装各镜 Prompt」导出才会更新。
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    分镜静帧：服务端 Compass / Gemini 图像（Imagen）；分镜视频：默认即梦 CLI。「全能参考」按本镜文案匹配角色名并附带当前场景卡参考图，prompt 内 @图片1… 与上传顺序一致（最多 9 张）。
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3 text-[10px]">
                    <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
                      分镜视频（即梦）
                      <select
                        value={project.meta.shotVideoDreaminaModel ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProject((p) => ({
                            ...p,
                            meta: {
                              ...p.meta,
                              shotVideoDreaminaModel: v ? v : undefined,
                            },
                          }));
                        }}
                        className="mt-0.5 max-w-[240px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
                      >
                        <option value="">自动（有静帧→图生，无→文生）</option>
                        <option value="dreamina-multimodal">即梦·全能参考（角色/场景图 + @图片1…）</option>
                        <option value="dreamina-image2video">即梦·图生视频</option>
                        <option value="dreamina-text2video">即梦·文生视频</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5 text-[var(--color-text-muted)]">
                      Seedance 版本（--model-version）
                      <select
                        value={project.meta.dreaminaModelVersion ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProject((p) => ({
                            ...p,
                            meta: { ...p.meta, dreaminaModelVersion: v ? v : undefined },
                          }));
                        }}
                        className="mt-0.5 max-w-[260px] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text)]"
                      >
                        <option value="">默认（读服务端 DREAMINA_*_MODEL）</option>
                        <option value="seedance2.0">seedance2.0（全模态）</option>
                        <option value="seedance2.0fast">seedance2.0fast（极速）</option>
                      </select>
                    </label>
                  </div>

                  {project.meta.shotVideoDreaminaModel === 'dreamina-multimodal' && shot && multimodalRefPack ? (
                    <div className="mt-3 space-y-2 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] p-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--color-text)]">
                          全能参考 · 素材与 @图片 对应
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          正文会自动在首次出现的人名/场景名后插入 @图片n；龙一与龙一的父亲会分别绑定。可继续微调全文。
                        </span>
                      </div>
                      {multimodalRefPack.multimodalImages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {multimodalRefPack.multimodalImages.map((img, i) => (
                            <div
                              key={`${shot.shotIndex}-mm-${i}`}
                              className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 pl-1.5 pr-2"
                            >
                              <span className="shrink-0 rounded-md bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                @图片{i + 1}
                              </span>
                              <img
                                src={`data:${img.mimeType || 'image/png'};base64,${img.base64}`}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
                              />
                              <span className="min-w-0 truncate text-[11px] text-[var(--color-text)]">
                                {multimodalRefPack.labels[i] ?? `素材 ${i + 1}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100">
                          当前未匹配到任何带图素材。请在本镜主体/对白中写明角色名或父亲/母亲等称谓，并为角色卡、场景卡生成参考图。
                        </div>
                      )}
                      <label className="block">
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          将发送给即梦的完整 Prompt（与左侧资产顺序一致；勿改 @图片 编号与素材顺序的对应关系）
                        </span>
                        <textarea
                          rows={9}
                          value={shot.videoStoryboardOverride ?? multimodalAutoPrompt}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchShot(selectedShotIdx, {
                              videoStoryboardOverride: v === '' ? undefined : v,
                            });
                          }}
                          spellCheck={false}
                          className="mt-1.5 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-2 font-mono text-[11px] leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => patchShot(selectedShotIdx, { videoStoryboardOverride: undefined })}
                        className="text-[11px] text-[var(--color-primary)] hover:underline"
                      >
                        恢复自动拼接
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={shotMediaBusy === 'frame' || !project.productionDesign}
                      onClick={() => void handleGenerateShotFrame()}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {shotMediaBusy === 'frame' ? '分镜图生成中…' : '生成分镜图'}
                    </button>
                    <button
                      type="button"
                      disabled={shotMediaBusy === 'video'}
                      onClick={() => void handleGenerateShotVideo()}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] disabled:opacity-50"
                    >
                      {shotMediaBusy === 'video' ? '视频生成中…' : '生成分镜视频'}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-[100px_1fr]">
                    <div className="text-xs text-[var(--color-text-muted)]">参考</div>
                    <div className="flex gap-2">
                      {scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)?.variants[0]
                        ?.imageDataUrl ? (
                        <img
                          src={
                            scSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef)!
                              .variants[0].imageDataUrl
                          }
                          alt=""
                          className="h-16 w-28 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
                          场景
                        </div>
                      )}
                    </div>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                      <span className="block sm:shrink-0">时长（秒）</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={shot.durationSec}
                        onChange={(e) =>
                          patchShot(selectedShotIdx, { durationSec: Number(e.target.value) || 1 })
                        }
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                      <span className="block sm:shrink-0">场景 ref</span>
                      <input
                        list="production-scene-refs"
                        value={shot.sceneRef}
                        onChange={(e) => patchShot(selectedShotIdx, { sceneRef: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 font-mono text-sm"
                      />
                      <datalist id="production-scene-refs">
                        {scSheets.map((sc) => (
                          <option key={sc.id} value={sc.sceneRef ?? sc.id} label={sc.name} />
                        ))}
                      </datalist>
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                      <span className="block sm:shrink-0">景别</span>
                      <input
                        value={shot.shotScale}
                        onChange={(e) => patchShot(selectedShotIdx, { shotScale: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                      <span className="block sm:shrink-0">运镜</span>
                      <input
                        value={shot.cameraMove}
                        onChange={(e) => patchShot(selectedShotIdx, { cameraMove: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-center sm:gap-3">
                      <span className="block sm:shrink-0">镜头质感</span>
                      <input
                        value={shot.lensFeel}
                        onChange={(e) => patchShot(selectedShotIdx, { lensFeel: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">主体</span>
                      <input
                        value={shot.subject}
                        onChange={(e) => patchShot(selectedShotIdx, { subject: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">动作</span>
                      <textarea
                        value={shot.action}
                        onChange={(e) => patchShot(selectedShotIdx, { action: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">构图</span>
                      <textarea
                        value={shot.composition}
                        onChange={(e) => patchShot(selectedShotIdx, { composition: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">光线</span>
                      <textarea
                        value={shot.lighting}
                        onChange={(e) => patchShot(selectedShotIdx, { lighting: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">对白</span>
                      <textarea
                        value={shot.dialogue}
                        onChange={(e) => patchShot(selectedShotIdx, { dialogue: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">声音提示</span>
                      <input
                        value={shot.audioCue}
                        onChange={(e) => patchShot(selectedShotIdx, { audioCue: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">情绪</span>
                      <input
                        value={shot.emotion}
                        onChange={(e) => patchShot(selectedShotIdx, { emotion: e.target.value })}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">衔接</span>
                      <textarea
                        value={shot.continuity}
                        onChange={(e) => patchShot(selectedShotIdx, { continuity: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)] sm:col-span-2 sm:grid sm:grid-cols-[100px_1fr] sm:items-start sm:gap-3">
                      <span className="block pt-1.5 sm:shrink-0">备注</span>
                      <textarea
                        value={shot.notes}
                        onChange={(e) => patchShot(selectedShotIdx, { notes: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                  <details className="mt-4 rounded border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] p-3 text-xs">
                    <summary className="cursor-pointer font-medium text-[var(--color-text)]">
                      结构化 Prompt（静帧 / 运动）
                    </summary>
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          ['sp_subject', '主体'],
                          ['sp_environment', '环境'],
                          ['sp_style', '风格'],
                          ['sp_lighting', '光线'],
                          ['sp_camera', '机位'],
                          ['sp_composition', '构图'],
                          ['sp_continuity', '连续'],
                          ['sp_negative', '规避'],
                        ] as const
                      ).map(([k, lab]) => (
                        <label key={k} className="block">
                          <span className="text-[var(--color-text-muted)]">{lab}</span>
                          <textarea
                            value={shot.structuredStill[k as keyof typeof shot.structuredStill] as string}
                            onChange={(e) =>
                              patchShot(selectedShotIdx, {
                                structuredStill: {
                                  ...shot.structuredStill,
                                  [k]: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
                          />
                        </label>
                      ))}
                      {(
                        [
                          ['mp_motion', '运动'],
                          ['mp_camera', '摄影机'],
                          ['mp_tempo', '节奏'],
                          ['mp_transition', '衔接'],
                          ['mp_audio', '声画'],
                        ] as const
                      ).map(([k, lab]) => (
                        <label key={k} className="block">
                          <span className="text-[var(--color-text-muted)]">{lab}</span>
                          <textarea
                            value={shot.structuredMotion[k as keyof typeof shot.structuredMotion] as string}
                            onChange={(e) =>
                              patchShot(selectedShotIdx, {
                                structuredMotion: {
                                  ...shot.structuredMotion,
                                  [k]: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              </main>

              {/* 右侧：本镜分镜图 / 分镜视频预览 */}
              <aside className="w-full shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 lg:w-72">
                <div className="text-xs font-medium text-[var(--color-text)]">本镜预览</div>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  分镜图由 Imagen 生成；分镜视频走平台视频接口（依赖后端配置）。预览保存在本地草稿。
                </p>
                {shot.previewStillDataUrl ? (
                  <div className="mt-3">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)]">分镜静帧</div>
                    <img
                      src={shot.previewStillDataUrl}
                      alt=""
                      className="mt-1 max-h-48 w-full rounded-lg border border-[var(--color-border)] object-contain"
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">暂无分镜图，点击「生成分镜图」。</p>
                )}
                {shot.previewVideoUrl ? (
                  <div className="mt-3">
                    <div className="text-[10px] font-medium text-[var(--color-text-muted)]">分镜视频</div>
                    <video
                      src={
                        /^https?:\/\//i.test(shot.previewVideoUrl)
                          ? klingVideoProxyUrl(shot.previewVideoUrl)
                          : shot.previewVideoUrl
                      }
                      controls
                      playsInline
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)]"
                    />
                  </div>
                ) : null}
              </aside>
            </div>

            {/* 底栏镜头条 */}
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
              <div className="flex min-w-min gap-2">
                {project.shots.map((s, idx) => (
                  <button
                    key={s.shotIndex}
                    type="button"
                    onClick={() => setSelectedShotIdx(idx)}
                    className={`w-24 shrink-0 rounded-lg border p-1 text-left transition-colors ${
                      selectedShotIdx === idx
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div className="aspect-video w-full overflow-hidden rounded bg-[var(--color-surface-hover)]">
                      {s.previewStillDataUrl ? (
                        <img src={s.previewStillDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : scSheets.find((sc) => sc.sceneRef === s.sceneRef)?.variants[0]?.imageDataUrl ? (
                        <img
                          src={scSheets.find((sc) => sc.sceneRef === s.sceneRef)!.variants[0].imageDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="mt-1 truncate px-1 text-[10px] text-[var(--color-text)]">
                      #{s.shotIndex} {s.durationSec}s
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="self-start rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
            >
              进入导出
            </button>
          </div>
        )}

        {/* Step 4 导出 */}
        {step === 4 && (
          <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
            <h2 className="text-sm font-semibold">Prompt 与一致性</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              可选：上传一张主角参考图提取视觉特征；再组装各镜 Seedance 块。
            </p>
            <input
              type="file"
              accept="image/*"
              disabled={busyVis}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {busyVis && <p className="text-xs text-[var(--color-text-muted)]">分析中…</p>}
            {project.characterVisualProfile && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs">
                <strong>一致性：</strong>
                {project.characterVisualProfile.consistencySnippet}
              </div>
            )}
            <button
              type="button"
              disabled={busyAsm || !project.shots.length}
              onClick={() => void handleAssemble()}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busyAsm ? '组装中…' : '组装各镜 Prompt'}
            </button>
            {project.assembled && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={copyAllSeedance}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
                >
                  复制全部 Seedance 块
                </button>
                <div className="max-h-96 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs">
                  {project.assembled.shots.map((s) => (
                    <div key={s.shotIndex} className="mb-4 border-b border-[var(--color-border)]/50 pb-4 last:border-0">
                      <div className="font-semibold text-[var(--color-text)]">镜 {s.shotIndex}</div>
                      <div className="mt-1 whitespace-pre-wrap text-[var(--color-text-muted)]">{s.seedanceBlock}</div>
                    </div>
                  ))}
                </div>
                <Link to="/studio" className="inline-block text-sm text-[var(--color-primary)] hover:underline">
                  去 Studio 创作 →
                </Link>
              </div>
            )}
          </section>
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
        </div>
      </div>

      {/* 底栏 */}
      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{footerHint}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
            >
              上一步
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={step >= STEPS.length - 1}
              className="rounded-lg bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-surface)] disabled:opacity-40"
            >
              下一步
            </button>
          </div>
        </div>
      </footer>

      {/* 项目列表弹窗 */}
      {showProjectList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--color-text)]">已保存的项目</h2>
              <button
                type="button"
                onClick={() => setShowProjectList(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            </div>
            {projectList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">暂无已保存项目</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {projectList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void handleLoadServerProject(p.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-hover)] transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{p.title || '未命名项目'}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        步骤 {p.step + 1} · {p.updatedAt ? new Date(p.updatedAt).toLocaleString('zh-CN') : ''}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--color-primary)]">加载 →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
