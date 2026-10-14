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

Not scaffolded yet. Once the app exists, add commands here for dev, build, lint, test, running a single test, and Prisma migrate/generate.

## Domain model

There are 10 core tables: Employee (with `manager_id` reporting line), Team, Project, Membership (employee × project with role/duties), Contribution, Endorsement, ReviewCycle, ReviewTemplate (criteria + weights), Review (type: self / manager / 360°), and AuditLog (who, what, when, before/after values).

`Contribution` is the hub: it links the portfolio (via Membership) to reviews, and reviewers attach contributions as evidence.

## Invariants (must hold in code)

- **Server-side authorization on every request and action.** Hiding UI is never enough. Roles:
  - employee: own portfolio, plus own results after the cycle closes
  - manager: direct reports only, via `manager_id`
  - HR: org-wide reports, templates, open/close cycles, calibration
  - admin: accounts, org structure, permissions, audit log
- **Manager-added contributions** appear in a portfolio only after the employee confirms them.
- **Closed-cycle data is locked.** Any change must go through a path that writes an `AuditLog` entry with before/after values.
- **360° anonymity:** reviewer identity is stored but never exposed to anyone, HR included. Show aggregates only, and only when a review has ≥3 reviewers.
- **Never score by quantity.** Commit counts or number of entries are supporting evidence only, never a scoring input.
- **"Invisible work"** (code review, mentoring, docs) must be loggable as a first-class contribution category.
- **Low-friction input:** short forms, with links instead of long write-ups. A form that rewards long writing reintroduces the bias the system exists to remove.

## Build order

1. Auth, roles, org structure
2. Projects/teams, contribution log, endorse, portfolio page
3. Review templates/cycles, self review, manager review (MVP ends here)

After the MVP comes Phase 2 (360°, KPI/OKR, biweekly reminders, dashboards/export, audit log), then Phase 3 (auto-import, approval/appeal workflow, IDP).

## Repo

Remote: <https://github.com/devf51/EEP>. No commits yet; the default branch has not been created.
