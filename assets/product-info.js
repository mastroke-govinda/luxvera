if (!customElements.get('variant-selects')) {
  customElements.define(
    'variant-selects',
    class VariantSelects extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('change', this.onVariantChange);
      }

      onVariantChange(event) {
        this.updateOptions();
        this.updateMasterId();
        this.updateVariantInput();

        if (!this.currentVariant) {
          this.toggleAddButton(true, '', true);
          this.setUnavailable();
        } else {
          this.updateURL();
          this.renderProductInfo();
        }
      }

      updateOptions() {
        this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
          if (element.tagName === 'SELECT') return element.value;
          const checked = Array.from(element.querySelectorAll('input')).find((radio) => radio.checked);
          return checked ? checked.value : null;
        });
      }

      updateMasterId() {
        this.currentVariant = this.getVariantData().find((variant) => {
          return !variant.options.map((option, index) => this.options[index] === option).includes(false);
        });
      }

      updateURL() {
        if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
      }

      updateVariantInput() {
        const productForms = document.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
        );
        productForms.forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          if (!input) return;
          input.value = this.currentVariant ? this.currentVariant.id : '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      renderProductInfo() {
        const requestedVariantId = this.currentVariant.id;
        const sectionId = this.dataset.originalSection || this.dataset.section;

        fetch(`${this.dataset.url}?variant=${requestedVariantId}&section_id=${sectionId}`)
          .then((response) => response.text())
          .then((responseText) => {
            if (this.currentVariant.id !== requestedVariantId) return;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const destination = document.getElementById(`price-${this.dataset.section}`);
            const source = html.getElementById(`price-${sectionId}`);
            if (source && destination) destination.innerHTML = source.innerHTML;

            const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);
            const inventorySource = html.getElementById(`Inventory-${sectionId}`);
            if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;

            const price = document.getElementById(`price-${this.dataset.section}`);
            if (price) price.classList.remove('hidden');
            this.toggleAddButton(
              !this.currentVariant.available,
              window.variantStrings.soldOut
            );

            publish(PUB_SUB_EVENTS.variantChange, {
              data: { sectionId, html, variant: this.currentVariant },
            });
          });
      }

      toggleAddButton(disable = true, text, modifyClass = true) {
        const productForm = document.getElementById(`product-form-${this.dataset.section}`);
        if (!productForm) return;
        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = productForm.querySelector('[name="add"] > span');
        if (!addButton) return;

        if (disable) {
          addButton.setAttribute('disabled', 'disabled');
          if (text) addButtonText.textContent = text;
        } else {
          addButton.removeAttribute('disabled');
          addButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      setUnavailable() {
        const button = document.getElementById(`product-form-${this.dataset.section}`);
        const addButton = button?.querySelector('[name="add"]');
        const addButtonText = button?.querySelector('[name="add"] > span');
        const price = document.getElementById(`price-${this.dataset.section}`);
        if (!addButton) return;
        if (addButtonText) addButtonText.textContent = window.variantStrings.unavailable;
        if (price) price.classList.add('hidden');
      }

      getVariantData() {
        this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
        return this.variantData;
      }
    }
  );
}
