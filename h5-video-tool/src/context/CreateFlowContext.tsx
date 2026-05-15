import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { DriveFile } from '../hooks/useGoogleDrive';
import type { CampaignStudioHandoffState } from '../components/campaign/studioBridge.ts';

export interface ShotItem {
  duration: number;
  prompt: string;
}

/** 分镜预览图：首镜为首+尾；后续镜可含 middle（中间帧） */
export interface ShotFramePreview {
  first: string;
  last: string;
  middle?: string;
}

export interface DreaminaMultimodalItem {
  id: string;
  kind: 'image' | 'video' | 'audio';
  /** 不含 data: 前缀的 base64 */
  base64: string;
  mimeType: string;
  fileName?: string;
  /** 仅图片使用：用于自动装配即梦 Prompt 的语义标记 */
  semanticRole?: 'role' | 'scene';
}

interface CreateFlowState {
  prompt: string;
  keywords: string[];
  /** 文件夹语义提示：优先从 Scenario/Character/Weapon/Effect 等类型文件夹搜索 */
  folderHints: string[];
  selectedOrder: DriveFile[];
  storyboardText: string | null;
  videoUrl: string | null;
  /** 服务器本地路径，推送到 GeeLark 时优先使用 */
  videoPath: string | null;
  taskId: string | null;
  hasPolishedPrompt: boolean;
  hasMatchedMaterials: boolean;
  /** Pipeline 模板 ID：custom | viral-dance | boss-showcase | 空表示默认 */
  templateId: string;
  /** 多镜头模式：镜头列表，每镜含 duration(5-8)、prompt */
  shots: ShotItem[];
  /** 是否开启多镜头描述（仅 multishot 模板可用） */
  multiShotEnabled: boolean;
  /** 每镜首尾帧（及可选中间帧）预览；视频生成仍使用每镜 first 作为参考 */
  shotFrames: Record<number, ShotFramePreview>;
  /** 模板提取的人物/角色名称（保留给后续多角色模板复用） */
  characters: string[];
  /** 动作迁移：可灵 Omni 参考视频公网直链（与素材顺序 @图片1/@图片2 配合） */
  viralDanceReferenceVideoUrl: string;
  /** 即梦「全能参考」上传项（顺序对应 @图片n / @视频n / @音频n） */
  dreaminaMultimodalItems: DreaminaMultimodalItem[];
  /** Campaign -> Studio handoff context kept alive after router state is consumed. */
  campaignStudioHandoff: CampaignStudioHandoffState | null;
  /** 选中的 Veo 模型 */
  videoModel: string;
  /** Seedance 版本（如 'seedance2.0'） */
  dreaminaModelVersion: string;
  /** 比例 16:9 | 9:16 | 1:1（快速单段） */
  videoAspectRatio: string;
  /** 时长（秒），由当前 Studio 模板限定可选项 */
  videoDuration: number;
  /** 分辨率 720p | 1080p | 4k */
  videoResolution: string;
}

interface CreateFlowContextValue extends CreateFlowState {
  setPrompt: (v: string) => void;
  setKeywords: (v: string[]) => void;
  setFolderHints: (v: string[]) => void;
  setSelectedOrder: (v: DriveFile[] | ((prev: DriveFile[]) => DriveFile[])) => void;
  setStoryboardText: (v: string | null) => void;
  setVideoResult: (url: string | null, taskId: string | null, videoPath?: string | null) => void;
  setTemplateId: (v: string) => void;
  setVideoModel: (v: string) => void;
  setDreaminaModelVersion: (v: string) => void;
  setVideoAspectRatio: (v: string) => void;
  setVideoDuration: (v: number) => void;
  setVideoResolution: (v: string) => void;
  setHasPolishedPrompt: (v: boolean) => void;
  setHasMatchedMaterials: (v: boolean) => void;
  setShots: (v: ShotItem[] | ((prev: ShotItem[]) => ShotItem[])) => void;
  setMultiShotEnabled: (v: boolean) => void;
  setShotFrames: (
    v: Record<number, ShotFramePreview> | ((prev: Record<number, ShotFramePreview>) => Record<number, ShotFramePreview>),
  ) => void;
  setCharacters: (v: string[]) => void;
  setViralDanceReferenceVideoUrl: (v: string) => void;
  setDreaminaMultimodalItems: (v: DreaminaMultimodalItem[] | ((prev: DreaminaMultimodalItem[]) => DreaminaMultimodalItem[])) => void;
  setCampaignStudioHandoff: (v: CampaignStudioHandoffState | null) => void;
  clearCampaignStudioHandoff: () => void;
  resetFlow: () => void;
}

const initialState: CreateFlowState = {
  prompt: '',
  keywords: [],
  folderHints: [],
  selectedOrder: [],
  storyboardText: null,
  videoUrl: null,
  videoPath: null,
  taskId: null,
  hasPolishedPrompt: false,
  hasMatchedMaterials: false,
  templateId: '',
  multiShotEnabled: false,
  shots: [],
  videoModel: 'dreamina-multimodal',
  dreaminaModelVersion: 'seedance2.0',
  videoAspectRatio: '16:9',
  videoDuration: 5,
  videoResolution: '720p',
  shotFrames: {},
  characters: [],
  viralDanceReferenceVideoUrl: '',
  dreaminaMultimodalItems: [],
  campaignStudioHandoff: null,
};

const CreateFlowContext = createContext<CreateFlowContextValue | null>(null);

