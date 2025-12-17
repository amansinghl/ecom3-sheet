'use client';

import { cn } from '@/lib/utils';

interface MarqueeProps {
  className?: string;
  children: React.ReactNode;
  pauseOnHover?: boolean;
}

export function Marquee({ className, children, pauseOnHover = true }: MarqueeProps) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden [--duration:40s] [--gap:1rem] [gap:var(--gap)]',
        className
      )}
    >
      <div
        className={cn(
          'flex shrink-0 justify-around [gap:var(--gap)]',
          'animate-marquee group-hover:[animation-play-state:paused]'
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'flex shrink-0 justify-around [gap:var(--gap)]',
          'animate-marquee group-hover:[animation-play-state:paused]'
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

