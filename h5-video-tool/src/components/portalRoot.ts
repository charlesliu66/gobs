const PORTAL_OWNER_ATTR = 'data-gobs-portal-owner';

function createPortalRoot(id: string): HTMLDivElement {
  const root = document.createElement('div');
  root.id = id;
  root.setAttribute(PORTAL_OWNER_ATTR, 'true');
  return root;
}

export function ensurePortalRoot(id: string): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;

  const existing = document.getElementById(id);
  if (existing instanceof HTMLDivElement) return existing;

  const root = createPortalRoot(id);
  document.body.appendChild(root);
  return root;
}

export function disposePortalRoot(root: HTMLDivElement | null): void {
  if (!root?.isConnected) return;
  if (root.childElementCount > 0) return;
  if (root.getAttribute(PORTAL_OWNER_ATTR) !== 'true') return;
  root.parentNode?.removeChild(root);
}
