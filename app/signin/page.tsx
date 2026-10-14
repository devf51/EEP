import { redirect } from "next/navigation";
import { ErrorBanner } from "@/components/ErrorBanner";
import { devLoginEnabled, signIn } from "@/auth";
import { currentEmployee } from "@/lib/session";

const ERRORS: Record<string, string> = {
  AccessDenied: "อีเมลนี้ยังไม่ได้ลงทะเบียนหรือถูกปิดใช้งาน ติดต่อ HR",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentEmployee()) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4 rounded border bg-white p-6">
      <h1 className="text-xl font-bold">เข้าสู่ระบบ EEP</h1>
      <ErrorBanner message={error ? (ERRORS[error] ?? "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง") : undefined} />
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button className="w-full rounded bg-gray-900 px-4 py-2 text-white">เข้าสู่ระบบด้วย Google</button>
      </form>
      {devLoginEnabled && (
        <form
          action={async (fd: FormData) => {
            "use server";
            await signIn("dev", { email: String(fd.get("email") ?? ""), redirectTo: "/" });
          }}
          className="space-y-2 border-t pt-4"
        >
          <label className="block text-sm">
            Dev login (เฉพาะเครื่องพัฒนา)
            <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <button className="w-full rounded border px-4 py-2">เข้าสู่ระบบด้วยอีเมล</button>
        </form>
      )}
    </div>
  );
}
