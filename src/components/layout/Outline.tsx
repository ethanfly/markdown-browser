import { useMarkdown } from '../../hooks/useMarkdown';
import { useAppStore } from '../../stores/appStore';
import { useI18n } from '../../i18n';
import clsx from 'clsx';

export function Outline() {
  const { outlineOpen, activeHeadingId, setActiveHeading } = useAppStore();
  const { outline } = useMarkdown();
  const { t } = useI18n();

  if (!outlineOpen) return null;

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  return (
    <aside className="w-52 shrink-0 h-full flex flex-col bg-slate-50 dark:bg-slate-800
                      border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('outline')}
        </h3>
      </div>

      {/* Outline items */}
      <div className="flex-1 overflow-y-auto py-2">
        {outline.length > 0 ? (
          <nav className="space-y-0.5">
            {outline.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={clsx(
                  'w-full text-left px-3 py-1 text-sm rounded-md transition-colors cursor-pointer',
                  'hover:bg-slate-100 dark:hover:bg-slate-700',
                  'focus-visible:ring-2 focus-visible:ring-blue-500',
                  activeHeadingId === item.id
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'text-slate-600 dark:text-slate-400'
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                title={item.text}
              >
                <span className="truncate block">{item.text}</span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('noHeadings')}
          </div>
        )}
      </div>
    </aside>
  );
}
