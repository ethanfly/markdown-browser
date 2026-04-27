import { FileText, AlignLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useMarkdown } from '../../hooks/useMarkdown';
import { useI18n } from '../../i18n';

export function StatusBar() {
  const { currentFile, focusMode, cursorLine, cursorColumn, isDirty, settings } = useAppStore();
  const { stats } = useMarkdown();
  const { t } = useI18n();

  if (focusMode) return null;

  return (
    <footer className="h-6 flex items-center justify-between px-3 text-xs
                       bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700
                       text-slate-500 dark:text-slate-400 select-none">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          <span>{currentFile?.name || t('noFileSelected')}</span>
        </span>
        {settings.showWordCount && (
          <span className="flex items-center gap-1.5">
            <AlignLeft className="w-3 h-3" />
            <span>{stats.words.toLocaleString()} {t('words')}</span>
          </span>
        )}
        <span className={isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
          {isDirty ? t('unsaved') : t('saved')}
        </span>
      </div>

      {/* Center section */}
      <div className="flex items-center gap-4">
        <span>{stats.lines} {t('lines')}</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span>UTF-8</span>
        <span>{t('line')} {cursorLine}, {t('column')} {cursorColumn}</span>
      </div>
    </footer>
  );
}
