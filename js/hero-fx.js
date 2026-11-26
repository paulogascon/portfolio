/* ==========================================================================
   Hero FX: a living particle globe behind the ID card.
   Raw WebGL 1 (no library, no download): ~8k points on a noise-morphed
   sphere plus a tilted orbit ring. It reacts to the cursor (tilt + a
   magnetic "push"), to touch, to phone tilt on Android, and to scroll
   (the globe opens up and spins faster as the hero leaves the screen).

   Budget rules:
   - Starts after the page is idle, fades in, never blocks first paint.
   - DPR capped, point count scaled to the device.
   - Paused when the hero is off-screen or the tab is hidden.
   - Static single frame for prefers-reduced-motion and very low-end phones.
   - Skipped entirely on Data Saver or without WebGL (CSS glow stays).
   ========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;
    var hero = doc.getElementById('top');
    var host = doc.getElementById('heroFx');
    var lanyard = doc.getElementById('lanyardWrapper');
    if (!hero || !host) return;

    var conn = navigator.connection || {};
    if (conn.saveData) { host.classList.add('is-static'); return; }

    var cores = navigator.hardwareConcurrency || 8;
    var memory = navigator.deviceMemory || 8;
    var veryLowEnd = cores <= 2 || memory <= 2;
    var lowEnd = veryLowEnd || cores <= 4 || memory <= 3;
    var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function reducedMotion() { return !!(reduceQuery && reduceQuery.matches); }

    var canvas = doc.createElement('canvas');
    canvas.className = 'hero-fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    var gl = null;
    try {
        gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' }) ||
             canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) { host.classList.add('is-static'); return; }

    /* ---------------- Shaders ---------------- */
    var NOISE = [
        'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
        'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
        'float snoise(vec3 v){',
        '  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);',
        '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
        '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;',
        '  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
        '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
        '  i=mod289(i);',
        '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
        '  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
        '  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);',
        '  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);',
        '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
        '  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));',
        '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
        '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
        '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
        '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
        '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;',
        '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
        '}'
    ].join('\n');

    var VERT = [
        'precision highp float;',
        'attribute vec3 aPos;',      // sphere: unit vector; ring: (angle, radius, height)
        'attribute vec2 aRnd;',      // x: seed 0..1, y: kind (0 sphere, 1 ring)
        'uniform float uTime, uIntro, uScroll, uRadius, uPoint, uDpr, uFocus;',
        'uniform vec2 uRes, uCenter, uMouse;',
        'uniform float uMouseOn;',
        'uniform mat3 uRot, uRingTilt;',
        'varying float vAlpha, vHeat, vInk;',
        NOISE,
        'void main(){',
        '  float seed=aRnd.x; float ring=aRnd.y;',
        '  float t=uTime;',
        '  vec3 p; float glow=0.0;',
        '  if(ring<0.5){',
        '    vec3 n=aPos;',
        '    float n1=snoise(n*1.35+vec3(0.0,t*0.22,t*0.12));',
        '    float n2=snoise(n*3.1-vec3(t*0.3,0.0,t*0.18));',
        '    float r=1.0+0.13*n1+0.035*n2;',
        '    glow=smoothstep(0.15,0.75,n1);',
        '    p=n*r;',
        '  } else {',
        '    float a=aPos.x+t*(0.10+0.05*seed);',
        '    p=uRingTilt*vec3(cos(a)*aPos.y, aPos.z, sin(a)*aPos.y);',
        '    glow=0.35+0.5*step(0.93,seed);',
        '  }',
        // intro: particles fly in from a wide cloud; scroll: the globe opens up
        '  float scatter=(1.0-uIntro)*(1.6+2.4*seed)+uScroll*(0.25+0.9*seed);',
        '  p*=1.0+scatter;',
        '  p=uRot*p;',
        '  float cam=3.4;',
        '  float persp=cam/(cam-p.z);',
        '  vec2 sp=uCenter+vec2(p.x,-p.y)*persp*uRadius;',
        // magnetic push away from the pointer (screen space, CSS px)
        '  vec2 d=sp-uMouse; float dl=length(d);',
        '  float reach=uRadius*0.55;',
        '  float push=uMouseOn*smoothstep(reach,0.0,dl);',
        '  sp+=normalize(d+vec2(0.0001))*push*reach*0.32*(0.6+0.8*seed);',
        '  float front=clamp(p.z*0.5+0.5,0.0,1.0);',
        '  vHeat=clamp(glow*0.55+push*1.1,0.0,1.0);',
        '  vInk=step(0.86,seed)*(1.0-ring);',
        '  vAlpha=(0.18+0.82*front)*uIntro*(1.0-uScroll*0.55)*uFocus;',
        '  gl_PointSize=uPoint*uDpr*persp*(0.55+0.75*front)*(1.0+push*0.9)*(0.75+0.5*seed);',
        '  vec2 clip=vec2(sp.x/uRes.x*2.0-1.0, 1.0-sp.y/uRes.y*2.0);',
        '  gl_Position=vec4(clip,0.0,1.0);',
        '}'
    ].join('\n');

    var FRAG = [
        'precision mediump float;',
        'uniform vec3 uColA, uColB, uColInk;',
        'uniform float uGain, uInkMix;',
        'varying float vAlpha, vHeat, vInk;',
        'void main(){',
        '  vec2 c=gl_PointCoord-0.5; float d=length(c);',
        '  float disc=smoothstep(0.5,0.12,d);',
        '  vec3 col=mix(mix(uColA,uColB,vHeat),uColInk,vInk*uInkMix);',
        '  float a=disc*vAlpha*uGain*(0.75+0.5*vHeat);',
        '  gl_FragColor=vec4(col*a,a);',
        '}'
    ].join('\n');

    function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            if (window.console) console.warn('[hero-fx]', gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { host.classList.add('is-static'); return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { host.classList.add('is-static'); return; }
    gl.useProgram(prog);

    /* ---------------- Geometry ---------------- */
    var small = window.innerWidth < 700;
    var SPHERE = lowEnd ? 2600 : (small ? 4200 : 7200);
    var RING = lowEnd ? 700 : (small ? 1000 : 1700);
    var total = SPHERE + RING;
    var pos = new Float32Array(total * 3);
    var rnd = new Float32Array(total * 2);
    var golden = Math.PI * (3 - Math.sqrt(5));
    var i, k;
    for (i = 0; i < SPHERE; i++) {
        var y = 1 - (i / (SPHERE - 1)) * 2;
        var rad = Math.sqrt(1 - y * y);
        var th = golden * i;
        pos[i * 3] = Math.cos(th) * rad;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(th) * rad;
        rnd[i * 2] = Math.random();
        rnd[i * 2 + 1] = 0;
    }
    for (k = 0; k < RING; k++) {
        i = SPHERE + k;
        var band = Math.random();
        pos[i * 3] = Math.random() * Math.PI * 2;
        pos[i * 3 + 1] = 1.3 + band * band * 0.26 + (Math.random() - 0.5) * 0.04;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.035;
        rnd[i * 2] = Math.random();
        rnd[i * 2 + 1] = 1;
    }
    function attrib(name, data, size) {
        var loc = gl.getAttribLocation(prog, name);
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    attrib('aPos', pos, 3);
    attrib('aRnd', rnd, 2);

    var U = {};
    ['uTime', 'uIntro', 'uScroll', 'uRadius', 'uPoint', 'uDpr', 'uFocus', 'uRes', 'uCenter', 'uMouse', 'uMouseOn',
     'uRot', 'uRingTilt', 'uColA', 'uColB', 'uColInk', 'uGain', 'uInkMix'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    /* ---------------- Theme ---------------- */
    function hex(h) {
        var v = parseInt(h.replace('#', ''), 16);
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    }
    var dark = true;
    function applyTheme() {
        dark = root.getAttribute('data-theme') !== 'light';
        if (dark) {
            gl.blendFunc(gl.ONE, gl.ONE); // additive glow on dark
            gl.uniform3fv(U.uColA, hex('#ff6b35'));
            gl.uniform3fv(U.uColB, hex('#ffc9a8'));
            gl.uniform3fv(U.uColInk, hex('#f2efe9'));
            gl.uniform1f(U.uGain, 0.7);
            gl.uniform1f(U.uInkMix, 0.85);
        } else {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // crisp ink-like dots on paper
            gl.uniform3fv(U.uColA, hex('#e2531f'));
            gl.uniform3fv(U.uColB, hex('#ff8a4c'));
            gl.uniform3fv(U.uColInk, hex('#141414'));
            gl.uniform1f(U.uGain, 0.78);
            gl.uniform1f(U.uInkMix, 0.4);
        }
        render();
    }

    /* ---------------- Layout ---------------- */
    var W = 0, H = 0, dpr = 1;
    var layout = { cx: 0, cy: 0, r: 200, focus: 1, stacked: false, peekX: 0, peekY: 0, peekR: 0, cardY: 0 };

    function measure() {
        var hr = hero.getBoundingClientRect();
        W = Math.max(1, Math.round(hr.width));
        H = Math.max(1, Math.round(hr.height));
        dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : (W < 700 ? 1.5 : 1.75));
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);

        var stacked = window.matchMedia('(max-width: 960px)').matches;
        layout.stacked = stacked;
        if (lanyard) {
            var lr = lanyard.getBoundingClientRect();
            layout.cx = lr.left - hr.left + lr.width / 2;
            layout.cardY = lr.top - hr.top + Math.min(lr.height * 0.58, 340);
        } else {
            layout.cx = W * 0.75;
            layout.cardY = H * 0.5;
        }
        if (stacked) {
            layout.r = Math.min(W * 0.36, 210);
            // On phones the card sits below the fold, so the globe first peeks in
            // from the top-right corner and glides down behind the card on scroll.
            layout.peekX = W - Math.min(W * 0.04, 24);
            layout.peekY = 70;
            layout.peekR = Math.min(W * 0.36, 210);
        } else {
            layout.r = Math.max(150, Math.min(lanyard ? lanyard.clientWidth * 0.48 : 220, 230));
        }
        layout.cy = layout.cardY;
        host.style.setProperty('--fx-x', layout.cx + 'px');
        host.style.setProperty('--fx-y', layout.cardY + 'px');
        gl.uniform2f(U.uRes, W, H);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uPoint, W < 700 ? 2.0 : 2.6);
    }

    /* ---------------- Input ---------------- */
    var pointer = { x: -9999, y: -9999, on: 0, tx: 0, ty: 0 };   // tx/ty: -1..1 tilt targets
    var tilt = { x: 0, y: 0 };
    var mouseOn = 0;
    var ready = false;

    function setPointer(clientX, clientY) {
        var hr = hero.getBoundingClientRect();
        pointer.x = clientX - hr.left;
        pointer.y = clientY - hr.top;
        pointer.on = (pointer.y >= 0 && pointer.y <= hr.height) ? 1 : 0;
        pointer.tx = Math.max(-1, Math.min(1, (clientX / window.innerWidth) * 2 - 1));
        pointer.ty = Math.max(-1, Math.min(1, (clientY / window.innerHeight) * 2 - 1));
        kick();
    }
    window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        setPointer(e.clientX, e.clientY);
    }, { passive: true });
    doc.addEventListener('pointerleave', function () { pointer.on = 0; kick(); });
    hero.addEventListener('touchstart', function (e) {
        var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });
    hero.addEventListener('touchmove', function (e) {
        var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY);
    }, { passive: true });
    hero.addEventListener('touchend', function () { pointer.on = 0; kick(); }, { passive: true });

    // Phone tilt (Android fires this without a permission prompt).
    window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
        pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
        kick();
    }, { passive: true });

    /* ---------------- Render ---------------- */
    var start = performance.now();
    var clock = 0;
    var intro = 0;
    var scrollP = 0;
    var spin = 0;
    var running = false;
    var visible = true;
    var rafId = null;
    var last = 0;
    var frameGap = lowEnd ? 1000 / 32 : 0;

    function mat3RotXY(ax, ay, az) {
        var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
        // R = Rz * Rx * Ry  (column-major for WebGL)
        var m00 = cz * cy - sz * sx * sy, m01 = -sz * cx, m02 = cz * sy + sz * sx * cy;
        var m10 = sz * cy + cz * sx * sy, m11 = cz * cx, m12 = sz * sy - cz * sx * cy;
        var m20 = -cx * sy, m21 = sx, m22 = cx * cy;
        return new Float32Array([m00, m10, m20, m01, m11, m21, m02, m12, m22]);
    }
    var ringTilt = mat3RotXY(1.22, 0, -0.95);

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

    function render(introEase) {
        // Scroll progress through the hero.
        var hr = hero.getBoundingClientRect();
        var vh = window.innerHeight || 800;

        var cx = layout.cx, cy = layout.cy, r = layout.r, focus = 1;
        if (layout.stacked) {
            // 0 at the top of the page, 1 once the card is centred on screen.
            var travel = smooth((-hr.top) / Math.max(1, layout.cardY - vh * 0.5));
            cx = lerp(layout.peekX, layout.cx, travel);
            cy = lerp(layout.peekY, layout.cardY, travel);
            r = lerp(layout.peekR, layout.r, travel);
            focus = lerp(0.7, 1, travel);
            scrollP = smooth((-hr.top - (layout.cardY - vh * 0.5)) / (vh * 0.9)) * 0.9;
        } else {
            scrollP = smooth((-hr.top) / Math.max(1, hr.height * 0.95)) * 0.9;
        }

        gl.uniform1f(U.uTime, clock);
        gl.uniform1f(U.uIntro, introEase == null ? intro : introEase);
        gl.uniform1f(U.uScroll, scrollP);
        gl.uniform1f(U.uFocus, focus);
        gl.uniform2f(U.uCenter, cx, cy);
        gl.uniform1f(U.uRadius, r);
        gl.uniform2f(U.uMouse, pointer.x, pointer.y);
        gl.uniform1f(U.uMouseOn, mouseOn);
        gl.uniformMatrix3fv(U.uRot, false, mat3RotXY(0.32 + tilt.y * 0.35, spin + tilt.x * 0.6, -0.12));
        gl.uniformMatrix3fv(U.uRingTilt, false, ringTilt);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, total);
    }

    function frame(now) {
        rafId = null;
        if (!running) return;
        if (frameGap && now - last < frameGap) { rafId = requestAnimationFrame(frame); return; }
        var dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        clock += dt;
        intro = Math.min(1, intro + dt / 1.8);
        var ease = 1 - Math.pow(1 - intro, 3);
        spin += dt * (0.09 + scrollP * 0.5);
        tilt.x += (pointer.tx - tilt.x) * Math.min(1, dt * 2.5);
        tilt.y += (pointer.ty - tilt.y) * Math.min(1, dt * 2.5);
        mouseOn += (pointer.on - mouseOn) * Math.min(1, dt * 5);
        render(ease);
        rafId = requestAnimationFrame(frame);
    }

    function play() {
        if (running || reducedMotion() || veryLowEnd) return;
        running = true;
        last = 0;
        rafId = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }
    function kick() {
        if (!ready || running || !visible || doc.hidden || reducedMotion() || veryLowEnd) return;
        play();
    }
    function sync() {
        if (visible && !doc.hidden && !reducedMotion() && !veryLowEnd) play();
        else stop();
    }

    function staticFrame() {
        // Reduced motion / very low-end: one finished frame, no animation.
        intro = 1; clock = 4.2; spin = 0.6; mouseOn = 0;
        render();
    }

    function init() {
        host.appendChild(canvas);
        ready = true;
        measure();
        applyTheme();
        if (reducedMotion() || veryLowEnd) {
            staticFrame();
        } else {
            play();
        }
        requestAnimationFrame(function () { host.classList.add('is-live'); });

        new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

        var resizeTimer = null;
        function onResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () { measure(); render(); }, 120);
        }
        if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
        else window.addEventListener('resize', onResize);

        window.addEventListener('scroll', function () {
            if (!running && visible) render(); // keep the static frame in sync
        }, { passive: true });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                sync();
            }, { threshold: 0 }).observe(hero);
        }
        doc.addEventListener('visibilitychange', sync);
        if (reduceQuery && reduceQuery.addEventListener) {
            reduceQuery.addEventListener('change', function () {
                if (reducedMotion()) { stop(); staticFrame(); } else { sync(); }
            });
        }
        canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); host.classList.add('is-static'); });
    }

    // Start once the page has settled so the hero text and card paint first.
    function whenIdle(fn) {
        if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1200 });
        else setTimeout(fn, 300);
    }
    if (doc.readyState === 'complete') whenIdle(init);
    else window.addEventListener('load', function () { whenIdle(init); });
})();
