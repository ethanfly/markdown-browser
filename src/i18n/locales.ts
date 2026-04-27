export type Language = 'en' | 'zh';

export interface LocaleStrings {
  appName: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;

  searchFiles: string;
  noFilesFound: string;
  noFilesToDisplay: string;
  openFolder: string;
  newFile: string;
  noFileSelected: string;

  words: string;
  lines: string;
  line: string;
  column: string;
  saved: string;
  unsaved: string;

  outline: string;
  noHeadings: string;

  startTyping: string;

  confirmClose: string;
  discardUnsavedChanges: string;
  desktopOnlyAction: string;
  saveFailed: string;
  yes: string;
  no: string;
  cancel: string;

  settings: string;
  fontSize: string;
  fontFamily: string;
  lineHeight: string;
  language: string;
  english: string;
  chinese: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;

  about: string;
  version: string;
  description: string;

  file: string;
  edit: string;
  view: string;
  help: string;
  new: string;
  open: string;
  save: string;
  saveAs: string;
  exportPdf: string;
  exit: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  find: string;
  replace: string;
  toggleSidebar: string;
  toggleOutline: string;
  focusMode: string;
  shortcuts: string;
  fullscreen: string;

  markdownSyntax: string;
  heading: string;
  textStyle: string;
  insert: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bold: string;
  italic: string;
  strikethrough: string;
  highlight: string;
  code: string;
  link: string;
  image: string;
  list: string;
  orderedList: string;
  task: string;
  blockquote: string;
  horizontalRule: string;
}

export type LocaleKey = keyof LocaleStrings;

export const enUS: LocaleStrings = {
  appName: 'Markdown Editor',
  minimize: 'Minimize',
  maximize: 'Maximize',
  restore: 'Restore',
  close: 'Close',

  searchFiles: 'Search files...',
  noFilesFound: 'No files found',
  noFilesToDisplay: 'No files to display',
  openFolder: 'Open Folder',
  newFile: 'New File',
  noFileSelected: 'No file selected',

  words: 'words',
  lines: 'lines',
  line: 'Ln',
  column: 'Col',
  saved: 'Saved',
  unsaved: 'Unsaved',

  outline: 'Outline',
  noHeadings: 'No headings',

  startTyping: 'Start typing Markdown...',

  confirmClose: 'You have unsaved changes. Save your work before closing.',
  discardUnsavedChanges: 'You have unsaved changes. Discard them and continue?',
  desktopOnlyAction: 'This action is available in the desktop app.',
  saveFailed: 'Save failed.',
  yes: 'Yes',
  no: 'No',
  cancel: 'Cancel',

  settings: 'Settings',
  fontSize: 'Font Size',
  fontFamily: 'Font',
  lineHeight: 'Line Height',
  language: 'Language',
  english: 'English',
  chinese: '中文',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',

  about: 'About',
  version: 'Version',
  description: 'A Typora-inspired WYSIWYG Markdown editor.',

  file: 'File',
  edit: 'Edit',
  view: 'View',
  help: 'Help',
  new: 'New',
  open: 'Open...',
  save: 'Save',
  saveAs: 'Save As...',
  exportPdf: 'Export as PDF',
  exit: 'Exit',
  undo: 'Undo',
  redo: 'Redo',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  find: 'Find...',
  replace: 'Replace...',
  toggleSidebar: 'Toggle Sidebar',
  toggleOutline: 'Toggle Outline',
  focusMode: 'Focus Mode',
  shortcuts: 'Keyboard Shortcuts',
  fullscreen: 'Fullscreen',

  markdownSyntax: 'Markdown Syntax',
  heading: 'Headings',
  textStyle: 'Text Style',
  insert: 'Insert',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bold: 'Bold',
  italic: 'Italic',
  strikethrough: 'Strikethrough',
  highlight: 'Highlight',
  code: 'Code',
  link: 'Link',
  image: 'Image',
  list: 'List item',
  orderedList: 'Ordered list',
  task: 'Task',
  blockquote: 'Blockquote',
  horizontalRule: 'Horizontal rule',
};

export const zhCN: LocaleStrings = {
  appName: 'Markdown 编辑器',
  minimize: '最小化',
  maximize: '最大化',
  restore: '还原',
  close: '关闭',

  searchFiles: '搜索文件...',
  noFilesFound: '未找到文件',
  noFilesToDisplay: '没有可显示的文件',
  openFolder: '打开文件夹',
  newFile: '新建文件',
  noFileSelected: '未选择文件',

  words: '词',
  lines: '行',
  line: '行',
  column: '列',
  saved: '已保存',
  unsaved: '未保存',

  outline: '大纲',
  noHeadings: '没有标题',

  startTyping: '开始输入 Markdown...',

  confirmClose: '你有未保存的更改。关闭前请先保存。',
  discardUnsavedChanges: '你有未保存的更改。要放弃这些更改并继续吗？',
  desktopOnlyAction: '此操作需要在桌面应用中使用。',
  saveFailed: '保存失败。',
  yes: '是',
  no: '否',
  cancel: '取消',

  settings: '设置',
  fontSize: '字号',
  fontFamily: '字体',
  lineHeight: '行高',
  language: '语言',
  english: 'English',
  chinese: '中文',
  theme: '主题',
  themeLight: '浅色',
  themeDark: '深色',
  themeSystem: '跟随系统',

  about: '关于',
  version: '版本',
  description: '一款受 Typora 启发的所见即所得 Markdown 编辑器。',

  file: '文件',
  edit: '编辑',
  view: '视图',
  help: '帮助',
  new: '新建',
  open: '打开...',
  save: '保存',
  saveAs: '另存为...',
  exportPdf: '导出为 PDF',
  exit: '退出',
  undo: '撤销',
  redo: '重做',
  cut: '剪切',
  copy: '复制',
  paste: '粘贴',
  find: '查找...',
  replace: '替换...',
  toggleSidebar: '切换侧边栏',
  toggleOutline: '切换大纲',
  focusMode: '专注模式',
  shortcuts: '键盘快捷键',
  fullscreen: '全屏',

  markdownSyntax: 'Markdown 语法',
  heading: '标题',
  textStyle: '文本样式',
  insert: '插入',
  heading1: '标题 1',
  heading2: '标题 2',
  heading3: '标题 3',
  bold: '粗体',
  italic: '斜体',
  strikethrough: '删除线',
  highlight: '高亮',
  code: '代码',
  link: '链接',
  image: '图片',
  list: '列表项',
  orderedList: '有序列表',
  task: '任务',
  blockquote: '引用',
  horizontalRule: '分隔线',
};

export const locales: Record<Language, LocaleStrings> = {
  en: enUS,
  zh: zhCN,
};
