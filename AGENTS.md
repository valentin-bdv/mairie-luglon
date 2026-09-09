# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this repository actually is

This is a **gabarit de démonstration** (demo template) for a French town-hall (mairie)
website for the commune of Luglon (Landes, 40630), meant to be shown to the mayor as a
proposal. It reuses the visual/interactive system originally built for a *different* site
— the Comité des Fêtes de Luglon (a local festival association) — and its content has
since been fully replaced with generic mairie content (pages, nav, copy, forms). Do not
reintroduce Comité des Fêtes / `cdf-luglon.fr` content or branding. (A reference copy of
a real mairie site, `Arengosse.html`, used to sit at the repo root as inspiration; it was
deleted once the design had settled and should not come back.)

Addresses and opening hours are **plausible placeholders**, not real facts about Luglon —
flag this if asked to treat them as authoritative.

The **municipal team on `mairie/equipe-municipale/` is real**, though — these are the
commune's actual elected officials, confirmed by the site owner (2026-09), and this file
described them as placeholders for a while. Treat their names and roles as facts about
real people: a typo there is a misspelled person's name, not a cosmetic detail (a
"Virgine"/"Virginie" slip was corrected on exactly those grounds).

The commune's contact address is **`accueil@mairie-luglon.fr`**. It used to be
`mairie@luglon.fr` across 19 pages, including as the RGPD contact — but `luglon.fr` was
never registered (NXDOMAIN), so every message bounced and anyone could have registered
the domain and received mail meant for the mairie. If `luglon.fr` is ever bought, the
plan is a redirect to `mairie-luglon.fr`, not a second identity: keep
`mairie-luglon.fr` everywhere the site names itself (canonicals, sitemap, e-mail).

`vie-pratique/enfance-jeunesse/`, the waste-management part of `vie-pratique/dechets/`,
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

