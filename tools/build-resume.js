// Renders tools/resume.html to assets/resume.pdf (one page, US Letter).
// Usage from the repo root: node tools/build-resume.js   (needs Playwright + Chromium)
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'resume.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.resolve(__dirname, '..', 'assets', 'resume.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await browser.close();
})();
