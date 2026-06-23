# CLAUDE.md

Context for working on this Shopify theme. Read before making changes.

## What this is

A from-scratch Shopify **Online Store 2.0** theme. The **backend / functional layer
is fully built and wired**; the **visual sections are intentionally minimal** so the
owner can build their own design layer on top without fighting opinionated CSS.

When adding design, prefer creating new sections/snippets over heavily restyling the
existing functional ones. Keep the functional plumbing intact.

## Hard constraints

- **No checkout code.** Checkout is Shopify-hosted and cannot live in the theme. It is
  customized only via Checkout UI extensions (a separate project). "Check out" buttons
  here just post to the standard `/checkout`. Do not attempt to build checkout steps.
- **Filtering depends on the Search & Discovery app.** The collection/search filters
  read `collection.filters` / `search.filters`, which are populated by Shopify's free
  Search & Discovery app. Don't hand-roll a filter system — configure filters in that app.
- **No browser storage in any front-end JS** that assumes a sandbox; this is a real
  storefront, so `localStorage`/`sessionStorage` are fine where appropriate, but cart
  state is the source of truth via the AJAX Cart API.
- Every `t:` translation key used in Liquid must exist in `locales/en.default.json`
  (storefront) or `locales/en.default.schema.json` (settings). Add keys when you add strings.

## Architecture

- **Vanilla JS custom elements** (Dawn-style). No framework, no build step. Files in `assets/`.
- **Color schemes**: `snippets/color-schemes.liquid` emits CSS custom properties per scheme
  (`--color-background`, `--color-foreground`, `--color-button`, etc.). Apply to any element
  with `class="color-{{ section.settings.color_scheme }}"` (e.g. `color-scheme-1`).
- **Theme settings**: `config/settings_schema.json` (+ `settings_data.json` for defaults).
- **Layout**: `layout/theme.liquid` loads globals and renders `header-group` / `footer-group`
  section groups + the cart drawer.

### Cart (drawer + page) — Section Rendering API convention

Live updates with no reload. On add/change, JS requests sections and swaps inner HTML.
Keep these target IDs/selectors consistent if you touch cart code:

- `cart-drawer` section  -> on-page target `#CartDrawer` (inner swap)
- `cart-icon-bubble`     -> on-page target `#cart-icon-bubble` (inner swap)
- `main-cart-items`      -> `.js-contents` inside `#main-cart-items`
- `main-cart-footer`     -> `.js-contents` inside `#main-cart-footer`

Cart JS: `assets/cart.js` (CartDrawer, CartItems, CartDrawerItems, CartRemoveButton, CartNote).
Cart type (drawer / page / both) is a theme setting: **Theme settings → Cart**.

### Product / variants

- `assets/product-info.js` — `variant-selects` element; matches variant, swaps
  `#price-{section.id}` and `#Inventory-{section.id}` via Section Rendering API, updates URL
  and the hidden `id` input.
- `assets/product-form.js` — `product-form` element; AJAX add-to-cart, opens drawer or
  redirects to cart based on `data-cart-drawer`.

### Filtering

- `assets/facets.js` — `FacetFiltersForm`, `PriceRange`, `FacetRemove`. Uses Section
  Rendering API against `#product-grid` (which carries `data-id="{{ section.id }}"`),
  updates `#ProductGridContainer` and `#ProductCount` / `#ProductCountDesktop`, manages
  history state.
- `snippets/facets.liquid` renders the native filters; `sections/main-collection-product-grid.liquid`
  is the collection body.

## Folder map

```
assets/      CSS + JS (cart, facets, product, predictive search, helpers)
config/      settings_schema.json, settings_data.json
layout/      theme.liquid, password.liquid
locales/     en.default.json, en.default.schema.json
sections/    functional sections + header/footer + *-group.json section groups
snippets/    reusable partials (cart, facets, price, card, icons, variant picker)
templates/   JSON templates incl. customers/
blocks/      (empty placeholder)
```

## Conventions when editing

- Give new sections a `color_scheme` setting and wrap with
  `class="color-{{ section.settings.color_scheme }}"` to inherit theming.
- Reuse base primitives in `assets/base.css`: `.page-width`, `.grid` / `.grid--N-col`,
  `.button` / `.button--secondary` / `.button--full-width`, `.card`, `.price`, `.field`.
- New section files go in `sections/` and must be added to a JSON template's `order`
  array (or a section group) to appear.
- Validate JSON: every `{% schema %}` block and `templates/*.json` must be valid JSON.

## Workflow

- This repo is connected to Shopify via the GitHub integration (two-way sync).
- Keep the connected branch pointed at a **dev / unpublished** theme while building;
  only publish a tested batch. Pushes to the connected branch sync automatically.
- After edits, run a quick self-check: schemas parse, referenced snippets/assets/section
  types exist, and any new `t:` keys are defined in the locale files.