The RPI map on `vie-pratique/enfance-jeunesse/` (`.rpi-map`) draws real roads (D327/D626/D45,
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
- `mairie/` — The mairie: équipe municipale, conseils municipaux,
  `arretes-et-publications/`, agence postale, sécurité et prévention, signalement,
  `urbanisme/`, `vos-demarches/` (état civil: actes, listes électorales, recensement
  citoyen — moved here from `vie-pratique/etat-civil/`), plus `budget/`, `commissions/`
  and `communaute-de-communes/`. Those last three are the only pages in `mairie/` that
  are **not** in the nav's Mairie submenu: they're reached from `mairie/index.html`
  ("Retrouvez aussi…") only, which is deliberate — the submenu already carries eight
  entries. They used to live under a top-level `vie-municipale/` directory that had no
  `index.html` of its own, so `/vie-municipale/` itself 404'd while its three children
  worked; flattening them into `mairie/` (2026-09) removed the orphan path rather than
  papering over it with a hub page nobody linked to.
- `vie-pratique/` — Administrative procedures that aren't état civil or urbanisme
  (déchets, CCAS et seniors, enfance-jeunesse), opening hours, and a "commerces de
  proximité" section. État civil and urbanisme belong to `mairie/`, and both now live
  there in the URL too — `mairie/vos-demarches/` and `mairie/urbanisme/`. The "commerces
  de proximité" section is **real**, not a placeholder: Luglon has no shops of its own, so it lists the actual nearest ones —
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
- `vie-pratique/enfance-jeunesse/` — École, périscolaire, transport scolaire, centre de
  loisirs. Everything on this page is sourced fact **except** the "Les projets de l'école"
  section, which is an explicitly-labelled empty template: no public source (mairie-sabres.fr,
  coeurhautelande.fr, the Éducation nationale directory) documents the school's projects,
  so three placeholder cards carry the layout and an italic note tells the visitor so —
  the same honest-placeholder device as `mairie/arretes-et-publications/`. Do not fill
  those cards with plausible-sounding projects; wait for the school's own list. An HTML
  comment above the section spells out what to change when it arrives.
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
- `actualites/autres/` — archive of actualités pushed off the main page. Listed in the
  Actualités submenu. Rendered from the database when the site is served by
  `backoffice/`; a generated static copy stands in on GitHub Pages.
- `mentions-legales/`, `confidentialite/`, `accessibilite/`, `404.html` — as named; not in
  any nav submenu, but all three legal pages are linked from every footer.

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
- `hero-fit.js` — every hero (all pages): shrinks `.main-title` in JS-measured steps until
  it fits within 2 lines (there's no CSS-only way to say "reduce font-size until this wraps
  at most twice" — it depends on the actual rendered text/width, not a breakpoint), then
  shrinks `.main-subtitle` in proportion to how much the title itself shrank, capped at its
  own CSS default. That second step matters: `.main-subtitle` is superposed over the
  title's own top edge by a negative margin (see its definition in `styles.css`, section
  4) sized for a title at its normal, un-shrunk size — left at that fixed size against a
  title heavily shrunk for an unusually long page name, the two end up rendered at the same
  size, overlapping edge-to-edge as illegible double-exposed text. Re-run on
  `document.fonts.ready` (the self-hosted title font can finish loading, and therefore
  change the text's rendered width, after the first measurement) and on resize (debounced).
  Fails open: without this script, `.main-title` just keeps its CSS breakpoint size — a
  long title wraps onto more than 2 lines, never invisible or clipped.
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
- `reservation-storage.js` — **owns the retention rule** for the booking form, and is the
  only thing allowed to touch `luglon_reservations` / `luglon_last_reservation_timestamp`.
  Loaded after `config.js` (it extends `window.LUGLON`) and before `script.js` /
  `confirmation.js`, which both go through it. Name, phone, e-mail, motif and comment are
  stripped 30 minutes after a request; only `dates` survive, because that's all the
  calendar needs to grey a day out. It exists as its own file precisely so that rule sits
  in one place instead of being copied into the two callers and drifting apart. The purge
  runs on every read rather than on a timer — a timer doesn't run while the tab is closed,
  which is exactly the case that matters. Watch the mutation trap documented on `load()`:
  `purge()` mutates the objects it's given, so the "did anything change?" comparison has
  to snapshot the JSON *before* purging or the cleaned list is silently never written back
  (that bug shipped once and was caught in the browser, not by reading the code).
- `map-consent.js` — Google Maps on click only, on `vie-pratique/dechets/`. See the
  security section below; unlike everything else here, it **fails closed** on purpose.
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

### A page's URL path mirrors its nav category — and every directory has an `index.html`

Two invariants, both established by an arborescence audit (2026-09) after the tree had
drifted:

1. **A page lives at the URL its nav category implies.** If it sits in the Mairie
   submenu, its path starts with `/mairie/`; Vie pratique's pages start with
   `/vie-pratique/`. Before the audit, `enfance-jeunesse/` sat at the repo root while
   being filed under Vie pratique, `urbanisme/` sat under `vie-pratique/` while being
   filed under Mairie, and `vie-municipale/` was a top-level directory in no nav category
   at all. All three were moved (`vie-pratique/enfance-jeunesse/`, `mairie/urbanisme/`,
   and `mairie/{budget,commissions,communaute-de-communes}/`). The two hub grids —
   `mairie/index.html` and `vie-pratique/index.html` — now list exactly what their own
   submenu lists, which is the cheapest way to spot the next drift.
2. **Every directory that is a URL has an `index.html`.** `vie-municipale/` had none, so
   `/vie-municipale/` 404'd while its three child pages worked — a broken path nobody
   linked to and nothing tested. If a new grouping directory is ever introduced, it gets
   a hub page or it doesn't get to be a directory.

Moving a page means touching more than the nav `<li>`: the `← <Category>` ghost button in
its hero (`main-subtitle` + `cta-row`), the matching button in its
`page-section--footer-band`, its `<link rel="canonical">`, its entry in `sitemap.xml`, its
card on the hub page, and every other page's copy of the nav submenu (there's no
templating — the nav is duplicated in all 26 files). Two greps catch almost everything
afterwards: one resolving every `href="/mairie-luglon/…"` to a real file, one comparing
each page's canonical to its own directory.

Urbanisme is the cautionary example for the back-button half of this: it sat for a while
with `← Vie pratique` even after its nav entry had already moved to Mairie.

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

### Brand color is navy blue (`--luglon-navy`), not the old green

The site's brand color was switched from green (`#166136`) to navy blue (`#1b2a4a`,
"marine classique") after the site owner reviewed five navy mockups and picked this one —
it's a deliberate identity change, not a placeholder or a mistake to revert. Every token
was renamed to match, not just recolored, so a stray `--luglon-green` never resurfaces:
`--luglon-green` → `--luglon-navy`, `--green-ink` → `--navy-ink`, `--green-050/100/700` →
`--navy-050/100/700`, `--green-tint-08/16/24` → `--navy-tint-08/16/24`. `--accent` still
aliases the primary token, now `var(--luglon-navy)`. The `.modal-btn-confirm-green`
reservation-form button class was renamed to `.modal-btn-confirm-brand` for the same
reason (its one HTML usage was updated too). If new UI needs the brand color, reach for
these tokens — never hardcode `#1b2a4a` or a green hex, and never reintroduce a `-green`
suffixed token name even for something that happens to render green today.

