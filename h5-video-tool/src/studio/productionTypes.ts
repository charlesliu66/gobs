/** 与 h5-video-tool-api studioPipeline 对齐 */

export type StructureTemplate = 'three_act' | 'five_act' | 'save_the_cat';

export interface StoryBeat {
  id: string;
  label: string;
  storyPercent: number;
  description: string;
}

export interface StoryAct {
  index: number;
  title: string;
  summary: string;
  beatIds: string[];
}

export interface EmotionPoint {
  t: number;
  emotion: number;
  note?: string;
}

export interface StoryCharacter {
  name: string;
  goal: string;
  conflict: string;
  arc?: string;
  role?: 'protagonist' | 'supporting' | 'antagonist' | 'other';
}

export interface ScenePlanItem {
  id: string;
  name: string;
  purpose: string;
  relatedBeatIds?: string[];
}

export interface StoryImportantProp {
  name: string;
  notes?: string;
}

export interface StoryArcLayer {
  structureTemplate: StructureTemplate;
  logline: string;
  synopsis: string;
  acts: StoryAct[];
  beats: StoryBeat[];
  emotionCurve: EmotionPoint[];
  pacingNotes: string;
  characters: StoryCharacter[];
  scenePlan: ScenePlanItem[];
  importantProps?: StoryImportantProp[];
}

export interface WardrobeItem {
  character: string;
  item: string;
  notes?: string;
}

export interface PropItem {
  name: string;
  sceneRef?: string;
  notes?: string;
}

export interface SetDesignItem {
  sceneId: string;
  description: string;
  palette?: string;
}

export interface LightingPlanItem {
  sceneId?: string;
  key: string;
  fill?: string;
  mood: string;
}

export interface SoundMusicPlan {
  sfx: { moment: string; idea: string }[];
  music: { segment: string; mood: string; bpm?: number }[];
}

export interface ProductionDesignLayer {
  wardrobe: WardrobeItem[];
  props: PropItem[];
  sets: SetDesignItem[];
  lighting: LightingPlanItem[];
  colorGrading: string;
  soundMusic: SoundMusicPlan;
}

export interface StructuredPromptStill {
  sp_subject: string;
  sp_environment: string;
  sp_style: string;
  sp_lighting: string;
  sp_camera: string;
  sp_composition: string;
  sp_continuity: string;
  sp_negative: string;
}

export interface StructuredPromptMotion {
  mp_motion: string;
  mp_camera: string;
  mp_tempo: string;
  mp_transition: string;
  mp_audio: string;
}

export interface ProductionShotVideoVersion {
  id: string;
  taskId: string;
  createdAt: number;
  videoUrl?: string;
  videoPath?: string;
}

export interface ProductionShot {
  shotIndex: number;
  durationSec: number;
  sceneRef: string;
  shotScale: string;
  cameraMove: string;
  lensFeel: string;
  subject: string;
  action: string;
  composition: string;
  lighting: string;
  emotion: string;
  continuity: string;
  dialogue: string;
  audioCue: string;
  notes: string;
  structuredStill: StructuredPromptStill;
  structuredMotion: StructuredPromptMotion;
  /** 本镜分镜静帧预览（data URL，前端生成缓存） */
  previewStillDataUrl?: string;
  /** 本镜分镜视频预览（data URL 或同域可播 URL） */
  previewVideoUrl?: string;
  /** 服务端 output 相对路径（如 output/xxx.mp4），与 previewVideoUrl 二选一优先；刷新后仍可通过 /api/video/file 播放 */
  previewVideoPath?: string;
  /** 同镜头多次生成时的版本列表（按 createdAt 排序） */
  previewVideoVersions?: ProductionShotVideoVersion[];
  /** 当前保留/展示的视频版本 id */
  selectedPreviewVideoVersionId?: string;
  /**
   * 当分镜视频正在由即梦生成时，保存 submitId 以便页面刷新后自动恢复轮询。
   * 生成完成（成功或失败）后清空。
   */
  pendingVideoSubmitId?: string;
  /**
   * 仅当分镜视频模式为「全能参考 dreamina-multimodal」时有效：覆盖发给接口的 storyboardText。
   * 未设置时使用自动拼接（结构化叙事 + @图片 说明行）。
   */
  videoStoryboardOverride?: string;
  /**
   * 每个角色的手动状态覆盖：charId → stateId
   * 未设置时由 autoMatchCharacterStateBySheet 自动推断
   */
  characterStateOverrides?: Record<string, string>;
  /**
   * 手动覆盖全能参考的素材列表（角色/场景/道具 sheetId 数组）。
   * undefined = 全部自动；[] = 不引用任何；[id1,id2] = 只引用这些。
   */
  manualRefOverrides?: {
    characterIds?: string[];
    sceneId?: string | null;
    propIds?: string[];
  };
}

export interface CharacterVisualProfile {
  silhouette: string;
  faceHair: string;
  costume: string;
  props: string;
  palette: string;
  styleKeywords: string[];
  consistencySnippet: string;
}

/** 风格参考图反解析（与后端 StyleReferenceAnalysis 一致） */
export interface StyleReferenceAnalysis {
  styleRefSummary: string;
  palette: string;
  lighting: string;
  composition: string;
  cameraAndLens: string;
  eraGenre: string;
  medium: string;
  keywords: string[];
  negativeHints?: string;
  promptSnippet?: string;
}

