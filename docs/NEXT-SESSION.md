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

### 1. The Pages source is wrong, and the whole repo leaks because of it

**This is the one blocker.** Every push currently triggers *two* deployments
that race each other:

| Workflow | What it publishes |
|---|---|
| `.github/workflows/pages.yml` (ours) | only `index.html`, `.nojekyll`, `css/`, `js/`, `assets/` |
| `pages-build-deployment` (GitHub's built-in) | **the whole repo** |

The built-in one is winning. Verified against the live URL on 2026-08-29,
before that day's work replaced the artwork:

```
raw/_raw-bg.png        200   6 219 457 bytes
raw/_raw-ball.png      200   4 263 097 bytes
docs/NEXT-SESSION.md   200
tools/cutout.py        200
```

`Last-Modified` matched the most recent deploy, so that was the current
publish and not a stale cache. Both of those files are gone now and `raw/` is
down from 28 MB to about 12, but the leak is the same leak: everything in the
repo is published, including `raw/`, `docs/` and `tools/`.

**Fix:** GitHub → repo → Settings → Pages → *Build and deployment* →
Source → **GitHub Actions**. That stops the built-in deployment and leaves
only `pages.yml`. It is a repo setting, not code — no commit can fix it.

Re-check afterwards: `curl -s -o /dev/null -w "%{http_code}"
https://design-mkt-1.github.io/fs-penalty/raw/_raw-keeper-idle.png` must
return **404**.

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
* **The keeper's dive.** Watched frame by frame on a desktop but never on a
  phone. Is 560ms too slow? Is the crouch readable, or does it look like a
  stutter?
* Everything listed under *What is next*, item B: the new pitch plate, the
  ball's spin and the two new keeper reactions have only ever been seen on a
  desktop.

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
  The goal is one `--gw` wide and the stadium plate is sized and placed in
  multiples of it. `FSStage.unit()` is the JS half of the same idea: the
  rendered goal width over the 360px the hand-tuned distances were written
  against.
* **The goal is in the photograph, and `.goal` draws nothing.** It is the
  painted goal's box — 690 x 248 of the 2752px render — and the plate is
  sized 3.9876 `--gw` across, 2.6606 tall, with its painted crossbar 1.0563
  `--gw` below its top edge, so the two land on each other at every size.
  Everything inside the goal is a percentage of that box. Change any of those
  three numbers without re-measuring `pitch-spot.webp` and the panels come off
  the posts.
* **The keeper's three numbers are derived, not tuned.** His figure is .809 of
  his sprite canvas and a 1.88m keeper is .770 of a 2.44m goal, which makes
  his box 95.24% of the goal's height and 22.95% of its width, and puts it
  6.57% below the goal line so his feet stand on it.
* **`js/animator.js` — do not turn `WRONG_WAY` back into a hand-written
  table.** It is derived from the panel grid. The table it replaced sent the
  keeper onto the ball for a goal into the bottom-centre panel. Keeper poses
  are percentages of his own box, so a dive lands on the same panel at any
  size.
* **Outcome is decided by attempt index in `js/game.js`**, never by the panel
  picked. `FSGame.reset()` puts both the stage state and the counter back.
* **The ball is a sprite sheet, not a still.** 24 frames of one revolution of
  a real sphere, rendered by `tools/ball_sheet.py`. `js/fx.js` picks the frame
  from the rotation and draws it in a frame rotated to the direction of
  travel, so the spin axis stays square to the trajectory.
* **`js/i18n.js` holds every visible string.** Nothing user-facing lives in
  the markup or in game.js/form.js any more. A fourth language is one more
  object in `STRINGS` and nothing else.
* **Type is self-hosted.** Six variable woff2 in `assets/fonts/`, one per
  unicode subset. Nothing is fetched from Google at runtime, and an English
  page pulls exactly one 37 kB file.
* `tools/cutout.py` rebuilds `assets/img/*.webp` from `raw/`; the four poses
  added on 2026-08-29 are kept already keyed there, as lossless RGBA WebP, and
  go through its `rgba` mode. `tools/ball_sheet.py` renders the ball outright.
  Neither is needed unless the artwork changes.

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
  were drawn on a plane tipped with `rotateX` to compensate. **Superseded on
  2026-08-29:** that plate is gone, the drawn plane with it, and the
  perspective comes from the photograph now. See below.
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

## What was done, 2026-08-29

Seven commits, all on `main`.

| Commit | What |
|---|---|
| `cbcc570` | The dust and the landing jolt stopped firing in mid-air; the net bulge made visible |
| `2903d92` | The multiplier labels, the hitmark and the message box — item C |
| `1ca2928` | The registration card brought back to its Figma node, value by value — item D |
| `b2e9b6a` | A new stadium plate, shot from the penalty spot, with the goal in it |
| `ac0a8a4` | A spinning ball rendered as a real sphere, and four more keeper poses |
| `3edce13` | This handoff and the README caught up |
| (next) | The dive offsets recalibrated to the new goal |

Four findings worth keeping:

* **A `backdrop-filter` is a stacking context.** While the glass plate lived
  on `.panel`, nothing inside the button could ever paint in front of the
  keeper — and the keeper stands in the middle column, so the bottom-centre
  `×3` was behind him with nowhere to move to. Measured off
  `keeper-idle.webp`, his silhouette spans 43.4% to 56.9% of the goal at that
  height and the label is 6.6% wide. The plate is on `.panel::before` now, at
  z-index 2; the label is at 4.
* **`transform: scale()` shrinks a border along with everything else.** The
  hitmark ring was a 2px border and its keyframes scale it, so at its
  brightest frame — 12% in, scale .4 — it rendered 0.8px wide. Paused there
  over the keeper's kit, nothing was visible at all. It is a gradient ring
  now, which keeps its share of the circle at every scale.
* **A percentage of the keeper's own box is not a fixed distance across the
  goal.** The dive offsets in `POSES` are shares of his box, and when the goal
  changed shape the box went from 30.6% of its width to 22.95% — so the same
  numbers carried him a quarter less far across a goal that had got wider. His
  glove reached 69.9% of the way across for a shot into a panel centred at
  81.7%. Rescaled 1.81x horizontally and 1.07x vertically, which puts every
  glove four points short of its panel centre, the relationship the old
  composition had.
* **The old plate was the wrong end of the ground, and no CSS could fix it.**
  Its white lines are the penalty area fifty metres away. Everything drawn to
  compensate — a near goal area on a plane tipped 80.2 degrees, squeezed to
  half width to bring it into frame — was compensating for a photograph that
  could not be made to agree.

### Decisions taken

| Topic | Decision |
|---|---|
| The background | Generated, not sourced. One plate shot from the penalty spot, carrying the goal, the six-yard box and the arc, so one camera makes all of them |
| `goal.webp` | Deleted. 312 kB of sprite the plate now carries itself |
| The panel labels | Retreat to the frame — top row to the crossbar, bottom row to the net base — and render in front of the keeper. No per-cell nudges |
| Keeper art | Generated against the existing sprite as a character reference, so the kit, the face and the camera match |
| `raw/` for new art | Kept already keyed, as lossless RGBA WebP: 900 kB against 3.7 MB, and `raw/` is served publicly until item A is done |
| Card colours | `--muted` stays `#9a9aa0` against the design's `#8e8e93`, which is 4.3:1 on the field background, and the "Log in" link keeps its underline |

---

## What is next

In order. Item A needs the repo owner; the rest is work.

### A. Set the Pages source to GitHub Actions

See *Two things only the repo owner can do* above. Still not done, and still
the only blocker: `raw/` is served on every visit. It is smaller than it was
— the goal's render and the ball's are gone, and the new poses are keyed
WebP — but ~12 MB of it should not be public at all.

Re-check afterwards: `curl -s -o /dev/null -w "%{http_code}"
https://design-mkt-1.github.io/fs-penalty/raw/_raw-keeper-idle.png` must
return **404**.

### B. Real-device testing — everything below is desktop-verified only

Nothing added on 2026-08-29 was seen on a phone. The standing checklist is
under *Two things only the repo owner can do* above; these are the new things
it does not cover:

* **The new plate.** It is 1800px wide and drawn up to 2233 CSS px on a
  desktop; on a phone it is drawn at about 1430 and should be sharp. Check
  that the foreground grass still reaches the ball — the extension at the
  bottom of the image is sized for 2.49 goal widths and there are 2.66, but
  that was calculated, not seen.
* **The ball's spin.** 4.5 turns in 620ms is 7.3 a second, and a 24-frame
  sheet at 60fps advances 2.9 frames a tick, which the motion blur covers on
  a desktop. A low-end phone at 30fps advances 5.8 — a quarter turn a frame
  — and it may strobe.
* **The two new reactions.** `cheer` holds for 900ms while the miss message is
  up, `beaten` for 1200 while the confetti falls. Both were verified to fire
  and to stand him back up; neither was watched at speed.

### C. The idle loop

He breathes, and between shots that is all he does. There are three sprites
now that are not dives and only two of them are used. The set position could
play on hover or focus of a panel rather than only inside the dive, which
would make the goal read as something being aimed at rather than clicked.

### D. Sound for the new beats

`assets/audio/` has `kick`, `save`, `net`, `cheer` and `whistle`. The
celebration and the head drop have no sound of their own.

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
9. **The goal is on the goal** — at any viewport the six panels sit inside
   the painted posts and the keeper's boots sit on the painted goal line. If
   they drift, the three plate numbers in `css/game.css` have stopped agreeing
   with the measurement of `pitch-spot.webp`.
