import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { signOut } from "@/auth";
import { can } from "@/lib/rules";
import { currentEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "EEP" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const me = await currentEmployee();
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {me && (
          <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-6 py-3">
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/" className="font-bold">EEP</Link>
              {can(me, "employee.manage") && <Link href="/admin/employees">พนักงาน</Link>}
              {can(me, "department.manage") && <Link href="/admin/departments">แผนก</Link>}
              {can(me, "audit.view") && <Link href="/admin/audit">Audit log</Link>}
            </nav>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
              className="flex items-center gap-3 text-sm"
            >
              <span>{me.name}</span>
              <button className="rounded border px-3 py-1">ออกจากระบบ</button>
            </form>
          </header>
        )}
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
