const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, callback) => {
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('file:open-folder-dialog'),
  saveAsDialog: () => ipcRenderer.invoke('file:save-as-dialog'),

  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),

  onMenuNew: (callback) => on('menu:new', callback),
  onMenuOpen: (callback) => on('menu:open', callback),
  onMenuSave: (callback) => on('menu:save', callback),
  onMenuSaveAs: (callback) => on('menu:save-as', callback),
  onMenuExportPdf: (callback) => on('menu:export-pdf', callback),
  onMenuToggleSidebar: (callback) => on('menu:toggle-sidebar', callback),
  onMenuToggleOutline: (callback) => on('menu:toggle-outline', callback),
  onMenuFocusMode: (callback) => on('menu:focus-mode', callback),
  onMenuThemeLight: (callback) => on('menu:theme-light', callback),
  onMenuThemeDark: (callback) => on('menu:theme-dark', callback),
  onMenuThemeSystem: (callback) => on('menu:theme-system', callback),
  onMenuShortcuts: (callback) => on('menu:shortcuts', callback),
  onMenuLangEn: (callback) => on('menu:lang-en', callback),
  onMenuLangZh: (callback) => on('menu:lang-zh', callback),

  onFileOpened: (callback) => on('file:opened', callback),
  onFileOpen: (callback) => on('file:open', callback),
  onFileSaveAsPath: (callback) => on('file:save-as-path', callback),
  onFolderOpened: (callback) => on('folder:opened', callback),

  onMaximize: (callback) => on('window:maximized', callback),
  onUnmaximize: (callback) => on('window:unmaximized', callback),

  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});
