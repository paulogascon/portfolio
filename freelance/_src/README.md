# Studio sample sources

This folder is not published: GitHub Pages (Jekyll) skips folders that start with `_`.

| Path | What it is |
| --- | --- |
| `docs/*.html` + `docs/print.css` | Sources of the five sample PDFs (US Letter, editorial layout) |
| `fonts/` | Fraunces (SIL OFL) used by the PDFs; Inter and JetBrains Mono must be installed locally |
| `build.mjs` | Renders the PDFs into `../samples/pdf/` with Playwright Chromium, then runs `thumbs.py` |
| `thumbs.py` | Builds `../previews/<slug>.png` (modal), `<slug>-card.png` + `<slug>-card.webp` (cards) and `<slug>-cover.png` (hero) |
| `make_sop_docx.py` | Builds the Word sample `../samples/docx/Inbox_and_Calendar_Management_SOP.docx` |
| `og.html` | Source of the social preview `../assets/og-studio.png` (1200×630) |

Rebuild everything from the repo root:

```bash
node freelance/_src/build.mjs                    # all PDFs + previews
python freelance/_src/make_sop_docx.py --toc-pages 3,3,3,3,4,4,4,4,5
soffice --headless --convert-to pdf --outdir freelance/samples/docx freelance/samples/docx/Inbox_and_Calendar_Management_SOP.docx
python freelance/_src/thumbs.py va-inbox-sop
```

On Windows: `npm i -g playwright && npx playwright install chromium`, `pip install python-docx pillow`, and poppler (`winget install poppler`) for `pdftoppm`.
