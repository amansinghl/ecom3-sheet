'use client';

import { useEffect, useRef } from 'react';
import { Copy, Trash2, Files } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RowContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function RowContextMenu({
  x,
  y,
  onDuplicate,
  onCopy,
  onDelete,
  onClose,
}: RowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
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
      label: 'Duplicate row',
      onClick: () => {
        onDuplicate();
        onClose();
      },
    },
    {
      icon: Copy,
      label: 'Copy row',
      onClick: () => {
        onCopy();
        onClose();
      },
    },
    {
      icon: Trash2,
      label: 'Delete row',
      onClick: () => {
        onDelete();
        onClose();
      },
      className: 'text-destructive hover:text-destructive',
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={cn(
              'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
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
}
