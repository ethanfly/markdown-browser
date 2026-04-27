// File system types
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
  modified?: number;
}

// Re-export for convenience
export type { FileNode as FileNodeType };

// Outline/TOC types
export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  line?: number;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: 'inter' | 'georgia' | 'system';
  lineHeight: number;
  showSidebar: boolean;
  showOutline: boolean;
  showWordCount: boolean;
  showLineNumber: boolean;
  focusMode: boolean;
}

// App state types
export interface AppState {
  // Current file
  currentFile: FileNode | null;
  fileContent: string;

  // File tree
  fileTree: FileNode[];
  expandedFolders: Set<string>;

  // Outline
  outline: OutlineItem[];
  activeHeadingId: string | null;

  // UI state
  sidebarOpen: boolean;
  outlineOpen: boolean;
  settingsOpen: boolean;
  focusMode: boolean;

  // Settings
  settings: AppSettings;

  // Stats
  wordCount: number;
  lineCount: number;
  cursorLine: number;
  cursorColumn: number;
}

// Theme types
export type Theme = 'light' | 'dark';
