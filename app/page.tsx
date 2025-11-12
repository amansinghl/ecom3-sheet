'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/theme-toggle';

function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tokenLoading, setTokenLoading] = useState(false);

  const handleTokenLogin = useCallback(async (token: string, role: string, name: string, email: string) => {
    setTokenLoading(true);
    try {
      const result = await signIn('token', {
        token,
        role,
        name,
        email,
        redirect: false,
      });

      if (result?.error) {
        console.error('Token authentication failed:', result.error);
        // Stay on landing page if auth fails
        setTokenLoading(false);
      } else if (result?.ok) {
        // Successfully authenticated, redirect to sheets
        router.push('/sheets/escalations');
        router.refresh();
      }
    } catch (error) {
      console.error('Token login error:', error);
      setTokenLoading(false);
    }
  }, [router]);

  // Check for ERP token-based login
  useEffect(() => {
    const token = searchParams.get('token');
    const loginViaErp = searchParams.get('login_via_erp');
    const role = searchParams.get('role');
    const name = searchParams.get('name');
    const email = searchParams.get('email');

    if (token && loginViaErp === 'true') {
      handleTokenLogin(
        token, 
        role || 'viewer',
        name || '',
        email || ''
      );
    }
  }, [searchParams, handleTokenLogin]);

  // Show loading state while processing token
  if (tokenLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6 overflow-hidden">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6 overflow-hidden">
      {/* Background lines pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Welcome to Sheet Manager
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Your powerful tool for managing and organizing data sheets
          </p>
        </div>
        
        <div className="pt-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Access your sheets through the ERP system
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-background p-6 overflow-hidden">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
