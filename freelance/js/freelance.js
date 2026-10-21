/**
 * Freelance Showcase JavaScript — Jhon Paulo V. Gascon Portfolio
 * Modern filtering, modal previews, and accessible clipboard copy
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Tab Filter System
    // -------------------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.fs-tab-btn');
    const cards = document.querySelectorAll('.fs-card');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');

            // Update active state on buttons
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            // Filter cards with subtle transition
            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'flex';
                    requestAnimationFrame(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    });
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        if (btn.getAttribute('data-filter') !== 'all' && card.getAttribute('data-category') !== filter) {
                            card.style.display = 'none';
                        }
                    }, 200);
                }
            });
        });
    });

    // -------------------------------------------------------------------------
    // 2. Interactive Preview Modal
    // -------------------------------------------------------------------------
    const modal = document.getElementById('fsModal');
    const modalTitle = document.getElementById('fsModalTitle');
    const modalImg = document.getElementById('fsModalImg');
    const modalDownloadBtn = document.getElementById('fsModalDownload');
    const modalViewPdfBtn = document.getElementById('fsModalViewPdf');
    const modalCloseBtn = document.getElementById('fsModalClose');

    function openModal(card) {
        const title = card.getAttribute('data-title');
        const previewImg = card.getAttribute('data-preview');
        const downloadUrl = card.getAttribute('data-download');
        const pdfUrl = card.getAttribute('data-pdf');
        const filename = card.getAttribute('data-filename');

        modalTitle.textContent = title;
        modalImg.src = previewImg;
        modalImg.alt = `Preview of ${title}`;
        modalDownloadBtn.href = downloadUrl;
        modalDownloadBtn.setAttribute('download', filename);

        if (pdfUrl) {
            modalViewPdfBtn.href = pdfUrl;
            modalViewPdfBtn.style.display = 'inline-flex';
        } else {
            modalViewPdfBtn.style.display = 'none';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        modalCloseBtn.focus();
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Attach open handler to preview buttons & card thumbnails
    document.querySelectorAll('.fs-btn-preview, .fs-card-thumb-wrap').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const card = el.closest('.fs-card');
            if (card) openModal(card);
        });
    });

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Keyboard support for modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // -------------------------------------------------------------------------
    // 3. Clickable Contact Cards & Copy Email Clipboard Handlers
    // -------------------------------------------------------------------------
    const contactCards = document.querySelectorAll('.contact-card');
    contactCards.forEach(card => {
        if (card.tagName.toLowerCase() === 'a') return;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.copy-email-btn')) return;

            const link = card.querySelector('a.contact-card-value') || card.querySelector('a');
            if (link) {
                window.location.href = link.href;
            }
        });
    });

    const copyBtns = document.querySelectorAll('.copy-email-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.getAttribute('data-email');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(() => {
                    const originalIcon = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-emerald, #10b981);"></i>';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.innerHTML = originalIcon;
                        btn.classList.remove('copied');
                    }, 2000);
                });
            }
        });
    });

    // -------------------------------------------------------------------------
    // 4. Mobile Menu Navigation
    // -------------------------------------------------------------------------
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
            hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // -------------------------------------------------------------------------
    // 5. Theme Toggle Engine
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
});
