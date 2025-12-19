'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Trash2, Files } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RowContextMenuProps {
  x: number;
  y: number;
  selectedCount?: number; // Number of selected rows (for bulk actions)
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function RowContextMenu({
  x,
  y,
  selectedCount = 1,
  onDuplicate,
  onCopy,
  onDelete,
  onClose,
}: RowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isBulk = selectedCount > 1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Small delay to avoid immediate close from the same right-click event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 10);
    
    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menu = menuRef.current;
      
      if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
      }
      
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    {
      icon: Files,
      label: isBulk ? `Duplicate ${selectedCount} rows` : 'Duplicate row',
      onClick: () => {
        onDuplicate();
        onClose();
      },
    },
    {
      icon: Copy,
      label: isBulk ? `Copy ${selectedCount} rows` : 'Copy row',
      onClick: () => {
        onCopy();
        onClose();
      },
    },
    {
      icon: Trash2,
      label: isBulk ? `Delete ${selectedCount} rows` : 'Delete row',
      onClick: () => {
        onDelete();
        onClose();
      },
      className: 'text-destructive hover:text-destructive',
    },
  ];

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed min-w-[180px] rounded-md border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 select-text"
      style={{ left: x, top: y, zIndex: 9999 }}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={cn(
              'relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
              item.className
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Render using portal to escape the select-none container
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return menuContent;
}
