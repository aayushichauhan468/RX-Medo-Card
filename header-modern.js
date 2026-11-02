/**
 * Rx Medo Card - Modern Navbar Interactive Behaviors
 * Shared across all website pages
 */

document.addEventListener("DOMContentLoaded", function () {
    // 1. Mobile dropdown click toggling
    var dropdownLinks = document.querySelectorAll('.header-modern .nav-item.dropdown > a');
    dropdownLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            if (window.innerWidth <= 991) {
                e.preventDefault();
                var parent = this.parentElement;
                document.querySelectorAll('.header-modern .nav-item.dropdown').forEach(function (item) {
                    if (item !== parent) item.classList.remove('show');
                });
                parent.classList.toggle('show');
            }
        });
    });

    // 2. Mobile close button handling
    var closeButtons = document.querySelectorAll('.header-modern .mobile-menu-close, .header-modern #mobileMenuCloseBtn');
    closeButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var collapse = document.getElementById('navbarSupportedContent');
            if (collapse) {
                collapse.classList.remove('show');
            }
        });
    });

    // 3. Highlight current page link based on filename
    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    var navLinks = document.querySelectorAll('.header-modern .navbar-nav .nav-link');
    var isCardSubPage = [
        'medocard.html', 'medoTopUpCard.html', 'medofamily.html',
        'medoTopUpfamily.html', 'youngshield.html', 'citizecare.html',
        'guardiancare.html', 'medoFamilysecure.html', 'seniorshield.html',
        'youngshield1.html', 'medoinsure.html', 'Membership.html', 'Offers.html'
    ].indexOf(currentPath) !== -1;

    // Reset default active on links
    navLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        var mobileItem = link.querySelector('.mobile-item');

        if (href && href === currentPath) {
            link.classList.add('active');
            if (mobileItem) mobileItem.classList.add('active');
        } else if (href === '#' && link.id === 'cardDropdown' && isCardSubPage) {
            link.classList.add('active');
            if (mobileItem) mobileItem.classList.add('active');
        } else if (currentPath !== 'index.html' && href === 'index.html') {
            link.classList.remove('active');
            if (mobileItem) mobileItem.classList.remove('active');
        }
    });

    // 4. Header scroll styling
    var header = document.querySelector('.header-modern');
    function updateHeaderScroll() {
        if (header) {
            header.classList.toggle('is-scrolled', window.scrollY > 20);
        }
    }
    window.addEventListener('scroll', updateHeaderScroll, { passive: true });
    updateHeaderScroll();
});
