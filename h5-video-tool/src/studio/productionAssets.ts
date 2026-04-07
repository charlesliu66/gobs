import type {
  AssetVariant,
  CharacterLookNode,
  CharacterSheet,
  ProductionDesignLayer,
  ProductionShot,
  PropItem,
  PropSheet,
  SceneSheet,
  StoryArcLayer,
  WardrobeItem,
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

/** 角色定妆「补充描述」默认：与当前角色匹配的 wardrobe 行（服化道·服装） */
export function formatWardrobeSupplementForCharacter(
  characterName: string,
  wardrobe: WardrobeItem[] | undefined | null,
): string {
  const nm = characterName?.trim();
  if (!nm || !wardrobe?.length) return '';
  const w = wardrobe.find(
    (x) =>
      x.character === nm ||
      nm.includes(x.character) ||
      x.character.includes(nm),
  );
  if (!w) return '';
  const lines = [
    `角色：${w.character}`,
    w.item?.trim() ? `服装/造型：${w.item.trim()}` : '',
    w.notes?.trim() ? `说明：${w.notes.trim()}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildPropSheetsFromProductionDesign(pd: ProductionDesignLayer): PropSheet[] {
  return pd.props.map((p, i) => {
    const name = p.name?.trim() || `道具${i + 1}`;
    return {
      id: `prop-${i}-${slug(name)}`,
      name,
      sceneRef: p.sceneRef?.trim(),
      notes: p.notes?.trim(),
      variants: [{ id: `propv-${i}-0`, label: '主道具' }],
    };
  });
}

/** L2 重新生成制作清单后合并道具卡，保留用户已上传的变体图 */
export function mergePropSheetsPreservingImages(next: PropSheet[], prev: PropSheet[]): PropSheet[] {
  return next.map((sheet) => {
    const old = prev.find((o) => o.name === sheet.name);
    if (!old) return sheet;
    const mergedVariants = sheet.variants.map((v, vi) => {
      const ov = old.variants[vi] ?? old.variants.find((x) => x.label === v.label);
      if (ov?.imageDataUrl) return { ...v, imageDataUrl: ov.imageDataUrl };
      return v;
    });
    return { ...sheet, id: old.id, variants: mergedVariants };
  });
}

export function buildPropImagePrompt(
  sheet: PropSheet,
  variant: AssetVariant,
  styleRef: string,
  productionDesign: ProductionDesignLayer | null,
  opts?: { enforceGlobalStyleLock?: boolean },
): string {
  const propRow = productionDesign?.props.find(
    (p) => p.name === sheet.name || sheet.name.includes(p.name) || p.name.includes(sheet.name),
  );
  const setHint = sheet.sceneRef
    ? productionDesign?.sets.find((s) => s.sceneId === sheet.sceneRef)
    : undefined;
  const parts = [
    styleRef.trim(),
    opts?.enforceGlobalStyleLock
      ? '【全片画风】道具须与立项画风参考及上文风格摘要一致，与角色定妆、场景在同一视觉体系内。'
      : '',
    `关键道具静物/产品图：${sheet.name}`,
    variant.label !== '主道具' ? `变体：${variant.label}` : '',
    propRow?.notes?.trim() ? `剧情与外观：${propRow.notes.trim()}` : '',
    sheet.notes ? `备忘：${sheet.notes}` : '',
    setHint ? `关联空间：${setHint.description}` : '',
    '中性背景，单主体居中，高清，无文字水印。',
  ];
  return parts.filter(Boolean).join('\n');
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

function dataUrlToBase64Mime(dataUrl: string): { base64: string; mimeType: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) return null;
  return { mimeType: m[1]!.trim(), base64: m[2]!.trim() };
}

function firstSceneVariantImageUrl(sheet: SceneSheet): string | undefined {
  const v = sheet.variants.find((x) => x.imageDataUrl);
  return v?.imageDataUrl ?? sheet.variants[0]?.imageDataUrl;
}

function firstPropVariantImageUrl(sheet: PropSheet): string | undefined {
  const v = sheet.variants.find((x) => x.imageDataUrl);
  return v?.imageDataUrl ?? sheet.variants[0]?.imageDataUrl;
}

/** 分镜视频默认叙事层（与 ProductionWizard 原逻辑一致） */
export function buildProductionShotVideoStoryboardText(shot: ProductionShot): string {
  return [
    shot.structuredStill.sp_subject,
    shot.structuredStill.sp_environment,
    shot.structuredMotion.mp_motion,
    shot.structuredMotion.mp_camera,
    shot.structuredMotion.mp_tempo,
    shot.dialogue ? `对白：${shot.dialogue}` : '',
    shot.audioCue ? `声音：${shot.audioCue}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * 在叙事中首次出现的人名/场景名后插入 @图片k（先匹配更长名称，避免「龙一」命中「龙一的父亲」）。
 */
function tryInjectNameWithTag(text: string, name: string, tag: string): string | null {
  let from = 0;
  while (from < text.length) {
    const i = text.indexOf(name, from);
    if (i < 0) return null;
    if (text.slice(i + name.length).startsWith(tag)) {
      from = i + name.length + tag.length;
      continue;
    }
    const after = text.slice(i + name.length, i + name.length + 1);
    if (after === '的' && name.length <= 4) {
      from = i + 1;
      continue;
    }
    return text.slice(0, i) + name + tag + text.slice(i + name.length);
  }
  return null;
}

function injectAtImageTagsInNarrative(
  base: string,
  slots: { injectNames: string[]; k: number }[],
): string {
  const flat: { name: string; k: number }[] = [];
  for (const s of slots) {
    const uniq = [...new Set(s.injectNames.map((x) => x.trim()).filter(Boolean))].sort(
      (a, b) => b.length - a.length,
    );
    for (const name of uniq) flat.push({ name, k: s.k });
  }
  flat.sort((a, b) => b.name.length - a.name.length);

  let text = base;
  const done = new Set<number>();
  for (const { name, k } of flat) {
    if (done.has(k)) continue;
    const tag = `@图片${k}`;
    const next = tryInjectNameWithTag(text, name, tag);
    if (next !== null) {
      text = next;
      done.add(k);
    }
  }
  return text;
}

/** 文案写「父亲」等称谓，但角色卡名为「龙父」「李父」等时的宽松匹配（排除「师父」等） */
function fatherLikeCharacterName(nm: string): boolean {
  if (nm.includes('师')) return false;
  return nm === '父亲' || nm === '爸爸' || /[父爸爹]/.test(nm);
}

function motherLikeCharacterName(nm: string): boolean {
  if (nm.includes('师父')) return false;
  return nm === '母亲' || nm === '妈妈' || /[母妈娘]/.test(nm);
}

/** 角色是否被本镜文案「点到」：全名包含，或称谓与卡名对应 */
function characterMentionedInShotBlob(ch: CharacterSheet, blob: string): boolean {
  const nm = ch.name?.trim();
  if (!nm) return false;
  if (blob.includes(nm)) return true;
  if (/(父亲|爸爸|爹|老爹)/.test(blob) && fatherLikeCharacterName(nm)) return true;
  if (/(母亲|妈妈|娘|老妈)/.test(blob) && motherLikeCharacterName(nm)) return true;
  return false;
}

function firstCharacterMentionIndex(ch: CharacterSheet, blob: string): number {
  const nm = ch.name?.trim() ?? '';
  if (nm && blob.includes(nm)) return blob.indexOf(nm);
  if (nm && /(父亲|爸爸|爹|老爹)/.test(blob) && fatherLikeCharacterName(nm)) {
    const m = blob.match(/父亲|爸爸|爹|老爹/);
    if (m && m.index !== undefined) return m.index;
  }
  if (nm && /(母亲|妈妈|娘|老妈)/.test(blob) && motherLikeCharacterName(nm)) {
    const m = blob.match(/母亲|妈妈|娘|老妈/);
    if (m && m.index !== undefined) return m.index;
  }
  return 1e9;
}

/**
 * Seedance 2.0 全能参考：按镜内文案匹配出镜角色、当前场景与道具名，收集参考图；顺序与 @图片1…@图片n 一致。
 * - 角色：姓名出现在本镜检索文本中（含「父亲」↔ 龙父 等称谓扩展），且定妆树/变体有图；长名优先避免「龙」误匹配「龙一」。
 * - 场景：本镜 sceneRef 对应场景卡的首张有图变体，置于角色图之后。
 * - 道具：道具名出现在本镜检索文本中且道具有图时加入（关键道具前后一致）。
 */
export function buildShotMultimodalRefPack(
  shot: ProductionShot,
  characterSheets: CharacterSheet[],
  sceneSheets: SceneSheet[],
  propSheets?: PropSheet[],
): {
  multimodalImages: { base64: string; mimeType: string }[];
  /** 与 multimodalImages 下标对齐，供 UI 展示 */
  labels: string[];
  /** 追加到叙事 prompt 后，说明 @图片n 与素材对应关系 */
  refPromptSuffix: string;
  narrativeWithInlineTags: string;
  defaultVideoPrompt: string;
} {
  const blob = [
    shot.subject,
    shot.action,
    shot.dialogue,
    shot.notes,
    shot.structuredStill.sp_subject,
    shot.structuredStill.sp_environment,
    shot.structuredMotion.mp_motion,
    shot.structuredMotion.mp_camera,
    shot.structuredMotion.mp_tempo,
    shot.structuredMotion.mp_transition,
    shot.structuredMotion.mp_audio,
  ]
    .filter(Boolean)
    .join(' ');

  const candidates = characterSheets.filter((ch) => characterMentionedInShotBlob(ch, blob));
  candidates.sort((a, b) => (b.name!.length ?? 0) - (a.name!.length ?? 0));
  const pickedChars: CharacterSheet[] = [];
  for (const ch of candidates) {
    const nm = ch.name!.trim();
    /** 仅合并「单字龙」与「龙一」这类包含关系，不能把「龙一」与「龙一的父亲」当成同一人 */
    if (nm.length === 1 && pickedChars.some((p) => p.name !== nm && p.name!.includes(nm))) continue;
    pickedChars.push(ch);
  }
  pickedChars.sort((a, b) => firstCharacterMentionIndex(a, blob) - firstCharacterMentionIndex(b, blob));

  type Entry = {
    base64: string;
    mimeType: string;
    label: string;
    injectNames: string[];
  };
  const entries: Entry[] = [];

  for (const ch of pickedChars) {
    const url = getCharacterLookImage(ensureCharacterLookTree(ch));
    if (!url) continue;
    const parsed = dataUrlToBase64Mime(url);
    if (!parsed) continue;
    const nm = ch.name!.trim();
    entries.push({
      base64: parsed.base64,
      mimeType: parsed.mimeType || 'image/png',
      label: `角色「${nm}」`,
      injectNames: nm ? [nm] : [],
    });
  }

  const scene = sceneSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef);
  if (scene) {
    const url = firstSceneVariantImageUrl(scene);
    if (url) {
      const parsed = dataUrlToBase64Mime(url);
      if (parsed) {
        const sn = scene.name?.trim() || '';
        const injectNames = new Set<string>();
        if (sn) injectNames.add(sn);
        if (scene.sceneRef?.trim()) injectNames.add(scene.sceneRef.trim());
        if (sn.includes(' - ')) injectNames.add(sn.split(' - ')[0]!.trim());
        entries.push({
          base64: parsed.base64,
          mimeType: parsed.mimeType || 'image/png',
          label: `场景「${sn || scene.sceneRef}」`,
          injectNames: [...injectNames],
        });
      }
    }
  }

  if (propSheets?.length) {
    const propCandidates = propSheets.filter((ps) => {
      const nm = ps.name?.trim();
      if (!nm || nm.length < 2) return false;
      return blob.includes(nm);
    });
    propCandidates.sort((a, b) => b.name.length - a.name.length);
    for (const ps of propCandidates) {
      const url = firstPropVariantImageUrl(ps);
      if (!url) continue;
      const parsed = dataUrlToBase64Mime(url);
      if (!parsed) continue;
      const nm = ps.name.trim();
      entries.push({
        base64: parsed.base64,
        mimeType: parsed.mimeType || 'image/png',
        label: `道具「${nm}」`,
        injectNames: [nm],
      });
    }
  }

  const capped = entries.slice(0, 9);
  const refPromptSuffix =
    capped.length > 0
      ? `参考对应（与上传素材顺序一致）：${capped.map((_, i) => `@图片${i + 1}为${capped[i]!.label}`).join('，')}。`
      : '';

  const baseNarrative = buildProductionShotVideoStoryboardText(shot);
  const slots = capped.map((e, i) => ({
    injectNames: e.injectNames,
    k: i + 1,
  }));
  const narrativeWithInlineTags =
    capped.length > 0 ? injectAtImageTagsInNarrative(baseNarrative, slots) : baseNarrative;
  const defaultVideoPrompt =
    refPromptSuffix.length > 0 ? `${narrativeWithInlineTags}\n\n${refPromptSuffix}` : narrativeWithInlineTags;

  return {
    multimodalImages: capped.map(({ base64, mimeType }) => ({ base64, mimeType })),
    labels: capped.map((e) => e.label),
    refPromptSuffix,
    narrativeWithInlineTags,
    defaultVideoPrompt,
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
