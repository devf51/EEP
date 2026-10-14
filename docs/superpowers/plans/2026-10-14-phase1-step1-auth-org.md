# Phase 1 · Step 1: Sign-in, Roles, Org Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the real app's foundation:
- Google sign-in limited to employees registered by HR or admin.
- Layered roles.
- Departments, positions and reporting lines managed by HR or admin, with every change audited.

**Architecture:**
- One Next.js 16 App Router app at the repo root, with PostgreSQL through Prisma 7 (driver adapter `@prisma/adapter-pg`). Local development uses `prisma dev`.
- Auth.js v5 with JWT sessions. On every request the session email is looked up in `Employee`, so deactivation takes effect immediately. No Auth.js DB tables are used.
- All permission and org rules are pure functions in `lib/rules.ts`, unit-tested with `node:test`, and called by every page and server action.

**Tech Stack:** Node 24, Next.js 16.4, React 19, TypeScript, Tailwind, Prisma 7.10 + `@prisma/adapter-pg`, next-auth 5.0.0-beta.32 (Google + dev-only Credentials), zod 4, tsx, dotenv.

**Spec:** `docs/spec.md`. Read "ผู้ใช้และสิทธิ์" and especially "การกำหนดบทบาท". Roadmap: `docs/superpowers/plans/2026-10-14-phase1-overview.md`.

## Global Constraints

- Pin exact versions:
  - `next-auth@5.0.0-beta.32`, `zod@4.6.7`
  - `prisma@7.10.0` and `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`. Do **not** take npm's `prisma` "latest", which points at an 8.0 RC.
- UI copy is Thai. Code and identifiers are English.
- Authorization runs on the server in every page and action through `lib/rules.ts`. Hiding UI is never enough.
- Roles are layered:
  - **Employee:** implicit for everyone.
  - **Manager:** derived from `managerId`, direct reports only.
  - **HR, ADMIN:** granted and stored in `Employee.roles`.
- HR or admin registers and edits employees. **Only an admin grants or revokes HR/ADMIN, edits an admin, or changes an employee's email.** Nobody edits their own record through admin screens.
- Login: any Google account, but only if its email belongs to an **active** `Employee`. Emails are stored trimmed and lowercased.
- Every employee or department change writes an `AuditLog` row with actor, action, and before/after values.
- Deactivate instead of delete. An employee who still has active direct reports cannot be deactivated.
- A dev-only email login exists for local testing. It is enabled only when `NODE_ENV !== "production"` **and** `AUTH_DEV_LOGIN=1`.
- Work on branch `feat/phase1-step1`. Commit messages end with a blank line and then `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **An unregistered Google email signs in** → refused, and `/signin` shows "อีเมลนี้ยังไม่ได้ลงทะเบียนหรือถูกปิดใช้งาน ติดต่อ HR".
   - Test: `allowSignIn` (Task 2). Manual check: Task 3.
2. **An employee deactivated while still signed in** → loses access on the next request.
   - `requireEmployee` checks `active`. Manual check: Task 3.
3. **A reporting line made circular** (A's manager is B, then B's manager set to A) → refused with a Thai message.
   - Test: `wouldCreateCycle` (Task 2). Manual check: Task 4.
4. **HR escalating** (grant ADMIN, edit an admin's record, or anyone editing their own record, including a forged form post) → refused.
   - Test: `validateEmployeeChange` (Task 2). Manual check with a forged post: Task 4.
5. **Email case and whitespace** (" Mali@Example.COM ") → stored as `mali@example.com`, matched at login, and a duplicate in a different case is refused.
   - Test: `normalizeEmail` (Task 2). Manual check: Task 4.

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma`, `prisma.config.ts` | Schema (Department, Employee, AuditLog) and Prisma 7 config |
| `prisma/seed.ts` | Ensure first admin from env; optional demo org (`SEED_DEMO=1`) |
| `lib/db.ts` | Prisma client singleton with the pg adapter |
| `lib/rules.ts` + `lib/rules.test.ts` | Pure rules: `can`, `validateEmployeeChange`, `wouldCreateCycle`, `allowSignIn`, `normalizeEmail` |
| `auth.ts` | Auth.js config (Google + dev login, allowlist) |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js route handlers |
| `lib/session.ts` | `currentEmployee()`, `requireEmployee()` |
| `lib/labels.ts` | Thai role labels |
| `lib/form.ts` | `failTo(path, message)` redirect-with-error helper |
| `components/NoAccess.tsx`, `components/ErrorBanner.tsx` | Shared messages |
| `components/EmployeeFields.tsx` | Employee form fields (create + edit) |
| `app/layout.tsx`, `app/page.tsx`, `app/signin/page.tsx` | Shell, home (me / my manager / my reports), sign-in |
| `app/admin/employees/page.tsx`, `[id]/page.tsx`, `actions.ts` | Employee list/create/edit |
| `app/admin/departments/page.tsx`, `actions.ts` | Departments |
| `app/admin/audit/page.tsx` | Audit log (admin only) |

---

### Task 1: Scaffold, Prisma 7, schema, seed

**Files:**
- Create: the Next.js scaffold at the repo root, `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts`, `lib/db.ts`, `.env.example`, `prisma/migrations/*` (generated)
- Modify: `package.json`, `tsconfig.json`, `.gitignore`, `eslint.config.mjs`

