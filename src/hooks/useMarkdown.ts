import { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import type { OutlineItem } from '../types';

export function useMarkdown() {
  const { fileContent } = useAppStore();

  const outline = useMemo<OutlineItem[]>(() => {
    if (!fileContent) return [];

    const lines = fileContent.split('\n');
    const items: OutlineItem[] = [];

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = `heading-${items.length}`;

        items.push({
          id,
          level,
          text,
          line: index + 1,
        });
      }
    });

    return items;
  }, [fileContent]);

  const stats = useMemo(() => {
    if (!fileContent) {
      return { words: 0, lines: 0, characters: 0 };
    }

    const lines = fileContent.split('\n').length;
    const words = fileContent.trim() ? fileContent.trim().split(/\s+/).length : 0;
    const characters = fileContent.length;

    return { words, lines, characters };
  }, [fileContent]);

  return {
    outline,
    stats,
  };
}
