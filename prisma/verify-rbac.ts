/**
 * Stage 4 validation: RBAC matrix and feature-flag defaults from seed.
 */
import { hasPermission, listPermissions } from "../src/shared/lib/rbac";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(hasPermission("ADMIN", "settings:view"), "ADMIN should access settings");
  assert(hasPermission("MANAGER", "settings:view"), "MANAGER should access settings");
  assert(!hasPermission("EMPLOYEE", "settings:view"), "EMPLOYEE must not access settings");
  assert(!hasPermission("EMPLOYEE", "finance:view"), "EMPLOYEE must not access finance");
  assert(hasPermission("EMPLOYEE", "customers:view"), "EMPLOYEE can view customers");
  assert(hasPermission("MANAGER", "settings:manage"), "MANAGER can manage settings");
  assert(hasPermission("MANAGER", "finance:manage"), "MANAGER can manage finance");

  const employeePermissions = listPermissions("EMPLOYEE");
  assert(
    !employeePermissions.includes("settings:manage"),
    "EMPLOYEE must not manage settings",
  );

  console.log("RBAC matrix OK");
  console.log("Employee permissions:", employeePermissions.join(", "));
}

main();
