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
        const template = document.createElement('template');
        template.innerHTML = html;
        const fragment = template.content.cloneNode(true);
        const normalizedUrl = (url || '').split(/[?#]/)[0];
        const shouldReplaceWrapper = /(?:^|\/)header\.html$/i.test(normalizedUrl);

        target.removeAttribute(INCLUDE_ATTR);

        if (shouldReplaceWrapper) {
          target.replaceWith(fragment);
        } else {
          target.innerHTML = '';
          target.appendChild(fragment);
        }
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
    if (!value || value === '#') {
      return;
    }

    const roleRoutes = {
      owner: 'owner-crm.html',
      'owner-crm.html': 'owner-crm.html',
      client: 'client-dashboard.html',
      'client-dashboard.html': 'client-dashboard.html',
    };

    const targetUrl = roleRoutes[value];

    if (targetUrl) {
      window.location.href = targetUrl;
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

    const syncHeaderHeight = () => {
      const height = header.offsetHeight;
      if (!height) {
        return;
      }
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    };

    syncHeaderHeight();
    window.addEventListener('load', syncHeaderHeight);
    window.addEventListener('resize', syncHeaderHeight);

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

  function getSearchComponentConfig(component) {
    const wrapper = component.closest('[data-search-default-action], [data-search-navigate-to]');
    const defaultAction = component.dataset.defaultAction || (wrapper ? wrapper.dataset.searchDefaultAction : '');
    const navigateTo = component.dataset.navigateTo || (wrapper ? wrapper.dataset.searchNavigateTo : '');

    return {
      defaultAction: defaultAction || 'none',
      navigateTo: navigateTo || 'locations.html',
    };
  }

  function collectSearchValues(component) {
    const eventType = component.querySelector('#event-type');
    const locationInput = component.querySelector('#location');
    const dateInput = component.querySelector('[data-search-date]');
    const guests = component.querySelector('#guests');

    const isPlaceholderActive = dateInput && dateInput.dataset.placeholderActive === 'true';

    return {
      eventType: eventType ? eventType.value : '',
      location: locationInput ? locationInput.value.trim() : '',
      date: !dateInput || isPlaceholderActive ? '' : dateInput.value.trim(),
      guests: guests ? guests.value : '',
    };
  }

  function initializeSearchComponents(context = document) {
    const components = context.querySelectorAll('[data-search-box]');

    components.forEach((component) => {
      if (component.dataset.searchReady === 'true') {
        return;
      }

      component.dataset.searchReady = 'true';

      const { defaultAction, navigateTo } = getSearchComponentConfig(component);
      const dateInput = component.querySelector('[data-search-date]');

      if (dateInput) {
        const placeholderText = dateInput.getAttribute('data-placeholder') || dateInput.getAttribute('placeholder') || 'dd/mm/yyyy';
        const placeholderColor = 'var(--muted-color, #999)';
        const activeColor = 'var(--gray-color)';

        const applyPlaceholder = () => {
          dateInput.value = placeholderText;
          dateInput.style.color = placeholderColor;
          dateInput.dataset.placeholderActive = 'true';
        };

        const activateValue = () => {
          dateInput.style.color = activeColor;
          dateInput.dataset.placeholderActive = 'false';
        };

        if (typeof flatpickr === 'function') {
          flatpickr(dateInput, {
            dateFormat: 'd/m/Y',
            monthSelectorType: 'dropdown',
            onReady(selectedDates, dateStr, instance) {
              if (!instance.input.value) {
                applyPlaceholder();
              } else {
                activateValue();
              }
            },
            onChange(selectedDates, dateStr, instance) {
              activateValue();
            },
            onClose(selectedDates, dateStr, instance) {
              if (!instance.input.value) {
                applyPlaceholder();
              }
            },
          });
        } else {
          if (!dateInput.value) {
            applyPlaceholder();
          } else {
            activateValue();
          }

          dateInput.addEventListener('input', () => {
            if (dateInput.value) {
              activateValue();
            } else {
              applyPlaceholder();
            }
          });
        }
      }

      const submitButton = component.querySelector('[data-search-submit]');
      if (submitButton) {
        submitButton.addEventListener('click', (event) => {
          event.preventDefault();

          const detail = {
            ...collectSearchValues(component),
            component,
          };
          const searchEvent = new CustomEvent('search:submit', {
            bubbles: true,
            cancelable: true,
            detail,
          });

          const shouldProceed = component.dispatchEvent(searchEvent);

          if (shouldProceed && defaultAction === 'navigate') {
            window.location.href = navigateTo;
          }
        });
      }

      component.dispatchEvent(new CustomEvent('search:ready', { bubbles: true, detail: { component } }));
    });
  }

  async function initSharedLayout() {
    await injectFragments();
    setupHeaderAndMobileMenu();
    initializeSearchComponents();
    document.dispatchEvent(new CustomEvent('fragments:loaded'));
  }

  document.addEventListener('search:init', (event) => {
    const context = event && event.detail && event.detail.context;
    if (context instanceof Element || context instanceof Document || context instanceof DocumentFragment) {
      initializeSearchComponents(context);
    } else {
      initializeSearchComponents();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    initSharedLayout().catch((error) => {
      console.error('[include] Initialization failed:', error);
    });
  });
})();
