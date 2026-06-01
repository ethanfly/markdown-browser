import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import hljs from 'highlight.js/lib/common';
import { useAppStore } from '../../stores/appStore';
import { useI18n } from '../../i18n';
import clsx from 'clsx';

interface WysiwygEditorProps {
  className?: string;
}

// ============================================
// Context Menu Component
// ============================================

interface MenuItem {
  id: string;
  labelKey?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
  /** Pre-baked block (e.g. a table or footnote template) that replaces the
   *  selection instead of wrapping it. Wins over prefix/suffix when set. */
  snippet?: string;
  children?: MenuItem[];
}

/** Pre-baked snippets for the Insert menu. The editor swaps these into the
 *  document at the cursor when the user picks a non-prefix item. */
const TABLE_2X2 = [
  '| Column 1 | Column 2 |',
  '| --- | --- |',
  '| Cell 1 | Cell 2 |',
  '| Cell 3 | Cell 4 |',
  '',
].join('\n');

const TABLE_3X3 = [
  '| Column 1 | Column 2 | Column 3 |',
  '| --- | :---: | ---: |',
  '| Left | Center | Right |',
  '| A | B | C |',
  '| D | E | F |',
  '',
].join('\n');

const FOOTNOTE_TEMPLATE = 'Text[^1] goes here.\n\n[^1]: Footnote content.';

const menuItems: MenuItem[] = [
  {
    id: 'heading',
    labelKey: 'heading',
    children: [
      { id: 'h1', label: 'H1', prefix: '# ' },
      { id: 'h2', label: 'H2', prefix: '## ' },
      { id: 'h3', label: 'H3', prefix: '### ' },
      { id: 'h4', label: 'H4', prefix: '#### ' },
      { id: 'h5', label: 'H5', prefix: '##### ' },
      { id: 'h6', label: 'H6', prefix: '###### ' },
    ],
  },
  {
    id: 'text-style',
    labelKey: 'textStyle',
    children: [
      { id: 'bold', labelKey: 'bold', prefix: '**', suffix: '**' },
      { id: 'italic', labelKey: 'italic', prefix: '*', suffix: '*' },
      { id: 'strike', labelKey: 'strikethrough', prefix: '~~', suffix: '~~' },
      { id: 'highlight', labelKey: 'highlight', prefix: '==', suffix: '==' },
      { id: 'code', labelKey: 'code', prefix: '`', suffix: '`' },
    ],
  },
  {
    id: 'list',
    labelKey: 'list',
    children: [
      { id: 'ul', labelKey: 'list', prefix: '- ' },
      { id: 'ol', labelKey: 'orderedList', prefix: '1. ' },
      { id: 'task', labelKey: 'task', prefix: '- [ ] ' },
    ],
  },
  {
    id: 'insert',
    labelKey: 'insert',
    children: [
      { id: 'link', labelKey: 'link', prefix: '[', suffix: '](url)' },
      { id: 'image', labelKey: 'image', prefix: '![', suffix: '](url)' },
      { id: 'quote', labelKey: 'blockquote', prefix: '> ' },
      { id: 'hr', labelKey: 'horizontalRule', prefix: '\n---\n' },
      { id: 'table2', labelKey: 'table2x2', snippet: TABLE_2X2 },
      { id: 'table3', labelKey: 'table3x3', snippet: TABLE_3X3 },
      { id: 'footnote', labelKey: 'footnote', snippet: FOOTNOTE_TEMPLATE },
    ],
  },
];

interface InsertOptions {
  /** Replace the current selection (or the current line) with the snippet
   *  instead of wrapping it. Used by the Table / Footnote entries. */
  replace?: boolean;
}

interface SubMenuProps {
  items: MenuItem[];
  onClose: () => void;
  onInsert: (prefix: string, suffix?: string, options?: InsertOptions) => void;
  position: { x: number; y: number };
}

function SubMenu({ items, onClose, onInsert, position }: SubMenuProps) {
  const { t } = useI18n();

  return (
    <div
      className="fixed z-[60] min-w-32 py-1 rounded-lg shadow-lg
                 bg-white dark:bg-slate-800
                 border border-slate-200 dark:border-slate-700"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.snippet !== undefined) {
              onInsert(item.snippet, undefined, { replace: true });
            } else if (item.prefix !== undefined) {
              onInsert(item.prefix, item.suffix);
            }
            onClose();
          }}
          className="w-full px-3 py-1 text-left text-sm
                     hover:bg-slate-100 dark:hover:bg-slate-700
                     text-slate-700 dark:text-slate-300
                     transition-colors"
        >
          {item.labelKey ? t(item.labelKey as any) : item.label}
        </button>
      ))}
    </div>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onInsert: (prefix: string, suffix?: string, options?: InsertOptions) => void;
}

function ContextMenu({ x, y, onClose, onInsert }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<{ items: MenuItem[]; x: number; y: number } | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (subMenu) {
          setSubMenu(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, subMenu]);

  const handleSubMenu = (item: MenuItem, event: React.MouseEvent) => {
    if (item.children) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setSubMenu({
        items: item.children,
        x: rect.right + 4,
        y: rect.top,
      });
    }
  };

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 w-40 py-1 rounded-lg shadow-lg max-h-64 overflow-y-auto
                   bg-white dark:bg-slate-800
                   border border-slate-200 dark:border-slate-700"
        style={{ left: adjustedX, top: adjustedY }}
      >
        <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
          {t('markdownSyntax')}
        </div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onMouseEnter={(e) => handleSubMenu(item, e)}
            onClick={(e) => handleSubMenu(item, e)}
            className="w-full px-3 py-1.5 text-left text-sm flex items-center justify-between
                       hover:bg-slate-100 dark:hover:bg-slate-700
                       text-slate-700 dark:text-slate-300
                       transition-colors"
          >
            <span>{t((item.labelKey || item.id) as any)}</span>
            {item.children && <ChevronRightIcon className="w-3 h-3 text-slate-400" />}
          </button>
        ))}
      </div>

      {subMenu && (
        <SubMenu
          items={subMenu.items}
          position={{ x: subMenu.x, y: subMenu.y }}
          onClose={() => setSubMenu(null)}
          onInsert={onInsert}
        />
      )}
    </>
  );
}

