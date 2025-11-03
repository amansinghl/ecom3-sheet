'use client';

import { useState } from 'react';
import { ViewConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewsSidebarProps {
  views: ViewConfig[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
}

export function ViewsSidebar({ views, activeViewId, onViewChange }: ViewsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (views.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-muted/10 transition-all duration-300',
        isCollapsed ? 'w-0' : 'w-64'
      )}
    >
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-4 top-6 z-10 h-10 w-10 rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-110 transition-all',
          isCollapsed && 'right-[-20px]'
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden transition-opacity duration-300',
          isCollapsed ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">Views</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Filter data by predefined views
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                  activeViewId === view.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'hover:bg-muted/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    activeViewId === view.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/25'
                  )}
                >
                  {activeViewId === view.id && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate">{view.name}</div>
                  {view.description && (
                    <div className="truncate text-xs text-muted-foreground">
                      {view.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

