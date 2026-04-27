import React, { useState, useEffect, useCallback } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../stores/appStore';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useI18n();
  const { currentFile, isDirty } = useAppStore();

  useEffect(() => {
    // Check initial maximize state
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then((maximized) => {
        setIsMaximized(maximized);
      });
    }

    // Listen for maximize/unmaximize events
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);

    window.electronAPI?.onMaximize?.(handleMaximize);
    window.electronAPI?.onUnmaximize?.(handleUnmaximize);
  }, []);

  const handleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.minimizeWindow?.();
  }, []);

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.maximizeWindow?.();
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.closeWindow?.();
  }, []);

  return (
    <div
      className={clsx(
        'h-8 flex items-center justify-between',
        'bg-slate-100 dark:bg-slate-800',
        'border-b border-slate-200 dark:border-slate-700',
        'select-none'
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Menu / Title */}
      <div className="flex items-center h-full px-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {t('appName')}
        </span>
      </div>

      {/* Center: File name (optional) */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[360px]">
          {isDirty ? '* ' : ''}{currentFile?.name || t('noFileSelected')}
        </span>
      </div>

      {/* Right: Window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMinimize}
          className={clsx(
            'h-full w-12 flex items-center justify-center',
            'text-slate-500 dark:text-slate-400',
            'hover:bg-slate-200 dark:hover:bg-slate-700',
            'transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
          aria-label={t('minimize')}
          title={t('minimize')}
        >
          <Minus size={14} />
        </button>

        {/* Maximize / Restore */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMaximize}
          className={clsx(
            'h-full w-12 flex items-center justify-center',
            'text-slate-500 dark:text-slate-400',
            'hover:bg-slate-200 dark:hover:bg-slate-700',
            'transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
          aria-label={isMaximized ? t('restore') : t('maximize')}
          title={isMaximized ? t('restore') : t('maximize')}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>

        {/* Close */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className={clsx(
            'h-full w-12 flex items-center justify-center',
            'text-slate-500 dark:text-slate-400',
            'hover:bg-red-500 hover:text-white',
            'transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
          aria-label={t('close')}
          title={t('close')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