`--luglon-navy` and `--navy-700` are **surface** colors: built to always carry white text,
so they don't change between light/dark theme (see the comment on `--navy-ink` in the
tokens section). `--navy-ink` is the **text-safe** version for writing brand-colored
titles/links directly on the page background — it's `--luglon-navy` itself in light mode
(plenty of contrast on white), but a lighter blue (`#a9c1e0`) in dark mode, the same way
the old `--green-ink` swapped to a lighter green in dark mode. Don't use `--luglon-navy`
as a text color outside a hardcoded-white surface (buttons, badges, the hero) — that's
exactly the contrast bug `--navy-ink` exists to avoid.

### Hero has a fixed navy background; the nav's white glass is opaque from load, not just on scroll

`.main-hero` used to sit on `--card` (a neutral grey/dark grey that followed the theme).
It now always uses a navy gradient (`linear-gradient(155deg, var(--luglon-navy),
var(--navy-700))`), in both themes — a deliberate choice, paired with the color rebrand
above, not something that should start following `--card` again. Because that background
is fixed-dark, `.main-title`, `.main-subtitle` and the hero's `.cta-row .btn--ghost` are
hardcoded white rather than `var(--text)` (which flips dark/light with the theme and would
go unreadable on a background that never does) — see the comment at `.main-title`'s
definition (section 4) before changing either back to a token color.

This forced a second change to the nav bar. Before, `.site-nav__glass` (the barre's actual
visible surface) stayed at `opacity: 0` until `.is-scrolled`/`.is-open`, because the
transparent bar sat on a light hero and dark nav text (`var(--text)`) read fine either way.
On a navy hero that no longer works — dark nav text on a transparent bar over a dark hero
is invisible until the visitor scrolls. So `.site-nav__glass` now has a background from the
very first frame, on every page. Two details worth knowing if this is touched again:

- It's **opaque, not translucent, at rest** — `var(--glass-opaque)` (a flat white in light
  mode, `#1c1c1e` in dark), not `var(--glass-bg-strong)`. A 78%-opacity white blurred over
  a navy hero reads as a pale blue-grey wash, not the "blanc" the site owner asked for —
  only a flat opaque fill gives a genuinely white bar regardless of what's behind it.
- The frosted **glass** look (`var(--glass-bg-strong)` + `backdrop-filter`) only kicks in
  under `.is-scrolled`/`.is-open`. This isn't just cosmetic restraint: it means the blur —
  the expensive GPU pass the file's own rule A warns about — never runs while the bar is at
  rest, only once it's already shrinking to its compact size. `.is-scrolled` therefore now
  changes three things together (size, texture, and the brand panel/wave, see below), never
  just one — but the bar's *presence* is constant, so the scroll transition reads as a
  shrink into a nicer material, not an appear-from-nothing.

The brand panel/wave (the decorative gradient and wave behind "Mairie de Luglon") still
only appear on `.is-scrolled` — that part didn't change, it's still exclusive to the
compact scrolled state, not something to make permanent alongside the opaque background.

### `.main-title` auto-shrinks to fit 2 lines; `.main-subtitle` is superposed over it, never stacked below

Two related but separate mechanisms:

