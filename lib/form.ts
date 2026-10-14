import { redirect } from "next/navigation";

// Server actions report validation errors by redirecting back with ?error=, so forms stay server components.
export function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
