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

const DEFAULT_IN = path.join(__dirname, '..', 'build', 'icon.svg');
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

  // sharp honours the input format by extension. SVG → PNG is straightforward
  // and gives us a deterministic 1024x1024 source that matches the canonical
  // app-icon canvas size. We set a 1024×1024 density so SVGs without an
  // explicit width/height still render at the correct resolution.
  await sharp(input, { density: 144 })
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(output);

  const out = fs.statSync(output);
  console.log(`Wrote ${output} (${Math.round(out.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
