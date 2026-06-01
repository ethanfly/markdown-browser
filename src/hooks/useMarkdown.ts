import { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import type { OutlineBlockKind, OutlineItem } from '../types';

/**
 * Pull the first cell text out of a markdown table header row.
 * The input has already been trimmed of the surrounding `|`s.
 */
function previewTableHeader(row: string): string {
  const cells = row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  if (cells.length === 0) return '';
  // Drop the alignment markers and show the first cell as the preview.
  const first = cells[0].replace(/[:*_`]/g, '').trim();
  if (cells.length > 1) return `${first} +${cells.length - 1}`;
  return first;
}

/**
 * Walk the source markdown and emit one OutlineItem per navigable block.
 * Headings keep their existing `heading-N` ids so Outline scroll behaviour
 * stays compatible; other block kinds get a `block-N` id where N is the
 * per-kind running counter.
 *
 * The output preserves document order so the outline mirrors the file.
 */
function buildOutline(md: string): OutlineItem[] {
  if (!md) return [];

  const lines = md.split('\n');
  const items: OutlineItem[] = [];
  const counters: Record<OutlineBlockKind, number> = {
    heading: 0,
    table: 0,
    blockquote: 0,
    'code-block': 0,
    list: 0,
    'task-list': 0,
  };

  let inFence = false;
  let fenceLang = '';
  let fenceLine = 0;
  let inList: 'ul' | 'ol' | 'task' | null = null;
  let listStartLine = 0;
  let listItemCount = 0;

  const flushList = () => {
    if (!inList) return;
    items.push({
      id: `block-list-${counters.list}`,
      level: 1,
      kind: inList === 'task' ? 'task-list' : 'list',
      text: inList === 'ol' ? 'Numbered list' : inList === 'task' ? 'Task list' : 'Bulleted list',
      hint: `${listItemCount} item${listItemCount === 1 ? '' : 's'}`,
      line: listStartLine + 1,
    });
    counters.list += 1;
    inList = null;
    listItemCount = 0;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNumber = i + 1;

    // ---- Fenced code block: emit one entry for the whole fence. ----
    const fenceMatch = line.match(/^```\s*(\S*)\s*$/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceLang = fenceMatch[1] || '';
        fenceLine = lineNumber;
      } else {
        // Closing fence: emit the code-block entry with the language tag.
        items.push({
          id: `block-code-${counters['code-block']}`,
          level: 1,
          kind: 'code-block',
          text: fenceLang ? `${fenceLang} code block` : 'Code block',
          hint: `lines ${fenceLine}-${lineNumber}`,
          line: fenceLine,
        });
        counters['code-block'] += 1;
        inFence = false;
        fenceLang = '';
      }
      // Any list we were tracking ends at a code fence.
      flushList();
      continue;
    }
    if (inFence) continue;

    // ---- Heading. ----
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      // Strip inline markdown markers from the preview so the outline shows
      // the human-readable title rather than the syntax.
      const raw = headingMatch[2].trim();
      const cleaned = raw
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/==([^=]+)==/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
      items.push({
        id: `heading-${counters.heading}`,
        level,
        kind: 'heading',
        text: cleaned,
        line: lineNumber,
      });
      counters.heading += 1;
      continue;
    }

    // ---- Table header (followed by an alignment row). ----
    if (line.trim().startsWith('|') && i + 1 < lines.length) {
      const next = lines[i + 1];
      if (/^\s*\|?\s*:?-{3,}/.test(next) && next.includes('|')) {
        const header = previewTableHeader(line);
        const colCount = line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .filter((c) => c.trim().length > 0).length;
        // Count body rows.
        let bodyRows = 0;
        for (let j = i + 2; j < lines.length; j += 1) {
          const row = lines[j];
          if (!row.trim() || !row.includes('|')) break;
          bodyRows += 1;
        }
        items.push({
          id: `block-table-${counters.table}`,
          level: 1,
          kind: 'table',
          text: header || 'Table',
          hint: `${colCount} col × ${bodyRows} row${bodyRows === 1 ? '' : 's'}`,
          line: lineNumber,
        });
        counters.table += 1;
        flushList();
        // Skip over the alignment row and any body rows we already counted.
        i += 1 + bodyRows;
        continue;
      }
    }

    // ---- Blockquote (one entry per contiguous quote run). ----
    if (/^>\s?/.test(line) || line === '>') {
      const start = lineNumber;
      // First non-empty line wins as the preview — subsequent lines are
      // only counted for the line range. This gives the user a recognisable
      // "first thing the author said" label rather than the bottom of the
      // quote.
      const firstInner = line.replace(/^>\s?/, '').trim();
      const preview = firstInner || 'Quote';
      let endLine = lineNumber;
      let j = i + 1;
      while (j < lines.length) {
        const cur = lines[j];
        if (cur.startsWith('>')) {
          endLine = j + 1;
          j += 1;
        } else if (cur.trim() === '' && lines[j + 1]?.startsWith('>')) {
          endLine = j + 1;
          j += 1;
        } else {
          break;
        }
      }
      items.push({
        id: `block-quote-${counters.blockquote}`,
        level: 1,
        kind: 'blockquote',
        text: preview ? preview.slice(0, 60) : 'Quote',
        hint: endLine > start ? `lines ${start}-${endLine}` : undefined,
        line: start,
      });
      counters.blockquote += 1;
      flushList();
      i = j - 1;
      continue;
    }

    // ---- Lists. We coalesce a contiguous run of one list flavour into a
    //      single outline entry so the panel doesn't explode for a long
    //      shopping list. ----
    const taskMatch = line.match(/^\s*[-*]\s+\[[ xX]\]\s+/);
    const ulMatch = !taskMatch && /^[-*]\s+/.test(line);
    const olMatch = /^\s*\d+\.\s+/.test(line);

    if (taskMatch || ulMatch || olMatch) {
      const kind: 'ul' | 'ol' | 'task' = taskMatch ? 'task' : ulMatch ? 'ul' : 'ol';
      if (inList === kind) {
        listItemCount += 1;
      } else {
        flushList();
        inList = kind;
        listStartLine = i;
        listItemCount = 1;
      }
      continue;
    }

    // Anything else (paragraph, hr, blank) breaks the list run.
    if (line.trim() === '' || /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushList();
    }
  }

  // Trailing list at EOF.
  flushList();

  return items;
}

export function useMarkdown() {
  const { fileContent } = useAppStore();

  const outline = useMemo<OutlineItem[]>(() => buildOutline(fileContent), [fileContent]);

  const stats = useMemo(() => {
    if (!fileContent) {
      return { words: 0, lines: 0, characters: 0 };
    }

    const lines = fileContent.split('\n').length;
    const words = fileContent.trim() ? fileContent.trim().split(/\s+/).length : 0;
    const characters = fileContent.length;

    return { words, lines, characters };
  }, [fileContent]);

  return {
    outline,
    stats,
  };
}
