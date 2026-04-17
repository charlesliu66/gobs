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
  _styleRef: string,
  productionDesign: ProductionDesignLayer | null,
  _opts?: { enforceGlobalStyleLock?: boolean },
): string {
  const propRow = productionDesign?.props.find(
    (p) => p.name === sheet.name || sheet.name.includes(p.name) || p.name.includes(sheet.name),
  );
  // 道具图只需形态清晰，不追求画风精度，prompt 精简
  const parts = [
    `产品静物图：${sheet.name}`,
    variant.label !== '主道具' ? `变体：${variant.label}` : '',
    propRow?.notes?.trim() ? `外观说明：${propRow.notes.trim()}` : '',
    sheet.notes ? `备注：${sheet.notes}` : '',
    '纯白背景，单主体居中，清晰，无文字水印。',
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

/**
 * 获取角色在特定分镜中应使用的参考图。
 * 优先级：分镜手动覆盖状态图 > 角色默认激活状态图 > lookTree 定稿图
 */
export function getCharacterShotImage(
  ch: CharacterSheet,
  shot?: { characterStateOverrides?: Record<string, string> },
): string | undefined {
  const overrideStateId = shot?.characterStateOverrides?.[ch.id];
  if (overrideStateId) {
    const st = ch.states?.find((s) => s.id === overrideStateId);
    if (st?.imageDataUrl) return st.imageDataUrl;
  }
  if (ch.activeStateId) {
    const st = ch.states?.find((s) => s.id === ch.activeStateId);
    if (st?.imageDataUrl) return st.imageDataUrl;
  }
  return getCharacterLookImage(ensureCharacterLookTree(ch));
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
export function buildProductionShotVideoStoryboardText(
  shot: ProductionShot,
  globalStyleRef?: string,
): string {
  return [
    shot.structuredStill.sp_subject,
    shot.structuredStill.sp_environment,
    shot.structuredStill.sp_lighting,
    shot.structuredStill.sp_style,
    shot.structuredMotion.mp_motion,
    shot.structuredMotion.mp_camera,
    shot.structuredMotion.mp_tempo,
    shot.dialogue ? `对白：${shot.dialogue}` : '',
    shot.audioCue ? `声音：${shot.audioCue}` : '',
    globalStyleRef?.trim() ? `整体视觉风格：${globalStyleRef.trim()}` : '',
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

/** 角色是否被本镜文案「点到」：全名包含、全名拆分部分匹配，或称谓与卡名对应 */
export function characterMentionedInShotBlob(ch: CharacterSheet, blob: string): boolean {
  const nm = ch.name?.trim();
  if (!nm) return false;
  if (blob.includes(nm)) return true;
  // 拆分全名，任意部分 >=2 字出现在 blob 里也算匹配（处理「桜木 小樱」→「小樱」）
  const parts = nm.split(/[\s·・·\-_]+/).filter((p) => p.length >= 2);
  if (parts.some((p) => blob.includes(p))) return true;
  if (/(父亲|爸爸|爹|老爹)/.test(blob) && fatherLikeCharacterName(nm)) return true;
  if (/(母亲|妈妈|娘|老妈)/.test(blob) && motherLikeCharacterName(nm)) return true;
  return false;
}

function firstCharacterMentionIndex(ch: CharacterSheet, blob: string): number {
  const nm = ch.name?.trim() ?? '';
  if (nm && blob.includes(nm)) return blob.indexOf(nm);
  // 拆分部分匹配时取最早出现位置
  const parts = nm.split(/[\s·・·\-_]+/).filter((p) => p.length >= 2);
  const partMin = parts.reduce((min, p) => {
    const idx = blob.indexOf(p);
    return idx >= 0 ? Math.min(min, idx) : min;
  }, 1e9);
  if (partMin < 1e9) return partMin;
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
 * 构建镜头检索 blob 文本（供 UI 侧手动覆盖 panel 使用）。
 */
export function buildShotBlobText(shot: ProductionShot): string {
  return [
    shot.subject,
    shot.action,
    shot.dialogue,
    shot.notes,
    shot.structuredStill.sp_subject,
    shot.structuredStill.sp_environment,
    shot.structuredMotion.mp_motion,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Seedance 2.0 全能参考：按镜内文案匹配出镜角色、当前场景与道具名，收集参考图；顺序与 @图片1…@图片n 一致。
 * - 角色：姓名出现在本镜检索文本中（含「父亲」↔ 龙父 等称谓扩展），且定妆树/变体有图；长名优先避免「龙」误匹配「龙一」。
 * - 场景：本镜 sceneRef 对应场景卡的首张有图变体，置于角色图之后。
 * - 道具：道具名出现在本镜检索文本中且道具有图时加入（关键道具前后一致）。
 * - manualOverrides：手动覆盖自动匹配结果（角色 ids、场景 id、道具 ids）。
 */
export function buildShotMultimodalRefPack(
  shot: ProductionShot,
  characterSheets: CharacterSheet[],
  sceneSheets: SceneSheet[],
  propSheets?: PropSheet[],
  manualOverrides?: ProductionShot['manualRefOverrides'],
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

  let pickedChars: CharacterSheet[];
  if (manualOverrides?.characterIds !== undefined) {
    // 手动指定：按 id 过滤，保留顺序
    pickedChars = manualOverrides.characterIds
      .map((id) => characterSheets.find((c) => c.id === id))
      .filter(Boolean) as CharacterSheet[];
  } else {
    // 自动匹配（原有逻辑）
    const candidates = characterSheets.filter((ch) => characterMentionedInShotBlob(ch, blob));
    candidates.sort((a, b) => (b.name!.length ?? 0) - (a.name!.length ?? 0));
    pickedChars = [];
    for (const ch of candidates) {
      const nm = ch.name!.trim();
      /** 仅合并「单字龙」与「龙一」这类包含关系，不能把「龙一」与「龙一的父亲」当成同一人 */
      if (nm.length === 1 && pickedChars.some((p) => p.name !== nm && p.name!.includes(nm))) continue;
      pickedChars.push(ch);
    }
    pickedChars.sort((a, b) => firstCharacterMentionIndex(a, blob) - firstCharacterMentionIndex(b, blob));
  }

  type Entry = {
    base64: string;
    mimeType: string;
    label: string;
    injectNames: string[];
  };
  const entries: Entry[] = [];

  for (const ch of pickedChars) {
    const url = getCharacterShotImage(ch, shot);
    if (!url) continue;
    const parsed = dataUrlToBase64Mime(url);
    if (!parsed) continue;
    const nm = ch.name!.trim();
    const overrideStateId = shot.characterStateOverrides?.[ch.id];
    const effectiveStateId = overrideStateId || ch.activeStateId;
    const effectiveState = effectiveStateId ? ch.states?.find((s) => s.id === effectiveStateId) : null;
    const stateLabel = effectiveState?.imageDataUrl ? effectiveState.label : null;
    entries.push({
      base64: parsed.base64,
      mimeType: parsed.mimeType || 'image/png',
      label: stateLabel ? `角色「${nm}」(${stateLabel})` : `角色「${nm}」`,
      injectNames: nm ? [nm] : [],
    });
  }

  const scene = (() => {
    if (manualOverrides?.sceneId !== undefined) {
      if (manualOverrides.sceneId === null) return null;
      return sceneSheets.find((s) => s.id === manualOverrides!.sceneId) ?? null;
    }
    return sceneSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef) ?? null;
  })();
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
    let propCandidates: typeof propSheets;
    if (manualOverrides?.propIds !== undefined) {
      // 手动指定道具
      propCandidates = manualOverrides.propIds
        .map((id) => propSheets.find((ps) => ps.id === id))
        .filter(Boolean) as typeof propSheets;
    } else {
      propCandidates = propSheets.filter((ps) => {
        const nm = ps.name?.trim();
        if (!nm || nm.length < 2) return false;
        return blob.includes(nm);
      });
      propCandidates.sort((a, b) => b.name.length - a.name.length);
    }
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

/** 把任意图片 URL（data: 或 http/https 或相对路径）转换成 base64+mimeType */
export async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  // 已经是 data URL，直接解析
  const m = /^data:([^;]+);base64,(.+)$/s.exec(url.trim());
  if (m) return { mimeType: m[1]!.trim(), base64: m[2]!.trim() };
  // HTTP/HTTPS URL 或相对路径：fetch 并转 base64
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const mm = /^data:([^;]+);base64,(.+)$/s.exec(result);
        if (mm) resolve({ mimeType: mm[1]!.trim(), base64: mm[2]!.trim() });
        else resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * 将 base64 图片压缩为 JPEG，最大边长 maxPx，减小上传体积。
 * 若 Canvas 不可用则原样返回。
 */
async function compressImageToJpeg(
  base64: string,
  mimeType: string,
  maxPx = 768,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ base64, mimeType }); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
      if (m) resolve({ base64: m[2]!.trim(), mimeType: 'image/jpeg' });
      else resolve({ base64, mimeType });
    };
    img.onerror = () => resolve({ base64, mimeType });
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * 与 buildShotMultimodalRefPack 逻辑一致，但支持 HTTP URL 图片（fetch 转 base64）。
 * 用于 React 组件中（useEffect）和提交视频时调用。
 */
export async function buildShotMultimodalRefPackAsync(
  shot: ProductionShot,
  characterSheets: CharacterSheet[],
  sceneSheets: SceneSheet[],
  propSheets?: PropSheet[],
  manualOverrides?: ProductionShot['manualRefOverrides'],
): Promise<ReturnType<typeof buildShotMultimodalRefPack>> {
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

  let pickedChars: CharacterSheet[];
  if (manualOverrides?.characterIds !== undefined) {
    pickedChars = manualOverrides.characterIds
      .map((id) => characterSheets.find((c) => c.id === id))
      .filter(Boolean) as CharacterSheet[];
  } else {
    const candidates = characterSheets.filter((ch) => characterMentionedInShotBlob(ch, blob));
    candidates.sort((a, b) => (b.name!.length ?? 0) - (a.name!.length ?? 0));
    pickedChars = [];
    for (const ch of candidates) {
      const nm = ch.name!.trim();
      if (nm.length === 1 && pickedChars.some((p) => p.name !== nm && p.name!.includes(nm))) continue;
      pickedChars.push(ch);
    }
    pickedChars.sort((a, b) => firstCharacterMentionIndex(a, blob) - firstCharacterMentionIndex(b, blob));
  }

  type Entry = {
    base64: string;
    mimeType: string;
    label: string;
    injectNames: string[];
  };
  const entries: Entry[] = [];

  for (const ch of pickedChars) {
    const url = getCharacterShotImage(ch, shot);
    if (!url) continue;
    const raw = await fetchImageAsBase64(url);
    if (!raw) continue;
    const parsed = await compressImageToJpeg(raw.base64, raw.mimeType || 'image/png');
    const nm = ch.name!.trim();
    const overrideStateId = shot.characterStateOverrides?.[ch.id];
    const effectiveStateId = overrideStateId || ch.activeStateId;
    const effectiveState = effectiveStateId ? ch.states?.find((s) => s.id === effectiveStateId) : null;
    const stateLabel = effectiveState?.imageDataUrl ? effectiveState.label : null;
    entries.push({
      base64: parsed.base64,
      mimeType: parsed.mimeType,
      label: stateLabel ? `角色「${nm}」(${stateLabel})` : `角色「${nm}」`,
      injectNames: nm ? [nm] : [],
    });
  }

  const scene = (() => {
    if (manualOverrides?.sceneId !== undefined) {
      if (manualOverrides.sceneId === null) return null;
      return sceneSheets.find((s) => s.id === manualOverrides!.sceneId) ?? null;
    }
    return sceneSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef) ?? null;
  })();
  if (scene) {
    const url = firstSceneVariantImageUrl(scene);
    if (url) {
      const raw = await fetchImageAsBase64(url);
      if (raw) {
        const parsed = await compressImageToJpeg(raw.base64, raw.mimeType || 'image/png');
        const sn = scene.name?.trim() || '';
        const injectNames = new Set<string>();
        if (sn) injectNames.add(sn);
        if (scene.sceneRef?.trim()) injectNames.add(scene.sceneRef.trim());
        if (sn.includes(' - ')) injectNames.add(sn.split(' - ')[0]!.trim());
        entries.push({
          base64: parsed.base64,
          mimeType: parsed.mimeType,
          label: `场景「${sn || scene.sceneRef}」`,
          injectNames: [...injectNames],
        });
      }
    }
  }

  if (propSheets?.length) {
    let propCandidates: typeof propSheets;
    if (manualOverrides?.propIds !== undefined) {
      propCandidates = manualOverrides.propIds
        .map((id) => propSheets.find((ps) => ps.id === id))
        .filter(Boolean) as typeof propSheets;
    } else {
      propCandidates = propSheets.filter((ps) => {
        const nm = ps.name?.trim();
        if (!nm || nm.length < 2) return false;
        return blob.includes(nm);
      });
      propCandidates.sort((a, b) => b.name.length - a.name.length);
    }
    for (const ps of propCandidates) {
      const url = firstPropVariantImageUrl(ps);
      if (!url) continue;
      const raw = await fetchImageAsBase64(url);
      if (!raw) continue;
      const parsed = await compressImageToJpeg(raw.base64, raw.mimeType || 'image/png');
      const nm = ps.name.trim();
      entries.push({
        base64: parsed.base64,
        mimeType: parsed.mimeType,
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

/** 从已注入 @图片n 的文案里提取第 n 张图的插入位置上下文（用于 UI 提示） */
export function extractAtImageContext(narrative: string, n: number): string {
  const tag = `@图片${n}`;
  const idx = narrative.indexOf(tag);
  if (idx < 0) return '';
  const before = narrative.slice(Math.max(0, idx - 10), idx).trim();
  return before ? `「…${before}」后` : '文案开头';
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

/**
 * 根据分镜内容自动匹配角色状态
 * 返回匹配的 CharacterState id，没有匹配则返回 undefined（使用基础形象）
 */
export function autoMatchCharacterState(
  shot: { action?: string; subject?: string; emotion?: string; notes?: string },
  states: Array<{ id: string; label: string }>,
): string | undefined {
  if (!states.length) return undefined;
  const text = [shot.action, shot.subject, shot.emotion, shot.notes].filter(Boolean).join(' ').toLowerCase();

  const rules: [RegExp, string[]][] = [
    [/战[斗打]|格斗|搏斗|厮[杀打]|持[刀剑]|拔[刀剑]|攻击|战场/, ['战斗', '战斗装束', '战']],
    [/哭[泣泣]|流泪|悲[伤痛]|泪水|痛哭/, ['哭戏', '哭泣', '悲伤']],
    [/受伤|[血伤]口|包扎|虚弱|倒地|伤/, ['受伤', '受伤状态']],
    [/正式|宴会|庆典|盛装|礼服|典礼/, ['正式', '正式场合']],
    [/日常|普通|休闲|平时|家中|家里/, ['日常', '日常装束']],
    [/职场|工作|办公|上班|会议/, ['职场', '职场着装']],
    [/运动|跑步|锻炼|训练|比赛/, ['运动', '运动装束']],
    [/胜利|庆祝|成功|获胜/, ['胜利', '胜利姿态']],
  ];

  for (const [pattern, keywords] of rules) {
    if (pattern.test(text)) {
      const matched = states.find((s) =>
        keywords.some((kw) => s.label.includes(kw))
      );
      if (matched) return matched.id;
    }
  }
  return undefined;
}

/**
 * 根据分镜描述关键词，自动匹配角色最合适的状态（新版：接受 CharacterSheet + 描述文本）
 * 返回匹配到的 CharacterState id，或 null（无匹配）
 */
export function autoMatchCharacterStateBySheet(
  sheet: CharacterSheet,
  shotDescription: string,
): string | null {
  const states = sheet.states ?? [];
  if (states.length === 0) return null;

  const desc = shotDescription.toLowerCase();

  // 关键词权重匹配
  const KEYWORD_GROUPS: Array<{ keywords: string[]; weight: number }> = [
    { keywords: ['战斗', '打斗', '搏击', '格斗', '战场', 'battle', 'fight'], weight: 10 },
    { keywords: ['正装', '西装', '礼服', '婚礼', '庆典', 'formal', 'suit'], weight: 10 },
    { keywords: ['正式', '宴会', '盛装', '典礼'], weight: 9 },
    { keywords: ['休闲', '日常', '家居', '放松', 'casual', 'daily'], weight: 8 },
    { keywords: ['睡衣', '睡觉', '卧室', 'pajama', 'sleep', 'bedroom'], weight: 10 },
    { keywords: ['运动', '健身', '跑步', '训练', 'sport', 'workout', 'gym'], weight: 9 },
    { keywords: ['雨', '雨天', '淋雨', 'rain', 'wet'], weight: 8 },
    { keywords: ['冬', '雪', '寒冷', '大衣', 'winter', 'snow', 'coat'], weight: 9 },
    { keywords: ['夏', '泳装', '海滩', '比基尼', 'summer', 'beach', 'swim'], weight: 9 },
    { keywords: ['悲伤', '哭泣', '流泪', '伤心', 'sad', 'cry', 'tears'], weight: 7 },
    { keywords: ['狂喜', '庆祝', '胜利', '开心', 'happy', 'celebrate', 'victory'], weight: 7 },
    { keywords: ['受伤', '伤口', '包扎', '虚弱', '倒地'], weight: 9 },
    { keywords: ['职场', '工作', '办公', '上班', '会议'], weight: 8 },
    { keywords: ['约会', '浪漫', '爱情', 'date', 'romantic'], weight: 8 },
  ];

  const scores = states.map((state) => {
    const label = (state.label ?? '').toLowerCase();
    const notes = (state.notes ?? '').toLowerCase();
    const stateText = label + ' ' + notes;

    let score = 0;

    for (const group of KEYWORD_GROUPS) {
      const descMatch = group.keywords.some((k) => desc.includes(k));
      const stateMatch = group.keywords.some((k) => stateText.includes(k));
      if (descMatch && stateMatch) score += group.weight;
    }

    // 直接字面量匹配（状态名出现在描述里，加高权重）
    if (label.length > 1 && desc.includes(label)) score += 15;

    return { id: state.id, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  return best && best.score > 0 ? best.id : null;
}
