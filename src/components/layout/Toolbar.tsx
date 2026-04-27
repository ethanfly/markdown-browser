import { FilePlus, FolderOpen, Moon, Save, Settings, Sun, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';

interface ToolbarProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
}

export function Toolbar({ onNewFile, onOpenFile, onSaveFile }: ToolbarProps) {
  const { currentFile, sidebarOpen, toggleSidebar, toggleSettings, focusMode, isDirty } = useAppStore();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useI18n();

  if (focusMode) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center justify-center
                      opacity-0 hover:opacity-100 transition-opacity duration-200
                      bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <span className="text-sm text-slate-600 dark:text-slate-400 truncate px-4">
          {isDirty ? '* ' : ''}{currentFile?.name || t('noFileSelected')}
        </span>
      </div>
    );
  }

  return (
    <header className="h-10 flex items-center justify-between px-3
                       bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700
                       select-none">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          data-testid="toggle-sidebar"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500
                     transition-colors duration-150"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          title="Ctrl+\\"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <PanelLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('appName')}
        </span>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={onNewFile}
          data-testid="new-file"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-150"
          aria-label={t('new')}
          title="Ctrl+N"
        >
          <FilePlus className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenFile}
          data-testid="open-file"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-150"
          aria-label={t('open')}
          title="Ctrl+O"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onSaveFile}
          data-testid="save-file"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-150"
          aria-label={t('save')}
          title="Ctrl+S"
        >
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Center - Current file name */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
          {isDirty ? '* ' : ''}{currentFile?.name || t('noFileSelected')}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          data-testid="toggle-theme"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500
                     transition-colors duration-150"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-slate-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
        <button
          onClick={toggleSettings}
          data-testid="open-settings"
          className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     focus-visible:ring-2 focus-visible:ring-blue-500
                     transition-colors duration-150"
          aria-label={t('settings')}
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </header>
  );
}
