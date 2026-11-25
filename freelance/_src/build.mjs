// Builds the Paulo Creative Studio sample PDFs and their preview images.
// Usage (from the repo root):  node freelance/_src/build.mjs [doc-name ...]
// Needs Node 18+ and Playwright (npm i -D playwright && npx playwright install chromium).
// Preview PNGs need poppler's pdftoppm on PATH (Windows: `winget install poppler`)
// and are composed by freelance/_src/thumbs.py (Python 3 + Pillow).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(here, 'docs');
const outDir = path.join(here, '..', 'samples', 'pdf');

// source html -> published PDF name
const DOCS = {
  'studio-services-guide': 'Paulo_Creative_Studio_Services_Guide.pdf',
  'apa7-formatting-guide': 'APA_7_Formatting_Quick_Reference.pdf',
  'remote-security-checklist': 'Remote_Work_Security_Checklist.pdf',
  'va-onboarding-kit': 'Virtual_Assistant_Client_Onboarding_Kit.pdf',
  'resume-template-pack': 'Resume_and_Cover_Letter_Template_Pack.pdf',
};

const only = process.argv.slice(2);
const names = Object.keys(DOCS).filter((n) => !only.length || only.includes(n));
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of names) {
  const src = path.join(docsDir, `${name}.html`);
  if (!fs.existsSync(src)) { console.warn(`skip ${name} (no source)`); continue; }
  await page.goto(pathToFileURL(src).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(outDir, DOCS[name]);
  await page.pdf({ path: out, width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
  console.log('pdf', path.relative(process.cwd(), out), `${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}
await browser.close();

try {
  execFileSync('python3', [path.join(here, 'thumbs.py'), ...names], { stdio: 'inherit' });
} catch (e) {
  console.warn('Preview step skipped:', e.message);
}
