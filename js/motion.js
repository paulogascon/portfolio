/* ==========================================================================
   Shared motion layer for the homepage and /freelance/:
   1. Glowing cursor + magnetic buttons (desktop mouse only, never on touch,
      off for prefers-reduced-motion).
   2. Page transitions between the homepage and Creative Studio. Browsers with
      cross-document View Transitions get them from CSS (@view-transition);
      others get a short fade-out/fade-in here.
   3. Scroll story helpers: staggered reveals and a scroll progress bar.
   ========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    var reduced = mq('(prefers-reduced-motion: reduce)');
    var finePointer = mq('(hover: hover) and (pointer: fine)');

    /* ------------------------------------------------------------------
       1. Cursor + magnetic buttons
       ------------------------------------------------------------------ */
    if (finePointer && !reduced) {
        var ring = doc.createElement('div');
        var dot = doc.createElement('div');
        ring.className = 'cursor-ring';
        dot.className = 'cursor-dot';
        ring.setAttribute('aria-hidden', 'true');
        dot.setAttribute('aria-hidden', 'true');

        var mx = -100, my = -100, rx = -100, ry = -100, raf = 0, shown = false;
        var HOT = 'a, button, [role="button"], summary, label, select, .badge, [data-magnetic]';
        var TEXT = 'input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';

        function loop() {
            raf = 0;
            rx += (mx - rx) * 0.22;
            ry += (my - ry) * 0.22;
            ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
            dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
            if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) raf = requestAnimationFrame(loop);
        }
        function kick() { if (!raf) raf = requestAnimationFrame(loop); }

        doc.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            mx = e.clientX; my = e.clientY;
            if (!shown) {
                shown = true;
                rx = mx; ry = my;
                if (!ring.parentNode) { doc.body.appendChild(ring); doc.body.appendChild(dot); }
                root.classList.add('has-cursor');
            }
            var t = e.target;
            var onText = t.closest && t.closest(TEXT);
            var onHot = !onText && t.closest && t.closest(HOT);
            ring.classList.toggle('is-hot', !!onHot);
            ring.classList.toggle('is-text', !!onText);
            dot.classList.toggle('is-text', !!onText);
            kick();
        }, { passive: true });
        doc.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') ring.classList.add('is-down'); }, { passive: true });
        doc.addEventListener('pointerup', function () { ring.classList.remove('is-down'); }, { passive: true });
        root.addEventListener('pointerleave', function () { root.classList.remove('has-cursor'); shown = false; });
        // A modal dialog renders above everything, so hide the follower there.
        doc.addEventListener('focusin', function () {
            var open = doc.querySelector('dialog[open]');
            root.classList.toggle('cursor-muted', !!open);
        });

        // Magnetic pull: buttons lean toward the cursor (max ~8px), then spring back.
        var MAGNETIC = '.btn, .icon-btn, .pa-launcher, [data-magnetic]';
        var active = null;
        doc.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            var el = e.target.closest && e.target.closest(MAGNETIC);
            if (active && active !== el) release(active);
            if (!el) { active = null; return; }
            active = el;
            var r = el.getBoundingClientRect();
            var dx = e.clientX - (r.left + r.width / 2);
            var dy = e.clientY - (r.top + r.height / 2);
            var pull = Math.min(1, 34 / Math.max(r.width, 34));
            var tx = Math.max(-8, Math.min(8, dx * 0.35 * pull + dx * 0.08));
            var ty = Math.max(-6, Math.min(6, dy * 0.35));
            el.classList.add('is-magnet');
            el.style.translate = tx.toFixed(1) + 'px ' + ty.toFixed(1) + 'px';
        }, { passive: true });
        function release(el) {
            el.style.translate = '';
            el.classList.remove('is-magnet');
        }
        doc.addEventListener('pointerout', function (e) {
            if (active && e.target === active && !active.contains(e.relatedTarget)) { release(active); active = null; }
        }, { passive: true });
    }

    /* ------------------------------------------------------------------
       2. Page transitions (fallback for browsers without CSS view transitions)
       ------------------------------------------------------------------ */
    var nativeVT = 'CSSViewTransitionRule' in window;
    function isStudioHop(a) {
        if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
        var url;
        try { url = new URL(a.href, location.href); } catch (e) { return false; }
        if (url.origin !== location.origin) return false;
        if (url.pathname === location.pathname) return false; // same page anchors
        return /\/portfolio\/(freelance\/)?(index\.html)?$/.test(url.pathname) || /^\/(freelance\/)?(index\.html)?$/.test(url.pathname);
    }
    if (!nativeVT && !reduced) {
        doc.addEventListener('click', function (e) {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var a = e.target.closest && e.target.closest('a[href]');
            if (!isStudioHop(a)) return;
            e.preventDefault();
            root.classList.add('is-leaving');
            setTimeout(function () { location.href = a.href; }, 220);
        });
        // Coming back through the back/forward cache: undo the fade.
        window.addEventListener('pageshow', function () { root.classList.remove('is-leaving'); });
    }

    /* ------------------------------------------------------------------
       3. Scroll story helpers
       ------------------------------------------------------------------ */
    // Stagger siblings that reveal together (cards, rows, reels).
    Array.prototype.forEach.call(doc.querySelectorAll('[data-reveal]'), function (el) {
        var parent = el.parentElement;
        if (!parent) return;
        var sibs = Array.prototype.filter.call(parent.children, function (c) { return c.hasAttribute('data-reveal'); });
        if (sibs.length > 1) el.style.setProperty('--i', Math.min(sibs.indexOf(el), 6));
    });
})();
