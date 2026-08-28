/* Character animation behind a narrow interface.
   PoseAnimator ships now: discrete pose sprites + transforms.
   A SpineAnimator with the same three methods can replace it later without
   touching game.js — pose names mirror the reference rig deliberately. */
(function () {
  'use strict';

  /* Where the keeper ends up for each pose, as a share of his own box.
     L/R are from the viewer's point of view, matching the panel columns.
     The sprite already carries the body angle, so these are pure translations
     that carry the character across to the panel he is covering.

     Percentages, not pixels: translate() resolves them against the element's
     own size, and css/game.css sizes the keeper at 30.6% x 88.2% of the goal.
     So a dive lands on the same panel whether the goal renders 260px wide or
     560px. The numbers are the old stage pixels over the 110x164 box they
     were measured in -- -46px of 110 is -41.82%. */
  var POSES = {
    idle:             { x:      0, y:      0, scale: 1    },
    jump_L1:          { x: -36.36, y:  13.41, scale: 1    },  // low  left
    jump_L2:          { x: -41.82, y: -18.29, scale: 1    },  // high left
    jump_R1:          { x:  36.36, y:  13.41, scale: 1    },  // low  right
    jump_R2:          { x:  41.82, y: -18.29, scale: 1    },  // high right
    jump_center:      { x:      0, y: -10.98, scale: 1.02 },  // high centre
    jump_center_down: { x:      0, y:   4.88, scale: .96  }   // low  centre
  };

  /* The panel grid, column then row. */
  var CELL_XY = {
    tl: [0, 0], tc: [1, 0], tr: [2, 0],
    bl: [0, 1], bc: [1, 1], br: [2, 1]
  };

  /* Which dive covers which panel. Must stay injective — one pose per cell —
     because WRONG_WAY below relies on it to guarantee a different pose. */
  var COVERS = {
    tl: 'jump_L2', tc: 'jump_center',      tr: 'jump_R2',
    bl: 'jump_L1', bc: 'jump_center_down', br: 'jump_R1'
  };

  /* Where the keeper goes when he guesses wrong: the dive that covers the
     furthest cell from the one the ball is heading for.

     This is derived rather than written out by hand. The hand-written table it
     replaces mapped bc to jump_center_down — which is bc's own cover — so a
     goal into the bottom-centre panel sent the keeper to exactly where the
     ball was going, and the shot read as a save. Deriving it makes that class
     of collision impossible: the furthest cell is never the cell itself, and
     COVERS is injective, so the pose always differs. */
  var WRONG_WAY = (function () {
    var out = {};
    Object.keys(CELL_XY).forEach(function (cell) {
      var here = CELL_XY[cell];
      var best = null;
      var bestDistance = -1;
      Object.keys(CELL_XY).forEach(function (other) {
        if (other === cell) return;
        var there = CELL_XY[other];
        var dx = there[0] - here[0];
        var dy = there[1] - here[1];
        var distance = dx * dx + dy * dy;
        if (distance > bestDistance) {
          bestDistance = distance;
          best = other;
        }
      });
      out[cell] = COVERS[best];
    });
    return out;
  })();

  function PoseAnimator(el) {
    this.el = el;
    this.pose = 'idle';
    this.anim = null;
  }

  PoseAnimator.prototype.preload = function () {
    // Pose sprites are plain CSS background-images on [data-pose]; the browser
    // fetches them on first use. Warm them so the first dive does not flash.
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(probe);
    Object.keys(POSES).forEach(function (name) {
      probe.className = 'keeper';
      probe.setAttribute('data-pose', name);
      getComputedStyle(probe).backgroundImage;
    });
    probe.remove();
  };

  PoseAnimator.prototype.setPose = function (name) {
    if (!POSES[name]) return;
    this.pose = name;
    this.el.setAttribute('data-pose', name);
  };

  PoseAnimator.prototype.play = function (name, opts) {
    opts = opts || {};
    var p = POSES[name] || POSES.idle;
    var duration = opts.duration || 420;
    var el = this.el;

    if (this.anim) this.anim.cancel();
    el.classList.remove('is-idling');
    this.setPose(name);

    var to = 'translateX(-50%) translate(' + p.x + '%,' + p.y + '%) ' +
             'scale(' + p.scale + ')';

    this.anim = el.animate(
      [{ transform: getComputedStyle(el).transform }, { transform: to }],
      { duration: duration, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' }
    );

    if (opts.onComplete) this.anim.onfinish = opts.onComplete;
    return this.anim;
  };

  PoseAnimator.prototype.reset = function (opts) {
    var el = this.el;
    var self = this;
    return this.play('idle', {
      duration: (opts && opts.duration) || 520,
      onComplete: function () {
        // Hand the transform back to CSS so the idle bob can resume.
        if (self.anim) { self.anim.cancel(); self.anim = null; }
        el.classList.add('is-idling');
        if (opts && opts.onComplete) opts.onComplete();
      }
    });
  };

  window.FSAnimator = {
    PoseAnimator: PoseAnimator,
    POSES: POSES,
    COVERS: COVERS,
    WRONG_WAY: WRONG_WAY
  };
})();
