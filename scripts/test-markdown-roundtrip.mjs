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
const stubbed = `${noImports}\nexport { parseInlineMarkdown, parseMarkdownToHtml, htmlToMarkdown, renderTable, splitTableRow, parseTableAlignments, renderTableCell, escapeHtml, decodeEscapes, createFootnoteStore, expandHtmlInline };`;

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

const { parseMarkdownToHtml, htmlToMarkdown, parseInlineMarkdown, renderTable, expandHtmlInline } = mod;

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

console.log('\n== HTML inline tags ==');
{
  const md = 'Plain <sub>sub</sub> and <sup>sup</sup>, <b>bold</b> <strong>strong</strong>, <i>it</i> <em>em</em>, <del>del</del> <s>s</s>, <mark>mark</mark>, <code>code</code>, <kbd>kbd</kbd>.';
  const { html, back } = roundTrip(md);
  assertContains(html, '<sub class="md-subscript">sub</sub>', '<sub> → md-subscript');
  assertContains(html, '<sup class="md-superscript">sup</sup>', '<sup> → md-superscript');
  assertContains(html, '<strong class="md-bold">bold</strong>', '<b> → md-bold');
  assertContains(html, '<strong class="md-bold">strong</strong>', '<strong> → md-bold');
  assertContains(html, '<em class="md-italic">it</em>', '<i> → md-italic');
  assertContains(html, '<em class="md-italic">em</em>', '<em> → md-italic');
  assertContains(html, '<del class="md-strike">del</del>', '<del> → md-strike');
  assertContains(html, '<del class="md-strike">s</del>', '<s> → md-strike');
  assertContains(html, '<mark class="md-highlight">mark</mark>', '<mark> → md-highlight');
  assertContains(html, '<code class="md-code">code</code>', '<code> → md-code');
  assertContains(html, '<code class="md-code">kbd</code>', '<kbd> → md-code');
  // Round-trip: HTML form should serialise back to the equivalent markdown.
  assertContains(back, '~sub~', '<sub> round-trips to ~');
  assertContains(back, '^sup^', '<sup> round-trips to ^');
  assertContains(back, '**bold**', '<b> round-trips to **');
  assertContains(back, '*it*', '<i> round-trips to *');
  assertContains(back, '==mark==', '<mark> round-trips to ==');
  assertContains(back, '`code`', '<code> round-trips to `');
  assertContains(back, '`kbd`', '<kbd> round-trips to `');
}

console.log('\n== <br> line break ==');
{
  const md = 'Line one<br>Line two<br/>Line three<br />Line four.';
  const { html, back } = roundTrip(md);
  // <br> is treated as a soft line break: each instance produces a <br> in
  // the rendered paragraph. We don't require exact count, just that breaks
  // survive round-trip in some form.
  const brCount = (html.match(/<br>/g) || []).length;
  assert(brCount >= 3, `<br> preserved (got ${brCount} <br>, expected >= 3)`);
  assertContains(back, 'Line one', 'first line in round-trip');
  assertContains(back, 'Line four', 'last line in round-trip');
}

console.log('\n== Unknown HTML tag passes through as text ==');
{
  // A tag outside the whitelist must not be interpreted as HTML — it should
  // be visible as literal text in the output. This protects against XSS in
  // the editor when reading untrusted markdown.
  const md = '<script>alert(1)</script> visible text.';
  const { html } = roundTrip(md);
  assert(!html.includes('<script'), 'unknown <script> tag is not rendered as HTML');
  assertContains(html, 'visible text', 'surrounding text survives');
}

console.log('\n== Code block has data-lang for highlighter ==');
{
  const md = '```typescript\nconst x: number = 1;\n```';
  const { html, back } = roundTrip(md);
  assertContains(html, 'data-lang="typescript"', 'code block records language for highlight.js');
  assertContains(html, 'const x: number = 1;', 'code body preserved verbatim');
  assertContains(back, '```typescript', 'language tag round-trips');
  assertContains(back, 'const x: number = 1;', 'code round-trips');
}

console.log('\n== Highlighted code block round-trips ==');
{
  // Simulate what the editor does after parseMarkdownToHtml: apply
  // highlight.js to the <code> element, which wraps tokens in <span
  // class="hljs-…">. The htmlToMarkdown pass should still recover the
  // original source.
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLDivElement', 'HTMLPreElement', 'HTMLAnchorElement', 'HTMLInputElement', 'Range', 'Selection', 'NodeFilter', 'getSelection']) {
    if (key in dom.window && !(key in globalThis)) globalThis[key] = dom.window[key];
  }
  const md = '```javascript\nfunction add(a, b) { return a + b; }\n```';
  const html = parseMarkdownToHtml(md);
  // Apply highlight.js to the <code> block, mimicking applySyntaxHighlighting.
  const container = dom.window.document.createElement('div');
  container.innerHTML = html;
  const codeEl = container.querySelector('pre.md-code-block code');
  if (codeEl) {
    // Synthetic tokenization — wrap a keyword and a string literal.
    codeEl.innerHTML = '<span class="hljs-keyword">function</span> add(a, b) { <span class="hljs-keyword">return</span> a + b; }';
    codeEl.classList.add('hljs');
  }
  const back = htmlToMarkdown(container.innerHTML);
  assertContains(back, '```javascript', 'language tag survives highlight pass');
  assertContains(back, 'function add(a, b)', 'highlighted code body round-trips');
  assert(!back.includes('<span'), 'no HTML spans leak into the markdown output');
}

console.log('\n== expandHtmlInline idempotent on plain markdown ==');
{
  // Running the HTML expansion on a string that has no whitelisted HTML
  // tags must leave it unchanged — important because parseInlineMarkdown
  // calls expandHtmlInline on every inline pass.
  const sample = 'Plain **bold** and `code` and a [link](https://x.com).';
  assert(expandHtmlInline(sample) === sample, 'plain markdown is untouched by expandHtmlInline');
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
