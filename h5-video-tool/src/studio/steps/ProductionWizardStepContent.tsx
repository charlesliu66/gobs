import type { ComponentProps } from 'react';

import { StepDesignWorkspace } from './StepDesignWorkspace';
import { StepExportWorkspace } from './StepExportWorkspace';
import { StepInput } from './StepInput';
import { StepStoryboardWorkspace } from './StepStoryboardWorkspace';
import { StepStoryArc } from './StepStoryArc';

export interface ProductionWizardStepContentProps {
  step: number;
  story: ComponentProps<typeof StepStoryArc>['story'] | null;
  hasProductionDesign: boolean;
  hasShots: boolean;
  busyL3: boolean;
  stepInputProps: ComponentProps<typeof StepInput>;
  stepStoryArcProps: ComponentProps<typeof StepStoryArc>;
  stepDesignProps: ComponentProps<typeof StepDesignWorkspace>;
  stepStoryboardProps: ComponentProps<typeof StepStoryboardWorkspace>;
  stepExportProps: ComponentProps<typeof StepExportWorkspace>;
  inputRequiredMessage: string;
  storyRequiredMessage: string;
  designRequiredMessage: string;
}

export function ProductionWizardStepContent({
  step,
  story,
  hasProductionDesign,
  hasShots,
  busyL3,
  stepInputProps,
  stepStoryArcProps,
  stepDesignProps,
  stepStoryboardProps,
  stepExportProps,
  inputRequiredMessage,
  storyRequiredMessage,
  designRequiredMessage,
}: ProductionWizardStepContentProps) {
  return (
    <>
      {step === 0 && <StepInput {...stepInputProps} />}

      {step === 1 && story && <StepStoryArc {...stepStoryArcProps} />}

      {step === 2 && hasProductionDesign && <StepDesignWorkspace {...stepDesignProps} />}

      {step === 3 && (hasShots || busyL3) && <StepStoryboardWorkspace {...stepStoryboardProps} />}

      {step === 4 && <StepExportWorkspace {...stepExportProps} />}

      {step === 1 && !story && (
        <p className="text-sm text-[var(--color-text-muted)]">{inputRequiredMessage}</p>
      )}
      {step === 2 && !hasProductionDesign && (
        <p className="text-sm text-[var(--color-text-muted)]">{storyRequiredMessage}</p>
      )}
      {step === 3 && !hasShots && (
        <p className="text-sm text-[var(--color-text-muted)]">{designRequiredMessage}</p>
      )}
    </>
  );
}
