class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input[type="search"]');
    this.predictiveSearchResults = this.querySelector('[data-predictive-search]');
    this.cachedResults = {};
    if (!this.input) return;

    this.input.addEventListener(
      'input',
      debounce((event) => {
        this.onChange(event);
      }, 300).bind(this)
    );
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.addEventListener('keyup', this.onKeyup.bind(this));
    this.addEventListener('keydown', this.onKeydown.bind(this));
    document.body.addEventListener('click', this.onBodyClick.bind(this));
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    const searchTerm = this.getQuery();
    if (!searchTerm.length) {
      this.close(true);
      return;
    }
    this.getSearchResults(searchTerm);
  }

  onFocus() {
    const searchTerm = this.getQuery();
    if (!searchTerm.length) return;
    if (this.getAttribute('results') === 'true') {
      this.open();
    } else {
      this.getSearchResults(searchTerm);
    }
  }

  getSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(' ', '-').toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(
      `${routes.predictive_search_url}?q=${encodeURIComponent(
        searchTerm
      )}&section_id=predictive-search`
    )
      .then((response) => response.text())
      .then((text) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector('#shopify-section-predictive-search')?.innerHTML;
        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        this.close();
        throw error;
      });
  }

  setLiveRegionLoadingState() {
    this.setAttribute('loading', true);
  }

  renderSearchResults(resultsMarkup) {
    this.predictiveSearchResults.innerHTML = resultsMarkup || '';
    this.setAttribute('results', true);
    this.removeAttribute('loading');
    this.open();
  }

  onKeyup(event) {
    if (!this.getQuery().length) this.close(true);
    event.preventDefault();
    if (event.code === 'ArrowUp') this.switchOption('up');
    if (event.code === 'ArrowDown') this.switchOption('down');
    if (event.code === 'Enter') this.selectOption();
  }

  onKeydown(event) {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') event.preventDefault();
  }

  switchOption(direction) {
    if (this.getAttribute('open') !== 'true') return;
    const moveUp = direction === 'up';
    const items = Array.from(this.querySelectorAll('[role="option"]'));
    if (!items.length) return;
    const selected = this.querySelector('[aria-selected="true"]');
    let activeIndex = items.indexOf(selected);

    if (moveUp) activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
    else activeIndex = activeIndex === items.length - 1 ? 0 : activeIndex + 1;

    items.forEach((item) => item.setAttribute('aria-selected', false));
    items[activeIndex].setAttribute('aria-selected', true);
  }

  selectOption() {
    const selectedOption = this.querySelector('[aria-selected="true"] a, button[aria-selected="true"]');
    if (selectedOption) selectedOption.click();
  }

  onBodyClick(event) {
    if (!this.contains(event.target)) this.close(true);
  }

  open() {
    this.setAttribute('open', true);
    this.input.setAttribute('aria-expanded', true);
  }

  close(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = '';
      this.removeAttribute('results');
    }
    this.setAttribute('open', false);
    this.input.setAttribute('aria-expanded', false);
  }
}
customElements.define('predictive-search', PredictiveSearch);
