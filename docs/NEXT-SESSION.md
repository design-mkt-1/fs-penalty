# FanSport penalty landing — where this stands, and what is next

## How to resume

Open the repo on any machine and say **"start"**. That means: read this file
and continue from *What is next* below. Everything above that section is
context; everything in it is work.

The file lives in the repo rather than in a scratch directory precisely so
the work can be picked up from a different computer. It states its findings
in full rather than assuming any of them are still in someone's head.

The repo is public, so this stays to engineering facts. No credentials, no
client contacts, no unreleased commercial terms.

## Context

`D:\fs-penalty` is a deployed mobile-first landing page: the visitor picks a
target in the goal, the keeper saves the first attempt, the second always
scores, and scoring opens the FanSport registration card.

* Live: **https://design-mkt-1.github.io/fs-penalty/**
* Repo: `github.com/design-mkt-1/fs-penalty`, branch `main`, public
* Local dev: `python -m http.server 8000` in the project root. Nothing to build.

---

## Two things only the repo owner can do

### 1. The Pages source is wrong, and 28 MB leaks because of it

**This is the one blocker.** Every push currently triggers *two* deployments
that race each other:

| Workflow | What it publishes |
|---|---|
| `.github/workflows/pages.yml` (ours) | only `index.html`, `.nojekyll`, `css/`, `js/`, `assets/` |
| `pages-build-deployment` (GitHub's built-in) | **the whole repo** |

The built-in one is winning. Verified against the live URL on 2026-08-29:

```
raw/_raw-bg.png        200   6 219 457 bytes
raw/_raw-ball.png      200   4 263 097 bytes
docs/NEXT-SESSION.md   200
tools/cutout.py        200
```

`Last-Modified` matches the most recent deploy, so this is the current
publish, not a stale cache. All 28 MB of `raw/` is being served on every
visit that touches it.

**Fix:** GitHub → repo → Settings → Pages → *Build and deployment* →
Source → **GitHub Actions**. That stops the built-in deployment and leaves
only `pages.yml`. It is a repo setting, not code — no commit can fix it.

Re-check afterwards: `curl -s -o /dev/null -w "%{http_code}"
https://design-mkt-1.github.io/fs-penalty/raw/_raw-ball.png` must return
**404**.

### 2. Real-device testing

Not a code change, but the acceptance gate. Chrome emulation covered twelve
viewport sizes; a real phone covers what emulation cannot. iOS Safari and
Android Chrome, over the live URL:

* Drag the page vertically — nothing moves, no rubber-band.
* Open the card, focus a field, let the soft keyboard appear — the page
  still does not scroll; the card scrolls inside itself if it must.
* Rotate to landscape and back. Below 640px tall the layout goes
  two-column: goal left, words and ball right.
* A phone with a notch — check the `env(safe-area-inset-*)` padding.
* Pinch zoom works and does not break the layout.
* **The keeper's dive.** This is the one piece verified only numerically —
  the test browser ran the page in a background tab, where timers are
  throttled, so nobody has watched it at full speed yet. Is 540ms too slow?
  Is the crouch readable or does it look like a stutter?

---

## What a fresh session needs to know about the architecture

* **The page must never scroll.** That is the hard requirement of the whole
  design. `html, body { position: fixed; overflow: hidden }` in
  `css/stage.css`. Every `focus()` call passes `preventScroll: true`.
* **The stage is the viewport.** There used to be a fixed 390 × 844 canvas
  scaled with a transform; it is gone. `#viewport` and `#stage` are query
  containers, and everything sizes itself in `cqw` / `cqh`. Two shape
  decisions — the landscape layout and the background placement — are
  container queries on `#viewport`, not media queries, because safe-area
  padding means the stage and the window are different boxes.
* **`--gw` is the unit.** `min(92cqw, 135cqh, 560px)`, declared on `.pitch`.
  The goal is one `--gw` wide and every pitch marking is a multiple of it.
  `FSStage.unit()` is the JS half of the same idea: the rendered goal width
  over the 360px the hand-tuned distances were written against.
* **`js/animator.js` — do not turn `WRONG_WAY` back into a hand-written
  table.** It is derived from the panel grid. The table it replaced sent the
  keeper onto the ball for a goal into the bottom-centre panel. Keeper poses
  are percentages of his own box, so a dive lands on the same panel at any
  size.
* **Outcome is decided by attempt index in `js/game.js`**, never by the panel
  picked. `FSGame.reset()` puts both the stage state and the counter back.
* **`js/i18n.js` holds every visible string.** Nothing user-facing lives in
  the markup or in game.js/form.js any more. A fourth language is one more
  object in `STRINGS` and nothing else.
* **Type is self-hosted.** Six variable woff2 in `assets/fonts/`, one per
  unicode subset. Nothing is fetched from Google at runtime, and an English
  page pulls exactly one 37 kB file.
* `tools/cutout.py` rebuilds `assets/img/*.webp` from `raw/`. Only needed if
  the artwork changes.

---

## What was done, 2026-08-28

Eight commits, all on `main` and live.

| Commit | What |
|---|---|
| `3f1db1d` | The four defects: dead page after the card closed, sequence never reset, the card was a dialog in name only, dead argument |
| `af15912` | Pinch zoom restored, focus rings on five controls that had none, two contrast failures fixed |
| `2e0b730` | Self-hosted type; Alan Sans replaced by Montserrat |
| `9cf7928` | Three locales UZ / RU / EN with a working language menu |
| `3edee5f` | Flags in the language menu; a 16 kB PNG dropped |
| `4cfbdb3` | Fluid layout; the goal put back on the grass |
| `f54c686` | Near pitch markings drawn; the photo stopped arguing with them |
| `503cfda` | Six sprites made to read as a real dive |

Three findings worth keeping:

* **Alan Sans has no Cyrillic.** Google Fonts serves it in latin, latin-ext
  and arabic only, so the Russian locale would have had no glyphs at all.
  That is why the display face is Montserrat now.
* **The photo carries the wrong end of the pitch.** Measuring `stadium.webp`
  (781 × 1400): the hoardings meet the grass 52% down, and the white lines at
  56% and 59.5% are the box at the *other* end of the ground. Drawing a near
  goal over them is what made the perspective read wrong. The near markings
  are drawn now, on a plane tipped with `rotateX`.
* **A WAAPI iteration easing composes on top of the per-keyframe ones.** With
  a curve as strong as this project's, the whole dive was crushed into its
  first fifth — every frame after 21% measured identical. The effect easing
  is `linear` now and the shaping lives on the frames.

### Decisions taken

| Topic | Decision |
|---|---|
| "GO TO WEBSITE" button | `DESTINATION` seam in `js/form.js`; null reloads, a URL navigates. IT supplies the real signup URL later — one line |
| Phone prefix | Uzbekistan `+998` only, single fixed prefix |
| Display face | Montserrat 900 everywhere, replacing Alan Sans |
| Languages | UZ / RU / EN, persisted in `localStorage` under `fs-lang` |
| Multiplier passed to the form | Dropped. `FSForm.open()` takes no argument |
| Penalty spot, penalty area, arc | Not drawn. The area and arc fall outside a 26° frame; the spot cannot stay under the ball across layouts — 4px apart on a phone, 189px on a desktop |
| Legal copy (18+, T&C, responsible gambling) | Added later by the client's IT team |
| Meta description, Open Graph, favicon | Out of scope |

---

## What is next

In order. Items A and B need the repo owner; C onward is code.

### A. Set the Pages source to GitHub Actions

See *Two things only the repo owner can do* above. Everything else can
proceed without it, but the site serves 28 MB it should not until it is done.

### B. Review the UZ and RU strings, and test on a real phone

The translations went live unreviewed, at the owner's call, to get a testable
link out. They are in `js/i18n.js` — 33 keys per locale. The Uzbek follows the
original Figma card, which was written in Uzbek, rather than translating the
English back.

Worth a second look in particular:

| Key | UZ | RU |
|---|---|---|
| `msg.miss` | Ozgina qoldi! Yana urinib koʻring | Так близко! Ещё попытка |
| `promo.sub` | yoki (AMOUNT) gacha + 150 FS | или до (AMOUNT) + 150 FS |
| `cta.website` | SAYTGA OʻTISH | ПЕРЕЙТИ НА САЙТ |
| `foot.have` | Akkauntingiz bormi? | Уже есть аккаунт? |

### C. The goal panels — labels, hitmark, message box

The multiplier labels are inside the panels but shoved clear of the keeper
with `transform: translateY(-4.4cqw)` and `translateY(8.3cqw)`
(`css/game.css`). It works, but it reads as the patch it is.

* Rework how ×2 / ×3 / ×12 sit in their panels so they do not need the nudge.
* The hitmark exists — `.hit` in `css/game.css`, a ring at the strike point,
  fired by `mark(panel)` in `js/game.js`. Check whether it reads at speed
  and whether the two centre panels need something different, since the
  keeper stands in front of them.
* The message box `.msg` sits at `top: 30%` of the stage, floating over the
  goal. Decide where it belongs now that the layout is fluid.

### D. The registration card against Figma

File `mAJyDSaXdr9GO72b7FGvI8`, node `1:2823`, named in a comment in
`index.html`. Pull it through the Figma MCP server and compare value by
value rather than by eye. The card was built from that node but has drifted —
and two of its colours changed for contrast (`--muted` is `#9a9aa0`, the
placeholder now uses it too).

### E. Feel-check and tune the dive

Depends on B. The dive is five keyframes over 540ms in `js/animator.js`:
coil at 21%, launch stretched at 58%, follow-through past the mark at 84%,
settle at 100%. The sprite swaps on the launch frame, 113ms in. If it reads
slow or stuttery on a real screen, `duration` and the `LAUNCH` constant are
the two dials.

---

## Verification

Serve locally with `python -m http.server 8000`, then:

1. **The full flow** — shoot, keeper saves, message, shoot again, goal,
   confetti, card, submit, complete screen.
2. **The page is still alive afterwards.** Press GO TO WEBSITE: the page
   reloads and plays. Then the no-reload path: open the card, press
   **Escape** — `getComputedStyle(document.querySelector('.panel')).pointerEvents`
   must be `"auto"` and `FSGame.attempt()` must be `0`. The next shot must be
   a save, not a goal.
3. **The card behaves like a dialog** — Tab cycles inside it only, Escape
   closes, focus returns to where it was.
4. **Nothing scrolls, in every state** (idle, after a miss, card open, field
   focused, complete screen, after close):
   `document.documentElement.scrollHeight === clientHeight`.
5. **Fluid** — across viewports from 320 × 568 to 1920 × 1200 plus landscape:
   the goal fits inside the pitch, the ball fits inside its zone, and the
   ball lands 0.00px from the panel centre (the flight translates in real
   pixels now, so this is exact by construction).
6. **Languages** — switch UZ / RU / EN; every visible string changes,
   including the ones that come from JS. Reload: the choice survives.
   `document.documentElement.lang` follows. Russian, the longest, does not
   overflow any button.
7. **Fonts** — `performance.getEntriesByType('resource')` shows zero entries
   matching `fonts.googleapis|gstatic`, and one woff2 on first paint.
8. **After pushing** — the Actions run is green, the live URL serves the
   change, and `raw/` returns **404**. It does not today; see item A.
