import { useEffect, useMemo, useState } from 'react';

import {
  buildAccountGroups,
  deleteCustomAccountGroup,
  saveCustomAccountGroup,
  type AccountGroup,
  type AccountGroupAccount,
} from '../../utils/accountGroups.ts';

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

interface AccountGroupPickerProps {
  accounts: AccountGroupAccount[];
  selectedIds: Set<string>;
  onApplyGroup: (accountIds: string[], shouldSelect: boolean) => void;
  labels: AccountGroupPickerLabels;
}

export function AccountGroupPicker({
  accounts,
  selectedIds,
  onApplyGroup,
  labels,
}: AccountGroupPickerProps) {
  const [customGroups, setCustomGroups] = useState<AccountGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    setCustomGroups(buildAccountGroups(accounts).filter((group) => group.source === 'custom'));
  }, [accounts]);

  const groups = useMemo(() => {
    const configGroups = buildAccountGroups(accounts).filter((group) => group.source === 'config');
    return [...configGroups, ...customGroups]
      .map((group) => ({
        ...group,
        accountIds: group.accountIds.filter((id) => accounts.some((account) => account.id === id)),
      }))
      .filter((group) => group.accountIds.length > 0);
  }, [accounts, customGroups]);

  const selectedCount = selectedIds.size;

  const handleSave = () => {
    const nextCustomGroups = saveCustomAccountGroup(accounts, groupName, [...selectedIds]);
    setCustomGroups(nextCustomGroups);
    setGroupName('');
    setSaving(false);
  };

  const handleDelete = (groupId: string) => {
    setCustomGroups(deleteCustomAccountGroup(accounts, groupId));
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{labels.title}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {labels.selectedCount.replace('{count}', String(selectedCount))}
          </p>
        </div>
        {saving ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder={labels.savePlaceholder}
              className="min-w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!groupName.trim() || selectedCount === 0}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setSaving(false);
                setGroupName('');
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
            >
              {labels.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSaving(true)}
            disabled={selectedCount === 0}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.save}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">{labels.empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const fullySelected = group.accountIds.every((id) => selectedIds.has(id));
            const sourceLabel = group.source === 'config' ? labels.config : labels.custom;
            return (
              <span
                key={group.id}
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                  fullySelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onApplyGroup(group.accountIds, !fullySelected)}
                  className="inline-flex min-w-0 items-center gap-2"
                >
                  <span className="truncate font-medium">{group.name}</span>
                  <span className={fullySelected ? 'text-white/75' : 'text-[var(--color-text-muted)]'}>
                    {group.accountIds.length}
                  </span>
                  <span className={fullySelected ? 'text-white/65' : 'text-[var(--color-text-subtle)]'}>
                    {fullySelected ? labels.selected : sourceLabel}
                  </span>
                </button>
                {group.source === 'custom' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(group.id)}
                    className={fullySelected ? 'text-white/75 hover:text-white' : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'}
                    aria-label={`${labels.delete} ${group.name}`}
                  >
                    x
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
