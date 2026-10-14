# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EEP is an employee-evaluation system built around evidence-based work portfolios. Throughout the year, employees log short contributions with evidence links. At review time, the person's portfolio is shown next to the review form so scores rest on recorded evidence, not on memory or presentation skill. Full spec (Thai): `docs/spec.md`. It is the source of truth for features, phases, and data model.

## Stack (decided)

- Next.js + TypeScript: UI and API in one app
- PostgreSQL + Prisma (schema as code, migrations)
- Auth.js (NextAuth): email or org Google/Microsoft login
- Phase 2: server-side Excel/PDF export. Phase 3: GitHub/GitLab/Jira APIs to suggest contributions for the user to confirm.

## Commands

- `npm run db:dev`: local Postgres via `prisma dev`. Put its direct `postgres://` URL in `.env` as `DATABASE_URL` (see `.env.example`).
- `npx prisma migrate dev`: apply/create migrations. `npx prisma db seed`: ensure the first admin (`SEED_ADMIN_EMAIL`), plus a demo org when `SEED_DEMO=1`.
- `npm run dev`: app at http://localhost:3000. With `AUTH_DEV_LOGIN=1`, `/signin` also offers a dev-only email login for registered employees.
- `npm run build` (includes type check), `npm run lint`
- `npm test`: rule tests (`node:test`, `lib/**/*.test.ts`). Single test: `node --test --test-name-pattern="cycle" lib/rules.test.ts`

Permission and org rules live in `lib/rules.ts` as pure functions. Pages and server actions must call them; never check roles inline.

## Domain model

There are 10 core tables: Employee (with `manager_id` reporting line), Team, Project, Membership (employee × project with role/duties), Contribution, Endorsement, ReviewCycle, ReviewTemplate (criteria + weights), Review (type: self / manager / 360°), and AuditLog (who, what, when, before/after values).

`Contribution` is the hub: it links the portfolio (via Membership) to reviews, and reviewers attach contributions as evidence.

## Invariants (must hold in code)

- **Server-side authorization on every request and action.** Hiding UI is never enough. Every check goes through one function, `can(viewer, action, target)`.
- **Roles are layered, and a person's permissions are the union of their layers:**
  - **employee:** implicit for everyone. Own portfolio, plus own results after the cycle closes.
  - **manager:** derived, never stored. You manage X if `X.manager_id` is you. Direct reports only; skip-level access waits for the Phase 3 approval chain.
  - **HR:** a granted role stored on Employee (`roles: ("hr" | "admin")[]`). Org-wide reports, templates, open/close cycles, calibration.
  - **admin:** a granted role. Accounts, org structure, role grants, audit log. Admin sees no review scores, comments, or portfolios unless the person also holds HR.
- **No elevated action on your own record.** HR cannot calibrate their own score, and nobody gets manager or HR rights over themselves. Your own record always gets employee-level treatment.
- **Manager-added contributions** appear in a portfolio only after the employee confirms them.
- **Closed-cycle data is locked.** Any change must go through a path that writes an `AuditLog` entry with before/after values.
- **360° anonymity:** reviewer identity is stored but never exposed to anyone, HR and admin included. Show aggregates only, and only when a review has ≥3 reviewers.
- **Never score by quantity.** Commit counts or number of entries are supporting evidence only, never a scoring input.
- **"Invisible work"** (code review, mentoring, docs) must be loggable as a first-class contribution category.
- **Low-friction input:** short forms, with links instead of long write-ups. A form that rewards long writing reintroduces the bias the system exists to remove.

## Build order

1. Auth, roles, org structure
2. Projects/teams, contribution log, endorse, portfolio page
3. Review templates/cycles, self review, manager review (MVP ends here)

After the MVP comes Phase 2 (360°, KPI/OKR, biweekly reminders, dashboards/export, audit log), then Phase 3 (auto-import, approval/appeal workflow, IDP).

## Repo

Remote: <https://github.com/devf51/EEP>. The throwaway prototype is on branch `feat/prototype` (not merged).
