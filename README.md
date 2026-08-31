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
  stage.css     fluid zero-scroll shell, safe area, landscape layout
  game.css      pitch plate, goal geometry, glass plates, keeper, ball, tagline
  form.css      registration card
js/
  stage.js      canvas fit, safe-area, soft-keyboard handling
  audio.js      SFX pool, mute toggle
  animator.js   CharacterAnimator interface + PoseAnimator
  fx.js         ball flight, shadows, motion blur, net, shake, confetti
  i18n.js       every visible string, UZ / RU / EN
  game.js       state machine, the two scripted shots
  form.js       tab switch, validation, complete state
  main.js       boot
assets/img/     shipped artwork (WebP) and Figma exports (SVG)
raw/            source renders — NOT deployed (22 MB, still in the public repo)
tools/cutout.py     rebuilds assets/img from raw/
tools/ball_sheet.py renders the ball and its rotation frames outright
tools/sfx.py        renders the confetti burst and the keeper's head drop
```

## The no-scroll rule

The page must never scroll on a phone. That is enforced structurally, not with
patches:

* The stage **is** the viewport. There used to be a fixed 390 × 844 canvas
  scaled with a transform; it is gone. `#viewport` and `#stage` are query
  containers and everything inside sizes itself in `cqw` / `cqh`.
* `html, body` are `position: fixed; overflow: hidden; overscroll-behavior: none`.
* The stage is a flex column: header and ball row are fixed, the pitch is the
  only elastic row, so it absorbs whatever is left over.
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

The goal is not a sprite. `assets/img/pitch-spot.webp` is photographed from the
penalty spot and the goal, the six-yard box and the arc are all in it, in one
perspective. `.goal` is that painted goal's box and draws nothing: the plate is
sized and offset off `--gw` by three measured numbers so the two land on each
other at every screen size, and the panels, the keeper and the effects are
percentages of the box. `css/game.css` carries the measurements.

## Animation

There is no Spine runtime. Nano Banana Pro produces flat raster images, not
skeletons, and the Spine Runtimes license requires a Spine editor license for
production use. Instead `animator.js` exposes a small interface —
`play` / `setPose` / `preload` — implemented by `PoseAnimator`, which swaps
discrete pose sprites and translates them with the Web Animations API.

Pose names mirror the reference rig (`idle`, `jump_L1`, `jump_L2`, `jump_R1`,
`jump_R2`, `jump_center`, `jump_center_down`) so a real Spine skeleton can be
dropped in behind the same interface without touching `game.js`. Three more are
not dives: `ready` is the set position and plays through the coil of every one,
and `cheer` and `beaten` are the reactions `PoseAnimator.react()` holds after a
save and after a goal.

The ball is a 24-frame sprite sheet of one revolution of a real sphere, rendered
by `tools/ball_sheet.py`. `js/fx.js` picks the frame from the rotation and draws
it in a frame rotated to the direction of travel, so the spin axis is square to
the trajectory and the ball turns over along its own flight.

L and R are from the **viewer's** point of view, matching the panel columns.

## Rebuilding the artwork

`tools/cutout.py` turns the raw renders in `raw/` into the shipped sprites.
It keys out the flat backdrop, drops isolated artefacts the image model
hallucinated, trims, downscales and writes WebP.

```bash
python tools/cutout.py
```

Two modes:

* **grey** — the backdrop is achromatic and mid-bright while the subject is
  either saturated or much brighter. The background predicate is flood-filled in
  from the frame edge, so achromatic parts *inside* the subject survive.
* **rgba** — the source is already keyed and only needs resizing. The four poses
  added later are kept in `raw/` that way, as lossless RGBA WebP: the repo is
  public, so every byte of `raw/` is downloadable from it whatever the site
  serves, and a keyed render is 900 kB against the 3.7 MB its flat-grey PNG
  cost.

The ball no longer goes through this script at all, and neither does the goal:
`tools/ball_sheet.py` renders the ball, and the goal is painted into the pitch
plate.

Keeper poses are exported on the **full uncropped canvas**. Every raw render
shares one camera, so keeping the canvas keeps every pose in one coordinate
space; trimming each pose to its own bounding box would make the character jump
in size and position when the sprite swaps.

`keeper-jump_L2` and `keeper-jump_R1` are horizontal mirrors of their opposites
rather than separate generations — the kit carries no asymmetric mark.

## Design sources

* Brandbook, logo, registration card and header: Figma `mAJyDSaXdr9GO72b7FGvI8`
  (Registration Card `1:2823`, Header Mobile `1:3797`, Logo `1:427`).
* Display face **Montserrat**, self-hosted. It replaced Alan Sans, which Google
  serves in latin, latin-ext and arabic only — the Russian locale would have had
  no glyphs at all. The registration card follows its own design and uses Roboto.
* Primary green `#3FD62B`, secondary purple `#9A4FFE`.

## Audio

`assets/audio/` holds seven MP3s, 159 kB in total, and every one of them is
played from somewhere. Five are clips: `kick`, `save`, `net`, `cheer` and
`whistle`. Two are rendered from code by `tools/sfx.py` — `confetti`, the
burst that follows a goal, and `slump`, the keeper's head dropping after he
has been beaten. Both are synthesised for the same reason the ball is: the
output is reproducible from the repository and carries no third-party licence
onto a client's landing page. The script is deterministic, so re-running it
rewrites the same bytes and a diff means the recipe changed.

```bash
pip install lameenc      # the only dependency the other tools do not need
python tools/sfx.py
```

Playback is unlocked on the first user gesture — browsers refuse audio before
one — and the mute state is persisted in `localStorage`. `audio.js` tolerates a
missing file: that one effect simply never plays.

## Picking the work back up

`docs/NEXT-SESSION.md` is the handoff document: what stands, what was measured
to establish it, the decisions already taken, and the verification steps. Say
**"start"** and it means read that file and continue from *What is next*.

## Known gaps

* The registration card is client-side only — validation runs, but nothing is
  ever submitted. The offer amount is the `(AMOUNT)` placeholder from the design.
* The country picker is display-only and fixed to the `+998` dial code shown in
  the Figma mock.
* The UZ and RU strings in `js/i18n.js` went live unreviewed, at the owner's
  call, to get a testable link out.