**Interfaces:**
- Produces: `prisma` from `lib/db.ts`; generated client types at `@/lib/generated/prisma/client` (`Employee`, `Department`, `AuditLog`, enum `GrantedRole` = `"HR" | "ADMIN"`); `npm test` script.

- [ ] **Step 1: Branch and scaffold next to the repo, then copy in without clobbering**

`create-next-app` refuses a non-empty folder. Copying with `-n` keeps our `CLAUDE.md` and `docs/`.

```bash
cd C:/Users/user/Desktop/work && git switch -c feat/phase1-step1
cd C:/Users/user/Desktop
npx create-next-app@latest eep-scaffold --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --yes
rm -rf eep-scaffold/.git eep-scaffold/CLAUDE.md
cp -rn eep-scaffold/. work/
rm -rf eep-scaffold
cd work && git status --short
```

Expected: `CLAUDE.md` and `docs/` show no changes, and the Next files appear as untracked.

In `next.config.ts`, delete `cacheComponents: true,` and `partialPrefetching: true,` if present. Every page reads the session, so they would force Suspense boundaries this plan does not use.

- [ ] **Step 2: Install pinned dependencies**

```bash
npm install
npm install next-auth@5.0.0-beta.32 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 zod@4.6.7 dotenv
npm install -D prisma@7.10.0 tsx
```

- [ ] **Step 3: Config files**

In `package.json` → `scripts`, add:

```json
"test": "node --test \"lib/**/*.test.ts\"",
"db:dev": "prisma dev --name eep",
"postinstall": "prisma generate"
```

In `tsconfig.json` → `compilerOptions`, add `"allowImportingTsExtensions": true`.

Append to `.gitignore`:

```
/lib/generated
!.env.example
```

In `eslint.config.mjs`, add `"lib/generated/**"` to the existing `globalIgnores([...])` list.

Create `.env.example`:

```
# Postgres connection. In dev, copy the direct postgres:// (TCP) URL printed by `npm run db:dev`.
DATABASE_URL=""
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=""
# Google Cloud Console → OAuth client (Web). Redirect URI: http://localhost:3000/api/auth/callback/google
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
# Dev-only email login (ignored when NODE_ENV=production)
AUTH_DEV_LOGIN="1"
# First admin, created by `npx prisma db seed`
SEED_ADMIN_EMAIL=""
SEED_ADMIN_NAME="Admin"
# 1 = also seed a demo org (example.com emails)
SEED_DEMO="0"
```

Copy it to `.env` and fill in `AUTH_SECRET` and `SEED_ADMIN_EMAIL` (use `admin@example.com` for local work).

- [ ] **Step 4: `prisma.config.ts` and `prisma/schema.prisma`**

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum GrantedRole {
  HR
  ADMIN
}

model Department {
  id        String     @id @default(cuid())
  name      String     @unique
  employees Employee[]
  createdAt DateTime   @default(now())
}

model Employee {
  id           String        @id @default(cuid())
  email        String        @unique // always trimmed + lowercased
  name         String
  position     String        @default("")
  roles        GrantedRole[] @default([])
  active       Boolean       @default(true)
  departmentId String?
  department   Department?   @relation(fields: [departmentId], references: [id])
  managerId    String?
  manager      Employee?     @relation("Reports", fields: [managerId], references: [id])
  reports      Employee[]    @relation("Reports")
  auditEntries AuditLog[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([managerId])
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  actor     Employee @relation(fields: [actorId], references: [id])
  action    String
  entity    String
  entityId  String
  before    Json?
  after     Json?
  createdAt DateTime @default(now())

  @@index([entity, entityId])
}
```

If `npx prisma validate` rejects the config shape, check `npx prisma --help` and the Prisma 7 docs, adjust only the config syntax (keep the models identical), and note the change in your report.

- [ ] **Step 5: `lib/db.ts` and `prisma/seed.ts`**

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

```ts
import "dotenv/config";
import { prisma } from "../lib/db";

async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set SEED_ADMIN_EMAIL in .env");
  const existing = await prisma.employee.findUnique({ where: { email } });
  if (!existing) {
    await prisma.employee.create({
      data: { email, name: process.env.SEED_ADMIN_NAME?.trim() || "Admin", roles: ["ADMIN"] },
    });
  } else if (!existing.active || !existing.roles.includes("ADMIN")) {
    await prisma.employee.update({
      where: { email },
      data: { active: true, roles: [...new Set([...existing.roles, "ADMIN" as const])] },
    });
  }
  console.log(`admin: ${email}`);
}

async function seedDemo() {
  const dept = await prisma.department.upsert({ where: { name: "วิศวกรรม" }, update: {}, create: { name: "วิศวกรรม" } });
  const upsert = (email: string, data: { name: string; position: string; roles?: ("HR" | "ADMIN")[]; managerId?: string }) =>
    prisma.employee.upsert({ where: { email }, update: {}, create: { email, departmentId: dept.id, ...data } });
  await upsert("nok@example.com", { name: "นก", position: "HR Partner", roles: ["HR"] });
  const somchai = await upsert("somchai@example.com", { name: "สมชาย", position: "Engineering Manager" });
  await upsert("mali@example.com", { name: "มะลิ", position: "Backend Developer", managerId: somchai.id });
  await upsert("ton@example.com", { name: "ต้น", position: "Frontend Developer", managerId: somchai.id });
  console.log("demo org seeded");
}

