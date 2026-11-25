/* ==========================================================================
   Jhon Paulo Gascon — homepage behaviour
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;
    var THEME_KEY = 'jp-portfolio-theme'; // shared with /freelance/
    var reduceMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function prefersReducedMotion() { return !!(reduceMotionQuery && reduceMotionQuery.matches); }

    function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
    function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

    /* ---------------------------------------------------------------------
       Toast
       --------------------------------------------------------------------- */
    var toastEl = $('#toast');
    var toastTimer = null;
    function toast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('is-shown');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('is-shown'); }, 3200);
    }

    /* ---------------------------------------------------------------------
       Theme toggle
       --------------------------------------------------------------------- */
    var themeBtn = $('#themeToggle');
    function syncThemeButton() {
        if (!themeBtn) return;
        var dark = root.getAttribute('data-theme') !== 'light';
        themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        themeBtn.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    if (themeBtn) {
        syncThemeButton();
        themeBtn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
            syncThemeButton();
        });
    }

    /* ---------------------------------------------------------------------
       Header: scrolled state, mobile menu, active link
       --------------------------------------------------------------------- */
    var header = $('#siteHeader');
    var menuBtn = $('#menuToggle');
    var nav = $('#siteNav');

    function onScroll() {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
        if (!menuBtn || !nav) return;
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
        nav.classList.toggle('is-open', open);
    }
    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        $all('a', nav).forEach(function (a) {
            a.addEventListener('click', function () { setMenu(false); });
        });
        doc.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                menuBtn.focus();
            }
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 960) setMenu(false);
        });
    }

    var navLinks = $all('.nav-link[href^="#"]');
    if ('IntersectionObserver' in window && navLinks.length) {
        var linkFor = {};
        navLinks.forEach(function (l) { linkFor[l.getAttribute('href').slice(1)] = l; });
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var link = linkFor[entry.target.id];
                navLinks.forEach(function (l) { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
                if (link) {
                    link.classList.add('is-active');
                    link.setAttribute('aria-current', 'true');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        $all('main > section[id]').forEach(function (s) { sectionObserver.observe(s); });
    }

    /* ---------------------------------------------------------------------
       Scroll reveal
       --------------------------------------------------------------------- */
    var revealEls = $all('[data-reveal]');
    if ('IntersectionObserver' in window && !prefersReducedMotion()) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    /* ---------------------------------------------------------------------
       Feature 2: live PH / US-ET / UK clock
       --------------------------------------------------------------------- */
    var clockEls = $all('[data-tz]');
    var dayEls = $all('[data-tz-day]');
    var clockNote = $('#clockNote');

    function tzOffsetMinutes(tz, date) {
        // Offset of a time zone from UTC, in minutes, at the given instant.
        var local = new Date(date.toLocaleString('en-US', { timeZone: tz }));
        var utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        return Math.round((local - utc) / 60000);
    }

    function formatHour(h) {
        var hour = ((h % 24) + 24) % 24;
        var suffix = hour >= 12 ? 'PM' : 'AM';
        var h12 = hour % 12 === 0 ? 12 : hour % 12;
        return h12 + ' ' + suffix;
    }

    function tickClock() {
        var now = new Date();
        clockEls.forEach(function (el) {
            var tz = el.getAttribute('data-tz');
            try {
                el.textContent = now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
                el.setAttribute('datetime', now.toISOString());
            } catch (e) { el.textContent = '—'; }
        });
        dayEls.forEach(function (el) {
            try {
                el.textContent = now.toLocaleDateString('en-US', { timeZone: el.getAttribute('data-tz-day'), weekday: 'short' });
            } catch (e) { el.textContent = ''; }
        });
        if (clockNote) {
            try {
                var diff = (tzOffsetMinutes('Asia/Manila', now) - tzOffsetMinutes('America/New_York', now)) / 60;
                clockNote.textContent = 'A 9 AM New York start is ' + formatHour(9 + diff) + ' in Bacolod.';
            } catch (e) { /* keep static note */ }
        }
    }
    if (clockEls.length) {
        tickClock();
        // Align updates to the start of each minute, then every 30s.
        setTimeout(function () { tickClock(); setInterval(tickClock, 30000); }, (60 - new Date().getSeconds()) * 1000);
    }

    /* ---------------------------------------------------------------------
       1b: spring-physics lanyard card
       --------------------------------------------------------------------- */
    (function lanyard() {
        var wrapper = $('#lanyardWrapper');
        var canvas = $('#lanyardCanvas');
        var badge = $('#hangingBadge');
        var hint = $('#dragHint');
        var card = badge ? $('.idcard', badge) : null;
        if (!wrapper || !canvas || !badge || !canvas.getContext) return;

        var ctx = canvas.getContext('2d');
        var cores = navigator.hardwareConcurrency || 8;
        var memory = navigator.deviceMemory || 8;
        var lowEnd = cores <= 4 || memory <= 3;
        var reduced = prefersReducedMotion();

        var NUM_SEGMENTS = lowEnd ? 8 : 10;
        var ITERATIONS = lowEnd ? 8 : 14;
        var GRAVITY = 0.44;
        var DAMPING = reduced ? 0.9 : 0.965;
        var ANCHOR_Y = 6;
        var CLIP_OFFSET = 22; // card top sits just below the strap end, under the clip ring
        var RIBBON_W = 26;

        var width = 0, height = 0, dpr = 1;
        var STRAP_LENGTH = 150;
        var SEG_LEN = STRAP_LENGTH / NUM_SEGMENTS;
        var points = [];

        function measure() {
            width = wrapper.clientWidth || 400;
            height = wrapper.clientHeight || 600;
            dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            STRAP_LENGTH = height < 600 ? 128 : 190;
            SEG_LEN = STRAP_LENGTH / NUM_SEGMENTS;
        }

        function resetPoints() {
            points = [];
            var x = width / 2;
            for (var i = 0; i <= NUM_SEGMENTS; i++) {
                var y = ANCHOR_Y + i * SEG_LEN;
                points.push({ x: x, y: y, oldX: x, oldY: y });
            }
        }

        measure();
        resetPoints();

        // Woven strap texture: dark ribbon, accent edges, stitching and a repeating name.
        var strap = doc.createElement('canvas');
        function paintStrap() {
            var s = 3; // texture scale keeps the text crisp
            var w = RIBBON_W * s, h = 900;
            strap.width = w;
            strap.height = h;
            var g = strap.getContext('2d');
            g.fillStyle = '#141414';
            g.fillRect(0, 0, w, h);
            g.globalAlpha = 0.06;
            g.fillStyle = '#ffffff';
            for (var y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
            g.globalAlpha = 1;
            g.fillStyle = '#ff6b35';
            g.fillRect(0, 0, 2 * s, h);
            g.fillRect(w - 2 * s, 0, 2 * s, h);
            g.strokeStyle = 'rgba(244,241,234,0.35)';
            g.lineWidth = 1;
            g.setLineDash([6, 5]);
            g.beginPath();
            g.moveTo(4.5 * s, 0); g.lineTo(4.5 * s, h);
            g.moveTo(w - 4.5 * s, 0); g.lineTo(w - 4.5 * s, h);
            g.stroke();
            g.setLineDash([]);
            g.save();
            g.translate(w / 2, 0);
            g.rotate(Math.PI / 2);
            g.fillStyle = '#f4f1ea';
            g.font = '700 ' + (8.5 * s) + 'px "Instrument Sans", "Segoe UI", system-ui, sans-serif';
            g.textBaseline = 'middle';
            var label = 'JP GASCON  \u2022  CREATIVE TECHNOLOGIST  \u2022  ';
            var step = g.measureText(label).width;
            for (var x = 12; x < h; x += step) g.fillText(label, x, 0);
            g.restore();
        }
        paintStrap();
        // Repaint once the web font has loaded so the strap text uses it.
        if (doc.fonts && doc.fonts.ready) {
            doc.fonts.ready.then(function () { paintStrap(); wake(); });
        }

        /* ----- Interaction state ----- */
        var isDragging = false, pointerDown = false, intentDecided = false;
        var dragTargetX = 0, dragTargetY = 0, grabOffX = 0, grabOffY = 0;
        var startX = 0, startY = 0, lastX = 0, lastY = 0, velX = 0, velY = 0;
        var rotZ = 0, rotY = 0, rotX = 0;
        var hintHidden = false;

        function hideHint() {
            if (hint && !hintHidden) { hint.classList.add('is-hidden'); hintHidden = true; }
        }

        function localPos(clientX, clientY) {
            var r = wrapper.getBoundingClientRect();
            return { x: clientX - r.left, y: clientY - r.top };
        }

        function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return;
            pointerDown = true;
            intentDecided = false;
            isDragging = false;
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            velX = velY = 0;
            var end = points[points.length - 1];
            var p = localPos(e.clientX, e.clientY);
            grabOffX = end.x - p.x;
            grabOffY = end.y - p.y;
            dragTargetX = end.x;
            dragTargetY = end.y;
            if (e.pointerType === 'mouse') {
                isDragging = true;
                intentDecided = true;
                badge.classList.add('is-dragging');
                hideHint();
            }
            wake();
        }

        function onPointerMove(e) {
            if (!pointerDown) return;
            var dx = e.clientX - startX, dy = e.clientY - startY;
            if (!intentDecided && e.pointerType !== 'mouse') {
                // Touch: vertical intent scrolls the page, horizontal swings the card.
                if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) {
                    pointerDown = false;
                    intentDecided = true;
                    return;
                }
                if (Math.abs(dx) > 6) {
                    intentDecided = true;
                    isDragging = true;
                    badge.classList.add('is-dragging');
                    hideHint();
                }
            }
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            velX = velX * 0.6 + (e.clientX - lastX) * 0.4;
            velY = velY * 0.6 + (e.clientY - lastY) * 0.4;
            lastX = e.clientX;
            lastY = e.clientY;

            var p = localPos(e.clientX, e.clientY);
            var tx = p.x + grabOffX, ty = p.y + grabOffY;
            var ax = width / 2, ay = ANCHOR_Y;
            var dist = Math.hypot(tx - ax, ty - ay);
            var maxReach = STRAP_LENGTH + 130;
            if (dist > maxReach) {
                // elastic resistance past the strap's reach
                var ang = Math.atan2(ty - ay, tx - ax);
                var resisted = maxReach + Math.pow(dist - maxReach, 0.65);
                tx = ax + Math.cos(ang) * resisted;
                ty = ay + Math.sin(ang) * resisted;
            }
            var cardH = badge.offsetHeight || 380;
            dragTargetX = Math.max(30, Math.min(width - 30, tx));
            dragTargetY = Math.max(30, Math.min(height - cardH - 10, ty));
        }

        function onPointerEnd() {
            if (isDragging) {
                var end = points[points.length - 1];
                var vx = Math.max(-5.5, Math.min(5.5, velX * 0.35));
                var vy = Math.max(-4, Math.min(4, velY * 0.35));
                end.oldX = end.x - vx;
                end.oldY = end.y - vy;
            }
            pointerDown = false;
            isDragging = false;
            intentDecided = false;
            badge.classList.remove('is-dragging');
            wake();
        }

        badge.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);
        badge.addEventListener('dragstart', function (e) { e.preventDefault(); });

        // Keyboard: arrows push the card, Enter/Space give it a swing.
        badge.addEventListener('keydown', function (e) {
            var end = points[points.length - 1];
            var push = 0;
            if (e.key === 'ArrowLeft') push = -7;
            else if (e.key === 'ArrowRight') push = 7;
            else if (e.key === 'Enter' || e.key === ' ') push = (Math.random() > 0.5 ? 1 : -1) * 9;
            if (!push) return;
            e.preventDefault();
            if (reduced) push *= 0.5;
            end.oldX = end.x - push;
            hideHint();
            wake();
        });

        /* ----- Simulation ----- */
        var rafId = null;
        var visible = true;
        var stillFrames = 0;
        var idleBreeze = !reduced && !lowEnd;

        function step(now) {
            var last = points.length - 1;
            var end = points[last];
            points[0].x = width / 2;
            points[0].y = ANCHOR_Y;

            if (isDragging) {
                end.x += (dragTargetX - end.x) * 0.44;
                end.y += (dragTargetY - end.y) * 0.44;
            } else if (idleBreeze) {
                points[Math.floor(NUM_SEGMENTS / 2)].x += Math.sin(now * 0.0016) * 0.045;
            }

            var motion = 0;
            for (var i = 1; i <= last; i++) {
                if (i === last && isDragging) continue;
                var p = points[i];
                var vx = (p.x - p.oldX) * DAMPING;
                var vy = (p.y - p.oldY) * DAMPING;
                p.oldX = p.x;
                p.oldY = p.y;
                p.x += vx;
                p.y += vy + GRAVITY;
                motion += Math.abs(vx) + Math.abs(vy);
            }

            for (var it = 0; it < ITERATIONS; it++) {
                for (var j = 0; j < NUM_SEGMENTS; j++) {
                    var a = points[j], b = points[j + 1];
                    var dx = b.x - a.x, dy = b.y - a.y;
                    var d = Math.hypot(dx, dy);
                    if (!d) continue;
                    var diff = (SEG_LEN - d) / d * 0.5;
                    var ox = dx * diff, oy = dy * diff;
                    if (j !== 0) { a.x -= ox; a.y -= oy; }
                    if (!(j + 1 === last && isDragging)) { b.x += ox; b.y += oy; }
                }
            }

            // Card orientation from the last strap segment
            var pre = points[last - 1];
            var angle = Math.atan2(end.x - pre.x, end.y - pre.y);
            var tZ = Math.max(-20, Math.min(20, -angle * 57.2958 * 0.48));
            var lateral = (end.x - width / 2) / (width / 2);
            var tY = Math.max(-14, Math.min(14, -lateral * 12));
            var tX = Math.max(-8, Math.min(10, (end.y - (ANCHOR_Y + STRAP_LENGTH)) / 160 * 7));
            rotZ += (tZ - rotZ) * 0.14;
            rotY += (tY - rotY) * 0.14;
            rotX += (tX - rotX) * 0.14;

            var w = badge.offsetWidth || 220;
            badge.style.left = (end.x - w / 2) + 'px';
            badge.style.top = (end.y + CLIP_OFFSET) + 'px';
            badge.style.transform = 'perspective(900px) rotateZ(' + rotZ.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) rotateX(' + rotX.toFixed(2) + 'deg)';
            if (card) card.style.setProperty('--gloss', (rotY * 2.6 - rotZ * 1.6).toFixed(1) + '%');

            draw();
            return motion;
        }

        function stroke(offsetX, offsetY, color, lw) {
            ctx.beginPath();
            ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
            for (var i = 1; i < points.length; i++) ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            if (!lowEnd) stroke(4, 6, 'rgba(0,0,0,0.28)', RIBBON_W);
            stroke(0, 0, '#141414', RIBBON_W);

            var srcH = strap.height / NUM_SEGMENTS * (STRAP_LENGTH / 190);
            for (var i = 0; i < NUM_SEGMENTS; i++) {
                var a = points[i], b = points[i + 1];
                var dx = b.x - a.x, dy = b.y - a.y;
                var len = Math.hypot(dx, dy);
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
                ctx.drawImage(strap, 0, i * srcH, strap.width, srcH, -RIBBON_W / 2, 0, RIBBON_W, len + 1.5);
                ctx.restore();
            }
        }

        function loop(now) {
            var motion = step(now);
            // Sleep when the card has settled and nothing keeps it moving (saves battery).
            if (!isDragging && !pointerDown && !idleBreeze && motion < 0.02) stillFrames++;
            else stillFrames = 0;
            if (visible && stillFrames < 90) {
                rafId = requestAnimationFrame(loop);
            } else {
                rafId = null;
            }
        }

        function wake() {
            stillFrames = 0;
            if (!rafId && visible) rafId = requestAnimationFrame(loop);
        }

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var oldLen = STRAP_LENGTH;
                measure();
                if (oldLen !== STRAP_LENGTH) resetPoints();
                wake();
            }, 120);
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (visible) wake();
            }, { threshold: 0.02 }).observe(wrapper);
        }

        if (reduceMotionQuery && reduceMotionQuery.addEventListener) {
            reduceMotionQuery.addEventListener('change', function () {
                reduced = prefersReducedMotion();
                idleBreeze = !reduced && !lowEnd;
                DAMPING = reduced ? 0.9 : 0.965;
                wake();
            });
        }

        // Give the card a small entrance swing (skipped for reduced motion).
        if (!reduced) {
            var end = points[points.length - 1];
            end.oldX = end.x - 5;
        }
        wake();
    })();

    /* ---------------------------------------------------------------------
       Feature 3: tap-to-play reels (nothing downloads until play)
       --------------------------------------------------------------------- */
    var reels = $all('.reel');
    function pauseOthers(except) {
        reels.forEach(function (r) {
            var v = $('.reel-video', r);
            if (v && r !== except && !v.paused) v.pause();
        });
    }
    reels.forEach(function (reel) {
        var video = $('.reel-video', reel);
        var btn = $('.reel-play', reel);
        if (!video || !btn) return;

        btn.addEventListener('click', function () {
            pauseOthers(reel);
            reel.classList.add('is-loading');
            video.controls = true;
            video.preload = 'auto';
            var p = video.play();
            reel.classList.add('is-started');
            if (p && p.catch) {
                p.catch(function () {
                    // Autoplay with sound blocked: retry muted, controls stay visible.
                    video.muted = true;
                    video.play().catch(function () { /* user can use native controls */ });
                });
            }
            video.focus({ preventScroll: true });
        });

        video.addEventListener('playing', function () {
            reel.classList.remove('is-loading');
            reel.classList.add('is-playing');
            pauseOthers(reel);
        });
        video.addEventListener('pause', function () { reel.classList.remove('is-playing'); });
        video.addEventListener('ended', function () { reel.classList.remove('is-playing'); });
        video.addEventListener('error', function () {
            reel.classList.remove('is-loading');
            toast('That video could not load. Please try again later.');
        });
    });
    if ('IntersectionObserver' in window && reels.length) {
        var reelObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var v = $('.reel-video', entry.target);
                if (!entry.isIntersecting && v && !v.paused) v.pause();
            });
        }, { threshold: 0.15 });
        reels.forEach(function (r) { reelObserver.observe(r); });
    }

    /* ---------------------------------------------------------------------
       Feature 1: case-study dialogs
       --------------------------------------------------------------------- */
    function openDialog(dialog) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        root.style.overflow = 'hidden';
    }
    function closeDialog(dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }
    $all('[data-case]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var dialog = doc.getElementById(btn.getAttribute('data-case'));
            if (dialog) openDialog(dialog);
        });
    });
    $all('.case-dialog').forEach(function (dialog) {
        dialog.addEventListener('close', function () { root.style.overflow = ''; });
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) closeDialog(dialog); // backdrop
        });
        $all('[data-close]', dialog).forEach(function (el) {
            el.addEventListener('click', function () { closeDialog(dialog); });
        });
    });

    /* ---------------------------------------------------------------------
       Feature 5: inquiry builder (Messenger / email / GCash quote)
       --------------------------------------------------------------------- */
    var form = $('#inquiryBuilder');
    if (form) {
        var preview = $('#builderPreview');
        var status = $('#builderStatus');
        var emailBtn = $('#sendEmail');
        var messengerBtn = $('#sendMessenger');
        var copyBtn = $('#copyMessage');
        var EMAIL = 'jhonpaulosolsona12@gmail.com';

        function values(name) {
            return $all('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; });
        }

        function buildMessage() {
            var name = ($('#bName').value || '').trim();
            var services = values('service');
            var engagement = values('engagement')[0] || '';
            var tz = $('#bTimezone').value;
            var start = $('#bStart').value;
            var note = ($('#bNote').value || '').trim();
            var gcash = $('#bGcash').checked;

            var lines = [];
            lines.push('Hi JP! I found your portfolio and would like to work with you.');
            lines.push('');
            if (name) lines.push('Name: ' + name);
            lines.push('Services: ' + (services.length ? services.join(', ') : 'Not sure yet, happy to talk it through'));
            if (engagement) lines.push('Engagement: ' + engagement);
            lines.push('My time zone: ' + tz);
            lines.push('Start: ' + start);
            if (gcash) lines.push('Payment: Please send a quote I can pay via GCash (Philippines).');
            if (note) {
                lines.push('');
                lines.push('Details: ' + note);
            }
            lines.push('');
            lines.push('Thanks!');

            var subject = 'Inquiry: ' + (services.length ? services.slice(0, 2).join(' + ') + (services.length > 2 ? ' +' + (services.length - 2) : '') : 'Working together') + (engagement ? ' (' + engagement.split(' (')[0] + ')' : '');
            return { text: lines.join('\n'), subject: subject };
        }

        function render() {
            var m = buildMessage();
            preview.textContent = m.text;
            emailBtn.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.text);
            if (status) status.textContent = '';
        }

        function copy(text) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise(function (resolve, reject) {
                var ta = doc.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                doc.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
                doc.body.removeChild(ta);
                if (ok) resolve(); else reject(new Error('copy failed'));
            });
        }

        form.addEventListener('input', render);
        form.addEventListener('change', render);
        form.addEventListener('submit', function (e) { e.preventDefault(); });

        copyBtn.addEventListener('click', function () {
            copy(buildMessage().text).then(function () {
                status.textContent = 'Copied. Paste it anywhere you like to reach me.';
                toast('Message copied');
            }, function () {
                status.textContent = 'Could not copy automatically. Select the message above and copy it.';
            });
        });

        messengerBtn.addEventListener('click', function () {
            // Messenger links can't prefill text, so copy first; the link opens in a new tab.
            copy(buildMessage().text).then(function () {
                status.textContent = 'Message copied. Paste it into the Messenger chat that just opened.';
                toast('Message copied, paste it in Messenger');
            }, function () {
                status.textContent = 'Messenger is opening. Copy the message above and paste it into the chat.';
            });
        });

        emailBtn.addEventListener('click', function () {
            status.textContent = 'Opening your email app with the message filled in.';
        });

        render();
    }
})();
