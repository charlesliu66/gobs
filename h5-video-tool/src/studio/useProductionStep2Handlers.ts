import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { generateFrames } from '../api/storyboard';
import { uploadProductionImage } from '../api/production';
import { toast } from '../components/Toast';
import type { LibraryCharacter } from '../api/characterLibrary';
import type { PortraitJobState } from '../components/production/portraitJobKey';
import { getPortraitJobKey } from '../components/production/portraitJobKey';
import {
  addCharacterLookBranch,
  ensureCharacterLookTree,
  flattenLookTreeToVariants,
  setCharacterLookNodeImage,
} from './productionAssets';
import { updateVariantImage } from './productionWizardHelpers';
import type {
  AssetVariant,
  CharacterLookNode,
  CharacterSheet,
  CharacterState,
  ProductionProject,
  PropSheet,
  SceneSheet,
} from './productionTypes';

type ScenePropModalState = {
  kind: 'scene' | 'prop';
  sheetId: string;
  variantId: string;
  name: string;
  basePrompt: string;
  currentImageDataUrl?: string;
} | null;

type PortraitEditState = {
  sheet: CharacterSheet;
  intent: import('../components/production/CharacterPortraitEditorModal').PortraitEditIntent;
} | null;

export function useProductionStep2Handlers({
  ar,
  styleRefImageDataUrl,
  scenePropModal,
  scenePropPreview,
  portraitEdit,
  setProject,
  setErr,
  setGenKey,
  setScenePropGenBusy,
  setScenePropError,
  setScenePropPreview,
  setScenePropModal,
  setShowLibraryImport,
  setPortraitJobs,
  setPortraitEdit,
}: {
  ar: string;
  styleRefImageDataUrl?: string;
  scenePropModal: ScenePropModalState;
  scenePropPreview: string | null;
  portraitEdit: PortraitEditState;
  setProject: Dispatch<SetStateAction<ProductionProject>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  setGenKey: Dispatch<SetStateAction<string | null>>;
  setScenePropGenBusy: Dispatch<SetStateAction<boolean>>;
  setScenePropError: Dispatch<SetStateAction<string | null>>;
  setScenePropPreview: Dispatch<SetStateAction<string | null>>;
  setScenePropModal: Dispatch<SetStateAction<ScenePropModalState>>;
  setShowLibraryImport: Dispatch<SetStateAction<boolean>>;
  setPortraitJobs: Dispatch<SetStateAction<Record<string, PortraitJobState>>>;
  setPortraitEdit: Dispatch<SetStateAction<PortraitEditState>>;
}) {
  const runGenerateFrame = useCallback(
    async (prompt: string, sheetId: string, variantId: string, kind: 'char' | 'scene' | 'prop') => {
      setGenKey(`${kind}:${sheetId}:${variantId}`);
      setErr(null);
      try {
        const g = styleRefImageDataUrl?.trim();
        const res = await generateFrames({
          prompt,
          aspectRatio: ar,
          shotIndex: 0,
          singleFrameOnly: true,
          ...(g ? { globalStyleReferenceFrame: g } : {}),
        });
        const img = res.firstFrame;
        const applyImg = (url: string) => {
          setProject((p) => {
            if (kind === 'char') {
              const sheets = p.characterAssets ?? [];
              return {
                ...p,
                characterAssets: updateVariantImage(sheets, sheetId, variantId, url, 'char') as CharacterSheet[],
              };
            }
            if (kind === 'scene') {
              const sheets = p.sceneAssets ?? [];
              return {
                ...p,
                sceneAssets: updateVariantImage(sheets, sheetId, variantId, url, 'scene') as SceneSheet[],
              };
            }
            const sheets = p.propAssets ?? [];
            return {
              ...p,
              propAssets: updateVariantImage(sheets, sheetId, variantId, url, 'prop') as PropSheet[],
            };
          });
        };
        applyImg(img);
        if (img.startsWith('data:')) {
          const mime = img.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
          uploadProductionImage(img, mime, `${kind}-${sheetId}`).then(({ url }) => applyImg(url)).catch(() => {});
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : '生图失败');
      } finally {
        setGenKey(null);
      }
    },
    [ar, setErr, setGenKey, setProject, styleRefImageDataUrl],
  );

  const handleUploadVariant = useCallback(
    (file: File | null, sheetId: string, variantId: string, kind: 'char' | 'scene' | 'prop') => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProject((p) => {
          if (kind === 'char') {
            const sheets = p.characterAssets ?? [];
            return {
              ...p,
              characterAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'char') as CharacterSheet[],
            };
          }
          if (kind === 'scene') {
            const sheets = p.sceneAssets ?? [];
            return {
              ...p,
              sceneAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'scene') as SceneSheet[],
            };
          }
          const sheets = p.propAssets ?? [];
          return {
            ...p,
            propAssets: updateVariantImage(sheets, sheetId, variantId, dataUrl, 'prop') as PropSheet[],
          };
        });
      };
      reader.readAsDataURL(file);
    },
    [setProject],
  );

  const addCharacterVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.characterAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = sheets[i]!;
      const existingStates = sh.states ?? [];
      const newId = `state_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newState: CharacterState = {
        id: newId,
        label: `状态 ${existingStates.length + 1}`,
      };
      sheets[i] = { ...sh, states: [...existingStates, newState] };
      return { ...p, characterAssets: sheets };
    });
  }, [setProject]);

  const addSceneVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.sceneAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = sheets[i];
      const n = sh.variants.length + 1;
      const v: AssetVariant = { id: `sv-${sheetId}-${Date.now()}`, label: `变体 ${n}` };
      sheets[i] = { ...sh, variants: [...sh.variants, v] };
      return { ...p, sceneAssets: sheets };
    });
  }, [setProject]);

  const addPropVariant = useCallback((sheetId: string) => {
    setProject((p) => {
      const sheets = [...(p.propAssets ?? [])];
      const i = sheets.findIndex((s) => s.id === sheetId);
      if (i < 0) return p;
      const sh = sheets[i]!;
      const n = sh.variants.length + 1;
      const v: AssetVariant = { id: `pv-${sheetId}-${Date.now()}`, label: `变体 ${n}` };
      sheets[i] = { ...sh, variants: [...sh.variants, v] };
      return { ...p, propAssets: sheets };
    });
  }, [setProject]);

  const handleScenePropGenerate = useCallback(async (extraPrompt: string) => {
    if (!scenePropModal) return;
    const { kind, basePrompt } = scenePropModal;
    const fullPrompt = extraPrompt.trim() ? `${basePrompt}\n\n${extraPrompt.trim()}` : basePrompt;
    setScenePropGenBusy(true);
    setScenePropError(null);
    setScenePropPreview(null);
    try {
      const g = styleRefImageDataUrl?.trim();
      const res = await generateFrames({
        prompt: fullPrompt,
        aspectRatio: kind === 'scene' ? '16:9' : '1:1',
        shotIndex: 0,
        singleFrameOnly: true,
        ...(g ? { globalStyleReferenceFrame: g } : {}),
      });
      setScenePropPreview(res.firstFrame);
    } catch (e) {
      setScenePropError(e instanceof Error ? e.message : '生图失败');
    } finally {
      setScenePropGenBusy(false);
    }
  }, [scenePropModal, setScenePropError, setScenePropGenBusy, setScenePropPreview, styleRefImageDataUrl]);

  const handleScenePropConfirm = useCallback(() => {
    if (!scenePropModal || !scenePropPreview) return;
    const { kind, sheetId, variantId } = scenePropModal;
    const applyImg = (url: string) => {
      setProject((p) => {
        if (kind === 'scene') {
          const sheets = p.sceneAssets ?? [];
          return { ...p, sceneAssets: updateVariantImage(sheets, sheetId, variantId, url, 'scene') as SceneSheet[] };
        }
        const sheets = p.propAssets ?? [];
        return { ...p, propAssets: updateVariantImage(sheets, sheetId, variantId, url, 'prop') as PropSheet[] };
      });
    };
    applyImg(scenePropPreview);
    if (scenePropPreview.startsWith('data:')) {
      const mime = scenePropPreview.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
      uploadProductionImage(scenePropPreview, mime, `${kind}-${sheetId}`).then(({ url }) => applyImg(url)).catch(() => {});
    }
    setScenePropModal(null);
    setScenePropPreview(null);
  }, [scenePropModal, scenePropPreview, setProject, setScenePropModal, setScenePropPreview]);

  const handleScenePropReset = useCallback(() => {
    if (!scenePropModal) return;
    const { kind, sheetId, variantId } = scenePropModal;
    setProject((p) => {
      if (kind === 'scene') {
        return { ...p, sceneAssets: updateVariantImage(p.sceneAssets ?? [], sheetId, variantId, '', 'scene') as SceneSheet[] };
      }
      return { ...p, propAssets: updateVariantImage(p.propAssets ?? [], sheetId, variantId, '', 'prop') as PropSheet[] };
    });
    setScenePropPreview(null);
    setScenePropModal(null);
  }, [scenePropModal, setProject, setScenePropModal, setScenePropPreview]);

  const addManualCharacter = useCallback(() => {
    const name = window.prompt('角色名称');
    if (!name?.trim()) return;
    setProject((p) => {
      const sheets = [...(p.characterAssets ?? [])];
      const id = `ch-manual-${Date.now()}`;
      const rootId = `${id}-v0`;
      sheets.push({
        id,
        name: name.trim(),
        isProtagonist: false,
        variants: [{ id: rootId, label: '默认形象' }],
        lookTree: [{ id: rootId, parentId: null, label: '默认形象' }],
        activeLookId: rootId,
      });
      return { ...p, characterAssets: sheets };
    });
  }, [setProject]);

  const handleImportFromLibrary = useCallback((libChar: LibraryCharacter) => {
    const normalize = (v: string) => v.trim().toLowerCase();
    const mapStates = (raw: LibraryCharacter['states'] | undefined) =>
      raw?.map((s) => ({
        id: s.id ?? `state_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: s.label,
        imageDataUrl: s.imageDataUrl,
        statePrompt: s.statePrompt ?? '',
        notes: s.notes ?? '',
      })) ?? [];

    setProject((p) => {
      const list = [...(p.characterAssets ?? [])];
      const existingIdx = list.findIndex((c) => normalize(c.name) === normalize(libChar.name));
      if (existingIdx >= 0) {
        const existing = list[existingIdx]!;
        // 优先用库里保存的 lookTree，否则从 base 图重建
        let merged: CharacterSheet;
        if (libChar.lookTree?.length) {
          merged = {
            ...existing,
            lookTree: libChar.lookTree,
            activeLookId: libChar.activeLookId ?? libChar.lookTree.find((n) => n.parentId === null)?.id,
            variants: flattenLookTreeToVariants(libChar.lookTree),
          };
        } else {
          const ensured = ensureCharacterLookTree(existing);
          const root = ensured.lookTree?.find((n) => n.parentId === null) ?? ensured.lookTree?.[0];
          merged = root && libChar.baseImageDataUrl
            ? setCharacterLookNodeImage(ensured, root.id, libChar.baseImageDataUrl)
            : ensured;
        }
        list[existingIdx] = {
          ...merged,
          baseImageDataUrl: libChar.baseImageDataUrl,
          baseConfirmed: libChar.baseConfirmed ?? true,
          isProtagonist: existing.isProtagonist,
          states: mapStates(libChar.states).length > 0 ? mapStates(libChar.states) : existing.states,
        };
        return { ...p, characterAssets: list };
      }

      const id = `ch-lib-${Date.now()}`;
      const hasProtagonist = list.some((c) => c.isProtagonist);
      let lookTree: CharacterLookNode[];
      let activeLookId: string;
      let variants: AssetVariant[];
      if (libChar.lookTree?.length) {
        lookTree = libChar.lookTree as CharacterLookNode[];
        activeLookId = libChar.activeLookId ?? lookTree.find((n) => n.parentId === null)?.id ?? lookTree[0]!.id;
        variants = flattenLookTreeToVariants(lookTree);
      } else {
        const rootId = `${id}-v0`;
        lookTree = [{ id: rootId, parentId: null, label: '基础形象', imageDataUrl: libChar.baseImageDataUrl }];
        activeLookId = rootId;
        variants = [{ id: rootId, label: '基础形象', imageDataUrl: libChar.baseImageDataUrl }];
      }
      const newChar: CharacterSheet = {
        id,
        name: libChar.name,
        isProtagonist: hasProtagonist ? false : (libChar.isProtagonist ?? false),
        variants,
        lookTree,
        activeLookId,
        baseImageDataUrl: libChar.baseImageDataUrl,
        baseConfirmed: libChar.baseConfirmed ?? false,
        states: mapStates(libChar.states),
      };
      return {
        ...p,
        characterAssets: [...list, newChar],
      };
    });
    setShowLibraryImport(false);
    toast.success(`已应用角色形象「${libChar.name}」`);
  }, [setProject, setShowLibraryImport]);

  const handleTreeSheetChange = useCallback((next: CharacterSheet) => {
    setProject((p) => ({
      ...p,
      characterAssets: (p.characterAssets ?? []).map((c) =>
        c.id === next.id ? next : c,
      ),
    }));
  }, [setProject]);

  const handleRemoveCharacterVariant = useCallback((sheetId: string, variantId: string) => {
    setProject((p) => {
      const sheets = [...(p.characterAssets ?? [])];
      const idx = sheets.findIndex((s) => s.id === sheetId);
      if (idx < 0) return p;
      const sh = ensureCharacterLookTree(sheets[idx]!);
      const newLookTree = (sh.lookTree ?? []).filter((n) => n.id !== variantId);
      sheets[idx] = {
        ...sh,
        lookTree: newLookTree,
        variants: flattenLookTreeToVariants(newLookTree),
      };
      return { ...p, characterAssets: sheets };
    });
  }, [setProject]);

  const handlePortraitSheetUpdate = useCallback((updated: CharacterSheet) => {
    setProject((p) => ({
      ...p,
      characterAssets: (p.characterAssets ?? []).map((c) => c.id === updated.id ? updated : c),
    }));
  }, [setProject]);

  const handleConfirmPortrait = useCallback((imageDataUrl: string) => {
    if (!portraitEdit) return;
    const { sheet, intent } = portraitEdit;
    const key = getPortraitJobKey(sheet.id, intent);
    setPortraitJobs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const applyImage = (url: string) => {
      setProject((p) => {
        const list = p.characterAssets ?? [];
        if (intent.mode === 'replace') {
          const next = setCharacterLookNodeImage(
            ensureCharacterLookTree(sheet),
            intent.nodeId,
            url,
          );
          return {
            ...p,
            characterAssets: list.map((c) => (c.id === next.id ? next : c)),
          };
        }
        const s0 = ensureCharacterLookTree(sheet);
        const children = (s0.lookTree ?? []).filter((n) => n.parentId === intent.parentNodeId);
        const label = `变体 ${children.length + 1}`;
        const next = addCharacterLookBranch(s0, intent.parentNodeId, label, url);
        return {
          ...p,
          characterAssets: list.map((c) => (c.id === next.id ? next : c)),
        };
      });
    };

    applyImage(imageDataUrl);
    setPortraitEdit(null);

    if (imageDataUrl.startsWith('data:')) {
      const mime = imageDataUrl.match(/^data:([^;]+)/)?.[1] ?? 'image/jpeg';
      uploadProductionImage(imageDataUrl, mime, sheet.name)
        .then(({ url }) => applyImage(url))
        .catch((e) => console.warn('[portrait upload]', e));
    }
  }, [portraitEdit, setPortraitEdit, setPortraitJobs, setProject]);

  return {
    runGenerateFrame,
    handleUploadVariant,
    addCharacterVariant,
    addSceneVariant,
    addPropVariant,
    handleScenePropGenerate,
    handleScenePropConfirm,
    handleScenePropReset,
    addManualCharacter,
    handleImportFromLibrary,
    handleTreeSheetChange,
    handleRemoveCharacterVariant,
    handlePortraitSheetUpdate,
    handleConfirmPortrait,
  };
}