export function CreateFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreateFlowState>(initialState);

  const setPrompt = useCallback((v: string) => {
    setState((s) => ({ ...s, prompt: v }));
  }, []);

  const setKeywords = useCallback((v: string[]) => {
    setState((s) => ({ ...s, keywords: v }));
  }, []);

  const setFolderHints = useCallback((v: string[]) => {
    setState((s) => ({ ...s, folderHints: v }));
  }, []);

  const setSelectedOrder = useCallback((v: DriveFile[] | ((prev: DriveFile[]) => DriveFile[])) => {
    setState((s) => ({
      ...s,
      selectedOrder: typeof v === 'function' ? v(s.selectedOrder) : v,
    }));
  }, []);

  const setStoryboardText = useCallback((v: string | null) => {
    setState((s) => ({ ...s, storyboardText: v }));
  }, []);

  const setVideoResult = useCallback((url: string | null, taskId: string | null, videoPath?: string | null) => {
    setState((s) => ({ ...s, videoUrl: url, taskId, videoPath: videoPath ?? null }));
  }, []);

  const setTemplateId = useCallback((v: string) => {
    setState((s) => ({ ...s, templateId: v }));
  }, []);

  const setVideoModel = useCallback((v: string) => {
    setState((s) => ({ ...s, videoModel: v }));
  }, []);

  const setDreaminaModelVersion = useCallback((v: string) => {
    setState((s) => ({ ...s, dreaminaModelVersion: v }));
  }, []);

  const setVideoAspectRatio = useCallback((v: string) => {
    setState((s) => ({ ...s, videoAspectRatio: v }));
  }, []);

  const setVideoDuration = useCallback((v: number) => {
    setState((s) => ({ ...s, videoDuration: v }));
  }, []);

  const setVideoResolution = useCallback((v: string) => {
    setState((s) => ({ ...s, videoResolution: v }));
  }, []);

  const setHasPolishedPrompt = useCallback((v: boolean) => {
    setState((s) => ({ ...s, hasPolishedPrompt: v }));
  }, []);

  const setHasMatchedMaterials = useCallback((v: boolean) => {
    setState((s) => ({ ...s, hasMatchedMaterials: v }));
  }, []);

  const setShots = useCallback((v: ShotItem[] | ((prev: ShotItem[]) => ShotItem[])) => {
    setState((s) => ({
      ...s,
      shots: typeof v === 'function' ? v(s.shots) : v,
    }));
  }, []);

  const setMultiShotEnabled = useCallback((v: boolean) => {
    setState((s) => ({ ...s, multiShotEnabled: v }));
  }, []);

  const setShotFrames = useCallback(
    (v: Record<number, ShotFramePreview> | ((prev: Record<number, ShotFramePreview>) => Record<number, ShotFramePreview>)) => {
      setState((s) => ({
        ...s,
        shotFrames: typeof v === 'function' ? v(s.shotFrames) : v,
      }));
    },
    [],
  );

  const setCharacters = useCallback((v: string[]) => {
    setState((s) => ({ ...s, characters: v }));
  }, []);

  const setViralDanceReferenceVideoUrl = useCallback((v: string) => {
    setState((s) => ({ ...s, viralDanceReferenceVideoUrl: v }));
  }, []);

  const setDreaminaMultimodalItems = useCallback((v: DreaminaMultimodalItem[] | ((prev: DreaminaMultimodalItem[]) => DreaminaMultimodalItem[])) => {
    setState((s) => ({
      ...s,
      dreaminaMultimodalItems: typeof v === 'function' ? v(s.dreaminaMultimodalItems) : v,
    }));
  }, []);

  const setCampaignStudioHandoff = useCallback((v: CampaignStudioHandoffState | null) => {
    setState((s) => ({ ...s, campaignStudioHandoff: v }));
  }, []);

  const clearCampaignStudioHandoff = useCallback(() => {
    setState((s) => ({ ...s, campaignStudioHandoff: null }));
  }, []);

  const resetFlow = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo<CreateFlowContextValue>(() => ({
    ...state,
    setPrompt,
    setKeywords,
    setFolderHints,
    setSelectedOrder,
    setStoryboardText,
    setVideoResult,
    setTemplateId,
    setVideoModel,
    setDreaminaModelVersion,
    setVideoAspectRatio,
    setVideoDuration,
    setVideoResolution,
    setHasPolishedPrompt,
    setHasMatchedMaterials,
    setShots,
    setMultiShotEnabled,
    setShotFrames,
    setCharacters,
    setViralDanceReferenceVideoUrl,
    setDreaminaMultimodalItems,
    setCampaignStudioHandoff,
    clearCampaignStudioHandoff,
    resetFlow,
  }), [
    state,
    setPrompt,
    setKeywords,
    setFolderHints,
    setSelectedOrder,
    setStoryboardText,
    setVideoResult,
    setTemplateId,
    setVideoModel,
    setDreaminaModelVersion,
    setVideoAspectRatio,
    setVideoDuration,
    setVideoResolution,
    setHasPolishedPrompt,
    setHasMatchedMaterials,
    setShots,
    setMultiShotEnabled,
    setShotFrames,
    setCharacters,
    setViralDanceReferenceVideoUrl,
    setDreaminaMultimodalItems,
    setCampaignStudioHandoff,
    clearCampaignStudioHandoff,
    resetFlow,
  ]);

  return (
    <CreateFlowContext.Provider value={value}>{children}</CreateFlowContext.Provider>
  );
}

export function useCreateFlow() {
  const ctx = useContext(CreateFlowContext);
  if (!ctx) throw new Error('useCreateFlow must be used within CreateFlowProvider');
  return ctx;
}
