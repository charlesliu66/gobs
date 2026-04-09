/**
 * Studio「制片工程」：L1/L2/L3 生成与 Prompt 组装（Compass Gemini）
 */
import { jsonrepair } from 'jsonrepair';
import { compassChatCompletion, compassChatCompletionWithContent } from './promptPolish.js';
function extractJson(s) {
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m)
        return m[1].trim();
    return s.trim();
}
/** 从模型输出中截取第一个花括号配平的 JSON 对象（忽略尾部说明文字） */
function extractBalancedJsonObject(s) {
    const start = s.indexOf('{');
    if (start < 0)
        return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
        const c = s[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (inString) {
            if (c === '\\') {
                escape = true;
                continue;
            }
            if (c === '"')
                inString = false;
            continue;
        }
        if (c === '"') {
            inString = true;
            continue;
        }
        if (c === '{')
            depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0)
                return s.slice(start, i + 1);
        }
    }
    return null;
}
/**
 * 解析模型返回的 JSON（容错：代码块外杂质、尾随逗号、轻微截断/转义问题）。
 */
function parseLlmJson(raw, context) {
    const text = extractJson(raw).trim();
    const chunks = [];
    if (text)
        chunks.push(text);
    const balanced = extractBalancedJsonObject(text);
    if (balanced && balanced !== text)
        chunks.unshift(balanced);
    let lastErr;
    for (const chunk of chunks) {
        try {
            return JSON.parse(chunk);
        }
        catch (e) {
            lastErr = e;
        }
        try {
            return JSON.parse(jsonrepair(chunk));
        }
        catch (e) {
            lastErr = e;
        }
    }
    const hint = lastErr instanceof Error
        ? lastErr.message
        : String(lastErr);
    throw new Error(`${context}：JSON 解析失败（${hint}）。可重试生成，或适当缩短剧本/角色与场景数量。`);
}
const STORY_ARC_SYSTEM = `你是影视策划与编剧助手。根据用户提供的角色设定、故事梗概与结构模板，输出**三幕式或五幕式**等专业故事结构（按模板调整幕数），并包含情绪曲线、**全角色表**与**按地点划分的场景表**。

## 输出语言
与用户梗概一致（中文优先）。

## 输出 JSON 字段（仅使用下列字段；勿发明未列出的顶层字段）
{
  "structureTemplate": "three_act" | "five_act" | "save_the_cat",
  "logline": "一句话故事",
  "synopsis": "梗概展开或润色",
  "acts": [{ "index": 1, "title": "幕标题", "summary": "本幕摘要", "beatIds": ["b1"] }],
  "beats": [{ "id": "b1", "label": "节拍名", "storyPercent": 0.12, "description": "发生什么" }],
  "emotionCurve": [{ "t": 0, "emotion": 0.3, "note": "低落" }, { "t": 0.5, "emotion": 0.8, "note": "高潮" }],
  "pacingNotes": "节奏与剪辑节奏建议",
  "characters": [
    {
      "name": "角色名",
      "goal": "动机",
      "conflict": "冲突",
      "arc": "弧光可选",
      "role": "protagonist" | "supporting" | "antagonist" | "other"
    }
  ],
  "scenePlan": [
    {
      "id": "loc-001",
      "name": "具体地点/空间（见下）",
      "purpose": "该地点在叙事中的功能（如：人物首次相遇、秘密揭露）",
      "relatedBeatIds": ["b1"]
    }
  ],
  "importantProps": [{ "name": "道具名", "notes": "在剧情中的用途或视觉要点，可选" }]
}

## characters（必须遵守）
- 从【角色设定】与【故事梗概】中穷尽列出**所有有姓名或稳定称谓、且对剧情有影响的角色**：至少包含**主角 1 人**、**主要对立面或反派（若存在）**、以及**在梗概中多次出现或有关键戏份的配角**；不要只输出主角一人。
- 若梗概中明确提到多人互动、家庭/组织关系，必须把相关角色都列入。
- 每人必须带 "role"：全剧**恰好一名** "protagonist"；其余按剧情重要性标 supporting / antagonist / other。
- "goal" "conflict" 要具体，能指导后续定妆与分镜。

## scenePlan（必须遵守）
- 每一项代表一个**可实拍的具体地点或空间**（室内外均可），例如：「村口老槐树下」「主角家中堂屋」「镇上的诊所」「夜间的公路」。
- **禁止**用剧作节拍名、抽象幕名当作场景 name（错误示例：「第一幕」「高潮」「转折点」「真相揭露」——这些只能写在 beats 里，不能当作场景名）。
- **禁止**用「第一场戏」「第二段」这类顺序标签当作唯一场景名；name 必须是观众能理解的地理/空间概念。
- 场景数量应覆盖梗概里出现的**核心地理空间**；若故事在 3 个以上明显不同地点发生，scenePlan 至少应列出这些地点（通常不少于 3 条，除非梗概明确单一场景）。
- "id" 建议稳定、可引用，如 loc-001、loc-002；与节拍的关系用 "relatedBeatIds" 表达，而不是把节拍名塞进 "name"。
- "purpose" 写叙事功能即可。

## importantProps
- 列出梗概中**反复出现、或对情节有关键推动**的物件（信物、武器、关键证物等）；没有则给空数组 []。

## 其它数值要求
- beats 至少 5 个；emotionCurve 至少 5 个点，t 在 0~1；
- acts 数量与模板一致（three_act=3 幕，five_act=5 幕，save_the_cat 可将 15 节拍映射到 acts+beats）。`;
const ROLE_ORDER = {
    protagonist: 0,
    supporting: 1,
    antagonist: 2,
    other: 3,
};
function normalizeStoryArcLayer(raw) {
    const nameSeen = new Set();
    const characters = [];
    for (const c of Array.isArray(raw.characters) ? raw.characters : []) {
        const name = (c.name || '').trim();
        if (!name || nameSeen.has(name))
            continue;
        nameSeen.add(name);
        characters.push({
            ...c,
            name,
            goal: (c.goal || '').trim() || '—',
            conflict: (c.conflict || '').trim() || '—',
            ...(c.arc ? { arc: c.arc.trim() } : {}),
            ...(c.role ? { role: c.role } : {}),
        });
    }
    const protagonists = characters.filter((c) => c.role === 'protagonist');
    if (protagonists.length === 0 && characters.length > 0) {
        characters[0] = { ...characters[0], role: 'protagonist' };
    }
    else if (protagonists.length > 1) {
        let kept = false;
        for (let i = 0; i < characters.length; i++) {
            if (characters[i].role === 'protagonist') {
                if (kept) {
                    characters[i] = { ...characters[i], role: 'supporting' };
                }
                else {
                    kept = true;
                }
            }
        }
    }
    characters.sort((a, b) => {
        const ra = a.role != null ? (ROLE_ORDER[a.role] ?? 99) : 99;
        const rb = b.role != null ? (ROLE_ORDER[b.role] ?? 99) : 99;
        return ra - rb;
    });
    const idSeen = new Set();
    const scenePlan = [];
    for (const s of Array.isArray(raw.scenePlan) ? raw.scenePlan : []) {
        const id = (s.id || '').trim() || `loc-${scenePlan.length + 1}`;
        if (idSeen.has(id))
            continue;
        idSeen.add(id);
        scenePlan.push({
            ...s,
            id,
            name: (s.name || '').trim() || id,
            purpose: (s.purpose || '').trim() || '—',
            ...(Array.isArray(s.relatedBeatIds) && s.relatedBeatIds.length
                ? { relatedBeatIds: s.relatedBeatIds }
                : {}),
        });
    }
    const importantProps = [];
    const propSeen = new Set();
    for (const p of Array.isArray(raw.importantProps) ? raw.importantProps : []) {
        const name = (p?.name || '').trim();
        if (!name || propSeen.has(name))
            continue;
        propSeen.add(name);
        importantProps.push({
            name,
            ...(p.notes?.trim() ? { notes: p.notes.trim() } : {}),
        });
    }
    return {
        ...raw,
        characters,
        scenePlan,
        importantProps,
    };
}
export async function generateStoryArc(input) {
    const user = `【角色设定】\n${input.characterBible.trim()}\n\n【故事梗概】\n${input.synopsis.trim()}\n\n【风格参考】\n${input.styleRef.trim()}\n\n【结构模板】\n${input.structureTemplate}\n\n【硬性要求】characters 须覆盖梗概与设定中的主要与重要配角，不得仅输出主角一人；scenePlan 的每条 name 必须是具体地点/空间，不得用节拍名或幕名代替；importantProps 可为空数组。`;
    const raw = await compassChatCompletion({
        systemPrompt: STORY_ARC_SYSTEM,
        userText: user,
        temperature: 0.35,
        maxTokens: 8192,
    });
    const parsed = parseLlmJson(raw, '故事结构 L1');
    if (!parsed.logline || !Array.isArray(parsed.beats)) {
        throw new Error('故事结构解析失败：缺少必要字段');
    }
    return normalizeStoryArcLayer(parsed);
}
const PRODUCTION_DESIGN_SYSTEM = `你是美术指导与声音设计助理。根据已有故事结构（L1 JSON），输出服化道清单、灯光与色调、音效与音乐建议。

## 输出语言
与输入故事文本一致（中文优先）。

## JSON 语法（必须满足，否则无法解析）
- 仅输出**一个**合法 JSON 对象；不要在其前后添加说明段落。
- 所有键与字符串值使用双引号；字符串内的双引号必须转义为 \\"；字符串内禁止未转义的换行（换行请用 \\n）。
- 数组与对象最后一项后不要有尾随逗号。

## 场景与 L1 对齐（重要）
- L1 的 scenePlan[] 已按**具体地点**列出；sets[] 中每条 "sceneId" **必须与** L1 的 scenePlan[].id **一致**（逐条覆盖，不要改用节拍 id）。
- "description" 写该地点的陈设、空间尺度、时代感等，便于场景定帧图。

## 输出 JSON
{
  "wardrobe": [{ "character": "角色", "item": "服装/妆造", "notes": "可选" }],
  "props": [{ "name": "道具", "sceneRef": "loc-001 可选，与 L1 scene id 一致", "notes": "可选" }],
  "sets": [{ "sceneId": "loc-001", "description": "陈设与空间", "palette": "主色可选" }],
  "lighting": [{ "sceneId": "可选", "key": "主光", "fill": "辅光可选", "mood": "氛围" }],
  "colorGrading": "色调分级文字描述或一句总结",
  "soundMusic": {
    "sfx": [{ "moment": "段落/镜头", "idea": "音效想法" }],
    "music": [{ "segment": "段落", "mood": "情绪", "bpm": 120 }]
  }
}`;
export async function generateProductionDesign(story) {
    const user = `以下为故事结构 JSON，请生成 L2 制作清单：\n${JSON.stringify(story)}`;
    const raw = await compassChatCompletion({
        systemPrompt: PRODUCTION_DESIGN_SYSTEM,
        userText: user,
        temperature: 0.35,
        maxTokens: 8192,
    });
    const parsed = parseLlmJson(raw, '服化道 L2');
    // 容错：缺字段时补默认值，避免整个流程中断
    if (!parsed.wardrobe) {
        console.warn('[studio/production-design] wardrobe 字段缺失，使用默认空数组');
        parsed.wardrobe = [];
    }
    if (!parsed.soundMusic) {
        console.warn('[studio/production-design] soundMusic 字段缺失，使用默认值');
        parsed.soundMusic = {
            bgmStyle: '根据剧情自动匹配',
            sfxNotes: '自然音效',
            voiceOver: '',
        };
    }
    return parsed;
}
const STORYBOARD_TABLE_SYSTEM = `你是分镜导演。根据故事结构 L1、制作清单 L2 与用户约束，输出**专业分镜表**。每镜必须包含 15 个叙事字段，以及 structuredStill（8 子项）与 structuredMotion（5 子项），用于 AI 出图与图生视频。

## 输出语言
与梗概一致（中文优先）。

## 输出 JSON
{
  "shots": [
    {
      "shotIndex": 1,
      "durationSec": 6,
      "sceneRef": "loc-001",
      "shotScale": "景别",
      "cameraMove": "运镜",
      "lensFeel": "焦段/景深",
      "subject": "主体",
      "action": "动作",
      "composition": "构图",
      "lighting": "本镜光线",
      "emotion": "情绪",
      "continuity": "与上一镜衔接",
      "dialogue": "对白或空",
      "audioCue": "声音提示",
      "notes": "备注",
      "structuredStill": {
        "sp_subject": "",
        "sp_environment": "",
        "sp_style": "",
        "sp_lighting": "",
        "sp_camera": "",
        "sp_composition": "",
        "sp_continuity": "",
        "sp_negative": ""
      },
      "structuredMotion": {
        "mp_motion": "",
        "mp_camera": "",
        "mp_tempo": "",
        "mp_transition": "",
        "mp_audio": ""
      }
    }
  ]
}

要求：
- shots 数量在 6–14 之间，总时长建议不超过用户给定秒数；
- sceneRef 必须引用 L1 的 scenePlan[].id（具体地点 id），不要使用节拍 id；
- **场景全覆盖（与「角色与场景」定帧一一对应）**：当 L1 的 scenePlan 条数 ≤14 时，**scenePlan 中每一个 id 都必须在至少一镜的 sceneRef 中出现**，不得只写故事核心地点而遗漏其它已规划空间；若某地点在剧情中戏份较少，可安排 1 个短镜（如过渡、远景、或一句对白）也要出现该 sceneRef。
- 第一镜 continuity 可为「开场」；
- structuredStill / structuredMotion 各子项填写具体、可执行的中文短句（适合复制到文生图/视频模型）。`;
/** L1 scenePlan 中尚未出现在任何一镜 sceneRef 里的 id */
function scenePlanIdsMissingFromShots(shots, scenePlan) {
    const required = new Set(scenePlan.map((s) => String(s.id || '').trim()).filter(Boolean));
    const used = new Set(shots.map((sh) => String(sh.sceneRef || '').trim()).filter(Boolean));
    return [...required].filter((id) => !used.has(id));
}
export async function generateStoryboardTable(input) {
    const baseUser = `【L1】\n${JSON.stringify(input.story)}\n\n【L2】\n${JSON.stringify(input.productionDesign)}\n\n【约束】全片总时长不超过 ${input.maxTotalDurationSec} 秒。${input.extraNotes ? `\n【补充】${input.extraNotes}` : ''}`;
    const runOnce = async (userText) => {
        const raw = await compassChatCompletion({
            systemPrompt: STORYBOARD_TABLE_SYSTEM,
            userText,
            temperature: 0.35,
            maxTokens: 16384,
        });
        return parseLlmJson(raw, '分镜表 L3');
    };
    let parsed = await runOnce(baseUser);
    if (!parsed.shots?.length)
        throw new Error('分镜表为空');
    const plan = input.story.scenePlan ?? [];
    let missing = plan.length > 0 && plan.length <= 14
        ? scenePlanIdsMissingFromShots(parsed.shots, plan)
        : [];
    if (missing.length > 0) {
        const idsList = plan.map((s) => s.id).filter(Boolean).join('、');
        const repairUser = `${baseUser}\n\n【硬性修正】上一条输出中，下列 scenePlan.id 在任意一镜的 sceneRef 里都未出现：${missing.join('、')}。\nL1 全部地点 id 为：${idsList}。\n请重新输出**完整**的 shots 数组（仍 6–14 镜），使上述每一个遗漏的 id 都至少作为一镜的 sceneRef 出现；可与叙事节奏结合安排短镜或过渡镜。`;
        parsed = await runOnce(repairUser);
        if (!parsed.shots?.length)
            throw new Error('分镜表为空');
        missing = scenePlanIdsMissingFromShots(parsed.shots, plan);
    }
    if (plan.length > 0 && plan.length <= 14 && missing.length > 0) {
        throw new Error(`分镜表仍未覆盖 L1 全部场景，以下 scenePlan.id 未出现在任何一镜的 sceneRef：${missing.join('、')}。请再次点击「生成分镜表」或精简 scenePlan 后重试。`);
    }
    return parsed.shots;
}
const EXTRACT_VISUAL_SYSTEM = `你是角色设计分析助手。根据用户上传的角色图，提取用于**跨镜头一致性**的视觉特征，输出 JSON：
{
  "silhouette": "体态与轮廓",
  "faceHair": "面部与发型",
  "costume": "服装与配饰",
  "props": "标志性道具",
  "palette": "主色与配色",
  "styleKeywords": ["关键词1","关键词2"],
  "consistencySnippet": "一段可拼入文生图 prompt 的英文或中文短描述（Nano Banana 风格：具体、可重复）"
}
勿输出无关键。禁止涉及真人姓名。`;
const EXTRACT_STYLE_SYSTEM = `你是影视与视觉风格分析助手。用户上传一张**风格参考图**（可能是剧照、概念图、游戏截图、插画等）。请做**反解析**：提炼画面风格，用于后续 AI 视频/分镜统一画风。

## 注意
- 描述**画风、光影、色调、时代/类型、媒介感**（如电影感 2.35:1、3D 渲染、赛博朋克），不要复述图中具体剧情或角色姓名。
- 若含真人面孔，只描述光线与摄影风格，不涉及身份。
- 输出**中文**为主，keywords 可中英混合。

## 输出 JSON（严格）
{
  "styleRefSummary": "3–6 句连贯段落，可直接作为「风格参考」文案，涵盖色调、光线、镜头气质、氛围与类型标签",
  "palette": "主色、辅色、对比关系",
  "lighting": "光位、明暗、氛围",
  "composition": "构图倾向（对称/留白/张力等）",
  "cameraAndLens": "景别倾向、焦段感、运动气质",
  "eraGenre": "时代感与类型（如近未来科幻、古风武侠）",
  "medium": "媒介感（实拍/3D/三渲二/插画等）",
  "keywords": ["关键词1","keyword2"],
  "negativeHints": "生成时应避免的元素（可选）",
  "promptSnippet": "一句可拼进英文或中文 video prompt 的短句（可选）"
}`;
export async function extractStyleReference(input) {
    const raw = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mime = input.mimeType?.trim() || 'image/png';
    const dataUrl = `data:${mime};base64,${raw}`;
    const text = await compassChatCompletionWithContent({
        systemPrompt: EXTRACT_STYLE_SYSTEM,
        userContent: [
            { type: 'text', text: '请反解析这张参考图的风格，输出 JSON。' },
            { type: 'image_url', image_url: { url: dataUrl } },
        ],
        temperature: 0.25,
        maxTokens: 2048,
    });
    const parsed = parseLlmJson(text, '风格反解析');
    if (!parsed.styleRefSummary?.trim()) {
        throw new Error('风格反解析失败：未返回 styleRefSummary');
    }
    return parsed;
}
export async function extractCharacterVisuals(input) {
    const raw = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mime = input.mimeType?.trim() || 'image/png';
    const dataUrl = `data:${mime};base64,${raw}`;
    const text = await compassChatCompletionWithContent({
        systemPrompt: EXTRACT_VISUAL_SYSTEM,
        userContent: [
            { type: 'text', text: '请分析这张角色设计图并输出 JSON。' },
            { type: 'image_url', image_url: { url: dataUrl } },
        ],
        temperature: 0.2,
        maxTokens: 2048,
    });
    return parseLlmJson(text, '角色视觉提取');
}
function joinStill(sp) {
    return [
        `【主体】${sp.sp_subject}`,
        `【环境】${sp.sp_environment}`,
        `【风格】${sp.sp_style}`,
        `【光线】${sp.sp_lighting}`,
        `【机位景别】${sp.sp_camera}`,
        `【构图】${sp.sp_composition}`,
        `【连续】${sp.sp_continuity}`,
        `【规避】${sp.sp_negative}`,
    ].join('\n');
}
function joinMotion(mp) {
    return [
        `【主体运动】${mp.mp_motion}`,
        `【摄影机】${mp.mp_camera}`,
        `【节奏】${mp.mp_tempo}`,
        `【衔接】${mp.mp_transition}`,
        `【声画】${mp.mp_audio}`,
    ].join('\n');
}
export function assemblePrompts(input) {
    const prefix = input.characterVisualProfile?.consistencySnippet?.trim() ?
        `【角色一致性】${input.characterVisualProfile.consistencySnippet}\n\n`
        : '';
    const shots = input.shots.map((sh) => {
        const still = joinStill(sh.structuredStill);
        const motion = joinMotion(sh.structuredMotion);
        const seedanceBlock = `${prefix}镜头${sh.shotIndex}｜${sh.durationSec}s｜${sh.shotScale}｜${sh.cameraMove}\n${still}\n---运动---\n${motion}\n@img1 角色参考 @img2 场景参考`;
        const klingPrompt = `${prefix}${still}\n${motion}`.replace(/\s+/g, ' ').trim();
        const nanoBananaStyle = input.characterVisualProfile ?
            `[一致性] ${input.characterVisualProfile.consistencySnippet}\n[ still ] ${still}\n[ motion ] ${motion}`
            : `[ still ] ${still}\n[ motion ] ${motion}`;
        return {
            shotIndex: sh.shotIndex,
            seedanceBlock,
            klingPrompt,
            nanoBananaStyle,
        };
    });
    return { shots };
}
