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

## The blocker that is gone

**Resolved 2026-08-29.** The Pages source is on GitHub Actions now, so only
`pages.yml` publishes and the built-in `pages-build-deployment` no longer
races it. Verified against the live URL after the audit deploy:

```
raw/_raw-keeper-idle.png   404
docs/NEXT-SESSION.md       404
tools/cutout.py            404
index.html                 200
```

One thing this does **not** fix, and it is worth being clear about: the repo
is public, so those files are still downloadable from GitHub itself.
`raw.githubusercontent.com/design-mkt-1/fs-penalty/main/raw/_raw-keeper-idle.png`
returns 200 with 2 485 104 bytes. `raw/` is 22 MB across 9 files and `.git/`
is 40 MB, so every clone pays for the renders twice. Taking them out of
tracking is a decision nobody has made yet — see *What is next*, item C.


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
  go through its `rgba` mode. `tools/ball_sheet.py` renders the ball outright
  and `tools/sfx.py` renders two of the seven sounds. None of the three is
  needed unless the artwork or the audio changes, and none of them ships —
  `pages.yml` copies an allowlist, so `tools/` is excluded by construction
  rather than by a rule somebody has to remember.

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

Nine commits, all on `main`.

| Commit | What |
|---|---|
| `cbcc570` | The dust and the landing jolt stopped firing in mid-air; the net bulge made visible |
| `2903d92` | The multiplier labels, the hitmark and the message box — item C |
| `1ca2928` | The registration card brought back to its Figma node, value by value — item D |
| `b2e9b6a` | A new stadium plate, shot from the penalty spot, with the goal in it |
| `ac0a8a4` | A spinning ball rendered as a real sphere, and four more keeper poses |
| `3edce13` | This handoff and the README caught up |
| `ef2fd10` | The dive offsets recalibrated to the new goal |
| `df20286` | A 20px email field, and a header that was never the design's |
| `9c3e8bb` | Full audit: five real faults, plus weight and accessibility |

Four findings worth keeping:

* **A `backdrop-filter` is a stacking context.** While the glass plate lived
  on `.panel`, nothing inside the button could ever paint in front of the
  keeper — and the keeper stands in the middle column, so the bottom-centre
  `×3` was behind him with nowhere to move to. Measured off
  `keeper-idle.webp`, his silhouette spans 43.4% to 56.9% of the goal at that
  height and the label is 6.6% wide. The plate is on `.panel::before` now, at
  z-index 2; the label is at 4. **Superseded on 2026-08-31:** the label is at
  2 as well, and passes behind him. The split is still load-bearing, but for
  the other reason — a blurred plate drawn over the keeper would frost him.
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

Four more, from the audit:

* **`max-width: 100%` is a no-op on a grid item that sets its own width.**
  `.sheet` is `display: grid; place-items: center`, so its implicit column is
  auto-sized — it took its width from the card's `width: 365px`, and the
  card's `max-width: 100%` then resolved against the column the card had just
  created. Circular, and silent. At 320px, 57px of the card sat outside the
  screen on a page that cannot scroll to reach it. `width: min(365px, 100%)`
  is the whole fix.
* **One unguarded `localStorage` read can take down a page that has nothing
  to do with storage.** `audio.js` read it at module scope. Storage that
  throws killed the IIFE, so `FSAudio` never existed, `main.js` threw on the
  next line, and `FSI18n`, `FSForm`, `FSGame` and `FSStage` never
  initialised. Confirmed by running the old file under a throwing stub: an
  uncaught `SecurityError` and no `FSAudio` at all. `i18n.js` had guarded its
  own two calls all along; `audio.js` had not.
* **A promise chain with one boolean latch and no `.catch` is a trap.**
  `busy` gates every shot. An injected throw inside a `.then` stranded it at
  `true` with nothing in the console. The fix is four lines, and the test is
  worth keeping: replace `FSForm.open` with a function that throws, score,
  and check the page still takes the next shot.
* **A hidden `role="status"` is not in the accessibility tree.** `say()` wrote
  the text and *then* unhid the element, so the miss message may never have
  been announced. Two lines, swapped.

