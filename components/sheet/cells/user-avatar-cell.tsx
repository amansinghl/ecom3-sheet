'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ColumnConfig } from '@/types';
import { RowHeight } from '@/lib/store/sheet-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getCellTextSize, getCellPadding, highlightText } from './cell-utils';
import { getRandomAvatar } from '@/lib/config/user-avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface UserAvatarCellProps {
  value: any;
  columnConfig: ColumnConfig;
  isEditing: boolean;
  canEdit: boolean;
  rowHeight: RowHeight;
  rowData?: any;
  globalSearch?: string;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export const UserAvatarCell = memo(function UserAvatarCell({
  value,
  columnConfig,
  rowHeight,
  rowData,
  globalSearch = '',
}: UserAvatarCellProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const avatarRef = useRef<HTMLDivElement>(null);
  
  const textSizeClass = getCellTextSize(rowHeight);
  const paddingClass = getCellPadding(rowHeight);
  
  const avatarSize = rowHeight === 'compact' ? 'h-5 w-5' : rowHeight === 'spacious' ? 'h-8 w-8' : 'h-6 w-6';

  const displayValue = value || '';
  
  const avatarKey = columnConfig.id === 'vamashipper' && rowData?.last_modified_by
    ? rowData.last_modified_by
    : displayValue;
  
  const avatarPath = avatarKey ? getRandomAvatar(avatarKey) : null;
  
  const getInitials = (text: string) => {
    if (!text) return '?';
    
    const name = text.includes('@') ? text.split('@')[0] : text;
    
    const parts = name.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const getDisplayName = (text: string) => {
    if (!text) return '';
    if (text.includes('@')) {
      const namePart = text.split('@')[0];
      return namePart
        .split(/[._-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return text;
  };
  
  useEffect(() => {
    if (isHovering && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2 - 80,
      });
    }
  }, [isHovering]);
  
  const displayName = getDisplayName(displayValue);
  const emailDisplay = avatarKey !== displayValue ? avatarKey : (displayValue.includes('@') ? displayValue : null);
  const highlightedValue = globalSearch.trim() 
    ? highlightText(displayName, globalSearch.trim())
    : displayName;

  if (!displayValue) {
    return (
      <div
        className={cn(
          'h-full w-full flex items-center gap-2',
          textSizeClass,
          paddingClass,
          'cursor-not-allowed'
        )}
      >
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full w-full flex items-center gap-2',
        textSizeClass,
        paddingClass,
        'cursor-default'
      )}
    >
      <div
        ref={avatarRef}
        className="relative flex-shrink-0"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Avatar className={cn(avatarSize, 'ring-1 ring-border/50 shadow-sm cursor-pointer transition-transform hover:scale-110')}>
          {avatarPath && (
            <AvatarImage 
              src={avatarPath} 
              alt={displayName} 
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-purple-600/80 text-primary-foreground font-semibold text-[10px]">
            {getInitials(displayValue)}
          </AvatarFallback>
        </Avatar>
        
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {isHovering && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed z-[9999]"
                style={{ top: popupPosition.top, left: popupPosition.left }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div className="relative bg-background border-2 border-border rounded-lg shadow-2xl p-3">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-background border-l-2 border-t-2 border-border rotate-45"></div>
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-lg mx-auto">
                    {avatarPath && (
                      <AvatarImage src={avatarPath} alt={displayName} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-bold text-2xl">
                      {getInitials(displayValue)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                      {displayName}
                    </p>
                    {emailDisplay && (
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {emailDisplay}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
      <span className="truncate text-gray-900 font-medium">{highlightedValue}</span>
    </div>
  );
});

