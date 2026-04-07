import type {
  AssetVariant,
  CharacterLookNode,
  CharacterSheet,
  ProductionDesignLayer,
  PropItem,
  SceneSheet,
  StoryArcLayer,
} from './productionTypes';

/** 制作清单道具：供角色定妆时统一世界观（全表） */
function formatProductionPropsForCharacter(props: PropItem[] | undefined): string {
  if (!props?.length) return '';
  const lines = props.map((p) => {
    const name = p.name?.trim() ?? '';
    const n = p.notes?.trim();
    if (!name && !n) return '';
    return n ? `${name}：${n}` : name;
  }).filter(Boolean);
  if (!lines.length) return '';
  return `【制作清单·道具与陈设】\n${lines.join('\n')}`;
}

/** 制作清单：本场景相关（同 sceneRef 或无 sceneRef 的全局项） */
function formatProductionPropsForScene(props: PropItem[] | undefined, sceneRef: string): string {
  if (!props?.length) return '';
  const relevant = props.filter((p) => {
    const sr = p.sceneRef?.trim();
    return !sr || sr === sceneRef;
  });
  if (!relevant.length) return '';
  const lines = relevant
    .map((p) => {
      const name = p.name?.trim() ?? '';
      const n = p.notes?.trim();
      if (!name && !n) return '';
      return n ? `${name}：${n}` : name;
    })
    .filter(Boolean);
  if (!lines.length) return '';
  return `【本场景制作清单】\n${lines.join('\n')}`;
}

function slug(s: string): string {
  return s.replace(/\s+/g, '-').slice(0, 32);
}

export function buildCharacterSheetsFromStory(story: StoryArcLayer): CharacterSheet[] {
  return story.characters.map((c, i) => {
    const rootId = `chv-${i}-0`;
    return {
      id: `ch-${i}-${slug(c.name)}`,
      name: c.name,
      isProtagonist: i === 0,
      variants: [{ id: rootId, label: '默认形象' }],
      lookTree: [{ id: rootId, parentId: null, label: '默认形象' }],
      activeLookId: rootId,
    };
  });
}

export function buildSceneSheetsFromStory(story: StoryArcLayer): SceneSheet[] {
  return story.scenePlan.map((s, i) => ({
    id: s.id || `sc-${i}`,
    name: s.name,
    sceneRef: s.id,
    variants: [{ id: `scv-${i}-0`, label: '主场景' }],
  }));
}

/** 合并 L2 sets：补充尚未出现的场景行 */
export function mergeSceneSheetsFromL2(
  existing: SceneSheet[],
  productionDesign: ProductionDesignLayer,
): SceneSheet[] {
  const byId = new Map(existing.map((x) => [x.sceneRef, x]));
  for (const row of productionDesign.sets) {
    if (!byId.has(row.sceneId)) {
      const id = row.sceneId;
      byId.set(id, {
        id,
        name: row.description.slice(0, 24) || id,
        sceneRef: id,
        variants: [{ id: `scv-new-${id}`, label: '主场景' }],
      });
    }
  }
  return [...byId.values()];
}

