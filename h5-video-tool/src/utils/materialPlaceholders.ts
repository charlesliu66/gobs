import type { DriveFile } from '../hooks/useGoogleDrive';

const PLACEHOLDER_PREFIX = 'empty-';

export function filterPlaceholders(order: DriveFile[]): DriveFile[] {
  return order.filter((file) => !file.id.startsWith(PLACEHOLDER_PREFIX));
}
