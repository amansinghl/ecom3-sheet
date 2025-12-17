'use client';

import { useState } from 'react';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings, Sparkles, Shield, Eye, Sun, Moon, Monitor, Check, PartyPopper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getRandomAvatar } from '@/lib/config/user-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Marquee } from '@/components/ui/marquee';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [isHovering, setIsHovering] = useState(false);
  const { theme, setTheme } = useTheme();

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
  const avatarPath = user ? getRandomAvatar(user.email || user.name) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Marquee Announcement */}
      <div className="h-8 bg-primary/10 dark:bg-primary/20 border-b border-border/60 overflow-hidden">
        <Marquee pauseOnHover className="h-full">
          <div className="flex items-center gap-3 px-6 text-sm font-semibold text-foreground whitespace-nowrap">
            <PartyPopper className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              🎉 Celebrating Launch!🚀 Rahul ji is treating everyone to a Pizza Party! 🍕 -- Requested by Tech Team. 
            </span>
          </div>
        </Marquee>
      </div>
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
          {user && (
            <>
              {/* User Menu */}
              <div 
                className="relative"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        {avatarPath && (
                          <AvatarImage src={avatarPath} alt={user.name || 'User'} />
                        )}
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
                  
                  {/* Enlarged Avatar on Hover */}
                  <AnimatePresence>
                    {isHovering && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-12 z-[60]"
                      >
                        <div className="relative bg-background border-2 border-border rounded-lg shadow-2xl p-3">
                          <div className="absolute -top-2 right-4 w-4 h-4 bg-background border-l-2 border-t-2 border-border rotate-45"></div>
                          <Avatar className="h-32 w-32 ring-4 ring-primary/20 shadow-lg">
                            {avatarPath && (
                              <AvatarImage src={avatarPath} alt={user.name || 'User'} className="object-cover" />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-bold text-3xl">
                              {user.name
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="mt-2 text-center">
                            <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                        {avatarPath && (
                          <AvatarImage src={avatarPath} alt={user.name || 'User'} />
                        )}
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
                  <div className="px-2 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                      Theme
                    </p>
                    <div className="flex gap-1 p-1 bg-muted rounded-md">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          theme === 'light'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        <Sun className="h-3.5 w-3.5" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        <Moon className="h-3.5 w-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          theme === 'system' || !theme
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-2" />
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
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
