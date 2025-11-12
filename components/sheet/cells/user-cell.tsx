'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ColumnConfig, DropdownOption } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { getCellTextSize, getCellPadding } from './cell-utils';

interface UserCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  onEdit: () => void;
  onSave: (value: any) => void;
}

export function UserCell({ value, columnConfig, isEditing, canEdit,
  rowHeight, onEdit, onSave }: UserCellProps) {
  const [editValue, setEditValue] = useState(value || '');
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  
  // Avatar size based on row height
  const avatarSize = rowHeight === 'compact' ? 'h-4 w-4' : rowHeight === 'spacious' ? 'h-7 w-7' : 'h-5 w-5';
  const emojiSize = rowHeight === 'compact' ? 'text-[10px]' : rowHeight === 'spacious' ? 'text-lg' : 'text-base';

  // Use options from column config (for configured users like vama shippers)
  // or fall back to mock users for other cases
  const users = columnConfig.options || [
    { label: 'Admin User', value: '1' },
    { label: 'Editor User', value: '2' },
    { label: 'Viewer User', value: '3' },
  ];

  const getUser = (userId: string) => {
    return users.find((u) => u.value === userId);
  };

  const currentUser = getUser(value);
  
  // Fun character mapping based on user value
  const getFunkyCharacter = (userValue: string, name: string) => {
    const funkyChars: { [key: string]: string } = {
      'kamal': '👻',      // Ghost
      'rahul': '🐉',      // Dragon
      'priya': '🐱',      // Cat
      'amit': '🐕',       // Dog
      'sneha': '👽',      // Alien
      'vikram': '🐋',     // Whale
      '1': '🦖',          // T-Rex (for default users)
      '2': '🦄',          // Unicorn
      '3': '🐙',          // Octopus
    };
    
    // Fallback fun characters if not mapped
    const fallbackChars = ['🦊', '🦁', '🐼', '🐸', '🦉', '🐧', '🦈', '🦇', '🦩', '🦘', '🦝', '🦦', '🐨', '🐯'];
    const charIndex = userValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackChars.length;
    
    return funkyChars[userValue.toLowerCase()] || fallbackChars[charIndex];
  };

  if (isEditing) {
    return (
      <div className="p-1">
        <Select
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val);
            onSave(val);
          }}
          defaultOpen
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="Assign user..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.value} value={user.value}>
                <div className="flex items-center gap-2">
                  <Avatar className={avatarSize}>
                    <AvatarFallback 
                      className={cn(emojiSize, 'font-semibold text-white')}
                      style={{ 
                        backgroundColor: (user as any).color || '#6b7280'
                      }}
                    >
                      {getFunkyCharacter(user.value, user.label)}
                    </AvatarFallback>
                  </Avatar>
                  {user.label}
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
        'h-full w-full flex items-center gap-1.5',
        paddingClass,
        canEdit ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {currentUser ? (
        <>
          <Avatar className={cn(avatarSize, rowHeight !== 'compact' && 'ring-2 ring-background shadow-sm')}>
            <AvatarFallback 
              className={cn(emojiSize, 'font-semibold text-white')}
              style={{ 
                backgroundColor: (currentUser as any).color || '#6b7280'
              }}
            >
              {getFunkyCharacter(currentUser.value, currentUser.label)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(textSizeClass, 'font-medium truncate')}>{currentUser.label}</span>
        </>
      ) : (
        <span className={cn(textSizeClass, 'text-muted-foreground')}>Unassigned</span>
      )}
    </div>
  );
}
