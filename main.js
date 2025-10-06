(function () {
  const INCLUDE_ATTR = 'data-include';
  const fragmentCache = new Map();

  function fetchFragment(url) {
    if (!url) {
      return Promise.resolve('');
    }

    if (!fragmentCache.has(url)) {
      const request = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
          }
          return response.text();
        })
        .catch((error) => {
          console.error('[include] Failed to fetch fragment:', error);
          return '';
        });

      fragmentCache.set(url, request);
    }

    return fragmentCache.get(url);
  }

  async function injectFragments() {
    const targets = Array.from(document.querySelectorAll(`[${INCLUDE_ATTR}]`));

    await Promise.all(
      targets.map(async (target) => {
        const url = target.getAttribute(INCLUDE_ATTR);
        const html = await fetchFragment(url);
        target.innerHTML = html;
        target.removeAttribute(INCLUDE_ATTR);
      })
    );
  }

  function highlightActiveLinks(scope) {
    if (!scope) {
      return;
    }

    const currentPage = (() => {
      const path = window.location.pathname;
      const lastSegment = path.split('/').filter(Boolean).pop();
      return lastSegment || 'index.html';
    })();

    const anchors = scope.querySelectorAll('.nav-links a[href]');
    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) {
        return;
      }

      const anchorPage = href.split('/').pop();
      const isActive = anchorPage === currentPage || (anchorPage === 'index.html' && currentPage === '');
      anchor.classList.toggle('is-active', isActive);
    });
  }

  function handleRoleSelection(event) {
    const value = event.target.value;
    if (value === 'owner') {
      window.location.href = 'owner-crm.html';
    }
  }

  function setupRoleSwitcher(scope) {
    if (!scope) {
      return;
    }

    const selects = scope.querySelectorAll('.role-switcher select');
    selects.forEach((select) => {
      if (select.dataset.roleReady === 'true') {
        return;
      }

      select.dataset.roleReady = 'true';
      select.addEventListener('change', handleRoleSelection);
    });
  }

  function trapFocus(panel) {
    if (!panel) {
      return;
    }

    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        'select:not([disabled])',
      ];

      const focusable = Array.from(panel.querySelectorAll(focusableSelectors.join(','))).filter(
        (node) => node.offsetParent !== null
      );

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isShiftPressed = event.shiftKey;
      const activeElement = document.activeElement;

      if (!isShiftPressed && activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (isShiftPressed && activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    });
  }

  function ensureUniqueRoleSwitcherIds(mobileNav) {
    if (!mobileNav) {
      return;
    }

    const roleSwitchers = mobileNav.querySelectorAll('.role-switcher');
    roleSwitchers.forEach((roleSwitcher, index) => {
      const select = roleSwitcher.querySelector('select');
      const label = roleSwitcher.querySelector('label');

      if (select) {
        const newId = `role-selector-mobile-${index + 1}`;
        select.id = newId;
        if (label) {
          label.setAttribute('for', newId);
        }
      }
    });
  }

  function setupHeaderAndMobileMenu() {
    const header = document.querySelector('.site-header');
    if (!header) {
      return;
    }

    const mobileNav = document.querySelector('.mobile-nav');
    const desktopNav = header.querySelector('.nav-links');
    const desktopActions = header.querySelector('.header-actions');

    if (mobileNav) {
      const mobileLinksTarget = mobileNav.querySelector('[data-mobile-links]');
      const mobileActionsTarget = mobileNav.querySelector('[data-mobile-actions]');

      if (mobileLinksTarget && desktopNav) {
        mobileLinksTarget.innerHTML = desktopNav.innerHTML;
      }

      if (mobileActionsTarget && desktopActions) {
        mobileActionsTarget.innerHTML = desktopActions.innerHTML;
      }

      ensureUniqueRoleSwitcherIds(mobileNav);
    }

    highlightActiveLinks(header);
    if (mobileNav) {
      highlightActiveLinks(mobileNav);
    }

    setupRoleSwitcher(header);
    if (mobileNav) {
      setupRoleSwitcher(mobileNav);
    }

    const toggle = header.querySelector('.mobile-menu-toggle');
    if (!toggle || !mobileNav) {
      return;
    }

    const panel = mobileNav.querySelector('.mobile-nav__panel');
    const backdrop = mobileNav.querySelector('[data-mobile-backdrop]');
    const closeBtn = mobileNav.querySelector('.mobile-nav__close');
    const body = document.body;
    let lastFocusedElement = null;

    function openMenu() {
      if (mobileNav.classList.contains('is-open')) {
        return;
      }

      lastFocusedElement = document.activeElement;
      mobileNav.classList.add('is-open');
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      mobileNav.setAttribute('aria-hidden', 'false');
      body.classList.add('mobile-nav-open');

      if (panel) {
        panel.focus({ preventScroll: true });
      }
    }

    function closeMenu() {
      if (!mobileNav.classList.contains('is-open')) {
        return;
      }

      mobileNav.classList.remove('is-open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
      body.classList.remove('mobile-nav-open');

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener('click', () => {
      if (mobileNav.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeMenu);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMenu);
    }

    mobileNav.addEventListener('click', (event) => {
      const anchor = event.target.closest('.mobile-nav__links a');
      if (anchor) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    trapFocus(panel);
  }

  async function initSharedLayout() {
    await injectFragments();
    setupHeaderAndMobileMenu();
    document.dispatchEvent(new CustomEvent('fragments:loaded'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSharedLayout().catch((error) => {
      console.error('[include] Initialization failed:', error);
    });
  });
})();
