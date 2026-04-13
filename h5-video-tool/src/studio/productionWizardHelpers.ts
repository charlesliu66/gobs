import type {
  AssetVariant,
  CharacterSheet,
  ProductionDesignLayer,
  ProductionShot,
  PropSheet,
  SceneSheet,
} from './productionTypes';
import { ensureCharacterLookTree, setCharacterLookNodeImage } from './productionAssets';

export function buildProductionShotFramePrompt(
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

export function updateVariantImage(
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

