import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function AuditPage() {
  const me = await requireEmployee();
  if (!can(me, "audit.view")) return <NoAccess />;
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit log (100 รายการล่าสุด)</h1>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">เวลา</th><th className="p-2">ผู้ทำ</th><th className="p-2">การกระทำ</th><th className="p-2">รายการ</th><th className="p-2">ก่อน</th><th className="p-2">หลัง</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{e.createdAt.toLocaleString("th-TH")}</td>
                <td className="p-2">{e.actor.name}</td>
                <td className="p-2">{e.action}</td>
                <td className="p-2">{e.entity} {e.entityId}</td>
                <td className="p-2"><pre className="max-w-xs overflow-auto text-xs">{e.before ? JSON.stringify(e.before, null, 1) : "-"}</pre></td>
                <td className="p-2"><pre className="max-w-xs overflow-auto text-xs">{e.after ? JSON.stringify(e.after, null, 1) : "-"}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