### Decisions taken

| Topic | Decision |
|---|---|
| The background | Generated, not sourced. One plate shot from the penalty spot, carrying the goal, the six-yard box and the arc, so one camera makes all of them |
| `goal.webp` | Deleted. 312 kB of sprite the plate now carries itself |
| The panel labels | Retreat to the frame — top row to the crossbar, bottom row to the net base — and render in front of the keeper. No per-cell nudges. **Reversed 2026-08-31, see below** |
| Keeper art | Generated against the existing sprite as a character reference, so the kit, the face and the camera match |
| `raw/` for new art | Kept already keyed, as lossless RGBA WebP: 900 kB against 3.7 MB, and `raw/` is served publicly until item A is done |
| Card colours | `--muted` stays `#9a9aa0` against the design's `#8e8e93`, which is 4.3:1 on the field background, and the "Log in" link keeps its underline |
| The done screen | Left exactly as drawn. It says "Registration Successful!" and shows a masked password while nothing is registered anywhere — that is the client's flow to replace, not ours to soften |
| The card at 320px | Fixed in both halves: the box, and the four fixed type sizes in `form.css`, which was the only file in `css/` with no `clamp()` or `cq` unit |
| The brand ramps in `tokens.css` | Kept, not pruned. Most steps are unreferenced, but ~1.4 kB is nothing beside the images and the cost of losing them is a fourth hand-mixed green |
| SEO and meta | Still out of scope: no description, Open Graph, favicon or canonical |

---

## What was done, 2026-08-30 and 08-31

Two commits, both on `main`.

| Commit | What |
|---|---|
| `80b7533` | The audit recorded, the Pages blocker retired against the live URL, and three disagreeing figures for `raw/` settled at 22 MB |
| `eaea688` | The six multiplier labels centred in their own cells, passing behind the keeper |

One finding worth keeping:

* **Clearing the keeper cost the labels the thing they were for.** The
  08-29 rule pushed the top row against the crossbar and the bottom row onto
  the net base, so that the two centre labels cleared his silhouette. It
  worked, and it moved every glyph out of the middle of the plate it names —
  the top-centre `×3` read as printed on the keeper rather than on its cell.
  The six cells *are* the aim grid, so a label that has retreated to the frame
  no longer marks a target. Centring all six and letting him occlude costs
  only the glyph, only in the centre column, and only while he stands idle in
  front of it; both plates stay fully clickable either way. Labels also grew
  from `clamp(14px, 5.6cqw, 30px)` to `clamp(18px, 7.4cqw, 40px)` — the
  centred layout has the room the pinned one did not.

### Decisions taken

| Topic | Decision |
|---|---|
| The panel labels | Reversed from 08-29. Centred in their own cells, keeper at z-index 3 and both `.panel::before` and `.panel span` at 2, so the centre column passes behind him. Still one rule for all six — no per-cell nudges |
| `.panel` and `.panels` | Stay free of anything that forms a stacking context — `filter`, `opacity` below 1, `transform`, `will-change`. That is what keeps the plate and the label orderable against the keeper independently, and it is why `:active` scales the two halves rather than the button |

Both are live. The deploy of `eaea688` was confirmed on 2026-08-31; the
`raw/` 404 half of verification step 11 was checked separately on 08-30 and
is recorded under *The blocker that is gone*.

---

## What was done, 2026-08-31 — the loose ends

Item D, cleared except for one line that became a decision instead. Verified
in Chrome against a local server, every claim below measured rather than
assumed.

* **The two dead links.** `href="#"` offered a link that went nowhere and put
  a bare fragment in the address bar of a page that cannot scroll. Neither
  anchor carries an href in the markup now; `HOME_URL` and `LOGIN_URL` at the
  top of `js/main.js` put one there when the client supplies it. Until then
  they are not links at all — measured, not assumed: `focus()` on either
  leaves `document.activeElement` elsewhere. The `tabIndex` *property* still
  reads 0 on both, which is Chrome's IDL default for `<a>` and says nothing
  about focusability; only the behaviour does. The affordance is qualified on
  `[href]` in the CSS too, so the "Log in" underline and the logo's press
  scale arrive with the URL rather than before it. A side effect worth having:
  `FOCUSABLE` in `form.js` already began `a[href]`, so the card's focus trap
  stopped counting a tab stop that did nothing.
