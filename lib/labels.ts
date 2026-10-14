import type { GrantedRole } from "@/lib/rules";

export const GRANTED_ROLE_LABEL: Record<GrantedRole, string> = { HR: "HR", ADMIN: "แอดมิน" };

export function roleLabels(roles: readonly GrantedRole[], hasReports: boolean): string[] {
  return ["พนักงาน", ...(hasReports ? ["หัวหน้า"] : []), ...roles.map((r) => GRANTED_ROLE_LABEL[r])];
}
