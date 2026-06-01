// Tests for the outline builder. Lives in its own file because the helper
// lives in src/hooks/useMarkdown.ts, not the editor module.
//
// We esbuild the hook, replace the `useAppStore` import with a noop shim,
// and import the resulting module to get a pure `buildOutline` function.

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(
  resolve(__dirname, '../src/hooks/useMarkdown.ts'),
  'utf8',
);

// 1. Drop the React / store import at the top.
// 2. Export the `buildOutline` helper by name. We also synthesise a `useMemo`
//    shim that always recomputes (a no-op for our needs since we call the
//    function directly).
const noImports = hookSource.replace(/^import[\s\S]*?;\s*$/gm, '');
const stub = `
const useMemo = (fn) => fn();
${noImports}
export { buildOutline };
`;

const result = await esbuild.build({
  stdin: { contents: stub, loader: 'ts', resolveDir: __dirname },
  bundle: false,
  format: 'esm',
  target: 'es2020',
  write: false,
});

const tmpPath = resolve(__dirname, '.tmp-outline.mjs');
writeFileSync(tmpPath, result.outputFiles[0].text, 'utf8');
const mod = await import(`file://${tmpPath.replace(/\\/g, '/')}`);
unlinkSync(tmpPath);
const { buildOutline } = mod;

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

function findKind(outline, kind) {
  return outline.filter((i) => i.kind === kind);
}

console.log('== Headings only ==');
{
  const md = '# Title\n\nSome text.\n\n## Section A\n\nbody.\n\n### Sub A.1\n\nbody.\n';
  const items = buildOutline(md);
  const headings = findKind(items, 'heading');
  assert(headings.length === 3, 'three headings extracted');
  assert(headings[0].level === 1, 'first is h1');
  assert(headings[1].level === 2, 'second is h2');
  assert(headings[2].level === 3, 'third is h3');
  assert(headings[0].text === 'Title', 'first text is "Title"');
  assert(headings[0].id === 'heading-0', 'first id matches editor');
  assert(headings[1].id === 'heading-1', 'second id matches editor');
  assert(headings[2].id === 'heading-2', 'third id matches editor');
  assert(headings.every((h) => h.line && h.line > 0), 'line numbers populated');
}

console.log('\n== Tables ==');
{
  const md = [
    'Intro paragraph.',
    '',
    '| A | B | C |',
    '| --- | :---: | ---: |',
    '| 1 | 2 | 3 |',
    '| 4 | 5 | 6 |',
    '',
    'Trailing text.',
  ].join('\n');
  const items = buildOutline(md);
  const tables = findKind(items, 'table');
  assert(tables.length === 1, 'one table extracted');
  assert(tables[0].text === 'A +2', 'table preview shows first cell + extra count');
  assert(tables[0].hint === '3 col × 2 rows', 'column / row counts shown');
  assert(tables[0].id === 'block-table-0', 'table id matches editor convention');
  assert(tables[0].line === 3, 'table line points to header');
}

console.log('\n== Code blocks ==');
{
  const md = [
    'Some text.',
    '',
    '```typescript',
    'const x: number = 1;',
    '```',
    '',
    'Middle text.',
    '',
    '```python',
    'def f():',
    '    pass',
    '```',
  ].join('\n');
  const items = buildOutline(md);
  const codes = findKind(items, 'code-block');
  assert(codes.length === 2, 'two code blocks extracted');
  assert(codes[0].text === 'typescript code block', 'first block labelled with language');
  assert(codes[0].id === 'block-code-0', 'first code id matches editor');
  assert(codes[1].id === 'block-code-1', 'second code id matches editor');
  assert(codes[0].hint && codes[0].hint.startsWith('lines'), 'first block has line range');
}

console.log('\n== Blockquotes ==');
{
  const md = [
    '> line one',
    '> line two',
    '',
    'between.',
    '',
    '> second quote',
    '> more',
    '> more',
  ].join('\n');
  const items = buildOutline(md);
  const quotes = findKind(items, 'blockquote');
  assert(quotes.length === 2, 'two contiguous quotes extracted');
  assert(quotes[0].text === 'line one', `first quote preview is first line (got "${quotes[0].text}")`);
  assert(quotes[0].id === 'block-quote-0', 'first id matches editor');
  assert(quotes[1].id === 'block-quote-1', 'second id matches editor');
}

console.log('\n== Lists coalesce contiguous items ==');
{
  const md = [
    '- apple',
    '- banana',
    '- cherry',
    '',
    'between',
    '',
    '- durian',
  ].join('\n');
  const items = buildOutline(md);
  const lists = findKind(items, 'list');
  assert(lists.length === 2, 'two list runs coalesce');
  assert(lists[0].text === 'Bulleted list', 'first list is unordered');
  assert(lists[0].hint === '3 items', 'first list counts 3 items');
  assert(lists[0].id === 'block-list-0', 'first list id matches editor');
  assert(lists[1].hint === '1 item', 'second list has singular grammar');
}

console.log('\n== Task lists ==');
{
  const md = [
    '- [ ] one',
    '- [x] two',
    '- [ ] three',
  ].join('\n');
  const items = buildOutline(md);
  const tasks = findKind(items, 'task-list');
  assert(tasks.length === 1, 'one task list extracted');
  assert(tasks[0].text === 'Task list', 'task list labelled correctly');
  assert(tasks[0].hint === '3 items', '3 task items');
}

console.log('\n== Mixed kinds in document order ==');
{
  const md = [
    '# H1',
    '',
    'paragraph',
    '',
    '> a quote',
    '',
    '- a',
    '- b',
    '',
    '```',
    'code',
    '```',
    '',
    '| A | B |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '## H2',
  ].join('\n');
  const items = buildOutline(md);
  const order = items.map((i) => i.kind);
  // Expect: heading, blockquote, list, code-block, table, heading.
  const expected = ['heading', 'blockquote', 'list', 'code-block', 'table', 'heading'];
  assert(JSON.stringify(order) === JSON.stringify(expected), `document order preserved (got ${JSON.stringify(order)})`);
}

console.log('\n== Empty document ==');
{
  assert(buildOutline('').length === 0, 'empty input → empty outline');
  assert(buildOutline('   \n  \n').length === 0, 'whitespace-only input → empty outline');
}

console.log('\n== Markdown link decoration stripped from heading text ==');
{
  const md = '# See [the docs](https://example.com) and **bold**';
  const items = buildOutline(md);
  const h = findKind(items, 'heading')[0];
  assert(h.text === 'See the docs and bold', `heading text cleaned of inline syntax (got "${h.text}")`);
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail) {
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
