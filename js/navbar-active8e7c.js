/**
 * Active Navigation & React Bits GooeyNav Integration
 * Rx MedoCard
 */

document.addEventListener('DOMContentLoaded', function () {
    // Current URL path
    const currentPath = window.location.pathname.toLowerCase();

    // Map of navigation indices to page URL patterns
    const navPatterns = [
        ['index.html', 'home', '/'],
        ['medocard.html', 'card', 'topup', 'citizecare', 'guardiancare', 'youngshield', 'seniorshield', 'membership'],
        ['hospitals.html', 'hospital'],
        ['opd.html'],
        ['pharmacy.html'],
        ['diagnostics.html', 'diagnostic'],
        ['career.html']
    ];

    let activeIndex = 0;
    for (let i = 0; i < navPatterns.length; i++) {
        const patterns = navPatterns[i];
        if (patterns.some(p => currentPath.endsWith(p) || (p !== '/' && p !== 'index.html' && currentPath.includes(p)))) {
            activeIndex = i;
            break;
        }
    }

    // Initialize React Bits GooeyNav on Desktop Navigation
    const gooeyNavEl = document.getElementById('desktopGooeyNav');
    if (gooeyNavEl && typeof GooeyNav !== 'undefined') {
        window.rxGooeyNav = new GooeyNav(gooeyNavEl, {
            initialActiveIndex: activeIndex,
            color: '#ef476f',
            colors: ['#ef476f', '#f43f5e', '#fb7185'],
            hoverColor: 'rgba(239, 71, 111, 0.08)',
            shadow: 0.22,
            animationTime: 600,
            particleCount: 16,
            spread: 54,
            gooeyness: 0.5,
            wobble: 0.5,
            hoverEffect: true
        });

        // Setup desktop dropdown for Card Details
        const desktopDropdown = gooeyNavEl.querySelector('.desktop-dropdown');
        if (desktopDropdown) {
            const dropdownMenu = desktopDropdown.querySelector('.dropdown-menu');
            desktopDropdown.addEventListener('mouseenter', function () {
                if (window.innerWidth >= 992 && dropdownMenu) {
                    dropdownMenu.classList.add('show');
                }
            });
            desktopDropdown.addEventListener('mouseleave', function () {
                if (window.innerWidth >= 992 && dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }
    }

    // Set active item on Mobile Drawer Nav
    const mobileNavLinks = document.querySelectorAll('#navbarSupportedContent .nav-link');
    mobileNavLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const lowerHref = href.toLowerCase();
        if (link.classList.contains('get-card-btn') || link.classList.contains('login-btn')) return;

        if (currentPath.endsWith(lowerHref) ||
            (lowerHref !== '/' && lowerHref !== 'index.html' && currentPath.includes(lowerHref)) ||
            ((currentPath === '/' || currentPath.endsWith('/index.html') || currentPath === '') && (lowerHref === 'index.html' || lowerHref === '/'))) {
            link.classList.add('active');
            const parent = link.closest('.nav-item');
            if (parent) parent.classList.add('active');
        }
    });

    // Mobile menu toggle handling
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    // Close mobile drawer on anchor link clicks
    document.querySelectorAll('.navbar-collapse .nav-link').forEach(link => {
        link.addEventListener('click', function () {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && window.innerWidth < 992 && navbarCollapse && navbarCollapse.classList.contains('show')) {
                if (navbarToggler) navbarToggler.click();
            }
        });
    });

    // Close mobile drawer on outside click
    document.addEventListener('click', function (event) {
        if (window.innerWidth < 992 &&
            navbarCollapse &&
            navbarCollapse.classList.contains('show') &&
            !navbarCollapse.contains(event.target) &&
            navbarToggler &&
            !navbarToggler.contains(event.target)) {
            navbarToggler.click();
        }
    });
});

// Scroll header elevation effect
window.addEventListener('scroll', function () {
    const header = document.querySelector('.header-modern');
    if (!header) return;
    if (window.scrollY > 40) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }
});
