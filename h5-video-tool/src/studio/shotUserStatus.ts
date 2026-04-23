export type ShotUserStatus =
  | 'not_started'
  | 'waiting_submit'
  | 'platform_queueing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ShotProviderStatus =
  | 'awaiting_submit'
  | 'pending'
  | 'queuing'
  | 'processing'
  | 'done'
  | 'failed'
  | 'cancelled';

export type ShotUserStatusResult = {
  status: ShotUserStatus;
  labelKey: string;
};

const STATUS_LABEL_KEYS: Record<ShotUserStatus, string> = {
  not_started: 'productionWizard.status.notStarted',
  waiting_submit: 'productionWizard.status.waitingSubmit',
  platform_queueing: 'productionWizard.status.platformQueueing',
  generating: 'productionWizard.status.generating',
  completed: 'productionWizard.status.completed',
  failed: 'productionWizard.status.failed',
  cancelled: 'productionWizard.status.cancelled',
};

function result(status: ShotUserStatus): ShotUserStatusResult {
  return {
    status,
    labelKey: STATUS_LABEL_KEYS[status],
  };
}

export function getShotUserStatus(input: {
  hasVideo: boolean;
  jobStatus?: ShotProviderStatus;
  hasPendingSubmitId?: boolean;
}): ShotUserStatusResult {
  if (input.hasVideo) return result('completed');
  if (input.jobStatus === 'done') return result('completed');
  if (input.jobStatus === 'failed') return result('failed');
  if (input.jobStatus === 'cancelled') return result('cancelled');
  if (input.jobStatus === 'processing') return result('generating');
  if (input.jobStatus === 'pending' || input.jobStatus === 'queuing') return result('platform_queueing');
  if (input.jobStatus === 'awaiting_submit') return result('waiting_submit');
  if (input.hasPendingSubmitId) return result('generating');
  return result('not_started');
}
