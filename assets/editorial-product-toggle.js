(() => {
  const moveProductOverlays = (scope = document) => {
    scope.querySelectorAll?.('.editorial-hero').forEach((hero) => {
      const media = hero.querySelector('.editorial-hero__media');
      const copy = hero.querySelector('.editorial-hero__copy');
      if (!media || !copy) return;
      copy.querySelectorAll(':scope > .editorial-hero__seal, :scope > .editorial-hero__product-disclosure').forEach((overlay) => {
        media.appendChild(overlay);
      });
    });
  };

  moveProductOverlays();
  document.addEventListener('shopify:section:load', (event) => moveProductOverlays(event.target));

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-product-toggle]');
    if (!trigger) return;

    const disclosure = trigger.closest('[data-product-card]');
    if (!disclosure) return;

    const isOpen = disclosure.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    trigger.setAttribute('aria-label', isOpen ? 'Close featured product' : 'View featured product');
  });
})();