export interface AssembledShotPrompt {
  shotIndex: number;
  seedanceBlock: string;
  klingPrompt: string;
  nanoBananaStyle: string;
}

export interface AssemblePromptsResult {
  shots: AssembledShotPrompt[];
}

export interface ProductionProjectMeta {
  title: string;
  styleRefSummary: string;
  targetPlatform: 'seedance' | 'kling' | 'veo';
  /** 上传参考图反解析后的结构化结果（可选） */
  styleRefAnalysis?: StyleReferenceAnalysis;
  /**
   * 立项时上传的画风参考图（data URL）。用于分镜生图 API 的 globalStyleReferenceFrame，
   * 全片锁定影调/质感；体积较大，若 localStorage 配额不足可清空后重新上传。
   */
  styleRefImageDataUrl?: string;
  /** 画面比例：分镜生图与参考 */
  aspectRatio?: string;
  /**
   * 分镜预览视频：即梦 CLI 模型（与 /api/video/generate 一致）。
   * 空则按是否有分镜静帧自动选：有图 → dreamina-image2video，无图 → dreamina-text2video。
   * dreamina-multimodal：Seedance 全能参考，多图 + prompt 内 @图片1…（与 multimodalImages 顺序一致）。
   */
  shotVideoDreaminaModel?: string;
  /**
   * 即梦 CLI `--model-version`：dreamina-cli-skill 仅支持 seedance2.0、seedance2.0fast（与 Studio「VIP」名无对应枚举）。
   * 空则使用服务端环境变量 DREAMINA_TEXT2VIDEO_MODEL / DREAMINA_IMAGE2VIDEO_MODEL。
   */
  dreaminaModelVersion?: string;
}

export interface AssetVariant {
  id: string;
  label: string;
  imageDataUrl?: string;
}

/** 形象演化树节点（多分支版本，父 → 子为迭代关系） */
export interface CharacterLookNode {
  id: string;
  /** 根节点为 null */
  parentId: string | null;
  label: string;
  imageDataUrl?: string;
  note?: string;
}

/**
 * 角色状态衣橱：每个状态代表角色在不同情境下的形象（日常、战斗、受伤等）。
 * 生成时以 baseImageDataUrl（基础形象）作为一致性参考。
 */
export interface CharacterState {
  id: string;
  /** 状态名称，如「日常装束」「战斗装束」「受伤状态」 */
  label: string;
  imageDataUrl?: string;
  /** 生成这个状态用的差异描述（叠加在基础形象描述上） */
  statePrompt?: string;
  /** 备注 */
  notes?: string;
}

/** 预设状态模板 */
export const CHARACTER_STATE_PRESETS: Record<string, string[]> = {
  短剧古装: ['日常装束', '正式场合', '战斗装束', '哭戏状态', '受伤状态'],
  现代都市: ['日常装束', '职场着装', '约会造型', '运动装束'],
  游戏角色: ['普通状态', '技能释放', '受击状态', '胜利姿态'],
  自定义: [],
};

export interface CharacterSheet {
  id: string;
  name: string;
  isProtagonist?: boolean;
  variants: AssetVariant[];
  /** 形象树：存在时以树为准；variants 由树拍平同步，供旧逻辑兼容 */
  lookTree?: CharacterLookNode[];
  /** 当前定稿形象（分镜/主图引用） */
  activeLookId?: string;
  /** ── 状态衣橱（新）────────────────────────────────── */
  /** 基础形象：所有状态生成的参考基准，必须先确认才能生成其他状态 */
  baseImageDataUrl?: string;
  /** 基础形象已确认（确认后才开放其他状态生成） */
  baseConfirmed?: boolean;
  /** 各情景状态列表 */
  states?: CharacterState[];
  /** 当前分镜默认引用的状态 id（空=用基础形象） */
  activeStateId?: string;
}

export interface SceneSheet {
  id: string;
  name: string;
  sceneRef: string;
  variants: AssetVariant[];
}

/** L2：关键道具卡与变体图（与制作清单 props 对齐） */
export interface PropSheet {
  id: string;
  /** 与制作清单 PropItem.name 一致 */
  name: string;
  sceneRef?: string;
  notes?: string;
  variants: AssetVariant[];
}

export interface ProductionProject {
  schemaVersion: '1.0.0';
  meta: ProductionProjectMeta;
  story: StoryArcLayer | null;
  productionDesign: ProductionDesignLayer | null;
  shots: ProductionShot[];
  characterVisualProfile: CharacterVisualProfile | null;
  assembled: AssemblePromptsResult | null;
  /** L2：角色卡与多状态图 */
  characterAssets?: CharacterSheet[];
  /** L2：场景卡与变体图 */
  sceneAssets?: SceneSheet[];
  /** L2：关键道具卡与变体图 */
  propAssets?: PropSheet[];
}

export const PRODUCTION_STORAGE_KEY = 'h5-production-project-v1';

export function emptyProductionProject(): ProductionProject {
  return {
    schemaVersion: '1.0.0',
    meta: {
      title: '',
      styleRefSummary: '',
      targetPlatform: 'seedance',
      aspectRatio: '16:9',
      shotVideoDreaminaModel: 'dreamina-multimodal',
      dreaminaModelVersion: 'seedance2.0',
    },
    story: null,
    productionDesign: null,
    shots: [],
    characterVisualProfile: null,
    assembled: null,
    characterAssets: [],
    sceneAssets: [],
    propAssets: [],
  };
}
