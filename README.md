# Markdown Editor

<p align="center">
  <img src="https://raw.githubusercontent.com/ethanfly/markdown-browser/main/build/icons/icon-256x256.png" alt="Markdown Editor" width="128" height="128">
</p>

<p align="center">一款 Typora 风格的桌面 Markdown 编辑器，基于 React + Vite + Tailwind CSS + Electron 构建。实时块转换、侧边栏文件树、可点击大纲，以及一键 Windows 安装包。</p>

## 特性

- **Typora 风格 WYSIWYG 写作**：标题、列表、引用、分割线、任务项随打随转。
- **完整 GFM 支持**：表格（含对齐）、脚注、任务列表、围栏代码块、删除线、高亮、上标、下标。
- **语法高亮**：通过 `highlight.js` + `rehype-highlight` 为围栏代码块上色。
- **桌面文件工作流**：新建、打开、打开文件夹、保存、另存为，以及在系统中双击 `.md` / `.markdown` 文件直接打开。
- **侧边栏文件树**：与当前打开文档所在目录联动，支持搜索和文件夹展开 / 折叠。
- **可点击大纲**：列出标题、表格、引用、代码块、列表，支持筛选与搜索。
- **主题模式**：明亮、暗黑、跟随系统三档，编辑器和大纲面板独立适配。
- **状态栏**：字数、行数、光标位置、脏标记、UTF-8 状态。
- **双语界面**：英文 / 简体中文，语言选择跨会话保留。
- **键盘快捷键**：新建、打开、保存、另存为、切换侧边栏、切换大纲、专注模式。
- **设置面板**：主题、字号、字体、行高、面板可见性。

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand（带 `persist` 中间件持久化设置）
- Electron 28
- electron-builder 26
- `@uiw/react-md-editor` 与自研 WYSIWYG 编辑器
- `rehype-raw`、`rehype-highlight`、`highlight.js`
- Playwright（冒烟测试）

## 环境要求

- Node.js 20 或更新版本
- npm

## 本地开发

安装依赖：

```bash
npm ci
```

仅启动 Web 开发服务器（浏览器中查看渲染层）：

```bash
npm run dev
```

以开发模式启动 Electron 应用（Vite + Electron 热重载）：

```bash
npm run electron:dev
```

## 构建、测试与打包

构建渲染层（类型检查 + 生产打包）：

```bash
npm run build
```

按套件分别运行测试：

```bash
npm run test:md       # Markdown 往返测试
npm run test:outline  # 大纲提取测试
npm run test:smoke    # Playwright 浏览器冒烟测试
```

运行完整测试流水线：

```bash
npm run test
```

重新生成应用图标（安装包使用）：

```bash
npm run build:icons
```

为当前平台打包桌面客户端：

```bash
npm run pack        # 自动识别平台
npm run pack:win    # Windows：NSIS 安装包 + 便携 .exe
npm run pack:mac    # macOS：.dmg + .zip（x64 与 arm64）
npm run pack:linux  # Linux：AppImage、.deb、.rpm
```

所有安装包、便携可执行文件、block map、解包后的应用目录统一输出到 `release/`。

## 发布自动化

本仓库包含 GitHub Actions 工作流 `.github/workflows/release.yml`。

每次推送到 `main` 或 `master` 分支时，工作流会：

1. 通过 `npm ci` 安装依赖。
2. 安装 Playwright Chromium 运行时。
3. 执行 `npm run build`。
4. 执行 `npm run test:smoke`。
5. 执行 `npm run pack:win`。
6. 创建形如 `v1.0.0-build.123` 的唯一 tag。
7. 为该 tag 创建 GitHub Release。
8. 上传 Windows 安装包、便携可执行文件、block map 以及解包后的应用产物。

工作流也支持从 GitHub Actions 标签页手动触发。

## 发布产物

`release/` 下典型的 Windows 产物：

- `Markdown Editor Setup 1.0.0.exe` — NSIS 安装包（x64）
- `Markdown Editor 1.0.0.exe` — 便携可执行文件（x64）
- `Markdown Editor Setup 1.0.0.exe.blockmap` — 差分升级元数据
- `win-unpacked/` — 解包后的应用目录

`release/` 下典型的 macOS 产物：

- `Markdown Editor-1.0.0.dmg`（x64 与 arm64）
- `Markdown Editor-1.0.0-mac.zip`（x64 与 arm64）

`release/` 下典型的 Linux 产物：

- `Markdown Editor-1.0.0.AppImage`
- `markdown-editor_1.0.0_amd64.deb`
- `markdown-editor-1.0.0.x86_64.rpm`

## 文件关联

打包后的应用注册为 `.md` 和 `.markdown` 文件的关联编辑器。在 Windows 上双击 Markdown 文件会直接进入实际内容，不再被演示文档抢先渲染。

## 项目结构

```
electron/        Electron 主进程与 preload 脚本
src/             React 渲染层（App、组件、Hooks、Store、i18n）
scripts/         构建、图标、测试脚本
build/           图标源与生成的多档位图标集
.github/         GitHub Actions 工作流
```

## 备注

- 发布工作流需要 `contents: write` 权限才能创建 tag 和 Release。
- 若仓库只使用一个默认分支，请保留 `main` 或 `master` 中的一个，并从触发条件中移除未使用的那一个。
- 若要发布 macOS 或 Linux 客户端，请在对应 runner 系统上增加调用 `npm run pack:mac` 或 `npm run pack:linux` 的矩阵任务。
- 设置、侧边栏 / 大纲开启状态、语言选择通过 `zustand/middleware` 跨会话持久化（`localStorage` 键名 `markdown-reader-settings`）。
