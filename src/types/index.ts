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
export type OutlineBlockKind =
  | 'heading'
  | 'table'
  | 'blockquote'
  | 'code-block'
  | 'list'
  | 'task-list';

/** A single block in the editor, surfaced in the outline panel. */
export interface OutlineItem {
  id: string;
  /** Heading level (1-6) for headings, 1 for other block kinds. */
  level: number;
  /** What kind of block this is — drives the icon and the toggle filter. */
  kind: OutlineBlockKind;
  /** Short preview text (heading text, first table cell, code language, …). */
  text: string;
  /** Optional sub-line shown muted under the main label. */
  hint?: string;
  /** 1-based line number in the source markdown, used for the line locator. */
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
