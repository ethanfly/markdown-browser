import { useEffect, useMemo, useRef } from 'react';
import {
  Hash,
  Table,
  Quote,
  Code2,
  List,
  ListChecks,
  Search,
  X,
  FileText,
} from 'lucide-react';
import { useMarkdown } from '../../hooks/useMarkdown';
import { useAppStore } from '../../stores/appStore';
import { useI18n } from '../../i18n';
import clsx from 'clsx';
import type { OutlineItem } from '../../types';

/**
 * Map an outline kind to the lucide icon component used to label it. The
 * `Hash` icon is reserved for headings because it visually echoes the `#`
 * marker that the user types.
 */
const ICONS = {
  heading: Hash,
  table: Table,
  blockquote: Quote,
  'code-block': Code2,
  list: List,
  'task-list': ListChecks,
} as const;

function itemMatchesSearch(item: OutlineItem, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    item.text.toLowerCase().includes(needle) ||
    (item.hint ? item.hint.toLowerCase().includes(needle) : false)
  );
}

export function Outline() {
  const {
    outlineOpen,
    activeHeadingId,
    setActiveHeading,
    outlineFilter,
    outlineSearch,
    setOutlineFilter,
    setOutlineSearch,
  } = useAppStore();
  const { outline, stats } = useMarkdown();
  const { t } = useI18n();

  // Per-kind counts so the user can see at a glance how many of each block
  // the document contains. Computed off the unfiltered list so toggling the
  // filter doesn't change the numbers.
  const counts = useMemo(() => {
    const c = { all: outline.length, heading: 0, table: 0, blockquote: 0, 'code-block': 0, list: 0 };
    for (const item of outline) {
      if (item.kind in c) c[item.kind as keyof typeof c] += 1;
    }
    return c;
  }, [outline]);

  // Apply the toggle + search filter to produce the visible list.
  const visibleItems = useMemo(() => {
    const filtered = outlineFilter === 'headings'
      ? outline.filter((item) => item.kind === 'heading')
      : outline;
    if (!outlineSearch.trim()) return filtered;
    return filtered.filter((item) => itemMatchesSearch(item, outlineSearch));
  }, [outline, outlineFilter, outlineSearch]);

  // Track the editor DOM node so we can attach an IntersectionObserver that
  // updates the active block as the user scrolls. Re-attach when the file
  // content changes (the DOM is rebuilt).
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<string | null>(null);

  useEffect(() => {
    if (!outlineOpen) return;
    const editor = document.querySelector<HTMLElement>('[data-testid="editor"]');
    if (!editor) return;

    // Gather every block in the document that has an id we know about. The
    // observer fires once per block on enter/exit; we pick whichever block
    // sits closest to the top of the viewport.
    const targets: HTMLElement[] = [];
    editor.querySelectorAll<HTMLElement>('[id^="heading-"], [id^="block-"]').forEach((el) => {
      targets.push(el);
    });
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Among the entries, prefer the one closest to the top of the
        // viewport (smallest non-negative top). When the user is above the
        // first block, fall back to the first one.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({ id: e.target.id, top: e.boundingClientRect.top }))
          .sort((a, b) => a.top - b.top);
        let nextId: string | null = null;
        if (visible.length > 0) {
          nextId = visible[0].id;
        } else {
          // No target is currently intersecting — find the last one whose
          // top is above the viewport (we've scrolled past it).
          let last: HTMLElement | null = null;
          for (const t of targets) {
            if (t.getBoundingClientRect().top < 0) last = t;
            else break;
          }
          nextId = last?.id ?? targets[0]?.id ?? null;
        }
        if (nextId && nextId !== lastActiveRef.current) {
          lastActiveRef.current = nextId;
          setActiveHeading(nextId);
        }
      },
      {
        root: editor.closest('.overflow-y-auto') ?? null,
        // Tighter top band so the highlight updates as the user scrolls
        // without flickering on tiny mouse-wheel ticks.
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [outlineOpen, outline, setActiveHeading]);

  if (!outlineOpen) return null;

  const scrollToBlock = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveHeading(id);
    // Place the caret at the start of the block so the editor can pick up
    // subsequent typing from the new context.
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  return (
    <aside data-testid="outline" className="w-56 shrink-0 h-full flex flex-col bg-slate-50 dark:bg-slate-800
                      border-l border-slate-200 dark:border-slate-700">
      {/* Header: title + filter toggle */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('outline')}
          </h3>
          <span
            className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums"
            title={`${stats.lines} lines · ${stats.words} words`}
          >
            {visibleItems.length}/{outline.length}
          </span>
        </div>

        {/* Filter toggle: All blocks / Headings only */}
        <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
          <button
            type="button"
            data-testid="outline-filter-all"
            onClick={() => setOutlineFilter('all')}
            className={clsx(
              'flex-1 px-2 py-1 transition-colors',
              outlineFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
            )}
            title={t('outlineAll')}
          >
            {t('outlineAll')}
          </button>
          <button
            type="button"
            data-testid="outline-filter-headings"
            onClick={() => setOutlineFilter('headings')}
            className={clsx(
              'flex-1 px-2 py-1 border-l border-slate-200 dark:border-slate-700 transition-colors',
              outlineFilter === 'headings'
                ? 'bg-blue-500 text-white'
                : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
            )}
            title={t('outlineHeadingsOnly')}
          >
            {t('outlineHeadingsOnly')}
          </button>
        </div>

        {/* Search input — filters by item text / hint. */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={outlineSearch}
            onChange={(e) => setOutlineSearch(e.target.value)}
            placeholder={t('outlineSearchPlaceholder')}
            className="w-full pl-7 pr-7 py-1 text-xs rounded-md
                       bg-white dark:bg-slate-900
                       border border-slate-200 dark:border-slate-700
                       text-slate-700 dark:text-slate-200
                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {outlineSearch && (
            <button
              type="button"
              onClick={() => setOutlineSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded
                         text-slate-400 hover:text-slate-600 dark:hover:text-slate-200
                         hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Per-kind summary chips — also act as quick filters. */}
        {outlineFilter === 'all' && (
          <div className="flex flex-wrap gap-1 pt-1">
            {(['heading', 'table', 'blockquote', 'code-block', 'list'] as const).map((kind) =>
              counts[kind] > 0 ? (
                <span
                  key={kind}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded
                             bg-slate-100 dark:bg-slate-700
                             text-slate-600 dark:text-slate-300"
                >
                  {(() => {
                    const Icon = ICONS[kind];
                    return <Icon className="w-3 h-3" />;
                  })()}
                  {counts[kind]}
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* Outline items */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-2">
        {visibleItems.length > 0 ? (
          <nav className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = ICONS[item.kind] ?? FileText;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToBlock(item.id)}
                  className={clsx(
                    'group w-full text-left px-3 py-1 text-sm rounded-md transition-colors cursor-pointer',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    'focus-visible:ring-2 focus-visible:ring-blue-500',
                    activeHeadingId === item.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                  style={{
                    paddingLeft: item.kind === 'heading'
                      ? `${(item.level - 1) * 10 + 12}px`
                      : '12px',
                  }}
                  title={item.hint ? `${item.text} — ${item.hint}` : item.text}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon
                      className={clsx(
                        'w-3.5 h-3.5 mt-0.5 shrink-0',
                        item.kind === 'heading'
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-500',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] leading-snug">{item.text}</span>
                      {item.hint && (
                        <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                          {item.hint}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {outlineSearch ? t('outlineNoMatches') : t('noHeadings')}
          </div>
        )}
      </div>
    </aside>
  );
}
