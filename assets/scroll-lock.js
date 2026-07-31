(() => {
  if (window.themeScrollLock) return;

  const root = document.documentElement;
  const body = document.body;
  const bodyStyles = ['position', 'top', 'right', 'left', 'width', 'overflow'];
  let locked = false;
  let scrollY = 0;
  let savedStyles = {};

  const hasOpenLock = () => Boolean(document.querySelector('[scroll-lock][open], [scroll-lock].is-open'));

  const lock = () => {
    if (locked) return;
    locked = true;
    scrollY = window.scrollY;
    savedStyles = Object.fromEntries(bodyStyles.map((property) => [property, body.style.getPropertyValue(property)]));
    root.classList.add('scroll-locked');
    Object.assign(body.style, {
      position: 'fixed',
      top: `-${scrollY}px`,
      right: '0',
      left: '0',
      width: '100%',
      overflow: 'hidden'
    });
  };

  const unlock = () => {
    if (!locked) return;
    locked = false;
    bodyStyles.forEach((property) => body.style.setProperty(property, savedStyles[property] || ''));
    root.classList.remove('scroll-locked');
    window.scrollTo(0, scrollY);
  };

  const update = () => {
    if (hasOpenLock()) lock();
    else unlock();
  };

  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => (
      mutation.type === 'childList'
      || mutation.target instanceof Element && mutation.target.hasAttribute('scroll-lock')
    ))) update();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'open', 'scroll-lock'],
    childList: true,
    subtree: true
  });
  window.addEventListener('pageshow', update);
  window.themeScrollLock = { update };
  update();
})();
