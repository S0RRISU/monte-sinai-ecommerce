import { appState, escapeHTML } from './state.js';
import { filterProducts, renderProductGrid } from './products.js';

export function runSearch(query) {
  return filterProducts(appState.products, { query }).slice(0, 12);
}

export function renderSearchResults(query = '') {
  const results = document.querySelector('[data-search-results]');
  if (!results) return;
  const matches = query ? runSearch(query) : appState.products.slice(0, 8);
  renderProductGrid(results, matches, `Nenhum resultado para "${escapeHTML(query)}".`);
}

export function bindSearch() {
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-search-form]');
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector('input[type="search"], [data-search-input]');
    const query = input?.value || '';
    const modal = document.querySelector('#search-modal');
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('is-scroll-locked');
      const modalInput = modal.querySelector('[data-search-input]');
      if (modalInput) {
        modalInput.value = query;
        modalInput.focus();
      }
      renderSearchResults(query);
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-search-input]');
    if (input) renderSearchResults(input.value);

    const catalogSearch = event.target.closest('[data-catalog-search]');
    if (catalogSearch) {
      document.dispatchEvent(new CustomEvent('catalog:filter', { detail: { query: catalogSearch.value } }));
    }
  });

  document.addEventListener('click', (event) => {
    const suggestion = event.target.closest('[data-search-suggestion]');
    if (!suggestion) return;
    const input = document.querySelector('#search-modal [data-search-input]');
    if (input) input.value = suggestion.dataset.searchSuggestion || '';
    renderSearchResults(input?.value || '');
  });
}
