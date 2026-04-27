import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useTheme() {
  const { settings, updateSettings } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;

    if (settings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const isDark = () => {
    if (settings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return settings.theme === 'dark';
  };

  return {
    theme: settings.theme,
    setTheme,
    toggleTheme,
    isDark: isDark(),
  };
}
