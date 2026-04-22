/** 涓?h5-video-tool-api studioPipeline 瀵归綈 */

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
  sourceProjectId?: string;
  sourceShotIndex?: number;
  batchJobId?: string;
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
  /** 鏈暅鍒嗛暅闈欏抚棰勮锛坉ata URL锛屽墠绔敓鎴愮紦瀛橈級 */
  previewStillDataUrl?: string;
  /** 鏈暅鍒嗛暅瑙嗛棰勮锛坉ata URL 鎴栧悓鍩熷彲鎾?URL锛?*/
  previewVideoUrl?: string;
  /** 鏈嶅姟绔?output 鐩稿璺緞锛堝 output/xxx.mp4锛夛紝涓?previewVideoUrl 浜岄€変竴浼樺厛锛涘埛鏂板悗浠嶅彲閫氳繃 /api/video/file 鎾斁 */
  previewVideoPath?: string;
  /** 鍚岄暅澶村娆＄敓鎴愭椂鐨勭増鏈垪琛紙鎸?createdAt 鎺掑簭锛?*/
  previewVideoVersions?: ProductionShotVideoVersion[];
  /** 褰撳墠淇濈暀/灞曠ず鐨勮棰戠増鏈?id */
  selectedPreviewVideoVersionId?: string;
  /**
   * 褰撳垎闀滆棰戞鍦ㄧ敱鍗虫ⅵ鐢熸垚鏃讹紝淇濆瓨 submitId 浠ヤ究椤甸潰鍒锋柊鍚庤嚜鍔ㄦ仮澶嶈疆璇€?   * 鐢熸垚瀹屾垚锛堟垚鍔熸垨澶辫触锛夊悗娓呯┖銆?   */
  pendingVideoSubmitId?: string;
  /**
   * 鏈€杩戜竴娆¤棰戠敓鎴愬け璐ョ殑鍘熷洜涓庡嚭閿?submitId锛堝悗绔?batch-job 澶辫触鏃跺啓鍥烇級銆?   * UI 鐢ㄤ簬灞曠ず"澶辫触 + 鍙噸璇?锛岃€屼笉鏄户缁崱鍦?鎻愪氦涓?銆?   * 鐢ㄦ埛鍐嶆鐐瑰嚮鐢熸垚鎴愬姛鍚庝細琚鐩栵紱鎷垮埌鏂拌棰戞椂鍙繚鐣欎篃鍙竻绌猴紙鍓嶇瀹归敊澶勭悊锛夈€?   */
  lastVideoError?: {
    submitId?: string;
    jobId?: string;
    cancelled?: boolean;
    reason: string;
    at: string;
  };
  /**
   * 浠呭綋鍒嗛暅瑙嗛妯″紡涓恒€屽叏鑳藉弬鑰?dreamina-multimodal銆嶆椂鏈夋晥锛氳鐩栧彂缁欐帴鍙ｇ殑 storyboardText銆?   * 鏈缃椂浣跨敤鑷姩鎷兼帴锛堢粨鏋勫寲鍙欎簨 + @鍥剧墖 璇存槑琛岋級銆?   */
  videoStoryboardOverride?: string;
  /**
   * 姣忎釜瑙掕壊鐨勬墜鍔ㄧ姸鎬佽鐩栵細charId 鈫?stateId
   * 鏈缃椂鐢?autoMatchCharacterStateBySheet 鑷姩鎺ㄦ柇
   */
  characterStateOverrides?: Record<string, string>;
  /**
   * 鎵嬪姩瑕嗙洊鍏ㄨ兘鍙傝€冪殑绱犳潗鍒楄〃锛堣鑹?鍦烘櫙/閬撳叿 sheetId 鏁扮粍锛夈€?   * undefined = 鍏ㄩ儴鑷姩锛沎] = 涓嶅紩鐢ㄤ换浣曪紱[id1,id2] = 鍙紩鐢ㄨ繖浜涖€?   */
  manualRefOverrides?: {
    characterIds?: string[];
    sceneId?: string | null;
    propIds?: string[];
  };
}

