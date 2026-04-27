'use client';

import { useState, useMemo } from 'react';
import { UserView } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CircleDot,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Star,
  Lock,
  LayoutGrid,
  User,
  Inbox,
  Archive,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Icon map for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CircleDot,
  CheckCircle2,
  Star,
  LayoutGrid,
  User,
  Inbox,
  Archive,
};

interface ViewsSidebarProps {
  views: UserView[];
  activeViewId: string;
  defaultViewId?: string | null;
  onViewChange: (viewId: string) => void;
  onCreateView: () => void;
  onEditView: (view: UserView) => void;
  onDuplicateView: (viewId: string) => void;
  onDeleteView: (viewId: string) => void;
  onSetDefaultView: (viewId: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function ViewsSidebar({
  views,
  activeViewId,
  defaultViewId,
  onViewChange,
  onCreateView,
  onEditView,
  onDuplicateView,
  onDeleteView,
  onSetDefaultView,
  mobileOpen = false,
  onMobileOpenChange,
}: ViewsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isMobile = useIsMobile();

  // Separate system views from user views
  const { systemViews, userViews } = useMemo(() => {
    return {
      systemViews: views.filter(v => v.isSystem),
      userViews: views.filter(v => !v.isSystem),
    };
  }, [views]);

  if (views.length === 0) {
    return null;
  }

  const renderViewItem = (view: UserView, showMenu: boolean = true) => {
    const isActive = activeViewId === view.id;
    const isDefault = defaultViewId === view.id || view.isDefault;
    const IconComponent = view.icon ? iconMap[view.icon] : LayoutGrid;

    return (
      <div
        key={view.id}
        className={cn(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onViewChange(view.id)}
      >
        {/* Icon */}
        <div 
          className={cn(
            'flex h-4 w-4 items-center justify-center shrink-0',
            isActive && 'text-primary'
          )}
          style={{ color: isActive ? view.color : undefined }}
        >
          {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
        </div>

        {/* Name */}
        <span className="flex-1 truncate text-[13px]">{view.name}</span>

        {/* Default indicator */}
        {isDefault && (
          <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
        )}

        {/* System lock indicator */}
        {view.isSystem && (
          <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}

        {/* Actions menu (only for non-system views or when showMenu is true) */}
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                  isActive && 'opacity-100'
                )}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {!view.isSystem && (
                <DropdownMenuItem onClick={() => onEditView(view)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicateView(view.id)}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              {!isDefault && (
                <DropdownMenuItem onClick={() => onSetDefaultView(view.id)}>
                  <Star className="mr-2 h-3.5 w-3.5" />
                  Set as Default
                </DropdownMenuItem>
              )}
              {!view.isSystem && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeleteView(view.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const expandedContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Views
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCreateView}
          title="Create new view"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Views List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {systemViews.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              System
            </div>
            <div className="space-y-0.5">
              {systemViews.map((view) => renderViewItem(view, true))}
            </div>
          </div>
        )}

        {userViews.length > 0 && (
          <div>
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              My Views
            </div>
            <div className="space-y-0.5">
              {userViews.map((view) => renderViewItem(view))}
            </div>
          </div>
        )}

        {userViews.length === 0 && systemViews.length > 0 && (
          <div className="mt-2 px-2">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              My Views
            </div>
            <p className="text-xs text-muted-foreground/60 px-2 py-2">
              No custom views yet. Click + to create one.
            </p>
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Views</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col pt-2">{expandedContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-muted/5 transition-all duration-300',
        isCollapsed ? 'w-8' : 'w-56'
      )}
    >
      {/* Collapsed View - Icon Strip */}
      {isCollapsed && (
        <div className="flex h-full flex-col items-center py-2">
          {/* Expand Button at top */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-6 w-6 mb-2 hover:bg-muted"
            title="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          
          {/* View icons */}
          <div className="flex flex-col items-center gap-1 mt-1">
            {views.slice(0, 5).map((view) => {
              const isActive = activeViewId === view.id;
              const IconComponent = view.icon ? iconMap[view.icon] : LayoutGrid;
              
              return (
                <button
                  key={view.id}
                  onClick={() => onViewChange(view.id)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={view.name}
                  style={{ color: isActive ? view.color : undefined }}
                >
                  {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                </button>
              );
            })}
            {views.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{views.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Collapse Button (when expanded) */}
      {!isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="absolute -right-4 top-4 z-10 h-8 w-8 rounded-full border bg-background shadow-sm hover:bg-muted transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Sidebar Content (when expanded) */}
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden transition-opacity duration-300',
          isCollapsed ? 'hidden' : 'opacity-100'
        )}
      >
        {expandedContent}
      </div>
    </div>
  );
}
