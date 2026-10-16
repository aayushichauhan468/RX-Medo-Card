(() => {
  const script = document.currentScript;
  const root = new URL('../', script.src);
  const rootPath = location.pathname.replace(/\\/g, '/');
  const onCardsPage = /\/cards\/[^/]*$/i.test(rootPath);
  const prefix = onCardsPage ? '../' : './';
  const loadCss = (name, pattern = null) => {
    const href = new URL(name, root).href;
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => pattern ? pattern.test(link.href) : link.href === href);
    if (existing) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
      link.onload = resolve; link.onerror = resolve; document.head.appendChild(link);
    });
  };
  const stylesReady = Promise.all([
    loadCss('lib/bootstrap/dist/css/bootstrap.min.css', /bootstrap/i),
    loadCss('cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', /font-?awesome/i),
    loadCss('css/navbar-footer1287.css'), loadCss('css/mobile-menu4616.css'), loadCss('css/desktop-navbare91c.css')
  ]);
  Promise.all([stylesReady, fetch(new URL('navbar.html', root)).then(response => {
    if (!response.ok) throw new Error(`Navbar request failed (${response.status})`);
    return response.text();
  })]).then(([, markup]) => {
    const host = document.createElement('div');
    host.innerHTML = markup.replaceAll('__ROOT__', prefix);
    document.body.prepend(host.firstElementChild);
    const path = location.pathname.toLowerCase();
    const desktopLinks = document.querySelectorAll('#desktopSiteNavigation a[href]');
    desktopLinks.forEach(link => {
      const target = new URL(link.href).pathname.toLowerCase();
      if (target === path || (target.endsWith('/index.html') && (path.endsWith('/') || path.endsWith('/index.html')))) {
        link.classList.add('active');
        const parentDropdown = link.closest('.desktop-dropdown');
        if (parentDropdown) parentDropdown.querySelector('.site-nav-dropdown').classList.add('active');
      }
    });
    const header = document.getElementById('siteHeader');
    const toggler = header.querySelector('.navbar-toggler');
    const collapse = header.querySelector('.navbar-collapse');
    const setMenu = open => { collapse.classList.toggle('show', open); toggler.setAttribute('aria-expanded', String(open)); };
    toggler.addEventListener('click', () => setMenu(!collapse.classList.contains('show')));
    header.querySelector('.mobile-menu-close').addEventListener('click', () => setMenu(false));
    header.querySelectorAll('.desktop-dropdown, .mobile-dropdown').forEach(dropdown => {
      const button = dropdown.querySelector(':scope > a, :scope > button');
      const menu = dropdown.querySelector('.dropdown-menu');
      dropdown.addEventListener('mouseenter', () => { if (matchMedia('(min-width: 992px)').matches) menu.classList.add('show'); });
      dropdown.addEventListener('mouseleave', () => menu.classList.remove('show'));
      button.addEventListener('click', event => {
        if (button.tagName === 'A') event.preventDefault();
        menu.classList.toggle('show'); button.setAttribute('aria-expanded', String(menu.classList.contains('show')));
      });
    });
    header.querySelectorAll('#navbarSupportedContent a.nav-link').forEach(link => {
      const href = new URL(link.href).pathname.toLowerCase();
      if (href === path || (href.endsWith('index.html') && (path.endsWith('/') || path.endsWith('/index.html')))) link.classList.add('active');
      link.addEventListener('click', () => setMenu(false));
    });
    const elevate = () => header.classList.toggle('header-scrolled', window.scrollY > 40);
    elevate(); window.addEventListener('scroll', elevate, { passive: true });
  }).catch(error => console.error('Could not load the shared site navbar:', error));
})();
