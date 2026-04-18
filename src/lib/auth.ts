import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const expected = process.env.ADMIN_PASSWORD;
        if (!expected) return null;
        if (credentials?.password === expected) {
          return { id: 'admin', name: 'Admin', email: 'admin@beaudawson.com' };
        }
        return null;
      },
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = Boolean(token?.isAdmin);
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = true;
      }
      return token;
    },
  },

  pages: {
    signIn: '/system-logs/login',
    error: '/system-logs/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};

declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAdmin?: boolean;
  }
}
