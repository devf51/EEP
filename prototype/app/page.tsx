import Link from "next/link";
import { db, ROLE_LABEL } from "@/lib/data";
import { canViewPortfolio, canViewProject } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function Home() {
  const me = await currentUser();
  const people = db.employees.filter((e) => canViewPortfolio(me, e));
  const projects = db.projects.filter((p) => canViewProject(me, p));
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-bold">สวัสดี {me.name}</h1>
        <p className="text-sm text-gray-600">{me.title} · {ROLE_LABEL[me.role]}</p>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">พอร์ตที่คุณเห็นได้</h2>
        <ul className="space-y-1">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="text-blue-700 underline">{p.name}</Link>{" "}
              <span className="text-sm text-gray-500">{p.title}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">โปรเจกต์</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีโปรเจกต์</p>
        ) : (
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="text-blue-700 underline">{p.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
