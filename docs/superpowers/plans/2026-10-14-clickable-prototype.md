# EEP Clickable Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A quick, clickable Next.js prototype so the team shares one picture of the core loop: log contribution → endorse → portfolio → review with the portfolio beside the form.

**Architecture:** One Next.js App Router app. Mock data lives in an in-memory module (`lib/data.ts`), and all permission/validation rules live as pure functions in `lib/rules.ts`. Pages and server actions call those rules on the server. A header dropdown swaps the "logged-in" demo user through a cookie, so each role can be shown live. No DB, no auth, no cycles yet.

**Tech Stack:** Node 24, Next.js (latest, App Router) + TypeScript + Tailwind, and `node:test` (built-in, runs `.ts` natively on Node 24) for the rules.

**Spec:** `docs/spec.md` (Thai). Invariants are summarized in `CLAUDE.md`.

## Global Constraints

- Stack: Next.js + TypeScript. No new runtime dependencies beyond what `create-next-app` installs.
- UI copy in Thai. Code and identifiers in English.
- Permissions are checked on the server in every page and server action. Hiding UI alone is never enough (spec: "ตรวจที่ฝั่งเซิร์ฟเวอร์ทุกคำขอ").
- Manager-added contributions appear only after the owner confirms them (spec: "ผลงานที่หัวหน้าเติมให้ จะขึ้นพอร์ตหลังเจ้าตัวกดยืนยันเท่านั้น").
- Never show quantity as a score. Show endorsers by name as evidence, not as a ranking.
- "Invisible work" categories (code review, mentoring, docs) are first-class options in the form.
- Out of scope for the prototype: Postgres/Prisma, Auth.js, admin role, review cycles/templates UI, HR calibration, 360°, and AuditLog.

## Review Focus

1. **Typing another person's URL** (`/people/e2` while logged in as e1): show a no-access page and no data. Tested by `canViewPortfolio` (Task 1). Every page calls it (Tasks 2 and 5).
2. **A manager-added item leaking before confirmation** into the portfolio, review evidence, or project page for anyone but the owner. Tested by `visibleContributions` and `canEndorse` (Task 1).
3. **A `javascript:` evidence link** must be rejected on save and never rendered as a link. Tested by `isSafeEvidenceUrl` (Task 1).
4. **Endorsing your own work, endorsing twice, or endorsing outside the project** must be refused. Tested by `canEndorse` (Task 1).
5. **A forged review post** (score outside 1–5, or reviewing someone who is not your report) must be refused. Tested by `parseScore` and `reviewTypeFor` (Task 1).

## File Structure

**All app paths below are relative to `prototype/`** (e.g. `lib/data.ts` means `prototype/lib/data.ts`). Run every `npm` command from inside `prototype/`.

| File | Responsibility |
|---|---|
| `lib/data.ts` | Types, Thai labels, in-memory seed data, `findEmployee` |
| `lib/rules.ts` | Pure permission + validation rules (the only logic with tests) |
| `lib/rules.test.ts` | `node:test` checks for every rule |
| `lib/session.ts` | `currentUser()` from the `demoUser` cookie |
| `app/actions.ts` | All server actions; each re-checks rules |
| `app/layout.tsx` | Header with demo-user switcher |
| `app/page.tsx` | Home: who/what the current user can see |
| `app/people/[id]/page.tsx` | Portfolio |
| `app/people/[id]/new/page.tsx` | Short contribution form |
| `app/people/[id]/review/page.tsx` | Review form with portfolio side by side |
| `app/projects/[id]/page.tsx` | Project members + contributions + endorse |
| `components/ContributionCard.tsx` | One contribution, reused on 3 pages |
| `components/NoAccess.tsx` | No-permission message |

---

### Task 1: Scaffold + data + rules

**Files:**
- Create: Next.js scaffold (copied into the repo root), `lib/data.ts`, `lib/rules.ts`, `lib/rules.test.ts`
- Modify: `package.json` (test script), `tsconfig.json` (allow `.ts` imports)

