import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import db from '../db/assetDb.js';
import { resolvePath } from '../infra/storage/resolver.js';
import { applyRuleTags } from './assetTaggingService.js';
import { ensureThumbnail } from './assetThumbnailService.js';
import { AI_CATEGORIES } from '../types/assetLibrary.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nanoid } = require('nanoid') as { nanoid: (size?: number) => string };

const CHARACTER_AI_CATEGORY = AI_CATEGORIES[0] ?? '角色';
const CHARACTER_TEAM_CATEGORY = 'character_image';
const CHARACTER_PROJECT_ID = 'character-library';

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export interface CharacterLibraryStateAssetInput {
  id: string;
  label: string;
  imageDataUrl?: string;
}

export interface CharacterLibraryLookAssetInput {
  id: string;
  label: string;
  imageDataUrl?: string;
}

export interface CharacterLibraryAssetBinding {
  assetId: string;
  slotKey: string;
  filename: string;
  updatedAt: string;
}

export interface SyncCharacterLibraryAssetsInput {
  username: string;
  characterId: string;
  characterName: string;
  sourceProject?: string;
  baseImageDataUrl?: string;
  states?: CharacterLibraryStateAssetInput[];
  lookTree?: CharacterLibraryLookAssetInput[];
  existingBindings?: Record<string, CharacterLibraryAssetBinding> | null;
}

export interface SyncCharacterLibraryAssetsResult {
  bindings: Record<string, CharacterLibraryAssetBinding>;
  assetCount: number;
}

interface AssetRow {
  id: string;
  username: string;
  filepath: string;
  folder_id: string | null;
  created_at: string;
}

interface ParsedDataUrl {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

interface CharacterImageSlot {
  slotKey: string;
  slotLabel: string;
  imageDataUrl: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeDiskName(raw: string): string {
  const normalized = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || 'character_asset';
}

function buildFriendlyFilename(characterName: string, slotLabel: string, extension: string): string {
  const base = [characterName.trim(), slotLabel.trim()].filter(Boolean).join('__');
  return `${base || 'character_asset'}${extension}`;
}

function parseImageDataUrl(dataUrl: string | undefined): ParsedDataUrl | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!match) return null;
  const mimeType = match[1]!.toLowerCase();
  const extension = IMAGE_EXTENSION_BY_MIME[mimeType] ?? '.png';
  const buffer = Buffer.from(match[2]!, 'base64');
  if (buffer.length === 0) return null;
  return { buffer, mimeType, extension };
}

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function deleteAssetTags(assetId: string): void {
  db.prepare(`DELETE FROM asset_tags WHERE asset_id = @asset_id`).run({ asset_id: assetId });
}

function insertHumanTag(assetId: string, key: string, value: string, createdAt: string): void {
  const normalized = value.trim();
  if (!normalized) return;
  db.prepare(`
    INSERT INTO asset_tags (asset_id, key, value, source, confidence, status, created_at)
    VALUES (@asset_id, @key, @value, 'human', 1.0, 'confirmed', @created_at)
  `).run({
    asset_id: assetId,
    key,
    value: normalized,
    created_at: createdAt,
  });
}

function addCharacterTags(
  assetId: string,
  characterName: string,
  slotLabel: string,
  characterId: string,
  sourceProject: string | undefined,
  createdAt: string,
): void {
  insertHumanTag(assetId, 'character', characterName, createdAt);
  insertHumanTag(assetId, 'purpose', 'character_reference', createdAt);
  insertHumanTag(assetId, 'source', 'character_library', createdAt);
  insertHumanTag(assetId, 'library_character_id', characterId, createdAt);
  insertHumanTag(assetId, 'appearance_slot', slotLabel, createdAt);
  if (sourceProject?.trim()) {
    insertHumanTag(assetId, 'source_project', sourceProject.trim(), createdAt);
  }
}

function listImageSlots(input: SyncCharacterLibraryAssetsInput): CharacterImageSlot[] {
  const slots: CharacterImageSlot[] = [];
  if (input.baseImageDataUrl) {
    slots.push({
      slotKey: 'base',
      slotLabel: 'base',
      imageDataUrl: input.baseImageDataUrl,
    });
  }

  for (const state of input.states ?? []) {
    if (!state.imageDataUrl) continue;
    slots.push({
      slotKey: `state:${state.id}`,
      slotLabel: `state-${state.label || state.id}`,
      imageDataUrl: state.imageDataUrl,
    });
  }

  for (const node of input.lookTree ?? []) {
    if (!node.imageDataUrl) continue;
    slots.push({
      slotKey: `look:${node.id}`,
      slotLabel: `look-${node.label || node.id}`,
      imageDataUrl: node.imageDataUrl,
    });
  }

  return slots;
}

function getExistingAssetRow(assetId: string, username: string): AssetRow | undefined {
  return db.prepare(`
    SELECT id, username, filepath, folder_id, created_at
    FROM assets
    WHERE id = @id AND username = @username
  `).get({ id: assetId, username }) as AssetRow | undefined;
}

function buildAssetDescription(characterName: string, slotLabel: string, sourceProject?: string): string {
  const pieces = [`Character library`, characterName.trim(), slotLabel.trim()].filter(Boolean);
  if (sourceProject?.trim()) pieces.push(sourceProject.trim());
  return pieces.join(' / ');
}

function writeAssetFile(targetPath: string, buffer: Buffer): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
}

