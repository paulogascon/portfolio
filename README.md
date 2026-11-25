# Jhon Paulo Gascon — Portfolio

Full-time remote creative technologist from Bacolod City, Philippines. Available 40+ hrs/week and open to US and UK shifts for:

- **Virtual assistance** — inbox, calendar, expenses, SOPs and trackers
- **Frontend web development** — fast, accessible static sites and small web apps
- **Motion & video editing** — reels, motion graphics, captions, −14 LUFS mastering
- **AI workflow automation** — n8n, Python, Whisper, FFmpeg, Obsidian
- **Document & deck design** — Word formatting, PDFs, PowerPoint decks (design and formatting only, no academic ghostwriting)

**Live site:** https://paulogascon.github.io/portfolio/
**Creative Studio:** https://paulogascon.github.io/portfolio/freelance/
**Contact:** [Messenger](https://m.me/61593941011028) · jhonpaulosolsona12@gmail.com

## What's on the homepage

- Interactive hanging ID card driven by a Verlet spring-physics simulation on canvas (mouse, touch and keyboard; lighter mode on low-end Android; respects reduced motion)
- Live Bacolod / New York / London clock with full-time availability badge
- Five services with deliverables and tools
- Case-study dialogs (problem, process, result, links), starting with [STI 2G Study Hub](https://github.com/paulogascon/sti-2g-study-hub)
- Tap-to-play video reels: posters only, nothing downloads until you press play
- Workflow diagrams for the video, document and knowledge-ops pipelines
- Inquiry builder that writes a ready message for Messenger or email, with an optional GCash quote request
- Dark and light themes (shared with `/freelance/`), skip link, visible focus states

## Stack

Pure static HTML, CSS and JavaScript on GitHub Pages. No framework, no build step.
Fonts: Bricolage Grotesque (display) and Instrument Sans (body) from Google Fonts. Icons are an inline SVG sprite.

```text
├── index.html            # Homepage
├── css/home.css          # Homepage styles and theme tokens
├── js/home.js            # Lanyard physics, clock, reels, dialogs, inquiry builder
├── freelance/            # Paulo Creative Studio (standalone page)
├── assets/
│   ├── images/           # Portrait, reel posters, social card
│   ├── videos/           # Reels (H.264 MP4)
│   └── resume.pdf
├── favicon.svg, favicon-32.png, apple-touch-icon.png
├── sitemap.xml, robots.txt
└── generate_thumbnail.py # Legacy social-card generator (not used by the new homepage)
```

## Run locally

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

© 2026 Jhon Paulo V. Gascon
