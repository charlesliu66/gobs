import type { ProductionWizardStepItem } from '../ProductionWizardShell';
import type { ProductionProject, StructureTemplate } from '../productionTypes';
import { loadStored, type StoredWizard } from '../productionWizardStorage';

export const PRODUCTION_WIZARD_TEMPLATE_OPTION_VALUES: StructureTemplate[] = [
  'three_act',
  'five_act',
  'save_the_cat',
];

export const PRODUCTION_WIZARD_ASPECT_OPTIONS = ['16:9', '9:16', '1:1', '4:3'] as const;

export const PRODUCTION_WIZARD_STEP_IDS = [0, 1, 2, 3, 4] as const;

export type ProductionWizardL2Tab = 'characters' | 'scenes' | 'props' | 'checklist';

export type ProductionWizardBatchTask = {
  kind: 'char' | 'scene' | 'prop';
  sheetId: string;
  variantId: string;
  prompt: string;
};

export interface ProductionWizardBatchAssetGenState {
  current: number;
  total: number;
  success: number;
  failed: number;
  startedAt: number;
  currentLabel?: string;
  failedTasks: ProductionWizardBatchTask[];
}

type TranslationFn = (path: string) => string;

type StorageLike = {
  getItem(key: string): string | null;
};

type SearchParamLike = Pick<URLSearchParams, 'get'>;

export interface ProductionWizardBootstrapState {
  urlProjectId: string | null;
  urlAssetId: string | null;
  lastStoredId: string | null;
  shouldLoadFromServer: boolean;
  initial: StoredWizard | null;
}

export function readLastStoredProductionProjectId(storage?: StorageLike | null): string | null {
  try {
    return storage?.getItem('gobs_last_project_id') ?? null;
  } catch {
    return null;
  }
}

export function resolveProductionWizardBootstrapState(
  searchParams: SearchParamLike,
  options?: {
    storage?: StorageLike | null;
    storedLoader?: () => StoredWizard | null;
  },
): ProductionWizardBootstrapState {
  const storage = options?.storage ?? globalThis.localStorage;
  const storedLoader = options?.storedLoader ?? loadStored;
  const urlProjectId = searchParams.get('projectId');
  const urlAssetId = searchParams.get('assetId');
  const lastStoredId = readLastStoredProductionProjectId(storage);
  const shouldLoadFromServer = Boolean(urlProjectId || lastStoredId);

  return {
    urlProjectId,
    urlAssetId,
    lastStoredId,
    shouldLoadFromServer,
    initial: shouldLoadFromServer ? null : storedLoader(),
  };
}

export function getProductionWizardStepItems(t: TranslationFn): ProductionWizardStepItem[] {
  return PRODUCTION_WIZARD_STEP_IDS.map((id) => ({
    id,
    label:
      id === 0
        ? t('productionWizard.stepInput')
        : id === 1
          ? t('productionWizard.stepStoryOutline')
          : id === 2
            ? t('productionWizard.stepDesign')
            : id === 3
              ? t('productionWizard.stepStoryboard')
              : t('productionWizard.stepExport'),
  }));
}

export function getProductionWizardTemplateOptions(t: TranslationFn): Array<{ value: StructureTemplate; label: string }> {
  return PRODUCTION_WIZARD_TEMPLATE_OPTION_VALUES.map((value) => ({
    value,
    label:
      value === 'three_act'
        ? t('productionWizard.templateThreeAct')
        : value === 'five_act'
          ? t('productionWizard.templateFiveAct')
          : t('productionWizard.templateSaveTheCat'),
  }));
}

export function getProductionWizardMaxReachableStep(project: ProductionProject): number {
  const hasVideoOutputs = project.shots?.some((shot) => {
    const value = shot as unknown as Record<string, unknown>;

    return Boolean(
      value.videoUrl ||
      value.videoPath ||
      ((value.videoVersions as unknown[] | undefined)?.length ?? 0),
    );
  });

  if (hasVideoOutputs) return 4;
  if (project.productionDesign) return 3;
  if (project.story) return 2;
  return 1;
}

export function getProductionWizardFooterHint(step: number, t: TranslationFn): string {
  if (step === 0) return t('productionWizard.footerStep0');
  if (step === 1) return t('productionWizard.footerStep1');
  if (step === 2) return t('productionWizard.footerStep2');
  if (step === 3) return t('productionWizard.footerStep3');
  return t('productionWizard.footerStep4');
}
