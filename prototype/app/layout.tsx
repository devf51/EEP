import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { db, ROLE_LABEL } from "@/lib/data";
import { currentUser } from "@/lib/session";
import { switchUser } from "./actions";

export const metadata: Metadata = { title: "EEP · ต้นแบบ" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await currentUser();
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-6 py-3">
          <Link href="/" className="font-bold">EEP · ต้นแบบ</Link>
          <form action={switchUser} className="flex items-center gap-2 text-sm">
            <label htmlFor="demo-user">เข้าใช้เป็น</label>
            <select id="demo-user" name="id" defaultValue={me.id} className="rounded border px-2 py-1">
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({ROLE_LABEL[e.role]})</option>
              ))}
            </select>
            <button className="rounded bg-gray-900 px-3 py-1 text-white">สลับ</button>
          </form>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