function upsertCharacterImageAsset(
  input: SyncCharacterLibraryAssetsInput,
  slot: CharacterImageSlot,
  parsed: ParsedDataUrl,
  existingBinding: CharacterLibraryAssetBinding | undefined,
): CharacterLibraryAssetBinding {
  const now = nowIso();
  const fileHash = sha256(parsed.buffer);
  const existing = existingBinding ? getExistingAssetRow(existingBinding.assetId, input.username) : undefined;
  const assetId = existing?.id ?? nanoid(21);
  const diskName = safeDiskName(`${input.characterName}_${slot.slotLabel}`);
  const filename = buildFriendlyFilename(input.characterName, slot.slotLabel, parsed.extension);
  const destPath = path.join(resolvePath('assets-ingest', input.username), `${assetId}-${diskName}${parsed.extension}`);
  const description = buildAssetDescription(input.characterName, slot.slotLabel, input.sourceProject);

  writeAssetFile(destPath, parsed.buffer);

  if (existing?.filepath && existing.filepath !== destPath && fs.existsSync(existing.filepath)) {
    try {
      fs.rmSync(existing.filepath, { force: true });
    } catch {
      // ignore stale file cleanup failure
    }
  }

  if (existing) {
    db.prepare(`
      UPDATE assets
      SET project_id = @project_id,
          filename = @filename,
          filepath = @filepath,
          mimetype = @mimetype,
          filesize = @filesize,
          sha256 = @sha256,
          width = NULL,
          height = NULL,
          duration = NULL,
          fps = NULL,
          orientation = NULL,
          has_audio = 0,
          status = 'ready',
          ai_category = @ai_category,
          ai_description = @ai_description,
          team_category = @team_category,
          deleted_at = NULL,
          updated_at = @updated_at
      WHERE id = @id AND username = @username
    `).run({
      id: existing.id,
      username: input.username,
      project_id: CHARACTER_PROJECT_ID,
      filename,
      filepath: destPath,
      mimetype: parsed.mimeType,
      filesize: parsed.buffer.byteLength,
      sha256: fileHash,
      ai_category: CHARACTER_AI_CATEGORY,
      ai_description: description,
      team_category: CHARACTER_TEAM_CATEGORY,
      updated_at: now,
    });
  } else {
    db.prepare(`
      INSERT INTO assets (
        id,
        username,
        project_id,
        filename,
        filepath,
        mimetype,
        filesize,
        sha256,
        width,
        height,
        duration,
        fps,
        orientation,
        has_audio,
        status,
        ai_category,
        ai_description,
        team_category,
        folder_id,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @username,
        @project_id,
        @filename,
        @filepath,
        @mimetype,
        @filesize,
        @sha256,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        0,
        'ready',
        @ai_category,
        @ai_description,
        @team_category,
        NULL,
        @created_at,
        @updated_at
      )
    `).run({
      id: assetId,
      username: input.username,
      project_id: CHARACTER_PROJECT_ID,
      filename,
      filepath: destPath,
      mimetype: parsed.mimeType,
      filesize: parsed.buffer.byteLength,
      sha256: fileHash,
      ai_category: CHARACTER_AI_CATEGORY,
      ai_description: description,
      team_category: CHARACTER_TEAM_CATEGORY,
      created_at: now,
      updated_at: now,
    });
  }

  deleteAssetTags(assetId);
  applyRuleTags(assetId, {
    id: assetId,
    username: input.username,
    project_id: CHARACTER_PROJECT_ID,
    filename,
    filepath: destPath,
    mimetype: parsed.mimeType,
    filesize: parsed.buffer.byteLength,
    sha256: fileHash,
    width: null,
    height: null,
    duration: null,
    fps: null,
    orientation: null,
    has_audio: 0,
    status: 'ready',
    ai_category: CHARACTER_AI_CATEGORY,
    ai_description: description,
    team_category: CHARACTER_TEAM_CATEGORY,
    folder_id: existing?.folder_id ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
  addCharacterTags(assetId, input.characterName, slot.slotLabel, input.characterId, input.sourceProject, now);
  void ensureThumbnail(destPath, parsed.mimeType);

  return {
    assetId,
    slotKey: slot.slotKey,
    filename,
    updatedAt: now,
  };
}

export function syncCharacterLibraryAssets(
  input: SyncCharacterLibraryAssetsInput,
): SyncCharacterLibraryAssetsResult {
  const slots = listImageSlots(input);
  if (slots.length === 0) {
    return { bindings: {}, assetCount: 0 };
  }

  const bindings: Record<string, CharacterLibraryAssetBinding> = {};
  const hashBindings = new Map<string, CharacterLibraryAssetBinding>();

  for (const slot of slots) {
    const parsed = parseImageDataUrl(slot.imageDataUrl);
    if (!parsed) continue;

    const contentHash = sha256(parsed.buffer);
    const existingFromHash = hashBindings.get(contentHash);
    if (existingFromHash) {
      bindings[slot.slotKey] = {
        assetId: existingFromHash.assetId,
        slotKey: slot.slotKey,
        filename: existingFromHash.filename,
        updatedAt: existingFromHash.updatedAt,
      };
      continue;
    }

    const binding = upsertCharacterImageAsset(input, slot, parsed, input.existingBindings?.[slot.slotKey]);
    bindings[slot.slotKey] = binding;
    hashBindings.set(contentHash, binding);
  }

  return {
    bindings,
    assetCount: new Set(Object.values(bindings).map((binding) => binding.assetId)).size,
  };
}
