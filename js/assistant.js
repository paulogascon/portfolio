/* ==========================================================================
   "Ask Paulo's AI": a small on-site assistant.

   It runs entirely in the browser: no server, no API key, nothing sent
   anywhere. A visitor's question is matched against a knowledge base written
   only from facts already published on this site (services, studio packages,
   turnaround, availability, policy). It never invents prices: the site says
   projects are quoted per brief, so that is what it says.

   When a visitor wants a person, it copies their questions and opens
   Paulo's Messenger so they can paste and send.

   Include on a page with:
   <script src="js/assistant.js" data-base="" defer></script>
   (data-base="../" from /freelance/)
   The script loads css/assistant.css itself and shows the launcher once the
   styles are in, so the chat never blocks the page's first paint.
   ========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var me = doc.currentScript;
    var BASE = (me && me.getAttribute('data-base')) || '';
    var MESSENGER = 'https://m.me/61593941011028';
    var EMAIL = 'jhonpaulosolsona12@gmail.com';
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var onStudio = /\/freelance\/?/.test(location.pathname);

    function link(href, label, ext) {
        return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    }
    function home(hash) { return onStudio ? BASE + hash : hash; }        // same-page anchors on the homepage
    function studio(hash) { return onStudio ? (hash || './') : BASE + 'freelance/' + hash; }
    var L = {
        services: link(home('#services'), 'Services'),
        work: link(home('#work'), 'Selected work'),
        reels: link(home('#videos'), 'Reels'),
        contact: link(onStudio ? '#inquire' : '#contact', 'inquiry builder'),
        studio: link(studio(''), 'Creative Studio'),
        packages: link(studio('#packages'), 'studio packages'),
        samples: link(studio('#samples'), 'studio samples'),
        resume: link(BASE + 'assets/resume.pdf', 'one-page résumé (PDF)', true),
        email: link('mailto:' + EMAIL, EMAIL)
    };

    function bacolodTime() {
        try {
            return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date());
        } catch (e) { return null; }
    }

    /* ------------------------------------------------------------------
       Knowledge base. Every answer comes from text already on the site.
       k: keywords (weight), p: phrases (strong), a: answer (HTML string or fn)
       ------------------------------------------------------------------ */
    var INTENTS = [
        { id: 'greet', k: { hi: 2, hello: 2, hey: 2, morning: 1, afternoon: 1, evening: 1, kumusta: 2, yo: 1, sup: 1 },
          a: 'Hi! I answer questions about Paulo\'s services, rates, turnaround and availability. What can I help you with?' },

        { id: 'services', k: { service: 2, services: 2, offer: 2, do: 0.5, help: 0.6, skills: 1.5, skill: 1.5, specialize: 1.5, what: 0.3 },
          p: ['what do you do', 'what can you do', 'what do you offer', 'what services'],
          a: 'Paulo offers five services, alone or as a full-time mix:<ul><li><b>Virtual assistance</b>: inbox, calendar and admin</li><li><b>Frontend web development</b>: fast static sites and small web apps</li><li><b>Motion and video editing</b>: reels, motion graphics, captions</li><li><b>AI workflow automation</b>: n8n, Python, AI pipelines</li><li><b>Document and deck design</b>: Word, PDFs, decks, resumes</li></ul>See ' + L.services + ' for details.' },

        { id: 'va', k: { virtual: 2, assistant: 1.5, va: 3, admin: 2, inbox: 2.5, email: 0.8, emails: 1.5, calendar: 2.5, schedule: 1.2, scheduling: 2, meetings: 1.5, expense: 2, expenses: 2, tracker: 1.5, trackers: 1.5, sop: 2, sops: 2, gmail: 1.5, outlook: 1.5, data: 0.8, entry: 0.8 },
          a: 'As your virtual assistant, Paulo handles:<ul><li>Inbox triage, drafting and follow-ups</li><li>Calendar and meeting scheduling across US/UK hours</li><li>Expense and bill tracking in Sheets or Excel</li><li>SOPs, trackers and tidy file systems</li></ul>Tools: Gmail, Outlook, Google Workspace, Microsoft 365, Calendly, Notion and Slack.' },

        { id: 'web', k: { website: 3, web: 2, site: 2, landing: 2, page: 0.8, frontend: 3, developer: 1.5, html: 2, css: 2, javascript: 2, js: 1.5, portfolio: 0.8, app: 1, webapp: 2, github: 1, seo: 1, speed: 1, accessibility: 1.5 },
          a: 'Paulo builds fast, accessible static sites and small web apps that work on a budget Android phone first:<ul><li>Landing pages, portfolios and microsites</li><li>Responsive layouts with dark and light themes</li><li>Offline-first web apps with local storage</li><li>Accessibility and page-speed fixes, GitHub Pages deploys</li></ul>This site is one example. He built it by hand.' },

        { id: 'video', k: { video: 3, videos: 3, edit: 1.5, editing: 2, editor: 2, reel: 3, reels: 3, motion: 2.5, graphics: 1.5, mograph: 2, tiktok: 2, youtube: 2, shorts: 2, caption: 2, captions: 2, subtitles: 2, footage: 2, kinetic: 2, typography: 1 },
          a: function () {
              return 'Paulo edits short-form reels and simple long-form videos from your footage: kinetic titles, hand-checked captions and audio mastered to −14 LUFS.<ul><li><b>Short</b>: one reel up to 60 seconds, typically 2–3 working days</li><li><b>Series</b>: up to 4 reels from one shoot, or one edit up to 5 minutes, typically 4–6 working days</li></ul>Watch his ' + L.reels + '.';
          } },

        { id: 'automation', k: { automation: 3, automate: 3, automations: 3, n8n: 3, workflow: 2.5, workflows: 2.5, ai: 1.2, python: 2, script: 1.5, scripts: 1.5, pipeline: 2, obsidian: 2, whisper: 1.5, bot: 1, chatbot: 1.5 },
          a: 'Paulo turns repetitive tasks into pipelines you can run again tomorrow:<ul><li>n8n workflows between your apps</li><li>AI-assisted content and video pipelines</li><li>Python scripts for batch documents and media</li><li>Searchable knowledge bases in Obsidian</li></ul>The Workflows section on the homepage shows three he built and uses.' },

        { id: 'docs', k: { document: 2.5, documents: 2.5, doc: 2, docs: 2, word: 2, docx: 2.5, pdf: 2.5, pdfs: 2.5, deck: 3, decks: 3, powerpoint: 3, ppt: 3, pptx: 3, slides: 3, slide: 2.5, presentation: 3, format: 2, formatting: 3, apa: 3, proofread: 3, proofreading: 3, brochure: 2, handbook: 2, guide: 1.2, template: 1.5, templates: 1.5, layout: 1.5, design: 1 },
          a: 'Document work runs through Paulo\'s ' + L.studio + ':<ul><li>Presentation decks (PPTX + PDF)</li><li>Studio PDFs and guides</li><li>Word formatting, APA 7 and tracked-changes proofreading</li><li>Resumes and cover letters</li><li>Video edits</li></ul>It\'s design and formatting of your own content only, never ghostwriting. See the ' + L.packages + ' for scope and turnaround.' },

        { id: 'resume-service', k: { resume: 2, resumes: 2, cv: 2, cover: 1.5, letter: 1, ats: 3 },
          a: 'Resume work is part of the ' + L.studio + ':<ul><li><b>Resume</b>: a one- or two-page ATS-friendly resume from your real details, DOCX and PDF, 1 revision round, typically 1–2 working days</li><li><b>Resume + cover letter</b>: adds a matching cover letter layout and a proofread of your letter text, 2 revision rounds, typically 2–3 working days</li></ul>' },

        { id: 'paulo-cv', k: {}, p: ['your resume', 'your cv', 'paulo resume', 'paulos resume', 'paulo cv', 'paulos cv', 'his resume', 'his cv', 'download resume', 'download cv', 'see resume', 'your résumé'],
          a: 'Here\'s Paulo\'s ' + L.resume + '.' },

        { id: 'rates', k: { price: 3, prices: 3, pricing: 3, rate: 3, rates: 3, cost: 3, costs: 3, much: 1, fee: 3, fees: 3, budget: 2, quote: 2.5, charge: 2.5, hourly: 3, salary: 3, expensive: 2, cheap: 2, magkano: 4, presyo: 4, bayad: 1, usd: 1.5, php: 1.5, dollar: 1.5, dollars: 1.5 },
          p: ['how much'],
          a: 'Paulo doesn\'t publish fixed prices. Every project is quoted after a short brief: you get a scope, a price and a delivery date before any work starts. For full-time or part-time roles, the rate is agreed directly with him.<br><br>The fastest way to get a number is to message him with what you need.' , handoff: true },

        { id: 'turnaround', k: { turnaround: 4, fast: 2, quick: 1.5, quickly: 1.5, long: 1.2, deadline: 3, days: 2, rush: 4, urgent: 4, asap: 3, delivery: 2, deliver: 1.5, timeline: 3, kailan: 3, tomorrow: 2, today: 1.5 },
          p: ['how long', 'how fast', 'how soon', 'by when'],
          a: 'Typical studio turnaround, in working days from when your content is complete and the quote is confirmed:<ul><li>Decks: 2–3 (Essential) or 4–6 (Signature)</li><li>PDFs and guides: 3–4 or 5–8</li><li>Word formatting: 1–2, or 2–4 with a proofread</li><li>Resumes: 1–2, or 2–3 with a cover letter</li><li>Video: 2–3 for a short reel, 4–6 for a series</li></ul>A 24-hour rush is available on request, depending on scope and schedule. Ask before you book.' },

        { id: 'availability', k: { available: 3, availability: 3, hours: 2, hour: 1, time: 1, timezone: 3, zone: 2, shift: 2.5, shifts: 2.5, fulltime: 3, full: 1.2, part: 1, parttime: 3, start: 1.2, now: 0.8, open: 1, est: 2, pst: 2, us: 1, uk: 1, night: 1.5, overlap: 2, weekly: 1, week: 1 },
          p: ['full time', 'part time', 'are you available', 'time zone', 'when can you start'],
          a: function () {
              var t = bacolodTime();
              return 'Paulo is available <b>full-time, 40+ hours a week</b>, from Bacolod City, Philippines (UTC+8), and open to <b>US and UK shifts</b>.' + (t ? ' Right now it\'s ' + t + ' in Bacolod.' : '') + ' You can hire him full-time, part-time or for a one-off project.';
          } },

        { id: 'payment', k: { pay: 3, payment: 3, payments: 3, gcash: 3, paymaya: 4, maya: 3, paypal: 3, wise: 2, bank: 2, invoice: 2.5, method: 1.5, methods: 1.5, deposit: 2, bayad: 3, upfront: 2 },
          a: 'Paulo uses <b>PayMaya</b> for clients in the Philippines (he doesn\'t use GCash). Other methods can be arranged for international clients. The amount, method and timing are written into your quote before any work starts.' },

        { id: 'policy', k: { essay: 4, essays: 4, thesis: 4, research: 2, homework: 4, assignment: 4, assignments: 4, exam: 4, exams: 4, quiz: 4, quizzes: 4, coursework: 4, ghostwrite: 5, ghostwriting: 5, class: 2, classes: 2, capstone: 3, dissertation: 4, plagiarism: 3 },
          p: ['write my', 'do my', 'take my'],
          a: 'No. Paulo designs, formats and proofreads content you wrote yourself. He doesn\'t write theses, research papers, essays or graded coursework, take quizzes or classes, or invent data, sources or credentials.' },

        { id: 'students', k: { student: 3, students: 3, school: 2, college: 2, university: 2, teacher: 1.5, instructor: 1.5 },
          a: 'Students are welcome for formatting work they wrote themselves to APA 7 or their school\'s guide, a tracked-changes proofread, a resume, or a deck for a non-graded event or organisation. If your school limits outside editing, check with your instructor first.' },

        { id: 'revisions', k: { revision: 4, revisions: 4, changes: 2, rounds: 3, round: 2, feedback: 2, redo: 2, satisfied: 1.5 },
          a: 'Revision rounds are set by the package. Most include 1 round, and the bigger ones (Signature decks and PDFs, Resume + cover letter, video Series) include 2. Your tracked-changes proofread also lets you approve every edit.' },

        { id: 'files', k: { files: 3, file: 2, editable: 4, source: 3, deliverables: 3, formats: 2, srt: 2, mp4: 1.5, receive: 2, get: 0.4 },
          a: 'You always get editable files: decks as PPTX and PDF, documents as DOCX and PDF, layouts as PDF plus source, and video as MP4 with SRT captions. Everything is named and organised in one folder.' },

        { id: 'samples', k: { sample: 3, samples: 3, example: 3, examples: 3, portfolio: 1.5, previous: 2, projects: 2, project: 0.8, show: 1, proof: 1.5, case: 1.5, cases: 1.5, clients: 1.5, client: 1 },
          a: function () { return 'Take a look at ' + L.work + ' (case studies with the process behind them), the ' + L.reels + ', and downloadable ' + L.samples + '. Every sample is real, with no invented clients or results.'; } },

        { id: 'tools', k: { tools: 3, tool: 2, software: 3, stack: 3, apps: 1.5, use: 0.5, programs: 2, canva: 1.5, notion: 1.5, excel: 1.5, sheets: 1.5, ffmpeg: 2 },
          a: 'Paulo\'s toolbelt: Google Workspace, Microsoft 365 (Word, Excel, PowerPoint), n8n, Python, Obsidian, FFmpeg, Whisper, HTML/CSS/JavaScript, GitHub, Calendly and Notion. He works on Windows 11 and tests everything on Android.' },

        { id: 'location', k: { where: 2, located: 3, location: 3, based: 3, country: 2, philippines: 2, bacolod: 2, city: 1, from: 0.5 },
          a: 'Paulo is based in Bacolod City, Philippines (UTC+8), and works remotely with clients anywhere, including on US and UK hours.' },

        { id: 'about', k: { who: 1.5, about: 2, experience: 3, background: 3, education: 3, degree: 3, studied: 2, study: 1.5, bsit: 3, school: 0.5, qualifications: 3, years: 1.5 },
          p: ['who is paulo', 'tell me about', 'about paulo', 'about you'],
          a: function () { return 'Paulo started in motion graphics, then moved into frontend code and automating work with Python, n8n and AI tools. Today he works full-time for clients as a VA, web developer, editor and document designer.<br><br>Education: BS Information Technology (2nd-Year Coursework Completed), STI West Negros University. He has no class schedule and is fully available for full-time work. Here\'s his ' + L.resume + '.'; } },

        { id: 'process', k: { process: 3, steps: 2.5, step: 1.5, start: 1, begin: 2, onboarding: 2.5, brief: 2.5, how: 0.5, works: 1, order: 1.5, book: 2 },
          p: ['how does it work', 'how do i start', 'get started', 'how to hire', 'how do i hire'],
          a: function () { return 'It takes five steps: <b>1. Brief</b> (what you need, deadline, content) → <b>2. Quote</b> (scope, price, date; work starts when you confirm) → <b>3. First draft</b> → <b>4. Revisions</b> → <b>5. Delivery</b> of editable files plus exports.<br><br>The quickest start is the ' + L.contact + ' or a Messenger message.'; },
          handoff: true },

        { id: 'contact', k: { contact: 3, reach: 2.5, message: 2, messenger: 4, email: 1.5, talk: 2.5, chat: 1, hire: 2.5, human: 3, person: 2, real: 1, call: 2, facebook: 2, fb: 2, interview: 2.5, meet: 1.5 },
          p: ['talk to paulo', 'speak to', 'real person', 'get in touch'],
          a: function () { return 'Messenger is the fastest way to reach Paulo. You can also email ' + L.email + ' or use the ' + L.contact + '. He replies with a plan.'; },
          handoff: true },

        { id: 'thanks', k: { thanks: 3, thank: 3, salamat: 4, ty: 2, great: 1, awesome: 1, cool: 1, ok: 0.5, okay: 0.5 },
          a: 'You\'re welcome! If you\'d like a quote or have a question I couldn\'t answer, message Paulo directly.', handoff: true }
    ];

    var FALLBACK = 'I don\'t have a sure answer for that, and I\'d rather not guess. Paulo can answer it directly: tap <b>Message Paulo</b> below and paste your question.';
    var SUGGEST = [
        { label: 'What do you offer?', q: 'What services do you offer?' },
        { label: 'Rates', q: 'How much do you charge?' },
        { label: 'Availability', q: 'Are you available full-time?' },
        { label: 'Turnaround', q: 'How long does a project take?' },
        { label: 'Samples', q: 'Can I see examples of your work?' }
    ];

    /* ---------------- Matching ---------------- */
    function norm(s) {
        return s.toLowerCase()
            .replace(/[’']/g, '')
            .replace(/[^a-z0-9ñé\s-]/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    function stem(w) {
        if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
        if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
        return w;
    }
    function lev1(a, b) {
        // true when a and b are within one edit (typo tolerance)
        if (Math.abs(a.length - b.length) > 1) return false;
        var i = 0, j = 0, edits = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.length > b.length) i++;
            else if (b.length > a.length) j++;
            else { i++; j++; }
        }
        return edits + (a.length - i) + (b.length - j) <= 1;
    }
    function score(intent, words, text) {
        var s = 0, k = intent.k || {};
        words.forEach(function (w) {
            if (k[w] != null) { s += k[w]; return; }
            var st = stem(w);
            if (st !== w && k[st] != null) { s += k[st]; return; }
            if (w.length >= 5) {
                for (var key in k) {
                    if (key.length >= 5 && lev1(w, key)) { s += k[key] * 0.8; return; }
                }
            }
        });
        (intent.p || []).forEach(function (ph) { if (text.indexOf(ph) !== -1) s += 4; });
        return s;
    }
    function answer(q) {
        var text = norm(q);
        var words = text.split(' ').filter(Boolean);
        var best = null, bestScore = 0, second = 0;
        INTENTS.forEach(function (it) {
            var s = score(it, words, ' ' + text + ' ');
            if (s > bestScore) { second = bestScore; bestScore = s; best = it; }
            else if (s > second) second = s;
        });
        if (!best || bestScore < 1.5) return { html: FALLBACK, handoff: true, miss: true };
        var html = typeof best.a === 'function' ? best.a() : best.a;
        return { html: html, handoff: !!best.handoff, id: best.id };
    }

    /* ---------------- UI ---------------- */
    var asked = [];
    var root, panel, log, form, input, launcher, chips, handoffLink;

    var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    var ICON_MSG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C5.24 0 0 4.95 0 11.64c0 3.5 1.43 6.52 3.77 8.61.2.18.31.42.32.68l.07 2.14a.96.96 0 0 0 1.35.85l2.39-1.05a.96.96 0 0 1 .64-.05c1.1.3 2.26.46 3.46.46 6.76 0 12-4.95 12-11.64S18.76 0 12 0Zm7.2 8.95-3.52 5.6a1.8 1.8 0 0 1-2.6.48l-2.8-2.1a.72.72 0 0 0-.87 0l-3.79 2.87c-.5.39-1.17-.22-.82-.75l3.52-5.6a1.8 1.8 0 0 1 2.6-.48l2.8 2.1c.26.2.61.2.87 0l3.79-2.87c.5-.39 1.17.22.82.75Z"/></svg>';

    function el(tag, cls, html) {
        var e = doc.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function build() {
        root = el('div', 'pa');
        root.setAttribute('data-open', 'false');

        launcher = el('button', 'pa-launcher', ICON_CHAT + '<span class="pa-launcher-label">Ask Paulo\'s AI</span>');
        launcher.type = 'button';
        launcher.setAttribute('aria-expanded', 'false');
        launcher.setAttribute('aria-controls', 'paPanel');
        launcher.setAttribute('aria-label', 'Ask Paulo\'s AI: quick answers about services, rates and availability');

        panel = el('section', 'pa-panel');
        panel.id = 'paPanel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'paTitle');
        panel.hidden = true;
        panel.innerHTML =
            '<header class="pa-head">' +
                '<span class="pa-avatar" aria-hidden="true">JP<span class="pa-dot"></span></span>' +
                '<div class="pa-titles"><h2 class="pa-title" id="paTitle">Ask Paulo\'s AI</h2>' +
                '<p class="pa-sub">Instant answers from Paulo\'s site</p></div>' +
                '<button class="pa-close" type="button" aria-label="Close chat">' + ICON_CLOSE + '</button>' +
            '</header>' +
            '<div class="pa-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
            '<div class="pa-chips" role="group" aria-label="Suggested questions"></div>' +
            '<div class="pa-foot">' +
                '<form class="pa-form" autocomplete="off">' +
                    '<label class="pa-visually-hidden" for="paInput">Your question</label>' +
                    '<input class="pa-input" id="paInput" type="text" maxlength="300" placeholder="Ask a question…" enterkeyhint="send">' +
                    '<button class="pa-send" type="submit" aria-label="Send">' + ICON_SEND + '</button>' +
                '</form>' +
                '<a class="pa-handoff" href="' + MESSENGER + '" target="_blank" rel="noopener noreferrer">' + ICON_MSG + '<span>Message Paulo on Messenger</span></a>' +
                '<p class="pa-note">Answers come only from this site. Nothing leaves your browser unless you message Paulo.</p>' +
            '</div>';

        root.appendChild(panel);
        root.appendChild(launcher);
        whenStyled(function () { doc.body.appendChild(root); });

        log = panel.querySelector('.pa-log');
        chips = panel.querySelector('.pa-chips');
        form = panel.querySelector('.pa-form');
        input = panel.querySelector('.pa-input');
        handoffLink = panel.querySelector('.pa-handoff');

        SUGGEST.forEach(function (s) {
            var b = el('button', 'pa-chip');
            b.type = 'button';
            b.textContent = s.label;
            b.addEventListener('click', function () { ask(s.q); });
            chips.appendChild(b);
        });

        launcher.addEventListener('click', function () { setOpen(root.getAttribute('data-open') !== 'true'); });
        panel.querySelector('.pa-close').addEventListener('click', function () { setOpen(false); launcher.focus(); });
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var q = input.value.trim();
            if (!q) return;
            input.value = '';
            ask(q);
        });
        handoffLink.addEventListener('click', handoff);
        doc.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') { setOpen(false); launcher.focus(); }
        });
    }

    var greeted = false;
    function setOpen(open) {
        root.setAttribute('data-open', open ? 'true' : 'false');
        launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            panel.hidden = false;
            // let the hidden→shown change paint before animating
            requestAnimationFrame(function () { panel.classList.add('is-open'); });
            if (!greeted) {
                greeted = true;
                bot('Hi! I\'m Paulo\'s site assistant. Ask me about his services, rates, turnaround or availability.' +
                    (onStudio ? ' You\'re on the Creative Studio page, so studio packages are a good place to start.' : ''), false, true);
            }
            setTimeout(function () { input.focus({ preventScroll: true }); }, reduceMotion ? 0 : 180);
        } else {
            panel.classList.remove('is-open');
            setTimeout(function () { if (root.getAttribute('data-open') !== 'true') panel.hidden = true; }, reduceMotion ? 0 : 220);
        }
    }

    function scrollLog() { log.scrollTop = log.scrollHeight; }

    function userMsg(text) {
        var m = el('div', 'pa-msg pa-msg--user');
        m.textContent = text;
        log.appendChild(m);
        scrollLog();
    }

    function bot(html, handoffHint, instant) {
        var typing = el('div', 'pa-msg pa-msg--bot pa-typing', '<span></span><span></span><span></span>');
        typing.setAttribute('aria-hidden', 'true');
        var delay = instant || reduceMotion ? 0 : Math.min(900, 380 + html.length * 1.2);
        if (delay) { log.appendChild(typing); scrollLog(); }
        setTimeout(function () {
            if (typing.parentNode) typing.parentNode.removeChild(typing);
            var m = el('div', 'pa-msg pa-msg--bot', html);
            log.appendChild(m);
            if (handoffHint) {
                var b = el('button', 'pa-inline-handoff', ICON_MSG + '<span>Message Paulo</span>');
                b.type = 'button';
                b.addEventListener('click', function () { handoffLink.click(); });
                log.appendChild(b);
            }
            scrollLog();
        }, delay);
    }

    function ask(q) {
        asked.push(q);
        userMsg(q);
        var r = answer(q);
        bot(r.html, r.handoff);
    }

    // Messenger can't be pre-filled, so copy the visitor's questions first.
    function handoff() {
        var text = 'Hi Paulo! I came from your portfolio.' + (asked.length ? '\n\nMy questions:\n- ' + asked.slice(-5).join('\n- ') : '');
        copy(text);
        bot(asked.length ? 'Opening Messenger. Your questions are copied: just paste them into the chat and send.' : 'Opening Messenger. Say hi and tell Paulo what you need.', false, true);
    }
    function copy(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).catch(function () {}); return; }
        } catch (e) {}
        try {
            var ta = el('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            doc.body.appendChild(ta); ta.select(); doc.execCommand('copy'); doc.body.removeChild(ta);
        } catch (e) {}
    }

    // Expose the matcher for testing in the console: PauloAI.answer('rates?')
    window.PauloAI = { answer: function (q) { return answer(q); } };

    // Styles load in parallel with the page; the launcher appears when they're ready.
    var styled = false, styledQueue = [];
    function whenStyled(fn) { if (styled) fn(); else styledQueue.push(fn); }
    (function loadStyles() {
        function ready() {
            if (styled) return;
            styled = true;
            styledQueue.splice(0).forEach(function (fn) { fn(); });
        }
        var existing = doc.querySelector('link[href$="css/assistant.css"]');
        if (existing) {
            if (existing.sheet) ready();
            else existing.addEventListener('load', ready);
            return;
        }
        var css = doc.createElement('link');
        css.rel = 'stylesheet';
        css.href = BASE + 'css/assistant.css';
        css.addEventListener('load', ready);
        doc.head.appendChild(css);
    })();

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build);
    else build();
})();
