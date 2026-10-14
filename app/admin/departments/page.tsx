import { createDepartment } from "./actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireEmployee();
  if (!can(me, "department.manage")) return <NoAccess />;
  const { error } = await searchParams;
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { active: true } } } } },
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">แผนก</h1>
      <ul className="divide-y rounded border bg-white text-sm">
        {departments.map((d) => (
          <li key={d.id} className="flex justify-between p-2">
            <span>{d.name}</span>
            <span className="text-gray-500">{d._count.employees} คน</span>
          </li>
        ))}
        {departments.length === 0 && <li className="p-2 text-gray-500">ยังไม่มีแผนก</li>}
      </ul>
      <form action={createDepartment} className="space-y-3 rounded border bg-white p-4">
        <ErrorBanner message={error} />
        <label className="block text-sm">ชื่อแผนกใหม่
          <input name="name" required maxLength={100} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="rounded bg-blue-700 px-4 py-2 text-white">เพิ่มแผนก</button>
      </form>
    </div>
  );
}
