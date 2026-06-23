// ============================================================
// StickyHeader — adds .scrolled shadow past 20 px of scroll
// Activated only when the element has [data-sticky].
// ============================================================
class StickyHeader extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute('data-sticky')) return;
    this._header = this.querySelector('.header');
    this._onScroll = this._tick.bind(this);
    window.addEventListener('scroll', this._onScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
  }

  _tick() {
    if (!this._header) return;
    this._header.classList.toggle('scrolled', window.scrollY > 20);
  }
}
customElements.define('sticky-header', StickyHeader);

// ============================================================
// DetailsDisclosure — desktop dropdown wrapper
// • Closes all other open disclosures when this one opens
// • Escape key and focusout close this one
// ============================================================
class DetailsDisclosure extends HTMLElement {
  connectedCallback() {
    this._details = this.querySelector('details');
    this._summary = this.querySelector('summary');
    if (!this._details) return;

    this._onToggle = this._handleToggle.bind(this);
    this._onKeydown = this._handleKeydown.bind(this);
    this._onFocusOut = this._handleFocusOut.bind(this);

    this._details.addEventListener('toggle', this._onToggle);
    this.addEventListener('keydown', this._onKeydown);
    this.addEventListener('focusout', this._onFocusOut);
  }

  disconnectedCallback() {
    if (!this._details) return;
    this._details.removeEventListener('toggle', this._onToggle);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('focusout', this._onFocusOut);
  }

  close() {
    this._details.removeAttribute('open');
  }

  _handleToggle() {
    if (!this._details.open) return;
    document.querySelectorAll('details-disclosure').forEach((el) => {
      if (el !== this) el.close();
    });
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this._details.open) {
      this.close();
      this._summary && this._summary.focus();
    }
  }

  _handleFocusOut(e) {
    if (!this.contains(e.relatedTarget)) {
      this.close();
    }
  }
}
customElements.define('details-disclosure', DetailsDisclosure);

// ============================================================
// HeaderDrawer — mobile nav drawer
// • Appends a backdrop overlay to <body>
// • Locks body scroll while open
// • Overlay click, close button, and Escape all close it
// ============================================================
class HeaderDrawer extends HTMLElement {
  connectedCallback() {
    this._details = this.querySelector('details');
    this._closeBtn = this.querySelector('.header__menu-drawer-close');
    if (!this._details) return;

    this._overlay = document.createElement('div');
    this._overlay.className = 'header__menu-drawer-overlay';
    this._overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this._overlay);

    this._onToggle = this._handleToggle.bind(this);
    this._onClose = this._close.bind(this);
    this._onKeydown = this._handleKeydown.bind(this);

    this._details.addEventListener('toggle', this._onToggle);
    this._overlay.addEventListener('click', this._onClose);
    if (this._closeBtn) this._closeBtn.addEventListener('click', this._onClose);
    document.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback() {
    if (this._overlay) {
      this._overlay.removeEventListener('click', this._onClose);
      this._overlay.remove();
    }
    if (this._details) this._details.removeEventListener('toggle', this._onToggle);
    document.removeEventListener('keydown', this._onKeydown);
  }

  _handleToggle() {
    const open = this._details.open;
    this._overlay.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    const summary = this._details.querySelector('summary');
    if (summary) summary.setAttribute('aria-expanded', String(open));
    if (open && this._closeBtn) this._closeBtn.focus();
  }

  _close() {
    this._details.removeAttribute('open');
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this._details.open) this._close();
  }
}
customElements.define('header-drawer', HeaderDrawer);
