export const USER_ROLES = ["user", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is "admin" {
  return role === "admin";
}
