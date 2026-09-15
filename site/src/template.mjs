/* HTML templates for the Global Beyond LLC site.
   One source of truth for both languages, so EN and ES can never drift apart. */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const attr = (name, value) => (value ? ` ${name}="${esc(value)}"` : '');

/* Recognizable glyphs for the two real, external channels the site links to,
   in their own brand colors rather than the page's text color. Used in place
   of the words "WhatsApp"/"Instagram" wherever the icon alone is unambiguous;
   the name is kept for assistive tech via a visually-hidden span next to it,
   never dropped outright.
   Instagram's icon needs its own gradient per instance: an <svg> injected
   more than once into the same document (here, once in a contact card and
   once in the footer) would otherwise share one gradient id across duplicate
   elements, which is invalid HTML and unreliable in some browsers. */
let instagramIconSeq = 0;
const CHANNEL_ICONS = {
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" focusable="false"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36a9.9 9.9 0 0 0 4.62 1.13h.01c5.46 0 9.9-4.45 9.9-9.9C21.95 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.66-.6-2.92-1.26-4.83-4.2-4.98-4.4-.15-.19-1.19-1.58-1.19-3.02s.75-2.14 1.02-2.43c.26-.29.57-.36.76-.36h.55c.18 0 .42-.07.65.5.24.58.81 2 .88 2.15.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.13.07.72-.17 1.4Z"/></svg>',
  instagram() {
    const id = `ig-grad-${++instagramIconSeq}`;
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${id}" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FEDA75"/>
          <stop offset="0.35" stop-color="#D62976"/>
          <stop offset="0.68" stop-color="#962FBF"/>
          <stop offset="1" stop-color="#4F5BD5"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#${id})" stroke-width="1.7"/>
      <circle cx="12" cy="12" r="4.2" stroke="url(#${id})" stroke-width="1.7"/>
      <circle cx="17.2" cy="6.8" r="1.15" fill="url(#${id})"/>
    </svg>`;
  },
};

const renderChannelIcon = (key) =>
  typeof CHANNEL_ICONS[key] === 'function' ? CHANNEL_ICONS[key]() : CHANNEL_ICONS[key];

const ARROW_ICON =
  '<svg class="btn__arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';

const ARROW_BACK_ICON =
  '<svg class="btn__arrow btn__arrow--back" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M13 8H3M7 4L3 8l4 4"/></svg>';

/* Google's mark, shown on reviews that come from the business profile — the
   attribution Google asks for when their reviews appear off-platform. */
const GOOGLE_ICON =
  '<svg class="google-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path fill="#4285F4" d="M23.04 12.26c0-.81-.07-1.6-.21-2.35H12v4.45h6.19a5.3 5.3 0 0 1-2.3 3.47v2.89h3.72c2.17-2 3.43-4.95 3.43-8.46z"/>' +
  '<path fill="#34A853" d="M12 23.5c3.1 0 5.7-1.03 7.61-2.78l-3.72-2.89c-1.03.69-2.35 1.1-3.89 1.1-2.99 0-5.52-2.02-6.43-4.74H1.72v2.98A11.5 11.5 0 0 0 12 23.5z"/>' +
  '<path fill="#FBBC05" d="M5.57 14.19a6.9 6.9 0 0 1 0-4.38V6.83H1.72a11.5 11.5 0 0 0 0 10.34l3.85-2.98z"/>' +
  '<path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.39 1.72l3.29-3.29C17.7 1.31 15.1.25 12 .25A11.5 11.5 0 0 0 1.72 6.83l3.85 2.98C6.48 7.09 9.01 4.75 12 4.75z"/>' +
  '</svg>';

const STAR_PATH = 'M8 1.4l1.98 4.16 4.4.58-3.24 3.11.82 4.55L8 11.6l-3.96 2.2.82-4.55-3.24-3.11 4.4-.58L8 1.4z';
const starIcon = (filled) =>
  `<svg class="star${filled ? ' star--filled' : ''}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${STAR_PATH}"/></svg>`;
/* Half stars are two stacked copies with the filled one clipped to 50% width,
   rather than an SVG gradient — a gradient needs an id, and ids repeat once the
   same rating renders more than once on a page. */
const halfStarIcon = () =>
  `<span class="star-half">${starIcon(false)}<span class="star-half__fill">${starIcon(true)}</span></span>`;
const starRating = (rating) =>
  Array.from({ length: 5 }, (_, i) => {
    if (i + 1 <= Math.floor(rating)) return starIcon(true);
    if (rating - i >= 0.5) return halfStarIcon();
    return starIcon(false);
  }).join('');

/* /assets/* is served with a one-year immutable Cache-Control, and every file
   under it keeps a fixed name — so without this, a browser or CDN edge that
   already has the previous bytes would keep serving them for up to a year
   after any future edit to the CSS, the JS, or one of these images. Appending
   a short hash of the file's own content to its URL means the URL changes the
   moment the bytes do: the old, still-cached URL stays valid forever, and the
   new one is fetched fresh. No manual cache-busting to remember on a deploy. */
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const versionCache = new Map();
export function assetVersion(relPath) {
  if (!versionCache.has(relPath)) {
    const bytes = fs.readFileSync(path.join(publicDir, relPath));
    versionCache.set(relPath, crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8));
  }
  return `/${relPath}?v=${versionCache.get(relPath)}`;
}

/* ------------------------------------------------------------- contact */
export function makeLinks(site) {
  const wa = String(site.channels.whatsapp || '').replace(/[^\d]/g, '');
  const instagram = String(site.channels.instagram || '').trim();

  return {
    hasWhatsapp: Boolean(wa),
    hasInstagram: Boolean(instagram),
    instagram,
    whatsapp(message) {
      if (!wa) return null;
      return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
    },
    /* Best available destination for a request; always resolves to something
       that works, falling back to the on-page contact form. */
    request(message) {
      return this.whatsapp(message) || '#contact';
    },
    isExternal(href) {
      return Boolean(href) && /^(https?:|mailto:)/.test(href);
    },
  };
}

const externalAttrs = (links, href) =>
  links.isExternal(href) && !href.startsWith('mailto:')
    ? ' target="_blank" rel="noopener noreferrer"'
    : '';

/* --------------------------------------------------------------- head */
function head({ c, site, assets, alternates, canonical, ogImage, noindex, jsonLd, otherLocales }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : '<meta name="robots" content="index, follow, max-image-preview:large">\n'}<link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
<meta name="theme-color" content="#070b14">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
<link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
<link rel="manifest" href="${assets}site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.legalName)}">
<meta property="og:locale" content="${esc(c.locale)}">
${(otherLocales || []).map((l) => `<meta property="og:locale:alternate" content="${esc(l)}">`).join('\n')}
<meta property="og:title" content="${esc(c.meta.title)}">
<meta property="og:description" content="${esc(c.meta.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(c.meta.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.meta.title)}">
<meta name="twitter:description" content="${esc(c.meta.description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}`;
}

/* ------------------------------------------------------------- header */
function siteHeader({ c, site, assets, langHrefs }) {
  /* Absolute rather than a bare "#id": on the catalog, reviews, product and
     legal pages those sections live on the home page, so a bare fragment
     would land nowhere and the nav would look broken. Same path on the home
     page still scrolls without a reload. */
  const navItems = c.nav
    .map(
      (item) =>
        `<li><a class="nav__link" data-nav-link href="${assets}${c.lang}/#${item.id}">${esc(item.label)}</a></li>`
    )
    .join('\n            ');

  const langItems = site.languages
    .map((lang) => {
      const current = lang.code === c.lang;
      return `<a class="lang__item" href="${esc(langHrefs[lang.code])}" hreflang="${lang.code}" lang="${lang.code}"${
        current ? ' aria-current="page"' : ''
      } aria-label="${esc(lang.label)}"><span aria-hidden="true">${esc(lang.short)}</span></a>`;
    })
    .join('\n            ');

  return `<header class="header" data-header>
      <div class="header__inner">
        <a class="brand" href="${assets}${c.lang}/" aria-label="${esc(c.a11y.home)}">
          <img src="${assetVersion('assets/img/logo-mark.webp')}" alt="" width="240" height="95" decoding="async">
          <span class="brand__name" translate="no">${esc(site.legalName)}</span>
        </a>
        <nav class="nav" data-nav aria-label="${esc(c.a11y.primaryNav)}">
          <ul class="nav__list">
            ${navItems}
          </ul>
        </nav>
        <div class="header__actions">
          <nav class="lang" aria-label="${esc(c.a11y.langNav)}">
            ${langItems}
          </nav>
          <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false"
            aria-controls="site-nav" aria-label="${esc(c.a11y.menuOpen)}"
            data-label-open="${esc(c.a11y.menuOpen)}" data-label-close="${esc(c.a11y.menuClose)}">
            <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span></span>
          </button>
        </div>
      </div>
      <span class="nav-scrim" aria-hidden="true"></span>
    </header>`;
}

/* ------------------------------------------------------------- footer */
function siteFooter({ c, site, assets, links, langHrefs }) {
  const navLinks = c.nav
    .map((item) => `<li><a href="${assets}${c.lang}/#${item.id}">${esc(item.label)}</a></li>`)
    .concat([
      `<li><a href="${esc(site.catalogPath[c.lang])}">${esc(c.catalog.categoriesCta)}</a></li>`,
      `<li><a href="${esc(site.reviewsPath[c.lang])}">${esc(c.reviews.viewCta)}</a></li>`,
    ])
    .join('\n            ');

  const contactLinks = [];
  if (links.hasWhatsapp) {
    contactLinks.push(
      `<li><a href="${esc(links.whatsapp(c.contact.presets[0].message))}" target="_blank" rel="noopener noreferrer">` +
        `<span class="footer__contact-icon">${renderChannelIcon('whatsapp')}</span>` +
        `<span class="visually-hidden">WhatsApp</span></a></li>`
    );
  }
  if (links.hasInstagram) {
    contactLinks.push(
      `<li><a href="${esc(links.instagram)}" target="_blank" rel="noopener noreferrer">` +
        `<span class="footer__contact-icon">${renderChannelIcon('instagram')}</span>` +
        `<span class="visually-hidden">Instagram</span></a></li>`
    );
  }
  contactLinks.push(`<li><span>${esc(c.contact.location)}</span></li>`);

  const langLinks = site.languages
    .map(
      (lang) =>
        `<li><a href="${esc(langHrefs[lang.code])}" hreflang="${lang.code}" lang="${lang.code}"${
          lang.code === c.lang ? ' aria-current="page"' : ''
        }>${esc(lang.label)}</a></li>`
    )
    .join('\n            ');

  return `<footer class="footer">
      <div class="shell">
        <div class="footer__top">
          <div class="footer__brand">
            <img src="${assetVersion('assets/img/logo.webp')}" alt="${esc(site.legalName)}" width="900" height="440"
              srcset="${assetVersion('assets/img/logo-540.webp')} 540w, ${assetVersion('assets/img/logo.webp')} 900w"
              sizes="190px" loading="lazy" decoding="async">
            <p class="footer__tagline">${esc(c.footer.tagline)}</p>
          </div>
          <div>
            <h2>${esc(c.footer.navHeading)}</h2>
            <ul class="footer__list">
            ${navLinks}
            </ul>
          </div>
          <div>
            <h2>${esc(c.footer.contactHeading)}</h2>
            <ul class="footer__list">
            ${contactLinks.join('\n            ')}
            </ul>
            <h2 class="footer__heading--gap">${esc(c.footer.langHeading)}</h2>
            <ul class="footer__list">
            ${langLinks}
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <div class="footer__legal">
            <p>${esc(c.footer.legal)}</p>
            <p>${esc(c.footer.disclaimer)}</p>
          </div>
          <div class="footer__bottom-right">
            <nav class="footer__legalnav" aria-label="${esc(c.footer.legalHeading)}">
              <a href="${assets}${c.lang}/privacy/">${esc(c.footer.privacyLink)}</a>
              <a href="${assets}${c.lang}/terms/">${esc(c.footer.termsLink)}</a>
            </nav>
            <p>&copy; <span data-year>${new Date().getFullYear()}</span> <span translate="no">${esc(site.legalName)}</span>. ${esc(c.footer.rights)}</p>
          </div>
        </div>
      </div>
    </footer>`;
}

/* ------------------------------------------------------------- sections */
function heroSection({ c }) {
  return `<section class="hero" aria-labelledby="hero-title">
        <div class="hero__bg" aria-hidden="true"></div>
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__grid" aria-hidden="true"></div>
        <div class="shell hero__inner">
          <img class="hero__logo is-visible-instant" src="${assetVersion('assets/img/logo.webp')}" width="900" height="440"
            srcset="${assetVersion('assets/img/logo-540.webp')} 540w, ${assetVersion('assets/img/logo.webp')} 900w"
            sizes="(min-width: 581px) 430px, 74vw"
            alt="${esc(c.brand.name)}" fetchpriority="high" decoding="async" data-reveal>
          <p class="eyebrow hero__eyebrow is-visible-instant" data-reveal>${esc(c.hero.eyebrow)}</p>
          <h1 class="h-display is-visible-instant" id="hero-title" data-reveal>${c.hero.title}</h1>
          <p class="lede is-visible-instant" data-reveal>${esc(c.hero.lede)}</p>
          <div class="btn-row hero__actions is-visible-instant" data-reveal>
            <a class="btn btn--primary" href="#contact">${esc(c.hero.ctaSecondary)}${ARROW_ICON}</a>
          </div>
          <p class="hero__note is-visible-instant" data-reveal>${esc(c.hero.note)}</p>
        </div>
        <span class="hero__scroll" aria-hidden="true"></span>
      </section>`;
}

function servicesSection({ c, links }) {
  /* Rendered as a tablist only once JS confirms it can drive it (see
     .js .tabs__list in styles.css and the tabs handler in main.js); every
     panel below is plain, visible content by default, so with JavaScript
     disabled this reads as the same three sections it always has. */
  const tabs = c.services.items
    .map(
      (item, i) => `<button class="tabs__tab" type="button" role="tab" id="services-tab-${i}"
              aria-controls="services-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}"
              data-tab="${i}">${esc(item.title)}</button>`
    )
    .join('\n              ');

  /* Only the B2B panel carries an action: retail buyers have the catalog page
     with prices on it, so asking for a catalog is a business request now. */
  const panels = c.services.items
    .map((item, i) => {
      const href = item.cta ? links.request(item.ctaMessage) : '';
      const cta = item.cta
        ? `\n              <div class="btn-row tabs__actions">
                <a class="btn btn--ghost" href="${esc(href)}"${externalAttrs(links, href)}>${esc(item.cta)}${ARROW_ICON}</a>
              </div>`
        : '';
      return `<article class="tabs__panel${i === 0 ? ' is-active' : ''}" role="tabpanel" id="services-panel-${i}"
              aria-labelledby="services-tab-${i}" data-panel="${i}" data-reveal data-delay="${i}">
              <h3 class="h-card">${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>${cta}
            </article>`;
    })
    .join('\n            ');

  const flow = c.services.flow
    .map((step, i) => `<li><span class="flow__num">${String(i + 1).padStart(2, '0')}</span>${esc(step)}</li>`)
    .join('\n                ');

  return `<section class="section section--light" id="services" aria-labelledby="services-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.services.eyebrow)}</p>
            <h2 class="h-section" id="services-title">${esc(c.services.title)}</h2>
            <p class="lede">${esc(c.services.lede)}</p>
          </div>
          <div class="services-body">
            <div class="tabs" data-tabs>
              <div class="tabs__list" role="tablist" aria-label="${esc(c.services.tabsLabel)}">
                ${tabs}
              </div>
              <div class="tabs__panels">
              ${panels}
              </div>
            </div>
            <div class="flow-card" data-reveal data-delay="1">
              <p class="flow-card__heading" id="services-flow-heading">${esc(c.services.flowLabel)}</p>
              <ol class="flow" aria-labelledby="services-flow-heading">
                ${flow}
              </ol>
            </div>
          </div>
        </div>
      </section>`;
}

function productHref(site, c, product) {
  return `${site.catalogPath[c.lang]}${product.image}/`;
}

function productCard(site, c, product) {
  const note = product.priceNote ? `<p class="product-card__note">${esc(product.priceNote)}</p>` : '';
  return `<a class="product-card" href="${esc(productHref(site, c, product))}">
            <span class="product-card__media">
              <img src="${assetVersion(`assets/img/catalog/${product.image}.webp`)}" alt="${esc(product.name)}"
                width="600" height="600" loading="lazy" decoding="async">
            </span>
            <span class="product-card__body">
              <span class="product-card__name">${esc(product.name)}</span>
              <span class="product-card__desc">${esc(product.description)}</span>
              <span class="product-card__price">${esc(product.price)}</span>
              ${note}
            </span>
          </a>`;
}

function productCategories(site, c) {
  return c.catalog.categories
    .map(
      (cat) => `<div class="product-category" data-reveal>
            <p class="product-category__label">${esc(cat.label)}</p>
            <div class="product-grid">
              ${cat.products.map((p) => productCard(site, c, p)).join('\n              ')}
            </div>
          </div>`
    )
    .join('\n          ');
}

function reviewCards(c) {
  return c.reviews.items
    .map(
      (r, i) => `<article class="review-card" data-reveal data-delay="${i % 3}">
            <div class="review-card__stars" role="img" aria-label="${r.rating}/5">${starRating(r.rating)}</div>
            <p class="review-card__body">&ldquo;${esc(r.body)}&rdquo;</p>
            <p class="review-card__meta"><strong>${esc(r.name)}</strong> · ${esc(r.date)}</p>
          </article>`
    )
    .join('\n          ');
}

function catalogSection({ c, site, assets }) {
  const catalogHref = site.catalogPath[c.lang];
  return `<section class="section section--light-alt" id="catalog" aria-labelledby="catalog-title">
        <div class="shell split split--wide-first">
          <div data-reveal>
            <p class="eyebrow">${esc(c.catalog.eyebrow)}</p>
            <h2 class="h-section" id="catalog-title">${esc(c.catalog.title)}</h2>
            ${c.catalog.body.map((para) => `<p class="body-text">${esc(para)}</p>`).join('\n            ')}
            <ul class="ticks">
              ${c.catalog.points.map((p) => `<li>${esc(p)}</li>`).join('\n              ')}
            </ul>
            <div class="btn-row">
              <a class="btn btn--primary" href="${esc(catalogHref)}">${esc(c.catalog.categoriesCta)}${ARROW_ICON}</a>
            </div>
          </div>
          <figure class="catalog__figure catalog__figure--sticky" data-reveal data-delay="1">
            <img class="catalog__photo" src="${assetVersion('assets/img/catalog.webp')}" alt="${esc(c.catalog.photoAlt)}"
              width="1400" height="950" loading="lazy" decoding="async">
            <figcaption class="catalog__caption">${esc(c.catalog.photoCaption)}</figcaption>
          </figure>
        </div>
      </section>`;
}

function reviewsTeaserSection({ c, site }) {
  const viewHref = site.reviewsPath[c.lang];
  return `<section class="section section--dark" id="reviews" aria-labelledby="reviews-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.reviews.eyebrow)}</p>
            <h2 class="h-section" id="reviews-title">${esc(c.reviews.title)}</h2>
            <p class="lede">${esc(c.reviews.lede)}</p>
          </div>
          <div class="btn-row" data-reveal>
            <a class="btn btn--primary" href="${esc(site.leaveReviewPath[c.lang])}">${esc(c.reviews.leaveCta)}${ARROW_ICON}</a>
            <a class="btn btn--ghost" href="${esc(viewHref)}">${esc(c.reviews.viewCta)}</a>
          </div>
        </div>
      </section>`;
}

function catalogPageBody({ c, site }) {
  return `<section class="section section--dark">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.catalog.categoriesEyebrow)}</p>
            <h1 class="h-section">${esc(c.catalog.categoriesTitle)}</h1>
            <p class="lede">${esc(c.catalog.categoriesLede)}</p>
          </div>
          ${productCategories(site, c)}
        </div>
      </section>`;
}

/* Looks like a real order form because it is one: it posts to the same
   /api/contact endpoint as the main contact form, just pre-filled with the
   product and framed as an order. Nothing here charges a card — the payment
   method is a stated preference that rides along in the message, confirmed
   by a person afterward, same as every other request on this site. */
function productOrderForm({ c, site, product }) {
  const f = c.contact.form;
  const pp = c.catalog.productPage;
  const orderMessage = pp.orderMessageTemplate
    .replace('{product}', product.name)
    .replace('{price}', product.price);
  const paymentOptions = pp.paymentOptions
    .map(
      (label, i) => `<label class="payment-option">
                <input type="radio" name="paymentMethod" value="${esc(label)}"${i === 0 ? ' checked' : ''}>
                <span>${esc(label)}</span>
              </label>`
    )
    .join('\n              ');

  return `<form class="form" action="/api/contact" method="post" data-contact-form novalidate>
              <input type="hidden" name="lang" value="${c.lang}">
              <p class="form__trap" aria-hidden="true">
                <label>${esc(f.name)}<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
              </p>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="pf-name">${esc(f.name)}</label>
                  <input class="field__input" id="pf-name" name="name" type="text" required
                    maxlength="120" autocomplete="name" placeholder="${esc(f.namePlaceholder)}"
                    aria-describedby="pf-name-error">
                  <p class="field__error" id="pf-name-error" data-message="${esc(f.errorName)}"></p>
                </div>
              </div>
              <div class="form__row form__row--split">
                <div class="field">
                  <label class="field__label" for="pf-email">${esc(f.email)}</label>
                  <input class="field__input" id="pf-email" name="email" type="email" spellcheck="false"
                    maxlength="200" autocomplete="email" placeholder="${esc(f.emailPlaceholder)}"
                    aria-describedby="pf-contact-hint pf-contact-error">
                </div>
                <div class="field">
                  <label class="field__label" for="pf-phone">${esc(f.phone)} <span class="field__hint">${esc(f.optional)}</span></label>
                  <input class="field__input" id="pf-phone" name="phone" type="tel"
                    maxlength="60" autocomplete="tel" placeholder="${esc(f.phonePlaceholder)}"
                    aria-describedby="pf-contact-hint pf-contact-error">
                </div>
              </div>
              <p class="field__note" id="pf-contact-hint">${esc(f.contactHint)}</p>
              <p class="field__error" id="pf-contact-error" data-message="${esc(f.errorContact)}"></p>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="pf-address">${esc(pp.addressLabel)} <span class="field__hint">${esc(pp.addressOptional)}</span></label>
                  <input class="field__input" id="pf-address" name="address" type="text"
                    maxlength="300" autocomplete="street-address" placeholder="${esc(pp.addressPlaceholder)}">
                </div>
              </div>
              <div class="form__row">
                <fieldset class="field">
                  <legend class="field__label">${esc(pp.paymentLabel)}</legend>
                  <div class="payment-options">
                    ${paymentOptions}
                  </div>
                  <p class="payment-links">
                    <a href="${esc(site.payments.paypal)}" target="_blank" rel="noopener noreferrer">${esc(pp.paypalLinkLabel)}</a>
                    <span class="payment-links__sep" aria-hidden="true">·</span>
                    <span>${esc(pp.zelleLabel)}: <a href="mailto:${esc(site.payments.zelle)}">${esc(site.payments.zelle)}</a></span>
                  </p>
                </fieldset>
              </div>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="pf-message">${esc(pp.notesLabel)}</label>
                  <textarea class="field__input field__input--area" id="pf-message" name="message" rows="3"
                    required maxlength="4000" aria-describedby="pf-message-error">${esc(orderMessage)}</textarea>
                  <p class="field__error" id="pf-message-error" data-message="${esc(f.errorMessage)}"></p>
                </div>
              </div>
              <div class="form__foot">
                <button class="btn btn--primary" type="submit" data-submit
                  data-idle="${esc(pp.submit)}" data-busy="${esc(pp.sending)}">${esc(pp.submit)}</button>
                <p class="form__privacy">${f.privacy.replace('{href}', `/${c.lang}/privacy/`)}</p>
              </div>
              <p class="form__status" data-form-status role="status" aria-live="polite"
                data-success="${esc(f.success)}" data-error="${esc(f.error)}" data-invalid="${esc(f.invalid)}"></p>
            </form>`;
}

/* The order form sits collapsed inside the buy box rather than sprawling
   across the page below it — the price and payment options read at a glance,
   and the fields only appear once the visitor commits to ordering. */
function productDetailBody({ c, site, product, categoryLabel }) {
  const pp = c.catalog.productPage;
  return `<section class="section section--dark">
        <div class="shell">
          <div class="btn-row product-detail__back" data-reveal>
            <a class="btn btn--ghost" href="${esc(site.catalogPath[c.lang])}">${ARROW_BACK_ICON}${esc(pp.backLabel)}</a>
          </div>
          <div class="product-detail" data-reveal data-delay="1">
            <figure class="product-detail__figure">
              <img src="${assetVersion(`assets/img/catalog/${product.image}.webp`)}" alt="${esc(product.name)}"
                width="900" height="900" decoding="async">
            </figure>
            <div class="product-detail__info">
              <p class="eyebrow">${esc(categoryLabel)}</p>
              <h1 class="h-section product-detail__name">${esc(product.name)}</h1>
              <p class="body-text">${esc(product.description)}</p>
              <div class="buy-box">
                <p class="product-detail__price">
                  <span class="product-detail__price-label">${esc(pp.priceLabel)}</span>
                  <span class="product-detail__price-value">${esc(product.price)}</span>
                </p>
                ${product.priceNote ? `<p class="buy-box__note">${esc(product.priceNote)}</p>` : ''}
                <details class="buy-box__order">
                  <summary class="btn btn--primary buy-box__cta">${esc(pp.orderCta)}</summary>
                  <div class="buy-box__form">
                    <p class="buy-box__lede">${esc(pp.formLede)}</p>
                    ${productOrderForm({ c, site, product })}
                  </div>
                </details>
                <p class="buy-box__note">${esc(pp.reassure)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}

/* The review is written and submitted here rather than handed off to WhatsApp.
   It posts to the same /api/contact endpoint the rest of the site uses, so it
   really reaches Global Beyond; it appears below once they publish it, which
   the copy says plainly rather than implying it goes live on its own. */
function reviewForm({ c }) {
  const f = c.contact.form;
  const rf = c.reviews.form;
  const stars = [5, 4, 3, 2, 1]
    .map(
      (n) => `<label class="rating__star">
                  <input type="radio" name="rating" value="${n}"${n === 5 ? ' checked' : ''}>
                  <span class="visually-hidden">${esc(rf.ratingStar.replace('{n}', String(n)))}</span>
                  ${starIcon(true)}
                </label>`
    )
    .join('\n                ');

  return `<form class="form" action="/api/contact" method="post" data-contact-form novalidate>
              <input type="hidden" name="lang" value="${c.lang}">
              <input type="hidden" name="message" value="${esc(rf.messagePrefix)}">
              <p class="form__trap" aria-hidden="true">
                <label>${esc(f.name)}<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
              </p>
              <div class="form__row">
                <fieldset class="field rating-field">
                  <legend class="field__label">${esc(rf.ratingLabel)}</legend>
                  <div class="rating">
                    ${stars}
                  </div>
                </fieldset>
              </div>
              <div class="form__row form__row--split">
                <div class="field">
                  <label class="field__label" for="rf-name">${esc(f.name)}</label>
                  <input class="field__input" id="rf-name" name="name" type="text" required
                    maxlength="120" autocomplete="name" placeholder="${esc(f.namePlaceholder)}"
                    aria-describedby="rf-name-error">
                  <p class="field__error" id="rf-name-error" data-message="${esc(f.errorName)}"></p>
                </div>
                <div class="field">
                  <label class="field__label" for="rf-email">${esc(f.email)} <span class="field__hint">${esc(f.optional)}</span></label>
                  <input class="field__input" id="rf-email" name="email" type="email" spellcheck="false"
                    maxlength="200" autocomplete="email" placeholder="${esc(f.emailPlaceholder)}">
                </div>
              </div>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="rf-comment">${esc(rf.comment)}</label>
                  <textarea class="field__input field__input--area" id="rf-comment" name="comment" rows="4"
                    required maxlength="2000" placeholder="${esc(rf.commentPlaceholder)}"
                    aria-describedby="rf-comment-error"></textarea>
                  <p class="field__error" id="rf-comment-error" data-message="${esc(rf.errorComment)}"></p>
                </div>
              </div>
              <div class="form__foot">
                <button class="btn btn--primary" type="submit" data-submit
                  data-idle="${esc(rf.submit)}" data-busy="${esc(rf.sending)}">${esc(rf.submit)}</button>
                <p class="form__privacy">${f.privacy.replace('{href}', `/${c.lang}/privacy/`)}</p>
              </div>
              <p class="form__status" data-form-status role="status" aria-live="polite"
                data-success="${esc(rf.success)}" data-error="${esc(f.error)}" data-invalid="${esc(rf.invalid)}"></p>
            </form>`;
}

/* Reading reviews and writing one are two separate pages on purpose: the list
   stays a list, and the form gets a page of its own. */
function reviewsPageBody({ c, site }) {
  return `<section class="section section--dark">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.reviews.eyebrow)}</p>
            <h1 class="h-section">${esc(c.reviews.title)}</h1>
            <p class="lede">${esc(c.reviews.lede)}</p>
          </div>
          <div class="btn-row reviews-actions" data-reveal>
            <a class="btn btn--ghost" href="${esc(site.leaveReviewPath[c.lang])}">${esc(c.reviews.leaveCta)}${ARROW_ICON}</a>
          </div>
          <div class="reviews-grid" data-google-reviews>
            ${reviewCards(c)}
          </div>
        </div>
        ${googleReviewTemplate(c)}
      </section>`;
}

/* Cloned by main.js for each review the Google Places proxy returns. Keeping
   the markup here means the star and logo SVGs stay in one place, and the
   script only ever sets text — never HTML — from Google's response. */
function googleReviewTemplate(c) {
  return `<template data-google-review-template>
          <article class="review-card review-card--google">
            <div class="review-card__stars" role="img" data-stars>${starRating(0)}</div>
            <p class="review-card__body" data-body></p>
            <p class="review-card__meta"><strong data-author></strong> · <span data-date></span></p>
            <a class="review-source" data-link target="_blank" rel="noopener noreferrer"
              title="${esc(c.reviews.googleBadgeTitle)}">${GOOGLE_ICON}<span>${esc(c.reviews.googleBadge)}</span></a>
          </article>
        </template>`;
}

function leaveReviewPageBody({ c, site }) {
  const rf = c.reviews.form;
  return `<section class="section section--dark">
        <div class="shell">
          <div class="btn-row product-detail__back" data-reveal>
            <a class="btn btn--ghost" href="${esc(site.reviewsPath[c.lang])}">${ARROW_BACK_ICON}${esc(c.reviews.backToReviews)}</a>
          </div>
          <div class="section-head leave-review__head" data-reveal>
            <p class="eyebrow">${esc(c.reviews.eyebrow)}</p>
            <h1 class="h-section">${esc(rf.heading)}</h1>
            <p class="lede">${esc(rf.lede)}</p>
          </div>
          <div class="panel review-form" data-reveal data-delay="1">
            ${reviewForm({ c })}
          </div>
        </div>
      </section>`;
}

function wholesaleSection({ c, links }) {
  const href = links.request(c.contact.presets[1].message);
  /* <details>/<summary> — expand/collapse with zero JavaScript, keyboard
     support and screen-reader semantics included by the browser for free. */
  const items = c.wholesale.items
    .map(
      (item, i) => `<details class="accordion__item" data-reveal data-delay="${i}"${i === 0 ? ' open' : ''}>
              <summary class="accordion__summary">
                <span class="card__index">${String(i + 1).padStart(2, '0')}</span>
                <span class="h-card accordion__title">${esc(item.title)}</span>
                <span class="accordion__icon" aria-hidden="true"></span>
              </summary>
              <p class="accordion__body">${esc(item.body)}</p>
            </details>`
    )
    .join('\n            ');

  return `<section class="section section--darker" id="wholesale" aria-labelledby="wholesale-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.wholesale.eyebrow)}</p>
            <h2 class="h-section" id="wholesale-title">${esc(c.wholesale.title)}</h2>
            <p class="lede">${esc(c.wholesale.lede)}</p>
          </div>
          <div class="accordion">
            ${items}
          </div>
          <div class="btn-row" data-reveal>
            <a class="btn btn--primary" href="${esc(href)}"${externalAttrs(links, href)}>${esc(c.wholesale.cta)}${ARROW_ICON}</a>
          </div>
        </div>
      </section>`;
}

function aboutSection({ c, assets }) {
  const people = c.about.people.map((p) => `<li>${esc(p.name)}</li>`).join('\n              ');
  const peopleRole = c.about.peopleRole
    ? `<p class="people__role">${esc(c.about.peopleRole)}</p>`
    : '';
  const commitments = c.about.commitments
    .map(
      (item) => `<li><strong>${esc(item.title)}.</strong> ${esc(item.body)}</li>`
    )
    .join('\n              ');
  const tagline = c.about.tagline
    ? `<p class="about__tagline">${esc(c.about.tagline)}</p>`
    : '';
  return `<section class="section section--light" id="about" aria-labelledby="about-title">
        <div class="shell split">
          <div class="about__figure--sticky" data-reveal>
            <figure class="about__figure">
              <div class="about__media" data-media>
                <img src="${assetVersion('assets/img/team.jpg')}" alt="${esc(c.about.photoAlt)}"
                  width="1800" height="1014" loading="lazy" decoding="async">
                <div class="about__fallback" aria-hidden="true">
                  <img src="${assetVersion('assets/img/logo.webp')}" alt="" width="900" height="440"
                    srcset="${assetVersion('assets/img/logo-540.webp')} 540w, ${assetVersion('assets/img/logo.webp')} 900w"
                    sizes="260px" loading="lazy">
                  <p>${esc(c.about.photoCaption)}</p>
                </div>
              </div>
              <figcaption class="about__caption">${esc(c.about.photoCaption)}</figcaption>
            </figure>
          </div>
          <div data-reveal data-delay="1">
            <p class="eyebrow">${esc(c.about.eyebrow)}</p>
            <h2 class="h-section" id="about-title">${esc(c.about.title)}</h2>
            ${c.about.body.map((p) => `<p class="body-text">${esc(p)}</p>`).join('\n            ')}
            <ul class="people">
              ${people}
            </ul>
            ${peopleRole}
            <ul class="commitments">
              ${commitments}
            </ul>
            ${tagline}
          </div>
        </div>
      </section>`;
}

function purposeSection({ c }) {
  /* <dl> rather than a card grid: the three statements differ a lot in
     length, and term/description keeps the label bound to its statement
     for screen readers without inventing headings for them. */
  const pillars = c.purpose.pillars
    .map(
      (item, i) => `<div class="pillars__item" data-reveal data-delay="${i}">
              <dt class="pillars__label">${esc(item.label)}</dt>
              <dd class="pillars__text${item.lead ? ' pillars__text--lead' : ''}">${esc(item.body)}</dd>
            </div>`
    )
    .join('\n            ');

  return `<section class="section section--light-alt" id="purpose" aria-labelledby="purpose-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.purpose.eyebrow)}</p>
            <h2 class="h-section" id="purpose-title">${esc(c.purpose.title)}</h2>
          </div>
          <dl class="pillars">
            ${pillars}
          </dl>
        </div>
      </section>`;
}

function contactSection({ c, links, assets }) {
  const ch = c.contact.channels;
  const f = c.contact.form;

  const card = (key, href, i) => {
    const inner = `<span class="channel__icon">${renderChannelIcon(key)}</span>
                <h3 class="h-card"><span class="visually-hidden">${esc(ch[key].label)}</span></h3>
                <p>${esc(ch[key].body)}</p>
                <span class="channel__action">${esc(href ? ch[key].action : c.contact.unconfigured)}</span>`;
    return href
      ? `<a class="channel" href="${esc(href)}"${externalAttrs(links, href)} data-reveal data-delay="${i}">${inner}</a>`
      : `<div class="channel channel--pending" data-reveal data-delay="${i}">${inner}</div>`;
  };

  const cards = [
    card('whatsapp', links.whatsapp(c.contact.presets[0].message), 0),
    card('instagram', links.hasInstagram ? links.instagram : null, 1),
  ].join('\n              ');

  /* Posts to the site's own endpoint, so it works with JavaScript disabled;
     main.js upgrades it to an inline submit when JavaScript is available. */
  const form = `<form class="form" action="/api/contact" method="post" data-contact-form novalidate>
              <input type="hidden" name="lang" value="${c.lang}">
              <p class="form__trap" aria-hidden="true">
                <label>${esc(f.name)}<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
              </p>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="cf-name">${esc(f.name)}</label>
                  <input class="field__input" id="cf-name" name="name" type="text" required
                    maxlength="120" autocomplete="name" placeholder="${esc(f.namePlaceholder)}"
                    aria-describedby="cf-name-error">
                  <p class="field__error" id="cf-name-error" data-message="${esc(f.errorName)}"></p>
                </div>
              </div>
              <div class="form__row form__row--split">
                <div class="field">
                  <label class="field__label" for="cf-email">${esc(f.email)}</label>
                  <input class="field__input" id="cf-email" name="email" type="email" spellcheck="false"
                    maxlength="200" autocomplete="email" placeholder="${esc(f.emailPlaceholder)}"
                    aria-describedby="cf-contact-hint cf-contact-error">
                </div>
                <div class="field">
                  <label class="field__label" for="cf-phone">${esc(f.phone)} <span class="field__hint">${esc(f.optional)}</span></label>
                  <input class="field__input" id="cf-phone" name="phone" type="tel"
                    maxlength="60" autocomplete="tel" placeholder="${esc(f.phonePlaceholder)}"
                    aria-describedby="cf-contact-hint cf-contact-error">
                </div>
              </div>
              <p class="field__note" id="cf-contact-hint">${esc(f.contactHint)}</p>
              <p class="field__error" id="cf-contact-error" data-message="${esc(f.errorContact)}"></p>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="cf-message">${esc(f.message)}</label>
                  <textarea class="field__input field__input--area" id="cf-message" name="message" rows="5"
                    required maxlength="4000" placeholder="${esc(f.messagePlaceholder)}"
                    aria-describedby="cf-message-error"></textarea>
                  <p class="field__error" id="cf-message-error" data-message="${esc(f.errorMessage)}"></p>
                </div>
              </div>
              <div class="form__foot">
                <button class="btn btn--primary" type="submit" data-submit
                  data-idle="${esc(f.submit)}" data-busy="${esc(f.sending)}">${esc(f.submit)}</button>
                <p class="form__privacy">${f.privacy.replace('{href}', `${assets}${c.lang}/privacy/`)}</p>
              </div>
              <p class="form__status" data-form-status role="status" aria-live="polite"
                data-success="${esc(f.success)}" data-error="${esc(f.error)}" data-invalid="${esc(f.invalid)}"></p>
            </form>`;

  return `<section class="section section--dark" id="contact" aria-labelledby="contact-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.contact.eyebrow)}</p>
            <h2 class="h-section" id="contact-title">${esc(c.contact.title)}</h2>
            <p class="lede">${esc(c.contact.lede)}</p>
          </div>
          <div class="contact-grid">
            <div class="panel contact-form" data-reveal>
              <h3 class="contact-form__heading">${esc(f.heading)}</h3>
              <p class="contact-form__lede">${esc(f.lede)}</p>
              ${form}
            </div>
            <div class="contact-aside" data-reveal data-delay="1">
              <p class="presets__heading">${esc(c.contact.channelsHeading)}</p>
              <div class="channels channels--stacked">
              ${cards}
              </div>
              <div class="facts facts--aside">
                <div>
                  <p class="fact__label">${esc(c.contact.locationLabel)}</p>
                  <p class="fact__value">${esc(c.contact.location)}</p>
                </div>
                <div>
                  <p class="fact__label">${esc(c.contact.hoursLabel)}</p>
                  <p class="fact__value">${esc(c.contact.hours)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
}

