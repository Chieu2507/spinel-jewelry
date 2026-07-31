if (!window.SpinelHeaderMenus) {
  window.SpinelHeaderMenus = true;
  const megaMenuAnimations = new WeakMap();
  const megaMenuHoverTimers = new WeakMap();
  const cartFeedbackHeaderStates = new WeakMap();
  let transparentHeaderFrame = 0;
  let scrollAwareFrame = 0;
  let lastScrollY = window.scrollY;

  const setTransparentHeaderColorScheme = (header, showSurface) => {
    const defaultColorClass = header.dataset.defaultColorClass;
    const transparentColorClass = header.dataset.transparentColorClass;
    if (defaultColorClass) header.classList.remove(defaultColorClass);
    if (transparentColorClass) header.classList.remove(transparentColorClass);
    const activeColorClass = showSurface ? defaultColorClass : transparentColorClass;
    if (activeColorClass) header.classList.add(activeColorClass);
  };

  const syncTransparentHeader = (header) => {
    if (header.dataset.transparentHeader !== 'true') return;

    const sectionWrapper = header.parentElement;
    const origin = sectionWrapper
      ? sectionWrapper.getBoundingClientRect().top + window.scrollY
      : header.getBoundingClientRect().top + window.scrollY;
    const isScrolled = window.scrollY > origin + 1;
    const hasOpenMenu = Boolean(header.querySelector('details[open]'));
    const showSurface = isScrolled || hasOpenMenu;
    header.classList.toggle('header--scrolled', isScrolled);
    header.classList.toggle('header--surface-visible', showSurface);
    setTransparentHeaderColorScheme(header, showSurface);
  };

  const syncTransparentHeaders = () => {
    transparentHeaderFrame = 0;
    document.querySelectorAll('[data-transparent-header="true"]').forEach(syncTransparentHeader);
  };

  const scheduleTransparentHeaderSync = () => {
    if (transparentHeaderFrame) return;
    transparentHeaderFrame = window.requestAnimationFrame(syncTransparentHeaders);
  };

  const initializeTransparentHeaders = (scope = document) => {
    scope.querySelectorAll?.('[data-transparent-header="true"]').forEach((header) => {
      syncTransparentHeader(header);
    });
  };

  initializeTransparentHeaders();
  window.addEventListener('scroll', scheduleTransparentHeaderSync, { passive: true });
  window.addEventListener('resize', scheduleTransparentHeaderSync);
  document.addEventListener('shopify:section:load', (event) => initializeTransparentHeaders(event.target));

  const syncScrollAwareHeaders = () => {
    scrollAwareFrame = 0;
    const currentScrollY = Math.max(0, window.scrollY);
    const delta = currentScrollY - lastScrollY;
    if (Math.abs(delta) < 8) return;
    document.querySelectorAll('[data-scroll-aware="true"]').forEach((header) => {
      const hasOpenMenu = Boolean(header.querySelector('details[open]'));
      if (currentScrollY <= 8 || delta < 0 || hasOpenMenu) {
        header.classList.remove('header--scroll-hidden');
      } else {
        header.classList.add('header--scroll-hidden');
      }
    });
    lastScrollY = currentScrollY;
  };

  const scheduleScrollAwareHeaderSync = () => {
    if (scrollAwareFrame) return;
    scrollAwareFrame = window.requestAnimationFrame(syncScrollAwareHeaders);
  };

  window.addEventListener('scroll', scheduleScrollAwareHeaderSync, { passive: true });
  window.addEventListener('resize', scheduleScrollAwareHeaderSync);
  document.addEventListener('shopify:section:load', scheduleScrollAwareHeaderSync);

  const revealHeaderForCartFeedback = (duration = 2200) => {
    document.querySelectorAll('[data-header]').forEach((header) => {
      const existingState = cartFeedbackHeaderStates.get(header);
      window.clearTimeout(existingState?.timer);

      const sectionWrapper = header.parentElement;
      const previousMinHeight = existingState?.previousMinHeight ?? sectionWrapper?.style.minHeight ?? '';
      if (sectionWrapper) {
        sectionWrapper.style.minHeight = `${Math.ceil(header.getBoundingClientRect().height)}px`;
      }

      header.classList.add('header--cart-feedback-visible');
      if (header.dataset.transparentHeader === 'true') {
        header.classList.add('header--surface-visible');
        setTransparentHeaderColorScheme(header, true);
      }

      const timer = window.setTimeout(() => {
        header.classList.remove('header--cart-feedback-visible');
        if (sectionWrapper) sectionWrapper.style.minHeight = previousMinHeight;
        if (header.dataset.transparentHeader === 'true') syncTransparentHeader(header);
        cartFeedbackHeaderStates.delete(header);
      }, duration);
      cartFeedbackHeaderStates.set(header, { timer, previousMinHeight });
    });
  };

  document.addEventListener('header:reveal-for-cart-feedback', (event) => {
    revealHeaderForCartFeedback(Math.max(0, Number.parseInt(event.detail?.duration, 10) || 2200));
  });

  document.addEventListener('cart:add:success', (event) => {
    if (!event.detail?.button?.closest('[data-product-card]')) return;
    revealHeaderForCartFeedback();
  });

  document.addEventListener('product:add:success', (event) => {
    if (!event.detail?.button?.matches('[data-sticky-cart-add]')) return;
    revealHeaderForCartFeedback();
  });

  const getMegaMenuAnimation = (details) => {
    const header = details.closest('[data-header]');
    const panel = details.querySelector('.header__mega-panel');
    const type = header?.dataset.megaMenuAnimation || 'slide_down';
    const duration = Number.parseInt(header?.dataset.megaMenuAnimationDuration || '250', 10);
    return { panel, type, duration };
  };

  const getMegaMenuFrames = (type, opening) => {
    let frames;

    if (type === 'fade') {
      frames = [{ opacity: 0 }, { opacity: 1 }];
    } else if (type === 'scale') {
      frames = [{ opacity: 0, scale: '0.98' }, { opacity: 1, scale: '1' }];
    } else {
      frames = [{ opacity: 0, translate: '0 -12px' }, { opacity: 1, translate: '0 0' }];
    }

    return opening ? frames : frames.slice().reverse();
  };

  const animateMegaMenuOpen = (details) => {
    const { panel, type, duration } = getMegaMenuAnimation(details);
    if (!panel || type === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    megaMenuAnimations.get(details)?.cancel();
    const animation = panel.animate(getMegaMenuFrames(type, true), {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both'
    });
    megaMenuAnimations.set(details, animation);
    animation.finished
      .then(() => {
        if (megaMenuAnimations.get(details) !== animation) return;
        megaMenuAnimations.delete(details);
        animation.cancel();
      })
      .catch(() => {});
  };

  const closeMegaMenu = (details, immediate = false) => {
    if (!details.open || details.dataset.closing === 'true') return;

    const { panel, type, duration } = getMegaMenuAnimation(details);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    megaMenuAnimations.get(details)?.cancel();

    if (immediate || !panel || type === 'none' || reduceMotion) {
      megaMenuAnimations.delete(details);
      details.open = false;
      return;
    }

    details.dataset.closing = 'true';
    const animation = panel.animate(getMegaMenuFrames(type, false), {
      duration: Math.max(100, Math.round(duration * 0.8)),
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'both'
    });
    megaMenuAnimations.set(details, animation);
    animation.finished
      .then(() => {
        if (megaMenuAnimations.get(details) !== animation) return;
        megaMenuAnimations.delete(details);
        delete details.dataset.closing;
        details.open = false;
        animation.cancel();
      })
      .catch(() => {});
  };

  const supportsMegaMenuHover = () => window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;

  const clearMegaMenuHoverTimer = (details) => {
    const timer = megaMenuHoverTimers.get(details);
    if (timer) window.clearTimeout(timer);
    megaMenuHoverTimers.delete(details);
  };

  document.addEventListener('pointerover', (event) => {
    if (!supportsMegaMenuHover()) return;
    const details = event.target.closest?.('.header__submenu-disclosure--mega.header__submenu-disclosure--hover');
    if (!details || details.contains(event.relatedTarget)) return;

    clearMegaMenuHoverTimer(details);
    details.open = true;
  });

  document.addEventListener('pointerout', (event) => {
    if (!supportsMegaMenuHover()) return;
    const details = event.target.closest?.('.header__submenu-disclosure--mega.header__submenu-disclosure--hover');
    if (!details || details.contains(event.relatedTarget)) return;

    clearMegaMenuHoverTimer(details);
    megaMenuHoverTimers.set(details, window.setTimeout(() => closeMegaMenu(details), 160));
  });

  document.addEventListener(
    'toggle',
    (event) => {
      const details = event.target;
      if (details.matches?.('.header__menu-disclosure')) {
        const toggle = details.querySelector(':scope > .header__menu-toggle');
        if (toggle) toggle.setAttribute('aria-label', details.open ? details.dataset.closeLabel : details.dataset.openLabel);
      }

      if (details.closest?.('[data-transparent-header="true"]')) scheduleTransparentHeaderSync();

      if (!details.matches?.('.header__submenu-disclosure[open]')) return;

      const header = details.closest('[data-header]');
      header?.querySelectorAll('.header__submenu-disclosure[open]').forEach((menu) => {
        if (menu !== details && menu.matches('.header__submenu-disclosure--mega')) {
          closeMegaMenu(menu);
        } else if (menu !== details) {
          menu.open = false;
        }
      });

      if (details.matches('.header__submenu-disclosure--mega')) animateMegaMenuOpen(details);
    },
    true
  );

  document.addEventListener('click', (event) => {
    const summary = event.target.closest?.('summary');
    const megaMenu = summary?.parentElement;
    if (megaMenu?.matches('.header__submenu-disclosure--mega.header__submenu-disclosure--hover') && supportsMegaMenuHover()) {
      event.preventDefault();
      return;
    }
    if (megaMenu?.matches('.header__submenu-disclosure--mega[open]')) {
      event.preventDefault();
      closeMegaMenu(megaMenu);
      return;
    }

    document.querySelectorAll('[data-header]').forEach((header) => {
      if (header.contains(event.target)) return;
      header.querySelectorAll('details[open]').forEach((details) => {
        if (details.matches('.header__submenu-disclosure--mega')) {
          closeMegaMenu(details);
        } else {
          details.open = false;
        }
      });
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-header] details[open]').forEach((details) => {
      if (details.matches('.header__submenu-disclosure--mega')) {
        closeMegaMenu(details);
      } else {
        details.open = false;
      }
    });
  });

  document.addEventListener('click', (event) => {
    const option = event.target.closest?.('[data-header-country-option]');
    if (!option) return;

    const picker = option.closest('[data-header-country-picker]');
    const input = picker?.querySelector('[data-header-country-input]');
    if (!input) return;

    input.value = option.dataset.countryCode;
    option.closest('form')?.submit();
  });

  document.addEventListener('shopify:block:select', (event) => {
    const details = event.target.closest?.('.header__submenu-disclosure');
    if (!details) return;

    const header = details.closest('[data-header]');
    const mobileDrawer = header?.querySelector('.header__menu-disclosure');
    details.open = true;
    if (mobileDrawer && window.matchMedia('(max-width: 899px)').matches) mobileDrawer.open = true;
  });

  const headerSearchReturnFocus = new WeakMap();
  const headerSearchRequests = new WeakMap();
  const headerSearchTimers = new WeakMap();

  const syncHeaderSearchClearButton = (input) => {
    const clearButton = input.closest('[data-header-search-form]')?.querySelector('[data-header-search-clear]');
    if (clearButton) clearButton.hidden = input.value.length === 0;
  };

  const createHeaderSearchLink = (label, url, className) => {
    const link = document.createElement('a');
    link.className = className;
    link.href = url;
    if (label) link.textContent = label;
    return link;
  };

  const formatHeaderSearchPrice = (price, currencyCode) => {
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice)) return price || '';
    return new Intl.NumberFormat(document.documentElement.lang || undefined, {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(numericPrice);
  };

  const renderHeaderSearchProducts = (panel, products) => {
    panel.replaceChildren();
    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'header-search-modal__empty';
      empty.textContent = 'No products found.';
      panel.append(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'header-search-modal__product-grid';
    products.slice(0, 6).forEach((product) => {
      const card = createHeaderSearchLink('', product.url, 'header-search-modal__product');
      if (product.image) {
        const image = document.createElement('img');
        image.className = 'header-search-modal__product-image';
        image.src = product.image;
        image.alt = product.image_alt || product.title;
        image.loading = 'lazy';
        card.append(image);
      }
      const title = document.createElement('span');
      title.className = 'header-search-modal__product-title';
      title.textContent = product.title;
      card.append(title);
      if (product.price !== undefined && product.price !== null) {
        const price = document.createElement('span');
        price.className = 'header-search-modal__product-price';
        price.textContent = formatHeaderSearchPrice(product.price, panel.closest('[data-header-search-modal]')?.dataset.currencyCode);
        card.append(price);
      }
      grid.append(card);
    });
    panel.append(grid);
  };

  const renderHeaderSearchCollections = (panel, collections) => {
    panel.replaceChildren();
    if (!collections.length) return;

    const grid = document.createElement('div');
    grid.className = 'header-search-modal__collection-grid';
    collections.slice(0, 6).forEach((collection) => {
      const card = createHeaderSearchLink('', collection.url, 'header-search-modal__collection');
      if (collection.image) {
        const image = document.createElement('img');
        image.className = 'header-search-modal__collection-image';
        image.src = collection.image;
        image.alt = collection.image_alt || collection.title;
        image.loading = 'lazy';
        card.append(image);
      }
      const title = document.createElement('span');
      title.className = 'header-search-modal__collection-title';
      title.textContent = collection.title;
      card.append(title);
      const productCount = collection.product_count || collection.products_count;
      if (productCount !== undefined) {
        const count = document.createElement('span');
        count.className = 'header-search-modal__collection-count';
        count.textContent = `${productCount} ${Number(productCount) === 1 ? 'Product' : 'Products'}`;
        card.append(count);
      }
      grid.append(card);
    });
    panel.append(grid);
  };

  const setHeaderSearchTab = (dialog, tabName) => {
    dialog.querySelectorAll('[data-header-search-tab]').forEach((tab) => {
      const isActive = tab.dataset.headerSearchTab === tabName;
      tab.setAttribute('aria-selected', String(!tab.hidden && isActive));
    });
    dialog.querySelectorAll('[data-header-search-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.headerSearchPanel !== tabName;
    });
  };

  const clearHeaderPredictiveSearch = (dialog) => {
    headerSearchRequests.get(dialog)?.abort();
    window.clearTimeout(headerSearchTimers.get(dialog));
    dialog.querySelector('[data-header-search-predictive]')?.setAttribute('hidden', '');
    dialog.querySelector('[data-header-search-navigation]')?.removeAttribute('hidden');
  };

  const requestHeaderPredictiveSearch = (input) => {
    const dialog = input.closest('[data-header-search-modal]');
    const term = input.value.trim();
    if (!dialog) return;

    if (term.length < 2) {
      clearHeaderPredictiveSearch(dialog);
      return;
    }

    window.clearTimeout(headerSearchTimers.get(dialog));
    headerSearchTimers.set(dialog, window.setTimeout(async () => {
      headerSearchRequests.get(dialog)?.abort();
      const controller = new AbortController();
      headerSearchRequests.set(dialog, controller);

      try {
        const endpoint = new URL(dialog.dataset.predictiveSearchUrl, window.location.origin);
        endpoint.searchParams.set('q', term);
        endpoint.searchParams.set('resources[type]', 'product,collection');
        endpoint.searchParams.set('resources[limit]', '6');
        endpoint.searchParams.set('resources[limit_scope]', 'each');
        endpoint.searchParams.set('resources[options][unavailable_products]', 'hide');
        const collectionEndpoint = new URL(endpoint);
        collectionEndpoint.searchParams.set('resources[type]', 'collection');
        collectionEndpoint.searchParams.set('resources[limit]', '6');
        collectionEndpoint.searchParams.delete('resources[limit_scope]');
        const [response, collectionResponse] = await Promise.all([
          fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(collectionEndpoint, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        ]);
        if (!response.ok || !collectionResponse.ok) throw new Error('Predictive search request failed');
        const [payload, collectionPayload] = await Promise.all([response.json(), collectionResponse.json()]);
        if (input.value.trim() !== term) return;

        const resources = payload.resources?.results || {};
        const products = resources.products || [];
        const collections = collectionPayload.resources?.results?.collections || resources.collections || [];
        renderHeaderSearchProducts(dialog.querySelector('[data-header-search-panel="products"]'), products);
        renderHeaderSearchCollections(dialog.querySelector('[data-header-search-panel="collections"]'), collections);

        const productsTab = dialog.querySelector('[data-header-search-tab="products"]');
        const collectionsTab = dialog.querySelector('[data-header-search-tab="collections"]');
        const tabs = dialog.querySelector('.header-search-modal__tabs');
        const empty = dialog.querySelector('[data-header-search-empty]');
        productsTab.hidden = products.length === 0;
        collectionsTab.hidden = collections.length === 0;
        tabs.hidden = products.length === 0 && collections.length === 0;
        empty.hidden = products.length > 0 || collections.length > 0;
        if (products.length > 0) setHeaderSearchTab(dialog, 'products');
        else if (collections.length > 0) setHeaderSearchTab(dialog, 'collections');
        else {
          empty.textContent = `No results found for “${term}”. Check the spelling or use a different word or phrase.`;
          dialog.querySelectorAll('[data-header-search-panel]').forEach((panel) => { panel.hidden = true; });
        }

        const viewAll = dialog.querySelector('[data-header-search-view-all]');
        if (viewAll) {
          const allResultsUrl = new URL(input.closest('form').action, window.location.origin);
          allResultsUrl.searchParams.set('q', term);
          viewAll.href = allResultsUrl.toString();
        }
        dialog.querySelector('[data-header-search-navigation]')?.setAttribute('hidden', '');
        dialog.querySelector('[data-header-search-predictive]')?.removeAttribute('hidden');
      } catch (error) {
        if (error.name !== 'AbortError') clearHeaderPredictiveSearch(dialog);
      }
    }, 180));
  };

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest?.('[data-header-search-open]');
    if (openButton) {
      const dialogId = openButton.getAttribute('aria-controls');
      const dialog = dialogId ? document.getElementById(dialogId) : null;
      if (!dialog || dialog.open) return;

      event.preventDefault();
      headerSearchReturnFocus.set(dialog, openButton);
      dialog.showModal();
      window.requestAnimationFrame(() => {
        const input = dialog.querySelector('[data-header-search-input]');
        input?.focus();
        if (input) syncHeaderSearchClearButton(input);
      });
      return;
    }

    const closeButton = event.target.closest?.('[data-header-search-close]');
    if (closeButton) closeButton.closest('[data-header-search-modal]')?.close();

    const clearButton = event.target.closest?.('[data-header-search-clear]');
    if (clearButton) {
      const input = clearButton.closest('[data-header-search-form]')?.querySelector('[data-header-search-input]');
      if (input) {
        input.value = '';
        syncHeaderSearchClearButton(input);
        clearHeaderPredictiveSearch(clearButton.closest('[data-header-search-modal]'));
        input.focus();
      }
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest?.('[data-header-search-input]');
    if (input) {
      syncHeaderSearchClearButton(input);
      requestHeaderPredictiveSearch(input);
    }
  });

  document.addEventListener('click', (event) => {
    const tab = event.target.closest?.('[data-header-search-tab]');
    if (tab) setHeaderSearchTab(tab.closest('[data-header-search-modal]'), tab.dataset.headerSearchTab);
  });

  document.addEventListener('click', (event) => {
    const dialog = event.target.closest?.('[data-header-search-modal]');
    if (dialog && event.target === dialog) dialog.close();
  });

  document.addEventListener('close', (event) => {
    const dialog = event.target;
    if (!dialog.matches?.('[data-header-search-modal]')) return;
    clearHeaderPredictiveSearch(dialog);
    headerSearchReturnFocus.get(dialog)?.focus();
    headerSearchReturnFocus.delete(dialog);
  }, true);
}