* **The bonus select had three faults, not one.** Its options carried no
  `value`, so the answer would have been whatever the label said in the
  current locale — confirmed by reading the payload in Russian. They are
  `casino` / `sport` / `none` now, and translation leaves them alone because
  `i18n.js` sets `textContent`. It was never read: `SUBMIT` in `form.js` is
  the seam, null by default, and it receives `{via, contact, bonus, lang}`.
  And `restore()` never reset it, so a second visit opened on the previous
  visitor's choice — `selectedIndex = 0` now, and `FSGame.reset()` was checked
  for the same class of omission and has none.
* **The headline no longer disappears in Windows High Contrast.**
  `background-clip: text` needs `color: transparent`, and forced-colors drops
  the background it was painting through, leaving nothing. A `forced-colors`
  block hands the glyphs `CanvasText` and drops the scrim and the glow with
  it. The rest of `css/` was checked for the same shape: `.tagline__text` is
  the only transparent text in the project, and the panels and the message box
  both carry a border and a background colour, which the mode forces rather
  than removes.
* **One rAF guard instead of four.** `FSFx.next` already existed and was
  already exported; `form.js` and `i18n.js` now call it. Both of their copies
  had drifted into describing "the fallback in game.js", and `game.js` has
  contained no `document.hidden`, `requestAnimationFrame` or `nextFrame` for
  some time. Three mount-at-opacity-0 paths depend on this — the card, the
  error line and the language menu — and all three were re-checked afterwards.
* **The two silent beats have sound.** `confetti` and `slump`, rendered by a
  new `tools/sfx.py` rather than sourced, for the reason the ball is rendered:
  reproducible from the repo and no third-party licence on a client's page.
  The first cut was wrong and the measurement caught it — a one-pole low-pass
  is 6dB an octave, which against noise is barely a filter, and the confetti
  came out centred at 9.8kHz, which is hiss. Four cascaded poles put it at
  4.2kHz and the keeper's slump at 289Hz. Both fire in the right place:
  the full order is now `kick | save | kick | net | cheer | confetti | slump`.
* **The three greens are one green.** `--cta` and `--promo` are gone from
  `form.css` and all seven use sites take `--accent`. Contrast was measured at
  each before the swap and none of them lost: black on the button 9.55:1 to
  9.99:1, black on an active tab 10.39 to 10.87, the offer line within a
  thousandth of its old luminance.

Two findings worth keeping:

* **Verification step 8 could not fail.** It checked that nothing matching
  `\.mp3` appears in `performance.getEntriesByType('resource')` before the
  first tap. Media element fetches never appear there at all: with all seven
  files demonstrably requested — they are in the server's access log, in a
  block, after `main.js` — that same call still returned zero `.mp3` entries.
  A test that passes whether or not the bug exists is worse than no test. The
  step is rewritten below to read the server log, which is where the evidence
  actually is. The behaviour itself is correct and was confirmed that way.
* **Port 8000 is not free on every machine.** `python -m http.server 8000` in
  the project root looked like it was serving this site and was serving
  something else entirely — 65 bytes of JSON from an unrelated local API that
  already held the port. Two verification passes ran against it before the
  size of the response gave it away. Check what answers before trusting it.

### Decisions taken

| Topic | Decision |
|---|---|
| The two link seams | `js/main.js`, not `form.js`. They are page chrome; `DESTINATION` is the conversion action and stays where the handoff already points at it |
| The submit payload | A `SUBMIT` seam that receives the answer, called last and inside a `try`. Tested with a hook that throws: the visitor still reaches the done screen and the console carries `[fs-penalty] the submit hook failed` |
| The country button | **Stays decorative.** It shows the flag and a caret while `+998` is fixed in `form.js`, and the visitor does not see the prefix until the done screen. Left as the Figma mock draws it, deliberately — this is now a known cosmetic gap, not a task |
| New audio | Synthesised in `tools/sfx.py`, not generated by a service and not sourced. Deterministic, so a rerun writes the same bytes and a diff means the recipe changed. Needs `pip install lameenc`, which the site does not |
| The greens | Unified on `--accent`. `form.css` keeps its own greys, ink and error red — those really are the card's design — but a green a hand's breadth from the brand's was nobody's decision |

