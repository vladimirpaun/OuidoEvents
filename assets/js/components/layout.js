const NAV_LINKS = [
  { href: 'index.html', label: 'Acasă', page: 'home' },
  { href: 'locations.html', label: 'Locații', page: 'locations' },
  { href: '#', label: 'Blog', page: 'blog' },
  { href: '#', label: 'Despre noi', page: 'about' },
  { href: 'contact.html', label: 'Contact', page: 'contact' }
];

const GRADIENT_OPTIONS = [
  { value: 'classic', label: 'Clasic' },
  { value: 'sky', label: 'Sky' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'twilight', label: 'Twilight' },
  { value: 'deep', label: 'Deep' }
];

const GRADIENT_STORAGE_KEY = 'ouidoEvents:headerGradient';

function createNavLinksMarkup(activePage) {
  return NAV_LINKS.map(({ href, label, page }) => {
    const isActive = activePage === page;
    return `<a href="${href}" data-page-key="${page}" class="${isActive ? 'active' : ''}">${label}</a>`;
  }).join('');
}

function createGradientSwitcherMarkup() {
  const options = GRADIENT_OPTIONS.map(option => `<option value="${option.value}">${option.label}</option>`).join('');
  return `
    <div class="gradient-switcher">
      <label>Stil meniu</label>
      <select data-gradient-select>
        ${options}
      </select>
    </div>
  `;
}

function buildHeader({ includeStyleMenu, activeNavKey }) {
  const header = document.createElement('header');
  const storedGradient = localStorage.getItem(GRADIENT_STORAGE_KEY) || 'classic';
  header.dataset.gradient = storedGradient;

  header.innerHTML = `
    <div class="container header-container">
      <a href="index.html" class="logo">OuidoEvents</a>
      <nav class="nav-links" data-nav="desktop">
        ${createNavLinksMarkup(activeNavKey)}
      </nav>
      ${includeStyleMenu ? createGradientSwitcherMarkup() : ''}
      <div class="header-actions" data-actions="desktop">
        <div class="user-links-placeholder" data-user-links></div>
        <a href="login.html" class="secondary-cta-button">Conectare</a>
        <a href="create-account.html" class="cta-button">Adaugă locația ta</a>
      </div>
      <button class="mobile-menu-button" type="button" aria-expanded="false" aria-controls="mobile-nav">
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
    </div>
    <div class="mobile-nav-overlay" id="mobile-nav">
      <nav class="nav-links" data-nav="mobile"></nav>
      <div class="header-actions" data-actions="mobile"></div>
      ${includeStyleMenu ? createGradientSwitcherMarkup() : ''}
    </div>
  `;

  const desktopNav = header.querySelector('[data-nav="desktop"]');
  const mobileNav = header.querySelector('[data-nav="mobile"]');
  if (mobileNav && desktopNav) {
    mobileNav.innerHTML = desktopNav.innerHTML;
  }

  const desktopActions = header.querySelector('[data-actions="desktop"]');
  const mobileActions = header.querySelector('[data-actions="mobile"]');
  if (mobileActions && desktopActions) {
    mobileActions.innerHTML = desktopActions.innerHTML;
  }

  const gradientSelectors = header.querySelectorAll('[data-gradient-select]');
  gradientSelectors.forEach(select => {
    select.value = storedGradient;
    select.addEventListener('change', event => {
      const selectedValue = event.target.value;
      header.dataset.gradient = selectedValue;
      localStorage.setItem(GRADIENT_STORAGE_KEY, selectedValue);
      gradientSelectors.forEach(otherSelect => {
        if (otherSelect !== event.target) {
          otherSelect.value = selectedValue;
        }
      });
    });
  });

  const mobileMenuButton = header.querySelector('.mobile-menu-button');
  const mobileOverlay = header.querySelector('.mobile-nav-overlay');
  if (mobileMenuButton && mobileOverlay) {
    mobileMenuButton.addEventListener('click', () => {
      const isOpen = mobileMenuButton.classList.toggle('open');
      mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
      mobileOverlay.classList.toggle('active');
    });
  }

  return header;
}

function buildFooter() {
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <div class="container">
      <div class="footer-container">
        <div class="footer-about">
          <h3 class="footer-title">ouidoEvents</h3>
          <p>Platforma care conectează organizatorii de evenimente cu locații perfecte pentru momente memorabile.</p>
        </div>
        <div>
          <h3 class="footer-title">Link-uri rapide</h3>
          <ul class="footer-links">
            <li><a href="locations.html">Locații</a></li>
            <li><a href="create-account.html">Adaugă locația ta</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-title">Resurse</h3>
          <ul class="footer-links">
            <li><a href="#">Ghid de organizare</a></li>
            <li><a href="#">Checklist eveniment</a></li>
            <li><a href="#">Calculator buget</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-title">Contact</h3>
          <ul class="footer-links">
            <li>București, România</li>
            <li><a href="mailto:contact@ouidoevents.com">contact@ouidoevents.com</a></li>
            <li><a href="tel:+40712345678">+40 712 345 678</a></li>
          </ul>
        </div>
      </div>
      <div class="copyright">&copy; 2025 ouidoEvents. Toate drepturile rezervate.</div>
    </div>
  `;
  return footer;
}

function resolveActiveNavKey(pageKey) {
  if (pageKey === 'venue-details') {
    return 'locations';
  }
  return pageKey;
}

export function initLayout({ pageKey = 'home', includeStyleMenu = false } = {}) {
  const main = document.querySelector('main');
  if (!main) {
    return;
  }

  const activeNavKey = resolveActiveNavKey(pageKey);
  const header = buildHeader({ includeStyleMenu, activeNavKey });
  main.parentElement.insertBefore(header, main);

  const footer = buildFooter();
  if (main.nextElementSibling) {
    main.parentElement.insertBefore(footer, main.nextElementSibling);
  } else {
    main.parentElement.appendChild(footer);
  }

  synchronizeActiveLinks(header, activeNavKey);
}

function synchronizeActiveLinks(header, activeNavKey) {
  if (!header) {
    return;
  }

  const anchors = header.querySelectorAll('.nav-links a');
  anchors.forEach(anchor => {
    const linkPage = anchor.dataset.pageKey;
    if (linkPage) {
      if (linkPage === activeNavKey) {
        anchor.classList.add('active');
      } else {
        anchor.classList.remove('active');
      }
    }
  });
}