ensureAdmin()
  .then(() => (process.env.SEED_DEMO === "1" ? seedDemo() : undefined))
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Start the local DB, migrate, seed**

1. Run `npm run db:dev` in the background (check `npx prisma dev --help` for flags).
2. From its output, copy the **direct `postgres://` TCP connection string** into `.env` as `DATABASE_URL`. Do not use the `prisma+postgres://` URL; the pg adapter needs plain TCP.
3. Set `SEED_DEMO="1"` in `.env`, then run:

```bash
npx prisma migrate dev --name init
npx prisma db seed
npx tsx -e "import('dotenv/config').then(() => import('./lib/db.ts')).then(async ({ prisma }) => { console.log(await prisma.employee.count()); await prisma.\$disconnect(); })"
```

Expected:
- the migration is created under `prisma/migrations/`
- the seed prints `admin: admin@example.com` and `demo org seeded`
- the count prints `5`

Run the seed again and expect the count to stay `5` (idempotent).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold app with Prisma 7 schema and seed"
```

Confirm `.env` and `lib/generated` are **not** in the commit.

---

### Task 2: Pure rules (`lib/rules.ts`)

**Files:**
- Create: `lib/rules.ts`, `lib/rules.test.ts`

**Interfaces:**
- Produces (exact):
  - types `GrantedRole = "HR" | "ADMIN"`, `Actor = { id: string; roles: GrantedRole[] }`, `Person = { id: string; managerId: string | null }`, `Action = "employee.view" | "employee.manage" | "department.manage" | "audit.view"`
  - `isHrOrAdmin(a: Actor): boolean`
  - `can(actor: Actor, action: Action, target?: Person): boolean`
  - `validateEmployeeChange(actor: Actor, targetId: string | null, beforeRoles: GrantedRole[], afterRoles: GrantedRole[]): string | null` (`null` = allowed, otherwise a Thai error message)
  - `wouldCreateCycle(employeeId: string, newManagerId: string | null, managerOf: Map<string, string | null>): boolean`
  - `allowSignIn(employee: { active: boolean } | null, provider: string | undefined, emailVerified: unknown): boolean`
  - `normalizeEmail(s: string): string`

- [ ] **Step 1: Write the failing tests `lib/rules.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowSignIn, can, normalizeEmail, validateEmployeeChange, wouldCreateCycle, type Actor } from "./rules.ts";

const actor = (id: string, roles: Actor["roles"] = []): Actor => ({ id, roles });
const person = (id: string, managerId: string | null) => ({ id, managerId });

test("employee.view: self, direct manager, HR, admin; not peer or skip-level", () => {
  const mali = person("mali", "somchai");
  assert.equal(can(actor("mali"), "employee.view", mali), true);
  assert.equal(can(actor("somchai"), "employee.view", mali), true);
  assert.equal(can(actor("ton"), "employee.view", mali), false);
  assert.equal(can(actor("director"), "employee.view", mali), false); // manager's manager
  assert.equal(can(actor("nok", ["HR"]), "employee.view", mali), true);
  assert.equal(can(actor("root", ["ADMIN"]), "employee.view", mali), true);
  assert.equal(can(actor("mali"), "employee.view"), false); // no target
});

test("employee.manage: HR or admin, never on own record", () => {
  assert.equal(can(actor("nok", ["HR"]), "employee.manage"), true);
  assert.equal(can(actor("root", ["ADMIN"]), "employee.manage"), true);
  assert.equal(can(actor("somchai"), "employee.manage"), false);
  assert.equal(can(actor("nok", ["HR"]), "employee.manage", person("nok", null)), false);
  assert.equal(can(actor("nok", ["HR"]), "employee.manage", person("mali", "somchai")), true);
});

test("department.manage: HR or admin; audit.view: admin only", () => {
  assert.equal(can(actor("nok", ["HR"]), "department.manage"), true);
  assert.equal(can(actor("mali"), "department.manage"), false);
  assert.equal(can(actor("root", ["ADMIN"]), "audit.view"), true);
  assert.equal(can(actor("nok", ["HR"]), "audit.view"), false);
});

test("role changes: HR grants HR, only admin touches ADMIN, nobody edits self", () => {
  const hr = actor("nok", ["HR"]);
  const admin = actor("root", ["ADMIN"]);
  assert.equal(validateEmployeeChange(hr, "mali", [], ["HR"]), null);
  assert.equal(validateEmployeeChange(hr, null, [], []), null); // create
  assert.match(validateEmployeeChange(hr, "mali", [], ["ADMIN"]) ?? "", /แอดมิน/);
  assert.match(validateEmployeeChange(hr, null, [], ["ADMIN"]) ?? "", /แอดมิน/);
  assert.match(validateEmployeeChange(hr, "root2", ["ADMIN"], ["ADMIN"]) ?? "", /แอดมิน/); // HR editing an admin
  assert.equal(validateEmployeeChange(admin, "root2", ["ADMIN"], []), null);
  assert.equal(validateEmployeeChange(admin, "mali", [], ["ADMIN", "HR"]), null);
  assert.match(validateEmployeeChange(admin, "root", ["ADMIN"], ["ADMIN"]) ?? "", /ตัวเอง/);
  assert.match(validateEmployeeChange(actor("somchai"), "mali", [], []) ?? "", /สิทธิ์/);
});

