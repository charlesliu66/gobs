import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { PortraitEditIntent } from '../components/production/CharacterPortraitEditorModal';
import type { CharacterSheet, ProductionShot } from './productionTypes';

type L2Tab = 'characters' | 'scenes' | 'props' | 'checklist';
type ChecklistSubTab = 'wardrobe' | 'props' | 'raw';
type PortraitEditState = { sheet: CharacterSheet; intent: PortraitEditIntent } | null;
type ScenePropModalState = {
  kind: 'scene' | 'prop';
  sheetId: string;
  variantId: string;
  name: string;
  basePrompt: string;
  currentImageDataUrl?: string;
} | null;

export interface ProductionContextValue {
  setStep: Dispatch<SetStateAction<number>>;
  selectedShotIdx: number;
  setSelectedShotIdx: Dispatch<SetStateAction<number>>;
  l2Tab: L2Tab;
  setL2Tab: Dispatch<SetStateAction<L2Tab>>;
  checklistSubTab: ChecklistSubTab;
  setChecklistSubTab: Dispatch<SetStateAction<ChecklistSubTab>>;
  showLibraryImport: boolean;
  setShowLibraryImport: Dispatch<SetStateAction<boolean>>;
  portraitEdit: PortraitEditState;
  setPortraitEdit: Dispatch<SetStateAction<PortraitEditState>>;
  scenePropModal: ScenePropModalState;
  setScenePropModal: Dispatch<SetStateAction<ScenePropModalState>>;
  scenePropPreview: string | null;
  setScenePropPreview: Dispatch<SetStateAction<string | null>>;
  scenePropError: string | null;
  setScenePropError: Dispatch<SetStateAction<string | null>>;
  scenePropGenBusy: boolean;
  setLightboxSrc: Dispatch<SetStateAction<string | null>>;
  patchShot: (index: number, patch: Partial<ProductionShot>) => void;
}

const ProductionContext = createContext<ProductionContextValue | null>(null);

export function ProductionProvider({
  value,
  children,
}: {
  value: ProductionContextValue;
  children: ReactNode;
}) {
  return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>;
}

export function useProductionContext(): ProductionContextValue {
  const ctx = useContext(ProductionContext);
  if (!ctx) {
    throw new Error('useProductionContext must be used within ProductionProvider');
  }
  return ctx;
}

