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

type ReferencePromptLocale = 'zh' | 'en';

function normalizeReferencePromptLocale(locale?: string | null): ReferencePromptLocale {
  return String(locale || '').trim().toLowerCase().startsWith('en') ? 'en' : 'zh';
}

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
 * 优先级：分镜手动覆盖状态图 > 分镜内容自动匹配状态图 > 角色默认激活状态图 > lookTree 定稿图
 */
export function getCharacterShotImage(
  ch: CharacterSheet,
  shot?: Partial<ProductionShot> & { characterStateOverrides?: Record<string, string> },
): string | undefined {
  const overrideStateId = shot?.characterStateOverrides?.[ch.id];
  if (overrideStateId) {
    const st = ch.states?.find((s) => s.id === overrideStateId);
    if (st?.imageDataUrl) return st.imageDataUrl;
  }
  if (shot) {
    const autoStateId = autoMatchCharacterStateBySheet(ch, buildShotStateMatchText(shot));
    if (autoStateId) {
      const st = ch.states?.find((s) => s.id === autoStateId);
      if (st?.imageDataUrl) return st.imageDataUrl;
    }
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
  locale?: ReferencePromptLocale,
): string {
  const textLocale = normalizeReferencePromptLocale(locale);
  return [
    shot.structuredStill.sp_subject,
    shot.structuredStill.sp_environment,
    shot.structuredStill.sp_lighting,
    shot.structuredStill.sp_style,
    shot.structuredMotion.mp_motion,
    shot.structuredMotion.mp_camera,
    shot.structuredMotion.mp_tempo,
    shot.dialogue ? `${textLocale === 'en' ? 'Dialogue' : '对白'}：${shot.dialogue}` : '',
    shot.audioCue ? `${textLocale === 'en' ? 'Audio' : '声音'}：${shot.audioCue}` : '',
    globalStyleRef?.trim()
      ? `${textLocale === 'en' ? 'Overall visual style' : '整体视觉风格'}：${globalStyleRef.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function isAsciiText(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}

function isAsciiWordChar(value: string | undefined): boolean {
  return !!value && /[A-Za-z0-9_]/.test(value);
}

function aliasKey(value: string): string {
  const trimmed = value.trim();
  return isAsciiText(trimmed) ? trimmed.toLocaleLowerCase() : trimmed;
}

function uniqueAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = aliasKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function findAliasIndex(text: string, name: string, from = 0): number {
  const needle = name.trim();
  if (!needle) return -1;
  if (!isAsciiText(needle)) return text.indexOf(needle, from);
  const haystack = text.toLocaleLowerCase();
  const lowerNeedle = needle.toLocaleLowerCase();
  let idx = haystack.indexOf(lowerNeedle, from);
  while (idx >= 0) {
    const before = text[idx - 1];
    const after = text[idx + needle.length];
    if (!isAsciiWordChar(before) && !isAsciiWordChar(after)) return idx;
    idx = haystack.indexOf(lowerNeedle, idx + 1);
  }
  return -1;
}

function textIncludesAlias(text: string, name: string): boolean {
  return findAliasIndex(text, name) >= 0;
}

function splitEntityName(name: string): string[] {
  return name
    .split(/[\s·・·/_-]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
}

function buildEntityInjectNames(name: string): string[] {
  const trimmed = name.trim();
  const parts = splitEntityName(trimmed);
  const suffixes = parts.length >= 2 ? [parts.slice(-2).join(' ')] : [];
  const lastPart = parts.length ? parts[parts.length - 1]! : '';
  return uniqueAliases([trimmed, ...suffixes, lastPart]);
}

function buildSceneInjectNames(name: string, sceneRef?: string): string[] {
  const injectNames = buildEntityInjectNames(name);
  if (sceneRef?.trim()) injectNames.push(sceneRef.trim());
  if (name.includes(' - ')) injectNames.push(name.split(' - ')[0]!.trim());
  return uniqueAliases(injectNames);
}

function buildInjectionSlots(entries: { injectNames: string[] }[]): { injectNames: string[]; k: number }[] {
  const owners = new Map<string, Set<number>>();
  entries.forEach((entry, index) => {
    for (const name of uniqueAliases(entry.injectNames)) {
      const key = aliasKey(name);
      const set = owners.get(key) ?? new Set<number>();
      set.add(index);
      owners.set(key, set);
    }
  });

  return entries.map((entry, index) => ({
    injectNames: uniqueAliases(entry.injectNames).filter((name) => (owners.get(aliasKey(name))?.size ?? 0) === 1),
    k: index + 1,
  }));
}

function formatRefLabel(
  kind: 'character' | 'scene' | 'prop',
  name: string,
  locale: ReferencePromptLocale,
  stateLabel?: string | null,
): string {
  if (locale === 'en') {
    if (kind === 'character') return `Character [${name}]${stateLabel ? ` (${stateLabel})` : ''}`;
    if (kind === 'scene') return `Scene [${name}]`;
    return `Prop [${name}]`;
  }
  if (kind === 'character') return stateLabel ? `角色「${name}」(${stateLabel})` : `角色「${name}」`;
  if (kind === 'scene') return `场景「${name}」`;
  return `道具「${name}」`;
}

function formatReferencePromptSuffix(entries: { label: string }[], locale: ReferencePromptLocale): string {
  if (!entries.length) return '';
  if (locale === 'en') {
    return `Reference order (same as uploaded image order): ${entries
      .map((entry, i) => `@图片${i + 1} is ${entry.label}`)
      .join('; ')}.`;
  }
  return `参考对应（与上传素材顺序一致）：${entries.map((entry, i) => `@图片${i + 1}为${entry.label}`).join('，')}。`;
}

/**
 * 在叙事中首次出现的人名/场景名后插入 @图片k（先匹配更长名称，避免「龙一」命中「龙一的父亲」）。
 */
function tryInjectNameWithTag(text: string, name: string, tag: string): string | null {
  let from = 0;
  while (from < text.length) {
    const i = findAliasIndex(text, name, from);
    if (i < 0) return null;
    const actualName = text.slice(i, i + name.length);
    const afterText = text.slice(i + name.length);
    if (afterText.startsWith(tag)) {
      from = i + name.length + tag.length;
      continue;
    }
    if (/^@图片\d+/.test(afterText)) {
      from = i + name.length;
      continue;
    }
    const after = text.slice(i + name.length, i + name.length + 1);
    if (after === '的' && name.length <= 4) {
      from = i + 1;
      continue;
    }
    return text.slice(0, i) + actualName + tag + text.slice(i + name.length);
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
  return nm === '父亲'
    || nm === '爸爸'
    || /[父爸爹]/.test(nm)
    || /\b(father|dad|daddy|papa)\b/i.test(nm);
}

function motherLikeCharacterName(nm: string): boolean {
  if (nm.includes('师父')) return false;
  return nm === '母亲'
    || nm === '妈妈'
    || /[母妈娘]/.test(nm)
    || /\b(mother|mom|mommy|mama)\b/i.test(nm);
}

/** 角色是否被本镜文案「点到」：全名包含、全名拆分部分匹配，或称谓与卡名对应 */
export function characterMentionedInShotBlob(ch: CharacterSheet, blob: string): boolean {
  const nm = ch.name?.trim();
  if (!nm) return false;
  if (textIncludesAlias(blob, nm)) return true;
  // 拆分全名，任意部分 >=2 字出现在 blob 里也算匹配（处理「桜木 小樱」→「小樱」）
  const parts = splitEntityName(nm);
  if (parts.some((p) => textIncludesAlias(blob, p))) return true;
  if (/(父亲|爸爸|爹|老爹)/.test(blob) && fatherLikeCharacterName(nm)) return true;
  if (/\b(father|dad|daddy|papa)\b/i.test(blob) && fatherLikeCharacterName(nm)) return true;
  if (/(母亲|妈妈|娘|老妈)/.test(blob) && motherLikeCharacterName(nm)) return true;
  if (/\b(mother|mom|mommy|mama)\b/i.test(blob) && motherLikeCharacterName(nm)) return true;
  return false;
}

function firstCharacterMentionIndex(ch: CharacterSheet, blob: string): number {
  const nm = ch.name?.trim() ?? '';
  const nameIndex = nm ? findAliasIndex(blob, nm) : -1;
  if (nameIndex >= 0) return nameIndex;
  // 拆分部分匹配时取最早出现位置
  const parts = splitEntityName(nm);
  const partMin = parts.reduce((min, p) => {
    const idx = findAliasIndex(blob, p);
    return idx >= 0 ? Math.min(min, idx) : min;
  }, 1e9);
  if (partMin < 1e9) return partMin;
  if (nm && /(父亲|爸爸|爹|老爹)/.test(blob) && fatherLikeCharacterName(nm)) {
    const m = blob.match(/父亲|爸爸|爹|老爹/);
    if (m && m.index !== undefined) return m.index;
  }
  if (nm && /\b(father|dad|daddy|papa)\b/i.test(blob) && fatherLikeCharacterName(nm)) {
    const m = blob.match(/\b(father|dad|daddy|papa)\b/i);
    if (m && m.index !== undefined) return m.index;
  }
  if (nm && /(母亲|妈妈|娘|老妈)/.test(blob) && motherLikeCharacterName(nm)) {
    const m = blob.match(/母亲|妈妈|娘|老妈/);
    if (m && m.index !== undefined) return m.index;
  }
  if (nm && /\b(mother|mom|mommy|mama)\b/i.test(blob) && motherLikeCharacterName(nm)) {
    const m = blob.match(/\b(mother|mom|mommy|mama)\b/i);
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
  locale?: ReferencePromptLocale,
): {
  multimodalImages: { base64: string; mimeType: string }[];
  /** 与 multimodalImages 下标对齐，供 UI 展示 */
  labels: string[];
  /** 追加到叙事 prompt 后，说明 @图片n 与素材对应关系 */
  refPromptSuffix: string;
  narrativeWithInlineTags: string;
  defaultVideoPrompt: string;
} {
  const textLocale = normalizeReferencePromptLocale(locale);
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
      label: formatRefLabel('character', nm, textLocale, stateLabel),
      injectNames: nm ? buildEntityInjectNames(nm) : [],
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
        const sceneName = sn || scene.sceneRef;
        entries.push({
          base64: parsed.base64,
          mimeType: parsed.mimeType || 'image/png',
          label: formatRefLabel('scene', sceneName, textLocale),
          injectNames: buildSceneInjectNames(sn, scene.sceneRef),
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
        return buildEntityInjectNames(nm).some((candidate) => textIncludesAlias(blob, candidate));
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
        label: formatRefLabel('prop', nm, textLocale),
        injectNames: buildEntityInjectNames(nm),
      });
    }
  }

  const capped = entries.slice(0, 9);
  const refPromptSuffix = formatReferencePromptSuffix(capped, textLocale);

  const baseNarrative = buildProductionShotVideoStoryboardText(shot, undefined, textLocale);
  const slots = buildInjectionSlots(capped);
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
  locale?: ReferencePromptLocale,
): Promise<ReturnType<typeof buildShotMultimodalRefPack>> {
  const textLocale = normalizeReferencePromptLocale(locale);
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
      label: formatRefLabel('character', nm, textLocale, stateLabel),
      injectNames: nm ? buildEntityInjectNames(nm) : [],
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
        const sceneName = sn || scene.sceneRef;
        entries.push({
          base64: parsed.base64,
          mimeType: parsed.mimeType,
          label: formatRefLabel('scene', sceneName, textLocale),
          injectNames: buildSceneInjectNames(sn, scene.sceneRef),
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
        return buildEntityInjectNames(nm).some((candidate) => textIncludesAlias(blob, candidate));
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
        label: formatRefLabel('prop', nm, textLocale),
        injectNames: buildEntityInjectNames(nm),
      });
    }
  }

  const capped = entries.slice(0, 9);
  const refPromptSuffix = formatReferencePromptSuffix(capped, textLocale);

  const baseNarrative = buildProductionShotVideoStoryboardText(shot, undefined, textLocale);
  const slots = buildInjectionSlots(capped);
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
export function extractAtImageContext(narrative: string, n: number, locale?: string): string {
  const textLocale = normalizeReferencePromptLocale(locale);
  const tag = `@图片${n}`;
  const idx = narrative.indexOf(tag);
  if (idx < 0) return '';
  const before = narrative.slice(Math.max(0, idx - 10), idx).trim();
  if (textLocale === 'en') {
    const fullBefore = narrative.slice(0, idx).trim();
    const lastToken = fullBefore.split(/\s+/).filter(Boolean).at(-1) ?? before;
    return lastToken ? `after "...${lastToken}"` : 'at the start of the prompt';
  }
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
  locale?: string,
): string[] {
  const textLocale = normalizeReferencePromptLocale(locale);
  const tags: string[] = [];
  const scene = sceneSheets.find((s) => s.sceneRef === shot.sceneRef || s.id === shot.sceneRef);
  if (scene) tags.push(`@${scene.name}`);
  const blob = `${shot.subject} ${shot.action}`;
  for (const ch of characterSheets) {
    if (ch.name && characterMentionedInShotBlob(ch, blob)) {
      const node = getCharacterActiveNode(ensureCharacterLookTree(ch));
      const lab = node?.label ?? ch.variants[0]?.label;
      tags.push(`@${ch.name}${lab ? `-${lab}` : ''}`);
    }
  }
  return tags.length ? tags : [`@${textLocale === 'en' ? 'scene' : '场景'}:${shot.sceneRef}`];
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

function normalizeStateMatchText(value: string | undefined | null): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[，。！？、；：,.!?;:()[\]{}"'“”‘’<>《》【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildShotStateMatchText(shot: Partial<ProductionShot>): string {
  return normalizeStateMatchText([
    shot.subject,
    shot.action,
    shot.emotion,
    shot.notes,
    shot.dialogue,
    shot.audioCue,
    shot.structuredStill?.sp_subject,
    shot.structuredStill?.sp_environment,
    shot.structuredStill?.sp_style,
    shot.structuredMotion?.mp_motion,
    shot.structuredMotion?.mp_tempo,
  ].filter(Boolean).join(' '));
}

const CHARACTER_STATE_ALIAS_GROUPS: Array<{
  key: string;
  aliases: string[];
  weight: number;
}> = [
  {
    key: 'childhood',
    aliases: ['童年', '童年时期', '童年形象', '小时候', '小时侯', '幼年', '儿时', '孩提', '儿童', '孩童', '小孩', '小男孩', '小女孩', 'childhood', 'as a child', 'child', 'kid', 'little boy', 'little girl', 'younger self'],
    weight: 14,
  },
  {
    key: 'teen',
    aliases: ['少年', '少女', '少男', '青少年', '青春期', 'teen', 'teenager', 'adolescent'],
    weight: 12,
  },
  {
    key: 'young_adult',
    aliases: ['青年', '年轻', '年轻时期', '青年时期', 'young adult', 'youth'],
    weight: 10,
  },
  {
    key: 'middle_age',
    aliases: ['中年', '成熟时期', 'middle aged', 'middle-aged', 'mature'],
    weight: 10,
  },
  {
    key: 'elderly',
    aliases: ['老年', '老年时期', '年老', '年迈', '老人', '白发', 'elderly', 'old age', 'senior', 'aged'],
    weight: 12,
  },
  {
    key: 'battle',
    aliases: ['战斗', '打斗', '搏击', '格斗', '战场', '厮杀', '持刀', '持剑', '攻击', 'battle', 'fight', 'combat'],
    weight: 10,
  },
  {
    key: 'injured',
    aliases: ['受伤', '伤口', '包扎', '流血', '虚弱', '倒地', 'injured', 'wounded', 'bleeding'],
    weight: 10,
  },
  {
    key: 'formal',
    aliases: ['正式', '正装', '西装', '礼服', '宴会', '婚礼', '庆典', '典礼', 'formal', 'suit', 'gown'],
    weight: 9,
  },
  {
    key: 'casual',
    aliases: ['日常', '普通', '休闲', '家居', '平时', 'casual', 'daily', 'everyday'],
    weight: 8,
  },
  {
    key: 'sad',
    aliases: ['哭', '哭泣', '流泪', '泪水', '悲伤', '伤心', 'sad', 'cry', 'tears'],
    weight: 8,
  },
  {
    key: 'happy',
    aliases: ['开心', '高兴', '庆祝', '胜利', '获胜', '狂喜', 'happy', 'celebrate', 'victory'],
    weight: 7,
  },
  {
    key: 'work',
    aliases: ['职场', '工作', '办公', '上班', '会议', 'office', 'work', 'business'],
    weight: 8,
  },
  {
    key: 'sport',
    aliases: ['运动', '健身', '跑步', '训练', '比赛', 'sport', 'workout', 'gym', 'training'],
    weight: 8,
  },
];

function containsStateAlias(text: string, alias: string): boolean {
  const normalizedAlias = normalizeStateMatchText(alias);
  if (!normalizedAlias) return false;
  if (/^[a-z0-9 ]+$/.test(normalizedAlias)) {
    return new RegExp(`(^|\\s)${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(text);
  }
  return text.includes(normalizedAlias);
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

  const desc = normalizeStateMatchText(shotDescription);
  if (!desc) return null;

  const scores = states.map((state) => {
    const label = normalizeStateMatchText(state.label);
    const notes = normalizeStateMatchText(state.notes);
    const prompt = normalizeStateMatchText(state.statePrompt);
    const stateText = [label, notes, prompt].filter(Boolean).join(' ');

    let score = 0;

    if (label.length > 1 && desc.includes(label)) score += 30;
    if (notes.length > 1 && desc.includes(notes)) score += 10;

    for (const group of CHARACTER_STATE_ALIAS_GROUPS) {
      const descMatch = group.aliases.some((alias) => containsStateAlias(desc, alias));
      if (!descMatch) continue;
      const stateMatch = group.aliases.some((alias) => containsStateAlias(stateText, alias));
      if (stateMatch) score += group.weight;
    }

    for (const token of label.split(/\s+/).filter((part) => part.length >= 2)) {
      if (desc.includes(token)) score += 3;
    }

    return { id: state.id, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  return best && best.score > 0 ? best.id : null;
}
