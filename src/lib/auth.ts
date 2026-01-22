import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isEmailWhitelisted } from './supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      // Check if user's email is in the whitelist
      if (!user.email) {
        return false;
      }

      const isWhitelisted = await isEmailWhitelisted(user.email);

      // Allow sign in but we'll check whitelist again in session callback
      // This allows the sign-in to complete so we can show ACCESS_DENIED page
      return true;
    },

    async session({ session }) {
      // Add whitelist status to session
      if (session.user?.email) {
        const isWhitelisted = await isEmailWhitelisted(session.user.email);
        session.user.isAdmin = isWhitelisted;
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const isWhitelisted = await isEmailWhitelisted(user.email);
        token.isAdmin = isWhitelisted;
      }
      return token;
    },
  },

  pages: {
    signIn: '/system-logs/create', // Custom sign-in behavior
    error: '/system-logs', // Redirect to public blog on error
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// Type augmentation for custom session properties
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
