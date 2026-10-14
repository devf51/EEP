import { addContribution } from "@/app/actions";
import { NoAccess } from "@/components/NoAccess";
import { CATEGORY_LABEL, db, findEmployee } from "@/lib/data";
import { canAddContribution, isMember } from "@/lib/rules";
import { currentUser } from "@/lib/session";

const input = "w-full rounded border px-3 py-2";

export default async function NewContribution({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const owner = findEmployee(id);
  if (!owner || !canAddContribution(me, owner)) return <NoAccess />;
  const projects = db.projects.filter((p) => isMember(p, owner.id));

  return (
    <form action={addContribution.bind(null, owner.id)} className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold">บันทึกผลงานของ {owner.name}</h1>
      {me.id !== owner.id && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">คุณกำลังเติมผลงานให้ลูกทีม ผลงานจะขึ้นพอร์ตหลังเจ้าตัวกดยืนยัน</p>
      )}
      <label className="block">
        <span className="text-sm">โปรเจกต์</span>
        <select name="projectId" required className={input}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm">ประเภทงาน</span>
        <select name="category" className={input}>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm">ทำอะไร (สั้นๆ ประโยคเดียวพอ)</span>
        <input name="summary" required maxLength={140} className={input} />
      </label>
      <label className="block">
        <span className="text-sm">ช่วยอะไร / ผลกระทบ (ไม่บังคับ)</span>
        <input name="impact" maxLength={140} className={input} />
      </label>
      <label className="block">
        <span className="text-sm">ลิงก์หลักฐาน (PR, เอกสาร, ตั๋วงาน)</span>
        <input name="evidenceUrl" type="url" placeholder="https://" className={input} />
      </label>
      <label className="block">
        <span className="text-sm">ทักษะ (คั่นด้วยจุลภาค)</span>
        <input name="skills" placeholder="Python, การเป็นพี่เลี้ยง" className={input} />
      </label>
      <button className="rounded bg-blue-700 px-4 py-2 text-white">บันทึก</button>
    </form>
  );
}
