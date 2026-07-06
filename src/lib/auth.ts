import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { EsmRole } from "@/types/enums";
import usersJson from "../../config/esm-users.json";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: EsmRole;
    } & DefaultSession["user"];
  }
  interface User {
    role: EsmRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: EsmRole;
    uid?: string;
  }
}

interface EsmUserConfig {
  email: string;
  name: string;
  role: EsmRole;
  password: string;
}

const users = usersJson as EsmUserConfig[];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = users.find((u) => u.email.toLowerCase() === email);
        if (!user) return null;
        if (password !== user.password) return null;
        return { id: email, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
