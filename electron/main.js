const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const createWindow = (filePathToOpen) => {
  const isMac = process.platform === 'darwin';

  // Window options
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e293b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  };

  // Platform-specific title bar settings
  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 15, y: 15 };
  } else {
    // Windows: use frame: false for custom title bar
    windowOptions.frame = false;
  }

  // Create the browser window.
  mainWindow = new BrowserWindow(windowOptions);

  // and load the index.html of the app.
  const isDev = process.env.ELECTRON_IS_DEV === '1' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Setup menu
  const menu = createMenu();
  Menu.setApplicationMenu(menu);

  // Listen for window maximize/unmaximize events
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:unmaximized');
  });

  // Handle file open from command line or file association
  mainWindow.webContents.once('did-finish-load', () => {
    if (filePathToOpen) {
      openFileByPath(filePathToOpen);
    }
  });

  // No title bar overlay - we use our own custom title bar buttons
  // setTitleBarOverlay would create native controls that block our custom buttons

  // Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
};

// Create application menu
function createMenu() {
  const isMac = process.platform === 'darwin';
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open')
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+Alt+O',
          click: () => openFolder()
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu:save-as')
        },
        { type: 'separator' },
        {
          label: 'Export as PDF',
          click: () => mainWindow.webContents.send('menu:export-pdf')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Find...', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu:find') },
        { label: 'Replace...', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu:replace') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: () => mainWindow.webContents.send('menu:toggle-sidebar') },
        { label: 'Toggle Outline', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow.webContents.send('menu:toggle-outline') },
        { label: 'Focus Mode', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow.webContents.send('menu:focus-mode') },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Theme',
      submenu: [
        { label: 'Light', type: 'radio', click: () => mainWindow.webContents.send('menu:theme-light') },
        { label: 'Dark', type: 'radio', click: () => mainWindow.webContents.send('menu:theme-dark') },
        { label: 'System', type: 'radio', click: () => mainWindow.webContents.send('menu:theme-system') }
      ]
    },
    {
      label: 'Language',
      submenu: [
        { label: 'English', type: 'radio', click: () => mainWindow.webContents.send('menu:lang-en') },
        { label: '中文', type: 'radio', click: () => mainWindow.webContents.send('menu:lang-zh') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => mainWindow.webContents.send('menu:shortcuts') },
        { type: 'separator' },
        {
          label: 'About',
          click: () => dialog.showMessageBox({
            type: 'info',
            title: 'Markdown Editor',
            message: 'Version 1.0.0\n\nA Typora-inspired WYSIWYG Markdown editor.',
            buttons: ['OK']
          })
        }
      ]
    }
  ]);

  return menu;
}

async function openFolder() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const tree = buildFolderRoot(folderPath);
    mainWindow.webContents.send('folder:opened', folderPath, tree);
  }
}

function createFileOpenPayload(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const folderPath = path.dirname(filePath);

  return {
    path: filePath,
    content,
    folderPath,
    tree: buildFolderRoot(folderPath),
  };
}

function openFileByPath(filePath) {
  try {
    mainWindow.webContents.send('file:opened', createFileOpenPayload(filePath));
  } catch (err) {
    dialog.showErrorBox('Error', `Failed to open file: ${err.message}`);
  }
}

// Build file tree from directory
function buildFileTree(dirPath, basePath = '') {
  const items = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        const children = buildFileTree(fullPath, relativePath);
        if (children.length > 0) {
          items.push({
            id: fullPath,
            name: entry.name,
            type: 'folder',
            path: fullPath,
            children
          });
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.markdown', '.txt'].includes(ext)) {
          items.push({
            id: fullPath,
            name: entry.name,
            type: 'file',
            path: fullPath,
            content: null
          });
        }
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }

  return items.sort((a, b) => {
    // Folders first, then files
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
}

function buildFolderRoot(folderPath) {
  return [{
    id: folderPath,
    name: path.basename(folderPath) || folderPath,
    type: 'folder',
    path: folderPath,
    children: buildFileTree(folderPath),
  }];
}

// IPC Handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// File operations via IPC
ipcMain.handle('file:open-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return createFileOpenPayload(result.filePaths[0]);
  }
  return null;
});

ipcMain.handle('file:open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const tree = buildFolderRoot(folderPath);
    return { path: folderPath, tree };
  }
  return null;
});

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:save', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:save-as-dialog', async () => {
  const result = await dialog.showSaveDialog({
    properties: ['saveFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('shell:open-external', async (event, url) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return { success: false, error: 'Unsupported URL protocol' };
    }

    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Handle file open from command line or file association
let fileToOpen = null;

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    openFileByPath(filePath);
  } else {
    fileToOpen = filePath;
  }
});

// App ready
app.whenReady().then(() => {
  // Check for file passed as command line argument
  const args = process.argv.slice(1);
  for (const arg of args) {
    if (arg.endsWith('.md') || arg.endsWith('.markdown')) {
      if (fs.existsSync(arg)) {
        fileToOpen = arg;
        break;
      }
    }
  }

  createWindow(fileToOpen);

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
