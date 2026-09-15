/**
 * OPS Remarks are stored newest-first:
 * remark [Name  23 Sep, 12:00 pm]
 * --------------------------
 * older remark [Name  23 Sep, 11:00 am]
 */

export const OPS_REMARK_SEPARATOR = '--------------------------';

export function splitOpsRemarkEntries(value: string): string[] {
  const text = value.trim();
  if (!text) return [];

  if (/-{10,}/.test(text)) {
    return text.split(/-{10,}/).map((part) => part.trim()).filter(Boolean);
  }

  if (text.includes('],')) {
    return text
      .split(/],\s*/)
      .map((part, index, parts) => {
        let entry = part.trim();
        if (!entry) return '';
        if (index > 0 && !entry.startsWith('[')) entry = `[${entry}`;
        if (index < parts.length - 1 && !entry.endsWith(']')) entry = `${entry}]`;
        return entry;
      })
      .filter(Boolean);
  }

  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function formatOpsRemarkLog(entries: string[]): string {
  return entries.join(`\n${OPS_REMARK_SEPARATOR}\n`);
}

export function latestOpsRemarkEntry(value: string): string {
  return splitOpsRemarkEntries(value)[0] ?? '';
}
