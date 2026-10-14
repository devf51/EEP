import Link from "next/link";
import { confirmContribution, rejectContribution } from "@/app/actions";
import { ContributionCard } from "@/components/ContributionCard";
import { NoAccess } from "@/components/NoAccess";
import { db, findEmployee } from "@/lib/data";
import { canAddContribution, canViewPortfolio, isMember, reviewTypeFor, visibleContributions } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function Portfolio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const { id } = await params;
  const { added } = await searchParams;
  const me = await currentUser();
  const owner = findEmployee(id);
  if (!owner || !canViewPortfolio(me, owner)) return <NoAccess />;

  const items = visibleContributions(me, owner.id, db.contributions);
  const confirmed = items.filter((c) => c.confirmed);
  const pending = items.filter((c) => !c.confirmed);
  const projects = db.projects.filter((p) => isMember(p, owner.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">พอร์ตของ {owner.name}</h1>
          <p className="text-sm text-gray-600">{owner.title}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {canAddContribution(me, owner) && projects.length > 0 && (
            <Link href={`/people/${owner.id}/new`} className="rounded bg-blue-700 px-3 py-1.5 text-white">+ บันทึกผลงาน</Link>
          )}
          {reviewTypeFor(me, owner) && (
            <Link href={`/people/${owner.id}/review`} className="rounded border px-3 py-1.5">ประเมิน</Link>
          )}
        </div>
      </header>

      {added === "pending" && (
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-900">บันทึกแล้ว รอเจ้าตัวยืนยันก่อนขึ้นพอร์ต</div>
      )}

      <section>
        <h2 className="mb-2 font-semibold">โปรเจกต์และบทบาท</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {projects.map((p) => (
            <li key={p.id} className="rounded border bg-white px-3 py-1">
              {p.name} · {p.members.find((m) => m.employeeId === owner.id)?.role}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-amber-700">รอคุณยืนยัน (หัวหน้าเติมให้)</h2>
          {pending.map((c) => (
            <ContributionCard key={c.id} c={c}>
              <div className="mt-3 flex gap-2">
                <form action={confirmContribution.bind(null, c.id)}>
                  <button className="rounded bg-amber-600 px-3 py-1 text-sm text-white">ยืนยันว่าเป็นผลงานของฉัน</button>
                </form>
                <form action={rejectContribution.bind(null, c.id)}>
                  <button className="rounded border px-3 py-1 text-sm">ไม่ใช่ผลงานของฉัน</button>
                </form>
              </div>
            </ContributionCard>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">ผลงาน</h2>
        {confirmed.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผลงาน</p>}
        {confirmed.map((c) => (
          <ContributionCard key={c.id} c={c} />
        ))}
      </section>
    </div>
  );
}