export function hasProductionShotPreviewMedia(shot: Pick<
  ProductionShot,
  'previewVideoUrl' | 'previewVideoPath' | 'previewVideoVersions'
>): boolean {
  if (shot.previewVideoPath?.trim()) return true;
  if (shot.previewVideoUrl?.trim()) return true;
  if (!Array.isArray(shot.previewVideoVersions)) return false;
  return shot.previewVideoVersions.some((version) => !!(version?.videoPath?.trim() || version?.videoUrl?.trim()));
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

/** 椋庢牸鍙傝€冨浘鍙嶈В鏋愶紙涓庡悗绔?StyleReferenceAnalysis 涓€鑷达級 */
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
  /** 涓婁紶鍙傝€冨浘鍙嶈В鏋愬悗鐨勭粨鏋勫寲缁撴灉锛堝彲閫夛級 */
  styleRefAnalysis?: StyleReferenceAnalysis;
  /**
   * 绔嬮」鏃朵笂浼犵殑鐢婚鍙傝€冨浘锛坉ata URL锛夈€傜敤浜庡垎闀滅敓鍥?API 鐨?globalStyleReferenceFrame锛?   * 鍏ㄧ墖閿佸畾褰辫皟/璐ㄦ劅锛涗綋绉緝澶э紝鑻?localStorage 閰嶉涓嶈冻鍙竻绌哄悗閲嶆柊涓婁紶銆?   */
  styleRefImageDataUrl?: string;
  /** 鐢婚潰姣斾緥锛氬垎闀滅敓鍥句笌鍙傝€?*/
  aspectRatio?: string;
  /**
   * 鍒嗛暅棰勮瑙嗛锛氬嵆姊?CLI 妯″瀷锛堜笌 /api/video/generate 涓€鑷达級銆?   * 绌哄垯鎸夋槸鍚︽湁鍒嗛暅闈欏抚鑷姩閫夛細鏈夊浘 鈫?dreamina-image2video锛屾棤鍥?鈫?dreamina-text2video銆?   * dreamina-multimodal锛歋eedance 鍏ㄨ兘鍙傝€冿紝澶氬浘 + prompt 鍐?@鍥剧墖1鈥︼紙涓?multimodalImages 椤哄簭涓€鑷达級銆?   */
  shotVideoDreaminaModel?: string;
  /**
   * 鍗虫ⅵ CLI `--model-version`锛歞reamina-cli-skill 浠呮敮鎸?seedance2.0銆乻eedance2.0fast锛堜笌 Studio銆孷IP銆嶅悕鏃犲搴旀灇涓撅級銆?   * 绌哄垯浣跨敤鏈嶅姟绔幆澧冨彉閲?DREAMINA_TEXT2VIDEO_MODEL / DREAMINA_IMAGE2VIDEO_MODEL銆?   */
  dreaminaModelVersion?: string;
}

export interface AssetVariant {
  id: string;
  label: string;
  imageDataUrl?: string;
}

/** 褰㈣薄婕斿寲鏍戣妭鐐癸紙澶氬垎鏀増鏈紝鐖?鈫?瀛愪负杩唬鍏崇郴锛?*/
export interface CharacterLookNode {
  id: string;
  /** 鏍硅妭鐐逛负 null */
  parentId: string | null;
  label: string;
  imageDataUrl?: string;
  note?: string;
}

/**
 * 瑙掕壊鐘舵€佽。姗憋細姣忎釜鐘舵€佷唬琛ㄨ鑹插湪涓嶅悓鎯呭涓嬬殑褰㈣薄锛堟棩甯搞€佹垬鏂椼€佸彈浼ょ瓑锛夈€? * 鐢熸垚鏃朵互 baseImageDataUrl锛堝熀纭€褰㈣薄锛変綔涓轰竴鑷存€у弬鑰冦€? */
export interface CharacterState {
  id: string;
  /** 鐘舵€佸悕绉帮紝濡傘€屾棩甯歌鏉熴€嶃€屾垬鏂楄鏉熴€嶃€屽彈浼ょ姸鎬併€?*/
  label: string;
  imageDataUrl?: string;
  /** 鐢熸垚杩欎釜鐘舵€佺敤鐨勫樊寮傛弿杩帮紙鍙犲姞鍦ㄥ熀纭€褰㈣薄鎻忚堪涓婏級 */
  statePrompt?: string;
  /** 澶囨敞 */
  notes?: string;
}

/** 棰勮鐘舵€佹ā鏉匡紙甯﹂粯璁?statePrompt 宸紓鎻忚堪锛屾彁鍗?AI 鐢熸垚璐ㄩ噺锛?*/
export interface StatePresetItem {
  label: string;
  statePrompt: string;
}