**Interfaces:**
- Produces (later tasks import these exact names):
  - `lib/data.ts`: types `Role, Category, Employee, Project, Contribution, Criterion, Review`; consts `ROLE_LABEL, CATEGORY_LABEL, db`; `findEmployee(id: string): Employee | undefined`
  - `lib/rules.ts`: `isMember(p, employeeId)`, `canViewPortfolio(viewer, owner)`, `canAddContribution(viewer, owner)`, `canViewProject(viewer, p)`, `canEndorse(viewer, c, p)`, `reviewTypeFor(viewer, owner): "self" | "manager" | null`, `visibleContributions(viewer, ownerId, all)`, `isSafeEvidenceUrl(url)`, `parseScore(raw: string): number | null`, `weightedScore(scores, criteria): number`

- [ ] **Step 1: Scaffold into `prototype/`**

The app lives in `prototype/` at the repo root. `create-next-app` may write its own `AGENTS.md`/`CLAUDE.md`. Delete them so the repo-root `CLAUDE.md` stays the single source.

```bash
cd C:/Users/user/Desktop/work
npx create-next-app@latest prototype --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --disable-git --yes
rm -f prototype/AGENTS.md prototype/CLAUDE.md
git status --short
```

Expected: only `prototype/` is new, and the root `CLAUDE.md` and `docs/` are unchanged. `prototype/` has no `.git`.

- [ ] **Step 2: Allow `.ts` import extensions and add the test script**

In `tsconfig.json` → `compilerOptions`, add:

```json
"allowImportingTsExtensions": true
```

In `package.json` → `scripts`, add:

```json
"test": "node --test \"lib/**/*.test.ts\""
```

- [ ] **Step 3: Write `lib/data.ts`**

