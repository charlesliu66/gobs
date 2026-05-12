import type { ComponentProps } from 'react';

import { ImageLightbox } from '../../components/ImageLightbox';
import { ProductionProjectListModal } from '../components/ProductionProjectListModal';
import { StepStoryboardAbCompare } from './StepStoryboardAbCompare';
import { StepStoryboardContinuousPlay } from './StepStoryboardContinuousPlay';

export interface ProductionWizardNamingModalState {
  open: boolean;
  name: string;
}

export interface ProductionWizardOverlayLayerProps {
  projectListModalProps: ComponentProps<typeof ProductionProjectListModal>;
  projectNamingModal: ProductionWizardNamingModalState;
  onProjectNamingChange: (nextName: string) => void;
  onCloseProjectNaming: () => void;
  onConfirmProjectNaming: () => void;
  projectNamingTitle: string;
  projectNamingDescription: string;
  projectNamingPlaceholder: string;
  cancelLabel: string;
  confirmLabel: string;
  lightboxSrc: string | null;
  onCloseLightbox: () => void;
  continuousPlayProps: ComponentProps<typeof StepStoryboardContinuousPlay> | null;
  abCompareProps: ComponentProps<typeof StepStoryboardAbCompare> | null;
}

export function ProductionWizardOverlayLayer({
  projectListModalProps,
  projectNamingModal,
  onProjectNamingChange,
  onCloseProjectNaming,
  onConfirmProjectNaming,
  projectNamingTitle,
  projectNamingDescription,
  projectNamingPlaceholder,
  cancelLabel,
  confirmLabel,
  lightboxSrc,
  onCloseLightbox,
  continuousPlayProps,
  abCompareProps,
}: ProductionWizardOverlayLayerProps) {
  return (
    <>
      <ProductionProjectListModal {...projectListModalProps} />
      {projectNamingModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) onCloseProjectNaming();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[var(--color-text)]">{projectNamingTitle}</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{projectNamingDescription}</p>
            <input
              autoFocus
              type="text"
              value={projectNamingModal.name}
              onChange={(event) => onProjectNamingChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onConfirmProjectNaming();
                if (event.key === 'Escape') onCloseProjectNaming();
              }}
              placeholder={projectNamingPlaceholder}
              className="mt-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCloseProjectNaming}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirmProjectNaming}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={onCloseLightbox} />}
      {continuousPlayProps && <StepStoryboardContinuousPlay {...continuousPlayProps} />}
      {abCompareProps && <StepStoryboardAbCompare {...abCompareProps} />}
    </>
  );
}
