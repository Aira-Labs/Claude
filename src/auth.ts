import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Format in ADMIN_USERS env var:
// email:password,email2:password2
// e.g. kevin@airalabs.io:hunter2,frankie@airalabs.io:securepass
function getAdminUsers(): Record<string, string> {
  const raw = process.env.ADMIN_USERS ?? "";
  return Object.fromEntries(
    raw.split(",")
      .map((entry) => entry.trim().split(":"))
      .filter((parts) => parts.length === 2)
      .map(([email, password]) => [email.trim().toLowerCase(), password.trim()])
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string ?? "").toLowerCase().trim();
        const password = credentials?.password as string ?? "";
        const admins = getAdminUsers();

        if (!email || !password) return null;
        if (admins[email] !== password) return null;

        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