---

## What is next

Item A is the acceptance gate and needs a phone. B and C are decisions
somebody has to make. D is work.

### A. Real-device testing — still the gate

Nothing added on 2026-08-29 has been seen on a phone, the audit fixes
included. Everything was verified in Chrome, across viewports from 320 x 568
to 1920 x 1200 plus landscape, which is not the same thing.

Standing checklist, on iOS Safari and Android Chrome over the live URL:

* Drag the page vertically — nothing moves, no rubber-band.
* Open the card, focus a field, let the soft keyboard appear — the page still
  does not scroll; the card scrolls inside itself if it must.
* Rotate to landscape and back. Below 640px tall the layout goes two-column.
* A phone with a notch — check the `env(safe-area-inset-*)` padding.
* Pinch zoom works and does not break the layout.
* **The card at 320px.** Fixed and measured — 296px wide, nothing clipped —
  but measured by forcing `#viewport`, not on a real 320px device.
* **The keeper's dive.** Is 560ms too slow? Is the crouch readable, or does it
  look like a stutter?
* **The ball's spin.** 4.5 turns in 620ms is 7.3 a second. A 24-frame sheet at
  60fps advances 2.9 frames a tick, which the motion blur covers. A low-end
  phone at 30fps advances 5.8 — a quarter turn a frame — and it may strobe.
* **The two reactions.** `cheer` holds 900ms, `beaten` 1200. Both fire and
  stand him back up; neither has been watched at speed.

### B. What only the client can supply

Every seam below is null on purpose and behaves sanely while it stays null.
Each is one line.

| What | Where | Note |
|---|---|---|
| The bonus figure | `js/i18n.js:41,82,123` | `(AMOUNT)` is a placeholder in all three locales, as in the source design. It cannot go live as it is |
| The signup URL | `js/form.js:13` | `var DESTINATION = null` — a null reloads the page, a URL navigates |
| Where the answer goes | `js/form.js:23` | `var SUBMIT = null` — a function receives `{via, contact, bonus, lang}` after the done screen is up. Nothing is sent anywhere until one is written |
| The home URL | `js/main.js:15` | `var HOME_URL = null` — the logo. Not a link at all until it is filled |
| The login URL | `js/main.js:16` | `var LOGIN_URL = null` — the "Log in" line, same behaviour |
| Legal copy | not present | 18+, T&C, responsible gambling. The client's IT team adds it |

### C. `raw/` is out of the site but still in the repo

The Pages leak is closed. The repo is public, so the 22 MB in `raw/` is still
downloadable from `raw.githubusercontent.com`, and `.git/` is 40 MB, so every
clone pays for the renders twice. Taking them out of tracking (`git rm
--cached` plus a `.gitignore` line) is reversible for anyone who keeps a copy
and irreversible for anyone who does not. Nobody has decided; do not do it
without asking.

### D. Loose ends in the code — done

All six were cleared on 2026-08-31 and the work is written up above. Nothing
here is outstanding. What is left of this item is two things that are not
tasks:

* **The country button stays decorative** (`index.html:152`) while the `+998`
  prefix is fixed in `js/form.js`. The visitor does not see the code they are
  typing under until the done screen. That is a decision, taken above, not an
  oversight — reopen it only if the design gains a second dial code.
* **Three seams are now null and waiting**, and none of them is a defect:
  `HOME_URL` and `LOGIN_URL` in `js/main.js`, `SUBMIT` in `js/form.js`. They
  belong to item B, with `DESTINATION`, and the client fills all four.

### E. If more comes back

