'use client';

import { useState, useEffect } from 'react';
import { ColumnConfig, StatusOption } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface StatusCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function StatusCell({
  value,
  columnConfig,
  isEditing,
  canEdit,
  rowHeight,
  onEdit,
  onSave,
  onCancel,
}: StatusCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const options = (columnConfig.options || []) as StatusOption[];
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  
  // Check if this is a user/person field (like vamashipper)
  const isUserField = columnConfig.id === 'vamashipper';
  
  // Avatar size based on row height
  const avatarSize = rowHeight === 'compact' ? 'h-4 w-4' : rowHeight === 'spacious' ? 'h-7 w-7' : 'h-5 w-5';
  const avatarTextSize = rowHeight === 'compact' ? 'text-[8px]' : 'text-[10px]';

  // Reset edit value when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditValue(value || '');
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isEditing, value]);

  const getOption = (val: string): StatusOption | undefined => {
    return options.find((opt) => opt.value === val);
  };

  const currentOption = getOption(value);
  
  // Get fun emoji avatar for user
  const getFunkyAvatar = (optionValue: string, name: string) => {
    const funkyChars: { [key: string]: string } = {
      'kamal': '👻',      // Ghost
      'rahul': '🐉',      // Dragon
      'priya': '🐱',      // Cat
      'amit': '🐕',       // Dog
      'sneha': '👽',      // Alien
      'vikram': '🐋',     // Whale
    };
    
    // Fallback fun characters if not mapped
    const fallbackChars = ['🦊', '🦁', '🐼', '🐸', '🦉', '🐧', '🦈', '🦇', '🦩', '🦘', '🦝', '🦦', '🐨', '🐯'];
    const charIndex = optionValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackChars.length;
    
    return funkyChars[optionValue.toLowerCase()] || fallbackChars[charIndex];
  };

  if (isEditing) {
    return (
      <div className="p-1">
        <Select
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              // Close without selection - cancel edit
              onCancel();
            }
          }}
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val);
            setOpen(false);
            onSave(val);
          }}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="Select status..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {isUserField ? (
                    <Avatar className={avatarSize}>
                      <AvatarFallback 
                        className={cn(avatarTextSize, 'font-medium text-white')}
                        style={{ backgroundColor: option.color }}
                      >
                        {getFunkyAvatar(option.value, option.label)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full flex items-center',
        paddingClass,
        canEdit && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {currentOption && (
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
              {currentOption.label}
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
      )}
    </div>
  );
}
