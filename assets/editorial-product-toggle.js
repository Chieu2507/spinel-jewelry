(() => {
  const moveProductOverlays = (scope = document) => {
    scope.querySelectorAll?.('.editorial-hero').forEach((hero) => {
      const media = hero.querySelector('.editorial-hero__media');
      const copy = hero.querySelector('.editorial-hero__copy');
      if (!media || !copy) return;
      // Theme blocks are rendered into the copy column by `content_for`.
      // Relocate the overlay blocks into the media column so their absolute
      // positioning is always scoped to the image (including Theme Editor
      // re-renders where Shopify may add a block wrapper).
      copy.querySelectorAll('.editorial-hero__seal, .editorial-hero__product-disclosure').forEach((overlay) => {
        if (overlay.parentElement !== media) media.appendChild(overlay);
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
