# FanSport — Penalty Landing Page

A mobile-first, single-screen landing page. The visitor picks a target in the
goal, the keeper saves the first attempt, the second attempt always scores, and
scoring opens the FanSport registration card.

Static site: no build step, no runtime dependencies. Open `index.html` through
any static server.

```bash
python -m http.server 8000     # then http://127.0.0.1:8000/
```

## Layout

```
index.html
css/
  reset.css     normalise
  tokens.css    FanSport palette and type scale, from the brandbook
  stage.css     fixed viewport, zero-scroll, scale-to-fit
  game.css      pitch, goal, glass plates, keeper, ball, tagline
  form.css      registration card
js/
  stage.js      viewport fit, safe-area, soft-keyboard handling
  audio.js      SFX pool, mute toggle
  animator.js   CharacterAnimator interface + PoseAnimator
  game.js       state machine, ball flight, celebration
  form.js       tab switch, validation, complete state
  main.js       boot
assets/img/     shipped artwork (WebP) and Figma exports (SVG)
raw/            uncompressed source renders — NOT deployed (~28 MB)
tools/cutout.py rebuilds assets/img from raw/
```

## The no-scroll rule

The page must never scroll on a phone. That is enforced structurally, not with
patches:

* The stage is a fixed **390 × 844** logical canvas. `stage.js` computes
  `scale = min(vw/390, vh/844)` and applies it as a transform, so internal
  layout never depends on the real viewport.
* `html, body` are `position: fixed; overflow: hidden; overscroll-behavior: none`.
* The stage is a flex column: header and ball row are fixed, the pitch is the
  only elastic row, so the total is always exactly 844.
* The registration card is an overlay that scrolls *inside itself* when the soft
  keyboard shrinks the visual viewport. A `visualViewport.resize` listener
  re-runs the fit.

## Game rules

Outcome is decided by attempt index, never by the panel the visitor picks. All
six panels stay interactive on both attempts; the chosen panel only selects
which dive plays and where the ball flies. The attempt counter lives in memory,
so a reload restarts the sequence.

Tapping the **ball** is the "surprise me" shot: it picks one of the six panels
at random and shoots there. It is a real `<button>`, so it is keyboard
reachable and announced, and it runs through exactly the same scripted outcome.

The goal is placed so the base of the posts lands at about stage y 485.
Measured off `stadium.webp`, the advertising hoardings run down to stage y 428
and the grass starts there — anything higher reads as standing on the stands
rather than on the pitch. A contact shadow under the posts plants it.

## Animation

There is no Spine runtime. Nano Banana Pro produces flat raster images, not
skeletons, and the Spine Runtimes license requires a Spine editor license for
production use. Instead `animator.js` exposes a small interface —
`play` / `setPose` / `preload` — implemented by `PoseAnimator`, which swaps
discrete pose sprites and translates them with the Web Animations API.

Pose names mirror the reference rig (`idle`, `jump_L1`, `jump_L2`, `jump_R1`,
`jump_R2`, `jump_center`) so a real Spine skeleton can be dropped in behind the
same interface without touching `game.js`.

L and R are from the **viewer's** point of view, matching the panel columns.

## Rebuilding the artwork

`tools/cutout.py` turns the raw renders in `raw/` into the shipped sprites.
It keys out the flat backdrop, drops isolated artefacts the image model
hallucinated, trims, downscales and writes WebP.

```bash
python tools/cutout.py
```

Two keying strategies, because the subjects differ:

* **grey** (keeper poses, ball) — the backdrop is achromatic and mid-bright
  while the subject is either saturated or much brighter. The background
  predicate is flood-filled in from the frame edge, so achromatic parts *inside*
  the subject survive.
* **magenta** (goal) — the net is full of holes that show the backdrop but are
  not connected to the frame edge, so a flood fill would leave them opaque. A
  global colour test is used instead, followed by a despill pass.

Keeper poses are exported on the **full uncropped canvas**. Every raw render
shares one camera, so keeping the canvas keeps every pose in one coordinate
space; trimming each pose to its own bounding box would make the character jump
in size and position when the sprite swaps.

`keeper-jump_L2` and `keeper-jump_R1` are horizontal mirrors of their opposites
rather than separate generations — the kit carries no asymmetric mark.

## Design sources

* Brandbook, logo, registration card and header: Figma `mAJyDSaXdr9GO72b7FGvI8`
  (Registration Card `1:2823`, Header Mobile `1:3797`, Logo `1:427`).
* Signature font **Alan Sans**; the registration card follows its own design and
  uses Roboto.
* Primary green `#3FD62B`, secondary purple `#9A4FFE`.

## Audio

`assets/audio/` holds `kick`, `save`, `net`, `cheer` and `whistle` as MP3.
Playback is unlocked on the first user gesture — browsers refuse audio before
one — and the mute state is persisted in `localStorage`. `audio.js` tolerates a
missing file: that one effect simply never plays.

## Picking the work back up

`docs/NEXT-SESSION.md` is the handoff document: four confirmed defects with the
evidence that reproduced them, the decisions already taken, and the verification
steps. Start there.

## Known gaps

* The registration card is client-side only — validation runs, but nothing is
  ever submitted. The offer amount is the `(AMOUNT)` placeholder from the design.
* The country picker is display-only and fixed to the `+998` dial code shown in
  the Figma mock.
* The language selector renders but is inert; all copy is English.
