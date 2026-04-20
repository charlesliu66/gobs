import type { MediaAsset, TimelineProject, VideoClip } from '../types/timeline';
import { timelineDurationOf } from '../types/timeline';

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n < 10 ? n.toFixed(2) : n.toFixed(1);
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
}

/**
 * 生成与竞品类似的「成片说明」Markdown 表，便于用户复制到文档或宣发。
 */
export function formatAgentDeliverableMarkdown(
  project: TimelineProject,
  resolveAssetName: (assetId: string) => string,
): string {
  const vTrack = project.tracks.find((t) => t.id === 'v1');
  const clips = (vTrack?.clips ?? []) as VideoClip[];
  if (clips.length === 0) {
    return '（当前时间轴无视频片段）';
  }

  const lines: string[] = [
    '| # | 镜号 | 素材 | 源入点→出点 | 时间轴起点 | 成片段长 | 备注 |',
    '|:-:|-----|------|-------------|------------|----------|------|',
  ];

  clips.forEach((vc, i) => {
    const name = escapeCell(resolveAssetName(vc.assetId));
    // 成片段长：若有 speed 变速，按时间轴占用秒展示（源秒 / speed）
    const segLen = timelineDurationOf(vc);
    const shot = vc.shotIndex != null ? String(vc.shotIndex) : '—';
    const note = escapeCell(vc.note ?? '');
    const speedSuffix = vc.speed && vc.speed !== 1 ? ` @${vc.speed}x` : '';
    lines.push(
      `| ${i + 1} | ${shot} | ${name}${speedSuffix} | ${fmt(vc.sourceStart)}→${fmt(vc.sourceEnd)} | ${fmt(vc.timelineStart)} | ${fmt(segLen)}s | ${note || '—'} |`,
    );
  });

  lines.push('');
  lines.push(`**工程总时长约 ${fmt(project.durationSec)}s**（以时间轴推算）`);
  return lines.join('\n');
}

export function buildAssetNameResolver(
  assets: Record<string, MediaAsset>,
  library: Array<{ id: string; originalName: string }>,
): (assetId: string) => string {
  const libMap = Object.fromEntries(library.map((x) => [x.id, x.originalName]));
  return (assetId: string) => {
    const meta = assets[assetId]?.meta;
    const fromMeta = meta && typeof meta.originalName === 'string' ? meta.originalName : '';
    if (fromMeta) return fromMeta;
    return libMap[assetId] ?? assetId;
  };
}