/* ---------------------------------------------------------------- pages */
export const INLINE_BOOT = "document.documentElement.className=document.documentElement.className.replace('no-js','js');";

export function renderPage(options) {
  const { c, site, assets, links } = options;
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
${head(options)}
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader(options)}
    <main id="main">
      ${heroSection({ c })}
      ${servicesSection({ c, links })}
      ${catalogSection({ c, site, assets })}
      ${reviewsTeaserSection({ c, site })}
      ${wholesaleSection({ c, links })}
      ${aboutSection({ c, assets })}
      ${purposeSection({ c })}
      ${contactSection({ c, links, assets })}
    </main>
    ${siteFooter({ ...options })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

export function renderNotFound({ contents, site, ogImage }) {
  const blocks = contents
    .map(
      (c) => `<section class="shell error-page__block" lang="${c.lang}">
        <p class="eyebrow eyebrow--center">${esc(c.brand.name)}</p>
        <h1 class="h-section error-page__title">${esc(c.notFound.title)}</h1>
        <p>${esc(c.notFound.body)}</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="/${c.lang}/">${esc(c.notFound.cta)}${ARROW_ICON}</a>
          <a class="btn btn--ghost" href="/${c.lang}/#contact">${esc(c.notFound.cta2)}</a>
        </div>
      </section>`
    )
    .join('\n      ');

  return `<!doctype html>
<html lang="en" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Page not found | ${esc(site.legalName)}</title>
    <meta name="description" content="The page you were looking for is not available.">
    <meta name="robots" content="noindex, follow">
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="error-page">
      <div>
        <img src="${assetVersion('assets/img/logo.webp')}" alt="${esc(site.legalName)}" width="900" height="440">
        <p class="error-page__code">404</p>
      ${blocks}
      </div>
    </main>
  </body>
</html>
`;
}

export function renderGateway({ contents, site, ogImage, alternates }) {
  const links = contents
    .map(
      (c, i) =>
        `<a class="btn ${i === 0 ? 'btn--primary' : 'btn--ghost'}" href="/${c.lang}/" hreflang="${c.lang}" lang="${c.lang}">${esc(
          site.languages.find((l) => l.code === c.lang).label
        )}</a>`
    )
    .join('\n          ');

  return `<!doctype html>
<html lang="en" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(site.legalName)} — Miami, Florida</title>
    <meta name="description" content="${esc(contents[0].meta.description)}">
    <meta name="robots" content="noindex, follow">
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="manifest" href="/site.webmanifest">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(contents[0].meta.title)}">
    <meta property="og:description" content="${esc(contents[0].meta.description)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="gate">
      <div>
        <img src="${assetVersion('assets/img/logo.webp')}" alt="${esc(site.legalName)}" width="900" height="440">
        <p lang="en">Choose your language</p>
        <p lang="es" class="gate__alt">Elige tu idioma</p>
        <div class="gate__links">
          ${links}
        </div>
      </div>
    </main>
    <script src="${assetVersion('assets/js/lang-redirect.js')}" defer></script>
  </body>
</html>
`;
}

export function renderSent({ c, site, ogImage, links, path }) {
  const wa = links.whatsapp(c.contact.presets[0].message);
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(c.sent.title)}</title>
    <meta name="description" content="${esc(c.sent.body)}">
    <meta name="robots" content="noindex, follow">
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="canonical" href="${esc(site.origin.replace(/\/$/, '') + path)}">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="error-page">
      <div>
        <img src="${assetVersion('assets/img/logo.webp')}" alt="${esc(site.legalName)}" width="900" height="440">
        <h1>${esc(c.sent.heading)}</h1>
        <p>${esc(c.sent.body)}</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="/${c.lang}/">${esc(c.sent.cta)}${ARROW_ICON}</a>
          ${wa ? `<a class="btn btn--ghost" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(c.sent.cta2)}</a>` : ''}
        </div>
      </div>
    </main>
  </body>
</html>
`;
}

function legalPage({ c, site, assets, doc }) {
  const d = c.legal[doc];
  return `<article class="legal">
      <div class="shell legal__shell">
        <p class="legal__updated">${esc(d.updated)}</p>
        <h1 class="h-section legal__title">${esc(d.heading)}</h1>
        <p class="lede legal__intro">${esc(d.intro)}</p>
        ${d.sections
          .map(
            (s) => `<section class="legal__section">
          <h2>${esc(s.h)}</h2>
          ${s.p.map((para) => `<p>${esc(para)}</p>`).join('\n          ')}
        </section>`
          )
          .join('\n        ')}
      </div>
    </article>`;
}

export function renderLegal({ c, site, assets, links, alternates, langHrefs, canonical, ogImage, doc }) {
  const d = c.legal[doc];
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(d.title)}</title>
    <meta name="description" content="${esc(d.metaDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
    <link rel="manifest" href="${assets}site.webmanifest">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(d.title)}">
    <meta property="og:description" content="${esc(d.metaDescription)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader({ c, site, assets, langHrefs })}
    <main id="main" class="legal-page">
      ${legalPage({ c, site, assets, doc })}
    </main>
    ${siteFooter({ c, site, assets, links, langHrefs })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

export function renderCatalogPage({ c, site, assets, links, alternates, langHrefs, canonical, ogImage }) {
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(c.catalog.pageTitle)}</title>
    <meta name="description" content="${esc(c.catalog.pageMetaDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
    <link rel="manifest" href="${assets}site.webmanifest">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(c.catalog.pageTitle)}">
    <meta property="og:description" content="${esc(c.catalog.pageMetaDescription)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader({ c, site, assets, langHrefs })}
    <main id="main">
      ${catalogPageBody({ c, site })}
    </main>
    ${siteFooter({ c, site, assets, links, langHrefs })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

export function renderReviewsPage({ c, site, assets, links, alternates, langHrefs, canonical, ogImage }) {
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(c.reviews.pageTitle)}</title>
    <meta name="description" content="${esc(c.reviews.pageMetaDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
    <link rel="manifest" href="${assets}site.webmanifest">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(c.reviews.pageTitle)}">
    <meta property="og:description" content="${esc(c.reviews.pageMetaDescription)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader({ c, site, assets, langHrefs })}
    <main id="main">
      ${reviewsPageBody({ c, site })}
    </main>
    ${siteFooter({ c, site, assets, links, langHrefs })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

export function renderLeaveReviewPage({ c, site, assets, links, alternates, langHrefs, canonical, ogImage }) {
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(c.reviews.leavePageTitle)}</title>
    <meta name="description" content="${esc(c.reviews.leavePageMetaDescription)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
    <link rel="manifest" href="${assets}site.webmanifest">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(c.reviews.leavePageTitle)}">
    <meta property="og:description" content="${esc(c.reviews.leavePageMetaDescription)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader({ c, site, assets, langHrefs })}
    <main id="main">
      ${leaveReviewPageBody({ c, site })}
    </main>
    ${siteFooter({ c, site, assets, links, langHrefs })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

export function renderProductPage({ c, site, assets, links, alternates, langHrefs, canonical, ogImage, product, categoryLabel }) {
  const title = `${product.name} — ${c.brand.name}`;
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(product.description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta name="theme-color" content="#070b14">
    <meta name="color-scheme" content="dark">
    <link rel="icon" href="${assetVersion('assets/img/favicon.png')}" type="image/png">
    <link rel="apple-touch-icon" href="${assetVersion('assets/img/apple-touch-icon.png')}">
    <link rel="manifest" href="${assets}site.webmanifest">
    <meta property="og:type" content="product">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(product.description)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(site.origin.replace(/\/$/, ''))}${assetVersion(`assets/img/catalog/${product.image}.webp`)}">
    <link rel="preload" href="${assetVersion('assets/fonts/geist-variable.woff2')}" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="${assetVersion('assets/css/styles.css')}">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <a class="skip-link" href="#main">${esc(c.a11y.skip)}</a>
    ${siteHeader({ c, site, assets, langHrefs })}
    <main id="main">
      ${productDetailBody({ c, site, product, categoryLabel })}
    </main>
    ${siteFooter({ c, site, assets, links, langHrefs })}
    <script src="${assetVersion('assets/js/main.js')}" defer></script>
  </body>
</html>
`;
}

