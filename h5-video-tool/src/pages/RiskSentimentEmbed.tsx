import { RiskSentimentPage } from './RiskSentimentPage';

/**
 * 侧栏「风控大师」：直接挂载舆情页，不依赖 SJ/web :3000 / iframe。
 */
export function RiskMasterPanel() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
      <RiskSentimentPage />
    </div>
  );
}