export const CHARACTER_STATE_PRESETS: Record<string, StatePresetItem[]> = {
  短剧古装: [
    { label: '日常装束', statePrompt: '穿着朴素日常服饰，神态放松自然，站在日常场景中' },
    { label: '正式场合', statePrompt: '身着华丽正式礼服，头饰精致，仪态端庄，气场隆重' },
    { label: '战斗装束', statePrompt: '身着轻甲或战斗服饰，手持武器，动态战斗姿态，表情坚定' },
    { label: '哭戏状态', statePrompt: '面部悲伤，眼含泪水或泪痕，表情痛苦，情绪崩溃' },
    { label: '受伤状态', statePrompt: '身上有明显伤痕和血迹，衣物破损，表情虚弱痛苦，姿态不稳' },
  ],
  现代都市: [
    { label: '日常装束', statePrompt: '穿着休闲 T 恤和牛仔裤，姿态放松自然' },
    { label: '职场着装', statePrompt: '身着正式职业装或西装，干练专业，自信挺拔' },
    { label: '约会造型', statePrompt: '精心打扮，时尚造型，表情愉悦，散发魅力' },
    { label: '运动装束', statePrompt: '穿着运动服或健身装，动作充满活力，姿态有动感' },
  ],
  游戏角色: [
    { label: '普通状态', statePrompt: '标准站立姿态，装备齐全，表情平静' },
    { label: '技能释放', statePrompt: '释放技能的动态姿态，身体周围有能量光效，表情专注' },
    { label: '受击状态', statePrompt: '被击中后的受伤姿态，身上有伤痕，表情痛苦，防御姿势明显' },
    { label: '胜利姿态', statePrompt: '胜利庆祝姿势，表情自信骄傲，姿态张扬' },
  ],
  年龄变化: [
    { label: '童年形象', statePrompt: '同一角色的童年版本，身材较小，面容稚嫩，大眼睛，保持相同发色和瞳色特征' },
    { label: '青年形象', statePrompt: '同一角色的青年版本，面容年轻有朝气，身材匀称' },
    { label: '中年形象', statePrompt: '同一角色的中年版本，面部有岁月痕迹，身材略显成熟，眼神沉稳' },
    { label: '老年形象', statePrompt: '同一角色的老年版本，白发苍苍，面部皱纹明显，但保留相同五官特征和气质' },
  ],
  自定义: [],
};

export interface CharacterSheet {
  id: string;
  name: string;
  isProtagonist?: boolean;
  variants: AssetVariant[];
  /** 褰㈣薄鏍戯細瀛樺湪鏃朵互鏍戜负鍑嗭紱variants 鐢辨爲鎷嶅钩鍚屾锛屼緵鏃ч€昏緫鍏煎 */
  lookTree?: CharacterLookNode[];
  /** 褰撳墠瀹氱褰㈣薄锛堝垎闀?涓诲浘寮曠敤锛?*/
  activeLookId?: string;
  /** 鈹€鈹€ 鐘舵€佽。姗憋紙鏂帮級鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */
  /** 鍩虹褰㈣薄锛氭墍鏈夌姸鎬佺敓鎴愮殑鍙傝€冨熀鍑嗭紝蹇呴』鍏堢‘璁ゆ墠鑳界敓鎴愬叾浠栫姸鎬?*/
  baseImageDataUrl?: string;
  /** 鍩虹褰㈣薄宸茬‘璁わ紙纭鍚庢墠寮€鏀惧叾浠栫姸鎬佺敓鎴愶級 */
  baseConfirmed?: boolean;
  /** 鍚勬儏鏅姸鎬佸垪琛?*/
  states?: CharacterState[];
  /** 褰撳墠鍒嗛暅榛樿寮曠敤鐨勭姸鎬?id锛堢┖=鐢ㄥ熀纭€褰㈣薄锛?*/
  activeStateId?: string;
}

export interface SceneSheet {
  id: string;
  name: string;
  sceneRef: string;
  variants: AssetVariant[];
}

/** L2锛氬叧閿亾鍏峰崱涓庡彉浣撳浘锛堜笌鍒朵綔娓呭崟 props 瀵归綈锛?*/
export interface PropSheet {
  id: string;
  /** 涓庡埗浣滄竻鍗?PropItem.name 涓€鑷?*/
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
  /** L2锛氳鑹插崱涓庡鐘舵€佸浘 */
  characterAssets?: CharacterSheet[];
  /** L2锛氬満鏅崱涓庡彉浣撳浘 */
  sceneAssets?: SceneSheet[];
  /** L2锛氬叧閿亾鍏峰崱涓庡彉浣撳浘 */
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

