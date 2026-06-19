export const recentAdminUsersKey = 'monte-sinai-admin-recent-users';

export type RecentAdminAccount = {
  email: string;
  name: string;
  avatarUrl?: string;
};

export function readRecentAdminUsers(): RecentAdminAccount[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(recentAdminUsersKey) || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeRecentAccount)
      .filter((account): account is RecentAdminAccount => Boolean(account))
      .slice(0, 4);
  } catch {
    return [];
  }
}

export function rememberAdminUser(
  account: string | Partial<RecentAdminAccount>,
  currentUsers = readRecentAdminUsers()
) {
  if (typeof window === 'undefined') return [];

  const normalized = normalizeRecentAccount(account);
  if (!normalized) return currentUsers;

  const previous = currentUsers.find((item) => item.email === normalized.email);
  const nextAccount = {
    ...previous,
    ...normalized,
    name: normalized.name || previous?.name || normalized.email.split('@')[0]
  };
  const nextUsers = [nextAccount, ...currentUsers.filter((item) => item.email !== normalized.email)].slice(0, 4);
  window.localStorage.setItem(recentAdminUsersKey, JSON.stringify(nextUsers));
  return nextUsers;
}

function normalizeRecentAccount(value: unknown): RecentAdminAccount | null {
  if (typeof value === 'string') {
    const email = value.trim().toLowerCase();
    return email ? { email, name: email.split('@')[0] } : null;
  }

  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  if (!email) return null;

  return {
    email,
    name: typeof record.name === 'string' && record.name.trim() ? record.name.trim() : email.split('@')[0],
    avatarUrl: typeof record.avatarUrl === 'string' && record.avatarUrl.trim() ? record.avatarUrl.trim() : undefined
  };
}
