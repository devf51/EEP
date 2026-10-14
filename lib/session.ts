import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/rules";

// Looked up on every request so a deactivated employee loses access immediately.
export async function currentEmployee() {
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const employee = await prisma.employee.findUnique({ where: { email: normalizeEmail(email) } });
  return employee?.active ? employee : null;
}

export async function requireEmployee() {
  const employee = await currentEmployee();
  if (!employee) redirect("/signin");
  return employee;
}
