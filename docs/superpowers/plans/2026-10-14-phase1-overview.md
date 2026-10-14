# Phase 1 (MVP) Roadmap

Phase 1 = the MVP in `docs/spec.md` ("ฟังก์ชัน", rows marked 1 (MVP)). It is split into three steps. Each step ships working, tested software on `main` and gets its own detailed plan, written when the previous step is done, so later plans build on real code instead of guesses.

| Step | Delivers | Spec rows | Plan |
|---|---|---|---|
| 1 | Google sign-in limited to registered employees; layered roles; departments, positions, reporting lines; HR/admin manage employees and roles; audit of employee/role changes | ล็อกอินและสิทธิ์ตามบทบาท, จัดการพนักงานและโครงสร้างองค์กร | `2026-10-14-phase1-step1-auth-org.md` |
| 2 | Projects and teams with member roles/duties; contribution log (short form, evidence link, impact, skill tags, invisible-work categories); manager-added items need owner confirmation; peer endorse; portfolio page | โปรเจกต์และทีม, บันทึกผลงาน, Impact และแท็กทักษะ, Endorse, หน้าพอร์ตส่วนตัว | written after step 1 |
| 3 | Review templates (criteria + weights); cycles (open/close, deadline, lock on close); self review and manager review with portfolio beside the form, drafts | แบบประเมินและรอบการประเมิน, ให้คะแนน คอมเมนต์ และประเมินตัวเอง | written after step 2 |

## Decisions that hold across all three steps

- **Stack:** Next.js 16 (App Router) + TypeScript at the repo root, PostgreSQL via Prisma 7, Auth.js v5. Local DB is `prisma dev`, so no Docker or Postgres install is needed.
- **Login:** any Google account, but only if its email was pre-registered by HR or admin. Unknown or deactivated emails are refused.
- **Roles:** layered, as in `docs/spec.md` → "การกำหนดบทบาท".
  - Employee is implicit.
  - Manager is derived from `managerId`.
  - HR and ADMIN are granted.
  - HR or admin registers and edits employees.
  - Only admin grants or revokes HR/ADMIN and changes an employee's email.
  - Nobody changes their own record through admin screens.
- **Authorization:** pure functions in `lib/rules.ts` (`can(actor, action, target?)` and the org/role validators), unit-tested with `node:test`. Every page and server action calls them on the server.
- **Audit:** a minimal `AuditLog` table exists from step 1. Every employee or role change writes before/after values. Phase 2 extends it.
- **Reuse from the prototype** (branch `feat/prototype`, `prototype/lib/rules.ts`): step 2 ports the contribution/endorse rules and their tests, and step 3 ports `parseScore`/`weightedScore` and the review-type rule. Port the logic, not the in-memory store.

## Carry-over before steps 2 and 3

1. Bind the Google `sub`, or keep the employee id in the JWT, so a changed or reused email cannot resolve to another person's session [before step 2].
2. One manual sign-in with a real Google OAuth client [before step 2].
3. Per-entity redaction on the audit page before reviews are audited [before step 3].
4. Optional DB CHECK `email = lower(btrim(email))`.
5. `AUTH_URL` / `AUTH_TRUST_HOST` and the production redirect URI when deploying.