test("reporting line: refuse cycles, terminate on bad data", () => {
  const managerOf = new Map<string, string | null>([["a", null], ["b", "a"], ["c", "b"]]);
  assert.equal(wouldCreateCycle("a", "a", managerOf), true);
  assert.equal(wouldCreateCycle("a", "c", managerOf), true);
  assert.equal(wouldCreateCycle("c", "a", managerOf), false);
  assert.equal(wouldCreateCycle("b", null, managerOf), false);
  const broken = new Map<string, string | null>([["x", "y"], ["y", "x"]]);
  assert.equal(wouldCreateCycle("z", "x", broken), false);
});

test("sign-in: active registered employee only; Google email must be verified", () => {
  assert.equal(allowSignIn(null, "google", true), false);
  assert.equal(allowSignIn({ active: false }, "google", true), false);
  assert.equal(allowSignIn({ active: true }, "google", undefined), false);
  assert.equal(allowSignIn({ active: true }, "google", false), false);
  assert.equal(allowSignIn({ active: true }, "google", true), true);
  assert.equal(allowSignIn({ active: true }, "dev", undefined), true);
});

test("email is trimmed and lowercased", () => {
  assert.equal(normalizeEmail("  Mali@Example.COM "), "mali@example.com");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run `npm test`. Expected: FAIL, because `./rules.ts` cannot be found.

- [ ] **Step 3: Write `lib/rules.ts`**

```ts
export type GrantedRole = "HR" | "ADMIN";
export type Actor = { id: string; roles: GrantedRole[] };
export type Person = { id: string; managerId: string | null };
export type Action = "employee.view" | "employee.manage" | "department.manage" | "audit.view";

export function isHrOrAdmin(a: Actor): boolean {
  return a.roles.includes("HR") || a.roles.includes("ADMIN");
}

// Manager is derived: you manage X when X.managerId is you (direct reports only).
export function can(actor: Actor, action: Action, target?: Person): boolean {
  switch (action) {
    case "employee.view":
      return !!target && (target.id === actor.id || target.managerId === actor.id || isHrOrAdmin(actor));
    case "employee.manage":
      return isHrOrAdmin(actor) && target?.id !== actor.id;
    case "department.manage":
      return isHrOrAdmin(actor);
    case "audit.view":
      return actor.roles.includes("ADMIN");
  }
}

// Returns a Thai error message, or null when the change is allowed. targetId null = creating.
export function validateEmployeeChange(
  actor: Actor,
  targetId: string | null,
  beforeRoles: GrantedRole[],
  afterRoles: GrantedRole[],
): string | null {
  if (!isHrOrAdmin(actor)) return "ไม่มีสิทธิ์จัดการพนักงาน";
  if (targetId === actor.id) return "แก้ข้อมูลของตัวเองที่หน้านี้ไม่ได้ ให้ HR หรือแอดมินคนอื่นแก้ให้";
  if (actor.roles.includes("ADMIN")) return null;
  if (beforeRoles.includes("ADMIN")) return "เฉพาะแอดมินเท่านั้นที่แก้ข้อมูลของแอดมินได้";
  if (afterRoles.includes("ADMIN")) return "เฉพาะแอดมินเท่านั้นที่ให้สิทธิ์แอดมินได้";
  return null;
}

export function wouldCreateCycle(
  employeeId: string,
  newManagerId: string | null,
  managerOf: Map<string, string | null>,
): boolean {
  const seen = new Set<string>();
  let cur: string | null = newManagerId;
  while (cur !== null) {
    if (cur === employeeId) return true;
    if (seen.has(cur)) return false; // pre-existing loop elsewhere; not caused by this change
    seen.add(cur);
    cur = managerOf.get(cur) ?? null;
  }
  return false;
}

export function allowSignIn(
  employee: { active: boolean } | null,
  provider: string | undefined,
  emailVerified: unknown,
): boolean {
  if (!employee?.active) return false;
  return provider !== "google" || emailVerified === true;
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run `npm test`. Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lib/rules.ts lib/rules.test.ts
git commit -m "feat: pure permission and org rules with tests"
```

---

### Task 3: Sign-in, session, shell, home

**Files:**
- Create: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/session.ts`, `lib/labels.ts`, `components/NoAccess.tsx`, `components/ErrorBanner.tsx`, `app/signin/page.tsx`
- Modify (replace whole file): `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 1); `allowSignIn`, `normalizeEmail`, `can` (Task 2)
- Produces:
  - from `auth.ts`: `auth`, `signIn`, `signOut`, `handlers`, `devLoginEnabled: boolean`
  - from `lib/session.ts`: `currentEmployee(): Promise<Employee | null>`, `requireEmployee(): Promise<Employee>` (redirects to `/signin`)
  - from `lib/labels.ts`: `GRANTED_ROLE_LABEL`, `roleLabels(roles, hasReports): string[]`
  - `<NoAccess />`, `<ErrorBanner message?: string />`

- [ ] **Step 1: `auth.ts` and the route**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { allowSignIn, normalizeEmail } from "@/lib/rules";

// Dev-only login by registered email, for local testing without Google. Off in production builds.
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: { email: {} },
            authorize: async (c) => {
              const email = normalizeEmail(String(c?.email ?? ""));
              return email ? { id: email, email } : null;
            },
          }),
        ]
      : []),
  ],
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email ? normalizeEmail(user.email) : "";
      if (!email) return false;
      const employee = await prisma.employee.findUnique({ where: { email } });
      return allowSignIn(employee, account?.provider, profile?.email_verified);
    },
  },
});
```

`app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 2: `lib/session.ts`, `lib/labels.ts`, the components**

