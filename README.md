# Custom Base Theme (Shopify Online Store 2.0)

A from-scratch OS 2.0 theme scaffold. The **backend / functional layer is fully wired**
(theme settings, color schemes, cart, native filtering, product & variant logic,
search, newsletter, customer accounts). The **visual sections are intentionally minimal**
so you can build your own design layer on top without fighting opinionated CSS.

> Note on checkout: a Shopify theme cannot contain checkout logic. Checkout is hosted by
> Shopify and customized via Checkout UI extensions (outside the theme). Everything here
> covers the storefront *up to* checkout; the "Check out" buttons post to Shopify's
> standard `/checkout`.

## What's wired up

| Area | Files | Notes |
|------|-------|-------|
| Theme settings | `config/settings_schema.json`, `config/settings_data.json` | Color scheme group (3 schemes), typography, layout, buttons, cards, media, cart, search, social, favicon, currency |
| Color schemes | `snippets/color-schemes.liquid` | Emits CSS custom properties per scheme. Apply with `class="color-scheme-1"` etc. |
| Layout | `layout/theme.liquid`, `layout/password.liquid` | Section groups, global JS, route + string globals |
| Cart (drawer + page) | `assets/cart.js`, `snippets/cart-drawer.liquid`, `snippets/cart-icon-bubble.liquid`, `sections/cart-drawer.liquid`, `sections/cart-icon-bubble.liquid`, `sections/main-cart-items.liquid`, `sections/main-cart-footer.liquid`, `templates/cart.json` | AJAX Cart API + Section Rendering API; live updates with no reload |
| Filtering (native) | `assets/facets.js`, `snippets/facets.liquid`, `sections/main-collection-product-grid.liquid` | Uses `collection.filters` from the **Search & Discovery** app + Section Rendering API |
| Product / variants | `assets/product-form.js`, `assets/product-info.js`, `snippets/product-variant-picker.liquid`, `snippets/buy-buttons.liquid`, `sections/main-product.liquid` | Variant matching, price/availability swap, AJAX add-to-cart |
| Search | `assets/predictive-search.js`, `sections/main-search.liquid`, `sections/predictive-search.liquid` | Predictive dropdown + full results page with facets |
| Newsletter | `sections/newsletter.liquid` | Native `form 'customer'` → Shopify Email / customer list |
| Customer accounts | `sections/main-{login,register,account,order,addresses,reset-password,activate-account}.liquid` + `templates/customers/*.json` | All standard Shopify customer forms |
| Locales | `locales/en.default.json`, `locales/en.default.schema.json` | Every `t:` key referenced in the theme is defined |

## Enabling filters

Filtering reads `collection.filters`, which is populated by the free
**[Shopify Search & Discovery](https://apps.shopify.com/search-and-discovery)** app.
Install it, configure filters there, and they appear automatically on the collection and
search pages. No theme changes needed.

## How the cart live-updates

Both the drawer and the cart page use the Section Rendering API. The convention:

- `cart-drawer` section → swapped into on-page `#CartDrawer`
- `cart-icon-bubble` section → swapped into on-page `#cart-icon-bubble`
- `main-cart-items` / `main-cart-footer` → swapped into their `.js-contents`

`assets/cart.js` requests these sections on add/change and replaces the inner HTML.
Set the cart type (drawer / page / both) in **Theme settings → Cart**.

## Building your own sections

Add section files to `sections/` and drop them into any JSON template's `order` array,
or add them to `header-group.json` / `footer-group.json`. To inherit theming, give the
section a `color_scheme` setting and put `class="color-{{ section.settings.color_scheme }}"`
on its wrapper. Use the `.page-width`, `.grid`, `.button`, and `.card` primitives in
`assets/base.css`, or ignore them entirely and style your own.

## Folder structure

```
assets/      CSS + JS (cart, facets, product, predictive search, helpers)
blocks/      (empty — for theme blocks if you add them)
config/      settings_schema.json, settings_data.json
layout/      theme.liquid, password.liquid
locales/     en.default.json, en.default.schema.json
sections/    functional sections + header/footer + section groups
snippets/    reusable partials (cart, facets, price, card, icons, variant picker)
templates/   JSON templates incl. customers/
```

## Notes

- JS uses vanilla custom elements (Dawn-style) — no framework, no build step.
- All theme/section JSON has been validated; every rendered snippet, asset, section
  type, and translation key resolves.
- `card-product.liquid`, `header.liquid`, and `footer.liquid` are deliberately plain —
  replace or restyle them freely.
