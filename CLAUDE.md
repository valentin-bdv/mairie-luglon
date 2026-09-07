# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository actually is

This is a **gabarit de démonstration** (demo template) for a French town-hall (mairie)
website for the commune of Luglon (Landes, 40630), meant to be shown to the mayor as a
proposal. It reuses the visual/interactive system originally built for a *different* site
— the Comité des Fêtes de Luglon (a local festival association) — and its content has
since been fully replaced with generic mairie content (pages, nav, copy, forms). Do not
reintroduce Comité des Fêtes / `cdf-luglon.fr` content or branding; `Arengosse.html` at
the repo root is a real real-world mairie site kept only as a reference/inspiration file
— it is not part of this site and uses none of this repo's CSS/JS.

Addresses, phone numbers, opening hours, and the municipal team listed on
`mairie/equipe-municipale/` are **plausible placeholders**, not real facts about Luglon —
flag this if asked to treat them as authoritative.

`enfance-jeunesse/`, the waste-management part of `vie-pratique/dechets/`,
`vie-pratique/associations/`, `vie-pratique/entreprises/`, the homepage "chiffres" stat
blocks, the "commerces de proximité" section on `vie-pratique/`, and the "Portage de
repas" card on `vie-pratique/ccas-et-seniors/` (see below) are the exceptions: their
content is **real**, sourced from mairie-sabres.fr and coeurhautelande.fr (école
director, class assignments, cantine/périscolaire/transport hours, RPI commune list,
portage de repas eligibility/price/schedule) and from the two Google-Maps place links the
site owner gave directly (point d'apport volontaire in Luglon, déchetterie de Sabres with
its real opening hours). Luglon's school really is part of a regroupement pédagogique
intercommunal (RPI) with Sabres, Commensacq and Trensacq, and Luglon really has no
door-to-door bin collection — only the volontary drop-off point. If this content is
ever revisited, re-verify against those sources rather than assuming it's another
placeholder to relax.

"Portage de repas" on `vie-pratique/ccas-et-seniors/` is a special case worth calling
out — both for its content and its layout. It used to be a third `.value-card` in the
"Bien vieillir à Luglon" rail (too much real-world copy — eligibility + price + schedule
+ a link — for a card sized for one short sentence), then a standalone `.panel` card
(tried once, rejected: a whole card just for this made it look like a bigger deal than
the two short paragraphs already sitting above it). It now lives as a third `<p>` in the
same intro `.prose` block as the CCAS description and the "Permanence" paragraph — same
`<strong>Label :</strong> texte` pattern, no card, no panel, at the top of the page. If
this section is touched again, keep new short facts as prose paragraphs there rather
than reaching for a card — a card has been tried twice now and rejected twice. It's also
honest that the service is **run by Sabres' CCAS, not Luglon's** (6,70 €/repas, 60 ans et
plus/handicap/sortie d'hospitalisation, livraison lundi-samedi, dimanche livré le samedi
— source: `mairie-sabres.fr/Sabres-pratique/Action-sociale-CCAS/Portage-de-repas`), and
links out to that page rather than pretending Luglon runs its own. Don't rewrite it to
sound like a Luglon-run service — that would misrepresent who a resident actually needs
to call.

The PanneauPocket card on `mairie/securite-prevention/` is likewise real: it links to
Luglon's actual PanneauPocket page (`https://app.panneaupocket.com/ville/106279647-luglon-40630`),
the real municipal-alert app the commune uses — not a placeholder URL.

The "Luglon et Sabres en quelques chiffres" `.stats-columns` on `index.html` (population,
superficie, altitude, coordonnées, one `.stats-block` per commune) is also real: population
and superficie come from the `geo.api.gouv.fr` communes API (`?nom=Luglon`/`?nom=Sabres`),
altitude range from published commune fact sheets, coordinates rounded from the API's
`centre` point. If these numbers are ever refreshed, re-query that API rather than
hand-editing — a stale population figure quietly becomes a wrong one after the next census
update lands there.

