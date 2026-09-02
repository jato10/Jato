/* HTML templates for the Global Beyond LLC site.
   One source of truth for both languages, so EN and ES can never drift apart. */

export const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const attr = (name, value) => (value ? ` ${name}="${esc(value)}"` : '');

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
function head({ c, site, assets, alternates, canonical, ogImage, noindex, jsonLd }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : '<meta name="robots" content="index, follow, max-image-preview:large">\n'}<link rel="canonical" href="${esc(canonical)}">
${alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
<meta name="theme-color" content="#070b14">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${assets}assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="${assets}assets/img/apple-touch-icon.png">
<link rel="manifest" href="${assets}site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.legalName)}">
<meta property="og:locale" content="${esc(c.locale)}">
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
<link rel="stylesheet" href="${assets}assets/css/styles.css">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}`;
}

/* ------------------------------------------------------------- header */
function siteHeader({ c, site, assets, langHrefs }) {
  const navItems = c.nav
    .map(
      (item) =>
        `<li><a class="nav__link" data-nav-link href="#${item.id}">${esc(item.label)}</a></li>`
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
          <img src="${assets}assets/img/logo-mark.webp" alt="" width="420" height="166" decoding="async">
          <span class="brand__name">${esc(site.legalName)}</span>
        </a>
        <nav class="nav" data-nav aria-label="${esc(c.a11y.primaryNav)}">
          <ul class="nav__list">
            ${navItems}
          </ul>
          <a class="btn btn--primary btn--small nav__cta" href="#contact">${esc(c.navCta)}</a>
        </nav>
        <div class="header__actions">
          <nav class="lang" aria-label="${esc(c.a11y.langNav)}">
            ${langItems}
          </nav>
          <a class="btn btn--primary btn--small header__cta" href="#contact">${esc(c.navCta)}</a>
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
    .map((item) => `<li><a href="#${item.id}">${esc(item.label)}</a></li>`)
    .join('\n            ');

  const contactLinks = [];
  if (links.hasWhatsapp) {
    contactLinks.push(
      `<li><a href="${esc(links.whatsapp(c.contact.presets[0].message))}" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>`
    );
  }
  if (links.hasInstagram) {
    contactLinks.push(
      `<li><a href="${esc(links.instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a></li>`
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
            <img src="${assets}assets/img/logo.webp" alt="${esc(site.legalName)}" width="900" height="440" loading="lazy" decoding="async">
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
          <p>&copy; <span data-year>${new Date().getFullYear()}</span> ${esc(site.legalName)}. ${esc(c.footer.rights)}</p>
        </div>
      </div>
    </footer>`;
}

/* ------------------------------------------------------------- sections */
function heroSection({ c, assets, links }) {
  const primary = links.request(c.contact.presets[0].message);
  return `<section class="hero" aria-labelledby="hero-title">
        <div class="hero__bg" aria-hidden="true"></div>
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__grid" aria-hidden="true"></div>
        <div class="shell hero__inner">
          <img class="hero__logo" src="${assets}assets/img/logo.webp" width="900" height="440"
            alt="${esc(c.brand.name)}" fetchpriority="high" decoding="async" data-reveal>
          <p class="eyebrow hero__eyebrow" data-reveal data-delay="1">${esc(c.hero.eyebrow)}</p>
          <h1 class="h-display" id="hero-title" data-reveal data-delay="2">${c.hero.title}</h1>
          <p class="lede" data-reveal data-delay="3">${esc(c.hero.lede)}</p>
          <div class="btn-row" data-reveal data-delay="4">
            <a class="btn btn--primary" href="${esc(primary)}"${externalAttrs(links, primary)}>${esc(c.hero.ctaPrimary)}</a>
            <a class="btn btn--ghost" href="#contact">${esc(c.hero.ctaSecondary)}</a>
          </div>
          <p class="hero__note" data-reveal data-delay="5">${esc(c.hero.note)}</p>
        </div>
        <span class="hero__scroll" aria-hidden="true"></span>
      </section>`;
}

function servicesSection({ c }) {
  const cards = c.services.items
    .map(
      (item, i) => `<article class="card" data-reveal data-delay="${i}">
              <span class="card__rule" aria-hidden="true"></span>
              <h3 class="h-card">${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
            </article>`
    )
    .join('\n            ');

  return `<section class="section section--light" id="services" aria-labelledby="services-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.services.eyebrow)}</p>
            <h2 class="h-section" id="services-title">${esc(c.services.title)}</h2>
            <p class="lede">${esc(c.services.lede)}</p>
          </div>
          <div class="grid grid--3">
            ${cards}
          </div>
        </div>
      </section>`;
}

function processSection({ c }) {
  const steps = c.process.steps
    .map(
      (step, i) => `<li class="step" data-reveal>
              <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
              <h3 class="h-card">${esc(step.title)}</h3>
              <p class="step__body">${esc(step.body)}</p>
            </li>`
    )
    .join('\n            ');

  return `<section class="section section--dark" id="process" aria-labelledby="process-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.process.eyebrow)}</p>
            <h2 class="h-section" id="process-title">${esc(c.process.title)}</h2>
            <p class="lede">${esc(c.process.lede)}</p>
          </div>
          <ol class="steps">
            ${steps}
          </ol>
        </div>
      </section>`;
}

function catalogSection({ c, links }) {
  const href = links.request(c.contact.presets[0].message);
  return `<section class="section section--light-alt" id="catalog" aria-labelledby="catalog-title">
        <div class="shell split split--wide-first">
          <div data-reveal>
            <p class="eyebrow">${esc(c.catalog.eyebrow)}</p>
            <h2 class="h-section" id="catalog-title">${esc(c.catalog.title)}</h2>
            ${c.catalog.body.map((p) => `<p class="body-text">${esc(p)}</p>`).join('\n            ')}
            <div class="btn-row">
              <a class="btn btn--primary" href="${esc(href)}"${externalAttrs(links, href)}>${esc(c.catalog.cta)}</a>
            </div>
          </div>
          <div class="panel" data-reveal data-delay="1">
            <ul class="ticks ticks--flush">
              ${c.catalog.points.map((p) => `<li>${esc(p)}</li>`).join('\n              ')}
            </ul>
          </div>
        </div>
      </section>`;
}

function wholesaleSection({ c, links }) {
  const href = links.request(c.contact.presets[1].message);
  const items = c.wholesale.items
    .map(
      (item, i) => `<article class="card card--dark" data-reveal data-delay="${i}">
              <span class="card__index">${String(i + 1).padStart(2, '0')}</span>
              <h3 class="h-card">${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
            </article>`
    )
    .join('\n            ');

  return `<section class="section section--darker" id="wholesale" aria-labelledby="wholesale-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.wholesale.eyebrow)}</p>
            <h2 class="h-section" id="wholesale-title">${esc(c.wholesale.title)}</h2>
            <p class="lede">${esc(c.wholesale.lede)}</p>
          </div>
          <div class="grid grid--4">
            ${items}
          </div>
          <div class="btn-row" data-reveal>
            <a class="btn btn--primary" href="${esc(href)}"${externalAttrs(links, href)}>${esc(c.wholesale.cta)}</a>
          </div>
        </div>
      </section>`;
}

function aboutSection({ c, assets }) {
  const people = c.about.people.map((p) => `<li>${esc(p.name)}</li>`).join('\n              ');
  return `<section class="section section--light" id="about" aria-labelledby="about-title">
        <div class="shell split">
          <div data-reveal>
            <figure class="about__figure">
              <div class="about__media" data-media>
                <img src="${assets}assets/img/team.jpg" alt="${esc(c.about.photoAlt)}"
                  width="1800" height="1014" loading="lazy" decoding="async">
                <div class="about__fallback" aria-hidden="true">
                  <img src="${assets}assets/img/logo.webp" alt="" width="900" height="440">
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
          </div>
        </div>
      </section>`;
}

function valuesSection({ c }) {
  const values = c.values.items
    .map(
      (item, i) => `<div class="value" data-reveal data-delay="${i % 3}">
              <h3 class="h-card"><span>${String(i + 1).padStart(2, '0')}</span>${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
            </div>`
    )
    .join('\n            ');

  return `<section class="section section--light-alt" id="values" aria-labelledby="values-title">
        <div class="shell">
          <div class="section-head" data-reveal>
            <p class="eyebrow">${esc(c.values.eyebrow)}</p>
            <h2 class="h-section" id="values-title">${esc(c.values.title)}</h2>
          </div>
          <div class="values">
            ${values}
          </div>
        </div>
      </section>`;
}

function contactSection({ c, links }) {
  const ch = c.contact.channels;
  const f = c.contact.form;

  const card = (key, href, i) => {
    const inner = `<h3 class="h-card">${esc(ch[key].label)}</h3>
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
                    maxlength="120" autocomplete="name" placeholder="${esc(f.namePlaceholder)}">
                </div>
              </div>
              <div class="form__row form__row--split">
                <div class="field">
                  <label class="field__label" for="cf-email">${esc(f.email)}</label>
                  <input class="field__input" id="cf-email" name="email" type="email"
                    maxlength="200" autocomplete="email" placeholder="${esc(f.emailPlaceholder)}">
                </div>
                <div class="field">
                  <label class="field__label" for="cf-phone">${esc(f.phone)} <span class="field__hint">${esc(f.optional)}</span></label>
                  <input class="field__input" id="cf-phone" name="phone" type="tel"
                    maxlength="60" autocomplete="tel" placeholder="${esc(f.phonePlaceholder)}">
                </div>
              </div>
              <p class="field__note" id="cf-contact-hint">${esc(f.contactHint)}</p>
              <div class="form__row">
                <div class="field">
                  <label class="field__label" for="cf-message">${esc(f.message)}</label>
                  <textarea class="field__input field__input--area" id="cf-message" name="message" rows="5"
                    required maxlength="4000" placeholder="${esc(f.messagePlaceholder)}"></textarea>
                </div>
              </div>
              <div class="form__foot">
                <button class="btn btn--primary" type="submit" data-submit
                  data-idle="${esc(f.submit)}" data-busy="${esc(f.sending)}">${esc(f.submit)}</button>
                <p class="form__privacy">${esc(f.privacy)}</p>
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
      ${heroSection({ c, assets, links })}
      ${servicesSection({ c })}
      ${processSection({ c })}
      ${catalogSection({ c, links })}
      ${wholesaleSection({ c, links })}
      ${aboutSection({ c, assets })}
      ${valuesSection({ c })}
      ${contactSection({ c, links })}
    </main>
    ${siteFooter(options)}
    <script src="${assets}assets/js/main.js" defer></script>
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
          <a class="btn btn--primary" href="/${c.lang}/">${esc(c.notFound.cta)}</a>
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
    <link rel="icon" href="/assets/img/favicon.png" type="image/png">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="error-page">
      <div>
        <img src="/assets/img/logo.webp" alt="${esc(site.legalName)}" width="900" height="440">
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
    <link rel="icon" href="/assets/img/favicon.png" type="image/png">
    <link rel="manifest" href="/site.webmanifest">
${alternates.map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`).join('\n')}
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(contents[0].meta.title)}">
    <meta property="og:description" content="${esc(contents[0].meta.description)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="gate">
      <div>
        <img src="/assets/img/logo.webp" alt="${esc(site.legalName)}" width="900" height="440">
        <p lang="en">Choose your language</p>
        <p lang="es" class="gate__alt">Elige tu idioma</p>
        <div class="gate__links">
          ${links}
        </div>
      </div>
    </main>
    <script src="/assets/js/lang-redirect.js" defer></script>
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
    <link rel="icon" href="/assets/img/favicon.png" type="image/png">
    <meta property="og:image" content="${esc(ogImage)}">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script>${INLINE_BOOT}</script>
  </head>
  <body>
    <main class="error-page">
      <div>
        <img src="/assets/img/logo.webp" alt="${esc(site.legalName)}" width="900" height="440">
        <h1>${esc(c.sent.heading)}</h1>
        <p>${esc(c.sent.body)}</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="/${c.lang}/">${esc(c.sent.cta)}</a>
          ${wa ? `<a class="btn btn--ghost" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(c.sent.cta2)}</a>` : ''}
        </div>
      </div>
    </main>
  </body>
</html>
`;
}