- **The title never wraps past 2 lines.** `hero-fit.js` (see "Per-page script includes")
  measures the rendered height and steps the font-size down until it fits, since there's no
  CSS-only way to express "shrink until this wraps at most twice" — it depends on the
  actual text and the actual viewport, not a breakpoint. This replaced a manual
  `.main-title--long` modifier that had to be hand-added to any page whose title ran long
  (and had gone stale — it was defined in `styles.css` but wasn't actually used on any page
  by the time this changed). Don't reintroduce a per-page CSS size override for a long
  title; let the script handle it.
- **The subtitle sits on top of the title's own top edge, not above or below it in the
  flow.** The HTML places `<p class="main-subtitle">` **before** `<h1 class="main-title">`
  (like a `.kicker` before an `<h2>` elsewhere on the site), but `.main-subtitle` carries a
  negative `margin-bottom` that eats most of its own box, so `.main-title` renders almost
  exactly where it would with no subtitle at all and the subtitle (painted above it via
  `z-index`) ends up superposed on the title's own first line. That's deliberate, not a bug
  to "fix" by adding normal spacing: the site owner asked for the subtitle to sit
  "par-dessus" the title specifically so it never adds height to the navy hero band.

  The margin is `-0.6em`, **not** `-1.4em` (its full `line-height`). Cancelling the box
  exactly — which is what it did until 2026-09 — dropped the subtitle onto the very top of
  the title's line box, which is precisely where the accents of capitals live: on
  "ARRÊTÉS ET PUBLICATIONS" the circumflex of the Ê collided with "MAIRIE" above it. The
  remaining 0.8em (~11px) lets the title fall just far enough to clear the accent zone,
  and the subtitle still bites 0.6em into the title's box, so the hero grows by ten-odd
  pixels rather than by a whole line. Keep the value in **em of the subtitle**, never px:
  `hero-fit.js` shrinks the subtitle along with a very long title, and an em keeps the gap
  proportional instead of leaving a fixed hole at small sizes.

  A first version used `position: absolute` on `.main-subtitle` with
  `transform: translateY(-100%)`, anchored on `.hero-content`, to push it entirely above
  the title. That worked on desktop, where the hero's top padding leaves a large margin
  above `.hero-content` — but on mobile that padding is only 10px, and the subtitle ended
  up rendered partly *underneath the fixed nav bar*. The margin-collapse technique above
  can't do that: it never leaves the title's own box, so it can never climb higher than the
  title itself regardless of how tight the surrounding padding is. If this is touched again,
  don't go back to the absolute+translateY version without re-checking mobile.

  Because the overlap only works cleanly when the subtitle is meaningfully smaller than the
  title, `hero-fit.js` also shrinks `.main-subtitle` (capped at its own CSS default,
  `--fs-sm`) in proportion to how much it had to shrink the title — see that script's own
  comment. Without this, a very long page title shrunk small by the 2-line rule would end
  up nearly the same rendered size as the fixed-size subtitle superposed on it, and the two
  would blend into unreadable overlapping text instead of "small label over big title".

### Nav bar is a rectangle, and its top-level tabs fill solid on hover/active — not a pill with an underline

The bar (`.site-nav__bar`, its glass, the brand panel, and the mobile dropdown panel) used
to carry a rounded corner at every width — `--r-l` expanded, `--r-pill` (a true pill) once
`.is-scrolled`. On demand (2027) it's a rectangle in both states: `border-radius: 0`,
explicit rather than omitted, so it reads as a choice. `.site-nav__glass` still inherits
this via `border-radius: inherit`, so squaring the bar is enough to square the glass too —
don't set a radius on the glass directly. The bar still shrinks in size on scroll (that's a
separate, still-valid feature — more room once you've started reading a page); only the
rounding was tied to the "bulle" identity and went with it.

The active page's top-level tab, and whichever tab is under the pointer, now fill solid
`var(--luglon-navy)` with white text — a tile, not the thin 2px underline
(`.site-nav__links a::after`) that used to slide in under the active tab. The selector is
`.site-nav__links > li > a` (a **direct child** of the top `<li>`) specifically so it
excludes the nested `.site-nav__submenu` links one level down — those keep the older,
lighter `--navy-tint-08` hover inherited from the general `.site-nav__links a:hover` rule;
a solid navy block would be too heavy inside a small dropdown list. If a fifth top-level
tab is ever added, it gets the tile automatically through that selector — nothing to wire
up per tab.

