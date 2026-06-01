import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode, OutlineItem, AppSettings } from '../types';

export type Language = 'en' | 'zh';

export type OutlineFilter = 'all' | 'headings';

interface AppStore {
  // Current file
  currentFile: FileNode | null;
  fileContent: string;
  currentFilePath: string | null;
  isDirty: boolean;

  // File tree
  fileTree: FileNode[];
  expandedFolders: Set<string>;

  // Outline
  outline: OutlineItem[];
  activeHeadingId: string | null;
  outlineFilter: OutlineFilter;
  outlineSearch: string;

  // UI state
  sidebarOpen: boolean;
  outlineOpen: boolean;
  settingsOpen: boolean;
  focusMode: boolean;

  // Settings
  settings: AppSettings;
  language: Language;

  // Stats
  wordCount: number;
  lineCount: number;
  cursorLine: number;
  cursorColumn: number;

  // Actions
  setCurrentFile: (file: FileNode | null) => void;
  setFileContent: (content: string, options?: { dirty?: boolean }) => void;
  setCurrentFilePath: (path: string | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setFileTree: (tree: FileNode[]) => void;
  toggleFolder: (folderId: string) => void;
  setOutline: (outline: OutlineItem[]) => void;
  setActiveHeading: (id: string | null) => void;
  setOutlineFilter: (filter: OutlineFilter) => void;
  setOutlineSearch: (query: string) => void;
  toggleSidebar: () => void;
  toggleOutline: () => void;
  toggleSettings: () => void;
  toggleFocusMode: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setLanguage: (lang: Language) => void;
  setStats: (wordCount: number, lineCount: number) => void;
  setCursorPosition: (line: number, column: number) => void;
}

function getDocumentStats(content: string) {
  return {
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    lineCount: content.length ? content.split('\n').length : 1,
  };
}

function collectOpenFolders(nodes: FileNode[], depth = 0): string[] {
  const ids: string[] = [];

  for (const node of nodes) {
    if (node.type === 'folder') {
      if (depth < 2) {
        ids.push(node.id);
      }
      if (node.children) {
        ids.push(...collectOpenFolders(node.children, depth + 1));
      }
    }
  }

  return ids;
}

function updateTreeFileContent(nodes: FileNode[], fileId: string, content: string): FileNode[] {
  return nodes.map((node) => {
    if (node.id === fileId) {
      return { ...node, content, modified: Date.now() };
    }

    if (node.children) {
      return { ...node, children: updateTreeFileContent(node.children, fileId, content) };
    }

    return node;
  });
}

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 16,
  fontFamily: 'inter',
  lineHeight: 1.75,
  showSidebar: true,
  showOutline: true,
  showWordCount: true,
  showLineNumber: false,
  focusMode: false,
};

const getSystemLanguage = (): Language => {
  const stored = localStorage.getItem('markdown-editor-language');
  if (stored === 'en' || stored === 'zh') {
    return stored;
  }
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentFile: null,
      fileContent: '',
      currentFilePath: null,
      isDirty: false,
      fileTree: [],
      expandedFolders: new Set<string>(),
      outline: [],
      activeHeadingId: null,
      outlineFilter: 'all',
      outlineSearch: '',
      sidebarOpen: true,
      outlineOpen: true,
      settingsOpen: false,
      focusMode: false,
      settings: defaultSettings,
      language: getSystemLanguage(),
      wordCount: 0,
      lineCount: 0,
      cursorLine: 1,
      cursorColumn: 1,

      // Actions
      setCurrentFile: (file) => set({
        currentFile: file,
        currentFilePath: file?.path || null,
      }),

      setFileContent: (content, options) => {
        const { wordCount, lineCount } = getDocumentStats(content);
        const { currentFile, fileTree } = get();
        const dirty = options?.dirty ?? true;

        set({
          fileContent: content,
          wordCount,
          lineCount,
          isDirty: dirty,
          currentFile: currentFile ? { ...currentFile, content } : currentFile,
          fileTree: currentFile ? updateTreeFileContent(fileTree, currentFile.id, content) : fileTree,
        });
      },

      setCurrentFilePath: (path) => set({ currentFilePath: path }),

      setIsDirty: (dirty) => set({ isDirty: dirty }),

      setFileTree: (tree) => set({
        fileTree: tree,
        expandedFolders: new Set(collectOpenFolders(tree)),
      }),

      toggleFolder: (folderId) => {
        const { expandedFolders } = get();
        const newSet = new Set(expandedFolders);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        set({ expandedFolders: newSet });
      },

      setOutline: (outline) => set({ outline }),

      setActiveHeading: (id) => set({ activeHeadingId: id }),

      setOutlineFilter: (filter) => set({ outlineFilter: filter }),
      setOutlineSearch: (query) => set({ outlineSearch: query }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleOutline: () => set((state) => ({ outlineOpen: !state.outlineOpen })),

      toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      setLanguage: (lang) => {
        localStorage.setItem('markdown-editor-language', lang);
        set({ language: lang });
      },

      setStats: (wordCount, lineCount) => set({ wordCount, lineCount }),

      setCursorPosition: (line, column) => set({ cursorLine: line, cursorColumn: column }),
    }),
    {
      name: 'markdown-reader-settings',
      partialize: (state) => ({
        settings: state.settings,
        sidebarOpen: state.sidebarOpen,
        outlineOpen: state.outlineOpen,
        language: state.language,
      }),
    }
  )
);
