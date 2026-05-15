export type SeedanceMediaKind = 'image' | 'video' | 'audio';

export const SEEDANCE_DURATION_OPTIONS = [4, 5, 8, 10, 15] as const;

export const SEEDANCE_REFERENCE_LIMITS = {
  image: 9,
  video: 3,
  audio: 3,
  total: 12,
} as const;

export const SEEDANCE_REFERENCE_EXTENSIONS: Record<SeedanceMediaKind, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  video: ['mp4', 'mov'],
  audio: ['mp3', 'wav'],
};

export const SEEDANCE_REFERENCE_MIME_TYPES: Record<SeedanceMediaKind, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'],
};

export type SeedanceFileLike = {
  name?: string | null;
  filename?: string | null;
  type?: string | null;
  mimeType?: string | null;
  mimetype?: string | null;
  mime_type?: string | null;
};

export type SeedanceReferenceLike = {
  kind: SeedanceMediaKind;
};

export type SeedanceReferenceValidationReason =
  | 'ok'
  | 'missing-visual-reference'
  | 'audio-only'
  | 'too-many-images'
  | 'too-many-videos'
  | 'too-many-audios'
  | 'too-many-total';

export type SeedanceReferenceValidationResult = {
  ok: boolean;
  canGenerate: boolean;
  reason: SeedanceReferenceValidationReason;
  counts: Record<SeedanceMediaKind, number> & { total: number };
};

function normalizedMime(file: SeedanceFileLike): string {
  return String(file.type ?? file.mimeType ?? file.mimetype ?? file.mime_type ?? '').toLowerCase();
}

function normalizedName(file: SeedanceFileLike): string {
  return String(file.name ?? file.filename ?? '').toLowerCase();
}

function extensionOf(file: SeedanceFileLike): string {
  const name = normalizedName(file);
  return name.includes('.') ? name.split('.').pop() ?? '' : '';
}

export function inferSeedanceMediaKind(file: SeedanceFileLike): SeedanceMediaKind | null {
  const mime = normalizedMime(file);
  if (SEEDANCE_REFERENCE_MIME_TYPES.image.includes(mime)) return 'image';
  if (SEEDANCE_REFERENCE_MIME_TYPES.video.includes(mime)) return 'video';
  if (SEEDANCE_REFERENCE_MIME_TYPES.audio.includes(mime)) return 'audio';

  const ext = extensionOf(file);
  if (SEEDANCE_REFERENCE_EXTENSIONS.image.includes(ext)) return 'image';
  if (SEEDANCE_REFERENCE_EXTENSIONS.video.includes(ext)) return 'video';
  if (SEEDANCE_REFERENCE_EXTENSIONS.audio.includes(ext)) return 'audio';
  return null;
}

export function isSeedanceReferenceFileSupported(file: SeedanceFileLike, expectedKind?: SeedanceMediaKind): boolean {
  const inferred = inferSeedanceMediaKind(file);
  if (!inferred) return false;
  return expectedKind ? inferred === expectedKind : true;
}

export function getSeedanceAcceptString(kind: SeedanceMediaKind): string {
  const extensions = SEEDANCE_REFERENCE_EXTENSIONS[kind].map((ext) => `.${ext}`);
  return [...extensions, ...SEEDANCE_REFERENCE_MIME_TYPES[kind]].join(',');
}

export function validateSeedanceReferenceSet(refs: SeedanceReferenceLike[]): SeedanceReferenceValidationResult {
  const counts = refs.reduce(
    (acc, ref) => {
      acc[ref.kind] += 1;
      acc.total += 1;
      return acc;
    },
    { image: 0, video: 0, audio: 0, total: 0 },
  );

  let reason: SeedanceReferenceValidationReason = 'ok';
  if (counts.total > SEEDANCE_REFERENCE_LIMITS.total) reason = 'too-many-total';
  else if (counts.image > SEEDANCE_REFERENCE_LIMITS.image) reason = 'too-many-images';
  else if (counts.video > SEEDANCE_REFERENCE_LIMITS.video) reason = 'too-many-videos';
  else if (counts.audio > SEEDANCE_REFERENCE_LIMITS.audio) reason = 'too-many-audios';
  else if (counts.image === 0 && counts.video === 0 && counts.audio > 0) reason = 'audio-only';
  else if (counts.image === 0 && counts.video === 0) reason = 'missing-visual-reference';

  return {
    ok: reason === 'ok',
    canGenerate: reason === 'ok',
    reason,
    counts,
  };
}
