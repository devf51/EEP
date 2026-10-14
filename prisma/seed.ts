import "dotenv/config";
import { prisma } from "../lib/db";

async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set SEED_ADMIN_EMAIL in .env");
  const existing = await prisma.employee.findUnique({ where: { email } });
  if (!existing) {
    await prisma.employee.create({
      data: { email, name: process.env.SEED_ADMIN_NAME?.trim() || "Admin", roles: ["ADMIN"] },
    });
  } else if (!existing.active || !existing.roles.includes("ADMIN")) {
    await prisma.employee.update({
      where: { email },
      data: { active: true, roles: [...new Set([...existing.roles, "ADMIN" as const])] },
    });
  }
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
