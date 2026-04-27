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
const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate PNG icons
  for (const { name, size } of sizes) {
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, name));
      console.log(`Generated ${name}`);
    } catch (error) {
      console.error(`Failed to generate ${name}:`, error.message);
    }
  }

  // Generate ICO for Windows (proper ICO format)
  try {
    const pngBuffers = await Promise.all([
      sharp(svgPath).resize(16, 16).png().toBuffer(),
      sharp(svgPath).resize(32, 32).png().toBuffer(),
      sharp(svgPath).resize(48, 48).png().toBuffer(),
      sharp(svgPath).resize(64, 64).png().toBuffer(),
      sharp(svgPath).resize(128, 128).png().toBuffer(),
      sharp(svgPath).resize(256, 256).png().toBuffer(),
    ]);
    const icoBuffer = await pngToIco.default(pngBuffers);
    fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
    console.log('Generated icon.ico');
  } catch (error) {
    console.error('Failed to generate icon.ico:', error.message);
  }

  // Generate ICNS for macOS (needs multiple sizes)
  const icnsDir = path.join(outputDir, 'icon.iconset');
  if (!fs.existsSync(icnsDir)) {
    fs.mkdirSync(icnsDir, { recursive: true });
  }

  const icnsSizes = [16, 32, 128, 256, 512];
  for (const size of icnsSizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(icnsDir, `icon_${size}x${size}.png`));

    // 2x versions
    if (size * 2 <= 1024) {
      await sharp(svgPath)
        .resize(size * 2, size * 2)
        .png()
        .toFile(path.join(icnsDir, `icon_${size}x${size}@2x.png`));
    }
  }
  console.log('Generated icon.iconset for macOS');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