```ts
export const ROLE_LABEL = { employee: "พนักงาน", manager: "หัวหน้า", hr: "HR" } as const;
export type Role = keyof typeof ROLE_LABEL;

export const CATEGORY_LABEL = {
  delivery: "ส่งมอบงาน",
  "code-review": "รีวิวโค้ด",
  mentoring: "สอน/พี่เลี้ยง",
  docs: "ดูแลเอกสาร",
  other: "อื่นๆ",
} as const;
export type Category = keyof typeof CATEGORY_LABEL;

export type Employee = { id: string; name: string; title: string; role: Role; managerId: string | null };
export type Project = { id: string; name: string; members: { employeeId: string; role: string }[] };
export type Contribution = {
  id: string;
  ownerId: string;
  addedById: string;
  projectId: string;
  summary: string;
  impact: string;
  evidenceUrl: string;
  skills: string[];
  category: Category;
  confirmed: boolean;
  endorsedBy: string[];
  createdAt: string;
};
export type Criterion = { id: string; label: string; weight: number };
export type Review = {
  revieweeId: string;
  reviewerId: string;
  type: "self" | "manager";
  scores: Record<string, number>;
  comment: string;
  evidenceIds: string[];
};

// ponytail: in-memory store, resets when the dev server restarts. Replaced by Prisma + Postgres in build step 1.
export const db: {
  employees: Employee[];
  projects: Project[];
  contributions: Contribution[];
  criteria: Criterion[];
  reviews: Review[];
} = {
  employees: [
    { id: "hr1", name: "นก", title: "HR Partner", role: "hr", managerId: null },
    { id: "m1", name: "สมชาย", title: "Engineering Manager", role: "manager", managerId: null },
    { id: "e1", name: "มะลิ", title: "Backend Developer", role: "employee", managerId: "m1" },
    { id: "e2", name: "ต้น", title: "Frontend Developer", role: "employee", managerId: "m1" },
    { id: "e3", name: "พลอย", title: "QA Engineer", role: "employee", managerId: "m1" },
  ],
  projects: [
    {
      id: "p1",
      name: "ระบบชำระเงินใหม่",
      members: [
        { employeeId: "m1", role: "หัวหน้าโปรเจกต์" },
        { employeeId: "e1", role: "Backend" },
        { employeeId: "e2", role: "Frontend" },
      ],
    },
    {
      id: "p2",
      name: "คู่มือ onboarding",
      members: [
        { employeeId: "e1", role: "พี่เลี้ยง" },
        { employeeId: "e3", role: "เขียนคู่มือทดสอบ" },
      ],
    },
  ],
  contributions: [
    {
      id: "c1", ownerId: "e1", addedById: "e1", projectId: "p1",
      summary: "แก้ bug คิวชำระเงินค้างตอน peak",
      impact: "เคสลูกค้าร้องเรียนลดลง ~40 เคส/สัปดาห์",
      evidenceUrl: "https://github.com/example/pay/pull/412",
      skills: ["Python", "Debugging"], category: "delivery",
      confirmed: true, endorsedBy: ["e2"], createdAt: "2026-03-12",
    },
    {
      id: "c2", ownerId: "e1", addedById: "e1", projectId: "p1",
      summary: "รีวิว PR ของทีมตลอดไตรมาส",
      impact: "จับ race condition ได้ 2 จุดก่อนขึ้น production",
      evidenceUrl: "https://github.com/example/pay/pulls?q=reviewed-by%3Amali",
      skills: ["Code review"], category: "code-review",
      confirmed: true, endorsedBy: [], createdAt: "2026-06-30",
    },
    {
      id: "c3", ownerId: "e1", addedById: "e1", projectId: "p2",
      summary: "พาน้องใหม่ 2 คนขึ้นระบบ",
      impact: "น้องใหม่ปล่อยงานแรกได้ในสัปดาห์ที่ 2",
      evidenceUrl: "",
      skills: ["Mentoring"], category: "mentoring",
      confirmed: true, endorsedBy: ["e3"], createdAt: "2026-08-01",
    },
    {
      id: "c4", ownerId: "e2", addedById: "e2", projectId: "p1",
      summary: "ทำหน้า checkout ใหม่",
      impact: "conversion เพิ่ม 3%",
      evidenceUrl: "https://www.figma.com/file/example",
      skills: ["React"], category: "delivery",
      confirmed: true, endorsedBy: [], createdAt: "2026-05-20",
    },
    {
      id: "c5", ownerId: "e3", addedById: "m1", projectId: "p2",
      summary: "เขียนคู่มือทดสอบ regression",
      impact: "ทีมรันเทสต์เองได้ ไม่ต้องรอ QA",
      evidenceUrl: "https://docs.example.com/qa-guide",
      skills: ["Docs"], category: "docs",
      confirmed: false, endorsedBy: [], createdAt: "2026-09-15",
    },
  ],
  criteria: [
    { id: "k1", label: "คุณภาพงาน", weight: 40 },
    { id: "k2", label: "ผลกระทบต่อทีม/ลูกค้า", weight: 40 },
    { id: "k3", label: "การช่วยเหลือและพัฒนาคนอื่น", weight: 20 },
  ],
  reviews: [
    {
      revieweeId: "e1", reviewerId: "e1", type: "self",
      scores: { k1: 3, k2: 3, k3: 3 },
      comment: "ทำตามที่ได้รับมอบหมาย",
      evidenceIds: ["c1"],
    },
  ],
};

export function findEmployee(id: string): Employee | undefined {
  return db.employees.find((e) => e.id === id);
}
```

