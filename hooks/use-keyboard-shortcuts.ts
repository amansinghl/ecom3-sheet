import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onCommandPalette?: () => void;
  onNewRow?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onCommandPalette,
    onNewRow,
    onSearch,
    onEscape,
    onDelete,
  } = config;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Don't trigger shortcuts when typing in inputs (except escape)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape - always works
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Don't trigger other shortcuts when in input fields
      if (isInput && event.key !== 'Escape') {
        // Allow Cmd/Ctrl+K even in inputs for command palette
        if (modifier && event.key === 'k' && onCommandPalette) {
          event.preventDefault();
          onCommandPalette();
          return;
        }
        return;
      }

      // Command Palette: Cmd/Ctrl+K
      if (modifier && event.key === 'k' && onCommandPalette) {
        event.preventDefault();
        onCommandPalette();
        return;
      }

      // New Row: Cmd/Ctrl+Enter
      if (modifier && event.key === 'Enter' && onNewRow) {
        event.preventDefault();
        onNewRow();
        return;
      }

      // Search: Cmd/Ctrl+F
      if (modifier && event.key === 'f' && onSearch) {
        event.preventDefault();
        onSearch();
        return;
      }

      // Delete: Backspace or Delete (when not in input)
      if ((event.key === 'Backspace' || event.key === 'Delete') && onDelete) {
        event.preventDefault();
        onDelete();
        return;
      }
    },
    [onCommandPalette, onNewRow, onSearch, onEscape, onDelete]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
