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
- Scroll-story particle system in raw WebGL/GLSL (no library): a globe behind the ID card that morphs into a wave and a dot grid section by section, reacts to cursor, touch, phone tilt and scroll, and adapts its quality to hold 60fps (static frame for reduced motion and very low-end phones, skipped on Data Saver)
- "Ask Paulo's AI": an on-site assistant that answers questions about services, turnaround and availability from the site's own content, runs fully in the browser (no API key), and hands off to Messenger with the visitor's questions copied
- Glowing cursor and magnetic buttons on desktop; page transitions between the homepage and Creative Studio (View Transitions API with a fade fallback); staggered section reveals, pinned workflow cards and a scroll progress bar
- Live Bacolod / New York / London clock with full-time availability badge
- Five services with deliverables and tools
- Case-study dialogs (problem, process, result, links) for the video pipeline, document studio, knowledge ops and this site
- Video reels that lazy-load ~250px before they scroll in, play muted while on screen (or on hover), pause when you scroll past, with a one-tap sound toggle
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
├── js/globe-fx.js        # WebGL particle globe / wave / grid scroll story
├── js/motion.js          # Cursor, magnetic buttons, page transitions, reveal stagger
├── js/assistant.js       # "Ask Paulo's AI" on-site assistant (shared with /freelance/)
├── css/motion.css        # Shared motion styles
├── css/assistant.css     # Assistant styles
├── freelance/            # Paulo Creative Studio (standalone page)
├── assets/
│   ├── images/           # Portrait, reel posters, social card
│   ├── videos/           # Reels (H.264 MP4)
│   └── resume.pdf        # One-page ATS-friendly résumé (generated from tools/resume.html)
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
