import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { createJsonStore } from "@/lib/data-store";
import type { EsmRole } from "@/types/enums";

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

const usersStore = createJsonStore<EsmUserConfig[]>("esm-users", []);

function loadUsers(): EsmUserConfig[] {
  return usersStore.load();
}

function buildProviders() {
  const providers: NextAuthConfig["providers"] = [];

  if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const MicrosoftEntraID = require("next-auth/providers/microsoft-entra-id").default;
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.AZURE_AD_TENANT_ID,
        authorization: {
          params: { scope: "openid profile email User.Read" },
        },
        profile(profile: { sub: string; email: string; name: string; preferred_username: string }) {
          const users = loadUsers();
          const match = users.find((u) => u.email.toLowerCase() === (profile.email || profile.preferred_username || "").toLowerCase());
          return {
            id: profile.sub,
            email: profile.email || profile.preferred_username,
            name: profile.name,
            role: (match?.role || "SC") as EsmRole,
          };
        },
      }),
    );
  }

  providers.push(
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const users = loadUsers();
        const user = users.find((u) => u.email.toLowerCase() === email);
        if (!user) return null;

        const match = await bcryptjs.compare(password, user.password);
        if (!match) return null;

        return { id: email, email: user.email, name: user.name, role: user.role };
      },
    }),
  );

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: buildProviders(),
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
