import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
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
  children?: MenuItem[];
}

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
    ],
  },
];

interface SubMenuProps {
  items: MenuItem[];
  onClose: () => void;
  onInsert: (prefix: string, suffix?: string) => void;
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
            if (item.prefix !== undefined) {
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
  onInsert: (prefix: string, suffix?: string) => void;
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInlineMarkdown(text: string): string {
  let html = escapeHtml(text);

  html = html
    .replace(/!\[([^\]]*?)\]\(([^)]+?)\)/g, '<img src="$2" alt="$1" class="md-image">')
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" class="md-link">$1</a>')
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="md-bold">$1</strong>')
    .replace(/__([^_\n]+?)__/g, '<strong class="md-bold">$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="md-italic">$1</em>')
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em class="md-italic">$1</em>')
    .replace(/~~([^~\n]+?)~~/g, '<del class="md-strike">$1</del>')
    .replace(/==([^=\n]+?)==/g, '<mark class="md-highlight">$1</mark>')
    .replace(/`([^`\n]+?)`/g, '<code class="md-code">$1</code>')
    .replace(/\^([^^\n]+?)\^/g, '<sup class="md-superscript">$1</sup>')
    .replace(/(?<!~)~([^~\n]+?)~(?!~)/g, '<sub class="md-subscript">$1</sub>');

  return html;
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

    if (tag === 'div' && className.includes('md-line')) {
      switch (dataType) {
        case 'h1': return `# ${children}\n`;
        case 'h2': return `## ${children}\n`;
        case 'h3': return `### ${children}\n`;
        case 'h4': return `#### ${children}\n`;
        case 'h5': return `##### ${children}\n`;
        case 'h6': return `###### ${children}\n`;
        case 'li':
          const listType = el.getAttribute('data-list');
          const num = el.getAttribute('data-num') || '1';
          return listType === 'ol' ? `${num}. ${children}\n` : `- ${children}\n`;
        case 'task':
          const checked = el.getAttribute('data-checked') === 'true';
          return `- [${checked ? 'x' : ' '}] ${children}\n`;
        case 'p':
        default:
          return `${children}\n`;
      }
    }

    if (tag === 'pre' && className.includes('md-code-block')) {
      const code = el.querySelector('code')?.textContent || '';
      return `\`\`\`\n${code}\`\`\`\n`;
    }

    if (tag === 'blockquote') {
      return `> ${children}\n`;
    }

    if (tag === 'hr') {
      return '---\n';
    }

    if (className.includes('md-bold') || tag === 'strong') return `**${children}**`;
    if (className.includes('md-italic') || tag === 'em') return `*${children}*`;
    if (className.includes('md-strike') || tag === 'del') return `~~${children}~~`;
    if (className.includes('md-highlight') || tag === 'mark') return `==${children}==`;
    if (className.includes('md-code') || (tag === 'code' && !el.closest('pre'))) return `\`${children}\``;
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

    return children;
  };

  return Array.from(temp.childNodes).map(processNode).join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMarkdownToHtml(md: string): string {
  if (!md) return '<div class="md-line" data-type="p"><br></div>';

  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let headingIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const fenceMatch = line.match(/^```(.*)$/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = fenceMatch[1].trim();
        codeLines = [];
      } else {
        result.push(
          `<pre class="md-code-block" data-lang="${codeLanguage}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
        );
        inCodeBlock = false;
        codeLanguage = '';
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      result.push(`<div id="heading-${headingIndex}" class="md-line" data-type="h${hMatch[1].length}">${parseInlineMarkdown(hMatch[2])}</div>`);
      headingIndex += 1;
      continue;
    }

    const taskMatch = line.match(/^- \[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === 'x';
      result.push(`<div class="md-line md-task" data-type="task" data-checked="${checked}"><input type="checkbox" ${checked ? 'checked' : ''}><span class="md-task-text">${parseInlineMarkdown(taskMatch[2])}</span></div>`);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      result.push(`<div class="md-line" data-type="li" data-list="ul">${parseInlineMarkdown(ulMatch[1])}</div>`);
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      result.push(`<div class="md-line" data-type="li" data-list="ol" data-num="${olMatch[1]}">${parseInlineMarkdown(olMatch[2])}</div>`);
      continue;
    }

    if (line.startsWith('> ')) {
      result.push(`<blockquote class="md-blockquote">${parseInlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      result.push('<hr class="md-hr">');
      continue;
    }

    if (line.trim() === '') {
      result.push('<div class="md-line" data-type="p"><br></div>');
      continue;
    }

    result.push(`<div class="md-line" data-type="p">${parseInlineMarkdown(line)}</div>`);
  }

  if (inCodeBlock) {
    result.push(
      `<pre class="md-code-block" data-lang="${codeLanguage}"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
    );
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
  const insertSyntax = useCallback((prefix: string, suffix?: string) => {
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

    // Insert the syntax text
    const text = prefix + (suffix || '');
    document.execCommand('insertText', false, text);
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
