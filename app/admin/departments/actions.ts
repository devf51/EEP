"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { failOnConflict, failTo } from "@/lib/form";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

const DepartmentName = z.string().trim().min(1, "กรุณากรอกชื่อแผนก").max(100, "ชื่อแผนกยาวเกินไป");

export async function createDepartment(fd: FormData) {
  const me = await requireEmployee();
  const path = "/admin/departments";
  if (!can(me, "department.manage")) failTo(path, "ไม่มีสิทธิ์จัดการแผนก");
  const parsed = DepartmentName.safeParse(fd.get("name") ?? "");
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const name = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (await tx.department.findUnique({ where: { name } })) failTo(path, "มีแผนกนี้แล้ว");
        const d = await tx.department.create({ data: { name } });
        await tx.auditLog.create({ data: { actorId: me.id, action: "department.create", entity: "Department", entityId: d.id, after: { name } } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    failOnConflict(e, path, "มีแผนกนี้แล้ว");
  }
  revalidatePath(path);
  redirect(path);
}
