import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Placeholder so `prisma generate` (postinstall) works on a fresh clone without .env;
    // generate never connects. migrate/seed need the real DATABASE_URL.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
});
