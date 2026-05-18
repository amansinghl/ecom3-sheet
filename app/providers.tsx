'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { signOut } from 'next-auth/react';
import { apiClient } from '@/lib/api/client';
import { LoadingState } from '@/components/ui/loading-state';
import { TooltipProvider } from '@/components/ui/tooltip';

// Create context for session status
interface SessionContextType {
  isSessionLoading: boolean;
  isAuthenticated: boolean;
  isSessionExpired: boolean;
}

const SessionContext = createContext<SessionContextType>({
  isSessionLoading: true,
  isAuthenticated: false,
  isSessionExpired: false,
});

export const useSessionContext = () => useContext(SessionContext);

// Component to set API client token from session and handle token expiration
function ApiTokenInitializer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const hasHandledTokenExpiryRef = useRef(false);

  // Sync token synchronously during render so it's set before child useEffects fire.
  // (useEffect on parent runs AFTER child effects — caused 401 -> forced signOut on refresh.)
  if (status !== 'loading') {
    const token = (session as { sheet_token?: string } | null)?.sheet_token ?? null;
    apiClient.setToken(token);
  }

  useEffect(() => {
    // Set up token expiration handler (only once)
    apiClient.setOnTokenExpired(() => {
      if (hasHandledTokenExpiryRef.current) return;
      hasHandledTokenExpiryRef.current = true;
      setIsSessionExpired(true);

      toast.error('Your session has expired. Please log in again.', {
        duration: 5000,
      });
      
      // Sign out and redirect to landing page
      setTimeout(() => {
        signOut({ redirect: false }).then(() => {
          router.push('/');
          router.refresh();
        });
      }, 1200);
    });
  }, [router]);

  // Don't render children until session is loaded.
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState 
          message="Setting up your session... 🎯"
          variant="fullscreen"
        />
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{
        isSessionLoading: false, // Status is never 'loading' at this point due to early return above
        isAuthenticated: status === 'authenticated',
        isSessionExpired,
      }}
    >
      {isSessionExpired && (
        <div className="sticky top-0 z-[120] border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive backdrop-blur-sm">
          Session expired or timed out. Redirecting to login...
        </div>
      )}
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
          <TooltipProvider delayDuration={300}>
            <ApiTokenInitializer>
              {children}
            </ApiTokenInitializer>
          </TooltipProvider>
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
