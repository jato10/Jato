/* Builds the static Global Beyond LLC site into site/public/.
   Run: node site/src/build.mjs */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderPage, renderNotFound, renderGateway, makeLinks, INLINE_BOOT } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');
const read = (f) => JSON.parse(fs.readFileSync(path.join(here, 'content', f), 'utf8'));

const site = read('site.json');
const contents = site.languages.map((l) => read(`${l.code}.json`));
const links = makeLinks(site);
const origin = site.origin.replace(/\/$/, '');
const ogImage = `${origin}/assets/img/og.png`;
const assets = '/';

const alternates = [
  ...contents.map((c) => ({ hreflang: c.lang, href: `${origin}/${c.lang}/` })),
  { hreflang: 'x-default', href: `${origin}/${site.defaultLang}/` },
];

const langHrefs = Object.fromEntries(contents.map((c) => [c.lang, `/${c.lang}/`]));

function jsonLdFor(c) {
  const sameAs = links.hasInstagram ? [links.instagram] : [];
  const contactPoint = [];
  if (links.hasEmail) {
    contactPoint.push({
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: links.email,
      availableLanguage: ['en', 'es'],
    });
  }

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: site.legalName,
    legalName: site.legalName,
    url: `${origin}/${c.lang}/`,
    logo: `${origin}/assets/img/logo.svg`,
    image: ogImage,
    description: c.meta.description,
    slogan: c.hero.titlePlain,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.foundingLocation.city,
      addressRegion: site.foundingLocation.region,
      addressCountry: site.foundingLocation.country,
    },
    knowsLanguage: ['en', 'es'],
  };
  if (sameAs.length) organization.sameAs = sameAs;
  if (contactPoint.length) organization.contactPoint = contactPoint;

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/${c.lang}/#website`,
    url: `${origin}/${c.lang}/`,
    name: site.legalName,
    inLanguage: c.lang,
    publisher: { '@id': `${origin}/#organization` },
  };

  return JSON.stringify([organization, website]);
}

/* ------------------------------------------------------------- pages */
let written = [];
const write = (relative, contentsOut) => {
  const target = path.join(publicDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contentsOut);
  written.push(`${relative} (${(Buffer.byteLength(contentsOut) / 1024).toFixed(1)} kB)`);
};

for (const c of contents) {
  write(
    `${c.lang}/index.html`,
    renderPage({
      c,
      site,
      assets,
      links,
      alternates,
      langHrefs,
      canonical: `${origin}/${c.lang}/`,
      ogImage,
      jsonLd: jsonLdFor(c),
    })
  );
}

write('index.html', renderGateway({ contents, site, ogImage, alternates }));
write('404.html', renderNotFound({ contents, site, ogImage }));

/* ------------------------------------------------- language redirect */
write(
  'assets/js/lang-redirect.js',
  `/* Sends first-time visitors at "/" to their language, without trapping anyone.
   The gateway page stays fully usable when this never runs. */
(function () {
  'use strict';
  var supported = ${JSON.stringify(contents.map((c) => c.lang))};
  var fallback = ${JSON.stringify(site.defaultLang)};
  try {
    if (sessionStorage.getItem('gb-lang-gate') === 'seen') return;
    sessionStorage.setItem('gb-lang-gate', 'seen');
  } catch (error) { /* private mode: just redirect once */ }
  var preferred = (navigator.languages || [navigator.language || fallback])
    .map(function (tag) { return String(tag).slice(0, 2).toLowerCase(); })
    .filter(function (tag) { return supported.indexOf(tag) !== -1; })[0] || fallback;
  location.replace('/' + preferred + '/');
})();
`
);

/* -------------------------------------------------------- manifest */
write(
  'site.webmanifest',
  JSON.stringify(
    {
      name: site.legalName,
      short_name: 'Global Beyond',
      description: contents[0].meta.description,
      start_url: `/${site.defaultLang}/`,
      scope: '/',
      display: 'standalone',
      background_color: '#070b14',
      theme_color: '#070b14',
      lang: site.defaultLang,
      icons: [
        { src: '/assets/img/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2
  )
);

/* ------------------------------------------------------- robots/sitemap */
write(
  'robots.txt',
  `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`
);

const today = new Date().toISOString().slice(0, 10);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${contents
  .map(
    (c) => `  <url>
    <loc>${origin}/${c.lang}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
${alternates
  .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
  .join('\n')}
  </url>`
  )
  .join('\n')}
</urlset>
`
);

/* ------------------------------------------------------------ headers */
const bootHash = crypto.createHash('sha256').update(INLINE_BOOT).digest('base64');
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  `script-src 'self' 'sha256-${bootHash}'`,
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

write(
  '_headers',
  `/*
${Object.entries(securityHeaders)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join('\n')}

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
`
);

/* Written at the repository root: Vercel reads vercel.json from the root of the
   deployed repository, and `outputDirectory` is what points it at site/public
   without anyone having to set a Root Directory in the dashboard. Empty build
   and install commands tell Vercel this is pre-built static output. */
fs.writeFileSync(
  path.join(publicDir, '..', '..', 'vercel.json'),
  JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: null,
      buildCommand: '',
      installCommand: '',
      outputDirectory: 'site/public',
      cleanUrls: true,
      trailingSlash: true,
      headers: [
        {
          source: '/(.*)',
          headers: Object.entries(securityHeaders).map(([key, value]) => ({ key, value })),
        },
        {
          source: '/assets/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
      ],
      redirects: [{ source: '/home', destination: `/${site.defaultLang}/`, permanent: false }],
    },
    null,
    2
  ) + '\n'
);

console.log(`Built ${written.length} files:\n  ${written.join('\n  ')}`);
if (!links.hasWhatsapp || !links.hasEmail || !links.hasInstagram) {
  const missing = [
    !links.hasWhatsapp && 'whatsapp',
    !links.hasEmail && 'email',
    !links.hasInstagram && 'instagram',
  ].filter(Boolean);
  console.log(
    `\nNote: contact channels not yet configured in src/content/site.json → ${missing.join(', ')}.` +
      `\nThose cards render in a "being set up" state until the values are filled in.`
  );
}
