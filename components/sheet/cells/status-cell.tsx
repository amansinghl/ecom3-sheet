'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { ColumnConfig, StatusOption } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';
import { Check, ChevronDown } from 'lucide-react';

interface StatusCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  globalSearch?: string;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export const StatusCell = memo(function StatusCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  globalSearch = '',
  onEdit,
  onSave,
  onCancel,
}: StatusCellProps) {
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const options = (columnConfig.options || []) as StatusOption[];
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  
  // Check if this is a user/person field (like vamashipper)
  const isUserField = columnConfig.id === 'vamashipper';
  
  // Avatar size based on row height
  const avatarSize = rowHeight === 'compact' ? 'h-4 w-4' : rowHeight === 'spacious' ? 'h-7 w-7' : 'h-5 w-5';
  const avatarTextSize = rowHeight === 'compact' ? 'text-[8px]' : 'text-[10px]';

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const search = searchText.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search) ||
      opt.value.toLowerCase().includes(search)
    );
  }, [options, searchText]);

  // Find exact match (case-insensitive)
  const findExactMatch = (text: string) => {
    const search = text.toLowerCase().trim();
    if (!search) return null;
    return options.find(opt => 
      opt.label.toLowerCase() === search ||
      opt.value.toLowerCase() === search
    );
  };

  // Calculate dropdown position
  useEffect(() => {
    if (isEditing && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isEditing]);

  // Reset state when editing starts
  useEffect(() => {
    if (isEditing) {
      setSearchText('');
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isEditing]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isEditing && listRef.current) {
      const highlightedItem = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isEditing]);

  const getOption = (val: string): StatusOption | undefined => {
    return options.find((opt) => opt.value === val);
  };

  const currentOption = getOption(value);
  const highlightedLabel = !isEditing && currentOption && globalSearch.trim()
    ? highlightText(currentOption.label, globalSearch.trim())
    : currentOption?.label;
  
  // Get fun emoji avatar for user
  const getFunkyAvatar = (optionValue: string, name: string) => {
    const funkyChars: { [key: string]: string } = {
      'kamal': '👻',
      'rahul': '🐉',
      'priya': '🐱',
      'amit': '🐕',
      'sneha': '👽',
      'vikram': '🐋',
    };
    
    const fallbackChars = ['🦊', '🦁', '🐼', '🐸', '🦉', '🐧', '🦈', '🦇', '🦩', '🦘', '🦝', '🦦', '🐨', '🐯'];
    const charIndex = optionValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackChars.length;
    
    return funkyChars[optionValue.toLowerCase()] || fallbackChars[charIndex];
  };

  const handleSelect = (selectedValue: string) => {
    onSave(selectedValue);
  };

  const handleBlurWithAutoMatch = () => {
    const match = findExactMatch(searchText);
    if (match) {
      onSave(match.value);
    } else if (filteredOptions.length === 1) {
      onSave(filteredOptions[0].value);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else {
          handleBlurWithAutoMatch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onCancel();
        break;
      case 'Tab':
        handleBlurWithAutoMatch();
        break;
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {/* Compact input */}
        <div className="flex items-center h-full gap-0.5 px-1 bg-white">
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.focus();
            }}
            onFocus={(e) => e.stopPropagation()}
            onBlur={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget?.closest('.status-dropdown-portal')) {
                setTimeout(handleBlurWithAutoMatch, 150);
              }
            }}
            placeholder={currentOption?.label || 'Type...'}
            className="flex-1 min-w-[40px] h-full px-0.5 text-xs text-gray-900 bg-transparent outline-none border-none select-text"
            style={{ color: '#111827' }}
            autoComplete="off"
            autoFocus
          />
          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
        </div>
        
        {/* Portal dropdown - renders outside the table cell */}
        {typeof document !== 'undefined' && createPortal(
          <div 
            ref={listRef}
            className="status-dropdown-portal fixed bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-auto"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: Math.max(dropdownPos.width, 120),
              zIndex: 9999,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-gray-500">
                No matches
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                
                return (
                  <div
                    key={option.value}
                    data-index={index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option.value);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 text-xs font-medium cursor-pointer',
                      index === highlightedIndex && 'bg-blue-50',
                      isSelected && 'font-semibold'
                    )}
                  >
                    {isUserField ? (
                      <span className="text-xs">{getFunkyAvatar(option.value, option.label)}</span>
                    ) : (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate" style={{ color: option.color }}>
                      {searchText.trim() 
                        ? highlightText(option.label, searchText.trim())
                        : option.label
                      }
                    </span>
                    {isSelected && (
                      <Check className="w-3 h-3 ml-auto shrink-0 text-blue-600" />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full flex items-center',
        paddingClass,
        canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {currentOption ? (
        isUserField ? (
          // User field with avatar
          <div className="flex items-center gap-1.5">
            <Avatar className={avatarSize}>
              <AvatarFallback 
                className={cn(avatarTextSize, 'font-medium text-white')}
                style={{ backgroundColor: currentOption.color }}
              >
                {getFunkyAvatar(currentOption.value, currentOption.label)}
              </AvatarFallback>
            </Avatar>
            <Badge
              variant="secondary"
              className={cn('font-medium', textSizeClass)}
              style={{
                backgroundColor: `${currentOption.color}20`,
                color: currentOption.color,
                borderColor: currentOption.color,
              }}
            >
              {highlightedLabel}
            </Badge>
          </div>
        ) : (
          // Regular status badge
          <Badge
            variant="secondary"
            className={cn('font-medium', textSizeClass)}
            style={{
              backgroundColor: `${currentOption.color}20`,
              color: currentOption.color,
              borderColor: currentOption.color,
            }}
          >
            {currentOption.label}
          </Badge>
        )
      ) : value ? (
        // Fallback: Display raw value as plain text if it doesn't match any option
        <span className={cn('text-gray-700 truncate', textSizeClass)}>
          {typeof value === 'string' ? value : String(value)}
        </span>
      ) : null}
    </div>
  );
});
