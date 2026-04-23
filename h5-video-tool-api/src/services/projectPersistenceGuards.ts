function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

type SaveNameResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

type SaveTitleResult =
  | { ok: true; title: string }
  | { ok: false; error: string };

export function resolveEditorProjectSaveName(input: {
  incomingName?: string | null;
  existingName?: string | null;
  isNewProject: boolean;
}): SaveNameResult {
  const incomingName = normalizeText(input.incomingName);
  if (incomingName) {
    return { ok: true, name: incomingName.slice(0, 120) };
  }

  const existingName = normalizeText(input.existingName);
  if (!input.isNewProject && existingName) {
    return { ok: true, name: existingName.slice(0, 120) };
  }

  return {
    ok: false,
    error: 'Project name is required before the first formal save.',
  };
}

export function resolveProductionProjectSaveTitle(input: {
  incomingTitle?: string | null;
  existingTitle?: string | null;
  isNewProject: boolean;
}): SaveTitleResult {
  const incomingTitle = normalizeText(input.incomingTitle);
  if (incomingTitle) {
    return { ok: true, title: incomingTitle.slice(0, 120) };
  }

  const existingTitle = normalizeText(input.existingTitle);
  if (!input.isNewProject && existingTitle) {
    return { ok: true, title: existingTitle.slice(0, 120) };
  }

  return {
    ok: false,
    error: 'Project title is required before the first formal save.',
  };
}
