import type { TextPresetId } from './types/timeline';

export interface TextPreset {
  id: TextPresetId;
  label: string;
  category: 'intro' | 'outro' | 'subtitle' | 'title';
  /** 预览色块颜色（用于选择器缩略图） */
  previewBg: string;
  previewText: string;
  /** 默认时长（秒） */
  defaultDuration: number;
  /** 默认文案 */
  defaultText: string;
  defaultSubtext?: string;
  /** CSS 渲染参数 */
  css: {
    position: 'top' | 'center' | 'bottom';
    align: 'left' | 'center' | 'right';
    bg: string;           // CSS background
    color: string;        // 主文字颜色
    subColor?: string;    // 副文字颜色
    fontSize: string;     // 主文字 font-size（rem）
    subFontSize?: string;
    fontWeight: string;
    padding: string;
    borderRadius?: string;
    animation: 'fade' | 'slide-up' | 'zoom' | 'shake' | 'highlight';
    animationDuration: number; // ms
  };
  /** FFmpeg drawtext 参数模板（%TEXT% 替换实际文案） */
  ffmpegTemplate?: string;
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'intro-minimal',
    label: '片头 · 极简',
    category: 'intro',
    previewBg: '#000',
    previewText: '#fff',
    defaultDuration: 3,
    defaultText: '第一集',
    defaultSubtext: '故事开始了',
    css: {
      position: 'center',
      align: 'center',
      bg: 'rgba(0,0,0,0.85)',
      color: '#ffffff',
      subColor: 'rgba(255,255,255,0.6)',
      fontSize: '2rem',
      subFontSize: '0.9rem',
      fontWeight: '700',
      padding: '2rem 3rem',
      animation: 'fade',
      animationDuration: 600,
    },
    ffmpegTemplate: "drawtext=text='%TEXT%':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t,0.5),t/0.5,if(lt(t,2.5),1,(3-t)/0.5))'",
  },
  {
    id: 'intro-impact',
    label: '片头 · 冲击',
    category: 'intro',
    previewBg: '#1a0a2e',
    previewText: '#c084fc',
    defaultDuration: 2,
    defaultText: '震撼登场',
    css: {
      position: 'center',
      align: 'center',
      bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 100%)',
      color: '#c084fc',
      fontSize: '2.8rem',
      fontWeight: '900',
      padding: '2rem 3rem',
      animation: 'zoom',
      animationDuration: 400,
    },
  },
  {
    id: 'outro-follow',
    label: '片尾 · 关注引导',
    category: 'outro',
    previewBg: '#7c3aed',
    previewText: '#fff',
    defaultDuration: 3,
    defaultText: '点击关注',
    defaultSubtext: '不错过每一个精彩视频',
    css: {
      position: 'bottom',
      align: 'center',
      bg: 'linear-gradient(to top, rgba(124,58,237,0.95) 0%, transparent 100%)',
      color: '#ffffff',
      subColor: 'rgba(255,255,255,0.75)',
      fontSize: '1.6rem',
      subFontSize: '0.85rem',
      fontWeight: '700',
      padding: '1.5rem 2rem 2.5rem',
      animation: 'slide-up',
      animationDuration: 500,
    },
  },
  {
    id: 'outro-brand',
    label: '片尾 · 品牌落版',
    category: 'outro',
    previewBg: '#111',
    previewText: '#e2e8f0',
    defaultDuration: 3,
    defaultText: 'GOBS',
    defaultSubtext: 'GLIMPSE · OBTAIN · BOOST',
    css: {
      position: 'center',
      align: 'center',
      bg: 'rgba(0,0,0,0.9)',
      color: '#f1f5f9',
      subColor: 'rgba(241,245,249,0.5)',
      fontSize: '2.4rem',
      subFontSize: '0.75rem',
      fontWeight: '800',
      padding: '2rem 3rem',
      borderRadius: '0',
      animation: 'fade',
      animationDuration: 800,
    },
  },
  {
    id: 'sub-bottom',
    label: '字幕 · 底部对话',
    category: 'subtitle',
    previewBg: 'transparent',
    previewText: '#fff',
    defaultDuration: 2,
    defaultText: '在这里输入字幕内容',
    css: {
      position: 'bottom',
      align: 'center',
      bg: 'rgba(0,0,0,0.72)',
      color: '#ffffff',
      fontSize: '1.1rem',
      fontWeight: '500',
      padding: '0.5rem 1.5rem',
      borderRadius: '4px',
      animation: 'fade',
      animationDuration: 150,
    },
    ffmpegTemplate: "drawtext=text='%TEXT%':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h*0.85:box=1:boxcolor=black@0.7:boxborderw=10",
  },
  {
    id: 'sub-top',
    label: '字幕 · 顶部提示',
    category: 'subtitle',
    previewBg: 'transparent',
    previewText: '#fbbf24',
    defaultDuration: 2,
    defaultText: '提示文字',
    css: {
      position: 'top',
      align: 'left',
      bg: 'rgba(0,0,0,0.6)',
      color: '#fbbf24',
      fontSize: '0.85rem',
      fontWeight: '600',
      padding: '0.35rem 1rem',
      borderRadius: '0 0 6px 0',
      animation: 'fade',
      animationDuration: 200,
    },
  },
  {
    id: 'sub-highlight',
    label: '字幕 · 动态高亮',
    category: 'subtitle',
    previewBg: 'transparent',
    previewText: '#fff',
    defaultDuration: 3,
    defaultText: '随节奏闪动的歌词',
    css: {
      position: 'bottom',
      align: 'center',
      bg: 'transparent',
      color: '#ffffff',
      fontSize: '1.3rem',
      fontWeight: '700',
      padding: '0.5rem 1rem',
      animation: 'highlight',
      animationDuration: 300,
    },
  },
  {
    id: 'title-card',
    label: '标题卡 · 章节',
    category: 'title',
    previewBg: '#1e293b',
    previewText: '#38bdf8',
    defaultDuration: 2,
    defaultText: '第一章',
    defaultSubtext: '章节副标题',
    css: {
      position: 'center',
      align: 'left',
      bg: 'rgba(15,23,42,0.92)',
      color: '#38bdf8',
      subColor: 'rgba(148,163,184,0.85)',
      fontSize: '1.8rem',
      subFontSize: '0.9rem',
      fontWeight: '700',
      padding: '1.5rem 2.5rem',
      borderRadius: '0 8px 8px 0',
      animation: 'slide-up',
      animationDuration: 400,
    },
  },
];

export function getTextPreset(id: TextPresetId): TextPreset | undefined {
  return TEXT_PRESETS.find((p) => p.id === id);
}

export function getTextPresetsByCategory(category: TextPreset['category']): TextPreset[] {
  return TEXT_PRESETS.filter((p) => p.category === category);
}
