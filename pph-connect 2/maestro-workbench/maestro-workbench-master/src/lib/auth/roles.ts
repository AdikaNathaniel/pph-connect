export const ROLE_HIERARCHY = ['super_admin', 'admin', 'manager', 'team_lead', 'worker'] as const;

export type UserRole = (typeof ROLE_HIERARCHY)[number];

const ROLE_PRIORITY = ROLE_HIERARCHY.reduce<Record<UserRole, number>>((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {} as Record<UserRole, number>);

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  root: 'super_admin',
};

export function normalizeRole(input?: string | null): UserRole {
  if (!input) {
    return 'worker';
  }
  const normalizedInput = input.toLowerCase();
  if (normalizedInput in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[normalizedInput];
  }
  if ((ROLE_HIERARCHY as readonly string[]).includes(normalizedInput)) {
    return normalizedInput as UserRole;
  }
  return 'worker';
}

export function hasRole(actualRole: string | null | undefined, requiredRole: UserRole): boolean {
  const normalizedActual = normalizeRole(actualRole);
  return ROLE_PRIORITY[normalizedActual] <= ROLE_PRIORITY[requiredRole];
}

export const DEFAULT_USER_ROLE: UserRole = 'worker';