- [ ] **Step 4: Write the failing tests `lib/rules.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "./data.ts";
import {
  canAddContribution, canEndorse, canViewPortfolio, canViewProject, isSafeEvidenceUrl,
  parseScore, reviewTypeFor, visibleContributions, weightedScore,
} from "./rules.ts";

const emp = (id: string) => db.employees.find((e) => e.id === id)!;
const proj = (id: string) => db.projects.find((p) => p.id === id)!;
const con = (id: string) => db.contributions.find((c) => c.id === id)!;

test("portfolio: own yes, peer no, manager of report yes, HR yes", () => {
  assert.equal(canViewPortfolio(emp("e1"), emp("e1")), true);
  assert.equal(canViewPortfolio(emp("e1"), emp("e2")), false);
  assert.equal(canViewPortfolio(emp("m1"), emp("e1")), true);
  assert.equal(canViewPortfolio(emp("m1"), emp("hr1")), false);
  assert.equal(canViewPortfolio(emp("hr1"), emp("e3")), true);
});

test("add contribution: self or own manager only", () => {
  assert.equal(canAddContribution(emp("e1"), emp("e1")), true);
  assert.equal(canAddContribution(emp("m1"), emp("e1")), true);
  assert.equal(canAddContribution(emp("e2"), emp("e1")), false);
  assert.equal(canAddContribution(emp("hr1"), emp("e1")), false);
});

test("project: members and HR only", () => {
  assert.equal(canViewProject(emp("e3"), proj("p1")), false);
  assert.equal(canViewProject(emp("e2"), proj("p1")), true);
  assert.equal(canViewProject(emp("hr1"), proj("p1")), true);
});

test("manager-added item visible only to owner until confirmed", () => {
  const ids = (viewer: string) => visibleContributions(emp(viewer), "e3", db.contributions).map((c) => c.id);
  assert.deepEqual(ids("e3"), ["c5"]);
  assert.deepEqual(ids("m1"), []);
  assert.deepEqual(ids("hr1"), []);
});

test("endorse: not own, not twice, members only, confirmed only", () => {
  assert.equal(canEndorse(emp("e1"), con("c1"), proj("p1")), false); // own
  assert.equal(canEndorse(emp("e2"), con("c1"), proj("p1")), false); // already endorsed
  assert.equal(canEndorse(emp("e3"), con("c4"), proj("p1")), false); // not a member
  assert.equal(canEndorse(emp("e1"), con("c4"), proj("p1")), true);
  assert.equal(canEndorse(emp("e1"), con("c5"), proj("p2")), false); // pending
});

test("review type: self, own manager, nobody else", () => {
  assert.equal(reviewTypeFor(emp("e1"), emp("e1")), "self");
  assert.equal(reviewTypeFor(emp("m1"), emp("e1")), "manager");
  assert.equal(reviewTypeFor(emp("e2"), emp("e1")), null);
  assert.equal(reviewTypeFor(emp("hr1"), emp("e1")), null);
});

test("evidence url: http(s) or empty only", () => {
  assert.equal(isSafeEvidenceUrl(""), true);
  assert.equal(isSafeEvidenceUrl("https://github.com/x/y/pull/1"), true);
  assert.equal(isSafeEvidenceUrl("javascript:alert(1)"), false);
  assert.equal(isSafeEvidenceUrl("not a url"), false);
});

test("score: integer 1-5 only", () => {
  assert.equal(parseScore("5"), 5);
  assert.equal(parseScore("1"), 1);
  assert.equal(parseScore("0"), null);
  assert.equal(parseScore("6"), null);
  assert.equal(parseScore("3.5"), null);
  assert.equal(parseScore("abc"), null);
  assert.equal(parseScore(""), null);
});

test("weighted score uses criterion weights", () => {
  assert.equal(weightedScore({ k1: 3, k2: 3, k3: 3 }, db.criteria), 3);
  assert.equal(weightedScore({ k1: 5, k2: 5, k3: 0 }, db.criteria), 4);
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. `./rules.ts` cannot be found.

- [ ] **Step 6: Write `lib/rules.ts`**

```ts
import type { Contribution, Criterion, Employee, Project } from "./data.ts";

export function isMember(p: Project, employeeId: string): boolean {
  return p.members.some((m) => m.employeeId === employeeId);
}