The dropdowns follow the same rule (2026-09): `border-radius: 0`, and their top edge sits
**flush with the bottom of the bar** instead of floating 8px below it. Making that flush
edge work needed the tabs themselves to fill the bar's full inner height — hence
`align-self/align-items: stretch` on `.site-nav__links` and `display: flex` on the `<li>`
and its `<a>`, all inside the `@media (min-width: 860px)` block. Without the stretch, the
`<li>`'s `100%` is the bottom of the link's *text*, and the panel lands somewhere in the
middle of the bar. Do **not** delete `.site-nav__submenu::before` now that the visible gap
is gone: the 8px the cursor crosses is `.site-nav__bar`'s own padding, which belongs to
the bar and not to the `<li>`, so without that invisible bridge the `:hover` still drops
on the way down and the menu closes under the pointer.

### Everything is square: the five box-radius tokens are `0`

`--r-xs`/`--r-s`/`--r-m`/`--r-l`/`--r-xl` are all `0` (2026-09), extending the rectangle
identity from the nav bar to every card, panel, input, modal and button on the site. They
were zeroed **as tokens**, not deleted, so the ~30 `border-radius: var(--r-…)` call sites
stay a single point of adjustment if the decision is ever revisited; the two dozen
hardcoded `border-radius: <n>px` declarations were set to `0` in place at the same time.

Two deliberate exceptions, neither of which is an oversight to "finish squaring":
`--r-pill` (999px) still rounds things that aren't cards — the actualité "À venir"/"Terminé"
badges, `.tag-list` labels, `.rail-dots` carousel dots, the tel/e-mail pill above the nav —
because a square badge reads as a button; and the hardcoded `border-radius: 50%` circles
(nav logo, footer social icons, the confirmation checkmark, the calendar's prev/next
arrows) are circles, not rounded boxes. The 2px decorative bars (`.site-nav__burger`,
`.day-title::after`) were left alone for the same reason.

### The mairie's e-mail address appears in exactly ONE place: `contact/`

`accueil@mairie-luglon.fr` is written once, in the e-mail `.contact-card` on
`contact/index.html`. Everywhere it used to appear — the utility strip above the nav on
19 pages, the homepage contact card, the RGPD contact in `confidentialite/`, the éditeur
block in `mentions-legales/`, the RGAA contact in `accessibilite/`, the four
`.contact-card` links on `mairie/signalement/` — the link now points at
`/mairie-luglon/contact/` instead.

The reason is maintenance, not style: an address duplicated across twenty files is an
address that gets corrected in nineteen of them. This repo has already been bitten by
exactly that — the site published `mairie@luglon.fr` on 19 pages while the domain didn't
even exist. One occurrence can't drift.

Consequences worth knowing before touching this:

- A **contact form** is planned on that page. Once it exists, it becomes the primary way
  to write to the mairie and the visible address may be dropped entirely — the rest of
  the site already points at the page, not at a mailbox, so nothing else would change.
- `mairie/signalement/`'s four cards carry a **`?sujet=voirie|eclairage|proprete|autre`**
  parameter. They used to be `mailto:` links with a pre-filled subject; the parameter is
  what survives of that intent. The contact form must read it to pre-select the report
  type, otherwise the four cards all land on the same empty form and the distinction is
  lost. An HTML comment on the page says so.
- `mentions-legales/` gained a **phone number** in the same edit. The LCEN wants a way to
  reach the publisher, and removing the e-mail would otherwise have left that block with
  neither phone nor mail.
- One `mailto:` remains elsewhere, on `vie-pratique/enfance-jeunesse/`:
  `accueil.chl@coeurhautelande.fr`. That's the **communauté de communes**, not the
  mairie — real sourced content, and outside this rule. Don't sweep it up.

### The reservation calendar's hover depends on the day's state, it doesn't override it

A selected day in `.res-calendar` carries **both** `--available` and `--selected`.
`.res-calendar__day--available:hover` is two selectors and therefore beats
`.res-calendar__day--selected` on its own, so hovering a day you had just picked repainted
it with the pale `--navy-tint-08` hover fill *under its white text* and the number
vanished. The fix is `.res-calendar__day--selected:hover`, placed after both: a selected
day answers the pointer by going **more** blue (`--navy-vivid`, a genuinely saturated blue
rather than the near-black brand navy), never by going pale, and it re-asserts
`color: #fff` on the spot so no future hover rule can take the number back.

