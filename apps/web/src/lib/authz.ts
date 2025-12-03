import type { User, UserRole } from "./types";

const ROLE_WEIGHT: Record<UserRole, number> = {
  member: 1,
  moderator: 2,
  admin: 3
};

const normalizeAllowed = (allowed: UserRole | UserRole[]): UserRole[] =>
  Array.isArray(allowed) ? allowed : [allowed];

export const isRoleAllowed = (role: UserRole, allowed: UserRole | UserRole[]): boolean => {
  const targets = normalizeAllowed(allowed);
  return targets.some((target) => ROLE_WEIGHT[role] >= ROLE_WEIGHT[target]);
};

export const hasRole = (user: User | null, allowed: UserRole | UserRole[]): boolean => {
  if (!user) return false;
  return isRoleAllowed(user.role, allowed);
};

export const ensureRole = (user: User | null, allowed: UserRole | UserRole[]): void => {
  if (!hasRole(user, allowed)) {
    throw new Error("Forbidden");
  }
};

export const describeRole = (role: UserRole): string => {
  switch (role) {
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    default:
      return "Member";
  }
};
