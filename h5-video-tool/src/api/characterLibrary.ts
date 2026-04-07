/**
 * 形象库前端 API
 */
import { apiGet, apiPost, apiDelete } from './client';

export interface LibraryCharacterState {
  id: string;
  label: string;
  imageDataUrl?: string;
  statePrompt?: string;
  notes?: string;
}

export interface LibraryCharacter {
  id: string;
  name: string;
  isProtagonist?: boolean;
  description?: string;
  baseImageDataUrl?: string;
  baseConfirmed?: boolean;
  states: LibraryCharacterState[];
  sourceProject?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LibraryCharacterSummary {
  id: string;
  name: string;
  isProtagonist?: boolean;
  baseImageDataUrl?: string;
  sourceProject?: string;
  tags?: string[];
  updatedAt: string;
  createdAt: string;
  stateCount: number;
}

export async function saveCharacterToLibrary(
  char: Partial<LibraryCharacter> & { name: string },
): Promise<{ id: string; updatedAt: string }> {
  return apiPost('/api/character-library/save', char);
}

export async function listCharacterLibrary(): Promise<{ characters: LibraryCharacterSummary[] }> {
  return apiGet('/api/character-library/list');
}

export async function getCharacterFromLibrary(id: string): Promise<LibraryCharacter> {
  return apiGet(`/api/character-library/${encodeURIComponent(id)}`);
}

export async function deleteCharacterFromLibrary(id: string): Promise<{ ok: boolean }> {
  return apiDelete(`/api/character-library/${encodeURIComponent(id)}`);
}

export async function shareCharacter(id: string): Promise<{ token: string; shareUrl: string; expiresAt: string }> {
  return apiPost(`/api/character-library/${encodeURIComponent(id)}/share`, {});
}

export async function getSharedCharacter(token: string): Promise<{ char: LibraryCharacter; expiresAt: string }> {
  return apiGet(`/api/character-library/share/${encodeURIComponent(token)}`);
}

export async function importSharedCharacter(token: string): Promise<{ id: string; name: string }> {
  return apiPost('/api/character-library/import', { token });
}