// ============================================
// Cursor Helpers
// ============================================

function getCaretPosition(element: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;

  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);

  return preRange.toString().length;
}

function setCaretPosition(element: HTMLElement, position: number) {
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  let charCount = 0;
  let found = false;

  const traverse = (node: Node): boolean => {
    if (found) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (charCount + text.length >= position) {
        range.setStart(node, position - charCount);
        range.collapse(true);
        found = true;
        return true;
      }
      charCount += text.length;
    } else {
      for (const child of Array.from(node.childNodes)) {
        if (traverse(child)) return true;
      }
    }
    return false;
  };

  traverse(element);

  if (!found) {
    range.selectNodeContents(element);
    range.collapse(position <= 0);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

function getCurrentLineElement(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  let node: Node | null = sel.anchorNode;
  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      if (node.classList.contains('md-line') ||
          node.classList.contains('md-blockquote') ||
          node.classList.contains('md-code-block')) {
        return node;
      }
    }
    node = node.parentNode;
  }

  if (editor.children.length > 0) {
    return editor.children[0] as HTMLElement;
  }
  return null;
}

// ============================================
// Inline Markdown Parser
// ============================================

/**
 * Escape a string for safe insertion into HTML. Used for cell contents and
 * arbitrary user text. Preserves our own backslash escapes for code blocks.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sentinel used to carry `<br>` past the escapeHtml() pass. The brackets are
 * missing so escapeHtml leaves the token alone; the inline pipeline swaps
 * it back for a real `<br>` element at the very end of the render.
 */
const BR_SENTINEL = '\u0001BR\u0001';

/**
 * Convert a small whitelist of inline HTML tags to their markdown
 * equivalents. This runs before escapeHtml() so the `<…>` characters are
 * still literal and the conversion is unambiguous.
 *
 * Tags that have no markdown equivalent (e.g. `<u>`, `<small>`,
 * `<span class="…">`) are kept as-is in the source string so the generic
 * inline pass-through below can render them. Tags that ARE converted are
 * listed in this map with the regex pattern that matches the open tag and
 * the markdown syntax to substitute.
 */
const HTML_INLINE_TAGS: Array<{
  /** Open tag pattern, with capture group for attributes. */
  open: RegExp;
  /** Close tag pattern. */
  close: RegExp;
  /** Replacement for the open tag, or null to drop it. */
  openRepl: string | ((attrs: string) => string);
  /** Replacement for the close tag, or null to drop it. */
  closeRepl: string;
}> = [
  // <br>, <br/>, <br /> — preserved as a real <br> via sentinel so it
  // survives the escapeHtml pass and round-trips back through htmlToMarkdown.
  { open: /<br\s*\/?>/gi, close: /<\/br>/gi, openRepl: BR_SENTINEL, closeRepl: '' },
  // <sub> -> ~
  { open: /<sub(\s[^>]*)?>/gi, close: /<\/sub>/gi, openRepl: '~', closeRepl: '~' },
  // <sup> -> ^
  { open: /<sup(\s[^>]*)?>/gi, close: /<\/sup>/gi, openRepl: '^', closeRepl: '^' },
  // <b> / <strong> -> **
  { open: /<b(\s[^>]*)?>/gi, close: /<\/b>/gi, openRepl: '**', closeRepl: '**' },
  {
    open: /<strong(\s[^>]*)?>/gi,
    close: /<\/strong>/gi,
    openRepl: '**',
    closeRepl: '**',
  },
  // <i> / <em> -> *
  { open: /<i(\s[^>]*)?>/gi, close: /<\/i>/gi, openRepl: '*', closeRepl: '*' },
  { open: /<em(\s[^>]*)?>/gi, close: /<\/em>/gi, openRepl: '*', closeRepl: '*' },
  // <del> / <s> / <strike> -> ~~
  { open: /<del(\s[^>]*)?>/gi, close: /<\/del>/gi, openRepl: '~~', closeRepl: '~~' },
  { open: /<s(\s[^>]*)?>/gi, close: /<\/s>/gi, openRepl: '~~', closeRepl: '~~' },
  { open: /<strike(\s[^>]*)?>/gi, close: /<\/strike>/gi, openRepl: '~~', closeRepl: '~~' },
  // <mark> -> ==
  { open: /<mark(\s[^>]*)?>/gi, close: /<\/mark>/gi, openRepl: '==', closeRepl: '==' },
  // <code> -> `
  { open: /<code(\s[^>]*)?>/gi, close: /<\/code>/gi, openRepl: '`', closeRepl: '`' },
  // <kbd> -> `` ` `` (treated as inline code on round-trip)
  { open: /<kbd(\s[^>]*)?>/gi, close: /<\/kbd>/gi, openRepl: '`', closeRepl: '`' },
];

/**
 * Walk the input and replace whitelisted HTML tags with their markdown
 * equivalents. Tags not in the whitelist are left untouched so the
 * downstream escapeHtml() will render them as visible text — the safe
 * behaviour for unknown markup.
 */
function expandHtmlInline(text: string): string {
  let result = text;
  for (const tag of HTML_INLINE_TAGS) {
    result = result.replace(tag.open, (_m, attrs) => {
      if (typeof tag.openRepl === 'function') return tag.openRepl(attrs || '');
      return tag.openRepl;
    });
    result = result.replace(tag.close, tag.closeRepl);
  }
  return result;
}

/**
 * Footnote reference store — populated while parsing and consumed when
 * serialising back to markdown so we can write the definitions at the end of
 * the document.
 */
interface FootnoteDefinition {
  id: string;
  text: string;
}

