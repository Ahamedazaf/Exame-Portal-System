// src/app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { query, queryOne } from '@/lib/db';
import { signToken } from '@/lib/jwt';

const isGoogleConfigured = (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'YOUR_GOOGLE_CLIENT_SECRET_HERE'
);

const handler = NextAuth({
  providers: isGoogleConfigured ? [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ] : [],
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;
      try {
        // Check if user is pre-registered in our DB
        const dbUser = await queryOne('SELECT * FROM users WHERE email = ?', [user.email]);

        if (!dbUser) {
          // NOT registered → redirect to register page with google email
          // We return a special error to indicate "not registered"
          return `/register?googleEmail=${encodeURIComponent(user.email)}&googleName=${encodeURIComponent(user.name || '')}&error=not_registered`;
        }

        // Link Google account if not linked yet
        if (!dbUser.google_id) {
          await query('UPDATE users SET google_id = ?, auth_provider = "google" WHERE id = ?',
            [user.id, dbUser.id]);
        }

        if (dbUser.status === 'blocked') return false;
        return true;
      } catch (e) {
        console.error('[Google SignIn]', e.message);
        return false;
      }
    },

    async jwt({ token, account }) {
      if (account?.provider === 'google' && token.email) {
        try {
          const dbUser = await queryOne('SELECT * FROM users WHERE email = ?', [token.email]);
          if (dbUser) {
            token.dbUser = {
              id:             dbUser.id,
              name:           dbUser.name,
              email:          dbUser.email,
              role:           dbUser.role,
              classId:        dbUser.class_id,
              approvalStatus: dbUser.approval_status,
              authProvider:   'google',
            };
            token.appToken = signToken({
              id: dbUser.id, name: dbUser.name, email: dbUser.email,
              role: dbUser.role, classId: dbUser.class_id,
            });
          }
        } catch (e) { console.error('[JWT]', e.message); }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.dbUser)   session.user     = token.dbUser;
      if (token.appToken) session.appToken = token.appToken;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
});

export { handler as GET, handler as POST };
