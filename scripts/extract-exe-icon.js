// Extract the icon group from an .exe so we can see what Windows actually
// shows in the resource manager. Uses PowerShell + System.Drawing because
// node has no built-in PE parser; the ICONDIR / ICONDIRENTRY / RT_GROUP_ICON
// structures are simple enough that we just walk the PE headers by hand.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [, , exePath, outDir] = process.argv;
if (!exePath) {
  console.error('Usage: node scripts/extract-exe-icon.js <exe> [out-dir]');
  process.exit(1);
}

const output = outDir || path.join(__dirname, '..', 'extracted-icons');
fs.mkdirSync(output, { recursive: true });

// PowerShell can read .NET's Icon.ExtractAssociatedIcon for the highest-res
// 32-bit entry, and SystemIcons for a quick look. Easier than parsing PE.
const ps = `
Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${exePath.replace(/'/g, "''")}')
$icon.ToBitmap().Save('${path.join(output, 'extracted.png').replace(/'/g, "''")}')
"Extracted to ${path.join(output, 'extracted.png')}"
`;
const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) process.exit(r.status);
