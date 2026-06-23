/* ============================================================
   CART
   AJAX Cart API + Section Rendering API for live updates to
   both the cart drawer and the cart page without a reload.

   Section-rendering convention:
     - cart-drawer section  -> on-page target #CartDrawer (inner swap)
     - cart-icon-bubble     -> on-page target #cart-icon-bubble (inner swap)
     - main-cart-items      -> on-page target .js-contents within #main-cart-items
     - main-cart-footer     -> on-page target .js-contents within #main-cart-footer
   ============================================================ */

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    const overlay = this.querySelector('.cart-drawer__overlay');
    if (overlay) overlay.addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    this.classList.add('active');
    document.body.classList.add('overflow-hidden');
    const containerToTrap = this.querySelector('.cart-drawer__inner');
    setTimeout(() => trapFocus(containerToTrap, this.querySelector('.drawer__close')), 50);
  }

  close() {
    this.classList.remove('active');
    document.body.classList.remove('overflow-hidden');
    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const target = document.querySelector(section.selector);
      if (target && parsedState.sections[section.section]) {
        target.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
      }
    });

    this.classList.toggle('is-empty', parsedState.item_count === 0);

    setTimeout(() => {
      const overlay = this.querySelector('.cart-drawer__overlay');
      if (overlay) overlay.addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML ?? '';
  }

  getSectionsToRender() {
    return [
      { id: 'CartDrawer', selector: '#CartDrawer', section: 'cart-drawer' },
      { id: 'cart-icon-bubble', selector: '#cart-icon-bubble', section: 'cart-icon-bubble' },
    ];
  }

  getSectionDOMIds() {
    return this.getSectionsToRender().map((section) => section.section);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-drawer-items') || this.closest('cart-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') ||
      document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') return;
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, event.target.dataset.quantityVariantId);
  }

  onCartUpdate() {
    const sectionId = this.tagName === 'CART-DRAWER-ITEMS' ? 'cart-drawer' : 'main-cart-items';
    fetch(`${routes.cart_url}?section_id=${sectionId}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceQty = html.querySelector(this.tagName.toLowerCase());
        if (sourceQty) this.innerHTML = sourceQty.innerHTML;
      })
      .catch((e) => console.error(e));
  }

  getSectionsToRender() {
    return [
      { id: 'main-cart-items', section: document.getElementById('main-cart-items')?.dataset.id, selector: '.js-contents' },
      { id: 'cart-icon-bubble', section: 'cart-icon-bubble', selector: '#cart-icon-bubble' },
      { id: 'main-cart-footer', section: document.getElementById('main-cart-footer')?.dataset.id, selector: '.js-contents' },
    ];
  }

  updateQuantity(line, quantity, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);

        if (parsedState.errors) {
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        const cartDrawer = document.querySelector('cart-drawer');
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawer) cartDrawer.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          if (!section.section || !parsedState.sections[section.section]) return;
          const container = document.getElementById(section.id);
          const elementToReplace = container?.querySelector(section.selector) || document.querySelector(section.selector);
          if (elementToReplace) {
            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
          }
        });

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML ?? '';
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) ||
      document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) {
      const text = lineItemError.querySelector('.cart-item__error-text');
      if (text) text.textContent = message;
    }
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', true);
  }

  enableLoading(line) {
    this.classList.add('cart__items--disabled');
    const spinners = this.querySelectorAll(
      `#CartItem-${line} .loading__spinner, #CartDrawer-Item-${line} .loading__spinner`
    );
    spinners.forEach((spinner) => spinner.classList.remove('hidden'));
    if (document.activeElement) document.activeElement.blur();
    if (this.lineItemStatusElement) this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    this.classList.remove('cart__items--disabled');
    const spinners = this.querySelectorAll(
      `#CartItem-${line} .loading__spinner, #CartDrawer-Item-${line} .loading__spinner`
    );
    spinners.forEach((spinner) => spinner.classList.add('hidden'));
  }
}
customElements.define('cart-items', CartItems);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      { id: 'CartDrawer', selector: '#CartDrawer', section: 'cart-drawer' },
      { id: 'cart-icon-bubble', selector: '#cart-icon-bubble', section: 'cart-icon-bubble' },
    ];
  }
}
customElements.define('cart-drawer-items', CartDrawerItems);

class CartNote extends HTMLElement {
  constructor() {
    super();
    this.addEventListener(
      'input',
      debounce((event) => {
        const body = JSON.stringify({ note: event.target.value });
        fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
      }, ON_CHANGE_DEBOUNCE_TIMER)
    );
  }
}
customElements.define('cart-note', CartNote);
