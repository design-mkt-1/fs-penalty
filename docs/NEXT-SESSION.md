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
* **The keeper's dive.** Watched frame by frame on a desktop on 2026-08-29
  (see item E) but never on a phone. Is 560ms too slow? Is the crouch
  readable, or does it look like a stutter?

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

### E. Feel-check the rebuilt animation — branch `feat/game-feel`

The rebuild from `d0a5081` **has now been watched**, on 2026-08-29, in a
foreground tab at 1912 x 867. Two defects came out of it and are fixed; the
rest of the list is what a real phone still has to answer.

How it was watched, because the method is reusable: the page cannot be
screenshotted fast enough to catch a 620ms flight, so instead
`window.requestAnimationFrame` was swapped for a no-op and every
`document.getAnimations()` entry paused, on a `setTimeout` at a chosen
millisecond. That freezes the canvas mid-paint and the dive mid-tween, and
the frame can then be inspected at leisure. Freezing at 668ms landed 28ms
into the net bulge, its peak, within 1ms of the request. Separately, pausing
just the two keeper animations and writing `currentTime` steps the dive to
any offset with no timing luck at all.

#### Fixed

**The dust plume and the landing jolt fired in mid-air.** Three of the six
poses end above the standing line — `jump_L2`, `jump_R2` and `jump_center`,
the ones with a negative `POSES[..].y`. game.js fired both off `TIMING.land`
for every dive, so on those three the grass puffed at the goal line and the
camera shook for an impact that never happened: measured on `jump_L2` at
`land`, the keeper's feet were at y 548 against 591 standing — 43px up, and
23px clear of the goal's own bottom edge at 571. `jump_L1` at the same frame
sits at 634, which is 42px *below* the line, on the grass, as it should be.

The animator now answers the question instead of game.js assuming it:
`PoseAnimator.impact(pose)` returns the frame, the place and the force. A
high dive's only contact with the grass is the push-off, so it takes
`TIMING.swap`, `--dust-x: 0%` and a softer 1.6; a low dive keeps `land`, the
landing offset and 2.6.

**The net bulge was never visible.** `reach` was `r * 3.4`, and `r` is the
ball as drawn on the net — about 16px on a 1912px stage, since the flight
ends at `S_END` of the kicked size. That put the bulge at 1.43 ball radii at
rest and 2.1 at its peak, so the bright half of the gradient sat underneath
the ball that `intoNet` paints on the same frame. The eight cords ran from
0.30 to 0.82 of that radius — also under the ball. And `burst()` fired in
the same statement, dropping 110 confetti bits on the strike point while the
bulge was still opening.

Three changes: `reach` is `r * 6.5`, the decay is `exp(-2.6 t)` from `0.34`
rather than `exp(-3.1 t)` from `0.30` so it rings down across the whole
520ms instead of being spent in the first 150, and the confetti waits 180ms.
The bulge now reads as an oval of light with cords, out to about the panel
edge, with the ball sitting in the middle of it.

#### Still only a real phone can answer

* Is 620ms of flight too fast to read? The ball leaves at full speed now —
  the old smoothstep hid this by starting slow.
* Does the `hang` float or hover? Measured: 570px/s through the launch
  (0.22 → 0.44), then 156px/s through the hang (0.44 → 0.76). It is 3.6x
  slower, which is a float by construction; whether 180ms of it is too long
  is an eye question.
* Is the 12° body roll too much for a sprite that already carries its angle?
* Is the parallax on `.turf` (1.4x the goal's shake) visible or wasted?
* A low-end phone. The heaviest frame costs 0.1ms median / 0.5ms worst on a
  1912x914 desktop canvas against a 16.7ms budget; that number means nothing
  about a cheap Android.

Where the dials are:

| Thing | File | Dial |
|---|---|---|
| Ball flight, perspective, shadow, motion blur | `js/fx.js` | `S_END` (0.30) governs both speed and size; `lift` (58) is the arc |
| Save deflection, net bulge, camera shake, confetti | `js/fx.js` | `deflect()`, `netBulge()`, `shake()` |
| The dive | `js/animator.js` | `TIMING` — duration 560, coil .18, swap .22, launch .44, hang .76, land .90 |
| Which frame the dust and jolt fire on | `js/animator.js` | `PoseAnimator.impact()` |
| Keeper shadow | `css/game.css` `.keeper-shadow` | width 34%, `bottom: -1.5%` |

What was verified numerically and still holds:

* The ball lands **0.0000px** from the panel centre, all six panels, at
  1912x914 and at 360x640.
* Mid-flight the ball spans y 462–522 on the canvas at alpha 255 and its
  shadow y 664–684 at alpha 48 — 142px of separation, the height cue.
* `prefers-reduced-motion` still flies the ball and still lands it exactly;
  only the trail, shake, bulge and confetti drop out.

Three long-standing defects were fixed on the way in `d0a5081`, and are
worth not reintroducing: `preload()` read `getComputedStyle().backgroundImage`,
which never fetches anything; `game.js` restated the dive timing as
`90 + 540 * 0.84`, so retuning the dive desynced the dust; and `play()`
forced a synchronous layout on every dive.

#### Confirmed, and still open — see item C

At rest the bottom-centre `×3` label is completely behind the keeper. That
is the patch item C already describes, not a new defect.


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
