import { useCallback, useEffect, useRef } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { FileTree } from './components/layout/FileTree';
import { Outline } from './components/layout/Outline';
import { StatusBar } from './components/layout/StatusBar';
import { SettingsPanel } from './components/layout/SettingsPanel';
import { TitleBar } from './components/layout/TitleBar';
import { useAppStore } from './stores/appStore';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { I18nProvider, useI18n } from './i18n';
import clsx from 'clsx';
import { WysiwygEditor } from './components/editor/WysiwygEditor';
import type { FileNode } from './types';

const demoContent = `# Welcome to Markdown Editor
A **Typora-inspired** WYSIWYG Markdown editor with practical desktop file handling.

## Typography
**Bold text**, *italic text*, ~~strikethrough~~, ==highlighted==, \`inline code\`.

You can also use ^superscript^ and ~subscript~ — or the HTML equivalents <sup>sup</sup> and <sub>sub</sub>. A line break is just <br/> away, and inline <mark>highlighted</mark> / <kbd>Ctrl</kbd>+<kbd>S</kbd> work too.

[Link example](https://example.com), reference-style links like [docs][doc], and auto-links: <https://example.com>.

[doc]: https://example.com "Documentation"

## Block Elements
### Blockquote
> The best way to predict the future is to create it.
> 
> — Peter Drucker

### Lists
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Second item
3. Third item

### Task List
- [ ] Todo item
- [x] Completed task
- [ ] Another todo

### Tables
| Feature | Status | Notes |
| :--- | :---: | ---: |
| Headings | ✅ | Levels 1–6 |
| Tables | ✅ | GFM with alignment |
| Footnotes | ✅ | See [^1] |
| Task list | ✅ | Click to toggle |

### Code Blocks
\`\`\`typescript
interface User {
  id: string;
  name: string;
  roles: Array<'admin' | 'editor'>;
}

function greet(user: User): string {
  const greeting = user.roles.includes('admin') ? 'Welcome' : 'Hello';
  return \`\${greeting}, \${user.name}!\`;
}
\`\`\`

\`\`\`python
def fib(n: int) -> list[int]:
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
\`\`\`

---

## Footnotes
A claim[^1] deserves a citation, and definitions can be linked too[^syntax].

[^1]: This is the footnote text.

[^syntax]: Markdown reference: <https://commonmark.org>

## Try It
Type Markdown below. Common prefixes such as \`#\`, \`-\`, \`1.\`, \`>\`, and \`- [ ]\` convert as you write. Right-click for a syntax menu including tables and footnotes.
`;

const demoFileTree: FileNode[] = [
  {
    id: 'demo-documents',
    name: 'Documents',
    type: 'folder',
    path: '',
    children: [
      {
        id: 'demo-welcome',
        name: 'welcome.md',
        type: 'file',
        path: '',
        content: demoContent,
      },
      {
        id: 'demo-notes',
        name: 'notes',
        type: 'folder',
        path: '',
        children: [
          {
            id: 'demo-meeting-notes',
            name: 'meeting-notes.md',
            type: 'file',
            path: '',
            content: '# Meeting Notes\n\n## 2026-04-27\n\n- Discussed project timeline\n- Assigned tasks\n- Next meeting: Friday',
          },
        ],
      },
    ],
  },
  {
    id: 'demo-readme',
    name: 'README.md',
    type: 'file',
    path: '',
    content: '# Project README\n\nThis is a sample README file.',
  },
];

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() || 'Untitled.md';
}

function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.children) {
      const child = findFirstFile(node.children);
      if (child) return child;
    }
  }
  return null;
}

function createFileNode(filePath: string, content: string): FileNode {
  return {
    id: filePath || `untitled-${Date.now()}`,
    name: filePath ? getFileName(filePath) : 'Untitled.md',
    type: 'file',
    path: filePath,
    content,
  };
}

