import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Looked up by id (not email) on every request, once per request: a deactivated employee loses access immediately.
export const currentEmployee = cache(async () => {
  const id = (await auth())?.employeeId;
  if (!id) return null;
  const employee = await prisma.employee.findUnique({ where: { id } });
  return employee?.active ? employee : null;
});

export async function requireEmployee() {
  const employee = await currentEmployee();
  if (!employee) redirect("/signin");
  return employee;
}