```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/rules";

// Looked up on every request so a deactivated employee loses access immediately.
export async function currentEmployee() {
  const email = (await auth())?.user?.email;
  if (!email) return null;
  const employee = await prisma.employee.findUnique({ where: { email: normalizeEmail(email) } });
  return employee?.active ? employee : null;
}

export async function requireEmployee() {
  const employee = await currentEmployee();
  if (!employee) redirect("/signin");
  return employee;
}
```

```ts
import type { GrantedRole } from "@/lib/rules";

export const GRANTED_ROLE_LABEL: Record<GrantedRole, string> = { HR: "HR", ADMIN: "แอดมิน" };

export function roleLabels(roles: readonly GrantedRole[], hasReports: boolean): string[] {
  return ["พนักงาน", ...(hasReports ? ["หัวหน้า"] : []), ...roles.map((r) => GRANTED_ROLE_LABEL[r])];
}
```

```tsx
// components/NoAccess.tsx
export function NoAccess() {
  return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">คุณไม่มีสิทธิ์ดูหน้านี้</p>;
}
```

```tsx
// components/ErrorBanner.tsx
export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p>;
}
```

- [ ] **Step 3: `app/signin/page.tsx`**

```tsx
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
```

- [ ] **Step 4: Replace `app/layout.tsx`**

```tsx
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
```

- [ ] **Step 5: Replace `app/page.tsx`**

```tsx
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { requireEmployee } from "@/lib/session";

export default async function Home() {
  const me = await requireEmployee();
  const [manager, department, reports] = await Promise.all([
    me.managerId ? prisma.employee.findUnique({ where: { id: me.managerId } }) : null,
    me.departmentId ? prisma.department.findUnique({ where: { id: me.departmentId } }) : null,
    prisma.employee.findMany({ where: { managerId: me.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">สวัสดี {me.name}</h1>
        <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">อีเมล</dt><dd>{me.email}</dd>
          <dt className="text-gray-500">ตำแหน่ง</dt><dd>{me.position || "-"}</dd>
          <dt className="text-gray-500">แผนก</dt><dd>{department?.name ?? "-"}</dd>
          <dt className="text-gray-500">หัวหน้า</dt><dd>{manager?.name ?? "-"}</dd>
          <dt className="text-gray-500">บทบาท</dt><dd>{roleLabels(me.roles, reports.length > 0).join(", ")}</dd>
        </dl>
      </section>
      {reports.length > 0 && (
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">ลูกทีมโดยตรง</h2>
          <ul className="space-y-1 text-sm">
            {reports.map((r) => (
              <li key={r.id}>{r.name} <span className="text-gray-500">{r.position}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Prerequisites: `npm run db:dev` running, the demo org seeded, and `AUTH_DEV_LOGIN="1"`. Then run `npm run dev`.

Drive the dev login by POSTing the sign-in page's server-action form with curl and a cookie jar. Expected results:

| Case | Expected |
|---|---|
| `GET /` without a session | Redirects to `/signin` |
| Sign in as `mali@example.com` | Home shows "สวัสดี มะลิ", หัวหน้า "สมชาย", บทบาท "พนักงาน", and no admin links |
| Sign in as `unknown@example.com` | Ends on `/signin?error=AccessDenied` showing "อีเมลนี้ยังไม่ได้ลงทะเบียนหรือถูกปิดใช้งาน ติดต่อ HR" |
| Sign in as `somchai@example.com` | บทบาท "พนักงาน, หัวหน้า", and "ลูกทีมโดยตรง" lists ต้น and มะลิ |
| Sign in as `nok@example.com` | Header shows "พนักงาน" and "แผนก" links and no "Audit log". `admin@example.com` also sees "Audit log" |
| Deactivated mid-session | While mali's session cookie is live, run `prisma.employee.update({ where: { email: "mali@example.com" }, data: { active: false } })` via `npx tsx -e`, then `GET /` with the same cookie: it redirects to `/signin`. Set her back to active afterwards |

Also run `npm test` and `npx tsc --noEmit`. When stopping servers, stop only the PIDs you started.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Google sign-in limited to registered employees, home page"
```

---

### Task 4: Employee management (HR/admin)

**Files:**
- Create: `lib/form.ts`, `components/EmployeeFields.tsx`, `app/admin/employees/page.tsx`, `app/admin/employees/[id]/page.tsx`, `app/admin/employees/actions.ts`

**Interfaces:**
- Consumes: `prisma`; `requireEmployee`; `can`, `validateEmployeeChange`, `wouldCreateCycle`, `normalizeEmail`; `GRANTED_ROLE_LABEL`, `roleLabels`; `NoAccess`, `ErrorBanner`
- Produces: `failTo(path: string, message: string): never`; server actions `createEmployee(fd)`, `updateEmployee(id: string, fd)`