function createFootnoteStore() {
  const definitions = new Map<string, FootnoteDefinition>();
  return {
    define(id: string, text: string) {
      if (!definitions.has(id)) {
        definitions.set(id, { id, text });
      }
    },
    has(id: string) {
      return definitions.has(id);
    },
    entries(): FootnoteDefinition[] {
      return Array.from(definitions.values());
    },
  };
}

type FootnoteStore = ReturnType<typeof createFootnoteStore>;

/**
 * Decode standard markdown backslash escapes (\\, \*, \_, etc.). This must run
 * BEFORE the inline replacements so escaped characters are not consumed as
 * syntax.
 */
function decodeEscapes(text: string): string {
  return text.replace(/\\([\\`*_{}\[\]()#+\-.!>~^=|:])/g, '$1');
}

/**
 * Parse inline markdown and return HTML. The parser is intentionally order
 * sensitive: longer / more specific patterns run first so `**bold**` wins
 * over `*italic*` and code spans are extracted before other rules.
 */
function parseInlineMarkdown(
  text: string,
  footnotes?: FootnoteStore,
  referenceLinks?: Map<string, { url: string; title?: string }>,
): string {
  // 0. Whitelisted HTML inline tags (<sub>, <br>, <b>, …) are converted to
  //    their markdown equivalents BEFORE any other pass so the rest of the
  //    pipeline never sees raw HTML. This must happen before code-span
  //    extraction so that `<code>x</code>` and ``` `x` ``` both flow into
  //    the same code renderer.
  let working = expandHtmlInline(text);

  // 1. Pull out inline code spans first — content inside is never re-parsed.
  const codeSpans: string[] = [];
  working = working.replace(/`([^`\n]+?)`/g, (_match, code: string) => {
    const idx = codeSpans.push(`<code class="md-code">${escapeHtml(code)}</code>`) - 1;
    return `\u0001CODE${idx}\u0001`;
  });

  // 2. Decode backslash escapes (after code extraction so `\*` in code stays
  //    literal). Then escape remaining HTML control chars.
  working = decodeEscapes(working);
  working = escapeHtml(working);

  // 3. Re-insert code spans with their already-escaped content preserved.
  //    We re-apply escapeHtml on the wrapper placeholder because the previous
  //    escape pass would have re-escaped the bracket characters we use as
  //    sentinels. Use a different sentinel to avoid that.
  //    (Implementation detail: code spans are stored as raw HTML; we splice
  //    them back in last.)
  working = working.replace(/`([^`\n]+?)`/g, (_match, code: string) => {
    const idx = codeSpans.push(`<code class="md-code">${escapeHtml(code)}</code>`) - 1;
    return `\u0001CODE${idx}\u0001`;
  });

  // 4. Inline images / links. Reference-style: ![alt][id] and [text][id].
  working = working
    .replace(/!\[([^\]]*?)\]\[([^\]]+?)\]/g, (_m, alt: string, ref: string) => {
      const def = referenceLinks?.get(ref.toLowerCase());
      if (def) {
        return `<img src="${def.url}" alt="${alt}" class="md-image">`;
      }
      return `<img alt="${alt}" class="md-image md-missing-ref" data-ref="${ref}">`;
    })
    .replace(/!\[([^\]]*?)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, alt: string, url: string, title?: string) => {
      const t = title ? ` title="${title}"` : '';
      return `<img src="${url}" alt="${alt}"${t} class="md-image">`;
    })
    .replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, '<img src="$2" alt="$1" class="md-image">')
    .replace(/\[([^\]]+?)\]\[([^\]]+?)\]/g, (_m, label: string, ref: string) => {
      const def = referenceLinks?.get(ref.toLowerCase());
      if (def) {
        const t = def.title ? ` title="${def.title}"` : '';
        return `<a href="${def.url}"${t} class="md-link">${label}</a>`;
      }
      return `<span class="md-link md-missing-ref" data-ref="${ref}">${label}</span>`;
    })
    .replace(/\[([^\]]+?)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, label: string, url: string, title?: string) => {
      const t = title ? ` title="${title}"` : '';
      return `<a href="${url}"${t} class="md-link">${label}</a>`;
    })
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" class="md-link">$1</a>');

  // 5. Footnote references: [^id] becomes a superscript anchor pointing to the
  //    matching definition (collected at the end of the document).
  if (footnotes) {
    working = working.replace(/\[\^([^\]\s]+?)\]/g, (_m, id: string) => {
      if (!footnotes.has(id)) {
        // Unresolved references are rendered as plain text so users notice.
        return `<sup class="md-footnote-ref md-footnote-missing" data-footnote="${id}">[?]</sup>`;
      }
      return `<sup class="md-footnote-ref" data-footnote="${id}"><a href="#fn-${id}" id="fnref-${id}">${id}</a></sup>`;
    });
  }

  // 6. Auto-links: <https://example.com> and <email@example.com>.
  working = working
    .replace(/&lt;(https?:\/\/[^\s<>]+)&gt;/g, '<a href="$1" class="md-link">$1</a>')
    .replace(/&lt;([\w.+-]+@[\w-]+(\.[\w-]+)+)&gt;/g, '<a href="mailto:$1" class="md-link">$1</a>');

  // 7. Inline formatting. Order matters: bold before italic, strikethrough
  //    before subscript (subscript uses single ~).
  working = working
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="md-bold">$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<strong class="md-bold">$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="md-italic">$1</em>')
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em class="md-italic">$1</em>')
    .replace(/~~([^~\n]+?)~~/g, '<del class="md-strike">$1</del>')
    .replace(/==([^=\n]+?)==/g, '<mark class="md-highlight">$1</mark>')
    .replace(/\^([^^\n]+?)\^/g, '<sup class="md-superscript">$1</sup>')
    // Subscript: a single ~ on each side, not adjacent to another ~ (which
    // would be strikethrough). Requires the next char to not be a digit
    // immediately after to avoid touching tilde-number patterns that some
    // users mean literally.
    .replace(/(?<!~)~([^~\n]+?)~(?!~)/g, '<sub class="md-subscript">$1</sub>');

  // 8. Restore code spans that we extracted in step 1/3.
  working = working.replace(/\u0001CODE(\d+)\u0001/g, (_m, idx: string) => codeSpans[Number(idx)] ?? '');

  // 9. Expand <br> sentinels that expandHtmlInline stashed for us. We do
  //    this last so the bracket characters survive escapeHtml untouched.
  working = working.split(BR_SENTINEL).join('<br>');

  return working;
}

// ============================================
// Block Type Detection
// ============================================

interface BlockType {
  type: string;
  prefix: string;
  content: string;
  level?: number;
  checked?: boolean;
  num?: string;
}

function detectBlockType(text: string): BlockType | null {
  const hMatch = text.match(/^(#{1,6})$/);
  if (hMatch) {
    return { type: 'heading', prefix: hMatch[1], content: '', level: hMatch[1].length };
  }

  const ulMatch = text.match(/^([-*])$/);
  if (ulMatch) {
    return { type: 'ul', prefix: ulMatch[1], content: '' };
  }

  const olMatch = text.match(/^(\d+)\.$/);
  if (olMatch) {
    return { type: 'ol', prefix: olMatch[1] + '.', content: '', num: olMatch[1] };
  }

  const taskMatch = text.match(/^- \[([ xX])\]$/);
  if (taskMatch) {
    return { type: 'task', prefix: '- [' + taskMatch[1] + ']', content: '', checked: taskMatch[1].toLowerCase() === 'x' };
  }

  if (text === '>') {
    return { type: 'blockquote', prefix: '>', content: '' };
  }

  if (/^(---|\*\*\*|___)$/.test(text)) {
    return { type: 'hr', prefix: text, content: '' };
  }

  if (text === '```') {
    return { type: 'code', prefix: '```', content: '' };
  }

  return null;
}

// ============================================
// HTML Generator
// ============================================

function createLineElement(blockType: BlockType, content: string = ''): HTMLElement {
  const div = document.createElement('div');
  div.className = 'md-line';

  switch (blockType.type) {
    case 'heading':
      div.setAttribute('data-type', `h${blockType.level}`);
      div.innerHTML = content ? parseInlineMarkdown(content) : '<br>';
      break;

    case 'ul':
      div.setAttribute('data-type', 'li');
      div.setAttribute('data-list', 'ul');
      div.innerHTML = content ? parseInlineMarkdown(content) : '<br>';
      break;

    case 'ol':
      div.setAttribute('data-type', 'li');
      div.setAttribute('data-list', 'ol');
      div.setAttribute('data-num', blockType.num || '1');
      div.innerHTML = content ? parseInlineMarkdown(content) : '<br>';
      break;

    case 'task':
      div.className = 'md-line md-task';
      div.setAttribute('data-type', 'task');
      div.setAttribute('data-checked', String(blockType.checked || false));
      div.innerHTML = `<input type="checkbox" ${blockType.checked ? 'checked' : ''}><span class="md-task-text">${content ? parseInlineMarkdown(content) : '<br>'}</span>`;
      break;

    case 'blockquote':
      const bq = document.createElement('blockquote');
      bq.className = 'md-blockquote';
      bq.innerHTML = content ? parseInlineMarkdown(content) : '<br>';
      return bq;

    case 'code':
      const pre = document.createElement('pre');
      pre.className = 'md-code-block';
      pre.setAttribute('data-lang', '');
      pre.innerHTML = `<code>${content || ''}</code>`;
      return pre;

    default:
      div.setAttribute('data-type', 'p');
      div.innerHTML = content ? parseInlineMarkdown(content) : '<br>';
  }

  return div;
}

// ============================================
// HTML to Markdown
// ============================================

function htmlToMarkdown(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Collect footnote definitions while walking so they can be appended at the
  // end of the document (markdown convention: `[^id]: text` at the bottom).
  const footnoteDefinitions: string[] = [];
  const seenFootnoteIds = new Set<string>();

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const className = el.className || '';
    const dataType = el.getAttribute('data-type') || '';
    const children = Array.from(el.childNodes).map(processNode).join('');

    // Table block. Serialise the whole table in one shot so the column
    // alignment row comes out correctly.
    if (tag === 'div' && className.includes('md-table')) {
      const table = el.querySelector('table');
      if (table) {
        const rows: { cells: string[]; isHeader: boolean }[] = [];
        const aligns: Array<'left' | 'center' | 'right' | null> = [];

        const collectRow = (tr: Element, isHeader: boolean) => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) => {
            const styleAlign = (cell as HTMLElement).style.textAlign;
            if (isHeader) {
              if (styleAlign === 'left') aligns.push('left');
              else if (styleAlign === 'center') aligns.push('center');
              else if (styleAlign === 'right') aligns.push('right');
              else aligns.push(null);
            }
            // Escape literal pipes inside cell content so the table layout
            // is not broken on round-trip.
            return processNode(cell).replace(/\|/g, '\\|');
          });
          rows.push({ cells, isHeader });
        };

        const head = table.querySelector('thead tr');
        if (head) collectRow(head, true);
        table.querySelectorAll('tbody tr').forEach((tr) => collectRow(tr, false));

        const header = rows.shift();
        if (!header) return '';

        const headerRow = `| ${header.cells.join(' | ')} |`;
        const alignRow = `| ${aligns
          .map((a) => {
            if (a === 'left') return ':---';
            if (a === 'center') return ':---:';
            if (a === 'right') return '---:';
            return '---';
          })
          .join(' | ')} |`;
        const bodyRows = rows.map((r) => `| ${r.cells.join(' | ')} |`);
        return [headerRow, alignRow, ...bodyRows].join('\n') + '\n';
      }
      return '';
    }

    // Footnote section — drain the items into definition lines, drop the
    // wrapper from the visible stream.
    if (tag === 'section' && className.includes('md-footnotes')) {
      el.querySelectorAll('.md-footnote-item').forEach((item) => {
        const id = item.getAttribute('data-footnote') || '';
        if (!id || seenFootnoteIds.has(id)) return;
        seenFootnoteIds.add(id);
        const text = processNode(item).replace(/\s*\u21BA\s*$/, '').trim();
        footnoteDefinitions.push(`[^${id}]: ${text}`);
      });
      return '';
    }

    if (tag === 'div' && className.includes('md-line')) {
      switch (dataType) {
        case 'h1': return `# ${children}\n`;
        case 'h2': return `## ${children}\n`;
        case 'h3': return `### ${children}\n`;
        case 'h4': return `#### ${children}\n`;
        case 'h5': return `##### ${children}\n`;
        case 'h6': return `###### ${children}\n`;
        case 'li': {
          const listType = el.getAttribute('data-list');
          const num = el.getAttribute('data-num') || '1';
          return listType === 'ol' ? `${num}. ${children}\n` : `- ${children}\n`;
        }
        case 'task': {
          const checked = el.getAttribute('data-checked') === 'true';
          return `- [${checked ? 'x' : ' '}] ${children}\n`;
        }
        case 'p':
        default:
          return `${children}\n`;
      }
    }

    if (tag === 'pre' && className.includes('md-code-block')) {
      const lang = el.getAttribute('data-lang') || '';
      const code = el.querySelector('code')?.textContent || '';
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }

    if (tag === 'blockquote') {
      // Walk the children directly so we can preserve `<br>` boundaries
      // (processNode collapses `<br>` to '' for everything else).
      const lines: string[] = [''];
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'br') {
          lines.push('');
        } else {
          lines[lines.length - 1] += processNode(child);
        }
      });
      return lines.map((l) => (l.trim() ? `> ${l}` : '>')).join('\n') + '\n';
    }

    if (tag === 'hr') return '---\n';

    if (tag === 'dl' && className.includes('md-deflist')) {
      const term = el.querySelector('.md-def-term')?.textContent?.trim() ?? '';
      const desc = el.querySelector('.md-def-desc')?.textContent?.trim() ?? '';
      return `${term}\n: ${desc}\n\n`;
    }

    if (className.includes('md-bold') || tag === 'strong' || tag === 'b') return `**${children}**`;
    if (className.includes('md-italic') || tag === 'em' || tag === 'i') return `*${children}*`;
    if (className.includes('md-strike') || tag === 'del' || tag === 's' || tag === 'strike') return `~~${children}~~`;
    if (className.includes('md-highlight') || tag === 'mark') return `==${children}==`;
    if (className.includes('md-code') || tag === 'kbd' || (tag === 'code' && !el.closest('pre'))) return `\`${children}\``;
    if (className.includes('md-superscript') || tag === 'sup') return `^${children}^`;
    if (className.includes('md-subscript') || tag === 'sub') return `~${children}~`;
    if (className.includes('md-link') || tag === 'a') {
      const href = el.getAttribute('href') || '';
      return `[${children}](${href})`;
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      return `![${alt}](${src})`;
    }
    if (tag === 'br') return '';
    if (tag === 'input') return '';
    if (tag === 'span') return children;
    if (tag === 'ol' || tag === 'ul' || tag === 'li') return children;

    return children;
  };

  const body = Array.from(temp.childNodes).map(processNode).join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!footnoteDefinitions.length) return body;
  return `${body}\n\n${footnoteDefinitions.join('\n')}`;
}

