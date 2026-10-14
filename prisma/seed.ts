import "dotenv/config";
import { prisma } from "../lib/db";
import { normalizeEmail } from "../lib/rules";

// Bootstrap only: does nothing once an active admin exists, so a re-run can never re-promote anyone.
async function ensureAdmin() {
  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL ?? "");
  if (!email) throw new Error("Set SEED_ADMIN_EMAIL in .env");
  if (await prisma.employee.findFirst({ where: { active: true, roles: { has: "ADMIN" } } })) {
    console.log("admin exists, skipping");
    return;
  }
  await prisma.$transaction(async (tx) => {
    const existing = await tx.employee.findUnique({ where: { email } });
    const admin = existing
      ? await tx.employee.update({
          where: { email },
          data: { active: true, roles: [...new Set([...existing.roles, "ADMIN" as const])] },
        })
      : await tx.employee.create({
          data: { email, name: process.env.SEED_ADMIN_NAME?.trim() || "Admin", roles: ["ADMIN"] },
        });
    const snap = (e: typeof admin) => ({
      name: e.name, email: e.email, position: e.position, departmentId: e.departmentId,
      managerId: e.managerId, active: e.active, roles: e.roles,
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id, action: "employee.bootstrap-admin", entity: "Employee", entityId: admin.id,
        before: existing ? snap(existing) : undefined, after: snap(admin),
      },
    });
  });
  console.log(`admin: ${email}`);
}

async function seedDemo() {
  const dept = await prisma.department.upsert({ where: { name: "วิศวกรรม" }, update: {}, create: { name: "วิศวกรรม" } });
  const upsert = (email: string, data: { name: string; position: string; roles?: ("HR" | "ADMIN")[]; managerId?: string }) =>
    prisma.employee.upsert({ where: { email }, update: {}, create: { email, departmentId: dept.id, ...data } });
  await upsert("nok@example.com", { name: "นก", position: "HR Partner", roles: ["HR"] });
  const somchai = await upsert("somchai@example.com", { name: "สมชาย", position: "Engineering Manager" });
  await upsert("mali@example.com", { name: "มะลิ", position: "Backend Developer", managerId: somchai.id });
  await upsert("ton@example.com", { name: "ต้น", position: "Frontend Developer", managerId: somchai.id });
  console.log("demo org seeded");
}

ensureAdmin()
  .then(() => (process.env.SEED_DEMO === "1" ? seedDemo() : undefined))
  .finally(() => prisma.$disconnect());