function AppShell() {
  const {
    currentFile,
    currentFilePath,
    fileContent,
    outlineOpen,
    focusMode,
    isDirty,
    setFileTree,
    setCurrentFile,
    setFileContent,
    setCurrentFilePath,
    setIsDirty,
    toggleSidebar,
    toggleOutline,
    toggleFocusMode,
    updateSettings,
  } = useAppStore();
  const { t, setLanguage } = useI18n();
  const initializedRef = useRef(false);

  useTheme();
  useKeyboardShortcuts();

  const confirmDiscardChanges = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm(t('discardUnsavedChanges'));
  }, [isDirty, t]);

  const openDocument = useCallback((filePath: string, content: string, tree?: FileNode[]) => {
    if (tree) {
      setFileTree(tree);
    }

    const file = createFileNode(filePath, content);
    setCurrentFile(file);
    setCurrentFilePath(filePath || null);
    setFileContent(content, { dirty: false });
  }, [setCurrentFile, setCurrentFilePath, setFileContent, setFileTree]);

  const handleNewDocument = useCallback(() => {
    if (!confirmDiscardChanges()) return;

    const content = '# Untitled\n\n';
    const file = createFileNode('', content);
    setCurrentFile(file);
    setCurrentFilePath(null);
    setFileContent(content, { dirty: false });
  }, [confirmDiscardChanges, setCurrentFile, setCurrentFilePath, setFileContent]);

  const handleOpenFile = useCallback(async () => {
    if (!confirmDiscardChanges()) return;

    if (!window.electronAPI?.openFileDialog) {
      window.alert(t('desktopOnlyAction'));
      return;
    }

    const result = await window.electronAPI.openFileDialog();
    if (result) {
      openDocument(result.path, result.content, result.tree);
    }
  }, [confirmDiscardChanges, openDocument, t]);

  const saveToPath = useCallback(async (targetPath: string) => {
    if (!window.electronAPI?.saveFile) {
      window.alert(t('desktopOnlyAction'));
      return false;
    }

    const result = await window.electronAPI.saveFile(targetPath, fileContent);
    if (!result.success) {
      window.alert(result.error || t('saveFailed'));
      return false;
    }

    const savedFile = createFileNode(targetPath, fileContent);
    setCurrentFile(savedFile);
    setCurrentFilePath(targetPath);
    setFileContent(fileContent, { dirty: false });
    setIsDirty(false);
    return true;
  }, [fileContent, setCurrentFile, setCurrentFilePath, setFileContent, setIsDirty, t]);

  const handleSaveAs = useCallback(async () => {
    if (!window.electronAPI?.saveAsDialog) {
      window.alert(t('desktopOnlyAction'));
      return false;
    }

    const targetPath = await window.electronAPI.saveAsDialog();
    if (!targetPath) return false;
    return saveToPath(targetPath);
  }, [saveToPath, t]);

  const handleSave = useCallback(async () => {
    if (currentFilePath) {
      return saveToPath(currentFilePath);
    }
    return handleSaveAs();
  }, [currentFilePath, handleSaveAs, saveToPath]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!currentFile) {
      setFileTree(demoFileTree);
      const welcomeFile = demoFileTree[0].children?.[0];
      if (welcomeFile?.type === 'file') {
        setCurrentFile(welcomeFile);
        setCurrentFilePath(null);
        setFileContent(welcomeFile.content || '', { dirty: false });
      }
    }
  }, [currentFile, setCurrentFile, setCurrentFilePath, setFileContent, setFileTree]);

  useEffect(() => {
    document.title = `${isDirty ? '* ' : ''}${currentFile?.name || t('appName')}`;
  }, [currentFile?.name, isDirty, t]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const disposers = [
      api.onFileOpened?.((payload) => {
        if (confirmDiscardChanges()) {
          openDocument(payload.path, payload.content, payload.tree);
        }
      }),
      api.onFolderOpened?.(async (_path, tree) => {
        if (!confirmDiscardChanges()) return;
        setFileTree(tree);

        const firstFile = findFirstFile(tree);
        if (firstFile) {
          setCurrentFile(firstFile);
          setCurrentFilePath(firstFile.path || null);
          const result = await api.readFile(firstFile.path);
          if (result.success && typeof result.content === 'string') {
            setFileContent(result.content, { dirty: false });
          }
        }
      }),
      api.onFileSaveAsPath?.((path) => {
        void saveToPath(path);
      }),
      api.onMenuNew?.(handleNewDocument),
      api.onMenuOpen?.(() => {
        void handleOpenFile();
      }),
      api.onMenuSave?.(() => {
        void handleSave();
      }),
      api.onMenuSaveAs?.(() => {
        void handleSaveAs();
      }),
      api.onMenuToggleSidebar?.(toggleSidebar),
      api.onMenuToggleOutline?.(toggleOutline),
      api.onMenuFocusMode?.(toggleFocusMode),
      api.onMenuThemeLight?.(() => updateSettings({ theme: 'light' })),
      api.onMenuThemeDark?.(() => updateSettings({ theme: 'dark' })),
      api.onMenuThemeSystem?.(() => updateSettings({ theme: 'system' })),
      api.onMenuLangEn?.(() => setLanguage('en')),
      api.onMenuLangZh?.(() => setLanguage('zh')),
      api.onMenuShortcuts?.(() => {
        window.alert('Ctrl+N New\nCtrl+O Open\nCtrl+S Save\nCtrl+Shift+S Save As\nCtrl+\\\\ Toggle Sidebar\nCtrl+Shift+O Toggle Outline\nCtrl+Shift+F Focus Mode');
      }),
    ].filter((dispose): dispose is () => void => typeof dispose === 'function');

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  }, [
    confirmDiscardChanges,
    handleNewDocument,
    handleOpenFile,
    handleSave,
    handleSaveAs,
    openDocument,
    saveToPath,
    setCurrentFile,
    setCurrentFilePath,
    setFileContent,
    setFileTree,
    setLanguage,
    toggleFocusMode,
    toggleOutline,
    toggleSidebar,
    updateSettings,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const cmdOrCtrl = event.ctrlKey || event.metaKey;
      if (!cmdOrCtrl) return;

      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          void handleSaveAs();
        } else {
          void handleSave();
        }
      }

      if (key === 'o' && !event.shiftKey) {
        event.preventDefault();
        void handleOpenFile();
      }

      if (key === 'n') {
        event.preventDefault();
        handleNewDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewDocument, handleOpenFile, handleSave, handleSaveAs]);

  return (
    <div className={clsx('h-screen flex flex-col bg-white dark:bg-slate-900', focusMode && 'focus-mode')}>
      <TitleBar />

      <Toolbar
        onNewFile={handleNewDocument}
        onOpenFile={() => void handleOpenFile()}
        onSaveFile={() => void handleSave()}
      />

      <div className="flex-1 flex overflow-hidden">
        <FileTree />
        <WysiwygEditor />
        {!focusMode && outlineOpen && <Outline />}
      </div>

      <StatusBar />
      <SettingsPanel />
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

export default App;
