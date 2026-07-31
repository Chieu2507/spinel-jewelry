(() => {
  if (window.SpinelSmoothScroll) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopViewport = window.matchMedia('(min-width: 768px)');
  const scrollableOverflow = /^(auto|scroll|overlay)$/;
  const nativeScrollSelector = 'dialog, [data-scrollable], .drawer, .modal, [role="dialog"], .search__form, [scroll-lock], [data-smooth-scroll-native], input, textarea, select, option, [contenteditable="true"]';
  const lerp = 0.25;
  const dampingRate = 60 * lerp;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('android');
  let destination = window.scrollY;
  let renderedPosition = window.scrollY;
  let isAnimating = false;
  let lastFrameTime = window.performance.now();

  const getMaximumScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const cancel = () => {
    isAnimating = false;
    destination = window.scrollY;
    renderedPosition = window.scrollY;
  };

  const isActive = () => (
    desktopViewport.matches
    && !reducedMotion.matches
    && !isSafari
    && !root.classList.contains('scroll-locked')
  );

  const canNestedElementScroll = (target, delta) => {
    let element = target instanceof Element ? target : target?.parentElement;
    if (!element) return false;
    if (element.closest(nativeScrollSelector)) return true;

    while (element && element !== document.body && element !== root) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (
        scrollableOverflow.test(overflowY)
        && element.scrollHeight > element.clientHeight + 1
      ) {
        const atStart = element.scrollTop <= 0;
        const atEnd = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
        if (delta < 0 && !atStart || delta > 0 && !atEnd) return true;
      }
      element = element.parentElement;
    }

    return false;
  };

  const normalizeDelta = (event) => {
    let delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 100 / 6;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= window.innerHeight;
    return delta;
  };

  const update = (time) => {
    const elapsed = clamp(time - lastFrameTime, 0, 64) / 1000;
    lastFrameTime = time;

    if (!isActive()) {
      cancel();
    } else if (isAnimating) {
      const maximumScroll = getMaximumScroll();
      destination = clamp(destination, 0, maximumScroll);
      const distance = destination - renderedPosition;

      if (Math.round(renderedPosition) === destination) {
        renderedPosition = destination;
        isAnimating = false;
      } else {
        const easing = 1 - Math.exp(-dampingRate * elapsed);
        renderedPosition += distance * easing;
      }

      window.scrollTo({
        top: renderedPosition,
        left: window.scrollX,
        behavior: 'instant'
      });
    }

    window.requestAnimationFrame(update);
  };

  const onWheel = (event) => {
    if (
      !isActive()
      || event.defaultPrevented
      || event.ctrlKey
      || event.shiftKey
      || Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ) return;

    const delta = normalizeDelta(event);
    if (!delta || canNestedElementScroll(event.target, delta)) {
      cancel();
      return;
    }

    const maximumScroll = getMaximumScroll();
    const current = window.scrollY;
    if (delta < 0 && current <= 0 && destination <= 0) return;
    if (delta > 0 && current >= maximumScroll && destination >= maximumScroll) return;

    event.preventDefault();
    if (!isAnimating) {
      destination = current;
      renderedPosition = current;
    }
    destination = clamp(Math.round(destination + delta), 0, maximumScroll);
    isAnimating = true;
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', () => {
    if (isAnimating && Math.abs(window.scrollY - renderedPosition) > 2) {
      cancel();
      return;
    }
    if (!isAnimating) {
      destination = window.scrollY;
      renderedPosition = window.scrollY;
    }
  }, { passive: true });
  window.addEventListener('resize', cancel, { passive: true });
  window.addEventListener('pageshow', cancel);
  window.addEventListener('pointerdown', cancel, { passive: true, capture: true });
  window.addEventListener('keydown', cancel, true);
  window.addEventListener('hashchange', cancel);
  window.addEventListener('popstate', cancel);
  window.addEventListener('pagehide', cancel);
  document.addEventListener('shopify:section:select', cancel);
  document.addEventListener('shopify:block:select', cancel);
  reducedMotion.addEventListener?.('change', cancel);
  desktopViewport.addEventListener?.('change', cancel);
  window.SpinelSmoothScroll = { cancel };
  window.requestAnimationFrame(update);
})();
