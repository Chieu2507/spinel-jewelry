const deferredStylesheets = document.querySelectorAll('[data-deferred-section-stylesheet]');
const loadedStylesheetUrls = new Set(
  [...document.querySelectorAll('link[rel="stylesheet"][href]')].map((link) => link.href),
);

const loadStylesheet = (link) => {
  if (!link.dataset.href) return;
  const href = new URL(link.dataset.href, document.baseURI).href;
  if (loadedStylesheetUrls.has(href)) {
    link.remove();
    return;
  }
  loadedStylesheetUrls.add(href);
  link.rel = 'stylesheet';
  link.href = link.dataset.href;
  link.removeAttribute('data-href');
};

const loadRemainingStylesheets = () => {
  const load = () => deferredStylesheets.forEach(loadStylesheet);
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 1200 });
  } else {
    window.setTimeout(load, 0);
  }
};

if (!('IntersectionObserver' in window)) {
  deferredStylesheets.forEach(loadStylesheet);
} else {
  const sectionLinks = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.get(entry.target)?.forEach(loadStylesheet);
        sectionLinks.delete(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '400px 0px' },
  );

  deferredStylesheets.forEach((link) => {
    const section = link.closest('.shopify-section');
    if (!section) {
      loadStylesheet(link);
      return;
    }

    const links = sectionLinks.get(section) || [];
    links.push(link);
    sectionLinks.set(section, links);
    observer.observe(section);
  });
}

if (document.readyState === 'complete') {
  loadRemainingStylesheets();
} else {
  window.addEventListener('load', loadRemainingStylesheets, { once: true });
}