The RPI map on `enfance-jeunesse/` (`.rpi-map`) draws real roads (D327/D626/D45,
simplified from OpenStreetMap into single-control-point quadratic curves for a constant
stroke width) between the 4 real commune centers (geo.api.gouv.fr), plus a handful of
unlabeled grey `.rpi-map__road-minor` roads for context. If a label and a road ever
visually cross again when this is touched, move the *label* (usually by flipping which
side of its point it sits on) rather than distorting the road's curve to dodge it.

There is no build step, no package manager, and no test suite. It's a static
HTML/CSS/vanilla-JS site. "Running" the site means opening the HTML files directly or
serving the directory with any static file server — there is no dev server command
defined in this repo, and no `CNAME` (no domain is committed to yet).

### Every internal link is `/mairie-luglon/…`, not `/…` — because of GitHub Pages

Every `href`/`src` that points at this site's own pages or assets (nav links, `/styles.css`,
`/nav.js`, `/images/...`, favicon) carries a literal `/mairie-luglon/` prefix — e.g.
`href="/mairie-luglon/vie-pratique/"`, not `href="/vie-pratique/"`. This looks wrong for a
site whose `<link rel="canonical">` and `sitemap.xml`/`robots.txt` all say
`https://mairie-luglon.fr/...` (no prefix) — and it IS wrong for that eventual domain. It's
there because the site is currently viewed at `https://valentin-bdv.github.io/mairie-luglon/`,
a GitHub Pages **project site**: the repo is served under a `/mairie-luglon/` subpath, not
at the origin's root, so a root-relative path like `/styles.css` resolved to
`valentin-bdv.github.io/styles.css` (404) instead of `.../mairie-luglon/styles.css`. Adding
the prefix everywhere fixed that. `<link rel="canonical">` and `sitemap.xml`/`robots.txt`
were deliberately left pointing at the bare `mairie-luglon.fr` domain — those describe the
site's real eventual address, not wherever it happens to be previewed today.

This isn't only an HTML thing: `styles.css`'s own `@font-face` `src: url(...)` (the three
self-hosted fonts) and the `.decor-vine__ink` fern `mask`/`-webkit-mask` both point at
site assets too (`/fonts/*.woff2`, `/images/decor-fougere.svg`) and needed the exact same
`/mairie-luglon/` prefix — a first pass fixed every `.html` file's `href`/`src` and missed
these two CSS-only spots, which is why fonts (and the fern mask) quietly disappeared even
after links and images were already working. If this is ever revisited, grep `styles.css`
for `url(` pointing at `/fonts` or `/images`, not just the HTML files, before declaring it
done.

**If a custom domain is ever wired up** (a `CNAME` file, or moving to a user/org root
`github.io` site), this prefix must come back OUT of **both** the HTML files and
`styles.css` — a find-and-replace of `/mairie-luglon/` → `/` across every `.html` file
*and* inside `styles.css`'s `@font-face`/`.decor-vine__ink` rules, mirroring the script
that put it there. Don't leave it in "just in case": it'll silently 404 everything again
the day the domain that doesn't need the subfolder goes live.

**Local testing must mirror this subpath**, or every internal link 404s locally even
though the live GitHub Pages site is fine. Don't serve this directory's own root with a
static server — serve its **parent** directory instead, so `mairie-luglon/` sits under the
server root exactly like it does on GitHub Pages:
`cd .. && python3 -m http.server 8123`, then browse `http://localhost:8123/mairie-luglon/`.

## Working in this codebase

The code is heavily commented in French, and those comments are load-bearing: they
explain *why*, including past regressions (e.g. a documented bug where reveal/hide logic
was split across CSS and JS and caused invisible legal pages). **Read the comment block
at the top of a file before editing it** — it typically states the file's single
responsibility, its fail-open/fail-closed contract, and traps to avoid. Preserve this
documentation style (rationale-focused, not restating what the code does) when adding
non-obvious logic.

### Site structure

