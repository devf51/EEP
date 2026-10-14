import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEmployee } from "../actions";
import { EmployeeFields } from "@/components/EmployeeFields";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can, validateEmployeeChange } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function EditEmployeePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireEmployee();
  if (!can(me, "employee.manage")) return <NoAccess />;
  const { id } = await params;
  const { error } = await searchParams;
  const target = await prisma.employee.findUnique({ where: { id } });
  if (!target) notFound();

  const blocked = validateEmployeeChange(me, target.id, target.roles, target.roles);
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { active: true, NOT: { id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">แก้ไขข้อมูล {target.name}</h1>
      {blocked ? (
        <ErrorBanner message={blocked} />
      ) : (
        <form action={updateEmployee.bind(null, target.id)} className="space-y-4 rounded border bg-white p-4">
          <ErrorBanner message={error} />
          <EmployeeFields departments={departments} managers={managers} canGrantAdmin={me.roles.includes("ADMIN")} value={target} />
          <button className="rounded bg-blue-700 px-4 py-2 text-white">บันทึก</button>
        </form>
      )}
      <Link href="/admin/employees" className="text-sm text-blue-700 underline">← กลับ</Link>
    </div>
  );
}
