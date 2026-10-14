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
