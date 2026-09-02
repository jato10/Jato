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
│   └── content/{en,es,site}.json   all copy and configuration
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
| `channels.instagram` | Full profile URL | Instagram card, footer link, `sameAs` structured data |

No email address appears anywhere on the site: enquiries go through the contact
form instead (see below). A channel left empty is **not** faked: its card renders in a muted
"Details coming shortly" state, the pre-written message buttons are hidden, and
the call-to-action buttons fall back to scrolling to the contact section. The
site is honest and fully usable in either state.

## The two brand assets

* **Logo** — the brand artwork, cut out of its dark backdrop with a luminance
  matte so it sits on any of the site's dark surfaces: `logo.webp` (full lockup,
  900px), `logo-mark.webp` (monogram and arc, for the header), `favicon.png`,
  `icon-512.png`, `apple-touch-icon.png` and the social `og.png`. These are the
  only logo files the site uses. WebP keeps the lockup at 88 kB against 340 kB
  as PNG, with the transparency intact.
* **Team photograph** — drop the final edited photo of Javier Rafael Torres Gil and
  Yudenis V. M. at **`public/assets/img/team.jpg`** (landscape, ~1600×1000 or larger,
  both people fully in frame). Until that file exists, the About section shows a
  branded panel instead of a broken image; no rebuild is needed after adding it.


## The contact form

The contact section carries a form rather than a public address, so no inbox is
exposed to spam harvesters. It posts to `/api/contact`, a Vercel function at the
repository root (`api/contact.js`) that relays the message by email through
[Resend](https://resend.com).

**Environment variables** — set these in the Vercel project (Settings →
Environment Variables), for Production and Preview:

| Variable | Required | What it is |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from resend.com (the free tier is enough to start) |
| `CONTACT_TO` | yes | Address that receives the enquiries. Never sent to the browser, so it can be a personal inbox. |
| `CONTACT_FROM` | no | Verified sender, e.g. `Global Beyond LLC <hola@globalbeyondllc.com>`. Without it the function uses Resend's shared sender, which only delivers to the Resend account owner — fine for testing, worth setting for production. |

Until `RESEND_API_KEY` and `CONTACT_TO` exist the form returns an error and the
visitor is pointed at WhatsApp; nothing else on the site is affected.

**How it behaves**

* Without JavaScript the browser posts the form normally and the function
  redirects to `/en/message-sent/` or `/es/mensaje-enviado/` — real pages, built
  from the same content files and excluded from indexing.
* With JavaScript it submits in place and shows the result inline, keeping the
  visitor on the page.
* The function requires a name, a message, and either an email or a phone
  number; it caps every field, validates the address before using it as
  `Reply-To`, and silently accepts submissions that fill the hidden honeypot
  field so bots get no feedback.
* Same-origin, so the strict `form-action 'self'` and `connect-src 'self'`
  directives in the CSP need no loosening.

## Build and deploy

```bash
cd site
npm run build     # renders public/ — no dependencies to install
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
