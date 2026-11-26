/* ==========================================================================
   Soft UI sounds. OFF by default; a small speaker button in the header
   turns them on and the choice is remembered (localStorage "jp-sound").
   Every sound is synthesized live with the Web Audio API: no audio files,
   nothing to download, nothing copyrighted. Volume is kept low.
   Shared by the homepage and /freelance/.
   ========================================================================== */
(function () {
    'use strict';

    var KEY = 'jp-sound';
    var on = false;
    try { on = localStorage.getItem(KEY) === 'on'; } catch (e) {}

    var AC = window.AudioContext || window.webkitAudioContext;
    var actions = document.querySelector('.header-actions');
    var themeBtn = document.getElementById('themeToggle');
    if (!AC || !actions) return;

    /* ---------- Toggle button ---------- */
    var SVG_ON = '<svg class="icon snd-on" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3.5v6h3L11 19V5Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></g></svg>';
    var SVG_OFF = '<svg class="icon snd-off" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3.5v6h3L11 19V5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></g></svg>';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'soundToggle';
    btn.className = 'icon-btn sound-toggle';
    btn.innerHTML = SVG_ON + SVG_OFF + '<span class="snd-label"></span>';
    var labelEl = btn.querySelector('.snd-label');

    // Header on wider screens; inside the menu on phones, where the header is full.
    var nav = document.getElementById('siteNav');
    var navHost = null;
    if (nav) {
        var list = nav.querySelector('.nav-list');
        navHost = document.createElement(list ? 'li' : 'div');
        navHost.className = 'nav-sound';
        var cta = list && list.querySelector('.nav-cta-mobile');
        if (list) list.insertBefore(navHost, cta); else nav.appendChild(navHost);
    }
    var phone = window.matchMedia ? window.matchMedia('(max-width: 560px)') : null;
    function place() {
        if (navHost && phone && phone.matches) { if (btn.parentNode !== navHost) navHost.appendChild(btn); }
        else if (btn.parentNode !== actions) actions.insertBefore(btn, themeBtn || actions.firstChild);
    }
    place();
    if (phone) {
        if (phone.addEventListener) phone.addEventListener('change', place);
        else if (phone.addListener) phone.addListener(place);
    }

    function label() {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', 'Interface sounds');
        btn.title = on ? 'Turn interface sounds off' : 'Turn interface sounds on';
        labelEl.textContent = on ? 'Interface sounds: on' : 'Interface sounds: off';
    }
    label();

    /* ---------- Tiny synth ---------- */
    var ctx = null, master = null, noise = null;
    function audio() {
        if (!ctx) {
            try { ctx = new AC(); } catch (e) { return null; }
            master = ctx.createGain();
            master.gain.value = 0.55;
            // Gentle low-pass so nothing sounds harsh on phone speakers
            var lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 5200;
            master.connect(lp);
            lp.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function tone(f1, f2, dur, vol, type, delay) {
        var c = audio(); if (!c) return;
        var t = c.currentTime + (delay || 0);
        var o = c.createOscillator(), g = c.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f1, t);
        o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.03);
    }

    function whoosh(dur, from, to, vol) {
        var c = audio(); if (!c) return;
        if (!noise) {
            noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate);
            var d = noise.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        var t = c.currentTime;
        var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
        src.buffer = noise;
        bp.type = 'bandpass';
        bp.Q.value = 0.9;
        bp.frequency.setValueAtTime(from, t);
        bp.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
        bp.frequency.exponentialRampToValueAtTime(from * 0.8, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(t); src.stop(t + dur + 0.02);
    }

    var SFX = {
        click: function () { tone(1500, 720, 0.045, 0.06, 'triangle'); },
        toggle: function () { tone(620, 640, 0.06, 0.05, 'sine'); tone(930, 960, 0.08, 0.05, 'sine', 0.06); },
        whoosh: function () { whoosh(0.34, 380, 2200, 0.09); },
        on: function () { tone(520, 540, 0.08, 0.05, 'sine'); tone(780, 800, 0.08, 0.05, 'sine', 0.07); tone(1170, 1190, 0.14, 0.045, 'sine', 0.14); }
    };

    var lastAt = 0;
    function play(name) {
        if (!on) return;
        var now = Date.now();
        if (now - lastAt < 45) return;   // no machine-gun clicks
        lastAt = now;
        SFX[name]();
    }

    btn.addEventListener('click', function () {
        on = !on;
        try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
        label();
        if (on) SFX.on();
    });

    /* ---------- What makes which sound ---------- */
    document.addEventListener('click', function (e) {
        if (!on) return;
        var t = e.target.closest ? e.target : e.target.parentElement;
        if (!t || t.closest('#soundToggle')) return;
        if (t.closest('.theme-toggle, .menu-toggle, [aria-pressed], [role="switch"], input[type="checkbox"], input[type="radio"]')) { play('toggle'); return; }
        var a = t.closest('a[href]');
        if (a) {
            var href = a.getAttribute('href') || '';
            // Moving somewhere on the site: a soft whoosh
            if (href.charAt(0) === '#' || a.target !== '_blank' && a.origin === location.origin) { play('whoosh'); return; }
            play('click');
            return;
        }
        if (t.closest('button, summary, [role="button"], label')) play('click');
    }, true);
})();