- `index.html` — Accueil: welcome text (with an SVG map of the Landes department, real
  IGN-sourced contour, Luglon's location marked), a `.week-hours` secretariat-hours
  semainier, quick-access tiles, a preview of recent actualités, a "quelques chiffres"
  stats block for Luglon and Sabres, quick contact info. The `.week-hours` grid and
  `mairie/`'s own (see below) are two separate copies of the same markup, not one shared
  include (there's no templating in this repo) — if the hours change, update both by
  hand.
- `mairie/` — The mairie: équipe municipale, conseils municipaux, arrêtés, agence
  postale, sécurité et prévention, signalement, and `vos-demarches/` (état civil: actes,
  listes électorales, recensement citoyen — moved here from `vie-pratique/etat-civil/`,
  see below).
- `vie-municipale/` — Budget, commissions, communauté de communes. Linked from
  `mairie/index.html` ("Retrouvez aussi...") rather than from the nav; treat it as part
  of the mairie domain (same placeholder photo, same plausibility caveats).
- `vie-pratique/` — Administrative procedures that aren't état civil or urbanisme
  (déchets, CCAS et seniors), opening hours, and a "commerces de proximité" section.
  État civil and urbanisme conceptually belong to `mairie/`, not here: état civil lives at
  `mairie/vos-demarches/` (see above) and urbanisme at `vie-pratique/urbanisme/` (its URL
  didn't move, only its card was dropped from this page's own grid — it's still reachable
  from the nav's Mairie submenu). The "commerces de proximité" section is **real**, not a
  placeholder: Luglon has no shops of its own, so it lists the actual nearest ones —
  Boulangerie Suzanne and Proxi (alimentation générale), both in Sabres — plus the
  Écomusée de Marquèze (real open-air museum, reached by the heritage train from Sabres'
  old station, official site marqueze.fr). Earlier drafts of this section used fictional
  placeholder shop names ("Boulangerie du Bourg", "Épicerie Chez Marie") before this;
  don't reintroduce those, and don't invent a Luglon-based bakery/grocer that doesn't
  exist — the whole point of this section is that there isn't one.
- `vie-pratique/associations/` and `vie-pratique/entreprises/` — directories of local
  associations and businesses, grouped by category into `.accordion` (`<details>`)
  blocks the visitor expands one at a time. **This content is real**, sourced from public
  association/business directories (annuaire-mairie.fr, eterritoire.fr, gralon.net,
  Kompass) for the commune of Luglon — not the "plausible placeholder" pattern used
  elsewhere on `vie-pratique/`. Two things to know if this is revisited: (1) the
  entreprises list is a **deliberately curated, non-exhaustive** selection of named
  businesses — the raw SIRENE-style directories for a small forestry commune like Luglon
  are mostly individual sole-proprietor foresters/farmers registered under their own name
  and home address, and those were excluded on purpose (publishing a private individual's
  name and address as a "local business" is a privacy overreach a town site shouldn't
  make, even in a demo); only clearly-commercial named entities were kept. (2) The
  associations list includes "Comité des Fêtes de Luglon" as a directory entry (its real,
  public name) — this is not the same thing as the cdf-luglon.fr link override described
  below, but if the site owner wants the association's name kept out of print entirely,
  drop that one `<li>`, not the whole page.
- `vie-pratique/reservation-salle/` (+ `.../confirmation/`) — Room-booking request form.
- `enfance-jeunesse/` — École, périscolaire, transport scolaire, centre de loisirs.
- `actualites/` — News listing. No detail pages exist anymore (the last one,
  `nouveau-commercant/`, was removed — fictional, "n'existe pas") — every actualité is
  now just a card. "Incendie à Luglon", "Fêtes de Luglon" and "Concours de belote" are
  cards whose "En savoir plus" deliberately points off-site, to
  `https://incendie.cdf-luglon.fr/`, `https://cdf-luglon.fr/evenements/fetes-de-luglon/`
  and `https://cdf-luglon.fr/evenements/concours-de-belote` respectively
  (`target="_blank" rel="noopener noreferrer"`; only Incendie is mirrored as a shortcut in
  the "Actualités" nav submenu, same as before — Fêtes and Concours are card-only, this
  wasn't changed when Concours got its link). This is an explicit, repeated instruction
  from the site owner — the general "don't reintroduce cdf-luglon.fr" warning above is
  about not turning this template back into a copy of that site (content, branding, its
  Google Apps Script backend), not about never linking to it; treat these three links as
  settled, not a mistake to quietly revert.
- `contact/` — its own top-level nav item (`<li>`, no `site-nav__item--has-menu`, no
  chevron, no submenu — just a direct link, styled identically to the dropdown items by
  the same `.site-nav__links a` rule). It used to be a "Nous Contacter" entry inside the
  Mairie submenu; it was promoted to a standalone category because it doesn't belong
  conceptually under Mairie any more than under Vie pratique or Actualités. If it ever
  grows sub-pages of its own, it would need to become a `site-nav__item--has-menu` like
  the others — until then, don't add a submenu just to be "consistent" with them.
- `mentions-legales/`, `confidentialite/`, `404.html` — as named; not in any nav submenu.

There is no separate `galerie/` page (removed by design — photos are distributed across
the relevant pages instead, as hero images and as card vignettes/banners, rather than
centralized in one gallery). Don't recreate it; if more photos arrive, sprinkle them into
the page they thematically belong to, matching the `.value-card__thumb` /
`.contact-card__photo` patterns already in `styles.css`.

### Shared configuration

`config.js` exposes `window.LUGLON.ROOM` (Luglon only has one bookable room, the salle
des fêtes, 50 people — no `ROOMS` list, no `TIME_SLOTS`) and `MAX_PEOPLE`. It must be
included before `script.js` and `confirmation.js`, which both read from it. The room
name/capacity is also hardcoded as text in `vie-pratique/reservation-salle/index.html`
(`.salle-info`) and is **not** driven by `config.js` — update both by hand together.

### Per-page script includes

Each HTML page manually includes only the scripts it needs, always after `config.js`
(when relevant) and before page-specific logic. There's no bundler — script order in the
`<script>` tags matters:

- `nav.js` — nav bar (all pages): shrink-on-scroll via `IntersectionObserver` (never a
  `scroll` listener — see comments on iOS jank), mobile panel with focus trap, and — under
  860px only — an accordion for the Mairie/Vie pratique/Actualités submenus (one open at
  a time). Deliberately **not** animated via `Element.animate`/`requestAnimationFrame`
  like `accordion.js`: a first version measured the submenu's height with a rAF callback,
  and on real phones the submenu closed itself right after opening, before a link could be
  tapped — the rAF's delay left a window where a second event could land on the "close"
  branch before the "open" had finished. The fix was to make everything synchronous: a
  plain CSS `max-height` transition plus a class added/removed in one go, no measurement,
  no frame boundary. Don't reintroduce the measured-height approach here even though it
  looks more "correct" than a fixed 600px cap — it's the reason this broke once already.
  Fails open: the accordion only arms (`.nav-accordion-armed` on `.site-nav`) once the
  listeners are attached; if this block doesn't run at all, mobile submenus fall back to
  their original always-expanded indented list — never a submenu stuck invisible.
- `events.js` — actualité card badges ("À venir"/"Terminé") computed from `data-date` on
  `.event-card` elements. Content lives in HTML, not JS, so search engines see it without
  JS. Fail-open: on failure, hardcoded HTML badges remain visible.
- `script.js` — the room-reservation calendar (`renderCalendar()`, single month view,
  prev/next) plus the booking modal it opens once at least one day is picked:
  validation and submission. Only one room exists, so there's no room/time-slot picker
  and no same-room-same-date duplicate check to speak of — a day is either open or it
  isn't. Multiple days can be selected at once (`selectedDates`, a `Set` kept
  independent of the displayed month so it survives prev/next navigation intact); a
  reservation entry stores them as `dates: [...]`, not a single `date` — anything
  reading a reservation (`getReservedDates()`, `confirmation.js`) must flatMap/join
  over that array, never assume one date per entry. `.res-calendar` is capped at
  `max-width: 340px` (300px on mobile) on purpose: without it the 7 grid columns
  stretch to fill `.res-wrap`'s 70vw and the cells balloon. `MOCK_RESERVED_DATES`
  seeds a few grey (unavailable) demo days; real submitted bookings (read from
  `localStorage`) grey out their own days too, so the calendar updates immediately
  without a page reload.
- `confirmation.js` — renders the last request from `localStorage` on
  `/vie-pratique/reservation-salle/confirmation/`.
- `calendar-export.js` — generates `.ics` files client-side for "Ajouter au calendrier"
  buttons (currently used on the `conseil-municipal` actualité page). Event
  dates/times/descriptions are hardcoded in the `EVENTS` object and must be updated by
  hand as new dates are announced.
- `rail-dots.js` — scroll-snap carousel dot indicators, via `IntersectionObserver` with
  `root` set to the rail (same primitive as `nav.js`, deliberately not the newer
  `scrollsnapchange` API, to avoid maintaining two divergent code paths).
- `accordion.js` — used on `vie-pratique/associations/` and `vie-pratique/entreprises/`
  (any page with a `.accordion-group`). Adds two things on top of native
  `<details>`/`<summary>`: closing the other `.accordion` items in the same group when
  one opens, and animating the height open/close via `Element.animate()` instead of the
  browser's instant snap. Fails open: without `Element.animate` support (checked at the
  top of the file) it does nothing, and every `<details>` still works natively —
  independently openable, just without exclusivity or animation.
- `scroll-animations.js` — reveal-on-scroll. Contract: the only selector shared with CSS
  is `[data-reveal]`; this script alone adds `.reveal-on` to `<html>`, which is what arms
  the CSS-side hiding. If this script fails to run, nothing gets hidden — never add a case
  where CSS hides content that only JS reveals without checking this file's reasoning
  first.

There is no `reservation-gate.js` anymore (it used to seasonally open/close a paid
festival booking window; a room-reservation form has no such season, so it was removed).

### Nav bar: the utility strip must be nested inside `<nav>`

On pages that show the phone/e-mail strip above the main bar (`.site-nav__utility`,
`.site-nav__utility-bar`), that `<div class="site-nav__utility">` block must be the
*first child* of `<nav class="site-nav">`, immediately before `<div class="site-nav__bar">`
— not a sibling placed before `<nav>` in the DOM. `.site-nav` is `position: fixed`; a
nested `.site-nav__utility` rides along with it at no layout cost. As a sibling instead,
it sits in normal document flow and pushes everything after it (the hero included) down
by its own height — visually this read as "the hero's grey band is too low, and the
phone/e-mail pill floats inside the grey instead of the white nav strip". The
`.site-nav.is-scrolled .site-nav__utility { display: none; }` rule also silently never
matches unless nesting is correct (it's a descendant selector). `--nav-offset` gets a
+38px bump at `≥860px` (where the utility strip becomes visible) to reserve enough
clearance for it above `.site-nav__bar` — bump that value too if the utility strip's own
height changes.

The brand (`.site-nav__brand`) carries two decorative children: `.site-nav__brand-panel`
(a grey-to-transparent gradient behind the wordmark, fading out within 40px so the
wordmark reads as sitting on the same glass as the rest of the bar rather than on a grey
block of its own) and `.site-nav__brand-wave`, a small fixed-size (10×20px) element right
after it with a repeating SVG `mask-image` of true semicircles — fixed pixel dimensions on
purpose, so the bumps stay perfectly round regardless of screen size or the wordmark's
width (a `clip-path: polygon()` in percentages was tried first and stretched into ellipses
because the box is far wider than tall). Both are `opacity: 0` by default and only
`opacity: 1` under `.site-nav.is-scrolled` — the unscrolled nav sits directly on the hero
with no background of its own (`.site-nav__glass` is `opacity: 0` then, see section 8), so
there's nothing to fade into and no wave is drawn. `padding-right` on `.site-nav__brand`
itself (not just the decorative children) extends the clickable area partway into the gap
before the first nav link, since `.site-nav__brand` is the `<a href="/">`. Don't
reintroduce a separate `<li>` for "Accueil" in `.site-nav__links`: the brand click already
goes home, on every page.

### Nav submenus: no catch-all link back to the category root

`.site-nav__submenu` lists don't include an entry like "Toutes les infos pratiques" or
"Toutes les actualités" that just points back at `/vie-pratique/` or `/actualites/` —
the top-level link itself (`<a href="/vie-pratique/">Vie pratique…`) already goes there
on click, chevron or not. A submenu row that duplicates its own parent's href is dead
weight, not a convenience. If a submenu ever gets its own catch-all urge again, delete it
instead — this was fixed once already (2026) after Vie pratique and Actualités had
accumulated exactly this redundant row each.

### Every subpage's "back" button points at its real nav category, not a stale one

The `← <Category>` ghost button in a subpage's hero (`main-subtitle` + `cta-row`), and
the matching button in its `page-section--footer-band`, must target the category the
page is actually filed under **in the nav submenu right now** — not wherever it used to
live. This repo has moved pages between categories more than once (état civil →
`mairie/vos-demarches/`, Urbanisme's nav entry moved from Vie pratique's submenu to
Mairie's while its URL stayed at `/vie-pratique/urbanisme/`, contact/ promoted out of
Mairie into its own top-level item) and each time it's easy to update the nav `<li>` but
forget the page's own back-button, leaving it pointing at the old section. When you move
a page between categories, grep for its own back button and footer-band button in the
same edit — don't treat the nav `<li>` as the only place the category lives. Urbanisme is
the cautionary example: it sat for a while with `← Vie pratique` even after its nav entry
had already moved to Mairie.

### Hero text is left-aligned on mobile, never centered

`.main-hero`'s title/subtitle/`← Category` button stay left-aligned at every width,
including under the 768px breakpoint where the hero photo disappears and the layout
stacks to a single column. There is no `.main-hero { text-align: center }` on mobile —
there was, once, and it silently centered the title/subtitle *and* (since `.cta-row` had
no `justify-content` of its own on mobile) every subpage's `← Category` back-button too.
Both rules were removed together. If a hero ever needs centered text again, that's a
deliberate per-page choice, not a global mobile default — don't reintroduce either rule
site-wide.

`.cta-row` itself has no `justify-content` at any width — it's `flex-start` (left) by
default. The `cta-row`s that should visually center (footer-band CTAs, the ones at the
bottom of a page) get `style="justify-content: center"` inline in the HTML, on purpose,
so that a global mobile override can't silently pull in a `cta-row` that was never meant
to center (exactly what happened to the hero's back-button — see above).

### Footer's mail icon links to `/contact/`, not `mailto:`

`.footer-social-link.footer-mail` (the green circular icon in `.footer-social`) is an
`<a href="/contact/">`, and there is no longer a plain-text `mairie@luglon.fr` link next
to it — that was removed on purpose so the footer funnels people to the Contact page's
own form/info instead of popping their mail client directly. `mailto:mairie@luglon.fr`
is still used elsewhere (the utility strip above the nav, `.contact-card` links) — this
is the one deliberate exception, not a mistake to "fix" back to a mailto.

### Reservation form has no real backend

`script.js`'s room-reservation form is a **client-side-only demo**: submitting stores the
request in `localStorage` and simulates a short network delay — it does not send data
anywhere. This is intentional (see `confidentialite/index.html`, which says so plainly to
visitors). Before any real deployment, a real submission path (email, shared spreadsheet,
etc.) needs to be wired into `submitReservationOnServer()` in `script.js`, and the privacy
page updated to match. Don't add a call to a live third-party endpoint here without the
user explicitly setting one up — the previous version of this code pointed at the Comité
des Fêtes' real Google Apps Script deployment, which must never be reintroduced.

### CSS structure

`styles.css` is one file, organized into numbered sections with `/* ===... N. TITLE`
banner comments (currently 1–18: tokens, fonts, reset, typography, layout utilities,
"glass" primitives, icons, buttons, nav, hero, cards, scroll rails, reservation form,
modals, confirmation page, legal pages, footer, motion/reveal/a11y, fern decoration — the
old "12. GALERIE PHOTO" section was removed along with `galerie/`; if you remove a
section, renumber the following banners too, don't leave a gap). Every new page reuses
existing classes (`.page-section`/`.section-head`/`.prose`/`.panel`,
`.rail`+`.value-grid`/`.event-grid`+cards, `.contact-grid`+`.contact-card`, `.legal-card`,
the `.card`/`.modal-overlay`/`.modal-box` reservation UI). When adding content, prefer
finding an existing component/section over adding new CSS. Note: `<a class="value-card">`
/ `<a class="contact-card">` (used for the homepage/vie-pratique link-tiles) need an
inline `style="text-decoration:none; color:inherit"` since those classes have no
anchor-specific reset in `styles.css` — follow that pattern for any new card-as-link.

Two optional modifiers add a real photo to an otherwise icon-only card, used only where a
photo has an unambiguous match with the card's subject (never forced onto every card):
`.value-card__head` + `.value-card__thumb` (icon and a wide vignette side by side, home
page "Accès rapide") and `.contact-card--photo` + `.contact-card__photo` (a photo banner
bleeding to the card's own edges above the icon, used on some `.contact-card` instances
across `mairie/`, `vie-pratique/`, `contact/`). Both reuse the small pre-cropped
`images/*-vignette.jpg` files (700px wide) rather than the full-size `images/*-hero.jpg`
ones used for page heroes — don't point a card thumbnail at a multi-hundred-KB hero image.

For a Google Maps `<iframe>` embed next to text (`vie-pratique/dechets/`), use
`.welcome-grid` + `.embed-map` (iframe, 4/3, same rounded corner/shadow as everything
else) — not `.gallery-figure`, which no longer exists (removed with `galerie/`).

For a per-category expand/collapse list (`vie-pratique/associations/`,
`vie-pratique/entreprises/`), use `.accordion-group` > `.accordion`
(a native `<details>`/`<summary>`, not a JS-driven widget) > `.accordion__body` >
`.accordion__list`. The chevron (`.accordion__chevron`) is visually the same two-border
45°-rotation shape as `.site-nav__chevron`, but it's a separate rule driven by the
`[open]` attribute selector, not shared CSS — the nav's chevron rotates on `:hover`/
`:focus-within` for a completely different (hover + mobile-click) interaction model.
Don't reach for JS here: `<details>` gives keyboard/screen-reader support for free.

For a small set of key numbers about a place (`index.html`'s "quelques chiffres"), use
`.stats-columns` > `.stats-block` (one per place, `<h3>` + `.stats-grid`) > `.stat`
(`.stat__value` + `.stat__label`) — not `.value-grid`/`.contact-grid`, which are built for
cards that are links or have an icon; a bare number-and-label pair doesn't need either.

For a weekly opening-hours semainier (the secretariat's hours on `index.html` and
`mairie/`), use `.week-hours` — one `.week-hours__day` cell per day of the week,
**Monday through Sunday, always all seven**, not just the open ones (add
`.week-hours__day--closed` on the closed days, which mutes them via `--card`/`--muted`
rather than dropping them — the point is to see the whole week at a glance, closures
included, the way a shop's door sign does). An optional `.week-hours-caption` (a plain
`.kicker`, centered) can sit above it. This went through two rejected attempts first: a
`.panel` (a whole green banner around four days felt heavier than the information itself)
and a `.hours-list` row of pills for only the open days (looked "hyper mal" per the site
owner, and only showing open days isn't actually a semainier). Don't revert to either.

### Generated assets

`images/decor-fougere.svg` (the scrolling fern/plant decoration, used as a CSS
`mask-image`, see CSS section 19) is generated by `tools/decor-fougere.py`. It is **not**
a build step — the SVG is committed and the site stays 100% static — the script is only
the source for regenerating the drawing (hand-editing ~180 SVG paths isn't practical).
Regenerate with `python3 tools/decor-fougere.py images/decor-fougere.svg` after changing
the script.

## Repository hygiene

The working tree may have untracked `.aider.*` files (Aider tool history/cache) and a
`.gitignore` that excludes `.aider*` — these are local tooling artifacts, not part of the
site.
