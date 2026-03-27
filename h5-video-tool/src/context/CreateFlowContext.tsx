import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DriveFile } from '../hooks/useGoogleDrive';

export interface ShotItem {
  duration: number;
  prompt: string;
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
  /** Pipeline 模板 ID：viral-dance | cg-trailer | 空表示默认 */
  templateId: string;
  /** 多镜头模式：镜头列表，每镜含 duration(5-8)、prompt */
  shots: ShotItem[];
  /** 是否开启多镜头描述（仅 multishot 模板可用） */
  multiShotEnabled: boolean;
  /** 每镜首尾帧 base64 预览（用于视频生成时传入首帧作为参考） */
  shotFrames: Record<number, { first: string; last: string }>;
  /** 短剧模式：剧本中的人物/角色名称，用于用户上传对应角色图 */
  characters: string[];
  /** Viral 舞蹈：可灵 Omni 参考视频公网直链（与素材顺序 @图片1/@图片2 配合） */
  viralDanceReferenceVideoUrl: string;
  /** 选中的 Veo 模型 */
  videoModel: string;
  /** 比例 16:9 | 9:16 */
  videoAspectRatio: string;
  /** 时长（秒）4–8 或 10、60（模板指定时） */
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
  setVideoAspectRatio: (v: string) => void;
  setVideoDuration: (v: number) => void;
  setVideoResolution: (v: string) => void;
  setHasPolishedPrompt: (v: boolean) => void;
  setHasMatchedMaterials: (v: boolean) => void;
  setShots: (v: ShotItem[] | ((prev: ShotItem[]) => ShotItem[])) => void;
  setMultiShotEnabled: (v: boolean) => void;
  setShotFrames: (v: Record<number, { first: string; last: string }> | ((prev: Record<number, { first: string; last: string }>) => Record<number, { first: string; last: string }>)) => void;
  setCharacters: (v: string[]) => void;
  setViralDanceReferenceVideoUrl: (v: string) => void;
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
  videoModel: 'veo-2.0-generate-001',
  videoAspectRatio: '16:9',
  videoDuration: 5,
  videoResolution: '720p',
  shotFrames: {},
  characters: [],
  viralDanceReferenceVideoUrl: '',
};

const CreateFlowContext = createContext<CreateFlowContextValue | null>(null);

export function CreateFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreateFlowState>(initialState);

  const setStoryboardText = useCallback((v: string | null) => {
    setState((s) => ({ ...s, storyboardText: v }));
  }, []);

  const setVideoResult = useCallback((url: string | null, taskId: string | null, videoPath?: string | null) => {
    setState((s) => ({ ...s, videoUrl: url, taskId, videoPath: videoPath ?? null }));
  }, []);

  const resetFlow = useCallback(() => {
    setState(initialState);
  }, []);

  const value: CreateFlowContextValue = {
    ...state,
    setPrompt: (v) => setState((s) => ({ ...s, prompt: v })),
    setKeywords: (v) => setState((s) => ({ ...s, keywords: v })),
    setFolderHints: (v) => setState((s) => ({ ...s, folderHints: v })),
    setSelectedOrder: (v) =>
      setState((s) => ({
        ...s,
        selectedOrder: typeof v === 'function' ? v(s.selectedOrder) : v,
      })),
    setStoryboardText,
    setVideoResult,
    setTemplateId: (v) => setState((s) => ({ ...s, templateId: v })),
    setVideoModel: (v) => setState((s) => ({ ...s, videoModel: v })),
    setVideoAspectRatio: (v) => setState((s) => ({ ...s, videoAspectRatio: v })),
    setVideoDuration: (v) => setState((s) => ({ ...s, videoDuration: v })),
    setVideoResolution: (v) => setState((s) => ({ ...s, videoResolution: v })),
    setHasPolishedPrompt: (v) => setState((s) => ({ ...s, hasPolishedPrompt: v })),
    setHasMatchedMaterials: (v) => setState((s) => ({ ...s, hasMatchedMaterials: v })),
    setShots: (v) =>
      setState((s) => ({
        ...s,
        shots: typeof v === 'function' ? v(s.shots) : v,
      })),
    setMultiShotEnabled: (v) => setState((s) => ({ ...s, multiShotEnabled: v })),
    setShotFrames: (v) =>
      setState((s) => ({
        ...s,
        shotFrames: typeof v === 'function' ? v(s.shotFrames) : v,
      })),
    setCharacters: (v) => setState((s) => ({ ...s, characters: v })),
    setViralDanceReferenceVideoUrl: (v) => setState((s) => ({ ...s, viralDanceReferenceVideoUrl: v })),
    resetFlow,
  };

  return (
    <CreateFlowContext.Provider value={value}>{children}</CreateFlowContext.Provider>
  );
}

export function useCreateFlow() {
  const ctx = useContext(CreateFlowContext);
  if (!ctx) throw new Error('useCreateFlow must be used within CreateFlowProvider');
  return ctx;
}
