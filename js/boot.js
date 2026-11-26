/* ==========================================================================
   Boot-up intro (about one second, once per visit).
   The <head> script decides whether to play it by adding html.is-booting.
   Paulo's name types in, a thin bar fills, then the overlay lifts and
   js/globe-fx.js bursts the particle globe open ("jp:boot-done").
   Click, tap or any key skips it. A CSS failsafe hides the overlay even if
   this file never loads.
   ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;
    var overlay = document.getElementById('boot');

    function markDone() {
        window.__jpBootDone = true;
        try { sessionStorage.setItem('jp-booted', '1'); } catch (e) {}
        window.dispatchEvent(new Event('jp:boot-done'));
    }

    if (!root.classList.contains('is-booting') || !overlay) {
        if (overlay) overlay.remove();
        return;
    }

    var NAME = 'Jhon Paulo Gascon';
    var TYPE_MS = 560;      // whole name
    var HOLD_MS = 960;      // when the overlay starts to lift
    var typeEl = document.getElementById('bootType');
    var t0 = 0, raf = 0, finished = false, lastLen = -1;

    function frame(now) {
        if (!t0) t0 = now;
        var el = now - t0;
        var len = Math.min(NAME.length, Math.ceil(el / TYPE_MS * NAME.length));
        if (len !== lastLen && typeEl) { typeEl.textContent = NAME.slice(0, len); lastLen = len; }
        if (el >= HOLD_MS) { finish(); return; }
        raf = requestAnimationFrame(frame);
    }

    function finish() {
        if (finished) return;
        finished = true;
        if (raf) cancelAnimationFrame(raf);
        if (typeEl) typeEl.textContent = NAME;
        overlay.classList.add('is-out');
        root.classList.remove('is-booting');
        root.classList.add('is-booted');
        markDone();
        window.removeEventListener('keydown', skip, true);
        overlay.removeEventListener('pointerdown', skip);
        setTimeout(function () { overlay.remove(); }, 650);
    }

    function skip(e) {
        // Let modifier-only presses (Ctrl+R, Alt+Tab) pass without stealing them
        if (e && e.type === 'keydown' && (e.ctrlKey || e.metaKey || e.altKey)) return;
        finish();
    }

    window.addEventListener('keydown', skip, true);
    overlay.addEventListener('pointerdown', skip);
    // Never trap a visitor if the tab is backgrounded mid-intro
    document.addEventListener('visibilitychange', function () { if (document.hidden) finish(); });

    raf = requestAnimationFrame(frame);
})();
