import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.SMOKE_PORT || 5176);
const baseUrl = `http://127.0.0.1:${port}`;
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 500);
      });
    };

    check();
  });
}

async function main() {
  const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'pipe',
    shell: false,
  });

  const serverOutput = [];
  server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
  server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
    const errors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const editor = page.getByTestId('editor');
    await editor.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Try It' }).click();
    await page.waitForFunction(() => {
      const editorElement = document.querySelector('[data-testid="editor"]');
      return (editorElement?.parentElement?.scrollTop || 0) > 0;
    });

    // Verify the demo content exercises the table + footnote parsers: when
    // the file loads, parseMarkdownToHtml runs against the demo markdown and
    // the resulting <table> and <section class="md-footnotes"> should land in
    // the DOM. This is a real end-to-end check of the markdown → HTML render
    // path (the previous version of this test only verified the inline
    // pipeline, which never covered tables).
    await page.waitForFunction(() => {
      const editorElement = document.querySelector('[data-testid="editor"]');
      const table = editorElement?.querySelector('.md-table table');
      const footnoteSection = editorElement?.querySelector('.md-footnotes');
      return !!table && !!footnoteSection;
    });
    const tableText = await page.locator('[data-testid="editor"] .md-table table').textContent();
    if (!tableText || !/Feature/.test(tableText) || !/Tables/.test(tableText)) {
      throw new Error(`Demo table did not render expected cells. Got: ${tableText}`);
    }

    await editor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');

    await page.keyboard.type('# Smoke Title');
    await page.keyboard.press('Enter');
    await page.keyboard.type('A paragraph with **bold** text and `code`.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- [ ] Ship task');

    await page.waitForFunction(() => {
      const heading = document.querySelector('[data-testid="editor"] .md-line[data-type="h1"]');
      const task = document.querySelector('[data-testid="editor"] .md-task');
      return heading?.textContent?.includes('Smoke Title') && task?.textContent?.includes('Ship task');
    });

    await page.locator('[data-testid="editor"] .md-task input[type="checkbox"]').click();
    await page.waitForSelector('[data-testid="editor"] .md-task[data-checked="true"]');

    await page.getByRole('button', { name: 'Smoke Title' }).click();
    await page.getByTestId('open-settings').click();
    await page.getByTestId('close-settings').waitFor();
    await page.getByTestId('close-settings').click();

    await page.getByTestId('file-search').fill('welcome');
    await page.locator('aside').getByText('welcome.md', { exact: true }).waitFor();

    await mkdir(path.join(root, 'test-artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-artifacts', 'smoke.png'), fullPage: true });

    await browser.close();

    if (errors.length) {
      throw new Error(`Browser errors:\n${errors.join('\n')}`);
    }
  } catch (error) {
    const output = serverOutput.join('').trim();
    throw new Error(`${error.message}\n\nVite output:\n${output}`);
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
