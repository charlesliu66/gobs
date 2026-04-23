import type { UiLocale } from '../i18n/locale.ts';

export type DeploymentPhase = 'idle' | 'preparing' | 'deploying' | 'verifying';
export type DeploymentTone = 'info' | 'warning' | 'critical';

export interface DeploymentStatePayload {
  active: boolean;
  phase: DeploymentPhase;
  level: DeploymentTone;
  messageZh: string;
  messageEn: string;
  allowWrites: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface DeploymentBannerViewModel {
  visible: boolean;
  phase: DeploymentPhase;
  tone: DeploymentTone;
  title: string;
  message: string;
  allowWrites: boolean;
}

interface RuntimeVersionLabelArgs {
  productName: string;
  environment?: string | null;
  branch: string;
  commit: string;
}

function isEnglish(locale: UiLocale): boolean {
  return locale === 'en';
}

function fallbackTitle(phase: DeploymentPhase, locale: UiLocale): string {
  if (isEnglish(locale)) {
    if (phase === 'preparing') return 'Deployment Notice';
    if (phase === 'deploying') return 'Deployment In Progress';
    if (phase === 'verifying') return 'Deployment Verification';
    return 'System Notice';
  }
  if (phase === 'preparing') return '发布提醒';
  if (phase === 'deploying') return '系统发布中';
  if (phase === 'verifying') return '发布验证中';
  return '系统通知';
}

function fallbackMessage(phase: DeploymentPhase, locale: UiLocale): string {
  if (isEnglish(locale)) {
    if (phase === 'preparing') return 'The system will be updated soon. Please save your current work first.';
    if (phase === 'deploying') return 'The system is being updated. Please avoid duplicate submissions for now.';
    if (phase === 'verifying') return 'The update is complete. If anything looks off, refresh the page once.';
    return '';
  }
  if (phase === 'preparing') return '系统即将更新，请先保存当前工作。';
  if (phase === 'deploying') return '系统正在发布更新，请暂时不要重复提交任务。';
  if (phase === 'verifying') return '系统已完成更新，如有异常请刷新页面。';
  return '';
}

export function resolveDeploymentBanner(
  state: DeploymentStatePayload | null | undefined,
  locale: UiLocale,
): DeploymentBannerViewModel {
  const phase = state?.phase ?? 'idle';
  const visible = Boolean(state?.active) && phase !== 'idle';
  const message = (isEnglish(locale) ? state?.messageEn : state?.messageZh)?.trim() || fallbackMessage(phase, locale);

  return {
    visible,
    phase,
    tone: state?.level ?? (phase === 'deploying' ? 'critical' : phase === 'preparing' ? 'warning' : 'info'),
    title: fallbackTitle(phase, locale),
    message,
    allowWrites: state?.allowWrites ?? phase !== 'deploying',
  };
}

export function formatRuntimeVersionLabel({
  productName,
  environment,
  branch,
  commit,
}: RuntimeVersionLabelArgs): string {
  const env = (environment || '').trim().toLowerCase();
  const envTag = env && env !== 'unknown' ? ` [${env.toUpperCase()}]` : '';
  return `${productName}${envTag} ${branch}@${commit}`;
}
