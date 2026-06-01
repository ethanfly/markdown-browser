import { FileNode } from './index';

export interface FileOperationResult {
  success: boolean;
  path?: string;
  content?: string;
  tree?: FileNode[];
  error?: string;
}

export interface FileOpenResult {
  path: string;
  content: string;
  folderPath?: string;
  tree?: FileNode[];
}

export interface ElectronAPI {
  // Initial file passed from main process (e.g. via file association or CLI)
  initialFilePath: string | null;

  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // File dialogs
  openFileDialog: () => Promise<FileOpenResult | null>;
  openFolderDialog: () => Promise<{ path: string; tree: FileNode[] } | null>;
  saveAsDialog: () => Promise<string | null>;

  // File operations
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  saveFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;

  // Events
  onFileOpened: (callback: (payload: FileOpenResult) => void) => () => void;
  onFileOpen: (callback: (path: string) => void) => () => void;
  onFileSaveAsPath: (callback: (path: string) => void) => () => void;
  onFolderOpened: (callback: (path: string, tree: FileNode[]) => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
  onMenuSaveAs: (callback: () => void) => () => void;
  onMenuNew: (callback: () => void) => () => void;
  onMenuOpen: (callback: () => void) => () => void;
  onMenuExportPdf: (callback: () => void) => () => void;
  onMenuToggleSidebar: (callback: () => void) => () => void;
  onMenuToggleOutline: (callback: () => void) => () => void;
  onMenuFocusMode: (callback: () => void) => () => void;
  onMenuThemeLight: (callback: () => void) => () => void;
  onMenuThemeDark: (callback: () => void) => () => void;
  onMenuThemeSystem: (callback: () => void) => () => void;
  onMenuShortcuts: (callback: () => void) => () => void;
  onMenuLangEn: (callback: () => void) => () => void;
  onMenuLangZh: (callback: () => void) => () => void;

  // Window events
  onMaximize: (callback: () => void) => void;
  onUnmaximize: (callback: () => void) => void;

  // Shell
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