export function buildCharacterImagePrompt(
  sheet: CharacterSheet,
  variant: AssetVariant,
  styleRef: string,
  productionDesign: ProductionDesignLayer | null,
  opts?: { enforceGlobalStyleLock?: boolean },
): string {
  const wardrobe = productionDesign?.wardrobe.find(
    (w) => w.character === sheet.name || sheet.name.includes(w.character) || w.character.includes(sheet.name),
  );
  const propsBlock = formatProductionPropsForCharacter(productionDesign?.props);
  const parts = [
    styleRef.trim(),
    propsBlock,
    opts?.enforceGlobalStyleLock
      ? '【全片画风】人物须与立项画风参考及上文风格摘要一致，与全片场景、道具在同一视觉体系内。'
      : '',
    `人物角色肖像：${sheet.name}`,
    variant.label !== '默认形象' ? `状态/造型：${variant.label}` : '',
    wardrobe?.item ? `服装：${wardrobe.item}` : '',
    wardrobe?.notes?.trim() ? `服装备注：${wardrobe.notes.trim()}` : '',
    '【构图与背景】全身照：人物从头到脚完整入镜，正面朝向镜头，双眼平视，全身居中。',
    '背景必须为纯白色 #FFFFFF，无任何环境、道具、渐变或室内外场景；地面仅可为纯白延伸，无透视场景。',
    '电影级面部布光（可保留立体感），高清，无文字水印。',
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildSceneImagePrompt(
  sheet: SceneSheet,
  variant: AssetVariant,
  styleRef: string,
  productionDesign: ProductionDesignLayer | null,
  opts?: { enforceGlobalStyleLock?: boolean },
): string {
  const setRow = productionDesign?.sets.find((s) => s.sceneId === sheet.sceneRef);
  const propsBlock = formatProductionPropsForScene(productionDesign?.props, sheet.sceneRef);
  const parts = [
    styleRef.trim(),
    propsBlock,
    opts?.enforceGlobalStyleLock
      ? '【全片画风】场景须与立项画风参考及上文风格摘要一致，与角色定妆在同一视觉体系内。'
      : '',
    `场景环境：${sheet.name}`,
    variant.label !== '主场景' ? `变体：${variant.label}` : '',
    setRow?.description ? `空间与陈设：${setRow.description}` : '',
    setRow?.palette ? `主色调：${setRow.palette}` : '',
    '广角建立镜头感，无人物或人物为剪影，高清，无文字。',
  ];
  return parts.filter(Boolean).join('\n');
}

/** BFS 拍平形象树 → variants（兼容旧组件） */
export function flattenLookTreeToVariants(nodes: CharacterLookNode[]): AssetVariant[] {
  if (nodes.length === 0) return [];
  const byParent = new Map<string | null, CharacterLookNode[]>();
  for (const n of nodes) {
    const k = n.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  const out: AssetVariant[] = [];
  const queue = [...(byParent.get(null) ?? [])];
  while (queue.length) {
    const n = queue.shift()!;
    out.push({ id: n.id, label: n.label, imageDataUrl: n.imageDataUrl });
    const ch = byParent.get(n.id) ?? [];
    queue.push(...ch);
  }
  return out;
}

/** 无树时由 variants 推导单根 + 子节点；有树则拍平 variants */
export function ensureCharacterLookTree(sheet: CharacterSheet): CharacterSheet {
  if (sheet.lookTree?.length) {
    return { ...sheet, variants: flattenLookTreeToVariants(sheet.lookTree) };
  }
  const vs = sheet.variants;
  if (!vs.length) {
    const rootId = `look-${sheet.id}-root`;
    const root: CharacterLookNode = { id: rootId, parentId: null, label: '默认形象' };
    return {
      ...sheet,
      lookTree: [root],
      activeLookId: rootId,
      variants: [{ id: rootId, label: '默认形象' }],
    };
  }
  const rootId = vs[0].id;
  const lookTree: CharacterLookNode[] = [
    { id: rootId, parentId: null, label: vs[0].label, imageDataUrl: vs[0].imageDataUrl },
    ...vs.slice(1).map((v) => ({
      id: v.id,
      parentId: rootId,
      label: v.label,
      imageDataUrl: v.imageDataUrl,
    })),
  ];
  const activeLookId =
    sheet.activeLookId && lookTree.some((n) => n.id === sheet.activeLookId)
      ? sheet.activeLookId
      : lookTree.find((n) => n.imageDataUrl)?.id ?? rootId;
  return { ...sheet, lookTree, activeLookId, variants: flattenLookTreeToVariants(lookTree) };
}

export function getCharacterActiveNode(sheet: CharacterSheet): CharacterLookNode | undefined {
  const s = ensureCharacterLookTree(sheet);
  const id = s.activeLookId;
  if (id) {
    const hit = s.lookTree!.find((x) => x.id === id);
    if (hit) return hit;
  }
  return s.lookTree!.find((n) => n.parentId === null) ?? s.lookTree![0];
}

export function getCharacterLookImage(sheet: CharacterSheet): string | undefined {
  const n = getCharacterActiveNode(sheet);
  if (n?.imageDataUrl) return n.imageDataUrl;
  const s = ensureCharacterLookTree(sheet);
  return s.lookTree!.find((x) => x.imageDataUrl)?.imageDataUrl ?? s.variants[0]?.imageDataUrl;
}

export function setCharacterLookNodeImage(
  sheet: CharacterSheet,
  nodeId: string,
  imageDataUrl: string,
): CharacterSheet {
  const s = ensureCharacterLookTree(sheet);
  const lookTree = s.lookTree!.map((n) => (n.id === nodeId ? { ...n, imageDataUrl } : n));
  return { ...s, lookTree, variants: flattenLookTreeToVariants(lookTree) };
}

export function addCharacterLookBranch(
  sheet: CharacterSheet,
  parentId: string,
  label: string,
  imageDataUrl: string,
): CharacterSheet {
  const s = ensureCharacterLookTree(sheet);
  const newId = `look-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const node: CharacterLookNode = { id: newId, parentId, label, imageDataUrl };
  const lookTree = [...s.lookTree!, node];
  return {
    ...s,
    lookTree,
    activeLookId: newId,
    variants: flattenLookTreeToVariants(lookTree),
  };
}

export function setCharacterActiveLook(sheet: CharacterSheet, nodeId: string): CharacterSheet {
  const s = ensureCharacterLookTree(sheet);
  if (!s.lookTree!.some((n) => n.id === nodeId)) return s;
  return { ...s, activeLookId: nodeId };
}

const LAYOUT_NODE_W = 112;
const LAYOUT_LEVEL_Y = 152;
const LAYOUT_GAP_X = 36;

/** 自上而下树布局（根在上），返回节点中心坐标与画布包围盒 */
export function layoutCharacterLookTree(nodes: CharacterLookNode[]): {
  positions: Map<string, { cx: number; cy: number }>;
  bounds: { w: number; h: number };
} {
  if (nodes.length === 0) {
    return { positions: new Map(), bounds: { w: 480, h: 280 } };
  }
  const byParent = new Map<string | null, CharacterLookNode[]>();
  for (const n of nodes) {
    const k = n.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  const pos = new Map<string, { cx: number; cy: number }>();

  function subtreeWidth(n: CharacterLookNode): number {
    const ch = byParent.get(n.id) ?? [];
    if (ch.length === 0) return LAYOUT_NODE_W;
    let sum = 0;
    for (let i = 0; i < ch.length; i++) {
      sum += subtreeWidth(ch[i]!);
      if (i < ch.length - 1) sum += LAYOUT_GAP_X;
    }
    return Math.max(LAYOUT_NODE_W, sum);
  }

  function place(n: CharacterLookNode, leftEdge: number, depth: number): number {
    const ch = byParent.get(n.id) ?? [];
    const cy = 56 + depth * LAYOUT_LEVEL_Y;
    if (ch.length === 0) {
      const cx = leftEdge + LAYOUT_NODE_W / 2;
      pos.set(n.id, { cx, cy });
      return LAYOUT_NODE_W;
    }
    let cur = leftEdge;
    const centers: number[] = [];
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i]!;
      const w = subtreeWidth(c);
      place(c, cur, depth + 1);
      centers.push(pos.get(c.id)!.cx);
      cur += w;
      if (i < ch.length - 1) cur += LAYOUT_GAP_X;
    }
    const cx = (Math.min(...centers) + Math.max(...centers)) / 2;
    pos.set(n.id, { cx, cy });
    return cur - leftEdge;
  }

  const roots = byParent.get(null) ?? [];
  let x = 48;
  for (const r of roots) {
    const w = subtreeWidth(r);
    place(r, x, 0);
    x += w + LAYOUT_GAP_X * 2;
  }
  let maxCx = 0;
  let maxCy = 0;
  for (const [, p] of pos) {
    maxCx = Math.max(maxCx, p.cx);
    maxCy = Math.max(maxCy, p.cy);
  }
  return {
    positions: pos,
    bounds: { w: Math.max(x + 48, maxCx + LAYOUT_NODE_W + 80), h: maxCy + 100 },
  };
}

/** 分镜页展示用 @ 引用行 */
export function computeShotRefTags(
  shot: {
    sceneRef: string;
    subject: string;
    action: string;
  },
  characterSheets: CharacterSheet[],
  sceneSheets: SceneSheet[],
): string[] {
  const tags: string[] = [];
  const scene = sceneSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef);
  if (scene) tags.push(`@${scene.name}`);
  const blob = `${shot.subject} ${shot.action}`;
  for (const ch of characterSheets) {
    if (ch.name && blob.includes(ch.name)) {
      const node = getCharacterActiveNode(ensureCharacterLookTree(ch));
      const lab = node?.label ?? ch.variants[0]?.label;
      tags.push(`@${ch.name}${lab ? `-${lab}` : ''}`);
    }
  }
  return tags.length ? tags : [`@场景:${shot.sceneRef}`];
}