- [ ] **Step 1: `lib/form.ts` and `components/EmployeeFields.tsx`**

```ts
import { redirect } from "next/navigation";

// Server actions report validation errors by redirecting back with ?error=, so forms stay server components.
export function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
```

```tsx
import { GRANTED_ROLE_LABEL } from "@/lib/labels";
import type { GrantedRole } from "@/lib/rules";

type Option = { id: string; name: string };
export type EmployeeFormValue = {
  name: string;
  email: string;
  position: string;
  departmentId: string | null;
  managerId: string | null;
  active: boolean;
  roles: GrantedRole[];
};

const input = "mt-1 w-full rounded border px-3 py-2";

export function EmployeeFields({ departments, managers, canGrantAdmin, value }: {
  departments: Option[];
  managers: Option[];
  canGrantAdmin: boolean;
  value?: EmployeeFormValue;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">ชื่อ
        <input name="name" required maxLength={100} defaultValue={value?.name} className={input} />
      </label>
      <label className="block text-sm">อีเมล Google
        <input name="email" type="email" required defaultValue={value?.email} className={input} />
      </label>
      <label className="block text-sm">ตำแหน่ง
        <input name="position" maxLength={100} defaultValue={value?.position} className={input} />
      </label>
      <label className="block text-sm">แผนก
        <select name="departmentId" defaultValue={value?.departmentId ?? ""} className={input}>
          <option value="">ไม่ระบุ</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">หัวหน้า
        <select name="managerId" defaultValue={value?.managerId ?? ""} className={input}>
          <option value="">ไม่มี</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <fieldset className="text-sm">
        <legend>สิทธิ์ที่ได้รับ</legend>
        <label className="mr-4 inline-flex items-center gap-1">
          <input type="checkbox" name="roles" value="HR" defaultChecked={value?.roles.includes("HR")} /> {GRANTED_ROLE_LABEL.HR}
        </label>
        {canGrantAdmin && (
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" name="roles" value="ADMIN" defaultChecked={value?.roles.includes("ADMIN")} /> {GRANTED_ROLE_LABEL.ADMIN}
          </label>
        )}
      </fieldset>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={value?.active ?? true} /> ใช้งานอยู่
      </label>
    </div>
  );
}
```

- [ ] **Step 2: `app/admin/employees/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Employee } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { failTo } from "@/lib/form";
import { normalizeEmail, validateEmployeeChange, wouldCreateCycle } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

const EmployeeInput = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100, "ชื่อยาวเกินไป"),
  email: z.string().transform(normalizeEmail).pipe(z.email("อีเมลไม่ถูกต้อง")),
  position: z.string().trim().max(100, "ตำแหน่งยาวเกินไป"),
  departmentId: z.string().transform((v) => v || null),
  managerId: z.string().transform((v) => v || null),
  active: z.boolean(),
  roles: z.array(z.enum(["HR", "ADMIN"], "สิทธิ์ไม่ถูกต้อง")),
});

function parseEmployee(fd: FormData) {
  return EmployeeInput.safeParse({
    name: fd.get("name") ?? "",
    email: fd.get("email") ?? "",
    position: fd.get("position") ?? "",
    departmentId: fd.get("departmentId") ?? "",
    managerId: fd.get("managerId") ?? "",
    active: fd.get("active") === "on",
    roles: [...new Set(fd.getAll("roles"))],
  });
}

function snapshot(e: Employee) {
  return {
    name: e.name, email: e.email, position: e.position, departmentId: e.departmentId,
    managerId: e.managerId, active: e.active, roles: e.roles,
  };
}

async function checkReferences(path: string, departmentId: string | null, managerId: string | null) {
  if (departmentId && !(await prisma.department.findUnique({ where: { id: departmentId } }))) failTo(path, "ไม่พบแผนกที่เลือก");
  if (managerId && !(await prisma.employee.findFirst({ where: { id: managerId, active: true } }))) failTo(path, "ไม่พบหัวหน้าที่เลือก");
}

export async function createEmployee(fd: FormData) {
  const me = await requireEmployee();
  const path = "/admin/employees";
  const parsed = parseEmployee(fd);
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const data = parsed.data;

  const denied = validateEmployeeChange(me, null, [], data.roles);
  if (denied) failTo(path, denied);
  if (await prisma.employee.findUnique({ where: { email: data.email } })) failTo(path, "อีเมลนี้มีในระบบแล้ว");
  await checkReferences(path, data.departmentId, data.managerId);

  await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({ data });
    await tx.auditLog.create({
      data: { actorId: me.id, action: "employee.create", entity: "Employee", entityId: created.id, after: snapshot(created) },
    });
  });
  revalidatePath(path);
  redirect(path);
}

export async function updateEmployee(id: string, fd: FormData) {
  const me = await requireEmployee();
  const path = `/admin/employees/${id}`;
  const target = await prisma.employee.findUnique({ where: { id } });
  if (!target) failTo("/admin/employees", "ไม่พบพนักงาน");
  const parsed = parseEmployee(fd);
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const data = parsed.data;

  const denied = validateEmployeeChange(me, target.id, target.roles, data.roles);
  if (denied) failTo(path, denied);
  if (data.email !== target.email && (await prisma.employee.findUnique({ where: { email: data.email } }))) {
    failTo(path, "อีเมลนี้มีในระบบแล้ว");
  }
  await checkReferences(path, data.departmentId, data.managerId);
  if (data.managerId) {
    const all = await prisma.employee.findMany({ select: { id: true, managerId: true } });
    if (wouldCreateCycle(target.id, data.managerId, new Map(all.map((e) => [e.id, e.managerId])))) {
      failTo(path, "ตั้งหัวหน้าแบบนี้จะทำให้สายบังคับบัญชาวนกลับมาที่ตัวเอง");
    }
  }
  if (target.active && !data.active && (await prisma.employee.count({ where: { managerId: id, active: true } })) > 0) {
    failTo(path, "ย้ายลูกทีมไปอยู่กับหัวหน้าคนอื่นก่อน จึงจะปิดใช้งานได้");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({ where: { id }, data });
    await tx.auditLog.create({
      data: {
        actorId: me.id, action: "employee.update", entity: "Employee", entityId: id,
        before: snapshot(target), after: snapshot(updated),
      },
    });
  });
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}
```

