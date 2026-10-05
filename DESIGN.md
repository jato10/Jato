# Global Beyond LLC — Design

Static, bilingual (ES/EN) marketing site. Source of truth for markup is
`site/src/template.mjs`; copy lives in `site/src/content/{en,es,site}.json`;
styles in `site/public/assets/css/styles.css`. Run `node site/src/build.mjs`
after any change — Vercel serves the committed `site/public/` as-is.

## Design decisions

**Thesis.** Navy and silver, used with discipline. A mobile visitor arrives with
one question — *what do you sell and how do I order it?* — and the first screen
answers it: a concrete headline, real products with real prices, one primary
button. Everything after supports that decision. Section order is fixed (the
header and footer navigation mirror it).

**Primary action per page**

| Page | Primary action | Secondary |
| --- | --- | --- |
| Home | See catalog & prices | WhatsApp |
| Catalog | Open a product | WhatsApp (ask about a product) |
| Product | Place the order (opens the order form) | Back to catalog |
| Product, sold out | Ask to be notified (WhatsApp) | Back to catalog |
| Reviews | Read; "Leave my review" is secondary | — |

On phones, home and catalog carry a fixed action bar once the hero's own
buttons scroll out of view. It hides while the contact section is on screen or
a form field has focus, so it never covers the thing it points to.

**Palette** (tokens in `:root`; contrast measured, WCAG 2.x)

| Role | Token | Value | Contrast |
| --- | --- | --- | --- |
| Ground, deepest | `--ink-950` | `#04070e` | — |
| Ground, dark | `--ink-900` | `#070b14` | on-dark 18.1:1 |
| Surface, dark | `--ink-800` / `--ink-700` | `#0d1523` / `#131d2e` | dim text 6.3 / 5.8:1 |
| Text on dark | `--on-dark` / `-muted` / `-dim` | `#f2f6fb` / `#b3c1d1` / `#8a99ac` | 18.1 / 10.8 / 6.8:1 |
| Ground, light | `--paper-100` / `--paper-200` | `#f5f5f7` / `#ececec` | on-light 17.0:1 |
| Text on light | `--on-light` / `-muted` / `--slate-500` | `#0c1420` / `#4a5768` / `#5b6b7d` | 17.0 / 6.8 / 5.0:1 |
| Link | dark `#a9c9ee`, light `#1d4d80` | | 11.5 / 8.0:1 |

Silver lives in the logo and the primary button gradient only. It is not used
as gradient text. `--slate-400` (3.2:1 on paper) is for borders and focus
outlines, never for text.

**Type.** Geist variable, self-hosted (`assets/fonts/geist-variable.woff2`) —
the brand face, legible at small sizes in Spanish, no reason to change. Ten
steps, every `font-size` is `var(--fs-*)`: display, hero, title, head, sub,
lede, body (16px), ui (15px), detail (14px), label (12px). Headings are
600 weight with negative tracking that shrinks as size shrinks; uppercase
labels share one tracking (`--ls-label`). Body measure ≤ 65ch. Nothing meant to
be read is under 14px; the 12px step is reserved for uppercase form labels and
the footer.

**Spacing.** One scale, `--space-1…10` (4, 8, 12, 16, 24, 32, 48, 64, 96, 128px).
Section padding is `--section-y`, which is tighter on phones than before.
Related things sit close; sections are separated generously; there is more
space above a heading than below it.

**Shape and depth.** Radii `--radius-sm/md/lg` (10/16/24) and pills (999px) for
buttons and chips. Two shadows only, `--shadow-1` (resting card) and
`--shadow-2` (lifted), both with offset and blur — no coloured halos, no hard
offsets. Borders are 1px `--line-*`.

**What was removed and why**
- Eyebrow labels above section titles: each repeated the nav label or the
  heading below it.
- Gradient text on the hero title.
- Decorative 01–04 numbering on the wholesale accordion (the real sequence in
  "How it works" keeps its numbers).
- The identical fade-up on every section. One authored entrance remains: the
  hero. Cards and lists keep a short stagger only where content arrives in
  groups.

**Motion.** Every animation explains a state change or acknowledges an action.
Press feedback 100ms; hover/colour 150–250ms; larger transitions ≤ 400ms;
`--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`) for entrances. Only `transform`
and `opacity` are animated. `prefers-reduced-motion` removes movement and keeps
colour/opacity changes. With JavaScript off, everything is visible.

**Interaction states.** Every control has hover (gated to `(hover: hover)`),
`:focus-visible` (2px outline, 3:1 against its ground), pressed (`scale`),
disabled and busy. Forms show inline error text, a status line, and a success
state. Touch targets are ≥ 44px. `::selection`, `caret-color`, scrollbars and
the focus ring are themed from the palette.

**Accessibility preferences.** `prefers-reduced-motion`,
`prefers-reduced-transparency` and `prefers-contrast: more` are handled in
`styles.css`.

## Verified product facts (source: file path)

| Fact | Value | Source |
| --- | --- | --- |
| Legal name | Global Beyond LLC | `site/src/content/site.json` (`legalName`) |
| Location | Miami, Florida, United States | `site.json` (`foundingLocation`), `es.json` (`contact.location`) |
| Founders | Javier Rafael Torres Gil; Yudenis V. Martínez | `es.json` / `en.json` (`about.people`) |
| WhatsApp | +1 786-334-4556 | `site.json` (`channels.whatsapp`) |
| Instagram | https://www.instagram.com/globalbeyondllc/ | `site.json` (`channels.instagram`) |
| Languages | Spanish (`/es/`), English (`/en/`) | `site.json` (`languages`) |
| Reply time | "normally within one business day" | `contact.hours` in `en.json` / `es.json` |
| Offer | Retail, wholesale, B2B catalog | `services.items` in `en.json` / `es.json` |
| Catalog | 10 products in 3 categories (Beauty, Gaming & Entertainment, Kitchen Appliances); 3 marked sold out | `catalog.categories` in `en.json` / `es.json` |
| Payments | Method is a preference sent with the order; PayPal / Zelle links hidden until real handles are set | `site.json` (`payments`), `template.mjs` (`paymentLinks`) |
| Analytics | Vercel Web Analytics + Speed Insights, same origin, no cookies | `template.mjs` (`OBSERVABILITY`), privacy policy |

**Not in the repo, so not on the site:** iPhone resale, Venezuela or Táchira
delivery, Walmart Marketplace / WFS, Amazon FBA, delivery times, warranties,
business hours, customer logos, statistics, certifications.

**Open items:** real customer reviews (current ones were written for the site);
real PayPal / Zelle handles; business hours; Google Business reviews (needs
`GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID` in Vercel).
