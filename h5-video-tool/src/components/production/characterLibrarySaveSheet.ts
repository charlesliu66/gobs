import type { CharacterSheet } from '../../studio/productionTypes';
import {
  addCharacterLookBranch,
  ensureCharacterLookTree,
  getCharacterLookImage,
  setCharacterLookNodeImage,
} from '../../studio/productionAssets';
import type { PortraitEditIntent } from './portraitJobKey';

export function buildCharacterLibrarySaveSheet(
  characterSheet: CharacterSheet,
  editIntent: PortraitEditIntent,
  previewImageDataUrl?: string | null,
): CharacterSheet {
  let next = ensureCharacterLookTree(characterSheet);

  if (previewImageDataUrl) {
    if (editIntent.mode === 'replace') {
      next = {
        ...setCharacterLookNodeImage(next, editIntent.nodeId, previewImageDataUrl),
        activeLookId: editIntent.nodeId,
      };
    } else {
      const childCount = (next.lookTree ?? []).filter((node) => node.parentId === editIntent.parentNodeId).length;
      next = addCharacterLookBranch(next, editIntent.parentNodeId, `变体 ${childCount + 1}`, previewImageDataUrl);
    }
  }

  const effectiveBaseImage = previewImageDataUrl ?? getCharacterLookImage(next) ?? next.baseImageDataUrl;
  return {
    ...next,
    baseImageDataUrl: effectiveBaseImage,
    baseConfirmed: next.baseConfirmed ?? !!effectiveBaseImage,
  };
}
