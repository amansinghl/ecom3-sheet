'use client';

import { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { Plus, Search, Filter, Download, Upload, Trash2, Copy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRow: () => void;
  onDeleteRows: () => void;
  onOpenFilter: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onAddRow,
  onDeleteRows,
  onOpenFilter,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      icon: Plus,
      label: 'Add new row',
      shortcut: `${mod}+Enter`,
      onSelect: () => {
        onAddRow();
        onClose();
      },
    },
    {
      icon: Filter,
      label: 'Open filters',
      shortcut: '',
      onSelect: () => {
        onOpenFilter();
        onClose();
      },
    },
    {
      icon: Trash2,
      label: 'Delete selected rows',
      shortcut: 'Del',
      onSelect: () => {
        onDeleteRows();
        onClose();
      },
    },
    {
      icon: Download,
      label: 'Export data',
      shortcut: '',
      onSelect: () => {
        // TODO: Implement export
        onClose();
      },
    },
    {
      icon: Upload,
      label: 'Import data',
      shortcut: '',
      onSelect: () => {
        // TODO: Implement import
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4 bg-black/50 animate-in fade-in duration-200">
      <Command
        className="w-full max-w-2xl rounded-lg border bg-popover shadow-lg animate-in zoom-in-95 slide-in-from-top-2 duration-200"
        shouldFilter={true}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          <Command.Group heading="Actions">
            {commands.map((command, index) => {
              const Icon = command.icon;
              return (
                <Command.Item
                  key={index}
                  value={command.label}
                  onSelect={command.onSelect}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1">{command.label}</span>
                  {command.shortcut && (
                    <span className="text-xs text-muted-foreground">{command.shortcut}</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
