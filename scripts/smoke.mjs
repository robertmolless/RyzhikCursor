import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
const logs = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack || ''}`));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('requestfailed', (r) => errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`));

await page.goto('http://127.0.0.1:4173/RyzhikCursor/', { waitUntil: 'networkidle0', timeout: 30000 });

await page.screenshot({ path: '/tmp/r-menu.png', fullPage: false });

// Click "Начать историю"
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const b = btns.find((b) => /Начать историю/i.test(b.textContent || ''));
  if (b) b.click();
});

await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/r-yard.png', fullPage: false });

// Move the cat right and wait
await page.keyboard.down('d');
await new Promise((r) => setTimeout(r, 2000));
await page.keyboard.up('d');
await page.screenshot({ path: '/tmp/r-yard2.png', fullPage: false });

// Try opening journal and cassettes
await page.keyboard.press('j');
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/r-journal.png', fullPage: false });
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));

await page.keyboard.press('m');
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/r-cassettes.png', fullPage: false });
await page.keyboard.press('Escape');

console.log('=== errors ===');
console.log(errors.length ? errors.join('\n---\n') : '(none)');
console.log('=== console warn/error ===');
console.log(logs.length ? logs.join('\n') : '(none)');

await browser.close();
