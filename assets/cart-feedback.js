(() => {
  if (window.__spinelCartFeedbackInitialized) return;
  window.__spinelCartFeedbackInitialized = true;

  const animateFrom = (source, image, imageUrl) => {
    if (!source) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = document.querySelector('.header__cart');
    if (!target) return;
    const start = source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    if (!start.width || !start.height) return;
    const resolvedImageUrl = imageUrl || image?.currentSrc || image?.src;
    const flyer = resolvedImageUrl ? document.createElement('img') : document.createElement('div');
    flyer.className = 'product-cart-flyer';
    if (resolvedImageUrl) {
      flyer.src = resolvedImageUrl;
      flyer.alt = '';
    } else flyer.textContent = '✓';
    const size = 52;
    const flyerLeft = start.left + (start.width - size) / 2;
    const flyerTop = start.top + (start.height - size) / 2;
    Object.assign(flyer.style, {
      position: 'fixed', zIndex: '100', display: 'grid', pointerEvents: 'none',
      left: `${flyerLeft}px`, top: `${flyerTop}px`, width: `${size}px`, height: `${size}px`,
      border: '0', borderRadius: '2px', background: resolvedImageUrl ? '#f8f6f3' : 'currentColor', color: '#fff', placeItems: 'center',
      objectFit: 'contain', fontSize: '22px', boxShadow: '0 8px 24px rgba(0,0,0,.16)'
    });
    document.body.append(flyer);
    const deltaX = end.left + end.width / 2 - (flyerLeft + size / 2);
    const deltaY = end.top + end.height / 2 - (flyerTop + size / 2);
    const controlX = deltaX * .22;
    const controlY = deltaY * .4 - Math.min(460, Math.max(280, Math.abs(deltaX) * .7));
    const keyframes = Array.from({ length: 25 }, (_, index) => {
      const progress = index / 24;
      const inverse = 1 - progress;
      const x = 2 * inverse * progress * controlX + progress * progress * deltaX;
      const y = 2 * inverse * progress * controlY + progress * progress * deltaY;
      const scale = 1 - progress * .82;
      return { transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`, opacity: 1 - progress * .8, offset: progress };
    });
    const animation = flyer.animate([
      ...keyframes
    ], { duration: 3200, easing: 'cubic-bezier(.2,.7,.25,1)' });
    animation.finished.then(() => flyer.remove()).catch(() => flyer.remove());
  };

  const updateCartCount = (cart) => {
    if (!cart || typeof cart.item_count !== 'number') return;
    document.querySelectorAll('.header__cart').forEach((cartLink) => {
      const count = cartLink.querySelector('.header__cart-count');
      if (cart.item_count > 0) {
        const nextCount = count || document.createElement('span');
        nextCount.className = 'header__cart-count';
        const countLabel = cartLink.dataset.cartCountLabel?.replace('__count__', String(cart.item_count));
        if (countLabel) nextCount.setAttribute('aria-label', countLabel);
        nextCount.textContent = cart.item_count;
        if (!count) cartLink.append(nextCount);
        nextCount.classList.remove('is-updated');
        requestAnimationFrame(() => nextCount.classList.add('is-updated'));
      } else {
        count?.remove();
      }
    });
  };

  window.SpinelCartFeedback = { animateFrom, updateCartCount };
  document.addEventListener('cart:updated', (event) => updateCartCount(event.detail?.cart));
  document.addEventListener('product:add:success', (event) => animateFrom(event.detail?.button, event.detail?.image, event.detail?.imageUrl));
  document.addEventListener('cart:add:success', (event) => animateFrom(event.detail?.button, event.detail?.image, event.detail?.imageUrl));
})();
