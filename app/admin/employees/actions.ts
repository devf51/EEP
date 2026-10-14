"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Employee } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { failTo } from "@/lib/form";
import { normalizeEmail, validateEmployeeChange, wouldCreateCycle } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

const EmployeeInput = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "ชื่อยาวเกินไป"),
  email: z.string().transform(normalizeEmail).pipe(z.email("อีเมลไม่ถูกต้อง")),
  position: z.string().trim().max(100, "ตำแหน่งยาวเกินไป"),
  departmentId: z.string().transform((v) => v || null),
  managerId: z.string().transform((v) => v || null),
  active: z.boolean(),
  roles: z.array(z.enum(["HR", "ADMIN"], "สิทธิ์ไม่ถูกต้อง")),
});

function parseEmployee(fd: FormData) {
  return EmployeeInput.safeParse({
    name: fd.get("name") ?? "",
    email: fd.get("email") ?? "",
    position: fd.get("position") ?? "",
    departmentId: fd.get("departmentId") ?? "",
    managerId: fd.get("managerId") ?? "",
    active: fd.get("active") === "on",
    roles: [...new Set(fd.getAll("roles"))],
  });
}

function snapshot(e: Employee) {
  return {
    name: e.name, email: e.email, position: e.position, departmentId: e.departmentId,
    managerId: e.managerId, active: e.active, roles: e.roles,
  };
}

async function checkReferences(path: string, departmentId: string | null, managerId: string | null) {
  if (departmentId && !(await prisma.department.findUnique({ where: { id: departmentId } }))) failTo(path, "ไม่พบแผนกที่เลือก");
  if (managerId && !(await prisma.employee.findFirst({ where: { id: managerId, active: true } }))) failTo(path, "ไม่พบหัวหน้าที่เลือก");
}

export async function createEmployee(fd: FormData) {
  const me = await requireEmployee();
  const path = "/admin/employees";
  const parsed = parseEmployee(fd);
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const data = parsed.data;

  const denied = validateEmployeeChange(me, null, [], data.roles);
  if (denied) failTo(path, denied);
  if (await prisma.employee.findUnique({ where: { email: data.email } })) failTo(path, "อีเมลนี้มีในระบบแล้ว");
  await checkReferences(path, data.departmentId, data.managerId);

  await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({ data });
    await tx.auditLog.create({
      data: { actorId: me.id, action: "employee.create", entity: "Employee", entityId: created.id, after: snapshot(created) },
    });
  });
  revalidatePath(path);
  redirect(path);
}

export async function updateEmployee(id: string, fd: FormData) {
  const me = await requireEmployee();
  const path = `/admin/employees/${id}`;
  const target = await prisma.employee.findUnique({ where: { id } });
  if (!target) failTo("/admin/employees", "ไม่พบพนักงาน");
  const parsed = parseEmployee(fd);
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const data = parsed.data;

  const denied = validateEmployeeChange(me, target.id, target.roles, data.roles);
  if (denied) failTo(path, denied);
  if (data.email !== target.email && (await prisma.employee.findUnique({ where: { email: data.email } }))) {
    failTo(path, "อีเมลนี้มีในระบบแล้ว");
  }
  await checkReferences(path, data.departmentId, data.managerId);
  if (data.managerId) {
    const all = await prisma.employee.findMany({ select: { id: true, managerId: true } });
    if (wouldCreateCycle(target.id, data.managerId, new Map(all.map((e) => [e.id, e.managerId])))) {
      failTo(path, "ตั้งหัวหน้าแบบนี้จะทำให้สายบังคับบัญชาวนกลับมาที่ตัวเอง");
    }
  }
  if (target.active && !data.active && (await prisma.employee.count({ where: { managerId: id, active: true } })) > 0) {
    failTo(path, "ย้ายลูกทีมไปอยู่กับหัวหน้าคนอื่นก่อน จึงจะปิดใช้งานได้");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({ where: { id }, data });
    await tx.auditLog.create({
      data: {
        actorId: me.id, action: "employee.update", entity: "Employee", entityId: id,
        before: snapshot(target), after: snapshot(updated),
      },
    });
  });
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}