- [ ] **Step 3: `app/admin/employees/page.tsx` (list + create)**

```tsx
import Link from "next/link";
import { createEmployee } from "./actions";
import { EmployeeFields } from "@/components/EmployeeFields";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/labels";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireEmployee();
  if (!can(me, "employee.manage")) return <NoAccess />;
  const { error } = await searchParams;
  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { department: true, manager: true, _count: { select: { reports: { where: { active: true } } } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const managers = employees.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">พนักงาน</h1>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">ชื่อ</th><th className="p-2">อีเมล</th><th className="p-2">ตำแหน่ง</th><th className="p-2">แผนก</th><th className="p-2">หัวหน้า</th><th className="p-2">บทบาท</th><th className="p-2">สถานะ</th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2"><Link href={`/admin/employees/${e.id}`} className="text-blue-700 underline">{e.name}</Link></td>
                <td className="p-2">{e.email}</td>
                <td className="p-2">{e.position || "-"}</td>
                <td className="p-2">{e.department?.name ?? "-"}</td>
                <td className="p-2">{e.manager?.name ?? "-"}</td>
                <td className="p-2">{roleLabels(e.roles, e._count.reports > 0).join(", ")}</td>
                <td className="p-2">{e.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={createEmployee} className="space-y-4 rounded border bg-white p-4">
        <h2 className="font-semibold">ลงทะเบียนพนักงานใหม่</h2>
        <ErrorBanner message={error} />
        <EmployeeFields departments={departments} managers={managers} canGrantAdmin={me.roles.includes("ADMIN")} />
        <button className="rounded bg-blue-700 px-4 py-2 text-white">ลงทะเบียน</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: `app/admin/employees/[id]/page.tsx` (edit)**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEmployee } from "../actions";
import { EmployeeFields } from "@/components/EmployeeFields";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can, validateEmployeeChange } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function EditEmployeePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireEmployee();
  if (!can(me, "employee.manage")) return <NoAccess />;
  const { id } = await params;
  const { error } = await searchParams;
  const target = await prisma.employee.findUnique({ where: { id } });
  if (!target) notFound();

  const blocked = validateEmployeeChange(me, target.id, target.roles, target.roles);
  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { active: true, NOT: { id } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">แก้ไขข้อมูล {target.name}</h1>
      {blocked ? (
        <ErrorBanner message={blocked} />
      ) : (
        <form action={updateEmployee.bind(null, target.id)} className="space-y-4 rounded border bg-white p-4">
          <ErrorBanner message={error} />
          <EmployeeFields departments={departments} managers={managers} canGrantAdmin={me.roles.includes("ADMIN")} value={target} />
          <button className="rounded bg-blue-700 px-4 py-2 text-white">บันทึก</button>
        </form>
      )}
      <Link href="/admin/employees" className="text-sm text-blue-700 underline">← กลับ</Link>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Use the dev login as in Task 3, driving the server actions with curl. Expected results:

As `admin@example.com`:
- Create " New@Example.COM " (name "ใหม่"). The list shows `new@example.com`.
- Creating `NEW@example.com` again shows "อีเมลนี้มีในระบบแล้ว".
- Editing สมชาย to set หัวหน้า = มะลิ shows the cycle message.
- Editing สมชาย to uncheck ใช้งานอยู่ shows "ย้ายลูกทีม…".
- Opening their own record shows the self-edit message and no form.

As `nok@example.com` (HR):
- The create form has no แอดมิน checkbox.
- A forged create post with `roles=ADMIN` shows "เฉพาะแอดมินเท่านั้นที่ให้สิทธิ์แอดมินได้".
- Opening admin's record shows "เฉพาะแอดมินเท่านั้นที่แก้ข้อมูลของแอดมินได้".
- Granting HR to ต้น works.

As `mali@example.com`:
- `/admin/employees` shows "คุณไม่มีสิทธิ์ดูหน้านี้".
- A forged `createEmployee` post shows "ไม่มีสิทธิ์จัดการพนักงาน".

Finally, query `AuditLog` via `npx tsx -e` and confirm one row per successful create or update, with before and after.

Also run `npm test` and `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: HR/admin employee management with role rules and audit"
```

---

### Task 5: Departments, audit log page, docs, build

**Files:**
- Create: `app/admin/departments/page.tsx`, `app/admin/departments/actions.ts`, `app/admin/audit/page.tsx`
- Modify: `CLAUDE.md` (the `## Commands` section and the `## Repo` line)

