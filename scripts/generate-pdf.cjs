const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DECK_DIR = path.resolve(__dirname, '..', 'src', 'deck');
const OUTPUT = path.resolve(__dirname, '..', 'src', 'deck', 'Adaptive-Study-Coach-Deck.pdf');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'src', 'deck', '_slides');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
};
const server = http.createServer((req, res) => {
  let filePath = path.join(DECK_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`Server on http://localhost:${PORT}`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Wait for reveal
  await page.waitForFunction(() => {
    try { return typeof Reveal !== 'undefined' && Reveal.isReady(); }
    catch (e) { return false; }
  }, { timeout: 20000 });
  await page.waitForTimeout(1000);

  const totalSlides = await page.evaluate(() => Reveal.getTotalSlides());
  console.log(`Total slides: ${totalSlides}`);

  const slideNames = [];

  for (let i = 0; i < totalSlides; i++) {
    await page.evaluate((idx) => Reveal.slide(idx), i);
    await page.waitForTimeout(1200);

    const name = `slide-${String(i + 1).padStart(2, '0')}.png`;
    const shotPath = path.join(SCREENSHOTS_DIR, name);
    await page.screenshot({ path: shotPath, fullPage: false });
    slideNames.push(name);
    console.log(`  Slide ${i + 1}/${totalSlides} captured`);
  }

  // Build print HTML (images co-located in _slides/ so simple filename paths work)
  const imagesHtml = slideNames
    .map((name) => `<div class="slide-page"><img src="${name}"></div>`)
    .join('\n<div class="pb"></div>\n');

  const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { margin: 0; padding: 0; background: #fff; }
  .slide-page { width: 100%; }
  img { display: block; width: 100%; height: auto; }
  .pb { page-break-after: always; }
</style>
</head><body>${imagesHtml}</body></html>`;

  const printPath = path.join(SCREENSHOTS_DIR, '_print.html');
  fs.writeFileSync(printPath, printHtml);

  // Navigate to print HTML
  await page.goto(`http://localhost:${PORT}/_slides/_print.html`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(1000);

  await page.pdf({
    path: OUTPUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0.3in', right: '0.3in', bottom: '0.3in', left: '0.3in' },
  });

  const fileSize = fs.statSync(OUTPUT).size;
  console.log(`\n✓ PDF saved: ${OUTPUT} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

  // Cleanup
  for (const name of slideNames) fs.unlinkSync(path.join(SCREENSHOTS_DIR, name));
  fs.unlinkSync(printPath);
  fs.rmdirSync(SCREENSHOTS_DIR);

  await browser.close();
  server.close();
}

main().catch((err) => { console.error(err); process.exit(1); });