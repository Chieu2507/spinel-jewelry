if (!customElements.get('announcement-bar')) {
  class AnnouncementBar extends HTMLElement {
    connectedCallback() {
      this.items = Array.from(this.querySelectorAll('[data-announcement-item]'));
      this.navigator = this.querySelector('[data-announcement-navigator]');
      this.index = Math.max(0, this.items.findIndex((item) => !item.hidden));
      this.interval = Number(this.dataset.interval) || 5000;
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduceMotion = this.motionPreference.matches;
      this.isPointerInside = false;
      this.hasFocusWithin = false;
      this.itemAnimation = null;
      this.onBlockSelect = this.handleBlockSelect.bind(this);
      this.onMouseEnter = this.handleMouseEnter.bind(this);
      this.onMouseLeave = this.handleMouseLeave.bind(this);
      this.onFocusIn = this.handleFocusIn.bind(this);
      this.onFocusOut = this.handleFocusOut.bind(this);
      this.onNavigatorClick = this.handleNavigatorClick.bind(this);
      this.onMotionPreferenceChange = this.handleMotionPreferenceChange.bind(this);
      this.onVisibilityChange = this.handleVisibilityChange.bind(this);
      this.addEventListener('mouseenter', this.onMouseEnter);
      this.addEventListener('mouseleave', this.onMouseLeave);
      this.addEventListener('focusin', this.onFocusIn);
      this.addEventListener('focusout', this.onFocusOut);
      this.navigator?.addEventListener('click', this.onNavigatorClick);
      this.motionPreference.addEventListener('change', this.onMotionPreferenceChange);
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.startRotation();
    }

    disconnectedCallback() {
      this.stopRotation();
      this.itemAnimation?.cancel();
      this.removeEventListener('mouseenter', this.onMouseEnter);
      this.removeEventListener('mouseleave', this.onMouseLeave);
      this.removeEventListener('focusin', this.onFocusIn);
      this.removeEventListener('focusout', this.onFocusOut);
      this.navigator?.removeEventListener('click', this.onNavigatorClick);
      this.motionPreference.removeEventListener('change', this.onMotionPreferenceChange);
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    startRotation() {
      this.stopRotation();
      if (
        this.dataset.behavior !== 'rotate' ||
        this.items.length < 2 ||
        this.reduceMotion ||
        this.isPointerInside ||
        this.hasFocusWithin ||
        document.hidden
      ) return;
      this.rotationTimer = window.setInterval(() => this.showItem(this.index + 1), this.interval);
    }

    stopRotation() {
      window.clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    handleVisibilityChange() {
      if (document.hidden) {
        this.stopRotation();
        return;
      }
      this.startRotation();
    }

    showItem(index) {
      if (!this.items.length) return;
      const nextIndex = (index + this.items.length) % this.items.length;
      if (nextIndex === this.index) {
        return;
      }
      this.itemAnimation?.cancel();
      this.index = nextIndex;
      this.items.forEach((item, itemIndex) => {
        item.hidden = itemIndex !== this.index;
      });
      const nextItem = this.items[this.index];
      if (!this.reduceMotion && typeof nextItem.animate === 'function') {
        this.itemAnimation = nextItem.animate([
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });
      }
    }

    handleBlockSelect(event) {
      const item = event.target.closest('[data-announcement-item]');
      if (!item || !this.contains(item)) return;
      const itemIndex = this.items.indexOf(item);
      if (itemIndex >= 0 && this.dataset.behavior === 'rotate') this.showItem(itemIndex);
      this.stopRotation();
    }

    handleMouseEnter() {
      this.isPointerInside = true;
      this.stopRotation();
    }

    handleMouseLeave() {
      this.isPointerInside = false;
      this.startRotation();
    }

    handleFocusIn() {
      this.hasFocusWithin = true;
      this.stopRotation();
    }

    handleFocusOut(event) {
      if (this.contains(event.relatedTarget)) return;
      this.hasFocusWithin = false;
      this.startRotation();
    }

    handleNavigatorClick(event) {
      const control = event.target.closest('[data-announcement-step]');
      if (!control || !this.navigator?.contains(control)) return;
      this.stopRotation();
      this.showItem(this.index + Number(control.dataset.announcementStep));
      this.startRotation();
    }

    handleMotionPreferenceChange(event) {
      this.reduceMotion = event.matches;
      this.itemAnimation?.cancel();
      if (this.reduceMotion) {
        this.stopRotation();
      } else {
        this.startRotation();
      }
    }

  }

  customElements.define('announcement-bar', AnnouncementBar);
}
