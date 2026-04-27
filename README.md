# Markdown Editor

A Typora-inspired desktop Markdown editor built with React, Vite, Tailwind CSS, and Electron.

## Features

- Typora-style writing experience with live block conversion for headings, lists, quotes, rules, and task items.
- Real desktop file workflow: new, open, open folder, save, and save as.
- Sidebar file tree synchronized with the folder of the opened document.
- Clickable document outline for quick heading navigation.
- Light, dark, and system theme modes.
- Word count, line count, cursor position, dirty state, and UTF-8 status display.
- Windows packaging with installer and portable client output.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Electron
- electron-builder
- Playwright smoke tests

## Requirements

- Node.js 20 or newer
- npm

## Local Development

Install dependencies:

```bash
npm ci
```

Start the web development server:

```bash
npm run dev
```

Start the Electron app in development mode:

```bash
npm run electron:dev
```

## Build And Test

Build the renderer:

```bash
npm run build
```

Run the browser smoke test:

```bash
npm run test:smoke
```

Generate app icons:

```bash
npm run build:icons
```

Build the Windows client:

```bash
npm run pack:win
```

The generated installer and portable client are written to `release/`.

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

Typical Windows release outputs:

- `Markdown Editor Setup 1.0.0.exe`
- `Markdown Editor 1.0.0.exe`
- `Markdown Editor Setup 1.0.0.exe.blockmap`
- `win-unpacked`

## Notes

- The workflow needs `contents: write` permission to create tags and releases.
- If your repository only uses one default branch, keep either `main` or `master` in the workflow trigger and remove the unused branch.
- To publish macOS or Linux clients, add separate matrix jobs that call `npm run pack:mac` or `npm run pack:linux` on the matching runner OS.
