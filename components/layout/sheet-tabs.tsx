'use client';

import { useRouter, usePathname } from 'next/navigation';
import { sheets } from '@/lib/config/sheets';
import { cn } from '@/lib/utils';
import { AlertCircle, Users, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, any> = {
  AlertCircle: AlertCircle,
  Users: Users,
  Star: Star,
};

export function SheetTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const currentSheetId = pathname.split('/').pop();

  return (
    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-muted/30 px-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sheets.map((sheet) => {
        const Icon = sheet.icon ? iconMap[sheet.icon] : null;
        const isActive = currentSheetId === sheet.id;

        return (
          <button
            key={sheet.id}
            onClick={() => router.push(`/sheets/${sheet.id}`)}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{sheet.name}</span>
          </button>
        );
      })}

      {/* Placeholder for adding new sheets (admin only) */}
      {/* <Button
        variant="ghost"
        size="sm"
        className="ml-2 h-9 w-9 rounded-full p-0"
      >
        <Plus className="h-4 w-4" />
      </Button> */}
    </div>
  );
}
