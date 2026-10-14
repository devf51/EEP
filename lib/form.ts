import { redirect } from "next/navigation";

// Server actions report validation errors by redirecting back with ?error=, so forms stay server components.
export function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// For a catch around a Serializable transaction: P2002 (unique violation) and P2034 (serialization
// failure) become Thai errors. Anything else, including the redirect thrown by failTo, is rethrown.
export function failOnConflict(e: unknown, path: string, duplicateMessage: string): never {
  const code = (e as { code?: string } | null)?.code;
  if (code === "P2002") failTo(path, duplicateMessage);
  if (code === "P2034") failTo(path, "มีการแก้ไขพร้อมกัน ลองอีกครั้ง");
  throw e;
}
