import React from 'react';

import { AccountGroupPicker } from './AccountGroupPicker.tsx';

void React;

export interface DistributeStepAccount {
  id: string;
  username: string;
  platform?: string;
  region?: string;
  remark?: string;
  profileUrl?: string;
}

interface AccountGroupPickerLabels {
  title: string;
  empty: string;
  config: string;
  custom: string;
  selected: string;
  save: string;
  savePlaceholder: string;
  cancel: string;
  delete: string;
  selectedCount: string;
}

interface DistributeStepAccountsLabels {
  step: string;
  title: string;
  loadingAccounts: string;
  noAccountsTitle: string;
  noAccountsHintLine1: string;
  noAccountsHintLine2: string;
  learnGeelark: string;
  noPermissionTitle: string;
  noPermissionHint: string;
  selectedCountLabel: string;
  selectVisible: string;
  clearSelection: string;
  region: string;
  platform: string;
  all: string;
  noMatchedAccounts: string;
  profileLink: string;
  accountGroups: AccountGroupPickerLabels;
}

interface DistributeStepAccountsProps {
  accounts: DistributeStepAccount[];
  accountsForPermission: DistributeStepAccount[];
  filteredAccounts: DistributeStepAccount[];
  selectedIds: Set<string>;
  loading: boolean;
  error: string | null;
  regions: string[];
  platforms: string[];
  filterRegion: string;
  filterPlatform: string;
  labels: DistributeStepAccountsLabels;
  onSelectVisible: (accounts: DistributeStepAccount[]) => void;
  onClearSelection: () => void;
  onFilterRegionChange: (region: string) => void;
  onFilterPlatformChange: (platform: string) => void;
  onApplyAccountGroup: (accountIds: string[], selected: boolean) => void;
  onToggleAccount: (accountId: string) => void;
}

export function DistributeStepAccounts({
  accounts,
  accountsForPermission,
  filteredAccounts,
  selectedIds,
  loading,
  error,
  regions,
  platforms,
  filterRegion,
  filterPlatform,
  labels,
  onSelectVisible,
  onClearSelection,
  onFilterRegionChange,
  onFilterPlatformChange,
  onApplyAccountGroup,
  onToggleAccount,
}: DistributeStepAccountsProps) {
  return (
    <section className="mb-6 space-y-4 border-b border-[var(--color-border)] pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {labels.step}
        </span>
        <h2 className="section-title">{labels.title}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{labels.loadingAccounts}</p>
      ) : error ? (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--color-text)]">{labels.noAccountsTitle}</p>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {labels.noAccountsHintLine1}<br />
            {labels.noAccountsHintLine2}
          </p>
          <a
            href="https://geelark.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
          >
            {labels.learnGeelark}
          </a>
        </div>
      ) : accountsForPermission.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-[var(--color-text)]">{labels.noPermissionTitle}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{labels.noPermissionHint}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              {labels.selectedCountLabel} {selectedIds.size}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectVisible(filteredAccounts)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              >
                {labels.selectVisible}
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
              >
                {labels.clearSelection}
              </button>
            </div>
          </div>

          {(regions.length > 0 || platforms.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-3">
              {regions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{labels.region}</span>
                  <select
                    value={filterRegion}
                    onChange={(event) => onFilterRegionChange(event.target.value)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
                  >
                    <option value="">{labels.all}</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              )}
              {platforms.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{labels.platform}</span>
                  <select
                    value={filterPlatform}
                    onChange={(event) => onFilterPlatformChange(event.target.value)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
                  >
                    <option value="">{labels.all}</option>
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <AccountGroupPicker
              accounts={accountsForPermission}
              selectedIds={selectedIds}
              onApplyGroup={onApplyAccountGroup}
              labels={labels.accountGroups}
            />
          </div>

          <div className="space-y-2">
            {filteredAccounts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{labels.noMatchedAccounts}</p>
            ) : (
              filteredAccounts.map((account) => (
                <label key={account.id} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(account.id)}
                    onChange={() => onToggleAccount(account.id)}
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text)]">{account.username}</span>
                  {account.remark && <span className="text-xs text-[var(--color-text-muted)]">({account.remark})</span>}
                  {account.profileUrl && (
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      {labels.profileLink}
                    </a>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
