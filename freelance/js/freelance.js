/* Paulo Creative Studio — page behaviour (no dependencies). */
(function () {
  'use strict';

  var MESSENGER_URL = 'https://m.me/61593941011028';
  var EMAIL = 'jhonpaulosolsona12@gmail.com';
  var THEME_KEY = 'jp-portfolio-theme';

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------- Theme */
  var themeBtn = $('#themeToggle');
  function syncThemeButton() {
    var dark = doc.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    var meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach(function (m) { m.setAttribute('content', dark ? '#12100E' : '#F7F3EC'); m.removeAttribute('media'); });
  }
  if (themeBtn) {
    syncThemeButton();
    themeBtn.addEventListener('click', function () {
      var next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      doc.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
      syncThemeButton();
    });
  }

  /* ----------------------------------------------------------- Header/nav */
  var header = $('.site-header');
  var nav = $('#siteNav');
  var menuBtn = $('#menuToggle');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 880) setMenu(false); });
  }

  /* --------------------------------------------------------------- Reveal */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Anchor jumps: show the target section at once instead of waiting for the observer.
  function revealTarget(hash) {
    if (!hash || hash === '#' || hash === '#top') return;
    var target;
    try { target = document.querySelector(hash); } catch (e) { return; }
    if (!target) return;
    var section = target.closest('section') || target;
    if (section.classList.contains('reveal')) section.classList.add('in');
    $$('.reveal', section).forEach(function (el) { el.classList.add('in'); });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) revealTarget(a.getAttribute('href'));
  }, true);
  window.addEventListener('hashchange', function () { revealTarget(location.hash); });
  revealTarget(location.hash);

  /* --------------------------------------------------------- Package tabs */
  var tabs = $$('.tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ------------------------------------------------------- Sample filters */
  var filters = $$('.filter');
  var samples = $$('.sample');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      samples.forEach(function (s) {
        var show = f === 'all' || s.getAttribute('data-type') === f;
        s.hidden = !show;
        if (show) s.classList.add('in');
      });
    });
  });

  /* ------------------------------------------------------- Preview dialog */
  var viewer = $('#viewer');
  var viewerImg = $('#viewerImg');
  var viewerTitle = $('#viewerTitle');
  var viewerOpen = $('#viewerOpen');
  var viewerDownload = $('#viewerDownload');
  var lastTrigger = null;

  function openViewer(card, trigger) {
    var title = card.getAttribute('data-title');
    var file = card.getAttribute('data-file');
    var open = card.getAttribute('data-open');
    viewerTitle.textContent = title;
    var preview = card.getAttribute('data-preview');
    // WebP previews fall back to the PNG next to them on very old browsers.
    viewerImg.onerror = /\.webp$/.test(preview) ? function () { viewerImg.onerror = null; viewerImg.src = preview.replace(/\.webp$/, '.png'); } : null;
    viewerImg.src = preview;
    viewerImg.alt = 'Preview pages of ' + title;
    viewerDownload.href = file;
    viewerDownload.setAttribute('download', file.split('/').pop());
    viewerDownload.lastChild.textContent = /\.pptx$/.test(file) ? 'Download PPTX' : /\.docx$/.test(file) ? 'Download DOCX' : 'Download PDF';
    if (open) { viewerOpen.href = open; viewerOpen.hidden = false; } else { viewerOpen.hidden = true; }
    lastTrigger = trigger;
    if (typeof viewer.showModal === 'function') {
      viewer.showModal();
    } else {
      window.open(open || file, '_blank', 'noopener');
    }
  }
  function closeViewer() { if (viewer.open) viewer.close(); }
  if (viewer) {
    $$('.sample').forEach(function (card) {
      $$('.sample-thumb, .preview', card).forEach(function (el) {
        if (el.tagName === 'BUTTON') el.addEventListener('click', function () { openViewer(card, el); });
      });
    });
    $('#viewerClose').addEventListener('click', closeViewer);
    viewer.addEventListener('click', function (e) { if (e.target === viewer) closeViewer(); });
    viewer.addEventListener('close', function () { if (lastTrigger) lastTrigger.focus(); });
  }

  /* ------------------------------------------------------ Inquiry builder */
  var PACKAGES = {
    'Presentation deck': ['Essential (up to 12 slides, 2–3 days)', 'Signature (up to 25 slides, 4–6 days)'],
    'Studio PDF or guide': ['Essential (up to 8 pages, 3–4 days)', 'Signature (up to 24 pages, 5–8 days)'],
    'Word formatting and proofreading': ['Format (1–2 days)', 'Format + proofread (2–4 days)'],
    'Resume': ['Resume (1–2 days)', 'Resume + cover letter (2–3 days)'],
    'Video edit': ['Short (one reel up to 60 s, 2–3 days)', 'Series (up to 4 reels, 4–6 days)']
  };

  var form = $('#inquiryForm');
  var fName = $('#fName');
  var fService = $('#fService');
  var fPackage = $('#fPackage');
  var fSize = $('#fSize');
  var fDeadline = $('#fDeadline');
  var fNotes = $('#fNotes');
  var fConfirm = $('#fConfirm');
  var formError = $('#formError');
  var previewBody = $('#previewBody');
  var previewCount = $('#previewCount');
  var sendNote = $('#sendNote');
  var defaultNote = sendNote ? sendNote.textContent : '';

  function fillPackages(service, pick) {
    var opts = PACKAGES[service] || [];
    fPackage.innerHTML = '';
    var first = document.createElement('option');
    first.value = '';
    first.textContent = 'Help me choose';
    fPackage.appendChild(first);
    opts.forEach(function (label) {
      var o = document.createElement('option');
      o.value = label;
      o.textContent = label;
      if (pick && label.indexOf(pick + ' (') === 0) o.selected = true;
      fPackage.appendChild(o);
    });
    fPackage.disabled = !opts.length;
  }

  function formatDate(v) {
    if (!v) return '';
    var d = new Date(v + 'T00:00:00');
    if (isNaN(d)) return v;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function buildMessage() {
    var ready = (form.querySelector('input[name="ready"]:checked') || {}).value || '';
    var name = fName.value.trim();
    var lines = [];
    lines.push('Hi Paulo,');
    lines.push('');
    lines.push("I'd like a quote from Paulo Creative Studio.");
    lines.push('');
    lines.push('Service: ' + (fService.value || '(not chosen yet)'));
    if (fPackage.value) lines.push('Package: ' + fPackage.value);
    if (fSize.value.trim()) lines.push('Size: ' + fSize.value.trim());
    lines.push('Deadline: ' + (formatDate(fDeadline.value) || 'flexible'));
    lines.push('Content ready: ' + ready);
    if (fNotes.value.trim()) {
      lines.push('');
      lines.push('About the project:');
      lines.push(fNotes.value.trim());
    }
    lines.push('');
    lines.push('The content is mine to share, and this is not a request to write graded coursework.');
    lines.push('');
    lines.push('Thanks,');
    lines.push(name || '(your name)');
    return lines.join('\n');
  }

  function render() {
    var msg = buildMessage();
    previewBody.textContent = msg;
    previewCount.textContent = msg.length + ' characters';
  }

  function validate() {
    var problems = [];
    [fName, fService].forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!fName.value.trim()) { problems.push('your name'); fName.setAttribute('aria-invalid', 'true'); }
    if (!fService.value) { problems.push('a service'); fService.setAttribute('aria-invalid', 'true'); }
    if (!fConfirm.checked) problems.push('the confirmation box');
    if (problems.length) {
      formError.textContent = 'Please add ' + problems.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' before sending.';
      formError.hidden = false;
      var firstBad = !fName.value.trim() ? fName : !fService.value ? fService : fConfirm;
      firstBad.focus({ preventScroll: false });
      return false;
    }
    formError.hidden = true;
    return true;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function note(text, ok) {
    sendNote.textContent = text;
    sendNote.classList.toggle('ok', !!ok);
    clearTimeout(note.t);
    note.t = setTimeout(function () { sendNote.textContent = defaultNote; sendNote.classList.remove('ok'); }, 7000);
  }

  if (form) {
    fillPackages('');
    render();
    form.addEventListener('input', render);
    form.addEventListener('change', function (e) {
      if (e.target === fService) fillPackages(fService.value);
      if (!formError.hidden) validate();
      render();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    // Today or later for the deadline picker.
    try { fDeadline.min = new Date().toISOString().slice(0, 10); } catch (e) { /* ignore */ }

    $('#sendMessenger').addEventListener('click', function () {
      if (!validate()) return;
      var msg = buildMessage();
      // Open synchronously so mobile browsers don't block the new tab, then copy.
      var w = window.open(MESSENGER_URL, '_blank');
      if (w) { try { w.opener = null; } catch (e) { /* ignore */ } }
      copyText(msg).then(function (ok) {
        note(ok ? 'Message copied. Paste it into the Messenger chat that just opened.' : 'Messenger opened. Copy the message above and paste it into the chat.', ok);
        if (!w) window.location.href = MESSENGER_URL;
      });
    });

    $('#sendEmail').addEventListener('click', function () {
      if (!validate()) return;
      var subject = 'Studio inquiry: ' + (fService.value || 'project') + (fName.value.trim() ? ' (' + fName.value.trim() + ')' : '');
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildMessage());
      note('Your email app should open with the message filled in.', true);
    });

    $('#copyOnly').addEventListener('click', function () {
      copyText(buildMessage()).then(function (ok) {
        note(ok ? 'Message copied to your clipboard.' : 'Copy did not work here. Select the message above and copy it.', ok);
      });
    });

    // "Inquire about …" buttons on package cards preselect the builder.
    $$('.pkg .pick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.pkg');
        var service = card.getAttribute('data-service');
        fService.value = service;
        fillPackages(service, card.getAttribute('data-package'));
        render();
        revealTarget('#inquire');
        var target = document.getElementById('inquire');
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(function () { fName.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      });
    });
  }
})();
