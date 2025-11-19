import { RowHeight } from '@/lib/store/sheet-store';
import React from 'react';

export function getCellTextSize(rowHeight: RowHeight): string {
  switch (rowHeight) {
    case 'compact':
      return 'text-xs';
    case 'spacious':
      return 'text-base';
    default:
      return 'text-sm';
  }
}

export function getCellPadding(rowHeight: RowHeight): string {
  switch (rowHeight) {
    case 'compact':
      return 'px-2 py-0.5';
    case 'spacious':
      return 'px-3 py-3';
    default:
      return 'px-3 py-2';
  }
}

/**
 * Highlights matching text in a string based on a search term.
 * Returns a React element with highlighted spans for matches.
 */
export function highlightText(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || !text) {
    return text || '';
  }

  const searchLower = searchTerm.toLowerCase();
  const textStr = String(text);
  const textLower = textStr.toLowerCase();
  
  // Find all matches (case-insensitive)
  const matches: Array<{ start: number; end: number }> = [];
  let startIndex = 0;
  
  while (startIndex < textLower.length) {
    const index = textLower.indexOf(searchLower, startIndex);
    if (index === -1) break;
    
    matches.push({ start: index, end: index + searchLower.length });
    startIndex = index + 1;
  }

  if (matches.length === 0) {
    return textStr;
  }

  // Build array of text parts with highlights
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push(textStr.substring(lastIndex, match.start));
    }
    
    // Add highlighted match using React.createElement (since this is a .ts file)
    parts.push(
      React.createElement(
        'mark',
        {
          key: `highlight-${match.start}-${index}`,
          className: 'bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5',
        },
        textStr.substring(match.start, match.end)
      )
    );
    
    lastIndex = match.end;
  });

  // Add remaining text after last match
  if (lastIndex < textStr.length) {
    parts.push(textStr.substring(lastIndex));
  }

  return React.createElement(React.Fragment, null, ...parts);
}

