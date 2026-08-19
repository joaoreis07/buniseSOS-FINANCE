import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard:view",
  "customers:view",
  "customers:manage",
  "finance:view",
  "finance:manage",
  "sales:view",
  "sales:manage",
  "reports:view",
  "agenda:view",
  "settings:view",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission | "*">> = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard:view",
    "customers:view",
    "customers:manage",
    "finance:view",
    "finance:manage",
    "sales:view",
    "sales:manage",
    "reports:view",
    "agenda:view",
    "settings:view",
    "settings:manage",
  ],
  EMPLOYEE: ["dashboard:view", "customers:view", "agenda:view"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return granted.includes("*") || granted.includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error("Você não tem permissão para esta ação");
  }
}

export function listPermissions(role: Role): Permission[] {
  if (ROLE_PERMISSIONS[role].includes("*")) {
    return [...PERMISSIONS];
  }
  return ROLE_PERMISSIONS[role].filter(
    (permission): permission is Permission => permission !== "*",
  );
}