`--navy-vivid` (`#2f5bb7`) is a **surface** token like `--luglon-navy`: it always carries
white text (6.3:1), so it has no dark-theme variant and must never be used as ink. It is
currently used by that one rule only.

### The reservation form has two modes, and it picks one by itself

`LUGLON.API_BASE` in `config.js` decides where a booking request goes, and it is
**computed from the page's own hostname** — nothing to edit, nothing to remember:

```js
API_BASE: location.hostname.endsWith('.github.io') ? '' : '/api',
```

- **On GitHub Pages** → `''`. No backend can run there (it serves files, it executes
  nothing), so `submitReservationOnServer()` simulates the send and the request never
  leaves the browser. This is the permanently-showable link, and it is structurally
  incapable of erroring.
- **Anywhere else** → `'/api'`. Something is running that serves the site *and* the API
  from the same origin: `tools/dev-server.py` behind a Cloudflare tunnel today, OVH
  later. The request goes out as `POST /api/reservation`.

The point of deriving it rather than setting it: **the repo always contains everything
and every commit pushes everything.** There is no file to edit before committing, none to
keep out of a commit, no branch per environment. What differs between environments isn't
the code, it's what happens to be *running* where the page is served from. An earlier
version of this used a hand-flipped constant and that advice was wrong — it made the
public site one forgotten `git checkout` away from showing visitors a failed send.

Three consequences worth knowing:

- **No allowlist to maintain.** Everything that isn't GitHub Pages is assumed to have a
  backend. The one casualty: serving the site as pure static on localhost
  (`python3 -m http.server`, used for checking a page) will attempt a send and show an
  error. Harmless, and the price of having no list to keep in sync.
- **A custom domain on GitHub Pages would break the rule** — the test wouldn't recognise
  it and the form would attempt an impossible send. Not the plan (production goes to
  OVH), but it's the one way to break this.
- **Keep it a relative path, never an absolute URL.** Same origin is what lets the CSP
  stay identical everywhere (`connect-src 'self'`), including behind a tunnel whose URL
  changes every session. An API on its own domain would mean reopening the policy on all
  26 pages.

A network failure must stay a failure — `submitReservationOnServer()` resolves
`{success: false}` rather than falling back to demo mode, so nobody is told their request
was sent when the mairie received nothing.

`confidentialite/` section 4 describes the demo behaviour to visitors and has to be
rewritten the day a real backend goes live. Don't point this at a third-party endpoint
without the site owner setting one up — the pre-mairie version of this code posted to the
Comité des Fêtes' Google Apps Script deployment, which must never come back.

### `backoffice/` — the admin app, and the three pages it renders

`backoffice/` is a small FastAPI application that serves **the whole site**: it
renders three pages from SQLite, exposes the back-office API, hosts the admin PWA,
and serves the other 21 pages as the static files they have always been. It replaced
`tools/dev-server.py`, which did a subset of this.

**The public pages that come out of the database** are the actualités summary
(`/actualites/`), one page per rubrique (`/actualites/<clé>/`) and
`/mairie/arretes-et-publications/`. Everything else stays a hand-edited HTML file. That
line was drawn deliberately: those are the only pages whose content changes between two
visits from the secretariat.

Things to know before touching it:

- **`/actualites/` is a summary, not a list.** It shows the `ACTUALITES_EN_UNE` most
  recent items **of each rubrique**, in short cards carrying an excerpt. "Voir plus" goes
  to that rubrique's page, which shows the same actualités **in full** — formatted text
  and images included. There is no page per actualité: the rubrique page is what carries
  the detail, which is why cards link to it rather than to an item.
- **The overflow is a query, not a rearrangement.** Publishing a rubrique's sixth item
  pushes its oldest off the summary; it stays on the rubrique page. Nobody moves
  anything. Ordering is by **event date descending**, not publication date — an item
  typed today about last year's meeting must not jump ahead of next month's fête.
