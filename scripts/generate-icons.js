const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pngToIco = require('png-to-ico');

const sizes = [
  { name: 'icon-16x16.png', size: 16 },
  { name: 'icon-24x24.png', size: 24 },
  { name: 'icon-32x32.png', size: 32 },
  { name: 'icon-48x48.png', size: 48 },
  { name: 'icon-64x64.png', size: 64 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-256x256.png', size: 256 },
  { name: 'icon-512x512.png', size: 512 },
];

const outputDir = path.join(__dirname, '..', 'build', 'icons');

// Prefer a high-res PNG (icon-source.png) generated externally — easier to
// design in image tools and to keep consistent across runs. Fall back to the
// legacy SVG (icon.svg) if the PNG isn't there.
const pngSourcePath = path.join(__dirname, '..', 'build', 'icon-source.png');
const svgSourcePath = path.join(__dirname, '..', 'build', 'icon.svg');

function pickSource() {
  if (fs.existsSync(pngSourcePath)) {
    return { kind: 'png', path: pngSourcePath };
  }
  if (fs.existsSync(svgSourcePath)) {
    return { kind: 'svg', path: svgSourcePath };
  }
  throw new Error(
    `No icon source found. Add build/icon-source.png (preferred) or build/icon.svg.`,
  );
}

function pipeline(source, size) {
  return sharp(source).resize(size, size, {
    // Source PNGs are 1024x1024. Use bicubic for the largest sizes and
    // nearest-neighbour for the small ones to keep the text-like glyphs
    // crisp when they shrink below 64px.
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png();
}

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const source = pickSource();
  console.log(`Using source: ${source.path}`);

  // Wipe stale outputs so removed sizes don't linger between icon swaps.
  for (const f of fs.readdirSync(outputDir)) {
    const full = path.join(outputDir, f);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
  const icnsDir = path.join(outputDir, 'icon.iconset');
  fs.mkdirSync(icnsDir, { recursive: true });

  // Generate PNG icons
  for (const { name, size } of sizes) {
    try {
      await pipeline(source.path, size).toFile(path.join(outputDir, name));
      console.log(`Generated ${name}`);
    } catch (error) {
      console.error(`Failed to generate ${name}:`, error.message);
    }
  }

  // Generate ICO for Windows (proper ICO format)
  try {
    const pngBuffers = await Promise.all([
      pipeline(source.path, 16).toBuffer(),
      pipeline(source.path, 32).toBuffer(),
      pipeline(source.path, 48).toBuffer(),
      pipeline(source.path, 64).toBuffer(),
      pipeline(source.path, 128).toBuffer(),
      pipeline(source.path, 256).toBuffer(),
    ]);
    const icoBuffer = await pngToIco.default(pngBuffers);
    fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
    console.log('Generated icon.ico');
  } catch (error) {
    console.error('Failed to generate icon.ico:', error.message);
  }

  // Generate ICNS for macOS (needs multiple sizes)
  const icnsSizes = [16, 32, 128, 256, 512];
  for (const size of icnsSizes) {
    await pipeline(source.path, size).toFile(
      path.join(icnsDir, `icon_${size}x${size}.png`),
    );

    // 2x versions (Retina)
    if (size * 2 <= 1024) {
      await pipeline(source.path, size * 2).toFile(
        path.join(icnsDir, `icon_${size}x${size}@2x.png`),
      );
    }
  }
  console.log('Generated icon.iconset for macOS');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);

