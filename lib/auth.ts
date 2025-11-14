import NextAuth, { User as NextAuthUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { UserRole } from '@/types';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: 'token',
      name: 'Token',
      credentials: {
        token: { label: 'Token', type: 'text' },
        role: { label: 'Role', type: 'text' },
        name: { label: 'Name', type: 'text' },
        email: { label: 'Email', type: 'email' },
      },
      authorize: async (credentials) => {
        if (!credentials?.token) {
          return null;
        }

        try {
          const token = credentials.token as string;
          const role = (credentials.role as string) || 'viewer';
          const name = (credentials.name as string) || 'User';
          const email = (credentials.email as string) || '';
          
          // Validate role
          const validRoles: UserRole[] = ['admin', 'editor', 'viewer'];
          const userRole = validRoles.includes(role as UserRole) ? (role as UserRole) : 'viewer';
          
          // TODO: Replace with actual token validation logic
          // This is a placeholder - you should validate the token against your ERP system
          // In production, decode JWT or call ERP API to validate token
          
          // If token is valid, create user object with data from URL
          if (token && token.length > 0) {
            // Generate a user ID from email if available, otherwise from token
            const userId = email 
              ? email.split('@')[0] || `user_${token.substring(0, 8)}`
              : `user_${token.substring(0, 8)}`;
            
            return {
              id: userId,
              email: email || `${userId}@erp.local`,
              name: name || `User (${userRole})`,
              role: userRole,
              token: token, // Store token for JWT callback
            } as NextAuthUser & { token: string };
          }

          return null;
        } catch (error) {
          console.error('Token validation error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        // Store user details in token
        token.name = user.name;
        token.email = user.email;
        // Store the original token in the JWT for API calls
        // The token is passed during signIn, we need to extract it from the user object
        if ((user as any).token) {
          token.sheet_token = (user as any).token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
        // Ensure name and email are set from token
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        // Make the token available in session for API calls
        (session as any).sheet_token = token.sheet_token;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true, // Trust proxy headers (required for ngrok)
});