- **Rubriques live in the DATABASE, not in the code.** The secretariat creates, renames
  and deletes them from the admin app; `config.RUBRIQUES_ACTUALITES` and
  `RUBRIQUES_DOCUMENTS` are only the **seed**, planted once on an empty table. Editing
  those lists therefore affects a fresh install and nothing else — which is exactly what
  you adjust for another client. Seeding only when the table is empty is deliberate: a
  rubrique deleted by the secretariat must not reappear at the next restart.
- **A rubrique's key is its URL and never changes.** Renaming edits the label and the
  description; the key stays. Changing it would break links already shared, printed in a
  bulletin, or indexed. Deleting a non-empty rubrique is refused rather than orphaning
  its content into invisibility.
- **The nav submenu is dynamic on rendered pages only.** `_layout.html` loops over the
  rubriques, so a new category appears in the menu of every page the server renders. The
  21 hand-written static pages keep the list frozen in their HTML — that's the cost of the
  partial migration, and it is the reason to finish converting them to templates.
- **Rich text is sanitised server-side by `contenu.py`, always.** The editor only
  produces allowed markup, but the API takes JSON — anyone with the password can post
  anything. The filter is on the server, never in the interface. It **rebuilds** from an
  allowlist rather than stripping what looks dangerous: an unknown tag is never emitted.
  `{{ a.contenu | safe }}` in `rubrique.html` is the only legitimate use of `| safe` in
  this repo, and only because of that.
- **The admin app is two tabs, dashboard first.** Actualités and Documents never show at
  once: the secretariat comes to publish one thing, not to scroll past the other. Each tab
  opens on what already exists — the frequent question is "what's online?", not "what can
  I add?" — and the forms live in overlay panels opened on demand. Deletion confirms on a
  **second click**, never with `confirm()`: a native dialog freezes every browser event,
  which this repo has been bitten by before.
- **A category with two hundred items scrolls sideways**, in the admin and on the public
  summary alike, rather than making an endless page. On the public summary the **sixth
  card is the "Voir plus" card**: you meet it exactly when there is nothing more to see
  there, whereas a button under the rail assumes you thought to look below it.
- **Clicking a card opens the actualité in a modal** (`actu-modal.js`), which fetches it
  from a small public read-only endpoint. Fail-open: the card *is* a link to its rubrique
  page, so no script, no network, or a static host means the click simply follows the
  link. `preventDefault()` there must stay **synchronous** — after an `await` the browser
  has already navigated and the call does nothing.
- **Each document rubrique's description sits directly above its own card**, not grouped
  with the others at the top of the page. All the definitions first, then all the blocks,
  forces a round trip to find out what the block you just opened contains.
- **Colour and alignment are classes, never inline styles.** `ta-center`, `co-alerte` and
  the rest are declared in three places that must agree: `CLASSES` in `contenu.py`
  (otherwise the attribute is stripped on save and the formatting silently vanishes),
  `styles.css` for the public rendering, and `admin.css` so the editor shows what will be
  published. A free colour picker was deliberately not offered — a site whose colours are
  chosen one publication at a time stops looking designed.
- **`config.py` holds everything client-specific.** No other Python module contains a
  commune name, a URL or a rubric. Templates *are* client-specific by nature — for
  another client you replace them. `_layout.html` was **extracted from a real page of
  the site**, not retyped, which is also how to start for a new client.
- **The nav now exists in two places**: 27 static files and `_layout.html`. That's the
  price of a partial migration and it will drift — a nav change has to be made in both.
  The layout can be re-extracted from any up-to-date static page (that's how it was
  built) rather than hand-patched.
- **Jinja macros need `with context`.** `_carte.html` is imported by both actualités
  templates; without `with context` an imported macro sees none of the caller's
  variables and the render dies on the first call. This cost a debugging round already.
- **Uploads are checked on their bytes**, not their extension, and stored under a
  generated name — never the uploaded filename, which is how path traversal gets in.
  PDF only.
