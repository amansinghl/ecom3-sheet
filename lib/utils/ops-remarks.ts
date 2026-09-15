/**
 * OPS Remarks are stored newest-first:
 * Name  [23 Sep, 12:00 pm]
 * remark text
 * --------------------------
 * Name  [23 Sep, 11:00 am]
 * older remark
 */

export const OPS_REMARK_SEPARATOR = '--------------------------';

const TIMESTAMP_PATTERN = /\d{1,2} [A-Za-z]{3}, \d{1,2}:\d{2} [ap]m/i;

function withBracedTimestamp(header: string): string {
  if (/\[[^\]]*\]/.test(header) && TIMESTAMP_PATTERN.test(header)) {
    return header;
  }

  const match = header.match(new RegExp(`^(.*?)(${TIMESTAMP_PATTERN.source})$`, 'i'));
  if (!match) return header;

  return `${match[1].trim()}  [${match[2]}]`;
}

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

/** Turns a stored entry into: name + [timestamp], then the remark on the next line. */
export function formatOpsRemarkEntry(entry: string): string {
  const text = entry.trim();
  if (!text) return '';

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2 && TIMESTAMP_PATTERN.test(lines[0])) {
    return `${withBracedTimestamp(lines[0])}\n${lines.slice(1).join('\n')}`;
  }

  const legacy = text.match(/^(.*)\s+\[(.+)\]\s*$/);
  if (legacy) {
    const remark = legacy[1].trim();
    const inside = legacy[2].trim();
    const timeMatch = inside.match(new RegExp(`(${TIMESTAMP_PATTERN.source})$`, 'i'));
    if (timeMatch) {
      const time = timeMatch[1];
      const name = inside.slice(0, inside.length - time.length).trim();
      return `${name}  [${time}]\n${remark}`;
    }
  }

  return text;
}

export function formatOpsRemarkLog(entries: string[]): string {
  return entries.map(formatOpsRemarkEntry).join(`\n${OPS_REMARK_SEPARATOR}\n`);
}

export function latestOpsRemarkEntry(value: string): string {
  return formatOpsRemarkEntry(splitOpsRemarkEntries(value)[0] ?? '');
}

export function parseOpsRemarkParts(entry: string): { header: string; body: string } {
  const formatted = formatOpsRemarkEntry(entry);
  const [header, ...rest] = formatted.split('\n').map((line) => line.trim()).filter(Boolean);
  if (rest.length === 0) {
    return { header: '', body: formatted };
  }
  return { header, body: rest.join('\n') };
}
