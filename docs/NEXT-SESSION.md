# FanSport penalty landing — debug session and remaining work

## Context

`D:\fs-penalty` is a finished, deployed mobile-first landing page: the visitor
picks a target in the goal, the keeper saves the first attempt, the second
always scores, and scoring opens the FanSport registration card.

* Live: **https://design-mkt-1.github.io/fs-penalty/**
* Repo: `github.com/design-mkt-1/fs-penalty`, branch `main`, public
* Deploy: `.github/workflows/pages.yml` publishes on every push to `main` and
  uploads only `index.html`, `.nojekyll`, `css/`, `js/`, `assets/` — `raw/`
  (~28 MB of source renders) stays in the repo but is never served.
* Local dev: `python -m http.server 8000` in the project root, or the scratch
  no-cache server used previously. Nothing to build.

This document covers a debugging pass over four defects found by testing the
live site, plus the feature work that was deliberately deferred.

**How to resume:** open the repo on any machine and say *"read
`docs/NEXT-SESSION.md` and continue"*. It lives in the repo rather than in a
local scratch directory precisely so the work can be picked up from a different
computer. It states its findings in full rather than assuming any of them are
still in someone's head.

The repo is public, so this file stays to engineering facts — defects,
decisions, verification steps. No credentials, no client contacts, no
unreleased commercial terms.

### What a fresh session needs to know about the architecture

* Fixed **390 × 844** logical stage; `js/stage.js` scales it with a transform.
  The page must never scroll — that is the hard requirement of the whole design.
  `#stage` is a flex column where only `.pitch` is elastic.
* `js/animator.js` exposes `play` / `setPose` / `preload` behind a
  `CharacterAnimator` interface. There is no Spine runtime; poses are discrete
  sprites. `WRONG_WAY` is **derived** from the panel grid — do not turn it back
  into a hand-written table, that is what caused an earlier bug where the keeper
  dived onto the ball.
* `tools/cutout.py` rebuilds `assets/img/*.webp` from `raw/`. Only needed if the
  artwork changes.
* Outcome is decided by attempt index in `js/game.js`, never by the panel picked.

## Confirmed defects

All four were reproduced against the live site, not inferred from reading.

### 1. The page is dead after the registration card closes

`js/form.js` → `close()` hides the overlay but never clears
`stage.dataset.state`, which stays `"form"`. The rule in `css/game.css` that
disables input during a shot keeps `.panel` and `.ball` at
`pointer-events: none` forever.

Reproduced: after clicking `[data-action="close"]`, both computed styles were
`none` and `document.activeElement` was `BODY`.

### 2. The scripted sequence never resets

`attempt` in `js/game.js` is only ever incremented and the condition is
`attempt >= 2`. Reproduced: a third shot went straight to `celebrate` with no
save. This matters because it is the trap waiting for anyone who fixes defect 1
by simply clearing the state — the next shot would score instantly and re-open
the form.

### 3. The card claims to be a dialog but does not behave like one

`index.html` marks the card `role="dialog" aria-modal="true"`, yet focus is
never moved into it on open, focus is not trapped, `Escape` does not close it,
and focus is not returned to the trigger on close.

### 4. Dead argument

`js/game.js` calls `FSForm.open(panel.dataset.mult)` but `open()` in
`js/form.js` takes no parameter, so the multiplier the visitor won is
discarded.

### Checked and found healthy

Sprite preloading works — all six keeper sprites appear in the Resource Timing
entries on a cold load. Do not "fix" it.

## Decisions taken

| Topic | Decision |
|---|---|
| "GO TO WEBSITE" button | `location.reload()` for now; IT will supply the real signup URL later |
| Phone prefix | Uzbekistan `+998` only, single fixed prefix |
| Language selector | Becomes functional: **UZ / RU / EN**, choice persisted |
| Translations | Drafted here for UZ and RU, reviewed by the user before publishing |
| Legal copy (18+, T&C, responsible gambling) | Added later by the client's IT team |
| Meta description, Open Graph, favicon | **Out of scope** — not selected |

## Work items

### A. Fix the four defects

**`js/game.js`** — add a `reset()` to the public API that returns the stage to
`idle`, sets `attempt` back to `0`, clears `busy`, restores the idle pose and
re-shows the ball. Export it on `window.FSGame`.

**`js/form.js`** — `close()` must leave the page usable, not just hidden. Give
it a completion callback, and have the "GO TO WEBSITE" handler call
`location.reload()`. Keep the seam obvious and commented so swapping in the real
URL is a one-line change:

