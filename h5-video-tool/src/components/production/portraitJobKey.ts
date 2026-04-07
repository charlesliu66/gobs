export type PortraitEditIntent =
  | { mode: 'replace'; nodeId: string }
  | { mode: 'branch'; parentNodeId: string };

export type PortraitJobState =
  | { status: 'generating' }
  | { status: 'done'; previewDataUrl: string }
  | { status: 'error'; error: string };

/** 与编辑弹窗、形象树节点上的进度展示共用同一 key */
export function getPortraitJobKey(characterId: string, intent: PortraitEditIntent): string {
  if (intent.mode === 'replace') return `replace:${characterId}:${intent.nodeId}`;
  return `branch:${characterId}:${intent.parentNodeId}`;
}
