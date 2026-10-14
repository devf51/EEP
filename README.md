# EEP

EEP is an employee-evaluation system built around evidence-based work portfolios.
Employees log short contributions with evidence links through the year, and at review
time the portfolio sits next to the review form so scores rest on recorded evidence.

- Commands, stack and invariants: see `CLAUDE.md`.
- Full spec (Thai) and data model: see `docs/spec.md`.
- Quick start: copy `.env.example` to `.env`, run `npm run db:dev`, put its `postgres://` URL in
  `DATABASE_URL`, then `npx prisma migrate dev`, `npx prisma db seed` and `npm run dev`.
