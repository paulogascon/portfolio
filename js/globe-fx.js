/* ==========================================================================
   Globe FX: one particle system that tells the page's story.
   Raw WebGL 1, no library. A single fixed canvas sits behind the whole page
   and every particle morphs between three shapes as you scroll:

     hero      → a noise-morphed globe with an orbit ring, behind the ID card
     services  → a flowing wave surface
     work      → a rippling dot grid
     ...and back again further down, ending as a globe behind Contact.

   It reacts to the cursor (tilt + magnetic push), touch, phone tilt (Android)
   and scroll.

   Performance rules (target: a steady 60fps):
   - Starts after the page is idle, fades in, never blocks first paint:
     the WebGL context, shaders (compiled off-thread where the browser
     supports it) and particle geometry are all set up after load.
   - No allocations per frame; layout is cached and re-read only on resize.
   - Adaptive quality: if frames run slow, it lowers the pixel density first,
     then caps to 30fps, so scrolling stays smooth on budget Android phones.
   - Paused while the tab is hidden or a case-study dialog is open.
   - prefers-reduced-motion and very low-end phones: a still globe in the
     hero only (redrawn on scroll, never animated).
   - Data Saver or no WebGL: skipped, the CSS glow in the hero stays.
   ========================================================================== */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;
    var hero = doc.getElementById('top');
    var heroHost = doc.getElementById('heroFx');
    var lanyard = doc.getElementById('lanyardWrapper');
    if (!hero || !heroHost) return;

    var conn = navigator.connection || {};
    if (conn.saveData) { heroHost.classList.add('is-static'); return; }

    var cores = navigator.hardwareConcurrency || 8;
    var memory = navigator.deviceMemory || 8;
    var veryLowEnd = cores <= 2 || memory <= 2;
    var lowEnd = veryLowEnd || cores <= 4 || memory <= 3;
    var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function stillMode() { return veryLowEnd || !!(reduceQuery && reduceQuery.matches); }

    var canvas = doc.createElement('canvas');
    canvas.className = 'site-fx';
    canvas.setAttribute('aria-hidden', 'true');

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
        'attribute vec3 aSphere;',   // sphere: unit vector; ring: (angle, radius, height)
        'attribute vec4 aFlat;',     // xy: wave lattice -1..1, zw: grid lattice -1..1
        'attribute vec2 aRnd;',      // x: seed 0..1, y: kind (0 sphere, 1 ring)
        'uniform float uTime, uIntro, uPoint, uDpr, uFocus, uBurst;',
        'uniform vec3 uW;',          // shape weights: globe, wave, grid
        'uniform vec2 uRes, uCenter, uMouse;',
        'uniform float uRadius, uMouseOn, uAspect;',
        'uniform mat3 uRot, uRingTilt;',
        'uniform vec2 uTilt;',
        'varying float vAlpha, vHeat, vInk;',
        NOISE,
        'const float CAM=3.4;',
        'void main(){',
        '  float seed=aRnd.x; float ring=aRnd.y; float t=uTime;',
        '  vec2 sp=vec2(0.0); float size=0.0; float alpha=0.0; float heat=0.0;',
        // ---- globe ----
        '  if(uW.x>0.002){',
        '    vec3 p; float glow;',
        '    if(ring<0.5){',
        '      float n1=snoise(aSphere*1.35+vec3(0.0,t*0.22,t*0.12));',
        '      float r=1.0+0.13*n1+0.03*sin(dot(aSphere,vec3(5.0,3.0,4.0))+t*1.3);',
        '      glow=smoothstep(0.15,0.75,n1);',
        '      p=aSphere*r;',
        '    } else {',
        '      float a=aSphere.x+t*(0.10+0.05*seed);',
        '      p=uRingTilt*vec3(cos(a)*aSphere.y, aSphere.z, sin(a)*aSphere.y);',
        '      glow=0.35+0.5*step(0.93,seed);',
        '    }',
        '    p*=1.0+(1.0-uIntro)*(1.6+2.4*seed);',
        '    p*=uBurst*(1.0+(1.0-min(uBurst,1.0))*0.9*seed);',
        '    p=uRot*p;',
        '    float persp=CAM/(CAM-p.z); float front=clamp(p.z*0.5+0.5,0.0,1.0);',
        '    sp+=uW.x*(uCenter+vec2(p.x,-p.y)*persp*uRadius);',
        '    size+=uW.x*persp*(0.55+0.75*front);',
        '    alpha+=uW.x*(0.18+0.82*front);',
        '    heat+=uW.x*glow*0.55;',
        '  }',
        // ---- wave: a surface receding into the screen ----
        '  if(uW.y>0.002){',
        '    vec2 q=aFlat.xy;',
        '    float y=0.2*sin(q.x*2.6+t*0.9)+0.11*sin(q.y*4.0-t*0.7+q.x*1.5)+0.04*sin((q.x+q.y)*7.0+t*1.4);',
        '    vec3 p=vec3(q.x*1.75, y, q.y*0.95);',
        '    float cx=cos(1.08+uTilt.y*0.12), sx=sin(1.08+uTilt.y*0.12);',
        '    p=vec3(p.x, p.y*cx-p.z*sx, p.y*sx+p.z*cx);',
        '    float cy=cos(uTilt.x*0.25), sy=sin(uTilt.x*0.25);',
        '    p=vec3(p.x*cy+p.z*sy, p.y, -p.x*sy+p.z*cy);',
        '    float persp=2.6/(2.6-p.z*0.9);',
        '    vec2 s=vec2(uRes.x*0.5, uRes.y*0.72)+vec2(p.x,-p.y)*persp*max(uRes.x*0.34, uRes.y*0.42);',
        '    sp+=uW.y*s;',
        '    float crest=smoothstep(0.0,0.3,y);',
        '    size+=uW.y*persp*1.05;',
        '    alpha+=uW.y*(0.3+0.7*clamp(persp-0.7,0.0,1.0));',
        '    heat+=uW.y*crest*0.6;',
        '  }',
        // ---- grid: a flat dot lattice that ripples ----
        '  if(uW.z>0.002){',
        '    vec2 g=aFlat.zw;',
        '    vec2 gp=vec2(g.x*uAspect, g.y);',
        '    float d=length(gp-vec2(uTilt.x*uAspect*0.6, -uTilt.y*0.6));',
        '    float z=0.05*sin(d*9.0-t*2.2)*exp(-d*0.9)+0.03*sin(g.x*6.0+t)*sin(g.y*5.0-t*0.8);',
        '    float persp=3.0/(3.0-z*4.0);',
        '    vec2 s=uRes*0.5+vec2(gp.x,-gp.y)*persp*uRes.y*0.5*1.04;',
        '    sp+=uW.z*s;',
        '    size+=uW.z*(0.85+z*6.0);',
        '    alpha+=uW.z*(0.5+z*6.0);',
        '    heat+=uW.z*smoothstep(0.0,0.06,z);',
        '  }',
        // magnetic push away from the pointer (screen space, CSS px)
        '  vec2 d=sp-uMouse; float dl=length(d);',
        '  float reach=max(uRadius*0.55,110.0);',
        '  float push=uMouseOn*smoothstep(reach,0.0,dl);',
        '  sp+=normalize(d+vec2(0.0001))*push*reach*0.32*(0.6+0.8*seed);',
        '  vHeat=clamp(heat+push*1.1,0.0,1.0);',
        '  vInk=step(0.86,seed)*(1.0-ring);',
        '  vAlpha=alpha*uIntro*uFocus;',
        '  gl_PointSize=uPoint*uDpr*size*(1.0+push*0.9)*(0.75+0.5*seed);',
        '  gl_Position=vec4(sp.x/uRes.x*2.0-1.0, 1.0-sp.y/uRes.y*2.0, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG = [
        'precision mediump float;',
        'uniform vec3 uColA, uColB, uColInk;',
        'uniform float uGain, uInkMix;',
        'varying float vAlpha, vHeat, vInk;',
        'void main(){',
        '  vec2 c=gl_PointCoord-0.5; float d=dot(c,c);',
        '  float disc=smoothstep(0.25,0.015,d);',
        '  vec3 col=mix(mix(uColA,uColB,vHeat),uColInk,vInk*uInkMix);',
        '  float a=disc*vAlpha*uGain*(0.75+0.5*vHeat);',
        '  gl_FragColor=vec4(col*a,a);',
        '}'
    ].join('\n');

    function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }

    /* ---------------- Setup (after first paint, off the critical path) ----------------
       Creating the WebGL context and compiling shaders is the heaviest part of
       this file, so none of it runs while the page is loading. With
       KHR_parallel_shader_compile the driver compiles on another thread and we
       only check the result once it's done, so the main thread never stalls. */
    var gl = null, prog = null, U = {}, total = 0;

    function setup() {
        try {
            gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power', desynchronized: true }) ||
                 canvas.getContext('experimental-webgl');
        } catch (e) { gl = null; }
        if (!gl) { heroHost.classList.add('is-static'); return; }

        var vs = compile(gl.VERTEX_SHADER, VERT);
        var fs = compile(gl.FRAGMENT_SHADER, FRAG);
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);

        var parallel = gl.getExtension('KHR_parallel_shader_compile');
        (function waitForLink() {
            if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
                setTimeout(waitForLink, 16);
                return;
            }
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                if (window.console) console.warn('[globe-fx]', gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
                heroHost.classList.add('is-static');
                return;
            }
            gl.useProgram(prog);
            // Geometry in its own task, so no single task holds the main thread long.
            setTimeout(function () { buildScene(); init(); }, 0);
        })();
    }

    function buildScene() {
        /* ---------------- Geometry ---------------- */
        var small = window.innerWidth < 700;
        var SPHERE = lowEnd ? 2600 : (small ? 4000 : 7000);
        var RING = lowEnd ? 600 : (small ? 900 : 1500);
        total = SPHERE + RING;
        var sphere = new Float32Array(total * 3);
        var flat = new Float32Array(total * 4);
        var rnd = new Float32Array(total * 2);
        var golden = Math.PI * (3 - Math.sqrt(5));
        var i;
        for (i = 0; i < SPHERE; i++) {
            var y = 1 - (i / (SPHERE - 1)) * 2;
            var rad = Math.sqrt(1 - y * y);
            var th = golden * i;
            sphere[i * 3] = Math.cos(th) * rad;
            sphere[i * 3 + 1] = y;
            sphere[i * 3 + 2] = Math.sin(th) * rad;
            rnd[i * 2] = Math.random();
            rnd[i * 2 + 1] = 0;
        }
        for (i = SPHERE; i < total; i++) {
            var band = Math.random();
            sphere[i * 3] = Math.random() * Math.PI * 2;
            sphere[i * 3 + 1] = 1.3 + band * band * 0.26 + (Math.random() - 0.5) * 0.04;
            sphere[i * 3 + 2] = (Math.random() - 0.5) * 0.035;
            rnd[i * 2] = Math.random();
            rnd[i * 2 + 1] = 1;
        }
        // Wave and grid lattices. Particles are dealt out in a shuffled order so the
        // morph looks like a swarm re-forming, not a sheet sliding.
        var order = new Uint32Array(total);
        for (i = 0; i < total; i++) order[i] = i;
        for (i = total - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
        var aspect = Math.max(0.45, Math.min(2.4, window.innerWidth / Math.max(1, window.innerHeight)));
        var waveCols = Math.ceil(Math.sqrt(total * 1.6)), waveRows = Math.ceil(total / waveCols);
        var gridRows = Math.max(8, Math.round(Math.sqrt(total / aspect))), gridCols = Math.ceil(total / gridRows);
        for (i = 0; i < total; i++) {
            var k = order[i];
            var wc = k % waveCols, wr = Math.floor(k / waveCols);
            flat[i * 4] = (wc / (waveCols - 1)) * 2 - 1 + (Math.random() - 0.5) * 0.01;
            flat[i * 4 + 1] = (wr / (waveRows - 1)) * 2 - 1;
            var gc = k % gridCols, gr = Math.floor(k / gridCols);
            flat[i * 4 + 2] = (gc / (gridCols - 1)) * 2 - 1;
            flat[i * 4 + 3] = (gr / Math.max(1, gridRows - 1)) * 2 - 1;
        }
        function attrib(name, data, size) {
            var loc = gl.getAttribLocation(prog, name);
            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        }
        attrib('aSphere', sphere, 3);
        attrib('aFlat', flat, 4);
        attrib('aRnd', rnd, 2);
        sphere = flat = rnd = order = null;

        ['uTime', 'uIntro', 'uPoint', 'uDpr', 'uFocus', 'uBurst', 'uW', 'uRes', 'uCenter', 'uMouse', 'uRadius', 'uMouseOn', 'uAspect',
         'uRot', 'uRingTilt', 'uTilt', 'uColA', 'uColB', 'uColInk', 'uGain', 'uInkMix'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
    }


    /* ---------------- Theme ---------------- */
    function hex(h) {
        var v = parseInt(h.replace('#', ''), 16);
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    }
    function applyTheme() {
        var dark = root.getAttribute('data-theme') !== 'light';
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
        requestDraw();
    }

    /* ---------------- Story: which shape each section asks for ---------------- */
    // weights: [globe, wave, grid], focus: overall strength behind that section
    var STORY = {
        top:      { w: [1, 0, 0], focus: 1 },
        services: { w: [0, 1, 0], focus: 0.8 },
        work:     { w: [0, 0, 1], focus: 0.75 },
        videos:   { w: [0, 1, 0], focus: 0.4 },
        proof:    { w: [0, 0, 1], focus: 0.65 },
        about:    { w: [0, 1, 0], focus: 0.6 },
        contact:  { w: [1, 0, 0], focus: 0.7 }
    };
    var chapters = [];   // { id, top, bottom } in document coordinates

    /* ---------------- Layout (cached; re-read only on resize) ---------------- */
    // Real sizes from the start: a pointer event before the first measure() must
    // never divide by zero (a NaN tilt would blank the globe for good).
    var W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight), dpr = 1, dprCap = 1.75;
    var layout = { cardX: 0, cardY: 0, r: 200, stacked: false, peekX: 0, peekY: 0, peekR: 0 };

    function docTop(el) { var r = el.getBoundingClientRect(); return r.top + window.scrollY; }

    function measure() {
        W = Math.max(1, window.innerWidth);
        H = Math.max(1, window.innerHeight);
        var cap = lowEnd ? 1 : (W < 700 ? Math.min(1.5, dprCap) : dprCap);
        dpr = Math.min(window.devicePixelRatio || 1, cap);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);

        layout.stacked = window.matchMedia('(max-width: 960px)').matches;
        if (lanyard) {
            var lr = lanyard.getBoundingClientRect();
            layout.cardX = lr.left + lr.width / 2;
            layout.cardY = lr.top + window.scrollY + Math.min(lr.height * 0.58, 340);
            layout.r = layout.stacked ? Math.min(W * 0.36, 210) : Math.max(150, Math.min(lanyard.clientWidth * 0.48, 230));
        } else {
            layout.cardX = W * 0.75; layout.cardY = H * 0.5; layout.r = 200;
        }
        // On phones the card sits below the fold, so the globe first peeks in
        // from the top-right corner and glides down behind the card on scroll.
        layout.peekX = W - Math.min(W * 0.04, 24);
        layout.peekY = 70 + docTop(hero);
        layout.peekR = Math.min(W * 0.36, 210);

        chapters = [];
        Object.keys(STORY).forEach(function (id) {
            var el = doc.getElementById(id);
            if (!el) return;
            var top = docTop(el);
            chapters.push({ id: id, top: top, bottom: top + el.offsetHeight });
        });

        var a = W / H;
        gl.uniform1f(U.uAspect, a);
        gl.uniform2f(U.uRes, W, H);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uPoint, W < 700 ? 2.0 : 2.6);
        requestDraw();
    }

    /* ---------------- Input ---------------- */
    var pointer = { x: -9999, y: -9999, on: 0, tx: 0, ty: 0 };
    function setPointer(x, y) {
        pointer.x = x; pointer.y = y; pointer.on = 1;
        pointer.tx = Math.max(-1, Math.min(1, (x / W) * 2 - 1));
        pointer.ty = Math.max(-1, Math.min(1, (y / H) * 2 - 1));
        wake();
    }
    window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        setPointer(e.clientX, e.clientY);
    }, { passive: true });
    doc.documentElement.addEventListener('pointerleave', function () { pointer.on = 0; });
    window.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchend', function () { pointer.on = 0; }, { passive: true });
    window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        pointer.tx = Math.max(-1, Math.min(1, e.gamma / 30));
        pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
    }, { passive: true });

    /* ---------------- State ---------------- */
    var clock = 0, intro = 0, spin = 0, mouseOn = 0;
    var tilt = { x: 0, y: 0 };
    var weights = [1, 0, 0], focus = 1;
    var running = false, rafId = 0, last = 0, ready = false, paused = false;
    var frameGap = 0;               // 0 = every vsync (60fps); 1000/32 when capped
    var quality = lowEnd ? 1 : 0;   // 0: full, 1: DPR 1 (low-end starts here), 2: 30fps cap
    var slowFrames = 0, ema = 16.7;

    // Preallocated matrices: no garbage per frame.
    var rot = new Float32Array(9);
    var ringTilt = new Float32Array(9);
    function setRot(m, ax, ay, az) {
        var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
        m[0] = cz * cy - sz * sx * sy; m[3] = -sz * cx; m[6] = cz * sy + sz * sx * cy;
        m[1] = sz * cy + cz * sx * sy; m[4] = cz * cx; m[7] = sz * sy - cz * sx * cy;
        m[2] = -cx * sy;               m[5] = sx;      m[8] = cx * cy;
        return m;
    }
    setRot(ringTilt, 1.22, 0, -0.95);

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smooth(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

    // Which chapter owns the middle of the screen right now?
    function storyTarget(scrollY) {
        var mid = scrollY + H * 0.5;
        var pick = STORY.top;
        for (var c = 0; c < chapters.length; c++) {
            if (mid >= chapters[c].top) pick = STORY[chapters[c].id];
        }
        return pick;
    }

    function globeAnchor(scrollY, out) {
        if (storyTarget(scrollY) === STORY.contact) {
            out.x = layout.stacked ? W * 0.82 : W * 0.86;
            out.y = H * (layout.stacked ? 0.22 : 0.42);
            out.r = Math.min(W, H) * (layout.stacked ? 0.26 : 0.24);
            out.f = 1;
            return out;
        }
        if (layout.stacked) {
            var travel = smooth(scrollY / Math.max(1, layout.cardY - H * 0.5));
            out.x = lerp(layout.peekX, layout.cardX, travel);
            out.y = lerp(layout.peekY, layout.cardY, travel) - scrollY;
            out.r = lerp(layout.peekR, layout.r, travel);
            out.f = lerp(0.7, 1, travel);
        } else {
            out.x = layout.cardX;
            out.y = layout.cardY - scrollY;
            out.r = layout.r;
            out.f = 1;
        }
        return out;
    }
    var anchor = { x: 0, y: 0, r: 200, f: 1 };
    var anchorS = { x: 0, y: 0, r: 200 };   // smoothed, so hand-offs never jump

    function draw(introEase) {
        var sy = window.scrollY;
        globeAnchor(sy, anchor);
        gl.uniform1f(U.uTime, clock);
        gl.uniform1f(U.uIntro, introEase);
        gl.uniform1f(U.uBurst, burst);
        gl.uniform3f(U.uW, weights[0], weights[1], weights[2]);
        gl.uniform1f(U.uFocus, focus * (anchor.f || 1));
        gl.uniform2f(U.uCenter, anchorS.x, anchorS.y);
        gl.uniform1f(U.uRadius, anchorS.r);
        gl.uniform2f(U.uMouse, pointer.x, pointer.y);
        gl.uniform1f(U.uMouseOn, mouseOn);
        gl.uniform2f(U.uTilt, tilt.x, tilt.y);
        gl.uniformMatrix3fv(U.uRot, false, setRot(rot, 0.32 + tilt.y * 0.35, spin + tilt.x * 0.6, -0.12));
        gl.uniformMatrix3fv(U.uRingTilt, false, ringTilt);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, total);
    }

    function step(dt) {
        var sy = window.scrollY;
        var target = storyTarget(sy);
        var k = Math.min(1, dt * 2.4);
        weights[0] = lerp(weights[0], target.w[0], k);
        weights[1] = lerp(weights[1], target.w[1], k);
        weights[2] = lerp(weights[2], target.w[2], k);
        var gap = Math.abs(target.w[0] - weights[0]) + Math.abs(target.w[1] - weights[1]) + Math.abs(target.w[2] - weights[2]);
        focus = lerp(focus, Math.min(1, target.focus + gap * 0.6), k);
        globeAnchor(sy, anchor);
        // Follow the card exactly while it scrolls, but ease into a new spot.
        var follow = target === STORY.top ? 1 : Math.min(1, dt * 3);
        anchorS.x = lerp(anchorS.x, anchor.x, follow);
        anchorS.y = lerp(anchorS.y, anchor.y, follow);
        anchorS.r = lerp(anchorS.r, anchor.r, follow);

        clock += dt;
        intro = Math.min(1, intro + dt / 1.8);
        if (burstT >= 0) {
            // Boot burst: out from the core, overshoot, settle (easeOutBack)
            burstT += dt;
            var bx = Math.min(1, burstT / 1.15), c1 = 1.9;
            burst = Math.max(0.02, 1 + (c1 + 1) * Math.pow(bx - 1, 3) + c1 * Math.pow(bx - 1, 2));
            if (bx >= 1) { burst = 1; burstT = -1; }
        }
        spin += dt * 0.09;
        var tk = Math.min(1, dt * 2.5);
        tilt.x += (pointer.tx - tilt.x) * tk;
        tilt.y += (pointer.ty - tilt.y) * tk;
        mouseOn += (pointer.on - mouseOn) * Math.min(1, dt * 5);
    }

    // Adaptive quality: watch the real frame time and step down if needed.
    function adapt(delta) {
        ema = ema * 0.9 + delta * 0.1;
        if (quality >= 2) return;
        if (ema > 21) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
        if (slowFrames > 90) {
            quality++;
            slowFrames = 0;
            if (quality === 1) { dprCap = 1; measure(); }
            if (quality === 2) frameGap = 1000 / 32;
        }
    }

    function frame(now) {
        rafId = 0;
        if (!running) return;
        rafId = requestAnimationFrame(frame);
        if (frameGap && last && now - last < frameGap - 1) return;
        var delta = last ? now - last : 16.7;
        last = now;
        if (delta < 100) adapt(delta);
        step(Math.min(0.05, delta / 1000));
        draw(1 - Math.pow(1 - intro, 3));
    }

    function play() {
        if (running || !ready || paused || doc.hidden || stillMode()) return;
        running = true;
        last = 0;
        rafId = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
    }
    function wake() { if (!running) play(); }

    // Still mode: a finished globe in the hero only, redrawn on scroll.
    var drawQueued = false;
    function requestDraw() {
        if (!ready || running || drawQueued || waitBoot) return;
        drawQueued = true;
        requestAnimationFrame(function () {
            drawQueued = false;
            if (running) return;
            var past = window.scrollY > (layout.cardY + H * 0.2);
            canvas.classList.toggle('is-hidden', stillMode() && past);
            weights[0] = 1; weights[1] = 0; weights[2] = 0; focus = 1;
            clock = 4.2; spin = 0.6; mouseOn = 0; tilt.x = 0; tilt.y = 0; burst = 1;
            globeAnchor(window.scrollY, anchor);
            anchorS.x = anchor.x; anchorS.y = anchor.y; anchorS.r = anchor.r;
            draw(1);
        });
    }

    function sync() {
        if (waitBoot) return;
        if (!doc.hidden && !paused && !stillMode()) { canvas.classList.remove('is-hidden'); play(); }
        else { stop(); requestDraw(); }
    }

    function init() {
        doc.body.insertBefore(canvas, doc.body.firstChild);
        ready = true;
        measure();
        globeAnchor(window.scrollY, anchor);
        anchorS.x = anchor.x; anchorS.y = anchor.y; anchorS.r = anchor.r;
        var t0 = storyTarget(window.scrollY);
        weights = t0.w.slice(); focus = t0.focus;
        applyTheme();
        root.classList.add('fx-on');
        if (waitBoot) {
            // Hold the globe until the boot intro lifts, then burst it open.
            var go = function () {
                if (!waitBoot) return;
                waitBoot = false;
                intro = 1; burst = 0.02; burstT = 0;
                canvas.classList.add('is-burst');
                sync();
                requestAnimationFrame(function () { canvas.classList.add('is-live'); });
            };
            if (window.__jpBootDone) go();
            else window.addEventListener('jp:boot-done', go, { once: true });
        } else {
            sync();
            requestAnimationFrame(function () { canvas.classList.add('is-live'); });
        }

        new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

        var resizeTimer = 0;
        function onResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(measure, 150);
        }
        window.addEventListener('resize', onResize);
        // Section heights change as fonts, images and reels settle.
        if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(doc.body);

        window.addEventListener('scroll', function () { if (!running) requestDraw(); }, { passive: true });
        doc.addEventListener('visibilitychange', sync);
        if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener('change', sync);

        // Pause behind open case-study dialogs.
        Array.prototype.forEach.call(doc.querySelectorAll('dialog'), function (dlg) {
            new MutationObserver(function () { paused = dlg.hasAttribute('open'); sync(); })
                .observe(dlg, { attributes: true, attributeFilter: ['open'] });
        });

        canvas.addEventListener('webglcontextlost', function (e) {
            e.preventDefault(); stop(); ready = false;
            canvas.classList.add('is-hidden'); heroHost.classList.add('is-static');
        });
    }

    // The boot intro holds the globe back and bursts it open when it lifts.
    var waitBoot = root.classList.contains('is-booting') && !window.__jpBootDone;
    var burst = 1, burstT = -1;

    function whenIdle(fn, wait) {
        if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: wait });
        else setTimeout(fn, Math.min(300, wait));
    }
    // During the boot intro, start soon (the intro covers the page and the
    // globe has to be ready for its burst). Otherwise wait until the page has
    // loaded and the browser is idle.
    if (waitBoot) whenIdle(setup, 250);
    else if (doc.readyState === 'complete') whenIdle(setup, 1200);
    else window.addEventListener('load', function () { whenIdle(setup, 1200); });
})();