/**
 * Split a table row `| a | b | c |` into cells, trimming surrounding
 * whitespace and unescaping escaped pipes (`\|`).
 */
function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.replace(/\\\|/g, '|').trim());
}

/**
 * Parse a GFM table alignment row (`| :--- | :---: | ---: |`) into per-column
 * alignment values. Returns null when the line is not a valid alignment row.
 */
function parseTableAlignments(line: string): Array<'left' | 'center' | 'right' | null> | null {
  const cells = splitTableRow(line);
  if (cells.length === 0) return null;
  const aligns: Array<'left' | 'center' | 'right' | null> = [];
  for (const raw of cells) {
    const cell = raw.trim();
    if (!/^:?-{3,}:?$/.test(cell)) return null;
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) aligns.push('center');
    else if (right) aligns.push('right');
    else if (left) aligns.push('left');
    else aligns.push(null);
  }
  return aligns;
}

/**
 * Render a single table cell. The cell content may contain inline markdown
 * (bold, links, code, …) so we re-use the same inline parser.
 */
function renderTableCell(rawCell: string): string {
  // Allow inline markdown in cells but treat newlines as spaces — tables
  // don't support multi-line cells in GFM.
  const flat = rawCell.replace(/<br\s*\/?>/gi, ' ').replace(/\n+/g, ' ').trim();
  return parseInlineMarkdown(flat);
}

