import { jsonrepair } from 'jsonrepair';

import { compassChatCompletion } from './promptPolish.js';
import type { ProductionDesignLayer, StoryArcLayer } from './studioPipeline.js';

const FALLBACK_SYSTEM_PROMPT = `You generate only one valid JSON object for a film production design layer.

Rules:
- Output JSON only. No markdown fences. No commentary.
- Use double quotes for every key and string value.
- Do not use trailing commas.
- "sets[].sceneId" must exactly match one of the input "scenePlan[].id" values.
- Keep every top-level field present, even when empty.

Required JSON shape:
{
  "wardrobe": [{ "character": "character name", "item": "costume or makeup", "notes": "optional notes" }],
  "props": [{ "name": "prop name", "sceneRef": "scene id or empty string", "notes": "optional notes" }],
  "sets": [{ "sceneId": "scene id", "description": "set description", "palette": "optional palette" }],
  "lighting": [{ "sceneId": "scene id or empty string", "key": "key light", "fill": "optional fill light", "mood": "mood" }],
  "colorGrading": "overall color grading summary",
  "soundMusic": {
    "sfx": [{ "moment": "moment", "idea": "sound effect idea" }],
    "music": [{ "segment": "segment", "mood": "mood", "bpm": 120 }]
  }
}`;

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}

function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSoundMusic(value: unknown): ProductionDesignLayer['soundMusic'] {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const sfx = Array.isArray(input.sfx) ? input.sfx : [];
  const music = Array.isArray(input.music) ? input.music : [];
  return {
    sfx: sfx
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        moment: normalizeString(item.moment),
        idea: normalizeString(item.idea),
      }))
      .filter((item) => item.moment || item.idea),
    music: music
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => {
        const bpm = typeof item.bpm === 'number' ? item.bpm : Number(item.bpm);
        return {
          segment: normalizeString(item.segment),
          mood: normalizeString(item.mood),
          ...(Number.isFinite(bpm) ? { bpm } : {}),
        };
      })
      .filter((item) => item.segment || item.mood || item.bpm != null),
  };
}

function normalizeProductionDesign(input: unknown): ProductionDesignLayer {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const wardrobe = Array.isArray(raw.wardrobe) ? raw.wardrobe : [];
  const props = Array.isArray(raw.props) ? raw.props : [];
  const sets = Array.isArray(raw.sets) ? raw.sets : [];
  const lighting = Array.isArray(raw.lighting) ? raw.lighting : [];

  return {
    wardrobe: wardrobe
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        character: normalizeString(item.character),
        item: normalizeString(item.item),
        ...(normalizeString(item.notes) ? { notes: normalizeString(item.notes) } : {}),
      }))
      .filter((item) => item.character || item.item || item.notes),
    props: props
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        name: normalizeString(item.name),
        ...(normalizeString(item.sceneRef) ? { sceneRef: normalizeString(item.sceneRef) } : {}),
        ...(normalizeString(item.notes) ? { notes: normalizeString(item.notes) } : {}),
      }))
      .filter((item) => item.name || item.sceneRef || item.notes),
    sets: sets
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        sceneId: normalizeString(item.sceneId),
        description: normalizeString(item.description),
        ...(normalizeString(item.palette) ? { palette: normalizeString(item.palette) } : {}),
      }))
      .filter((item) => item.sceneId || item.description || item.palette),
    lighting: lighting
      .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        ...(normalizeString(item.sceneId) ? { sceneId: normalizeString(item.sceneId) } : {}),
        key: normalizeString(item.key),
        ...(normalizeString(item.fill) ? { fill: normalizeString(item.fill) } : {}),
        mood: normalizeString(item.mood),
      }))
      .filter((item) => item.sceneId || item.key || item.fill || item.mood),
    colorGrading: normalizeString(raw.colorGrading),
    soundMusic: normalizeSoundMusic(raw.soundMusic),
  };
}

export function parseProductionDesignResponse(raw: string): ProductionDesignLayer {
  const text = extractJson(raw);
  const candidates = [text];
  const balanced = extractBalancedJsonObject(text);
  if (balanced && !candidates.includes(balanced)) candidates.unshift(balanced);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return normalizeProductionDesign(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
    try {
      return normalizeProductionDesign(JSON.parse(jsonrepair(candidate)));
    } catch (error) {
      lastError = error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Production design fallback parse failed: ${message}`);
}

export function isLikelyProductionDesignParseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /JSON|Unexpected token|Expected ','|Expected ']|Expected '}'|position \d+/i.test(message);
}

export async function requestProductionDesignFallback(story: StoryArcLayer): Promise<ProductionDesignLayer> {
  const raw = await compassChatCompletion({
    systemPrompt: FALLBACK_SYSTEM_PROMPT,
    userText: JSON.stringify({ story }),
    temperature: 0.2,
    maxTokens: 8192,
  });
  return parseProductionDesignResponse(raw);
}
