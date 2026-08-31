/* Scripted penalty: the first attempt is always saved, the second always
   scores. The panel the visitor picks never changes the outcome — it only
   selects which dive and which ball trajectory play. */
(function () {
  'use strict';

  var stage, ball, keeper, msg, panels, anim, goal, dust, hit;
  var attempt = 0;
  var busy = false;
  var msgTimer = 0;
  var msgHideTimer = 0;

  /* Every timer shoot() starts, so reset() can cancel them. `busy` makes them
     unreachable along the normal path, but reset() is also called from
     form.js when the visitor presses Escape — that is, from outside this
     state machine, in the middle of a sequence. */
  var timers = [];

  function later(fn, ms) {
    var id = setTimeout(function () {
      var i = timers.indexOf(id);
      if (i >= 0) timers.splice(i, 1);
      fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.length = 0;
  }

  /* ── geometry helpers ─────────────────────────────────────── */

  function centre(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Which way the ball comes off the glove. A keeper diving to his left
     pushes it further left; a save down the middle is parried back at the
     taker, so it barely travels sideways. */
  var SAVE_SIDE = { tl: -1, bl: -1, tc: 0.45, bc: -0.45, tr: 1, br: 1 };

  /* How far along the flight the ball meets the glove. It stops in front of
     the line, not on it, because the keeper's hands are in front of the net. */
  var SAVE_AT = 0.88;

  /* The keeper commits before the ball arrives, as he would in a real
     penalty: he is reading the run-up, not the flight. */
  var DIVE_DELAY = 90;

  /* ── impact ─────────────────────────────────────── */

  /* Restart a one-shot CSS animation. Removing the class is not enough on its
     own -- the style has to be recomputed in between, which reading a layout
     property forces. Cheap enough here: a visitor fires it twice a visit. */
  function fx(el, vars) {
    el.classList.remove('is-live');
    void el.offsetWidth;
    if (vars) Object.keys(vars).forEach(function (k) { el.style.setProperty(k, vars[k]); });
    el.classList.add('is-live');
  }

  /* The strike point, as a share of the goal box, so the ring lands on the
     panel whatever size the goal renders at. */
  function mark(panel) {
    var g = goal.getBoundingClientRect();
    var r = panel.getBoundingClientRect();
    fx(hit, {
      '--hit-x': ((r.left + r.width / 2 - g.left) / g.width * 100).toFixed(1) + '%',
      '--hit-y': ((r.top + r.height / 2 - g.top) / g.height * 100).toFixed(1) + '%'
    });
  }

  /* ── messages ─────────────────────────────────────────────── */

  function say(text, ms) {
    clearTimeout(msgTimer);
    clearTimeout(msgHideTimer);
    /* Unhide before writing, not after. .msg is role="status": a hidden
       element is not in the accessibility tree, so a text change made while it
       is still hidden can go unannounced entirely. */
    msg.hidden = false;
    msg.textContent = text;
    FSFx.next(function () { msg.classList.add('is-visible'); });
    msgTimer = setTimeout(function () {
      msg.classList.remove('is-visible');
      /* Held as well: clearTimeout(msgTimer) cannot reach a timer that timer
         started, so a second message inside the 260ms exit would be unhidden
         and then hidden again by the first message's tail. */
      msgHideTimer = setTimeout(function () { msg.hidden = true; }, 260);
    }, ms || 1600);
  }

  /* ── the two scripted shots ───────────────────────────────── */

  function shoot(panel) {
    if (busy) return;
    busy = true;
    attempt += 1;

    var cell = panel.dataset.cell;
    var scores = attempt >= 2;
    var T = FSAnimator.TIMING;

    stage.dataset.state = 'shooting';
    panel.classList.add('is-armed');
    FSAudio.play('kick', 0.9);

    var dive = scores ? FSAnimator.WRONG_WAY[cell] : FSAnimator.COVERS[cell];
    later(function () { anim.play(dive); }, DIVE_DELAY);

    // The plume and the jolt are the impact a still sprite cannot show. Which
    // frame carries that impact depends on the dive, so the animator is asked
    // rather than told: a high dive never lands, and its only contact with the
    // grass is the push-off. Nothing here is restated -- these numbers used to
    // be spelled out as `90 + 540 * 0.84`, so retuning the dive desynced the
    // dust.
    var impact = anim.impact(dive);
    later(function () {
      fx(dust, { '--dust-x': impact.x });
      FSFx.shake(220, impact.force);
    }, DIVE_DELAY + T.duration * impact.at);

    if (scores) {
      FSFx.shoot(ball, panel, { duration: 640 })
        .then(function (state) {
          mark(panel);
          FSAudio.play('net', 0.8);
          FSAudio.play('cheer', 0.7);
          FSFx.netBulge(state.x, state.y, state.r * state.s);
          FSFx.shake(320, 5);
          FSFx.intoNet(state);
          stage.dataset.state = 'celebrate';
          // A beat, then the confetti. 110 bits out of the strike point cover
          // the net bulge completely, and the bulge is over inside 520ms --
          // fired together, the net was never seen at all. The gap also reads
          // as a crowd taking a moment to realise.
          later(function () {
            FSFx.burst(centre(panel));
            // With the burst, not with the goal: the 180ms gap is the whole
            // point of the delay, and a pop on the goal would close it.
            FSAudio.play('confetti', 0.55);
          }, 180);
          // He is still in the air when the ball crosses the line -- the dive
          // runs to DIVE_DELAY + T.duration = 650ms and the ball arrives at
          // 640. Let him land before he reacts to it.
          later(function () {
            anim.react('beaten', { hold: 1200 });
            // Quiet: this one plays under net, cheer and the confetti, and is
            // meant to be felt rather than picked out. See tools/sfx.py.
            FSAudio.play('slump', 0.5);
          }, 320);
          say(FSI18n.t('msg.goal'), 1400);
          return wait(1500);
        })
        .then(function () {
          panel.classList.remove('is-armed');
          stage.dataset.state = 'form';
          busy = false;
          window.FSForm.open();
        })
        .catch(recover);
      return;
    }

    FSFx.shoot(ball, panel, { duration: 620, stopAt: SAVE_AT })
      .then(function (state) {
        mark(panel);
        FSAudio.play('save', 0.9);
        FSFx.shake(260, 4);
        return FSFx.deflect(state, SAVE_SIDE[cell]);
      })
      .then(function () {
        say(FSI18n.t('msg.miss'), 1800);
        panel.classList.remove('is-armed');
        // He gets to enjoy it. react() stands him back up on its own once the
        // hold is over, so nothing else has to call reset here.
        anim.react('cheer', { hold: 900 });
        return FSFx.home(ball);
      })
      .then(function () {
        stage.dataset.state = 'idle';
        busy = false;
      })
      .catch(recover);
  }

  /* Nothing above is allowed to leave the page locked. `busy` is the only
     latch, so an exception inside a .then would strand it at true with no
     trace at all: every panel dead, nothing in the console to say why. */
  function recover(err) {
    if (window.console && console.error) {
      console.error('[fs-penalty] the shot sequence failed', err);
    }
    panels.forEach(function (p) { p.classList.remove('is-armed'); });
    busy = false;
    stage.dataset.state = 'idle';
  }

  function wait(ms) {
    return new Promise(function (r) { later(r, ms); });
  }

  /* ── back to the start ────────────────────────────────────── */

  /* Called when the registration card closes. The stage is still carrying
     data-state="form", which holds .panel and .ball at pointer-events:none
     (css/game.css), and `attempt` is still past the end of the scripted
     sequence — so without this the page is dead, and clearing only the state
     would make the next shot score instantly. Both have to be undone together. */
  function reset() {
    clearTimers();
    clearTimeout(msgTimer);
    clearTimeout(msgHideTimer);
    msg.classList.remove('is-visible');
    msg.hidden = true;

    panels.forEach(function (p) { p.classList.remove('is-armed'); });
    dust.classList.remove('is-live');
    hit.classList.remove('is-live');

    attempt = 0;
    busy = false;

    anim.reset();
    stage.dataset.state = 'idle';
    return FSFx.home(ball);
  }

  /* ── boot ─────────────────────────────────────────────────── */

  /* Six buttons whose whole text is a multiplier, and three of those repeat:
     "×12" twice, "×3" twice, "×2" twice. A pointer user tells them apart by
     where they are; a screen reader user had six buttons and three names. The
     position comes from i18n, the multiplier from data-mult, so the numbers
     are still written once. Re-runs on a language change — the first real
     subscriber FSI18n.onChange has had. */
  function labelPanels() {
    panels.forEach(function (p) {
      p.setAttribute('aria-label',
        FSI18n.t('cell.' + p.dataset.cell) + ', ×' + p.dataset.mult);
    });
  }

  function init() {
    stage  = document.getElementById('stage');
    ball   = document.querySelector('.ball');
    keeper = document.querySelector('.keeper');
    goal   = document.querySelector('.goal');
    dust   = document.querySelector('.dust');
    hit    = document.querySelector('.hit');
    msg    = document.querySelector('.msg');
    panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));

    FSFx.init();
    anim = new FSAnimator.PoseAnimator(keeper,
                                       document.querySelector('.keeper-shadow'));
    /* 283 kB of dive sprites that nothing needs until the first shot. The one
       pose on screen, keeper-idle, comes from css/game.css and is already
       loading. Warm the rest when the browser is idle, or on the first
       gesture, whichever comes first — a shot cannot start before that
       gesture, so the sprites are never late. */
    var warmed = false;
    var warm = function () {
      if (warmed) return;
      warmed = true;
      anim.preload();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1200);
    window.addEventListener('pointerdown', warm, { once: true });

    keeper.classList.add('is-idling');
    ball.classList.add('is-bobbing');
    stage.dataset.state = 'idle';

    labelPanels();
    FSI18n.onChange(labelPanels);

    panels.forEach(function (p) {
      p.addEventListener('click', function () { shoot(p); });
    });

    // Tapping the ball shoots at a panel picked at random. The outcome is
    // still decided by the attempt index, exactly as for a deliberate aim —
    // the random pick only chooses which dive and trajectory play.
    ball.addEventListener('click', function () {
      shoot(panels[Math.floor(Math.random() * panels.length)]);
    });
  }

  window.FSGame = {
    init: init,
    reset: reset,
    attempt: function () { return attempt; }
  };
})();
