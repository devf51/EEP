export type GrantedRole = "HR" | "ADMIN";
export type Actor = { id: string; roles: GrantedRole[] };
export type Person = { id: string; managerId: string | null };
export type Action = "employee.view" | "employee.manage" | "department.manage" | "audit.view";

export function isHrOrAdmin(a: Actor): boolean {
  return a.roles.includes("HR") || a.roles.includes("ADMIN");
}

// Manager is derived: you manage X when X.managerId is you (direct reports only).
export function can(actor: Actor, action: Action, target?: Person): boolean {
  switch (action) {
    case "employee.view":
      return !!target && (target.id === actor.id || target.managerId === actor.id || isHrOrAdmin(actor));
    case "employee.manage":
      return isHrOrAdmin(actor) && target?.id !== actor.id;
    case "department.manage":
      return isHrOrAdmin(actor);
    case "audit.view":
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
  if (afterRoles.includes("ADMIN")) return "เฉพาะแอดมินเท่านั้นที่ให้สิทธิ์แอดมินได้";
  return null;
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
