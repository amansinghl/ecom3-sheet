'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings, Sparkles, Shield, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          color: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm',
          icon: Shield,
          label: 'Admin',
        };
      case 'editor':
        return {
          color: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm',
          icon: Sparkles,
          label: 'Editor',
        };
      case 'viewer':
        return {
          color: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm',
          icon: Eye,
          label: 'Viewer',
        };
      default:
        return {
          color: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm',
          icon: Eye,
          label: role,
        };
    }
  };

  const roleConfig = user ? getRoleConfig(user.role) : null;
  const RoleIcon = roleConfig?.icon;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Logo Section */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-purple-600 text-primary-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-base font-semibold">
                Sheet Manager
              </h1>
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold text-xs">
                        {user.name
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-semibold">
                          {user.name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-none truncate">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {user.email}
                        </p>
                        {roleConfig && (
                          <Badge variant="secondary" className="w-fit text-xs mt-1">
                            {roleConfig.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem className="cursor-pointer rounded-md py-2.5">
                    <User className="mr-2 h-4 w-4" />
                    <span className="font-medium">Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-md py-2.5">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="font-medium">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="cursor-pointer rounded-md py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