/**
 * Build the HTML for a GFM table from header, alignment, and body rows.
 */
function renderTable(
  headers: string[],
  aligns: Array<'left' | 'center' | 'right' | null>,
  rows: string[][],
): string {
  const colCount = headers.length;
  const head = headers
    .map((cell, i) => {
      const align = aligns[i];
      const style = align ? ` style="text-align:${align}"` : '';
      return `<th${style}>${renderTableCell(cell)}</th>`;
    })
    .join('');

  const body = rows
    .map((row) => {
      const cells: string[] = [];
      for (let i = 0; i < colCount; i += 1) {
        const cell = row[i] ?? '';
        const align = aligns[i];
        const style = align ? ` style="text-align:${align}"` : '';
        cells.push(`<td${style}>${renderTableCell(cell)}</td>`);
      }
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  return `<div class="md-table" data-block="table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function parseMarkdownToHtml(md: string): string {
  if (!md) return '<div class="md-line" data-type="p"><br></div>';

  const lines = md.split('\n');
  const result: string[] = [];

  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let headingIndex = 0;

  // Reference link definitions and footnote definitions live at the document
  // level. Collect them up front so inline parsing can resolve them.
  const referenceLinks = new Map<string, { url: string; title?: string }>();
  const footnotes = createFootnoteStore();

  // Pre-pass: strip out reference link / footnote definition lines so the
  // main loop never tries to render them as paragraphs.
  const stripped: string[] = [];
  for (const line of lines) {
    const refMatch = line.match(/^\s*\[([^\]]+)\]:\s+(\S+)(?:\s+&quot;([^&]*)&quot;|\s+\"([^\"]*)\")?\s*$/);
    if (refMatch) {
      const id = refMatch[1].toLowerCase();
      const url = refMatch[2];
      const title = refMatch[3] ?? refMatch[4];
      referenceLinks.set(id, title ? { url, title } : { url });
      stripped.push(''); // drop the definition line
      continue;
    }
    const fnMatch = line.match(/^\s*\[\^([^\]]+)\]:\s+(.*)$/);
    if (fnMatch) {
      footnotes.define(fnMatch[1], fnMatch[2]);
      stripped.push(''); // drop the definition line
      continue;
    }
    stripped.push(line);
  }

  // Helper: attempt to consume a GFM table starting at `index`. Returns the
  // rendered HTML and the new index, or null if no table starts here.
  const tryParseTable = (index: number): { html: string; next: number } | null => {
    if (inCodeBlock) return null;
    const headerLine = stripped[index];
    const alignLine = stripped[index + 1];
    if (headerLine === undefined || alignLine === undefined) return null;
    if (!headerLine.trim().startsWith('|')) return null;
    const aligns = parseTableAlignments(alignLine);
    if (!aligns) return null;
    const headers = splitTableRow(headerLine);
    if (headers.length === 0) return null;

    const rows: string[][] = [];
    let cursor = index + 2;
    while (cursor < stripped.length) {
      const row = stripped[cursor];
      if (row.trim() === '') break;
      if (!row.trim().startsWith('|') && !row.includes('|')) break;
      // Stop on a line that does not contain a pipe at all (next block).
      if (!row.includes('|')) break;
      const cells = splitTableRow(row);
      // Pad / truncate to header length for column count consistency.
      while (cells.length < headers.length) cells.push('');
      rows.push(cells.slice(0, headers.length));
      cursor += 1;
    }
    return { html: renderTable(headers, aligns, rows), next: cursor };
  };

  let i = 0;
  while (i < stripped.length) {
    const line = stripped[i];

    // Fenced code block.
    const fenceMatch = line.match(/^```(.*)$/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = fenceMatch[1].trim();
        codeLines = [];
      } else {
        result.push(
          `<pre class="md-code-block" data-lang="${codeLanguage}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
        );
        inCodeBlock = false;
        codeLanguage = '';
        codeLines = [];
      }
      i += 1;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i += 1;
      continue;
    }

    // GFM table — try before other block rules so a `|`-prefixed line is
    // never misread as a paragraph.
    const table = tryParseTable(i);
    if (table) {
      result.push(table.html);
      i = table.next;
      continue;
    }

    // Heading: # … ###### …
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const content = parseInlineMarkdown(hMatch[2], footnotes, referenceLinks);
      result.push(
        `<div id="heading-${headingIndex}" class="md-line" data-type="h${hMatch[1].length}">${content}</div>`,
      );
      headingIndex += 1;
      i += 1;
      continue;
    }

    // Task list.
    const taskMatch = line.match(/^([-*])\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[2].toLowerCase() === 'x';
      const content = parseInlineMarkdown(taskMatch[3], footnotes, referenceLinks);
      result.push(
        `<div class="md-line md-task" data-type="task" data-checked="${checked}"><input type="checkbox" ${checked ? 'checked' : ''}><span class="md-task-text">${content}</span></div>`,
      );
      i += 1;
      continue;
    }

    // Unordered list.
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      const content = parseInlineMarkdown(ulMatch[1], footnotes, referenceLinks);
      result.push(
        `<div class="md-line" data-type="li" data-list="ul">${content}</div>`,
      );
      i += 1;
      continue;
    }

    // Ordered list.
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const content = parseInlineMarkdown(olMatch[2], footnotes, referenceLinks);
      result.push(
        `<div class="md-line" data-type="li" data-list="ol" data-num="${olMatch[1]}">${content}</div>`,
      );
      i += 1;
      continue;
    }

    // Blockquote. Consecutive `>` lines merge into a single blockquote; we
    // also support a leading `> ` that may be missing on continuation lines
    // (lax blockquote) by treating bare lines as part of the same quote.
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < stripped.length) {
        const cur = stripped[i];
        if (cur.startsWith('> ')) {
          quoteLines.push(cur.slice(2));
          i += 1;
        } else if (cur === '>') {
          quoteLines.push('');
          i += 1;
        } else if (cur.trim() === '') {
          // Allow a single blank line inside a quote.
          const next = stripped[i + 1];
          if (next !== undefined && next.startsWith('>')) {
            quoteLines.push('');
            i += 1;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      const inner = quoteLines
        .map((q) => (q === '' ? '<br>' : parseInlineMarkdown(q, footnotes, referenceLinks)))
        .join('<br>');
      result.push(`<blockquote class="md-blockquote">${inner}</blockquote>`);
      continue;
    }

    // Horizontal rule.
    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      result.push('<hr class="md-hr">');
      i += 1;
      continue;
    }

    // Definition list. Markdown Extra / Pandoc flavour: a term on its own
    // line followed by a definition on the next line that begins with `: `
    // (optionally indented). The term line itself must look like a normal
    // paragraph and not match any other block rule.
    const nextLine = i + 1 < stripped.length ? stripped[i + 1] : '';
    if (
      nextLine &&
      /^\s*:\s+/.test(nextLine) &&
      line.trim() !== '' &&
      !line.startsWith('#') &&
      !line.startsWith('>') &&
      !line.startsWith('|') &&
      !/^[-*]\s/.test(line) &&
      !/^\d+\.\s/.test(line)
    ) {
      const term = parseInlineMarkdown(line.trim(), footnotes, referenceLinks);
      const desc = parseInlineMarkdown(
        nextLine.replace(/^\s*:\s+/, '').trim(),
        footnotes,
        referenceLinks,
      );
      result.push(
        `<dl class="md-deflist"><dt class="md-def-term">${term}</dt><dd class="md-def-desc">${desc}</dd></dl>`,
      );
      i += 2;
      continue;
    }

    // Empty line.
    if (line.trim() === '') {
      result.push('<div class="md-line" data-type="p"><br></div>');
      i += 1;
      continue;
    }

    // Default: paragraph. Inline parsing handles emphasis / links / etc.
    const content = parseInlineMarkdown(line, footnotes, referenceLinks);
    result.push(`<div class="md-line" data-type="p">${content}</div>`);
    i += 1;
  }

  if (inCodeBlock) {
    result.push(
      `<pre class="md-code-block" data-lang="${codeLanguage}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
    );
  }

  // Append a footnote section at the end of the document if any definitions
  // were collected. The serialiser reads this back out to write the markdown
  // definitions block.
  if (footnotes.entries().length) {
    const items = footnotes
      .entries()
      .map(
        (fn) =>
          `<li class="md-footnote-item" id="fn-${fn.id}" data-footnote="${fn.id}">${parseInlineMarkdown(fn.text, footnotes, referenceLinks)} <a class="md-footnote-backref" href="#fnref-${fn.id}" aria-label="Back to reference">&#8617;</a></li>`,
      )
      .join('');
    result.push(`<section class="md-footnotes" data-block="footnotes"><ol>${items}</ol></section>`);
  }

  return result.join('');
}

function syncHeadingIds(editor: HTMLElement) {
  let headingIndex = 0;

  Array.from(editor.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;

    const type = child.getAttribute('data-type');
    if (type && /^h[1-6]$/.test(type)) {
      child.id = `heading-${headingIndex}`;
      headingIndex += 1;
    } else if (child.id.startsWith('heading-')) {
      child.removeAttribute('id');
    }
  });
}

