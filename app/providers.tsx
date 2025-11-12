'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api/client';

// Create context for session status
interface SessionContextType {
  isSessionLoading: boolean;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType>({
  isSessionLoading: true,
  isAuthenticated: false,
});

export const useSessionContext = () => useContext(SessionContext);

// Component to set API client token from session and handle token expiration
function ApiTokenInitializer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tokenSet, setTokenSet] = useState(false);

  useEffect(() => {
    // Only set token when session is loaded (not loading)
    if (status === 'authenticated' || status === 'unauthenticated') {
      // Set the token on the API client when session is available
      const token = (session as any)?.sheet_token || null;
      apiClient.setToken(token);
      setTokenSet(true);
    }
  }, [session, status]);

  useEffect(() => {
    // Set up token expiration handler (only once)
    apiClient.setOnTokenExpired(() => {
      toast.error('Your session has expired. Please log in again.', {
        duration: 5000,
      });
      
      // Sign out and redirect to landing page
      signOut({ redirect: false }).then(() => {
        router.push('/');
        router.refresh();
      });
    });
  }, [router]);

  // Don't render children until session is loaded AND token is set
  if (status === 'loading' || !tokenSet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{
        isSessionLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ApiTokenInitializer>
            {children}
          </ApiTokenInitializer>
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'bg-background border',
                error: 'bg-destructive text-destructive-foreground border-destructive',
                success: 'bg-green-600 text-white border-green-700 dark:bg-green-700 dark:border-green-800',
                info: 'bg-blue-600 text-white border-blue-700 dark:bg-blue-700 dark:border-blue-800',
                warning: 'bg-yellow-600 text-white border-yellow-700 dark:bg-yellow-700 dark:border-yellow-800',
                loading: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-700',
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
