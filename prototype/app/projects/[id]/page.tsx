import Link from "next/link";
import { endorse } from "@/app/actions";
import { ContributionCard } from "@/components/ContributionCard";
import { NoAccess } from "@/components/NoAccess";
import { db, findEmployee } from "@/lib/data";
import { canEndorse, canViewProject } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const project = db.projects.find((p) => p.id === id);
  if (!project || !canViewProject(me, project)) return <NoAccess />;
  const items = db.contributions.filter((c) => c.projectId === project.id && c.confirmed);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{project.name}</h1>
      <section>
        <h2 className="mb-2 font-semibold">สมาชิกและบทบาท</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {project.members.map((m) => (
            <li key={m.employeeId} className="rounded border bg-white px-3 py-1">
              {findEmployee(m.employeeId)?.name} · {m.role}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">ผลงานในโปรเจกต์</h2>
        <p className="text-sm text-gray-600">เห็นงานส่วนไหนที่เพื่อนทำจริง กด &quot;ยืนยัน&quot; ให้ได้</p>
        {items.map((c) => (
          <ContributionCard key={c.id} c={c}>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-gray-500">โดย {findEmployee(c.ownerId)?.name}</span>
              {canEndorse(me, c, project) && (
                <form action={endorse.bind(null, c.id)}>
                  <button className="rounded border border-green-700 px-3 py-1 text-green-700">ยืนยันว่าคนนี้ทำจริง</button>
                </form>
              )}
            </div>
          </ContributionCard>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผลงาน</p>}
      </section>
      <Link href="/" className="text-sm text-blue-700 underline">← กลับหน้าแรก</Link>
    </div>
  );
}
