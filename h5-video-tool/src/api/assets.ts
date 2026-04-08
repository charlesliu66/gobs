import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type AssetType = 'character' | 'scene' | 'prop' | 'style';

export interface Asset {
  id: string;
  file: string;
  driveFileId?: string;
  localPath?: string;
  type: AssetType;
  name: string;
  tags: string[];
  gameVersion: string;
  description: string;
  thumbnailBase64?: string;
}

export interface AssetIndex {
  version: string;
  updatedAt: string;
  assets: Asset[];
}

export interface AutoTagResult {
  type: AssetType;
  name: string;
  tags: string[];
  gameVersion: string;
  description: string;
}

export async function fetchAssets(): Promise<AssetIndex> {
  return apiGet('/api/assets');
}

export async function autoTagAsset(input: {
  imageBase64?: string;
  filename: string;
}): Promise<AutoTagResult> {
  return apiPost('/api/assets/auto-tag', input);
}

export async function uploadAsset(input: {
  imageBase64: string;
  filename: string;
  metadata?: Partial<Asset>;
}): Promise<{ asset: Asset; autoTag: AutoTagResult }> {
  return apiPost('/api/assets/upload', input);
}

export async function updateAsset(id: string, updates: Partial<Asset>): Promise<{ asset: Asset }> {
  return apiPut(`/api/assets/${id}`, updates);
}

export async function deleteAsset(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/assets/${id}`);
}

export async function scanAssets(): Promise<{ success: boolean; count: number }> {
  return apiPost('/api/assets/scan', {});
}

export async function getAssetImage(id: string): Promise<{ imageDataUrl: string }> {
  return apiGet(`/api/assets/${encodeURIComponent(id)}/image`);
}
