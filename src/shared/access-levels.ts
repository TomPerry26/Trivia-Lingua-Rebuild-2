// Access level hierarchy for role-based permissions
// Higher number = more access
export const ACCESS_LEVELS = {
  guest: 0,
  member: 1,
  premium: 2,
  beta: 3,
} as const;

export type AccessLevel = keyof typeof ACCESS_LEVELS;

// Check if a user has sufficient access for a resource
export function hasAccess(
  userLevel: AccessLevel | undefined | null,
  requiredLevel: AccessLevel | undefined | null
): boolean {
  // Default user level to 'guest' if not provided
  const effectiveUserLevel = userLevel || 'guest';
  // Default required level to 'member' if not provided
  const effectiveRequiredLevel = requiredLevel || 'member';
  
  return ACCESS_LEVELS[effectiveUserLevel] >= ACCESS_LEVELS[effectiveRequiredLevel];
}

// Get display name for access level
export function getAccessLevelLabel(level: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    guest: 'Public',
    member: 'Free Account',
    premium: 'Premium',
    beta: 'Beta Tester',
  };
  return labels[level];
}
