/* The scene effects layer: everything that moves and is not a character.

   The ball, its ground shadow, its motion blur, the net taking the shot and
   the celebration confetti are all drawn here, on one canvas, from one
   requestAnimationFrame loop. The DOM keeps only what has to stay a real
   element -- the .ball button, which is focusable and announced -- and hands
   the flight over to this file the moment a shot is taken.

   Why a canvas at all: a DOM ball cannot be motion-blurred, and a DOM shadow
   cannot separate from it convincingly. Those two are most of what makes a
   flight read as an object travelling away rather than a sticker shrinking.

   Every hand-tuned distance in here is in the same units js/game.js used:
   pixels at a 360px goal, multiplied by FSStage.unit(). */
(function () {
  'use strict';

  /* ══ the camera ═══════════════════════════════════════════════

     One number governs both how fast the ball crosses the screen and how
     small it gets, because in a real camera those are the same fact.

     A ball struck at constant speed away from the lens has its depth z grow
     linearly with time. A pinhole projects a lateral offset X at depth z to
     X/z on screen, so screen progress is (t/z) normalised -- strongly
     front-loaded -- and apparent size is 1/z. Deriving both from S_END means
     they can never disagree: at t=1 the ball is exactly on the panel centre
     at exactly S_END of its size, whatever else is retuned.

     The old code used smoothstep for progress and a linear ramp for scale.
     Smoothstep starts at zero velocity, which is why the ball used to leave
     the foot slowly -- the loudest single tell that this was not a game. */
  var S_END = 0.30;                 // apparent size on the goal line
  var Z_END = 1 / S_END;            // 3.333 -- depth there

  function depth(t)    { return 1 + (Z_END - 1) * t; }
  function progress(t) { return Z_END * t / depth(t); }
  function scaleAt(t)  { return 1 / depth(t); }

  /* ══ one loop for everything ══════════════════════════════════

     There were four near-identical rAF wrappers in the project (game.js,
     form.js, i18n.js and this one), each guarding against a hidden tab, where
     rAF never fires and would otherwise wedge a promise chain forever. That
     guard lives here once now, exported as FSFx.next, and every actor shares
     a single loop, a single clear and a single frame of layout work.

     Keep it that way. The copies did not merely repeat each other -- two of
     them ended up describing a fallback in game.js that had already been
     deleted, and a comment nobody can act on is worse than no comment. */

  var actors = [];
  var spinning = false;
  var last = 0;

  function now() {
    return performance.now();
  }

  function schedule(fn) {
    if (document.hidden) return setTimeout(function () { fn(now()); }, 16);
    return requestAnimationFrame(fn);
  }

  function pump() {
    if (spinning) return;
    spinning = true;
    last = now();
    schedule(beat);
  }

  function beat(stamp) {
    // A hidden tab, or a phone that slept, can hand back a gap of seconds.
    // Clamp it: the actors integrate against dt, and one huge step would
    // teleport the ball through the goal instead of into it.
    var dt = Math.min((stamp - last) / 1000, 0.05);
    last = stamp;

    clear();

    for (var i = 0; i < actors.length; i++) {
      if (actors[i](stamp, dt) === false) { actors.splice(i, 1); i--; }
    }

    if (actors.length) return schedule(beat);
    spinning = false;
    clear();
    live(false);
  }

  /* Run cb on the next frame -- or on a timer if the tab is hidden, where
     requestAnimationFrame never fires at all. Exported as FSFx.next: game.js,
     form.js (the card and the error line) and i18n.js (the language menu) all
     come through here, and none of them keeps a copy any more. Each of those
     mounts an element at opacity 0 and adds a class one frame later, so a
     frame that never arrives leaves something invisible and open. */
  function next(cb) {
    schedule(function () { cb(); });
  }

  /* An actor is a function (stamp, dt) that draws itself and returns false
     when it is finished. Draw order is insertion order, which is the order
     things are fired in: ball, then net, then confetti. */
  function add(fn) {
    actors.push(fn);
    pump();
  }

  /* ══ canvas and geometry ══════════════════════════════════════ */

  var stage, canvas, ctx, goalEl;

  function box() {
    return stage.getBoundingClientRect();
  }

  /* Stage-local coordinates. The canvas covers #stage and js/stage.js has
     already set the buffer transform, so everything drawn here is in CSS
     pixels measured from the stage's top-left corner. */
  function local(el) {
    var s = box();
    var r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - s.left,
      y: r.top + r.height / 2 - s.top,
      w: r.width,
      h: r.height
    };
  }

  function k() {
    return window.FSStage ? FSStage.unit() : 1;
  }

  function clear() {
    if (!ctx) return;
    var s = box();
    ctx.clearRect(0, 0, s.width, s.height);
  }

  function live(on) {
    if (canvas) canvas.classList.toggle('is-live', on !== false);
  }

  function reduced() {
    return !!(window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* Where the net meets the grass, in stage pixels. .goal is the painted
     goal's box now and its bottom edge is the goal line itself, so this is
     simply that edge -- it used to be 89.9% of the way down a sprite whose
     bottom tenth was the net base. The ball's shadow travels to here. */
  function goalLine() {
    return goalEl.getBoundingClientRect().bottom - box().top;
  }

  /* ══ the ball bitmap ══════════════════════════════════════════

     One revolution of a real sphere, 24 frames on a 6x4 sheet, rendered by
     tools/ball_sheet.py: the panels are a spherical Voronoi over the 32 face
     centres of a truncated icosahedron, which is what a football is, and the
     shading is a light direction, a specular lobe and a rim sampled off the
     surface normal. assets/img/ball.webp is frame 0 of the same render, so
     the ball on the spot and the ball in flight are the same object.

     The ball used to be that one still, turned in the screen plane with
     ctx.rotate. A ball that spins like a wheel while it flies away from you
     is the same tell as a ball that does not spin at all: the panels never
     move over the surface, so nothing about it is round. These frames turn
     about the sphere's own axis, and drawBall aligns that axis with the
     trajectory.

     Decoded once. drawImage of an ImageBitmap skips the decode path an <img>
     can take, which matters when the trail draws it six times a frame. */

  var BALL_FRAMES = 24;
  var BALL_COLS = 6;
  var BALL_CELL = 176;

  var ballArt = null;
  var ballArtFailed = false;

  function loadBall() {
    var img = new Image();
    img.decoding = 'async';
    /* Without this, a 404 on the sheet is silent and invisible in the worst
       way: ballArt stays null, drawBall returns immediately, and shoot() has
       already hidden the DOM ball — so the flight plays with no ball in it and
       the promise resolves as if nothing were wrong. */
    img.onerror = function () { ballArtFailed = true; };
    img.onload = function () {
      if (!window.createImageBitmap) { ballArt = img; return; }
      createImageBitmap(img).then(
        function (bmp) { ballArt = bmp; },
        function ()    { ballArt = img; }
      );
    };
    img.src = 'assets/img/ball-spin.webp';
  }

  /* r is the RADIUS AS DRAWN -- the resting radius already multiplied by the
     depth scale. Passing the resting radius instead draws a ball that never
     recedes, which is exactly what a flat 2D sticker looks like.

     `spin` is radians of the ball's own rotation and picks the frame; `dir`
     is the direction of travel, and everything is drawn in a frame rotated to
     it. That does two jobs at once: the sheet's spin axis ends up square to
     the trajectory, so the ball turns over along its flight rather than
     rolling sideways, and the squash is along travel rather than along the
     screen axes. */
  function drawBall(x, y, r, spin, sx, sy, dir, alpha) {
    if (!ballArt) return;

    var f = Math.floor(spin / (Math.PI * 2) * BALL_FRAMES) % BALL_FRAMES;
    if (f < 0) f += BALL_FRAMES;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(dir);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    ctx.drawImage(ballArt,
                  (f % BALL_COLS) * BALL_CELL,
                  Math.floor(f / BALL_COLS) * BALL_CELL,
                  BALL_CELL, BALL_CELL,
                  -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  /* The shadow the old build never had: .ball-zone::after was a static
     ellipse that stayed on the spot while the ball flew away, so the ball
     read as a shrinking sticker. This one tracks the ball's ground point and
     opens a gap as the ball climbs -- the gap is the height cue. */
  function drawShadow(x, groundY, r, s, ballY) {
    var gap = Math.max(groundY - ballY, 0);
    var soft = Math.min(gap / (240 * k()), 1);
    var w = r * 1.7 * s * (1 + soft * 0.35);
    var h = r * 0.40 * s;
    var a = 0.46 * (1 - soft * 0.72);
    if (a <= 0.02 || w < 0.6 || h < 0.4) return;

    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(0,0,0,' + a.toFixed(3) + ')');
    g.addColorStop(0.62, 'rgba(0,0,0,' + (a * 0.55).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(w, h);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ══ camera shake ════════════════════════════════════════════

     Two variables, one plane. It used to drive a parallax: the goal at 1x and
     the drawn near markings at 1.4x, on the argument that near things swing
     further. Those markings are in the photograph now, and so is the goal, so
     there is nothing left to have a parallax against -- the plate, the goal,
     the keeper and the caption all move together, which is what a camera
     shake is.

     Still written on .pitch, but .pitch is now the thing that moves:
     css/game.css puts the two variables on its `translate`. It no longer
     clips, so transforming it cannot show its edges. */
  function shake(ms, px) {
    if (reduced()) return;
    var pitch = document.querySelector('.pitch');
    if (!pitch) return;
    var amp = px * k();
    var t0 = now();

    add(function (stamp) {
      var t = (stamp - t0) / ms;
      if (t >= 1) {
        pitch.style.setProperty('--shake-x', '0px');
        pitch.style.setProperty('--shake-y', '0px');
        return false;
      }
      var a = amp * (1 - t) * (1 - t);
      var x = a * Math.sin(t * 58);
      var y = a * Math.cos(t * 47) * 0.62;
      pitch.style.setProperty('--shake-x', x.toFixed(2) + 'px');
      pitch.style.setProperty('--shake-y', y.toFixed(2) + 'px');
      return true;
    });
  }

  /* ══ the net taking the shot ══════════════════════════════════

     The net is painted into the pitch plate, so it cannot deform. What
     can be drawn over it is the light a stretched net catches: a bulge that
     punches out on impact and comes back with damped swings, plus short
     cords radiating from the strike point. 520ms, about how long a real net
     rings for. */
  function netBulge(x, y, r) {
    if (reduced()) return;
    var t0 = now();
    var life = 520;

    /* `r` is the ball as drawn on the net -- about 16px on a 1912px stage,
       since the flight ends at S_END of its kicked size. At 3.4 the bulge
       measured 1.43 ball radii at rest and 2.1 at its peak, so the whole
       bright half of the gradient sat under the ball that intoNet paints on
       the same frame, and nothing of it was ever visible. 6.5 puts the mid
       stop of the gradient at about two ball radii and the rim well clear. */
    var reach = r * 6.5;

    add(function (stamp) {
      var t = (stamp - t0) / life;
      if (t >= 1) return false;

      // Punch out fast, then ring down.
      var swing = Math.exp(-4.2 * t) * Math.cos(t * Math.PI * 3.1);
      var open = (1 - Math.exp(-14 * t)) * swing;
      var rad = reach * (0.42 + 0.58 * Math.abs(open));
      // -3.1 spent the bulge in the first 150ms of its 520. A net rings
      // down over the whole of it.
      var a = 0.34 * Math.exp(-2.6 * t);
      if (a <= 0.01 || rad < 1) return true;

      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(255,255,255,' + (a * 0.42).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();

      // The cords. They stretch with the bulge and fade with it.
      ctx.strokeStyle = 'rgba(255,255,255,' + (a * 1.25).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, 1.1 * k());
      for (var i = 0; i < 8; i++) {
        var ang = (i / 8) * Math.PI * 2 + 0.2;
        var i0 = rad * 0.30;
        var i1 = rad * (0.72 + 0.28 * Math.abs(open));
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * i0, y + Math.sin(ang) * i0 * 0.86);
        ctx.lineTo(x + Math.cos(ang) * i1, y + Math.sin(ang) * i1 * 0.86);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    });
  }

  /* ══ the flight ═══════════════════════════════════════════════

     Resolves with the ball's state at the moment it stops, which is what
     deflect() carries on from.

     opts.stopAt cuts the flight short, as the save does: the ball meets the
     glove in front of the line rather than reaching the net. */
  function shoot(ballEl, targetEl, opts) {
    opts = opts || {};
    var soft = reduced();
    var K = k();
    var duration = opts.duration || (soft ? 260 : 620);
    var stopAt = opts.stopAt || 1;

    var b = local(ballEl);
    var g = local(targetEl);
    var r0 = b.w / 2;

    var dx = g.x - b.x;
    var dy = g.y - b.y;
    var dir = Math.atan2(dy, dx);

    // The shadow's road: from under the ball to the goal line.
    var ground0 = b.y + r0 * 0.94;
    var ground1 = goalLine();

    // Peak height of the arc above the straight line, in world terms. It is
    // multiplied by the depth scale when drawn, so the arc flattens as the
    // ball recedes exactly as a real one does.
    var lift = 58 * K;
    // Radians of the ball's own rotation over the flight. 28 is 4.5 turns in
    // 620ms, which is 7.3 a second -- what a struck penalty actually does.
    // The sign is fixed, not taken from the direction any more: the axis is
    // square to the trajectory now, so the sign is backspin against topspin
    // rather than which way a wheel rolls.
    var spinRate = 28;

    live(true);
    ballEl.classList.remove('is-bobbing');
    ballEl.style.transition = '';
    // Keep the DOM ball if the canvas has nothing to draw in its place.
    if (!ballArtFailed) ballEl.style.opacity = '0';

    function at(t) {
      var u = progress(t);
      var s = scaleAt(t);

      // Squash off the boot: a couple of frames of the ball flattened along
      // its own direction of travel. Weight, in the cheapest possible form.
      var punch = Math.max(0, 1 - t / 0.14);
      var sq = soft ? 0 : punch * punch;

      return {
        t: t,
        u: u,
        s: s,
        r: r0,
        x: b.x + dx * u,
        y: b.y + dy * u - lift * 4 * t * (1 - t) * s,
        ground: ground0 + (ground1 - ground0) * u,
        spin: spinRate * u,
        sx: 1 + 0.26 * sq,
        sy: 1 - 0.20 * sq
      };
    }

    /* Real motion blur, not a decorative trail: five samples of the interval
       the ball actually crossed since the last frame. At 620ms across a
       phone-height screen the ball moves about 30px per frame, so without
       this it is a row of stamps. */
    function drawTrail(a, c) {
      var span = c - a;
      if (span <= 0) return;
      var head = at(c);
      var tail = at(a);
      var moved = Math.sqrt(Math.pow(head.x - tail.x, 2) +
                            Math.pow(head.y - tail.y, 2));
      if (moved < r0 * head.s * 0.9) return;

      for (var i = 1; i <= 5; i++) {
        var f = i / 6;
        var p = at(a + span * f);
        drawBall(p.x, p.y, r0 * p.s, p.spin, 1, 1, dir, 0.09 + 0.19 * f);
      }
    }

    return new Promise(function (resolve) {
      var t0 = now();
      var prev = 0;

      add(function (stamp) {
        var raw = (stamp - t0) / duration;
        var t = Math.min(raw, stopAt);
        var state = at(t);

        if (!soft) drawTrail(prev, t);
        drawShadow(state.x, state.ground, r0, state.s, state.y);
        drawBall(state.x, state.y, r0 * state.s, state.spin,
                 state.sx, state.sy, dir, 1);

        prev = t;

        if (raw < stopAt) return true;
        resolve(state);
        return false;
      });
    });
  }

  /* ══ the save ═════════════════════════════════════════════════

     What used to happen: the flight was cut at 82% and the ball faded out
     mid-air with no contact of any kind. What happens now: the ball comes
     back off the glove towards the camera, so it grows instead of shrinking,
     falls under gravity, bounces once on the grass and leaves the frame. The
     moment of contact is visible because the ball changes direction. */
  function deflect(state, side) {
    var K = k();
    var soft = reduced();
    var life = soft ? 260 : 760;

    var x = state.x, y = state.y, r0 = state.r;
    var dirSign = side || 1;

    var vx = dirSign * 300 * K;            // px per second, outward
    var vy = -170 * K;
    var grav = 1750 * K;
    var floor = state.ground + 140 * K;    // the grass, nearer the camera
    var s = state.s;
    var spin = state.spin;
    var bounced = false;

    return new Promise(function (resolve) {
      var t0 = now();

      add(function (stamp, dt) {
        var t = (stamp - t0) / life;
        if (t >= 1) { resolve(); return false; }

        vy += grav * dt;
        x += vx * dt;
        y += vy * dt;

        // Coming back towards the lens, so the ball grows again.
        s += (0.92 - s) * Math.min(dt * 3.4, 1);
        spin -= dirSign * 13 * dt;

        var r = r0 * s;
        if (!bounced && y + r >= floor && vy > 0) {
          y = floor - r;
          vy = -vy * 0.46;
          vx *= 0.78;
          bounced = true;
        }

        var a = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
        drawShadow(x, Math.max(floor, y + r), r0, s, y);
        // Along the arc it is actually on, so it keeps turning over its own
        // path through the bounce instead of about a fixed screen axis.
        drawBall(x, y, r, spin, 1, 1, Math.atan2(vy, vx), a);
        return true;
      });
    });
  }

  /* ══ into the net ═════════════════════════════════════════════

     A goal used to end with the ball simply not being drawn any more. Here it
     drops down the netting under gravity, damped hard because a net absorbs
     nearly all of it, and fades once the confetti has taken the eye. */
  function intoNet(state) {
    var K = k();
    var x = state.x, y = state.y, s = state.s, spin = state.spin;
    var vy = 60 * K;
    var grav = 950 * K;
    var floor = state.ground;
    var life = 900;

    var t0 = now();
    add(function (stamp, dt) {
      var t = (stamp - t0) / life;
      if (t >= 1) return false;

      vy += grav * dt;
      y += vy * dt;
      s *= 1 - dt * 0.10;
      spin += 2.2 * dt;

      var r = state.r * s;
      if (y + r > floor && vy > 0) { y = floor - r; vy = -vy * 0.24; }

      drawShadow(x, floor, state.r, s, y);
      // Dropping, so the axis is across the fall: it rolls down the netting.
      drawBall(x, y, r, spin, 1, 1, Math.PI / 2,
               t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      return true;
    });
  }

  /* ══ the ball comes back ══════════════════════════════════════ */

  function home(ballEl) {
    return new Promise(function (resolve) {
      ballEl.style.transition = 'opacity .3s ease';
      ballEl.style.opacity = '1';
      setTimeout(function () {
        ballEl.style.transition = '';
        ballEl.classList.add('is-bobbing');
        resolve();
      }, 320);
    });
  }

  /* ══ celebration ══════════════════════════════════════════════

     Moved from js/game.js unchanged in behaviour -- same 110 bits, same
     upward fan, same Euler step with gravity and drag. It shares the loop
     and the canvas now instead of running a second one of each. */

  var BURST_COLOURS = ['#3fd62b', '#7ce96d', '#9a4ffe', '#d1b1ff', '#ffffff'];

  function burst(origin) {
    if (reduced()) return;
    var s = box();
    var K = k();
    var ox = origin.x - s.left;
    var oy = origin.y - s.top;

    var bits = [];
    for (var i = 0; i < 110; i++) {
      var angle = Math.PI * (0.08 + 0.84 * (i / 110)) + Math.PI;   // fan upward
      var speed = (3.4 + (i % 7) * 0.85) * K;
      bits.push({
        x: ox, y: oy,
        vx: Math.cos(angle) * speed * (0.7 + (i % 5) * 0.14),
        vy: Math.sin(angle) * speed,
        size: (4 + (i % 4) * 2.2) * K,
        spin: (i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.06),
        rot: i,
        colour: BURST_COLOURS[i % BURST_COLOURS.length]
      });
    }

    live(true);
    var t0 = now();
    var life = 1700;

    add(function (stamp) {
      var elapsed = stamp - t0;
      if (elapsed >= life) return false;

      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.vy += 0.16 * K;         // gravity
        b.vx *= 0.992;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.spin;

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - elapsed / life);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.colour;
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
        ctx.restore();
      }
      return true;
    });
  }

  /* ══ boot ═════════════════════════════════════════════════════ */

  function init() {
    stage = document.getElementById('stage');
    canvas = document.querySelector('.fx');
    goalEl = document.querySelector('.goal');
    if (canvas) ctx = canvas.getContext('2d');
    loadBall();
  }

  window.FSFx = {
    init: init,
    add: add,
    next: next,
    shoot: shoot,
    intoNet: intoNet,
    deflect: deflect,
    home: home,
    burst: burst,
    netBulge: netBulge,
    shake: shake,
    reduced: reduced,
    S_END: S_END
  };
})();
