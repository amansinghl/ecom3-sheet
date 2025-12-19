'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { cn } from '@/lib/utils';
import { highlightText } from './cell-utils';
import { Check, ChevronDown, X } from 'lucide-react';

interface DropdownCellProps {
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

export function DropdownCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  globalSearch = '',
  onEdit,
  onSave,
  onCancel,
}: DropdownCellProps) {
  const isMultiselect = columnConfig.type === 'multiselect';
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = columnConfig.options || [];

  // Parse value for multiselect (array) or single (string)
  const currentValues = useMemo(() => {
    if (isMultiselect) {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value) return value.split(',').map(v => v.trim());
      return [];
    }
    return value ? [value] : [];
  }, [value, isMultiselect]);

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
      setSelectedValues(currentValues);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isEditing, currentValues]);

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

  const getLabel = (val: string) => {
    const option = options.find((opt) => opt.value === val);
    return option?.label || val || '';
  };

  const getDisplayLabel = () => {
    if (isMultiselect) {
      if (currentValues.length === 0) return '';
      if (currentValues.length === 1) return getLabel(currentValues[0]);
      return `${currentValues.length} selected`;
    }
    return getLabel(value);
  };

  const handleSelect = (selectedValue: string) => {
    if (isMultiselect) {
      setSelectedValues(prev => {
        if (prev.includes(selectedValue)) {
          return prev.filter(v => v !== selectedValue);
        }
        return [...prev, selectedValue];
      });
      setSearchText('');
      inputRef.current?.focus();
    } else {
      onSave(selectedValue);
    }
  };

  const handleConfirmMultiselect = () => {
    onSave(selectedValues);
  };

  const handleBlurWithAutoMatch = () => {
    if (isMultiselect) {
      // For multiselect, try to add matching option then confirm
      const match = findExactMatch(searchText);
      if (match && !selectedValues.includes(match.value)) {
        onSave([...selectedValues, match.value]);
      } else {
        handleConfirmMultiselect();
      }
    } else {
      // For single select, auto-match if text matches an option
      const match = findExactMatch(searchText);
      if (match) {
        onSave(match.value);
      } else if (filteredOptions.length === 1) {
        // If only one option matches, select it
        onSave(filteredOptions[0].value);
      } else {
        onCancel();
      }
    }
  };

  const handleRemoveTag = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValues(prev => prev.filter(v => v !== valueToRemove));
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
      case 'Backspace':
        if (isMultiselect && searchText === '' && selectedValues.length > 0) {
          setSelectedValues(prev => prev.slice(0, -1));
        }
        break;
    }
  };

  const label = getDisplayLabel();
  const highlightedLabel = !isEditing && globalSearch.trim()
    ? highlightText(label, globalSearch.trim())
    : label;

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {/* Compact input with tags for multiselect */}
        <div className="flex items-center h-full gap-0.5 px-1 bg-white">
          {/* Selected tags for multiselect */}
          {isMultiselect && selectedValues.slice(0, 2).map(val => (
            <span 
              key={val}
              className="inline-flex items-center gap-0.5 px-1 bg-primary/10 text-primary text-[10px] rounded shrink-0"
            >
              {getLabel(val).slice(0, 8)}
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-primary/70" 
                onClick={(e) => handleRemoveTag(val, e)}
              />
            </span>
          ))}
          {isMultiselect && selectedValues.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{selectedValues.length - 2}</span>
          )}
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
              if (!relatedTarget?.closest('.dropdown-portal')) {
                setTimeout(handleBlurWithAutoMatch, 150);
              }
            }}
            placeholder={isMultiselect && selectedValues.length > 0 ? '' : 'Type...'}
            className="flex-1 min-w-[40px] h-full px-0.5 text-xs text-gray-900 bg-transparent outline-none border-none"
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
            className="dropdown-portal fixed bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-auto"
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
                const isSelected = isMultiselect 
                  ? selectedValues.includes(option.value)
                  : option.value === value;
                
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
                      isSelected && 'font-semibold text-primary'
                    )}
                  >
                    {isMultiselect ? (
                      <div className={cn(
                        'w-3 h-3 border rounded-sm flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                      )}>
                        {isSelected && <Check className="w-2 h-2 text-white" />}
                      </div>
                    ) : (
                      <Check 
                        className={cn(
                          'w-3 h-3 shrink-0',
                          isSelected ? 'opacity-100 text-blue-600' : 'opacity-0'
                        )} 
                      />
                    )}
                    <span className="truncate">
                      {searchText.trim() 
                        ? highlightText(option.label, searchText.trim())
                        : option.label
                      }
                    </span>
                  </div>
                );
              })
            )}
            
            {/* Compact confirm button for multiselect */}
            {isMultiselect && selectedValues.length > 0 && (
              <div className="border-t border-gray-100 p-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleConfirmMultiselect();
                  }}
                  className="w-full px-2 py-0.5 text-[11px] bg-primary text-white rounded hover:bg-primary/90"
                >
                  Done ({selectedValues.length})
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Display mode
  if (isMultiselect && currentValues.length > 0) {
    return (
      <div
        className={cn(
          'h-full w-full px-2 py-1 text-sm flex items-center gap-1 flex-wrap overflow-hidden',
          canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
        )}
        onClick={canEdit ? onEdit : undefined}
      >
        {currentValues.slice(0, 2).map(val => (
          <span 
            key={val}
            className="inline-flex items-center px-1.5 py-0.5 bg-muted text-foreground text-xs rounded truncate max-w-[100px]"
          >
            {getLabel(val)}
          </span>
        ))}
        {currentValues.length > 2 && (
          <span className="text-xs text-muted-foreground">
            +{currentValues.length - 2}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full px-3 py-2 text-sm truncate text-gray-900 font-semibold',
        canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {highlightedLabel}
    </div>
  );
}
