export type GrantedRole = "HR" | "ADMIN";
export type Actor = { id: string; roles: GrantedRole[] };
// roles: the target's stored roles; omit when unknown (treated as none).
export type Person = { id: string; managerId: string | null; roles?: GrantedRole[] };
export type Action = "employee.view" | "employee.manage" | "department.manage" | "audit.view" | "role.grant";

export function isHrOrAdmin(a: Actor): boolean {
  return a.roles.includes("HR") || a.roles.includes("ADMIN");
}

// Manager is derived: you manage X when X.managerId is you (direct reports only).
export function can(actor: Actor, action: Action, target?: Person): boolean {
  switch (action) {
    case "employee.view":
      return !!target && (target.id === actor.id || target.managerId === actor.id || isHrOrAdmin(actor));
    case "employee.manage":
      // With a target, defer to validateEmployeeChange so both always agree.
      return target
        ? validateEmployeeChange(actor, target.id, target.roles ?? [], target.roles ?? []) === null
        : isHrOrAdmin(actor);
    case "department.manage":
      return isHrOrAdmin(actor);
    case "audit.view":
    case "role.grant":
      return actor.roles.includes("ADMIN");
    default:
      return false;
  }
}

// beforeRoles MUST be the roles stored in the database, never a client-supplied value.
// Returns a Thai error message, or null when the change is allowed. targetId null = creating.
export function validateEmployeeChange(
  actor: Actor,
  targetId: string | null,
  beforeRoles: GrantedRole[],
  afterRoles: GrantedRole[],
): string | null {
  if (!isHrOrAdmin(actor)) return "ไม่มีสิทธิ์จัดการพนักงาน";
  if (targetId === actor.id) return "แก้ข้อมูลของตัวเองที่หน้านี้ไม่ได้ ให้ HR หรือแอดมินคนอื่นแก้ให้";
  if (actor.roles.includes("ADMIN")) return null;
  if (beforeRoles.includes("ADMIN")) return "เฉพาะแอดมินเท่านั้นที่แก้ข้อมูลของแอดมินได้";
  const before = new Set(beforeRoles);
  const after = new Set(afterRoles);
  if (before.size !== after.size || [...after].some((r) => !before.has(r))) {
    return "เฉพาะแอดมินเท่านั้นที่ให้หรือถอนสิทธิ์ HR และแอดมินได้";
  }
  return null;
}

export function validateEmailChange(actor: Actor, beforeEmail: string, afterEmail: string): string | null {
  if (beforeEmail === afterEmail || actor.roles.includes("ADMIN")) return null;
  return "เฉพาะแอดมินเท่านั้นที่เปลี่ยนอีเมลของพนักงานได้";
}

export function wouldCreateCycle(
  employeeId: string,
  newManagerId: string | null,
  managerOf: Map<string, string | null>,
): boolean {
  const seen = new Set<string>();
  let cur: string | null = newManagerId;
  while (cur !== null) {
    if (cur === employeeId) return true;
    if (seen.has(cur)) return false; // pre-existing loop elsewhere; not caused by this change
    seen.add(cur);
    cur = managerOf.get(cur) ?? null;
  }
  return false;
}

export function allowSignIn(
  employee: { active: boolean } | null,
  provider: string | undefined,
  emailVerified: unknown,
): boolean {
  if (!employee?.active) return false;
  return provider === "dev" || (provider === "google" && emailVerified === true);
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}
