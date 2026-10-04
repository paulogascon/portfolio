/**
 * Portfolio Website Project - JP
 * Interactive Scripts, Hover-to-Play Video Engine & 3D Physics Lanyard Engine
 * Author: Jhon Paulo V. Gascon (JP)
 */

// -----------------------------------------------------------------------------
// Global Scroll Guard: Force page to always start at top (0, 0)
// Prevents mobile browsers/WebViews from restoring old scroll positions below the ID
// -----------------------------------------------------------------------------
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.scrollTo(0, 0);

window.addEventListener('pageshow', () => {
    window.scrollTo(0, 0);
});

// Clear anchor hash on initial load if user opened a shared link containing #about etc.
if (window.location.hash) {
    history.replaceState(null, null, window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    // -------------------------------------------------------------------------
    // 1. Theme Toggle Engine (Navbar + Floating Switch)
    // -------------------------------------------------------------------------
    const themeToggleBtn = document.getElementById('themeToggle');
    const floatingThemeToggle = document.getElementById('floatingThemeToggle');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('jp-portfolio-theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);

    function switchTheme() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('jp-portfolio-theme', newTheme);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', switchTheme);
    }

    if (floatingThemeToggle) {
        floatingThemeToggle.addEventListener('click', switchTheme);
    }

    // -------------------------------------------------------------------------
    // 2. Mobile Navigation Hamburger Menu
    // -------------------------------------------------------------------------
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // -------------------------------------------------------------------------
    // 3. Navbar Scroll Elevation & Active Link Highlighting
    // -------------------------------------------------------------------------
    const navbar = document.getElementById('navbar');
    const backToTopBtn = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section[id]');

    function updateScrollUI() {
        const scrollY = window.pageYOffset;

        if (navbar) {
            if (scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        if (backToTopBtn) {
            if (scrollY > 500) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 130;
            const sectionId = section.getAttribute('id');
            const correspondingNavLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (correspondingNavLink) {
                if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                    navLinks.forEach(link => link.classList.remove('active'));
                    correspondingNavLink.classList.add('active');
                }
            }
        });
    }

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // -------------------------------------------------------------------------
    // 4. Hero Section Typing Effect (Classic Intro)
    // -------------------------------------------------------------------------
    const typingTextElement = document.getElementById('typingText');
    const roles = [
        'BSIT 2nd Year Student at STI WNU',
        'UI/UX Designer in Figma',
        'Motion Graphics & Video Editor',
        'Frontend Web Developer',
        'Java & Algorithm Programmer'
    ];
    
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingSpeed = 90;
    const deletingSpeed = 40;
    const pauseDuration = 1900;

    function typeEffect() {
        if (!typingTextElement) return;

        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            typingTextElement.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typingTextElement.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
        }

        let currentSpeed = isDeleting ? deletingSpeed : typingSpeed;

        if (!isDeleting && charIndex === currentRole.length) {
            currentSpeed = pauseDuration;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            currentSpeed = 350;
        }

        setTimeout(typeEffect, currentSpeed);
    }

    typeEffect();

    // -------------------------------------------------------------------------
    // 5. Interactive 3D Physics STI Lanyard ID Badge Engine
    // -------------------------------------------------------------------------
    const lanyardWrapper = document.getElementById('lanyardWrapper');
    const lanyardCanvas = document.getElementById('lanyardCanvas');
    const hangingBadge = document.getElementById('hangingBadge');
    const dragHint = document.getElementById('dragHint');

    if (lanyardWrapper && lanyardCanvas && hangingBadge) {
        const ctx = lanyardCanvas.getContext('2d');
        let width = lanyardWrapper.clientWidth || 400;
        let height = lanyardWrapper.clientHeight || 600;

        // Preload authentic STI West Negros University ribbon strap image
        const strapImg = new Image();
        strapImg.src = 'assets/images/lanyard-strap-final.png';
        let strapImgLoaded = false;
        strapImg.onload = () => {
            strapImgLoaded = true;
        };

        function resizeCanvas() {
            width = lanyardWrapper.clientWidth || 400;
            height = lanyardWrapper.clientHeight || 600;
            const dpr = window.devicePixelRatio || 1;
            lanyardCanvas.width = width * dpr;
            lanyardCanvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Performance: Track visibility to pause physics loop when offscreen
        let isLanyardVisible = true;
        let physicsAnimId = null;

        // Physics Ribbon Parameters
        const NUM_SEGMENTS = 10;
        const STRAP_LENGTH = 145;
        const SEG_LEN = STRAP_LENGTH / NUM_SEGMENTS;
        const GRAVITY = 0.44;
        const DAMPING = 0.965; // Soft velvety harmonic pendulum decay
        const ANCHOR_X = width / 2;
        const ANCHOR_Y = 10;

        const points = [];
        for (let i = 0; i <= NUM_SEGMENTS; i++) {
            const y = ANCHOR_Y + i * SEG_LEN;
            points.push({
                x: ANCHOR_X,
                y: y,
                oldX: ANCHOR_X,
                oldY: y,
                pinned: i === 0
            });
        }

        // -------------------------------------------------------------------------
        // Dynamic Pointer & Touch Interaction (Smooth weighted drag + non-blocking vertical scroll)
        // -------------------------------------------------------------------------
        let isDragging = false;
        let pointerDown = false;
        let intentDecided = false;
        let dragTargetX = ANCHOR_X;
        let dragTargetY = ANCHOR_Y + STRAP_LENGTH;
        let dragGrabOffsetX = 0;
        let dragGrabOffsetY = 0;
        let startClientX = 0;
        let startClientY = 0;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let dragVelX = 0;
        let dragVelY = 0;
        let badgeRotZ = 0;
        let badgeRotY = 0;
        let badgeRotX = 0;

        function getPointerPos(clientX, clientY) {
            const rect = lanyardWrapper.getBoundingClientRect();
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }

        function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return;
            
            pointerDown = true;
            intentDecided = false;
            isDragging = false;

            startClientX = e.clientX;
            startClientY = e.clientY;
            lastPointerX = e.clientX;
            lastPointerY = e.clientY;
            dragVelX = 0;
            dragVelY = 0;

            const badgeIndex = points.length - 1;
            const pos = getPointerPos(e.clientX, e.clientY);
            dragGrabOffsetX = points[badgeIndex].x - pos.x;
            dragGrabOffsetY = points[badgeIndex].y - pos.y;
            dragTargetX = points[badgeIndex].x;
            dragTargetY = points[badgeIndex].y;

            // On desktop mouse: immediately enable drag
            if (e.pointerType === 'mouse') {
                isDragging = true;
                intentDecided = true;
                hangingBadge.classList.add('is-dragging');
                if (dragHint) dragHint.style.opacity = '0';
            }
        }

        function onPointerMove(e) {
            if (!pointerDown) return;

            const deltaX = e.clientX - startClientX;
            const deltaY = e.clientY - startClientY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // On mobile touch: dynamically decide between vertical page scroll vs horizontal ID swing
            if (!intentDecided && e.pointerType !== 'mouse') {
                // If moving more vertically: user wants to scroll the page!
                if (absY > 7 && absY > absX) {
                    pointerDown = false;
                    isDragging = false;
                    intentDecided = true;
                    hangingBadge.classList.remove('is-dragging');
                    return; // Allow native smooth vertical scroll
                }
                // If moving horizontally: user wants to swing the ID badge!
                if (absX > 6) {
                    intentDecided = true;
                    isDragging = true;
                    hangingBadge.classList.add('is-dragging');
                    if (dragHint) dragHint.style.opacity = '0';
                }
            }

            if (!isDragging) return;

            // Prevent unwanted horizontal browser gestures during active swing
            if (e.cancelable) {
                e.preventDefault();
            }

            const vx = e.clientX - lastPointerX;
            const vy = e.clientY - lastPointerY;
            dragVelX = dragVelX * 0.6 + vx * 0.4;
            dragVelY = dragVelY * 0.6 + vy * 0.4;
            lastPointerX = e.clientX;
            lastPointerY = e.clientY;

            const pos = getPointerPos(e.clientX, e.clientY);
            
            // Gentle sensitivity tuning (0.75x on touch) so it feels weighted and never twitchy
            let rawTargetX = pos.x + dragGrabOffsetX;
            let rawTargetY = pos.y + dragGrabOffsetY;

            // Soft elastic reach from top ceiling anchor
            const anchorX = width / 2;
            const anchorY = ANCHOR_Y;
            const dist = Math.hypot(rawTargetX - anchorX, rawTargetY - anchorY);
            const maxReach = 280;

            if (dist > maxReach) {
                const angle = Math.atan2(rawTargetY - anchorY, rawTargetX - anchorX);
                const excess = dist - maxReach;
                const resisted = maxReach + Math.pow(excess, 0.65);
                rawTargetX = anchorX + Math.cos(angle) * resisted;
                rawTargetY = anchorY + Math.sin(angle) * resisted;
            }

            dragTargetX = Math.max(35, Math.min(width - 35, rawTargetX));
            dragTargetY = Math.max(30, Math.min(height - 180, rawTargetY));
        }

        function onPointerEnd() {
            if (isDragging) {
                const badgeIndex = points.length - 1;
                // Soft, realistic release momentum (smooth harmonic sway, never hyper-fast)
                const clampedVelX = Math.max(-5.5, Math.min(5.5, dragVelX * 0.35));
                const clampedVelY = Math.max(-4.0, Math.min(4.0, dragVelY * 0.35));
                points[badgeIndex].oldX = points[badgeIndex].x - clampedVelX;
                points[badgeIndex].oldY = points[badgeIndex].y - clampedVelY;
            }
            pointerDown = false;
            isDragging = false;
            intentDecided = false;
            hangingBadge.classList.remove('is-dragging');
        }

        // Pointer event listeners (unified, responsive & non-blocking)
        hangingBadge.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);

        // Physics Animation Loop
        let lastTime = performance.now();

        function updatePhysics() {
            const now = performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.033);
            lastTime = now;

            const badgeIndex = points.length - 1;
            const anchor = points[0];
            anchor.x = width / 2;
            anchor.y = ANCHOR_Y;

            // Smooth weighted interpolation towards drag position (gives physical acrylic weight!)
            if (isDragging) {
                points[badgeIndex].x += (dragTargetX - points[badgeIndex].x) * 0.44;
                points[badgeIndex].y += (dragTargetY - points[badgeIndex].y) * 0.44;
            }

            // Gentle organic idle breeze
            if (!isDragging) {
                const breeze = Math.sin(now * 0.0016) * 0.55;
                points[Math.floor(NUM_SEGMENTS / 2)].x += breeze * 0.08;
            }

            // Verlet integration
            for (let i = 1; i <= NUM_SEGMENTS; i++) {
                if (i === badgeIndex && isDragging) continue;

                const p = points[i];
                const vx = (p.x - p.oldX) * DAMPING;
                const vy = (p.y - p.oldY) * DAMPING;

                p.oldX = p.x;
                p.oldY = p.y;

                p.x += vx;
                p.y += vy + GRAVITY;
            }

            // Distance constraint relaxation
            for (let iter = 0; iter < 14; iter++) {
                for (let i = 0; i < NUM_SEGMENTS; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist === 0) continue;

                    const diff = (SEG_LEN - dist) / dist;
                    const offsetX = dx * diff * 0.5;
                    const offsetY = dy * diff * 0.5;

                    if (!p1.pinned) {
                        p1.x -= offsetX;
                        p1.y -= offsetY;
                    }
                    if (!(p2 === points[badgeIndex] && isDragging)) {
                        p2.x += offsetX;
                        p2.y += offsetY;
                    }
                }
            }

            // Calculate 3D rotations based on physics angle & delta
            const pPre = points[badgeIndex - 1];
            const pBadge = points[badgeIndex];
            const dx = pBadge.x - pPre.x;
            const dy = pBadge.y - pPre.y;
            const angleRad = Math.atan2(dx, dy);
            
            // Clean, natural tilt angle capped at +/- 20 degrees
            const targetRotZ = Math.max(-20, Math.min(20, -angleRad * (180 / Math.PI) * 0.48));
            
            // 3D Yaw & Pitch
            const lateralOffset = (pBadge.x - (width / 2)) / (width / 2);
            const targetRotY = Math.max(-12, Math.min(12, -lateralOffset * 10));
            const verticalDelta = (pBadge.y - (ANCHOR_Y + STRAP_LENGTH)) / 160;
            const targetRotX = Math.max(-8, Math.min(10, verticalDelta * 7));

            // Silky exponential smoothing
            badgeRotZ += (targetRotZ - badgeRotZ) * 0.14;
            badgeRotY += (targetRotY - badgeRotY) * 0.14;
            badgeRotX += (targetRotX - badgeRotX) * 0.14;

            // Position and rotate ID badge
            const badgeW = hangingBadge.offsetWidth || 220;
            hangingBadge.style.left = `${pBadge.x - badgeW / 2}px`;
            hangingBadge.style.top = `${pBadge.y}px`;
            hangingBadge.style.transform = `perspective(900px) rotateZ(${badgeRotZ.toFixed(2)}deg) rotateY(${badgeRotY.toFixed(2)}deg) rotateX(${badgeRotX.toFixed(2)}deg)`;

            // Render Authentic STI Lanyard Ribbon Strap
            renderRibbon();

            if (isLanyardVisible) {
                physicsAnimId = requestAnimationFrame(updatePhysics);
            } else {
                physicsAnimId = null;
            }
        }

        function renderRibbon() {
            ctx.clearRect(0, 0, width, height);

            if (points.length < 2) return;

            const badgeIndex = points.length - 1;
            const RIBBON_W = 28;

            // 1. Realistic soft ambient drop shadow behind the ribbon
            ctx.beginPath();
            ctx.moveTo(points[0].x + 4, points[0].y + 5);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x + 4, points[i].y + 5);
            }
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = RIBBON_W;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 2. Base dark carbon fabric ribbon backing
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = RIBBON_W;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 3. Fallback / Accent Gold Braided Outer Borders
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.strokeStyle = '#f5b800';
            ctx.lineWidth = RIBBON_W + 1;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Inner dark inset
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.strokeStyle = '#0e1422';
            ctx.lineWidth = RIBBON_W - 5;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 4. Map Authentic Embroidered STI West Negros University Texture Along Curve
            if (strapImgLoaded && strapImg.naturalWidth > 0) {
                const totalH = strapImg.naturalHeight;
                const sw = strapImg.naturalWidth;
                const segSrcH = totalH / NUM_SEGMENTS;

                for (let i = 0; i < NUM_SEGMENTS; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const segLen = Math.hypot(dx, dy);
                    const ang = Math.atan2(dy, dx);

                    const sy = i * segSrcH;

                    ctx.save();
                    ctx.translate(p1.x, p1.y);
                    ctx.rotate(ang - Math.PI / 2);
                    // Draw segment texture with tiny 1.5px overlap to eliminate joint seams
                    ctx.drawImage(strapImg, 0, sy, sw, segSrcH, -RIBBON_W / 2, 0, RIBBON_W, segLen + 1.5);
                    ctx.restore();
                }
            }

            // 5. Metallic Bracket Ring at Top Ceiling Mount
            const topP = points[0];
            ctx.fillStyle = '#64748b';
            ctx.fillRect(topP.x - 16, topP.y - 2, 32, 5);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(topP.x - 14, topP.y - 1, 28, 2);
        }

        // Start physics loop only when visible (pauses offscreen to save CPU & GPU)
        function startPhysicsLoop() {
            if (!physicsAnimId && isLanyardVisible) {
                physicsAnimId = requestAnimationFrame(updatePhysics);
            }
        }

        if ('IntersectionObserver' in window) {
            const lanyardObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    isLanyardVisible = entry.isIntersecting;
                    if (isLanyardVisible) {
                        startPhysicsLoop();
                    }
                });
            }, { threshold: 0.05 });
            lanyardObserver.observe(lanyardWrapper);
        }

        startPhysicsLoop();
    }

    // -------------------------------------------------------------------------
    // 6. Smart Video Engine: Scroll Auto-Play/Pause, Hover Play & Tap Seek Controls
    // -------------------------------------------------------------------------
    const videoCards = document.querySelectorAll('.custom-hover-card');

    function showSeekFeedback(container, side, text, iconClass) {
        const existing = container.querySelector('.seek-ripple');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = `seek-ripple ${side}`;
        indicator.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${text}</span>`;
        container.appendChild(indicator);

        requestAnimationFrame(() => {
            indicator.classList.add('active');
        });

        setTimeout(() => {
            indicator.classList.remove('active');
            setTimeout(() => indicator.remove(), 250);
        }, 500);
    }

    videoCards.forEach(card => {
        const video = card.querySelector('video');
        const container = card.querySelector('.video-player-container');
        const progressFill = card.querySelector('.video-progress-fill');
        const muteToggle = card.querySelector('.video-mute-toggle');

        if (!video || !container) return;

        // 1. Adaptive Aspect Ratio (Eliminates Letterboxing/Black bars)
        function adaptAspectRatio() {
            if (video.videoWidth && video.videoHeight) {
                container.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
            }
        }
        if (video.readyState >= 1) {
            adaptAspectRatio();
        } else {
            video.addEventListener('loadedmetadata', adaptAspectRatio);
        }

        // 1b. Video Playback Event Listeners (Single Source of Truth for .is-playing)
        video.addEventListener('playing', () => {
            card.classList.add('is-playing');
        });

        video.addEventListener('pause', () => {
            card.classList.remove('is-playing');
        });

        video.addEventListener('ended', () => {
            card.classList.remove('is-playing');
        });

        // 2. Desktop Hover to Play / Hover Out to Pause
        card.addEventListener('mouseenter', () => {
            video.play().catch(() => {});
        });

        card.addEventListener('mouseleave', () => {
            const rect = card.getBoundingClientRect();
            const inCenter = rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.35;
            if (!inCenter) {
                video.pause();
            }
        });

        // 3. Progress Bar Tracking
        video.addEventListener('timeupdate', () => {
            if (progressFill && video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = `${percent}%`;
            }
        });

        // 4. Mute / Unmute Sound Toggle
        if (muteToggle) {
            muteToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                video.muted = !video.muted;

                if (video.muted) {
                    muteToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                    muteToggle.title = 'Unmute Sound';
                } else {
                    muteToggle.innerHTML = '<i class="fa-solid fa-volume-high" style="color: var(--accent);"></i>';
                    muteToggle.title = 'Mute Sound';
                }
            });
        }

        // 5. Interactive Left/Right Seek & Center Play/Pause on Tap/Click
        container.addEventListener('click', (e) => {
            if (e.target.closest('.video-mute-toggle') || e.target.closest('.video-badge-top')) return;

            const rect = container.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = clickX / rect.width;

            if (ratio < 0.38) {
                // Tapped Left Side -> Rewind / Backward 5 seconds
                video.currentTime = Math.max(0, video.currentTime - 5);
                showSeekFeedback(container, 'left', '-5s', 'fa-rotate-left');
                if (video.paused) {
                    video.play().catch(() => {});
                }
            } else if (ratio > 0.62) {
                // Tapped Right Side -> Forward 5 seconds
                video.currentTime = Math.min(video.duration || 999, video.currentTime + 5);
                showSeekFeedback(container, 'right', '+5s', 'fa-rotate-right');
                if (video.paused) {
                    video.play().catch(() => {});
                }
            } else {
                // Tapped Center -> Toggle Play / Pause
                if (video.paused) {
                    video.play().catch(() => {});
                    showSeekFeedback(container, 'center', 'Play', 'fa-play');
                } else {
                    video.pause();
                    showSeekFeedback(container, 'center', 'Pause', 'fa-pause');
                }
            }
        });
    });

    // -------------------------------------------------------------------------
    // 7. Scroll-Triggered Auto Play / Pause (Play when reached, Pause when scrolled away)
    // -------------------------------------------------------------------------
    function updateScrollVideoPlayback() {
        const viewportCenter = window.innerHeight / 2;
        let closestCard = null;
        let minDistance = Infinity;

        videoCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // Visible when within 20% - 80% viewport height
            if (rect.bottom > window.innerHeight * 0.20 && rect.top < window.innerHeight * 0.80) {
                const cardCenter = rect.top + rect.height / 2;
                const dist = Math.abs(viewportCenter - cardCenter);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestCard = card;
                }
            }
        });

        videoCards.forEach(card => {
            const video = card.querySelector('video');
            if (!video) return;

            if (card === closestCard) {
                // Reached center of view: Auto-play
                if (video.paused) {
                    video.muted = true; // Muted for mobile browser policy
                    video.play().catch(() => {});
                }
            } else {
                // Scrolled away: Auto-pause
                if (!video.paused && !card.matches(':hover')) {
                    video.pause();
                }
            }
        });
    }

    let isScrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!isScrollTicking) {
            requestAnimationFrame(() => {
                updateScrollUI();
                updateScrollVideoPlayback();
                isScrollTicking = false;
            });
            isScrollTicking = true;
        }
    }, { passive: true });

    // Initial check on page load
    setTimeout(() => {
        updateScrollUI();
        updateScrollVideoPlayback();
    }, 500);


    // -------------------------------------------------------------------------
    // 8. Project Filtering
    // -------------------------------------------------------------------------
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');
                
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(15px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 250);
                }
            });
        });
    });

    // -------------------------------------------------------------------------
    // 9. Interactive Toast Notification Utility
    // -------------------------------------------------------------------------
    const toastNotification = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    let toastTimeout;

    function showToast(title, message) {
        if (!toastNotification) return;

        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;

        toastNotification.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('show');
        }, 4000);
    }

    // -------------------------------------------------------------------------
    // 10. Copy Email to Clipboard
    // -------------------------------------------------------------------------
    const copyEmailBtns = document.querySelectorAll('.copy-email-btn');

    copyEmailBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.getAttribute('data-email');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(() => {
                    const originalIcon = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-emerald);"></i>';
                    showToast('Copied to Clipboard!', `Address ${email} copied successfully.`);
                    setTimeout(() => {
                        btn.innerHTML = originalIcon;
                    }, 2500);
                });
            }
        });
    });

    // -------------------------------------------------------------------------
    // 11. Interactive Project Configurator Engine
    // -------------------------------------------------------------------------
    const serviceButtons = document.querySelectorAll('#serviceOptions .config-chip');
    const timelineButtons = document.querySelectorAll('#timelineOptions .config-chip');
    const contextButtons = document.querySelectorAll('#contextOptions .config-chip');
    const configNoteInput = document.getElementById('configNote');
    const summaryPreview = document.getElementById('summaryPreview');
    const launchGmailBtn = document.getElementById('launchGmailBtn');
    const copyInquiryBtn = document.getElementById('copyInquiryBtn');

    function getActiveValue(buttons) {
        for (const btn of buttons) {
            if (btn.classList.contains('active')) {
                return btn.getAttribute('data-value') || btn.innerText.trim();
            }
        }
        return buttons.length > 0 ? (buttons[0].getAttribute('data-value') || buttons[0].innerText.trim()) : '';
    }

    function setupChipGroup(buttons) {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateConfigurator();
            });
        });
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateConfigurator() {
        if (!summaryPreview || !launchGmailBtn) return;

        const service = getActiveValue(serviceButtons);
        const timeline = getActiveValue(timelineButtons);
        const context = getActiveValue(contextButtons);
        const note = configNoteInput ? configNoteInput.value.trim() : '';

        // Subject & Body formatting
        const subject = `[Inquiry] ${service} • ${context}`;
        let body = `Hi JP,\n\nI checked out your portfolio and would like to collaborate on a project:\n\n• Service / Focus: ${service}\n• Estimated Timeline: ${timeline}\n• Project Context: ${context}`;

        if (note) {
            body += `\n• Project Overview / Notes: ${note}`;
        }

        body += `\n\nLooking forward to hearing from you!\n\nBest regards,`;

        // Render visual live preview
        let previewHtml = `
            <div class="preview-line"><strong>Subject:</strong> <span class="highlight-val">${escapeHtml(subject)}</span></div>
            <div class="preview-line"><strong>Service:</strong> <span class="highlight-val">${escapeHtml(service)}</span></div>
            <div class="preview-line"><strong>Timeline:</strong> <span class="highlight-val">${escapeHtml(timeline)}</span></div>
            <div class="preview-line"><strong>Context:</strong> <span class="highlight-val">${escapeHtml(context)}</span></div>
        `;

        if (note) {
            previewHtml += `<div class="preview-line"><strong>Note:</strong> "${escapeHtml(note)}"</div>`;
        }

        summaryPreview.innerHTML = previewHtml;

        // Build direct mailto link
        const mailtoUrl = `mailto:jhonpaulosolsona12@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        launchGmailBtn.href = mailtoUrl;

        // Store plain text draft for copy button
        launchGmailBtn.dataset.rawDraft = `Subject: ${subject}\n\n${body}`;
    }

    if (serviceButtons.length > 0) {
        setupChipGroup(serviceButtons);
        setupChipGroup(timelineButtons);
        setupChipGroup(contextButtons);

        if (configNoteInput) {
            configNoteInput.addEventListener('input', updateConfigurator);
        }

        if (launchGmailBtn) {
            launchGmailBtn.addEventListener('click', () => {
                showToast('Launching Email...', 'Opening your mail client with your pre-filled inquiry.');
            });
        }

        if (copyInquiryBtn) {
            copyInquiryBtn.addEventListener('click', async () => {
                const textToCopy = launchGmailBtn.dataset.rawDraft || '';
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    const originalHtml = copyInquiryBtn.innerHTML;
                    copyInquiryBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied to Clipboard!</span>';
                    showToast('Inquiry Copied!', 'Pasted brief ready for Messenger, Discord, or Email.');
                    setTimeout(() => {
                        copyInquiryBtn.innerHTML = originalHtml;
                    }, 2200);
                } catch (err) {
                    showToast('Copy Failed', 'Please select and copy the text manually.');
                }
            });
        }

        // Initialize state
        updateConfigurator();
    }

    // -------------------------------------------------------------------------
    // 12. Subtle 3D Perspective Tilt on Hover (Desktop Hover Only)
    // -------------------------------------------------------------------------
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const tiltElements = document.querySelectorAll('[data-tilt]');

        tiltElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -3.5;
                const rotateY = ((x - centerX) / centerX) * 3.5;

                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            });
        });
    }
});
