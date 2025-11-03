import NextAuth, { User as NextAuthUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { User } from '@/types';

// Mock users for demo - replace with actual API calls
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: '2',
    email: 'editor@example.com',
    name: 'Editor User',
    role: 'editor',
  },
  {
    id: '3',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'viewer',
  },
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        // Mock authentication - replace with actual API call
        const user = mockUsers.find(
          (u) => u.email === credentials.email
        );

        // For demo: password is "password" for all users
        if (user && credentials.password === 'password') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          } as NextAuthUser;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true, // Trust proxy headers (required for ngrok)
});
