import { X, Moon, Sun, Monitor } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import clsx from 'clsx';

export function SettingsPanel() {
  const { settingsOpen, toggleSettings, settings, updateSettings } = useAppStore();
  const { setTheme, theme } = useTheme();
  const { t, language, setLanguage } = useI18n();

  useEffect(() => {
    if (!settingsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        toggleSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen, toggleSettings]);

  if (!settingsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
        onClick={toggleSettings}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-800
                      shadow-xl z-50 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {t('settings')}
          </h2>
          <button
            onClick={toggleSettings}
            data-testid="close-settings"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700
                       transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('close')}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Language Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400
                           uppercase tracking-wider mb-3">
              {t('language')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={clsx(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
                  'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500',
                  language === 'en'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <span className="text-sm">{t('english')}</span>
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={clsx(
                  'flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
                  'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500',
                  language === 'zh'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <span className="text-sm">{t('chinese')}</span>
              </button>
            </div>
          </section>

          {/* Theme Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400
                           uppercase tracking-wider mb-3">
              {t('theme')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors',
                  'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500',
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">{t('themeLight')}</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors',
                  'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500',
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">{t('themeDark')}</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors',
                  'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500',
                  theme === 'system'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-xs">{t('themeSystem')}</span>
              </button>
            </div>
          </section>

          {/* Typography Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400
                           uppercase tracking-wider mb-3">
              {t('fontFamily')}
            </h3>
            <div className="space-y-4">
              {/* Font Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-700 dark:text-slate-300">
                    {t('fontSize')}
                  </label>
                  <span className="text-sm text-slate-500">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg
                             appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Line Height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-700 dark:text-slate-300">
                    {t('lineHeight')}
                  </label>
                  <span className="text-sm text-slate-500">{settings.lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="2.2"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg
                             appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="text-sm text-slate-700 dark:text-slate-300 block mb-2">
                  {t('fontFamily')}
                </label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value as 'inter' | 'georgia' | 'system' })}
                  className="w-full px-3 py-2 text-sm rounded-md
                             bg-white dark:bg-slate-700
                             border border-slate-200 dark:border-slate-600
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inter">Inter</option>
                  <option value="georgia">Georgia</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </section>

          {/* View Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400
                           uppercase tracking-wider mb-3">
              {t('view')}
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('words')}
                </span>
                <input
                  type="checkbox"
                  checked={settings.showWordCount}
                  onChange={(e) => updateSettings({ showWordCount: e.target.checked })}
                  className="w-4 h-4 accent-blue-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('line')}
                </span>
                <input
                  type="checkbox"
                  checked={settings.showLineNumber}
                  onChange={(e) => updateSettings({ showLineNumber: e.target.checked })}
                  className="w-4 h-4 accent-blue-500"
                />
              </label>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400
                           uppercase tracking-wider mb-3">
              {t('shortcuts')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('toggleSidebar')}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  Ctrl+\
                </kbd>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('toggleOutline')}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  Ctrl+Shift+O
                </kbd>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('focusMode')}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  Ctrl+Shift+F
                </kbd>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('fullscreen')}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  F11
                </kbd>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('settings')}</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  Ctrl+,
                </kbd>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
