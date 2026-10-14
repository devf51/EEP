import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { requireEmployee } from "@/lib/session";

export default async function Home() {
  const me = await requireEmployee();
  const [manager, department, reports] = await Promise.all([
    me.managerId ? prisma.employee.findUnique({ where: { id: me.managerId } }) : null,
    me.departmentId ? prisma.department.findUnique({ where: { id: me.departmentId } }) : null,
    prisma.employee.findMany({ where: { managerId: me.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">สวัสดี {me.name}</h1>
        <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">อีเมล</dt><dd>{me.email}</dd>
          <dt className="text-gray-500">ตำแหน่ง</dt><dd>{me.position || "-"}</dd>
          <dt className="text-gray-500">แผนก</dt><dd>{department?.name ?? "-"}</dd>
          <dt className="text-gray-500">หัวหน้า</dt><dd>{manager?.name ?? "-"}</dd>
          <dt className="text-gray-500">บทบาท</dt><dd>{roleLabels(me.roles, reports.length > 0).join(", ")}</dd>
        </dl>
      </section>
      {reports.length > 0 && (
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">ลูกทีมโดยตรง</h2>
          <ul className="space-y-1 text-sm">
            {reports.map((r) => (
              <li key={r.id}>{r.name} <span className="text-gray-500">{r.position}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
