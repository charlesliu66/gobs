export interface AccountGroupAccount {
  id: string;
  username?: string;
  platform?: string;
  region?: string;
  remark?: string;
}

export interface AccountGroup {
  id: string;
  name: string;
  accountIds: string[];
  source: 'config' | 'custom';
}

const STORAGE_KEY = 'gobs:distribute:account-groups';

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeGroupName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeGroupId(value: string): string {
  return normalizeGroupName(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
}

export function extractConfigGroupNames(remark?: string): string[] {
  if (!remark) return [];
  const names: string[] = [];
  const matcher = /(?:^|[,;|])\s*group:([^,;|]+)/gi;
  let match = matcher.exec(remark);
  while (match) {
    const name = normalizeGroupName(match[1] ?? '');
    if (name) names.push(name);
    match = matcher.exec(remark);
  }
  return uniqueStrings(names);
}

export function buildConfigAccountGroups(accounts: AccountGroupAccount[]): AccountGroup[] {
  const grouped = new Map<string, { name: string; accountIds: string[] }>();
  for (const account of accounts) {
    for (const name of extractConfigGroupNames(account.remark)) {
      const key = name.toLowerCase();
      const existing = grouped.get(key) ?? { name, accountIds: [] };
      existing.accountIds.push(account.id);
      grouped.set(key, existing);
    }
  }
  return [...grouped.values()]
    .map((group) => ({
      id: `config:${normalizeGroupId(group.name)}`,
      name: group.name,
      accountIds: uniqueStrings(group.accountIds),
      source: 'config' as const,
    }))
    .filter((group) => group.accountIds.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function sanitizeCustomGroups(value: unknown, permittedIds: Set<string>): AccountGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AccountGroup[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const rawName = typeof record.name === 'string' ? normalizeGroupName(record.name) : '';
    const rawId = typeof record.id === 'string' ? record.id.trim() : '';
    const accountIds = Array.isArray(record.accountIds)
      ? uniqueStrings(record.accountIds.filter((id): id is string => typeof id === 'string'))
        .filter((id) => permittedIds.has(id))
      : [];
    if (!rawName || accountIds.length === 0) return [];
    return [{
      id: rawId.startsWith('custom:') ? rawId : `custom:${normalizeGroupId(rawName)}`,
      name: rawName,
      accountIds,
      source: 'custom',
    }];
  });
}

export function loadCustomAccountGroups(accounts: AccountGroupAccount[]): AccountGroup[] {
  const permittedIds = new Set(accounts.map((account) => account.id));
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    return sanitizeCustomGroups(parsed, permittedIds);
  } catch {
    return [];
  }
}

function persistCustomAccountGroups(groups: AccountGroup[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(groups.map((group) => ({
      id: group.id,
      name: group.name,
      accountIds: uniqueStrings(group.accountIds),
    }))),
  );
}

export function buildAccountGroups(accounts: AccountGroupAccount[]): AccountGroup[] {
  return [
    ...buildConfigAccountGroups(accounts),
    ...loadCustomAccountGroups(accounts),
  ];
}

export function saveCustomAccountGroup(
  accounts: AccountGroupAccount[],
  name: string,
  accountIds: string[],
): AccountGroup[] {
  const normalizedName = normalizeGroupName(name);
  if (!normalizedName) return loadCustomAccountGroups(accounts);
  const permittedIds = new Set(accounts.map((account) => account.id));
  const filteredIds = uniqueStrings(accountIds).filter((id) => permittedIds.has(id));
  const existing = loadCustomAccountGroups(accounts);
  if (filteredIds.length === 0) return existing;

  const nextGroup: AccountGroup = {
    id: `custom:${normalizeGroupId(normalizedName)}`,
    name: normalizedName,
    accountIds: filteredIds,
    source: 'custom',
  };
  const next = [
    ...existing.filter((group) => group.id !== nextGroup.id && group.name.toLowerCase() !== normalizedName.toLowerCase()),
    nextGroup,
  ].sort((left, right) => left.name.localeCompare(right.name));
  persistCustomAccountGroups(next);
  return next;
}

export function updateCustomAccountGroup(
  accounts: AccountGroupAccount[],
  groupId: string,
  accountIds: string[],
): AccountGroup[] {
  const permittedIds = new Set(accounts.map((account) => account.id));
  const filteredIds = uniqueStrings(accountIds).filter((id) => permittedIds.has(id));
  const existing = loadCustomAccountGroups(accounts);
  const target = existing.find((group) => group.id === groupId);
  if (!target || filteredIds.length === 0) return existing;

  const next = existing
    .map((group) => (
      group.id === groupId
        ? { ...group, accountIds: filteredIds }
        : group
    ))
    .sort((left, right) => left.name.localeCompare(right.name));
  persistCustomAccountGroups(next);
  return next;
}

export function deleteCustomAccountGroup(accounts: AccountGroupAccount[], groupId: string): AccountGroup[] {
  const next = loadCustomAccountGroups(accounts).filter((group) => group.id !== groupId);
  persistCustomAccountGroups(next);
  return next;
}

export function summarizeAccountGroupMembers(
  group: Pick<AccountGroup, 'accountIds'>,
  accounts: AccountGroupAccount[],
  maxVisible = 3,
): string {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const names = group.accountIds
    .map((id) => {
      const account = accountById.get(id);
      const username = account?.username?.trim();
      const platform = account?.platform?.trim();
      if (username && platform) return `${username} (${platform})`;
      return username || id;
    })
    .filter(Boolean);
  const visible = names.slice(0, Math.max(1, maxVisible));
  const hiddenCount = Math.max(0, names.length - visible.length);
  return hiddenCount > 0 ? `${visible.join(', ')} +${hiddenCount}` : visible.join(', ');
}