```js
// IT will replace this with the real signup URL.
var DESTINATION = null;   // e.g. 'https://fansport.example/signup?utm=penalty'
```

When `DESTINATION` is null, reload; otherwise navigate. This makes the eventual
handover mechanical.

**`js/form.js`** — accept and use the multiplier: `open(mult)` stores it and the
complete screen can show what was won. If the design has nowhere for it, keep
the parameter but drop the call site's argument rather than leaving it dangling.

**Focus management** in `js/form.js`: on open, remember `document.activeElement`,
move focus to the first field; trap Tab within `.card`; close on `Escape`;
restore focus on close. Guard against the page-scroll rule — use
`preventScroll: true` when focusing.

### B. Accessibility

* `index.html` line 5 — drop `maximum-scale=1, user-scalable=no` from the
  viewport meta. It blocks pinch zoom and fails WCAG 1.4.4. Verify afterwards
  that zooming does not break the no-scroll rule; `#viewport` already clips with
  `overflow: hidden`, so this should be safe, but it must be re-tested.
* Check contrast of `.tagline__text` and the multiplier labels over the artwork.
* Confirm every interactive element has a visible `:focus-visible` state —
  `.panel` and `.ball` already do; `.tab`, `.country`, `.cta` need checking.

### C. Self-hosted fonts

Replace the Google Fonts link in `index.html` with local `woff2` files in
`assets/fonts/`. Alan Sans and Roboto are both SIL Open Font License, so
redistribution is fine — keep the license file alongside them.

Benefits: no third-party request on first paint, works offline, and removes the
question of visitor IPs being sent to Google, which matters for an EU-facing
operator.

Downloading the font binaries needs a go-ahead at execution time.

### D. Three-language support

New `js/i18n.js` plus a strings table. Keep it plain and dependency-free, in the
style of the existing modules.

* Mark translatable nodes with `data-i18n="key"` in `index.html`; the module
  walks them on language change.
* Strings: tagline, miss message, `GOAL!`, the promo header, tab labels, field
  placeholders, validation errors, `Select bonus` options, CTA, footer auth
  line, and the complete screen.
* Persist to `localStorage`, mirror onto `document.documentElement.lang`.
* Wire the header selector — it currently renders but does nothing, and its
  markup lists six languages. Trim it to UZ / RU / EN.
* Uzbek is written in Latin script for this market, so no RTL work is needed.
* The registration card in Figma was originally written in Uzbek — reuse that
  wording for the UZ locale rather than translating the English back.

Draft UZ and RU, then have the user review before publishing.

### E. Real-device testing

Not a code change but the acceptance gate. iOS Safari and Android Chrome, over
the live URL:

* Drag the page vertically — nothing moves, no rubber-band.
* Open the card, focus a field, let the soft keyboard appear — the page still
  does not scroll, the card scrolls internally if it must.
* Rotate to landscape and back.
* A phone with a notch — check `env(safe-area-inset-*)` padding.
* Pinch zoom now works and does not break the layout.

## Files to touch

```
index.html          viewport meta, font links, data-i18n hooks, language list
js/form.js          close/reset seam, focus management, open(mult)
js/game.js          reset(), export it
js/i18n.js          new
css/form.css        focus-visible states if missing
assets/fonts/       new: Alan Sans + Roboto woff2 + OFL license
```

## Verification

1. Serve locally and run the full flow: miss, message, second shot, goal,
   confetti, card, submit, complete screen.
2. **Defect 1 and 2** — after the complete screen, confirm the page is usable
   again and that the sequence starts from the beginning: the next shot must be
   a save, not a goal.
3. **Defect 3** — with the card open: Tab cycles inside the card only, Escape
   closes it, focus returns to where it was.
4. **No-scroll** — assert `stage.scrollHeight === stage.clientHeight` and the
   same for `document.documentElement`, in every state: idle, after miss, card
   open, field focused, complete screen, after close.
5. **Languages** — switch UZ / RU / EN, confirm every visible string changes,
   reload and confirm the choice survives, confirm no layout overflows at the
   longest translation.
6. **Fonts** — Network tab shows no request to `fonts.googleapis.com` or
   `fonts.gstatic.com`, and the page renders in Alan Sans, not a fallback.
7. Push to `main` and confirm the Actions run turns green and the live URL
   serves the change; `raw/` must still return 404.