The audit that produced item D was worth running and would be worth running
again after the real-device pass. Two things it did not cover: no locale but
English has been read by anyone who speaks it (`README.md` records that UZ and
RU went live unreviewed, at the owner's call), and nothing here has been put
in front of a screen reader on a phone, only in Chrome.

### F. The idle loop

He breathes, and between shots that is all he does. `keeper-ready.webp` is
only used inside the dive. Playing the set position on hover or focus of a
panel would make the goal read as something being aimed at rather than
clicked.

## Verification

Serve locally, then work through the list. Pick the port deliberately: 8000
was already held by an unrelated local API on one of the machines this is
developed on, and two verification passes ran against it before anyone
noticed. Confirm the server is this one before trusting anything below.

```bash
python -m http.server 8099 --bind 127.0.0.1
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' http://127.0.0.1:8099/
# 200 and roughly 13 kB. A few dozen bytes means something else answered.
```


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
   matching `fonts.googleapis|gstatic`, and two woff2 on an English first
   paint: `montserrat-latin` and `roboto-latin`, both preloaded from the head.
8. **Load order** — the plate and the two latin faces start at ~9ms; the nine
   dive sprites start after `domContentLoadedEventEnd`, not before it. Both
   from `performance.getEntriesByType('resource')`.

   **The audio half is not in resource timing and never was.** Media element
   fetches do not appear there, so the old form of this step — no `.mp3` in
   `getEntriesByType('resource')` before the first tap — returned zero
   whether the guard worked or not. Read the server's access log instead:

   ```
   GET /js/main.js            <- page load
   ...
   GET /assets/audio/kick.mp3 <- all seven, in one block, only after a tap
   ```

   Seven `.mp3` lines, none of them above `main.js`. If any appears before
   the first tap, `preload` in `js/audio.js` has stopped being `'none'`.
9. **The card fits** — force `#viewport` to 320 x 568, open the card, and no
   descendant of `.card` extends past `.sheet`. At 390 the card is 365px and
   the numeral 76px, unchanged from the design.
10. **The page cannot be locked** — replace `FSForm.open` with a function that
    throws, score, and check `.panel` still has `pointer-events: auto` and the
    next shot fires. The console must carry
    `[fs-penalty] the shot sequence failed`.
11. **After pushing** — the Actions run is green, the live URL serves the
    change, and `raw/` returns **404**.
12. **The goal is on the goal** — at any viewport the six panels sit inside
    the painted posts and the keeper's boots sit on the painted goal line. If
    they drift, the three plate numbers in `css/game.css` have stopped
    agreeing with the measurement of `pitch-spot.webp`.
13. **The card forgets the last visitor** — open it, set the bonus to
    anything but the first option, type a number, close with **Escape**, then
    score again. The bonus is back on the first option and the field is
    empty. `restore()` used to miss the select.
14. **The null seams are inert, not styled** — with `HOME_URL`, `LOGIN_URL`
    and `SUBMIT` still null: `document.querySelector('.card .foot a').focus()`
    leaves `document.activeElement` elsewhere, and "Log in" carries no
    underline. Ignore the `tabIndex` property — it reads 0 on an anchor with
    no href and means nothing. Fill a seam and both come back.
15. **A hostile submit hook costs a delivery, not the card** — set `SUBMIT` to
    a function that throws, score, submit. The done screen still appears with
    the right number, and the console carries
    `[fs-penalty] the submit hook failed`.
16. **The bonus answer is not a translated label** — switch to Russian, open
    the card, and every `#fs-bonus` option still reads `casino` / `sport` /
    `none` in `value` while its text is Cyrillic.
17. **The headline survives forced colours** — in Windows High Contrast, or
    Chrome DevTools *Rendering → Emulate CSS media forced-colors: active*,
    `.tagline__text` is readable and the six panels still show their borders.
18. **Regenerating the audio changes nothing** — `python tools/sfx.py` twice
    over leaves `assets/audio/confetti.mp3` and `slump.mp3` byte-identical.
    A diff means the recipe in `tools/sfx.py` changed, which is the only way
    it should ever change.
