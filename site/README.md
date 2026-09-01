# Global Beyond LLC — website

Static, bilingual (English / Spanish) marketing site. No framework, no runtime
dependencies, no third-party requests: everything the browser loads is served
from this folder.

```
site/
├── public/              ← deploy this folder
│   ├── index.html            language gateway (noindex, redirects once)
│   ├── en/index.html         English site
│   ├── es/index.html         Spanish site
│   ├── 404.html              bilingual not-found page
│   ├── robots.txt, sitemap.xml, site.webmanifest, _headers
│   └── assets/{css,js,img}
├── src/
│   ├── build.mjs             renders every page from content + template
│   ├── template.mjs          the HTML (one source for both languages)
│   ├── content/{en,es,site}.json   all copy and configuration
│   └── brand/make-logo.mjs   regenerates the logo SVGs from glyph outlines
└── (../vercel.json)     written at the repository root by the build
```

The build writes `vercel.json` at the **repository root**, not inside `site/`:
Vercel reads it from the root of the deployed repository, and its
`outputDirectory: "site/public"` is what points the deployment at this folder,
so no Root Directory has to be set in the Vercel dashboard. Empty build and
install commands mark the folder as pre-built static output.

## Before going live — three things to fill in

Everything below lives in **`src/content/site.json`**. Run `npm run build`
afterwards and the whole site picks the values up (header, hero, contact cards,
quick-message buttons, footer, structured data, sitemap).

| Field | What to put there | What it turns on |
| --- | --- | --- |
| `origin` | The final domain, e.g. `https://globalbeyondllc.com` | canonical URLs, `hreflang`, sitemap, social preview URLs |
| `channels.whatsapp` | Business number in international format, digits only (e.g. `13055550123`) | WhatsApp card, every "request the catalog" button, pre-written messages |
| `channels.email` | Public business address | Email card, footer link, `contactPoint` structured data |
| `channels.instagram` | Full profile URL | Instagram card, footer link, `sameAs` structured data |

A channel left empty is **not** faked: its card renders in a muted
"Details coming shortly" state, the pre-written message buttons are hidden, and
the call-to-action buttons fall back to scrolling to the contact section. The
site is honest and fully usable in either state.

## The two brand assets

* **Logo** — `public/assets/img/logo.svg` (full lockup), `logo-mark.svg` (monogram),
  `favicon.svg`, plus generated `og.png`, `icon-512.png`, `apple-touch-icon.png`.
  These are the only logo files the site uses. They are real vector outlines, so
  they stay sharp at any size and need no webfont. Regenerate with `npm run brand`
  (requires `opentype.js`; the source faces live in `src/brand/`).
* **Team photograph** — drop the final edited photo of Javier Rafael Torres Gil and
  Yudenis V. M. at **`public/assets/img/team.jpg`** (landscape, ~1600×1000 or larger,
  both people fully in frame). Until that file exists, the About section shows a
  branded panel instead of a broken image; no rebuild is needed after adding it.

## Build and deploy

```bash
cd site
npm install       # only needed to regenerate the logo
npm run build     # renders public/
```

Deploy `site/public` as a static site. On Vercel the root `vercel.json` does
this for you; on Netlify or Cloudflare Pages set the publish directory to
`site/public` with no build command. `_headers` (Netlify / Cloudflare Pages)
and the root `vercel.json` both set Content-Security-Policy, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy, X-Frame-Options and HSTS, plus long-lived
caching for `/assets/*`. The CSP allows only same-origin resources and the one
inline bootstrap script, which is pinned by SHA-256 hash — if you edit that
snippet in `template.mjs`, re-run the build so the hash is regenerated.

## Editing copy

All text is in `src/content/en.json` and `src/content/es.json`, key for key.
Both languages are rendered from the same template, so a section can never exist
in one language and be missing from the other. Keep the claims as they are:
no invented products, prices, delivery times, warranties, partners, awards or
customer counts — the company confirms those individually per request.

## Accessibility and resilience notes

* Nothing depends on JavaScript: with JS off, all copy is visible, the navigation
  is a plain list, and every link works.
* `prefers-reduced-motion: reduce` removes all animation and reveals.
* Skip link, visible focus rings, ≥44px touch targets, labelled landmarks,
  `aria-current` on the active language, Escape-to-close on the mobile menu.
* Text contrast is AA or better against its background.
