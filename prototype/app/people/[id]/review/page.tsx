import { submitReview } from "@/app/actions";
import { ContributionCard } from "@/components/ContributionCard";
import { NoAccess } from "@/components/NoAccess";
import { db, findEmployee } from "@/lib/data";
import { reviewTypeFor, visibleContributions, weightedScore } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const owner = findEmployee(id);
  const type = owner && reviewTypeFor(me, owner);
  if (!owner || !type) return <NoAccess />;

  const evidence = visibleContributions(me, owner.id, db.contributions).filter((c) => c.confirmed);
  const existing = db.reviews.find((r) => r.revieweeId === owner.id && r.reviewerId === me.id && r.type === type);
  const self = type === "manager" ? db.reviews.find((r) => r.revieweeId === owner.id && r.type === "self") : undefined;

  return (
    <form action={submitReview.bind(null, owner.id)} className="space-y-4">
      <h1 className="text-xl font-bold">{type === "self" ? "ประเมินตัวเอง" : `ประเมิน ${owner.name}`}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">พอร์ตผลงาน (ติ๊กเพื่อใช้เป็นหลักฐาน)</h2>
          {evidence.map((c) => (
            <ContributionCard key={c.id} c={c}>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" name="evidence" value={c.id} defaultChecked={existing?.evidenceIds.includes(c.id)} />
                ใช้เป็นหลักฐาน
              </label>
            </ContributionCard>
          ))}
          {evidence.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผลงานในพอร์ต</p>}
        </section>

        <section className="space-y-4 md:sticky md:top-4 md:self-start">
          {self && (
            <div className="rounded bg-blue-50 p-3 text-sm text-blue-900">
              ประเมินตัวเอง: คะแนนรวม {weightedScore(self.scores, db.criteria)} / 5. &ldquo;{self.comment}&rdquo;
            </div>
          )}
          {db.criteria.map((k) => (
            <label key={k.id} className="block rounded border bg-white p-3">
              <span className="text-sm font-medium">{k.label} <span className="text-gray-500">(น้ำหนัก {k.weight}%)</span></span>
              <select name={k.id} required defaultValue={existing?.scores[k.id] ?? ""} className="mt-1 w-full rounded border px-2 py-1">
                <option value="" disabled>เลือกคะแนน</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {self && <span className="mt-1 block text-xs text-gray-500">เจ้าตัวให้ {self.scores[k.id]}</span>}
            </label>
          ))}
          <label className="block">
            <span className="text-sm">ความเห็นสั้นๆ</span>
            <textarea name="comment" rows={3} defaultValue={existing?.comment} className="w-full rounded border px-3 py-2" />
          </label>
          <button className="rounded bg-blue-700 px-4 py-2 text-white">บันทึกการประเมิน</button>
        </section>
      </div>
    </form>
  );
}