function getLineIndex(editor: HTMLElement, lineEl: HTMLElement | null) {
  if (!lineEl) return 0;
  return Math.max(0, Array.from(editor.children).indexOf(lineEl));
}

// ============================================
// Syntax Highlighting
// ============================================

/**
 * Walk the editor DOM and run highlight.js against every fenced code block.
 * highlight.js mutates the `<code>` element in-place by wrapping tokens in
 * `<span class="hljs-…">` and adding the `hljs` class. The wrapper spans do
 * not break the round-trip because `htmlToMarkdown` reads the code's
 * `textContent`, which is the original source.
 *
 * Unknown languages fall back to plaintext (no highlight) so the user still
 * sees their code verbatim.
 */
function applySyntaxHighlighting(root: HTMLElement): void {
  const blocks = root.querySelectorAll<HTMLElement>('pre.md-code-block code');
  blocks.forEach((codeEl) => {
    // Skip if already highlighted (React StrictMode invokes effects twice in
    // dev; double-highlight would wrap spans inside spans).
    if (codeEl.dataset.highlighted === 'yes') return;
    const lang = (codeEl.parentElement?.getAttribute('data-lang') || '').trim();
    try {
      if (lang && hljs.getLanguage(lang)) {
        hljs.highlightElement(codeEl);
        // Override the language class highlight.js added so theme selectors
        // can target by our attribute.
        codeEl.classList.add(`language-${lang}`);
      } else {
        // No language specified / unsupported — still mark the element so we
        // don't re-process on subsequent renders, but skip wrapping.
        codeEl.classList.add('hljs');
      }
    } catch {
      // highlightElement is best-effort; never break the editor on a
      // malformed code block.
    }
  });
}

