import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

export function useKeyboardShortcuts() {
  const {
    toggleSidebar,
    toggleOutline,
    toggleFocusMode,
    toggleSettings,
    sidebarOpen,
    outlineOpen,
    focusMode,
  } = useAppStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // Ignore if in contentEditable editor (let editor handle shortcuts)
    const target = e.target as HTMLElement | null;
    if (target) {
      // Check if target itself is contentEditable
      if (target.isContentEditable === true) {
        return;
      }
      // Check if target is inside a contentEditable element
      if (target.closest && target.closest('[contenteditable="true"]')) {
        return;
      }
      // Also check if target has contenteditable attribute directly
      if (target.getAttribute && target.getAttribute('contenteditable') === 'true') {
        return;
      }
    }

    const { ctrlKey, metaKey, shiftKey, key } = e;
    const cmdOrCtrl = ctrlKey || metaKey;

    // Ctrl/Cmd + \: Toggle sidebar
    if (cmdOrCtrl && key === '\\' && !shiftKey) {
      e.preventDefault();
      toggleSidebar();
      return;
    }

    // Ctrl/Cmd + Shift + O: Toggle outline
    if (cmdOrCtrl && shiftKey && key.toLowerCase() === 'o') {
      e.preventDefault();
      toggleOutline();
      return;
    }

    // Ctrl/Cmd + Shift + F: Focus mode
    if (cmdOrCtrl && shiftKey && key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFocusMode();
      return;
    }

    // Ctrl/Cmd + ,: Open settings
    if (cmdOrCtrl && key === ',') {
      e.preventDefault();
      toggleSettings();
      return;
    }

    // Escape: Exit focus mode or close panels
    if (key === 'Escape') {
      if (focusMode) {
        e.preventDefault();
        toggleFocusMode();
      }
      return;
    }

    // F11: Toggle fullscreen
    if (key === 'F11') {
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
      return;
    }
  }, [toggleSidebar, toggleOutline, toggleFocusMode, toggleSettings, focusMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { keys: 'Ctrl+\\', action: 'Toggle sidebar', isActive: sidebarOpen },
      { keys: 'Ctrl+Shift+O', action: 'Toggle outline', isActive: outlineOpen },
      { keys: 'Ctrl+Shift+F', action: 'Focus mode', isActive: focusMode },
      { keys: 'Ctrl+,', action: 'Open settings' },
      { keys: 'F11', action: 'Toggle fullscreen' },
      { keys: 'Esc', action: 'Exit focus mode' },
    ],
  };
}