**Interfaces:**
- Consumes: `prisma`, `requireEmployee`, `can`, `failTo`, `NoAccess`, `ErrorBanner`
- Produces: server action `createDepartment(fd)`

- [ ] **Step 1: `app/admin/departments/actions.ts` and page**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { failTo } from "@/lib/form";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

const DepartmentName = z.string().trim().min(1, "กรุณากรอกชื่อแผนก").max(100, "ชื่อแผนกยาวเกินไป");

export async function createDepartment(fd: FormData) {
  const me = await requireEmployee();
  const path = "/admin/departments";
  if (!can(me, "department.manage")) failTo(path, "ไม่มีสิทธิ์จัดการแผนก");
  const parsed = DepartmentName.safeParse(fd.get("name") ?? "");
  if (!parsed.success) failTo(path, parsed.error.issues[0].message);
  const name = parsed.data;
  if (await prisma.department.findUnique({ where: { name } })) failTo(path, "มีแผนกนี้แล้ว");

  await prisma.$transaction(async (tx) => {
    const d = await tx.department.create({ data: { name } });
    await tx.auditLog.create({ data: { actorId: me.id, action: "department.create", entity: "Department", entityId: d.id, after: { name } } });
  });
  revalidatePath(path);
  redirect(path);
}
```

```tsx
import { createDepartment } from "./actions";
import { ErrorBanner } from "@/components/ErrorBanner";
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireEmployee();
  if (!can(me, "department.manage")) return <NoAccess />;
  const { error } = await searchParams;
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { active: true } } } } },
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">แผนก</h1>
      <ul className="divide-y rounded border bg-white text-sm">
        {departments.map((d) => (
          <li key={d.id} className="flex justify-between p-2">
            <span>{d.name}</span>
            <span className="text-gray-500">{d._count.employees} คน</span>
          </li>
        ))}
        {departments.length === 0 && <li className="p-2 text-gray-500">ยังไม่มีแผนก</li>}
      </ul>
      <form action={createDepartment} className="space-y-3 rounded border bg-white p-4">
        <ErrorBanner message={error} />
        <label className="block text-sm">ชื่อแผนกใหม่
          <input name="name" required maxLength={100} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <button className="rounded bg-blue-700 px-4 py-2 text-white">เพิ่มแผนก</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: `app/admin/audit/page.tsx`**

```tsx
import { NoAccess } from "@/components/NoAccess";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rules";
import { requireEmployee } from "@/lib/session";

export default async function AuditPage() {
  const me = await requireEmployee();
  if (!can(me, "audit.view")) return <NoAccess />;
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Audit log (100 รายการล่าสุด)</h1>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">เวลา</th><th className="p-2">ผู้ทำ</th><th className="p-2">การกระทำ</th><th className="p-2">รายการ</th><th className="p-2">ก่อน</th><th className="p-2">หลัง</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{e.createdAt.toLocaleString("th-TH")}</td>
                <td className="p-2">{e.actor.name}</td>
                <td className="p-2">{e.action}</td>
                <td className="p-2">{e.entity} {e.entityId}</td>
                <td className="p-2"><pre className="max-w-xs overflow-auto text-xs">{e.before ? JSON.stringify(e.before, null, 1) : "-"}</pre></td>
                <td className="p-2"><pre className="max-w-xs overflow-auto text-xs">{e.after ? JSON.stringify(e.after, null, 1) : "-"}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `CLAUDE.md`**

Replace the body of `## Commands` with:

```markdown
- `npm run db:dev`: local Postgres via `prisma dev`. Put its direct `postgres://` URL in `.env` as `DATABASE_URL` (see `.env.example`).
- `npx prisma migrate dev`: apply/create migrations. `npx prisma db seed`: ensure the first admin (`SEED_ADMIN_EMAIL`), plus a demo org when `SEED_DEMO=1`.
- `npm run dev`: app at http://localhost:3000. With `AUTH_DEV_LOGIN=1`, `/signin` also offers a dev-only email login for registered employees.
- `npm run build` (includes type check), `npm run lint`
- `npm test`: rule tests (`node:test`, `lib/**/*.test.ts`). Single test: `node --test --test-name-pattern="cycle" lib/rules.test.ts`

Permission and org rules live in `lib/rules.ts` as pure functions. Pages and server actions must call them; never check roles inline.
```

Replace the `## Repo` line with: `Remote: <https://github.com/devf51/EEP>. The throwaway prototype is on branch \`feat/prototype\` (not merged).`

- [ ] **Step 4: Verify**

1. As `nok@example.com`:
   - Add "การตลาด". It is listed with "0 คน".
   - Adding "การตลาด" again shows "มีแผนกนี้แล้ว".
   - `/admin/audit` shows no access.
2. As `admin@example.com`, `/admin/audit` lists the `department.create` and earlier `employee.*` rows with before/after.
3. As `mali@example.com`, `/admin/departments` shows no access.
4. Run: `npm test && npm run lint && npm run build`. Expected: all succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: departments and audit log pages; document commands"
```
