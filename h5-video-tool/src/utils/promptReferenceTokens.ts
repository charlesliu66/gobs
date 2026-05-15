import type { SeedanceMediaKind } from '../config/seedanceSourceConstraints';

export interface PromptReferenceTokenSource {
  id?: string;
  slotId?: string;
  kind: SeedanceMediaKind;
  filename?: string;
  title?: string;
  token?: string;
  semanticRole?: 'role' | 'scene' | string;
}

export interface PromptReferenceUsage<T extends PromptReferenceTokenSource = PromptReferenceTokenSource> {
  source: T;
  referenced: boolean;
}

const TOKEN_LABELS: Record<SeedanceMediaKind, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
};

export function getPromptReferenceToken(kind: SeedanceMediaKind, zeroBasedIndex: number): string {
  return `@${TOKEN_LABELS[kind]}${zeroBasedIndex + 1}`;
}

export function assignPromptReferenceTokens<T extends PromptReferenceTokenSource>(sources: T[]): Array<T & { token: string }> {
  const counters: Record<SeedanceMediaKind, number> = { image: 0, video: 0, audio: 0 };

  return sources.map((source) => {
    if (source.token) return { ...source, token: source.token };
    const token = getPromptReferenceToken(source.kind, counters[source.kind]);
    counters[source.kind] += 1;
    return { ...source, token };
  });
}

export function insertPromptReferenceToken(
  prompt: string,
  token: string,
  selectionStart = prompt.length,
  selectionEnd = selectionStart,
): { value: string; cursor: number; inserted: boolean } {
  if (!token.trim() || prompt.includes(token)) {
    return { value: prompt, cursor: selectionEnd, inserted: false };
  }

  const start = Math.max(0, Math.min(selectionStart, prompt.length));
  const end = Math.max(start, Math.min(selectionEnd, prompt.length));
  const before = prompt.slice(0, start);
  const after = prompt.slice(end);
  const leftSpace = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const rightSpace = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
  const value = `${before}${leftSpace}${token}${rightSpace}${after}`;
  const cursor = before.length + leftSpace.length + token.length + rightSpace.length;

  return { value, cursor, inserted: true };
}

export function getPromptReferenceUsage<T extends PromptReferenceTokenSource>(
  prompt: string,
  sources: Array<T & { token: string }>,
): Array<PromptReferenceUsage<T & { token: string }>> {
  return sources.map((source) => ({
    source,
    referenced: prompt.includes(source.token),
  }));
}
