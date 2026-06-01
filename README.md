# Markdown Editor

A Typora-inspired desktop Markdown editor built with React, Vite, Tailwind CSS, and Electron. Live block conversion, a synced sidebar file tree, a clickable outline, and a one-click Windows installer.

## Features

- **Typora-style WYSIWYG writing** with live block conversion for headings, lists, blockquotes, rules, and task items as you type.
- **Full GFM coverage**: tables with alignment, footnotes, task lists, fenced code blocks, strikethrough, highlight, superscript, and subscript.
- **Syntax highlighting** for fenced code blocks via `highlight.js` and `rehype-highlight`.
- **Desktop file workflow**: new, open, open folder, save, save as, and double-click to open a `.md` / `.markdown` file from the OS.
- **Sidebar file tree** synchronized with the folder of the opened document, with search and folder expand/collapse.
- **Clickable outline** that lists headings, tables, blockquotes, code blocks, and lists, with filter and search.
- **Light, dark, and system theme modes**, plus light/dark styles for both the editor surface and the outline panel.
- **Status bar** with word count, line count, cursor position, dirty state, and UTF-8 status.
- **Bilingual UI** (English and Simplified Chinese) with persistent language selection.
- **Keyboard shortcuts** for new, open, save, save as, toggle sidebar, toggle outline, and focus mode.
- **Settings panel** for theme, font size, font family, line height, and panel visibility.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (with `persist` middleware for settings)
- Electron 28
- electron-builder 26
- `@uiw/react-md-editor` and a custom WYSIWYG editor
- `rehype-raw`, `rehype-highlight`, `highlight.js`
- Playwright (smoke tests)

## Requirements

- Node.js 20 or newer
- npm

## Local Development

Install dependencies:

```bash
npm ci
```

Start the web development server (renderer only, in the browser):

```bash
npm run dev
```

Start the Electron app in development mode (Vite + Electron with hot reload):

```bash
npm run electron:dev
```

## Build, Test, And Package

Build the renderer (type-check + production bundle):

```bash
npm run build
```

Run individual test suites:

```bash
npm run test:md       # Markdown round-trip tests
npm run test:outline  # Outline extraction tests
npm run test:smoke    # Playwright browser smoke test
```

Run the full test pipeline:

```bash
npm run test
```

Regenerate the application icons (used by the installers):

```bash
npm run build:icons
```

Package a desktop client for the current platform:

```bash
npm run pack        # auto-detect platform
npm run pack:win    # Windows: NSIS installer + portable .exe
npm run pack:mac    # macOS:   .dmg + .zip (x64 and arm64)
npm run pack:linux  # Linux:   AppImage, .deb, .rpm
```

All installers, portable executables, block maps, and the unpacked app are written to `release/`.

## Release Automation

This repository includes a GitHub Actions workflow at `.github/workflows/release.yml`.

On every push to `main` or `master`, the workflow will:

1. Install dependencies with `npm ci`.
2. Install the Playwright Chromium runtime.
3. Run `npm run build`.
4. Run `npm run test:smoke`.
5. Run `npm run pack:win`.
6. Create a unique tag such as `v1.0.0-build.123`.
7. Create a GitHub Release for that tag.
8. Upload the Windows installer, portable executable, block map, and unpacked app artifact.

The workflow also supports manual runs from the GitHub Actions tab.

## Release Files

Typical Windows release outputs in `release/`:

- `Markdown Editor Setup 1.0.0.exe` — NSIS installer (x64)
- `Markdown Editor 1.0.0.exe` — portable executable (x64)
- `Markdown Editor Setup 1.0.0.exe.blockmap` — delta update metadata
- `win-unpacked/` — unpacked application directory

Typical macOS release outputs:

- `Markdown Editor-1.0.0.dmg` (x64 and arm64)
- `Markdown Editor-1.0.0-mac.zip` (x64 and arm64)

Typical Linux release outputs:

- `Markdown Editor-1.0.0.AppImage`
- `markdown-editor_1.0.0_amd64.deb`
- `markdown-editor-1.0.0.x86_64.rpm`

## File Associations

The packaged build registers the application as a handler for `.md` and `.markdown` files. On Windows, double-clicking a Markdown file opens it directly in the editor without showing the demo welcome document.

## Project Layout

```
electron/        Electron main process and preload script
src/             React renderer (App, components, hooks, stores, i18n)
scripts/         Build, icon, and test scripts
build/           Source icon and generated icon set
.github/         GitHub Actions workflows
```

## Notes

- The release workflow needs `contents: write` permission to create tags and releases.
- If your repository only uses one default branch, keep either `main` or `master` in the workflow trigger and remove the unused branch.
- To publish macOS or Linux clients, add separate matrix jobs that call `npm run pack:mac` or `npm run pack:linux` on the matching runner OS.
- Settings, sidebar/outline open state, and language are persisted across sessions via `zustand/middleware` (`localStorage` key `markdown-reader-settings`).
