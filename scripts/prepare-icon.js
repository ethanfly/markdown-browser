// Prepare a 1024x1024 PNG source for the application icon.
//
// Usage: node scripts/prepare-icon.js <input.png> [output.png]
//
//   - Crops 10% on every side of the source to drop any soft outer glow that
//     AI-generated icons tend to leave behind.
//   - Resizes the cropped result to exactly 1024x1024.
//   - Re-encodes the PNG so the file is small and consistent across runs.
//
// The output of this script is what `npm run build:icons` consumes as the
// canonical icon source — it is checked into git so every developer gets the
// same desktop icon.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DEFAULT_IN = path.join(__dirname, '..', 'icon-source-raw.png');
const DEFAULT_OUT = path.join(__dirname, '..', 'build', 'icon-source.png');

async function main() {
  const [, , inputArg, outputArg] = process.argv;
  const input = path.resolve(inputArg || DEFAULT_IN);
  const output = path.resolve(outputArg || DEFAULT_OUT);

  if (!fs.existsSync(input)) {
    console.error(`No input image at ${input}.`);
    console.error('Pass the source path as the first argument.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  const meta = await sharp(input).metadata();
  const W = meta.width || 1024;
  const H = meta.height || 1024;

  // Inset 10% on every side. The image is centred on a square canvas so this
  // safely removes the soft outer glow without touching the icon itself.
  const inset = Math.round(Math.min(W, H) * 0.10);
  await sharp(input)
    .extract({
      left: inset,
      top: inset,
      width: W - inset * 2,
      height: H - inset * 2,
    })
    .resize(1024, 1024)
    .png({ compressionLevel: 9, palette: false })
    .toFile(output);

  const out = fs.statSync(output);
  console.log(`Wrote ${output} (${Math.round(out.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
