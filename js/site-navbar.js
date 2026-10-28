(() => {
  const script = document.currentScript || document.querySelector('script[src*="site-navbar.js"]');
  const scriptSrc = script ? script.src : new URL('js/site-navbar.js', location.href).href;
  const root = new URL('../', scriptSrc);
  const rootPath = location.pathname.replace(/\\/g, '/');
  const onCardsPage = /\/cards\/[^/]*$/i.test(rootPath);
  const prefix = onCardsPage ? '../' : './';

  const loadCss = (name, pattern = null) => {
    try {
      const href = new URL(name, root).href;
      const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => pattern ? pattern.test(link.href) : link.href === href);
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    } catch (e) {}
  };

  // Ensure navbar CSS and FontAwesome are loaded
  loadCss('css/navbar.css', /navbar\.css/i);
  loadCss('cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', /font-?awesome/i);
  loadCss('css/desktop-navbare91c.css', /desktop-navbar/i);

  fetch(new URL('navbar.html', root))
    .then(response => {
      if (!response.ok) throw new Error(`Navbar request failed (${response.status})`);
      return response.text();
    })
    .then(markup => {
      const host = document.createElement('div');
      host.innerHTML = markup.replaceAll('__ROOT__', prefix).trim();
      const newHeader = host.firstElementChild;

      // Remove any pre-existing duplicate header elements on the page
      const duplicateHeaders = document.querySelectorAll('header.header-modern, header.site-header, #siteHeader');
      duplicateHeaders.forEach(el => el.remove());

      // Mount point resolution: use existing mount container or prepend to body
      const mount = document.getElementById('navbarMount') ||
                    document.getElementById('siteNavbarMount') ||
                    document.querySelector('[data-navbar-mount]');

      if (mount) {
        mount.replaceWith(newHeader);
      } else {
        document.body.prepend(newHeader);
      }

      const header = document.getElementById('siteHeader') || newHeader;

      // Detect active page accurately
      const currentPath = location.pathname.replace(/\\/g, '/').toLowerCase();
      const currentFile = currentPath.split('/').filter(Boolean).pop() || 'index.html';

      const isMatch = (href) => {
        try {
          const url = new URL(href, location.origin);
          const targetPath = url.pathname.replace(/\\/g, '/').toLowerCase();
          const targetFile = targetPath.split('/').filter(Boolean).pop() || 'index.html';

          if (targetPath === currentPath) return true;
          if (targetFile === currentFile && currentFile !== '') return true;
          if ((targetFile === 'index.html' || targetPath.endsWith('/index.html')) &&
              (currentPath.endsWith('/') || currentFile === 'index.html')) {
            return true;
          }
        } catch (e) {}
        return false;
      };

      // Desktop links active state
      const desktopLinks = header.querySelectorAll('#desktopSiteNavigation a[href]');
      desktopLinks.forEach(link => {
        if (isMatch(link.href)) {
          link.classList.add('active');
          const parentDropdown = link.closest('.desktop-dropdown');
          if (parentDropdown) {
            const dropBtn = parentDropdown.querySelector('.site-nav-dropdown');
            if (dropBtn) dropBtn.classList.add('active');
          }
        }
      });
      if (currentFile === 'offers.html') {
        const desktopDropBtn = header.querySelector('#desktopSiteNavigation .site-nav-dropdown');
        if (desktopDropBtn) desktopDropBtn.classList.add('active');
      }

      // Mobile links active state
      const mobileLinks = header.querySelectorAll('#navbarSupportedContent a.nav-link, #navbarSupportedContent .dropdown-item');
      mobileLinks.forEach(link => {
        if (isMatch(link.href)) {
          link.classList.add('active');
          const parentDropdown = link.closest('.mobile-dropdown');
          if (parentDropdown) {
            const dropHeader = parentDropdown.querySelector('.mobile-dropdown-header');
            if (dropHeader) dropHeader.classList.add('active');
            const dropBtn = parentDropdown.querySelector('button.nav-link, .mobile-dropdown-link');
            if (dropBtn) dropBtn.classList.add('active');
          }
        }
      });

      // Mobile Drawer Controls
      // Mobile Drawer Controls
      const toggler = header.querySelector('.navbar-toggler');
      const collapse = header.querySelector('#navbarSupportedContent');
      const closeBtn = header.querySelector('.mobile-menu-close');
      const backdrop = header.querySelector('#navbarBackdrop') || header.querySelector('.navbar-backdrop');
      const mobileScrollable = header.querySelector('.mobile-menu-scrollable');

      const setMenu = (open) => {
        if (!collapse) return;
        collapse.classList.toggle('show', open);
        if (backdrop) backdrop.classList.toggle('show', open);
        if (toggler) toggler.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('mobile-menu-open', open);
        if (open && mobileScrollable) {
          mobileScrollable.scrollTop = 0;
        }
      };

      if (toggler && collapse) {
        toggler.addEventListener('click', (e) => {
          e.stopPropagation();
          setMenu(!collapse.classList.contains('show'));
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setMenu(false);
        });
      }

      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          e.stopPropagation();
          setMenu(false);
        });
      }

      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (collapse && collapse.classList.contains('show')) {
          if (!collapse.contains(e.target) && toggler && !toggler.contains(e.target)) {
            setMenu(false);
          }
        }
      });

      // Desktop Dropdowns with grace period and keyboard focus
      header.querySelectorAll('.desktop-dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.site-nav-dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (!button || !menu) return;

        let leaveTimeout = null;

        const openMenu = () => {
          if (leaveTimeout) {
            clearTimeout(leaveTimeout);
            leaveTimeout = null;
          }
          if (window.matchMedia('(min-width: 992px)').matches) {
            menu.classList.add('show');
            button.setAttribute('aria-expanded', 'true');
          }
        };

        const closeMenu = (immediate = false) => {
          if (leaveTimeout) {
            clearTimeout(leaveTimeout);
            leaveTimeout = null;
          }
          if (immediate) {
            menu.classList.remove('show');
            button.setAttribute('aria-expanded', 'false');
            return;
          }
          leaveTimeout = setTimeout(() => {
            if (window.matchMedia('(min-width: 992px)').matches) {
              menu.classList.remove('show');
              button.setAttribute('aria-expanded', 'false');
            }
          }, 180);
        };

        dropdown.addEventListener('mouseenter', openMenu);
        dropdown.addEventListener('mouseleave', () => closeMenu(false));
        dropdown.addEventListener('focusin', openMenu);
        dropdown.addEventListener('focusout', (e) => {
          if (!dropdown.contains(e.relatedTarget)) {
            closeMenu(false);
          }
        });

        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = menu.classList.contains('show');
          if (isOpen) {
            closeMenu(true);
          } else {
            openMenu();
          }
        });

        menu.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => {
            closeMenu(true);
          });
        });
      });

      // Mobile dropdown accordion
      header.querySelectorAll('.mobile-dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('.mobile-dropdown-toggle') || dropdown.querySelector('button.nav-link');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (!button || !menu) return;

        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = menu.classList.contains('show');
          menu.classList.toggle('show', !isOpen);
          button.setAttribute('aria-expanded', String(!isOpen));
        });
      });

      // Close mobile menu when clicking any mobile nav link
      header.querySelectorAll('#navbarSupportedContent a').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
      });

      // Elevate on scroll
      const elevate = () => {
        header.classList.toggle('header-scrolled', window.scrollY > 30);
      };
      elevate();
      window.addEventListener('scroll', elevate, { passive: true });
    })
    .catch(error => {
      console.error('Could not load the shared site navbar:', error);
    });
})();
