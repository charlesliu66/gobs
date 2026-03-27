import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'h5-materials-folder';

function loadFromStorage(): { folderUrl: string; verifiedFolderId: string | null; verifiedFolderName: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { folderUrl: '', verifiedFolderId: null, verifiedFolderName: null };
    const data = JSON.parse(raw);
    return {
      folderUrl: typeof data.folderUrl === 'string' ? data.folderUrl : '',
      verifiedFolderId: typeof data.verifiedFolderId === 'string' ? data.verifiedFolderId : null,
      verifiedFolderName: typeof data.verifiedFolderName === 'string' ? data.verifiedFolderName : null,
    };
  } catch {
    return { folderUrl: '', verifiedFolderId: null, verifiedFolderName: null };
  }
}

function saveToStorage(folderUrl: string, verifiedFolderId: string | null, verifiedFolderName: string | null) {
  try {
    if (verifiedFolderId && verifiedFolderName) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ folderUrl, verifiedFolderId, verifiedFolderName }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

type FolderStatus =
  | 'idle'
  | 'no_link'
  | 'invalid_link'
  | 'disconnected'
  | 'verifying'
  | 'verified'
  | 'denied';

interface MaterialsState {
  folderUrl: string;
  folderStatus: FolderStatus;
  verifiedFolderId: string | null;
  verifiedFolderName: string | null;
  accessToken: string | null;
  verifyError: string | null;
}

interface MaterialsContextValue extends MaterialsState {
  setFolderUrl: (v: string) => void;
  setFolderStatus: (v: FolderStatus) => void;
  setMaterialsReady: (id: string, name: string, folderUrl?: string) => void;
  setAccessToken: (v: string | null) => void;
  setVerifyError: (v: string | null) => void;
  resetFolder: () => void;
}

const MaterialsContext = createContext<MaterialsContextValue | null>(null);

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MaterialsState>(() => {
    const stored = loadFromStorage();
    return {
      folderUrl: stored.folderUrl,
      folderStatus: stored.verifiedFolderId ? 'verified' : 'idle',
      verifiedFolderId: stored.verifiedFolderId,
      verifiedFolderName: stored.verifiedFolderName,
      accessToken: null,
      verifyError: null,
    };
  });

  const setMaterialsReady = useCallback((id: string, name: string, folderUrl?: string) => {
    setState((s) => {
      const url = folderUrl ?? s.folderUrl;
      const next = { ...s, folderUrl: url, verifiedFolderId: id, verifiedFolderName: name, folderStatus: 'verified' as FolderStatus, verifyError: null };
      saveToStorage(url, id, name);
      return next;
    });
  }, []);

  const resetFolder = useCallback(() => {
    setState((s) => {
      saveToStorage('', null, null);
      return { ...s, verifiedFolderId: null, verifiedFolderName: null, folderStatus: 'idle', verifyError: null };
    });
  }, []);

  const value: MaterialsContextValue = {
    ...state,
    setFolderUrl: (v) =>
      setState((s) => ({
        ...s,
        folderUrl: v,
      })),
    setFolderStatus: (v) => setState((s) => ({ ...s, folderStatus: v })),
    setMaterialsReady,
    setAccessToken: (v) => setState((s) => ({ ...s, accessToken: v })),
    setVerifyError: (v) => setState((s) => ({ ...s, verifyError: v })),
    resetFolder,
  };

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterials() {
  const ctx = useContext(MaterialsContext);
  if (!ctx) throw new Error('useMaterials must be used within MaterialsProvider');
  return ctx;
}