- **PDFs open in the browser's viewer, they do not download.** The route sends
  `Content-Disposition: inline`; downloading is a separate, explicit link
  (`?telecharger=1`). Almost nobody opens `/mairie/arretes-et-publications/` to archive
  an arrêté — they come to read it, and a file landing in ~/Downloads unasked is a small
  act of aggression that then forces a detour. Note this means **not** passing
  `filename=` to `FileResponse`: that parameter forces `attachment`, which is exactly the
  behaviour being avoided. The header is composed by hand, with the filename sanitised
  (a quote or newline in an uploaded name would otherwise inject an HTTP header) and an
  RFC 5987 `filename*` so accents survive.
- **The document accordion opens the first rubric that has documents**, not the first
  rubric. With empty arrêtés and a bulletin in the third rubric, opening the first one
  makes the page look like it holds nothing at all.
- **`donnees/` is gitignored and is the only irreplaceable thing in the project.** The
  code is in git; the commune's actualités and arrêtés are not. Backups belong off the
  server.
- The app **refuses to start** without `BO_MOT_DE_PASSE_HACHE`. A back-office that
  publishes to a mairie's website does not run with a default password, not even "just
  for testing".

The database-backed pages exist as **static files too** (`actualites/index.html` and
`actualites/<clé>/index.html`), generated from the same Jinja templates with empty lists.
That's the GitHub Pages copy — same "théâtre" as the reservation form. They were
generated, not written: hand-writing them would have created a second truth that diverges
the first time a template changes. Regenerate them the same way after changing a template
or a rubrique.

### Security posture — what an audit fixed, and what it can't

A full security audit (2026-09) turned up no remotely exploitable flaw in the code, and
the fixes it produced are load-bearing. Four of them are easy to undo by accident:

- **The CSP lives in a `<meta>` on all 26 pages, repeated verbatim.** GitHub Pages sends
  no custom headers, so a meta tag is the only option. Two consequences. First, there's
  no templating here, so the policy is duplicated 26 times — change it with a grep for
  `Content-Security-Policy`, never on one page. Second, `frame-ancestors` is **ignored**
  in a meta CSP (spec rule), so the site stays framable and clickjacking can't be closed
  while it's hosted on GitHub Pages; the day it moves to a host that sends real headers,
  add `frame-ancestors 'none'` there rather than trying to make the meta work.
- **`script-src 'self'` holds only because no page has an inline `<script>`.** Adding one
  would force `'unsafe-inline'` and gut the most valuable directive in the policy. Inline
  `style=` attributes are a different matter — there are ~114 of them (`--i:0`,
  `justify-content`), hence `style-src 'unsafe-inline'`, which is far less dangerous.
  `connect-src` is `'self'`, not `'none'`: that's what lets the booking form reach a
  same-origin backend without touching the policy per environment. `form-action` stays
  `'none'` so a JS failure can't fall back to a native submit that would put a name and
  phone number in the URL.
- **Google Maps loads on click, never on page load** (`map-consent.js` +
  `.map-consent`). The two maps on `vie-pratique/dechets/` are the site's only third
  party; embedding them directly sent every visitor's IP to Google before they did
  anything, which a public-sector site can't do without consent. This script is the one
  place in the repo that deliberately **fails closed**: if it doesn't run, no map loads.
  Don't "simplify" it back to a plain `<iframe>`.
- **Personal form data expires by itself** — see `reservation-storage.js`, which owns
  that rule for both `script.js` and `confirmation.js`. Never read `luglon_reservations`
  directly from either; that would walk around the purge.

Two facts worth keeping in mind rather than rediscovering: the site has **zero
third-party JavaScript** (no CDN, self-hosted fonts), which is its single best security
property — weigh any proposed library against losing it; and the repo's public git
history contains a Google Apps Script `/exec` URL from the Comité des Fêtes era, which
is why that endpoint had to be redeployed rather than merely deleted from the code.

### Legal pages: three, not two

`mentions-legales/`, `confidentialite/` **and `accessibilite/`**. The last one is a RGAA
declaration, mandatory for a public-sector site (art. 47 of loi 2005-102, décret
2019-768), and it comes with an obligation the other two don't have: the conformity level
must appear on **every page**, which is why each footer carries an
`Accessibilité : non conforme` link. It says "non conforme" because no audit has been
run — that's the honest state, the same device used by `mairie/arretes-et-publications/`,
and it should be replaced by a measured figure once an audit happens, not quietly
upgraded to "partiellement conforme" because the site looks decent.

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
