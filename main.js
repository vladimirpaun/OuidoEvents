(function () {
  const INCLUDE_ATTR = 'data-include';
  const fragmentCache = new Map();
  const ROLE_STORAGE_KEY = 'userRole';
  const DEV_MODE_KEY = 'devMode';
  const VALID_ROLES = new Set(['admin', 'owner', 'client', 'guest']);
  const DEFAULT_ROLE = 'guest';
  const REPLACE_WRAPPER_REGEX = /(?:^|\/)(header|mobile-menu)\.html$/i;
  const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dateFieldState = new WeakMap();

  function createEventBus() {
    const registry = new Map();

    const getListeners = (eventName) => {
      if (!registry.has(eventName)) {
        registry.set(eventName, new Set());
      }
      return registry.get(eventName);
    };

    return {
      on(eventName, handler) {
        if (typeof eventName !== 'string' || !eventName || typeof handler !== 'function') {
          return () => {};
        }
        const listeners = getListeners(eventName);
        listeners.add(handler);
        return () => listeners.delete(handler);
      },
      off(eventName, handler) {
        if (!registry.has(eventName)) {
          return;
        }
        if (typeof handler === 'function') {
          registry.get(eventName).delete(handler);
        } else {
          registry.get(eventName).clear();
        }
      },
      emit(eventName, payload) {
        if (!registry.has(eventName)) {
          return;
        }
        registry.get(eventName).forEach((listener) => {
          try {
            listener(payload);
          } catch (error) {
            console.error(`[ouidoBus] listener for "${eventName}" failed:`, error);
          }
        });
      },
    };
  }

  const ouidoBus =
    typeof window !== 'undefined' &&
    window.ouidoBus &&
    typeof window.ouidoBus.emit === 'function'
      ? window.ouidoBus
      : createEventBus();

  if (typeof window !== 'undefined' && window.ouidoBus !== ouidoBus) {
    window.ouidoBus = ouidoBus;
  }

  const scheduleMicrotask =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (callback) => Promise.resolve().then(callback);

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

  async function injectFragments(root = document) {
    const processTargets = async (targets) => {
      await Promise.all(
        targets.map(async (target) => {
          if (!target || target.dataset.includeStatus === 'loaded') {
            return;
          }

          const url = target.getAttribute(INCLUDE_ATTR);

          if (!url) {
            target.dataset.includeStatus = 'loaded';
            target.removeAttribute(INCLUDE_ATTR);
            return;
          }

          if (target.dataset.includeStatus === 'loading') {
            return;
          }

          target.dataset.includeStatus = 'loading';

          const html = await fetchFragment(url);
          const template = document.createElement('template');
          template.innerHTML = typeof html === 'string' ? html : '';
          const fragment = template.content.cloneNode(true);
          const normalizedUrl = (url || '').split(/[?#]/)[0];
          const shouldReplaceWrapper = REPLACE_WRAPPER_REGEX.test(normalizedUrl);

          target.dataset.includeStatus = 'loaded';
          target.removeAttribute(INCLUDE_ATTR);

          if (shouldReplaceWrapper) {
            target.replaceWith(fragment);
          } else {
            target.innerHTML = '';
            target.appendChild(fragment);
          }
        })
      );
    };

    let pending = Array.from(root.querySelectorAll(`[${INCLUDE_ATTR}]`));

    while (pending.length) {
      await processTargets(pending);
      pending = Array.from(root.querySelectorAll(`[${INCLUDE_ATTR}]`)).filter(
        (node) => node.dataset.includeStatus !== 'loaded'
      );
    }
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
      if (isActive) {
        anchor.setAttribute('aria-current', 'page');
      } else {
        anchor.removeAttribute('aria-current');
      }
    });
  }

  function normalizeRole(role) {
    return VALID_ROLES.has(role) ? role : DEFAULT_ROLE;
  }

  function getStoredRole() {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    return normalizeRole(stored);
  }

  function setStoredRole(role) {
    const normalized = normalizeRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY, normalized);
    return normalized;
  }

  function isDevModeEnabled() {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  }

  function applyRoleVisibility(scope, role) {
    if (!scope) {
      return;
    }

    const elements = scope.querySelectorAll('[data-visible-roles]');
    elements.forEach((element) => {
      const rolesAttr = element.getAttribute('data-visible-roles') || '';
      const allowedRoles = rolesAttr
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      const isVisible = !allowedRoles.length || allowedRoles.includes(role);

      if (isVisible) {
        element.removeAttribute('hidden');
        element.removeAttribute('aria-hidden');
      } else if (element instanceof HTMLElement) {
        element.setAttribute('hidden', '');
        element.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function toggleRoleSwitcherVisibility(scope, isDevMode) {
    if (!scope) {
      return;
    }

    const switchers = scope.querySelectorAll('[data-role-switcher]');
    switchers.forEach((switcher) => {
      if (isDevMode) {
        switcher.removeAttribute('hidden');
        switcher.removeAttribute('aria-hidden');
      } else {
        switcher.setAttribute('hidden', '');
        switcher.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function syncRoleSwitcherSelections(scope, role) {
    if (!scope) {
      return;
    }

    scope.querySelectorAll('[data-role-switcher] select').forEach((select) => {
      if (select.value !== role) {
        select.value = role;
      }
    });
  }

  function setupRoleSwitcher(scope, onRoleChange) {
    if (!scope) {
      return;
    }

    const selects = scope.querySelectorAll('[data-role-switcher] select');
    selects.forEach((select) => {
      if (select.dataset.roleReady === 'true') {
        return;
      }

      select.dataset.roleReady = 'true';
      select.addEventListener('change', (event) => {
        const nextRole = event.target.value;
        if (!VALID_ROLES.has(nextRole)) {
          return;
        }

        if (typeof onRoleChange === 'function') {
          onRoleChange(nextRole);
        }
      });
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

    const roleSwitchers = mobileNav.querySelectorAll('[data-role-switcher]');
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

  function parseDisplayDateToISO(value) {
    if (!value) {
      return '';
    }

    const match = value
      .trim()
      .match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/);

    if (!match) {
      return '';
    }

    const [, day, month, year] = match;
    const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return ISO_DATE_PATTERN.test(iso) ? iso : '';
  }

  function formatISOToDisplay(isoDate) {
    if (!ISO_DATE_PATTERN.test(isoDate)) {
      return '';
    }

    const [, year, month, day] = isoDate.match(ISO_DATE_PATTERN);
    return `${day}/${month}/${year}`;
  }

  function initializeDateInput(dateInput) {
    if (!dateInput) {
      return null;
    }

    if (dateFieldState.has(dateInput)) {
      return dateFieldState.get(dateInput);
    }

    const placeholderText =
      dateInput.getAttribute('data-placeholder') ||
      dateInput.getAttribute('placeholder') ||
      'dd/mm/yyyy';
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

    const setDisplayValue = (displayValue) => {
      if (!displayValue) {
        applyPlaceholder();
        return;
      }

      dateInput.value = displayValue;
      activateValue();
    };

    if (typeof flatpickr === 'function' && !dateInput._flatpickr) {
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
        onChange() {
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

    const state = {
      applyPlaceholder,
      activateValue,
      setDisplayValue,
      setISOValue(isoValue) {
        if (isoValue && ISO_DATE_PATTERN.test(isoValue)) {
          if (dateInput._flatpickr) {
            dateInput._flatpickr.setDate(isoValue, true, 'Y-m-d');
            activateValue();
          } else {
            setDisplayValue(formatISOToDisplay(isoValue));
          }
        } else {
          if (dateInput._flatpickr) {
            dateInput._flatpickr.clear();
          }
          applyPlaceholder();
        }
      },
      getISOValue() {
        if (dateInput.dataset.placeholderActive === 'true') {
          return '';
        }

        if (dateInput._flatpickr) {
          const selected =
            dateInput._flatpickr.selectedDates &&
            dateInput._flatpickr.selectedDates[0];
          if (selected instanceof Date && !Number.isNaN(selected.getTime())) {
            const year = String(selected.getFullYear()).padStart(4, '0');
            const month = String(selected.getMonth() + 1).padStart(2, '0');
            const day = String(selected.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }

        return parseDisplayDateToISO(dateInput.value);
      },
    };

    dateFieldState.set(dateInput, state);
    return state;
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

    const updateDevModeVisibility = () => {
      const devMode = isDevModeEnabled();
      toggleRoleSwitcherVisibility(header, devMode);
      if (mobileNav) {
        toggleRoleSwitcherVisibility(mobileNav, devMode);
      }
    };

    const updateRoleDependentUI = () => {
      const role = setStoredRole(getStoredRole());
      applyRoleVisibility(header, role);
      if (mobileNav) {
        applyRoleVisibility(mobileNav, role);
      }
      syncRoleSwitcherSelections(header, role);
      if (mobileNav) {
        syncRoleSwitcherSelections(mobileNav, role);
      }
      header.setAttribute('data-user-role', role);
      highlightActiveLinks(header);
      if (mobileNav) {
        highlightActiveLinks(mobileNav);
      }
    };

    const handleRoleChange = (nextRole) => {
      const normalized = setStoredRole(nextRole);
      updateRoleDependentUI();
      document.dispatchEvent(
        new CustomEvent('role:change', {
          detail: { role: normalized },
        })
      );
      ouidoBus.emit('role:change', { role: normalized });
    };

    setupRoleSwitcher(header, handleRoleChange);
    if (mobileNav) {
      setupRoleSwitcher(mobileNav, handleRoleChange);
    }

    updateRoleDependentUI();
    updateDevModeVisibility();

    window.addEventListener('storage', (event) => {
      if (event.key === ROLE_STORAGE_KEY) {
        updateRoleDependentUI();
      }

      if (event.key === DEV_MODE_KEY) {
        updateDevModeVisibility();
      }
    });

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
    const dateState = initializeDateInput(dateInput);

    return {
      type: eventType ? eventType.value : '',
      city: locationInput ? locationInput.value.trim() : '',
      date: dateState ? dateState.getISOValue() : '',
      guests: guests ? guests.value : '',
    };
  }

  function readSearchParams(source) {
    let params;
    if (source instanceof URLSearchParams) {
      params = source;
    } else if (typeof source === 'string') {
      const trimmed = source.trim();
      const query = trimmed ? (trimmed.startsWith('?') ? trimmed : `?${trimmed}`) : '';
      params = new URLSearchParams(query);
    } else if (source && typeof source === 'object' && typeof source.search === 'string') {
      params = new URLSearchParams(source.search);
    } else {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      params = new URLSearchParams(search);
    }

    const result = {
      type: '',
      city: '',
      date: '',
      guests: '',
    };

    const type = params.get('type');
    if (typeof type === 'string' && type) {
      result.type = type;
    }

    const city = params.get('city');
    if (typeof city === 'string' && city) {
      result.city = city;
    }

    const date = params.get('date');
    if (typeof date === 'string' && ISO_DATE_PATTERN.test(date)) {
      result.date = date;
    }

    const guests = params.get('guests');
    if (typeof guests === 'string' && guests) {
      result.guests = guests;
    }

    return result;
  }

  function prefillSearchBox(component, params = null) {
    if (!component) {
      return;
    }

    const resolved =
      params && typeof params === 'object' ? params : readSearchParams();

    if (!resolved || typeof resolved !== 'object') {
      return;
    }

    const paramsObject =
      resolved instanceof URLSearchParams
        ? Object.fromEntries(resolved.entries())
        : resolved;

    const hasProp = (key) => Object.prototype.hasOwnProperty.call(paramsObject, key);

    const typeSelect = component.querySelector('#event-type');
    if (typeSelect && hasProp('type')) {
      const typeValue = typeof paramsObject.type === 'string' ? paramsObject.type : '';
      if (typeValue) {
        const optionExists = Array.from(typeSelect.options).some(
          (option) => option.value === typeValue
        );
        if (optionExists) {
          typeSelect.value = typeValue;
        }
      }
    }

    const locationInput = component.querySelector('#location');
    if (locationInput && hasProp('city')) {
      const cityValue = typeof paramsObject.city === 'string' ? paramsObject.city : '';
      locationInput.value = cityValue;
    }

    const guestsSelect = component.querySelector('#guests');
    if (guestsSelect && hasProp('guests')) {
      const guestsValue =
        typeof paramsObject.guests === 'string' ? paramsObject.guests : '';
      if (guestsValue) {
        const optionExists = Array.from(guestsSelect.options).some(
          (option) => option.value === guestsValue
        );
        if (optionExists) {
          guestsSelect.value = guestsValue;
        }
      }
    }

    const dateInput = component.querySelector('[data-search-date]');
    if (dateInput && hasProp('date')) {
      const dateState = initializeDateInput(dateInput);
      if (dateState) {
        const isoDate = typeof paramsObject.date === 'string' ? paramsObject.date : '';
        dateState.setISOValue(isoDate && ISO_DATE_PATTERN.test(isoDate) ? isoDate : '');
      }
    }
  }

  function initializeSearchComponents(context = document) {
    const components = context.querySelectorAll('[data-search-box]');
    if (!components.length) {
      return;
    }

    const sharedParams = readSearchParams();

    components.forEach((component) => {
      if (component.dataset.searchReady === 'true') {
        return;
      }

      const { defaultAction, navigateTo } = getSearchComponentConfig(component);
      const dateInput = component.querySelector('[data-search-date]');
      initializeDateInput(dateInput);

      const submitHandler = (event) => {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }

        const values = collectSearchValues(component);
        const searchEvent = new CustomEvent('search:submit', {
          bubbles: true,
          cancelable: true,
          detail: values,
        });

        const shouldProceed = component.dispatchEvent(searchEvent);
        const cancelled = shouldProceed === false;
        ouidoBus.emit('search:submit', {
          component,
          values,
          cancelled,
          defaultAction,
          navigateTo,
        });

        if (cancelled) {
          return;
        }

        if (defaultAction === 'navigate') {
          const params = new URLSearchParams();
          if (values.type) {
            params.set('type', values.type);
          }
          if (values.city) {
            params.set('city', values.city);
          }
          if (values.date) {
            params.set('date', values.date);
          }
          if (values.guests) {
            params.set('guests', values.guests);
          }

          const query = params.toString();
          const destination = query ? `${navigateTo}?${query}` : navigateTo;
          window.location.href = destination;
        }
      };

      const submitButton = component.querySelector('[data-search-submit]');
      if (submitButton && submitButton.dataset.searchSubmitReady !== 'true') {
        submitButton.dataset.searchSubmitReady = 'true';
        submitButton.addEventListener('click', submitHandler);
      }

      if (component instanceof HTMLFormElement && component.dataset.searchFormReady !== 'true') {
        component.dataset.searchFormReady = 'true';
        component.addEventListener('submit', submitHandler);
      }

      prefillSearchBox(component, sharedParams);

      component.dataset.searchReady = 'true';
      const readyDetail = {
        component,
        values: collectSearchValues(component),
        defaultAction,
        navigateTo,
      };
      component.dispatchEvent(
        new CustomEvent('search:ready', { bubbles: true, detail: readyDetail })
      );
      ouidoBus.emit('search:ready', readyDetail);
    });
  }

  async function initSharedLayout() {
    await injectFragments();
    setupHeaderAndMobileMenu();
    const detail = { root: document };
    const readyEvent = new CustomEvent('fragments:ready', { detail });
    document.dispatchEvent(readyEvent);
    ouidoBus.emit('fragments:ready', detail);

    scheduleMicrotask(() => {
      initializeSearchComponents();
      const loadedDetail = { root: document };
      const loadedEvent = new CustomEvent('fragments:loaded', { detail: loadedDetail });
      document.dispatchEvent(loadedEvent);
      ouidoBus.emit('fragments:loaded', loadedDetail);
    });
  }

  if (typeof window !== 'undefined') {
    if (typeof window.readSearchParams !== 'function') {
      Object.defineProperty(window, 'readSearchParams', {
        value: readSearchParams,
        configurable: true,
        writable: true,
      });
    }

    if (typeof window.prefillSearchBox !== 'function') {
      Object.defineProperty(window, 'prefillSearchBox', {
        value: prefillSearchBox,
        configurable: true,
        writable: true,
      });
    }
  }

  const handleSearchInit = (payload) => {
    const context = payload && payload.context;
    if (context instanceof Element || context instanceof Document || context instanceof DocumentFragment) {
      initializeSearchComponents(context);
    } else {
      initializeSearchComponents();
    }
  };

  document.addEventListener('search:init', (event) => {
    handleSearchInit(event && event.detail);
  });

  ouidoBus.on('search:init', handleSearchInit);

  document.addEventListener('DOMContentLoaded', () => {
    initSharedLayout().catch((error) => {
      console.error('[include] Initialization failed:', error);
    });
  });
})();
