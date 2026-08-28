/* Scripted penalty: the first attempt is always saved, the second always
   scores. The panel the visitor picks never changes the outcome — it only
   selects which dive and which ball trajectory play. */
(function () {
  'use strict';

  var stage, ball, keeper, msg, panels, anim;
  var attempt = 0;
  var busy = false;
  var msgTimer = 0;

  /* ── geometry helpers ─────────────────────────────────────── */

  function unit() {
    return FSStage.unit();
  }

  function centre(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* requestAnimationFrame never fires while the tab is hidden, which would
     otherwise wedge the state machine mid-shot if the visitor switches apps.
     Fall back to a timer so every tween still runs to completion. */
  function tick(cb) {
    if (document.hidden) return setTimeout(function () { cb(performance.now()); }, 16);
    return requestAnimationFrame(cb);
  }

  /* ── ball flight ──────────────────────────────────────────── */

  function flight(target, opts) {
    var k = unit();
    var from = centre(ball);
    var to = centre(target);
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var lift = 34 * k;
    var spin = dx >= 0 ? 620 : -620;
    var duration = opts.duration || 620;
    var stopAt = opts.stopAt || 1;

    ball.classList.remove('is-bobbing');

    return new Promise(function (resolve) {
      var t0 = performance.now();

      (function step(now) {
        var t = Math.min((now - t0) / duration, stopAt);
        var ease = t * t * (3 - 2 * t);          // smoothstep
        var x = dx * ease;
        var y = dy * ease - lift * Math.sin(Math.PI * ease);
        var s = 1 - 0.70 * ease;
        var r = spin * ease;

        ball.style.transform =
          'translate(' + x + 'px,' + y + 'px) scale(' + s + ') rotate(' + r + 'deg)';

        if (t < stopAt) tick(step);
        else resolve({ x: x, y: y, scale: s, rot: r });
      })(performance.now());
    });
  }

  function rebound(state) {
    var k = unit();
    var dir = state.x >= 0 ? 1 : -1;
    var toX = state.x + dir * 96 * k;
    var toY = state.y + 150 * k;
    var duration = 420;

    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step(now) {
        var t = Math.min((now - t0) / duration, 1);
        var e = 1 - Math.pow(1 - t, 2);
        var x = state.x + (toX - state.x) * e;
        var y = state.y + (toY - state.y) * e;
        var s = state.scale + (0.62 - state.scale) * e;
        var r = state.rot - 340 * e * dir;

        ball.style.transform =
          'translate(' + x + 'px,' + y + 'px) scale(' + s + ') rotate(' + r + 'deg)';
        ball.style.opacity = String(1 - 0.85 * e);

        if (t < 1) tick(step);
        else resolve();
      })(performance.now());
    });
  }

  function resetBall() {
    return new Promise(function (resolve) {
      ball.style.transition = 'none';
      ball.style.transform = 'translate(0,0) scale(1) rotate(0deg)';
      ball.style.opacity = '0';
      tick(function () {
        ball.style.transition = 'opacity .3s ease';
        ball.style.opacity = '1';
        setTimeout(function () {
          ball.style.transition = '';
          ball.classList.add('is-bobbing');
          resolve();
        }, 300);
      });
    });
  }

  /* ── celebration particles ────────────────────────────────── */

  var BURST_COLOURS = ['#3fd62b', '#7ce96d', '#9a4ffe', '#d1b1ff', '#ffffff'];

  function celebrate(origin) {
    var canvas = document.querySelector('.burst');
    var ctx = canvas.getContext('2d');
    var stageRect = stage.getBoundingClientRect();
    var w = stageRect.width, h = stageRect.height;
    var k = unit();
    var ox = origin.x - stageRect.left;
    var oy = origin.y - stageRect.top;

    var bits = [];
    for (var i = 0; i < 110; i++) {
      var angle = Math.PI * (0.08 + 0.84 * (i / 110)) + Math.PI;   // fan upward
      var speed = (3.4 + (i % 7) * 0.85) * k;
      bits.push({
        x: ox, y: oy,
        vx: Math.cos(angle) * speed * (0.7 + (i % 5) * 0.14),
        vy: Math.sin(angle) * speed,
        size: (4 + (i % 4) * 2.2) * k,
        spin: (i % 2 ? 1 : -1) * (0.1 + (i % 3) * 0.06),
        rot: i,
        colour: BURST_COLOURS[i % BURST_COLOURS.length]
      });
    }

    canvas.classList.add('is-live');
    var t0 = performance.now();
    var life = 1700;

    (function frame(now) {
      var elapsed = now - t0;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.vy += 0.16 * k;         // gravity
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

      if (elapsed < life) tick(frame);
      else {
        ctx.clearRect(0, 0, w, h);
        canvas.classList.remove('is-live');
      }
    })(performance.now());
  }

  /* ── messages ─────────────────────────────────────────────── */

  function say(text, ms) {
    clearTimeout(msgTimer);
    msg.textContent = text;
    msg.hidden = false;
    tick(function () { msg.classList.add('is-visible'); });
    msgTimer = setTimeout(function () {
      msg.classList.remove('is-visible');
      setTimeout(function () { msg.hidden = true; }, 260);
    }, ms || 1600);
  }

  /* ── the two scripted shots ───────────────────────────────── */

  function shoot(panel) {
    if (busy) return;
    busy = true;
    attempt += 1;

    var cell = panel.dataset.cell;
    var scores = attempt >= 2;

    stage.dataset.state = 'shooting';
    panel.classList.add('is-armed');
    FSAudio.play('kick', 0.9);

    // The keeper commits early, as he would in a real penalty.
    setTimeout(function () {
      anim.play(scores ? FSAnimator.WRONG_WAY[cell] : FSAnimator.COVERS[cell]);
    }, 90);

    if (scores) {
      flight(panel, { duration: 640 })
        .then(function () {
          FSAudio.play('net', 0.8);
          FSAudio.play('cheer', 0.7);
          stage.dataset.state = 'celebrate';
          celebrate(centre(panel));
          say(FSI18n.t('msg.goal'), 1400);
          return wait(1500);
        })
        .then(function () {
          panel.classList.remove('is-armed');
          stage.dataset.state = 'form';
          busy = false;
          window.FSForm.open();
        });
      return;
    }

    flight(panel, { duration: 620, stopAt: 0.82 })
      .then(function (state) {
        FSAudio.play('save', 0.9);
        return rebound(state);
      })
      .then(function () {
        say(FSI18n.t('msg.miss'), 1800);
        panel.classList.remove('is-armed');
        anim.reset();
        return resetBall();
      })
      .then(function () {
        stage.dataset.state = 'aiming';
        busy = false;
      });
  }

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ── back to the start ────────────────────────────────────── */

  /* Called when the registration card closes. The stage is still carrying
     data-state="form", which holds .panel and .ball at pointer-events:none
     (css/game.css), and `attempt` is still past the end of the scripted
     sequence — so without this the page is dead, and clearing only the state
     would make the next shot score instantly. Both have to be undone together. */
  function reset() {
    clearTimeout(msgTimer);
    msg.classList.remove('is-visible');
    msg.hidden = true;

    panels.forEach(function (p) { p.classList.remove('is-armed'); });

    attempt = 0;
    busy = false;

    anim.reset();
    stage.dataset.state = 'idle';
    return resetBall();
  }

  /* ── boot ─────────────────────────────────────────────────── */

  function init() {
    stage  = document.getElementById('stage');
    ball   = document.querySelector('.ball');
    keeper = document.querySelector('.keeper');
    msg    = document.querySelector('.msg');
    panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));

    anim = new FSAnimator.PoseAnimator(keeper);
    anim.preload();

    keeper.classList.add('is-idling');
    ball.classList.add('is-bobbing');
    stage.dataset.state = 'idle';

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