// ============================================
// Main Editor Component
// ============================================

export function WysiwygEditor({ className: _className }: WysiwygEditorProps) {
  const { fileContent, setFileContent, setCursorPosition, settings } = useAppStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isInternalChange, setIsInternalChange] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const textStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily === 'inter'
      ? 'Inter, system-ui, sans-serif'
      : settings.fontFamily === 'georgia'
        ? 'Georgia, serif'
        : 'system-ui, sans-serif',
  };

  const reportCursorPosition = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const lineEl = getCurrentLineElement(editor);
    const line = getLineIndex(editor, lineEl) + 1;
    const column = lineEl ? getCaretPosition(lineEl) + 1 : 1;
    setCursorPosition(line, column);
  }, [setCursorPosition]);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && !isInternalChange) {
      const currentMd = htmlToMarkdown(editorRef.current.innerHTML);
      if (currentMd !== fileContent) {
        editorRef.current.innerHTML = parseMarkdownToHtml(fileContent);
        syncHeadingIds(editorRef.current);
        applySyntaxHighlighting(editorRef.current);
      }
    }
  }, [fileContent, isInternalChange]);

  // Update content in store
  const updateContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsInternalChange(true);
    syncHeadingIds(editor);
    setFileContent(htmlToMarkdown(editor.innerHTML));
    reportCursorPosition();
    setTimeout(() => setIsInternalChange(false), 0);
  }, [reportCursorPosition, setFileContent]);

  // Handle context menu - save selection before showing menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Save current selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Insert syntax at cursor - restore selection first
  const insertSyntax = useCallback((prefix: string, suffix?: string, options?: InsertOptions) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Restore saved selection
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    // Focus editor
    editor.focus();

    // When a snippet is inserted (table, footnote, …) it almost always spans
    // multiple lines and represents a self-contained block. We always insert
    // it with replace semantics so the user gets the snippet verbatim at the
    // cursor — any active selection is overwritten.
    if (options?.replace) {
      // For selection replacement we use execCommand insertText, which the
      // browser will splice into the active range. The snippet already
      // contains its own newlines.
      document.execCommand('insertText', false, prefix);
    } else {
      const text = prefix + (suffix || '');
      document.execCommand('insertText', false, text);
    }
    updateContent();
  }, [updateContent]);

  // Handle input - detect markdown prefix + space pattern
  const handleInput = useCallback((e: React.FormEvent) => {
    const editor = editorRef.current;
    if (!editor) return;

    const lineEl = getCurrentLineElement(editor);
    if (!lineEl) return;

    const text = lineEl.textContent || '';
    const pos = getCaretPosition(lineEl);

    if (lineEl.getAttribute('data-type') === 'li' && lineEl.getAttribute('data-list') === 'ul') {
      const taskInListMatch = text.match(/^\s*\[([ xX])\]\s*(.*)$/);
      if (taskInListMatch) {
        const checked = taskInListMatch[1].toLowerCase() === 'x';
        const content = (taskInListMatch[2] || '').replace(/^\s+/, '');
        const taskEl = createLineElement({
          type: 'task',
          prefix: `- [${taskInListMatch[1]}]`,
          content,
          checked,
        }, content);

        lineEl.replaceWith(taskEl);
        const textTarget = taskEl.querySelector('.md-task-text');
        setCaretPosition((textTarget as HTMLElement) || taskEl, content.length);

        updateContent();
        return;
      }
    }

    // Check if user typed space after a markdown prefix
    if (e.nativeEvent instanceof InputEvent && e.nativeEvent.data === ' ') {
      const textBeforeSpace = text.substring(0, pos - 1).trim();
      const blockType = detectBlockType(textBeforeSpace);

      if (blockType) {
        const contentAfter = text.substring(pos);
        const newEl = createLineElement(blockType, contentAfter);
        lineEl.replaceWith(newEl);
        setCaretPosition(newEl, contentAfter.length);

        updateContent();
        return;
      }
    }

    updateContent();
  }, [updateContent]);

  // Handle key down
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const lineEl = getCurrentLineElement(editor);

    // Enter: create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (lineEl) {
        const newLine = document.createElement('div');
        newLine.className = 'md-line';
        newLine.setAttribute('data-type', 'p');
        newLine.innerHTML = '<br>';

        const currentType = lineEl.getAttribute('data-type');
        const currentText = lineEl.textContent || '';

        if (currentType === 'li' && currentText.trim() !== '') {
          newLine.setAttribute('data-type', 'li');
          newLine.setAttribute('data-list', lineEl.getAttribute('data-list') || 'ul');
          if (lineEl.getAttribute('data-list') === 'ol') {
            const currentNum = parseInt(lineEl.getAttribute('data-num') || '1');
            newLine.setAttribute('data-num', String(currentNum + 1));
          }
        }

        if (currentType === 'li' && currentText.trim() === '') {
          lineEl.setAttribute('data-type', 'p');
          lineEl.removeAttribute('data-list');
          lineEl.removeAttribute('data-num');
        }

        lineEl.after(newLine);

        const range = document.createRange();
        range.selectNodeContents(newLine);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        updateContent();
      }
      return;
    }

    // Backspace at start of line: reset to paragraph
    if (e.key === 'Backspace' && lineEl) {
      const cursorPos = getCaretPosition(lineEl);
      const currentText = lineEl.textContent || '';

      if (cursorPos === 0 && currentText.length === 0) {
        const currentType = lineEl.getAttribute('data-type');
        if (currentType && currentType !== 'p') {
          e.preventDefault();
          lineEl.className = 'md-line';
          lineEl.setAttribute('data-type', 'p');
          lineEl.removeAttribute('data-list');
          lineEl.removeAttribute('data-num');
          lineEl.removeAttribute('data-checked');
          lineEl.innerHTML = '<br>';
          updateContent();
        }
      }
      return;
    }

    // Tab: insert spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      updateContent();
      return;
    }

    // Ctrl/Cmd + 1-6: Set heading
    if ((e.ctrlKey || e.metaKey) && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      e.preventDefault();
      if (lineEl && lineEl.classList.contains('md-line')) {
        const text = lineEl.textContent || '';
        lineEl.setAttribute('data-type', `h${e.key}`);
        lineEl.innerHTML = parseInlineMarkdown(text);
        updateContent();
      }
      return;
    }

    // Ctrl/Cmd + B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      const selected = sel.toString();
      if (selected) {
        document.execCommand('insertHTML', false, `<strong class="md-bold">${selected}</strong>`);
        updateContent();
      }
      return;
    }

    // Ctrl/Cmd + I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      const selected = sel.toString();
      if (selected) {
        document.execCommand('insertHTML', false, `<em class="md-italic">${selected}</em>`);
        updateContent();
      }
      return;
    }

    reportCursorPosition();

  }, [reportCursorPosition, updateContent]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const task = target.closest('.md-task');
      if (task instanceof HTMLElement) {
        task.setAttribute('data-checked', String(target.checked));
        updateContent();
      }
      return;
    }

    const link = target.closest('a.md-link');
    if (link instanceof HTMLAnchorElement && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const href = link.href;
      if (href) {
        void window.electronAPI?.openExternal?.(href);
        if (!window.electronAPI?.openExternal) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
      return;
    }

    reportCursorPosition();
  }, [reportCursorPosition, updateContent]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  }, [updateContent]);

  return (
    <>
      <div
        className={clsx(
          'flex-1 overflow-y-auto',
          'min-w-0',
          'bg-white dark:bg-slate-900',
          _className
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            editorRef.current?.focus();
          }
        }}
      >
        <div
          ref={editorRef}
          data-testid="editor"
          data-placeholder="Start typing Markdown..."
          contentEditable
          role="textbox"
          aria-label="Markdown editor"
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={reportCursorPosition}
          onMouseUp={reportCursorPosition}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          className="typora-editor mx-auto min-h-full w-full max-w-[900px] px-8 py-10 sm:px-12 lg:px-16 outline-none"
          style={textStyle}
          spellCheck
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onInsert={insertSyntax}
        />
      )}
    </>
  );
}
