// Standalone round-trip test for the markdown parser/serializer.
// Uses esbuild (already a transitive dep of vite) to transpile the TSX file
// and isolates the pure helper functions. Runs in plain Node, no JSDOM.

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';
import { JSDOM } from 'jsdom';

// Provide a minimal DOM so htmlToMarkdown (which uses document.createElement)
// can run inside the test sandbox. We set globals on globalThis so the
// bundled module sees them when Node evaluates the temp .mjs file.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
for (const key of [
  'window',
  'document',
  'Node',
  'Element',
  'HTMLElement',
  'HTMLDivElement',
  'HTMLPreElement',
  'HTMLAnchorElement',
  'HTMLInputElement',
  'Range',
  'Selection',
  'NodeFilter',
  'getSelection',
]) {
  if (key in dom.window && !(key in globalThis)) {
    globalThis[key] = dom.window[key];
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const editorSource = readFileSync(
  resolve(__dirname, '../src/components/editor/WysiwygEditor.tsx'),
  'utf8',
);

const exportIdx = editorSource.indexOf('export function WysiwygEditor');
if (exportIdx === -1) {
  throw new Error('Could not find WysiwygEditor export — has the source moved?');
}
// Grab everything before the React component: that's all pure helpers
// (escape, parsers, renderTable, etc.) and is what we want to validate.
const helperBlock = editorSource.slice(0, exportIdx);

// Re-export the helpers we need so the bundler produces a single ESM module
// we can dynamic-import. Strip the React / store imports at the top — those
// are only used by the component definition which we've already cut off.
const noImports = helperBlock.replace(/^import[\s\S]*?;\s*$/gm, '');
const stubbed = `${noImports}\nexport { parseInlineMarkdown, parseMarkdownToHtml, htmlToMarkdown, renderTable, splitTableRow, parseTableAlignments, renderTableCell, escapeHtml, decodeEscapes, createFootnoteStore };`;

const result = await esbuild.build({
  stdin: { contents: stubbed, loader: 'tsx', resolveDir: __dirname },
  bundle: false,
  format: 'esm',
  target: 'es2020',
  write: false,
});

const tmpPath = resolve(__dirname, '.tmp-helpers.mjs');
writeFileSync(tmpPath, result.outputFiles[0].text, 'utf8');
const mod = await import(`file://${tmpPath.replace(/\\/g, '/')}`);
unlinkSync(tmpPath);

const { parseMarkdownToHtml, htmlToMarkdown, parseInlineMarkdown, renderTable } = mod;

let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  \u2713 ${label}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  \u2717 ${label}`);
  }
}

function assertContains(haystack, needle, label) {
  assert(haystack.includes(needle), `${label} (expected to contain ${JSON.stringify(needle)})`);
}

function roundTrip(md) {
  const html = parseMarkdownToHtml(md);
  const back = htmlToMarkdown(html);
  return { html, back };
}

console.log('== Table support ==');
{
  const md = [
    '| Name | Score |',
    '| :--- | ---: |',
    '| Alice | 90 |',
    '| Bob | 75 |',
  ].join('\n');
  const { html, back } = roundTrip(md);
  assertContains(html, '<table>', 'renders <table>');
  assertContains(html, '<th', 'renders header cells');
  assertContains(html, '<td', 'renders body cells');
  assertContains(html, 'text-align:left', 'left alignment');
  assertContains(html, 'text-align:right', 'right alignment');
  assertContains(back, '| Name | Score |', 'round-trips header row');
  assertContains(back, '| :--- | ---: |', 'round-trips alignment row');
  assertContains(back, '| Alice | 90 |', 'round-trips body row');
  assertContains(back, '| Bob | 75 |', 'round-trips body row 2');
}

console.log('\n== Cell with inline markdown ==');
{
  const md = [
    '| Feature | Example |',
    '| --- | --- |',
    '| Bold | **yes** |',
    '| Code | `inline` |',
    '| Link | [docs](https://example.com) |',
  ].join('\n');
  const { html, back } = roundTrip(md);
  assertContains(html, '<strong class="md-bold">yes</strong>', 'bold in cell');
  assertContains(html, '<code class="md-code">inline</code>', 'code in cell');
  assertContains(html, '<a href="https://example.com" class="md-link">docs</a>', 'link in cell');
  assertContains(back, '**yes**', 'bold cell round-trip');
  assertContains(back, '`inline`', 'code cell round-trip');
  assertContains(back, '[docs](https://example.com)', 'link cell round-trip');
}

console.log('\n== Table edge cases ==');
{
  const html = renderTable(['A', 'B'], [null, 'center'], [['x', 'y'], ['z', 'w']]);
  assertContains(html, 'text-align:center', 'center alignment emitted');
  assert(!html.includes('text-align:left'), 'unaligned column has no inline style');
}

console.log('\n== Reference-style links ==');
{
  const md = [
    'Read the [docs][doc] for more.',
    '',
    '[doc]: https://example.com "Documentation"',
  ].join('\n');
  const { html } = roundTrip(md);
  assertContains(html, '<a href="https://example.com"', 'reference link resolved');
  assert(!html.includes('md-missing-ref'), 'no missing ref marker');
}

console.log('\n== Auto-link ==');
{
  const md = 'Visit <https://example.com> today.';
  const { html } = roundTrip(md);
  assertContains(html, 'href="https://example.com"', 'auto-link URL');
  assertContains(html, '>https://example.com<', 'auto-link text');
}

console.log('\n== Auto email ==');
{
  const md = 'Mail <a@b.com> please.';
  const { html } = roundTrip(md);
  assertContains(html, 'href="mailto:a@b.com"', 'email auto-link');
}

console.log('\n== Backslash escape ==');
{
  const md = 'This \\* is not italic.';
  const { html } = roundTrip(md);
  assertContains(html, '*', 'literal asterisk');
  assert(!html.includes('<em'), 'no italic applied');
}

console.log('\n== Footnote ==');
{
  const md = [
    'A claim[^1] is made here.',
    '',
    '[^1]: The claim is footnoted.',
  ].join('\n');
  const { html, back } = roundTrip(md);
  assertContains(html, 'md-footnote-ref', 'footnote reference rendered');
  assertContains(html, 'md-footnotes', 'footnote section rendered');
  assertContains(back, '[^1]: The claim is footnoted.', 'footnote definition round-tripped');
}

console.log('\n== Blockquote multi-line ==');
{
  const md = [
    '> line one',
    '> line two',
    '>',
    '> line four',
  ].join('\n');
  const { html, back } = roundTrip(md);
  assertContains(html, '<blockquote', 'blockquote rendered');
  assertContains(back, '> line one', 'first line round-trip');
  assertContains(back, '> line four', 'last line round-trip');
}

console.log('\n== Definition list ==');
{
  const md = [
    'Term',
    ':   Definition text here',
  ].join('\n');
  const { html, back } = roundTrip(md);
  assertContains(html, 'md-deflist', 'deflist rendered');
  assertContains(back, 'Term', 'term round-trip');
  assertContains(back, 'Definition text here', 'desc round-trip');
}

console.log('\n== Subscript vs strikethrough ==');
{
  const md = 'H~2~O and ~~deleted~~.';
  const { html } = roundTrip(md);
  assertContains(html, '<sub class="md-subscript">2</sub>', 'subscript applied');
  assertContains(html, '<del class="md-strike">deleted</del>', 'strikethrough applied');
}

console.log('\n== Empty cell preservation ==');
{
  const md = [
    '| A | B | C |',
    '| --- | --- | --- |',
    '| 1 |  | 3 |',
  ].join('\n');
  const { html } = roundTrip(md);
  // Count <th> and <td> cells (not <thead>/<tbody>).
  const cellCount = (html.match(/<t(?:h|d)(?:>|\s)/g) || []).length;
  assert(cellCount === 6, `cell count matches columns × rows (got ${cellCount}, expected 6)`);
  assertContains(html, '<td></td>', 'empty middle cell rendered');
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('Failures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
