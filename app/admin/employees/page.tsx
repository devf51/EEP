import Link from "next/link";
import { createEmployee } from "./actions";
import { EmployeeFields } from "@/components/EmployeeFields";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireEmployee();
  if (!can(me, "employee.manage")) return <NoAccess />;
  const { error } = await searchParams;
  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { department: true, manager: true, _count: { select: { reports: { where: { active: true } } } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const managers = employees.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">พนักงาน</h1>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">ชื่อ</th><th className="p-2">อีเมล</th><th className="p-2">ตำแหน่ง</th><th className="p-2">แผนก</th><th className="p-2">หัวหน้า</th><th className="p-2">บทบาท</th><th className="p-2">สถานะ</th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2"><Link href={`/admin/employees/${e.id}`} className="text-blue-700 underline">{e.name}</Link></td>
                <td className="p-2">{e.email}</td>
                <td className="p-2">{e.position || "-"}</td>
                <td className="p-2">{e.department?.name ?? "-"}</td>
                <td className="p-2">{e.manager?.name ?? "-"}</td>
                <td className="p-2">{roleLabels(e.roles, e._count.reports > 0).join(", ")}</td>
                <td className="p-2">{e.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={createEmployee} className="space-y-4 rounded border bg-white p-4">
        <h2 className="font-semibold">ลงทะเบียนพนักงานใหม่</h2>
        <ErrorBanner message={error} />
        <EmployeeFields departments={departments} managers={managers} canGrantAdmin={me.roles.includes("ADMIN")} />
        <button className="rounded bg-blue-700 px-4 py-2 text-white">ลงทะเบียน</button>
      </form>
    </div>
  );
}