export function canViewPortfolio(viewer: Employee, owner: Employee): boolean {
  return viewer.id === owner.id || viewer.role === "hr" || owner.managerId === viewer.id;
}

export function canAddContribution(viewer: Employee, owner: Employee): boolean {
  return viewer.id === owner.id || owner.managerId === viewer.id;
}

export function canViewProject(viewer: Employee, p: Project): boolean {
  return viewer.role === "hr" || isMember(p, viewer.id);
}

export function canEndorse(viewer: Employee, c: Contribution, p: Project): boolean {
  return c.confirmed && c.ownerId !== viewer.id && isMember(p, viewer.id) && !c.endorsedBy.includes(viewer.id);
}

export function reviewTypeFor(viewer: Employee, owner: Employee): "self" | "manager" | null {
  if (viewer.id === owner.id) return "self";
  if (owner.managerId === viewer.id) return "manager";
  return null;
}

// Unconfirmed (manager-added) items are shown only to their owner, who must confirm them.
export function visibleContributions(viewer: Employee, ownerId: string, all: Contribution[]): Contribution[] {
  return all.filter((c) => c.ownerId === ownerId && (c.confirmed || viewer.id === ownerId));
}

export function isSafeEvidenceUrl(url: string): boolean {
  if (url === "") return true;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function parseScore(raw: string): number | null {
  const n = Number(raw);
  return raw !== "" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function weightedScore(scores: Record<string, number>, criteria: Criterion[]): number {
  const total = criteria.reduce((s, k) => s + k.weight, 0);
  const sum = criteria.reduce((s, k) => s + (scores[k.id] ?? 0) * k.weight, 0);
  return Math.round((sum / total) * 100) / 100;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 9 tests, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js prototype with mock data and permission rules"
```

---

### Task 2: Demo-user switcher, home, portfolio (read-only)

**Files:**
- Create: `lib/session.ts`, `app/actions.ts`, `components/ContributionCard.tsx`, `components/NoAccess.tsx`, `app/people/[id]/page.tsx`
- Modify (replace whole file): `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: everything from Task 1
- Produces: `currentUser(): Promise<Employee>`; `switchUser(formData)`; `<ContributionCard c={...}>{optional children}</ContributionCard>`; `<NoAccess />`

- [ ] **Step 1: `lib/session.ts`**

```ts
import { cookies } from "next/headers";
import { db, findEmployee, type Employee } from "./data";

// Prototype only: the "login" is a cookie set by the header dropdown. Auth.js replaces this in build step 1.
export async function currentUser(): Promise<Employee> {
  const id = (await cookies()).get("demoUser")?.value ?? "";
  return findEmployee(id) ?? db.employees[0];
}
```

- [ ] **Step 2: `app/actions.ts`**

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findEmployee } from "@/lib/data";

export async function switchUser(formData: FormData) {
  const id = String(formData.get("id"));
  if (findEmployee(id)) (await cookies()).set("demoUser", id);
  redirect("/");
}
```

- [ ] **Step 3: `components/NoAccess.tsx` and `components/ContributionCard.tsx`**

```tsx
export function NoAccess() {
  return <p className="rounded border border-red-200 bg-red-50 p-4 text-red-800">คุณไม่มีสิทธิ์ดูหน้านี้</p>;
}
```

```tsx
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
```

- [ ] **Step 4: Replace `app/layout.tsx`**

```tsx
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
```

- [ ] **Step 5: Replace `app/page.tsx`**

```tsx
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
```

- [ ] **Step 6: `app/people/[id]/page.tsx` (read-only for now; Task 3 adds the confirm button)**

```tsx
import Link from "next/link";
import { ContributionCard } from "@/components/ContributionCard";
import { NoAccess } from "@/components/NoAccess";
import { db, findEmployee } from "@/lib/data";
import { canAddContribution, canViewPortfolio, isMember, reviewTypeFor, visibleContributions } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function Portfolio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const owner = findEmployee(id);
  if (!owner || !canViewPortfolio(me, owner)) return <NoAccess />;

  const items = visibleContributions(me, owner.id, db.contributions);
  const confirmed = items.filter((c) => c.confirmed);
  const pending = items.filter((c) => !c.confirmed);
  const projects = db.projects.filter((p) => isMember(p, owner.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">พอร์ตของ {owner.name}</h1>
          <p className="text-sm text-gray-600">{owner.title}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {canAddContribution(me, owner) && (
            <Link href={`/people/${owner.id}/new`} className="rounded bg-blue-700 px-3 py-1.5 text-white">+ บันทึกผลงาน</Link>
          )}
          {reviewTypeFor(me, owner) && (
            <Link href={`/people/${owner.id}/review`} className="rounded border px-3 py-1.5">ประเมิน</Link>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-2 font-semibold">โปรเจกต์และบทบาท</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {projects.map((p) => (
            <li key={p.id} className="rounded border bg-white px-3 py-1">
              {p.name} · {p.members.find((m) => m.employeeId === owner.id)?.role}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-amber-700">รอคุณยืนยัน (หัวหน้าเติมให้)</h2>
          {pending.map((c) => (
            <ContributionCard key={c.id} c={c} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">ผลงาน</h2>
        {confirmed.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผลงาน</p>}
        {confirmed.map((c) => (
          <ContributionCard key={c.id} c={c} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev`, then open http://localhost:3000.
Expected:
- As **มะลิ**, the home page lists only มะลิ. `/people/e1` shows c1–c3 with categories, evidence links, and endorser names. `/people/e2` shows "คุณไม่มีสิทธิ์ดูหน้านี้".
- Switch to **สมชาย**: sees มะลิ/ต้น/พลอย. `/people/e3` shows no c5.
- Switch to **พลอย**: `/people/e3` shows c5 under "รอคุณยืนยัน".
- Switch to **นก (HR)**: sees everyone.

Also run `npm test` and expect PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: demo-user switcher, home and portfolio pages"
```

---

### Task 3: Log a contribution + confirm a manager-added item

**Files:**
- Create: `app/people/[id]/new/page.tsx`
- Modify: `app/actions.ts` (append two actions), `app/people/[id]/page.tsx` (confirm button)

**Interfaces:**
- Consumes: `canAddContribution`, `isMember`, `isSafeEvidenceUrl`, `CATEGORY_LABEL`, `currentUser`
- Produces: `addContribution(ownerId: string, formData: FormData)`, `confirmContribution(id: string)`

- [ ] **Step 1: Append to `app/actions.ts`**

Replace the import block at the top of the file with:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CATEGORY_LABEL, db, findEmployee, type Category } from "@/lib/data";
import { canAddContribution, isMember, isSafeEvidenceUrl } from "@/lib/rules";
import { currentUser } from "@/lib/session";
```

Append:

```ts
export async function addContribution(ownerId: string, formData: FormData) {
  const me = await currentUser();
  const owner = findEmployee(ownerId);
  if (!owner || !canAddContribution(me, owner)) throw new Error("forbidden");

  const projectId = String(formData.get("projectId"));
  const project = db.projects.find((p) => p.id === projectId);
  const summary = String(formData.get("summary") ?? "").trim();
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  const category = String(formData.get("category"));
  if (!project || !isMember(project, owner.id)) throw new Error("invalid project");
  if (!summary) throw new Error("summary required");
  if (!isSafeEvidenceUrl(evidenceUrl)) throw new Error("evidence must be an http(s) link");
  if (!(category in CATEGORY_LABEL)) throw new Error("invalid category");

  db.contributions.push({
    id: crypto.randomUUID(),
    ownerId: owner.id,
    addedById: me.id,
    projectId,
    summary,
    impact: String(formData.get("impact") ?? "").trim(),
    evidenceUrl,
    skills: String(formData.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    category: category as Category,
    confirmed: me.id === owner.id, // manager-added → owner must confirm
    endorsedBy: [],
    createdAt: new Date().toISOString().slice(0, 10),
  });
  redirect(`/people/${owner.id}`);
}

export async function confirmContribution(id: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === id);
  if (!c || c.ownerId !== me.id) throw new Error("forbidden");
  c.confirmed = true;
  revalidatePath(`/people/${me.id}`);
}
```

- [ ] **Step 2: Create `app/people/[id]/new/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Add the confirm button on the portfolio**

In `app/people/[id]/page.tsx`, add the import:

```tsx
import { confirmContribution } from "@/app/actions";
```

Then replace the pending map body:

```tsx
{pending.map((c) => (
  <ContributionCard key={c.id} c={c}>
    <form action={confirmContribution.bind(null, c.id)} className="mt-3">
      <button className="rounded bg-amber-600 px-3 py-1 text-sm text-white">ยืนยันว่าเป็นผลงานของฉัน</button>
    </form>
  </ContributionCard>
))}
```

- [ ] **Step 4: Verify in the browser**

Expected:
- As **สมชาย**, go to `/people/e2/new` and add an item. It does **not** show on ต้น's portfolio for สมชาย.
- Switch to **ต้น**. It shows under "รอคุณยืนยัน". Click confirm, and it moves to "ผลงาน".
- As **มะลิ**, add an item with "รีวิวโค้ด". It shows immediately. `/people/e2/new` shows no-access.

Also run `npm test` and expect PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: short contribution form and owner confirmation"
```

---

### Task 4: Project page + endorse

**Files:**
- Create: `app/projects/[id]/page.tsx`
- Modify: `app/actions.ts` (append `endorse`)

**Interfaces:**
- Consumes: `canViewProject`, `canEndorse`, `ContributionCard`, `NoAccess`
- Produces: `endorse(contributionId: string)`

- [ ] **Step 1: Append to `app/actions.ts`**

Extend the rules import to `import { canAddContribution, canEndorse, isMember, isSafeEvidenceUrl } from "@/lib/rules";`, then append:

```ts
export async function endorse(contributionId: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === contributionId);
  const project = c && db.projects.find((p) => p.id === c.projectId);
  if (!c || !project || !canEndorse(me, c, project)) throw new Error("forbidden");
  c.endorsedBy.push(me.id);
  revalidatePath(`/projects/${project.id}`);
}
```

- [ ] **Step 2: Create `app/projects/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { endorse } from "@/app/actions";
import { ContributionCard } from "@/components/ContributionCard";
import { NoAccess } from "@/components/NoAccess";
import { db, findEmployee } from "@/lib/data";
import { canEndorse, canViewProject } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  const project = db.projects.find((p) => p.id === id);
  if (!project || !canViewProject(me, project)) return <NoAccess />;
  const items = db.contributions.filter((c) => c.projectId === project.id && c.confirmed);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{project.name}</h1>
      <section>
        <h2 className="mb-2 font-semibold">สมาชิกและบทบาท</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {project.members.map((m) => (
            <li key={m.employeeId} className="rounded border bg-white px-3 py-1">
              {findEmployee(m.employeeId)?.name} · {m.role}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">ผลงานในโปรเจกต์</h2>
        <p className="text-sm text-gray-600">เห็นงานส่วนไหนที่เพื่อนทำจริง กด &quot;ยืนยัน&quot; ให้ได้</p>
        {items.map((c) => (
          <ContributionCard key={c.id} c={c}>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-gray-500">โดย {findEmployee(c.ownerId)?.name}</span>
              {canEndorse(me, c, project) && (
                <form action={endorse.bind(null, c.id)}>
                  <button className="rounded border border-green-700 px-3 py-1 text-green-700">ยืนยันว่าคนนี้ทำจริง</button>
                </form>
              )}
            </div>
          </ContributionCard>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีผลงาน</p>}
      </section>
      <Link href="/" className="text-sm text-blue-700 underline">← กลับหน้าแรก</Link>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Expected:
- As **มะลิ**, open `/projects/p1`. ต้น's c4 has the endorse button, and มะลิ's own c1/c2 do not. Click it, and "✓ ยืนยันโดย มะลิ" appears and the button disappears.
- As **พลอย**, `/projects/p1` shows no-access.
- The pending c5 never appears on `/projects/p2`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: project page with peer endorsement"
```

---

### Task 5: Review page with portfolio side by side

**Files:**
- Create: `app/people/[id]/review/page.tsx`
- Modify: `app/actions.ts` (append `submitReview`)

**Interfaces:**
- Consumes: `reviewTypeFor`, `visibleContributions`, `parseScore`, `weightedScore`, `ContributionCard`
- Produces: `submitReview(ownerId: string, formData: FormData)`

- [ ] **Step 1: Append to `app/actions.ts`**

Extend the rules import to also include `parseScore, reviewTypeFor, visibleContributions`, then append:

```ts
export async function submitReview(ownerId: string, formData: FormData) {
  const me = await currentUser();
  const owner = findEmployee(ownerId);
  const type = owner && reviewTypeFor(me, owner);
  if (!owner || !type) throw new Error("forbidden");

  const scores: Record<string, number> = {};
  for (const k of db.criteria) {
    const s = parseScore(String(formData.get(k.id) ?? ""));
    if (s === null) throw new Error(`invalid score for ${k.id}`);
    scores[k.id] = s;
  }
  const allowed = new Set(visibleContributions(me, owner.id, db.contributions).filter((c) => c.confirmed).map((c) => c.id));
  const evidenceIds = formData.getAll("evidence").map(String).filter((id) => allowed.has(id));

  db.reviews = db.reviews.filter((r) => !(r.revieweeId === owner.id && r.reviewerId === me.id && r.type === type));
  db.reviews.push({ revieweeId: owner.id, reviewerId: me.id, type, scores, comment: String(formData.get("comment") ?? "").trim(), evidenceIds });
  redirect(`/people/${owner.id}`);
}
```

- [ ] **Step 2: Create `app/people/[id]/review/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify in the browser**

Expected:
- As **สมชาย**, `/people/e1/review` shows มะลิ's portfolio (c1–c3, including code review and mentoring) on the left. On the right are the self-review banner "คะแนนรวม 3 / 5" and the "เจ้าตัวให้ 3" hints, which make the gap visible next to the evidence. Submit, reopen, and the values persist.
- As **มะลิ**, `/people/e1/review` is a self review with no banner. `/people/e2/review` shows no-access.
- As **นก (HR)**, `/people/e1/review` shows no-access.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: review form with portfolio evidence side by side"
```

---

### Task 6: Document commands, build check, push

**Files:**
- Modify: `CLAUDE.md` (the `## Commands` section only)

- [ ] **Step 1: Replace the `## Commands` section of `CLAUDE.md`**

```markdown
## Commands

The prototype app lives in `prototype/`. Run these from there:

- `npm run dev`: dev server at http://localhost:3000. Switch demo users from the header dropdown.
- `npm run build`: production build plus type check
- `npm run lint`: ESLint
- `npm test`: rule tests (`node:test`, `lib/**/*.test.ts`)
- Single test: `node --test --test-name-pattern="endorse" lib/rules.test.ts`

Current state: clickable prototype. Data is in-memory in `prototype/lib/data.ts` (resets on restart), the "login" is a `demoUser` cookie, and all permission rules live in `prototype/lib/rules.ts`. Prisma/Postgres and Auth.js replace these in build step 1.
```

- [ ] **Step 2: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all three succeed.

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "docs: document prototype commands"
git push
```
