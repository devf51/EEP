import { CATEGORY_LABEL, db, findEmployee, type Contribution } from "@/lib/data";
import { isSafeEvidenceUrl } from "@/lib/rules";

export function ContributionCard({ c, children }: { c: Contribution; children?: React.ReactNode }) {
  const project = db.projects.find((p) => p.id === c.projectId);
  const addedBy = c.addedById !== c.ownerId ? findEmployee(c.addedById) : undefined;
  const endorsers = c.endorsedBy.map((id) => findEmployee(id)?.name).filter(Boolean);
  return (
    <article className="rounded border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-800">{CATEGORY_LABEL[c.category]}</span>
        <span>{project?.name}</span>
        <span>{c.createdAt}</span>
        {addedBy && <span>เติมโดย {addedBy.name}</span>}
      </div>
      <p className="mt-2 font-medium">{c.summary}</p>
      {c.impact && <p className="text-sm text-gray-700">ผลกระทบ: {c.impact}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {c.skills.map((s) => (
          <span key={s} className="rounded-full border px-2 py-0.5">{s}</span>
        ))}
        {c.evidenceUrl && isSafeEvidenceUrl(c.evidenceUrl) && (
          <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">หลักฐาน</a>
        )}
        {endorsers.length > 0 && <span className="text-green-700">✓ ยืนยันโดย {endorsers.join(", ")}</span>}
      </div>
      {children}
    </article>
  );
}
