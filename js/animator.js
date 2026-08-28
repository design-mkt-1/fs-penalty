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
    this.poseTimer = 0;
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

  /* The project curve, the same one in --ease-out and in form.css. */
  var EASE = 'cubic-bezier(.2,.9,.3,1)';

  /* How far into the dive the body actually leaves the ground. Before this
     the keeper is coiling, and the sprite is still the idle one -- swapping
     it on the launch frame rather than on the click is most of what makes
     six still images read as a dive. */
  var LAUNCH = 0.21;

  function reduced() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function pose(p, k, sx, sy) {
    return 'translateX(-50%) translate(' + (p.x * k) + '%,' + (p.y * k) + '%) ' +
           'scale(' + p.scale + ') scaleX(' + sx + ') scaleY(' + sy + ')';
  }

  /* Six sprites, one dive. What carries it is the shape of the tween:
     anticipation, then a launch that stretches along the direction of travel,
     then a follow-through past the mark and a settle back onto it. The sprite
     is scaled about the feet (transform-origin in game.css), so the squash
     reads as weight rather than as a resize. */
  PoseAnimator.prototype.play = function (name, opts) {
    opts = opts || {};
    var p = POSES[name] || POSES.idle;
    var el = this.el;
    var self = this;
    var soft = reduced();

    // The global reduced-motion rule in reset.css only reaches CSS
    // animations; a Web Animations tween has to be cut here.
    var duration = opts.duration || (soft ? 200 : 540);

    if (this.anim) this.anim.cancel();
    clearTimeout(this.poseTimer);
    el.classList.remove('is-idling');

    var frames;
    if (soft) {
      this.setPose(name);
      frames = [
        { transform: getComputedStyle(el).transform },
        { transform: pose(p, 1, 1, 1) }
      ];
    } else {
      // Hold the idle sprite through the coil, swap on the launch frame.
      this.poseTimer = setTimeout(function () { self.setPose(name); },
                                  duration * LAUNCH);

      var lean = p.x === 0 ? 0 : (p.x > 0 ? -3 : 3);   // coil against the dive
      frames = [
        { transform: getComputedStyle(el).transform, offset: 0, easing: EASE },
        // Anticipation: weight drops into the legs and the body coils away.
        { transform: 'translateX(-50%) translate(' + lean + '%, 3.5%) ' +
                     'scale(1) scaleX(1.05) scaleY(.93)',
          offset: LAUNCH, easing: EASE },
        // Launch: stretched thin along the direction of travel.
        { transform: pose(p, 0.82, 0.96, 1.07), offset: 0.58, easing: EASE },
        // Follow-through past the mark.
        { transform: pose(p, 1.045, 1.02, 0.99), offset: 0.84, easing: EASE },
        // Settle onto it.
        { transform: pose(p, 1, 1, 1), offset: 1 }
      ];
    }

    // linear on the effect, not EASE: an iteration easing is applied on top of
    // the per-keyframe ones, and a curve this strong crushes the whole dive
    // into the first fifth of its time. The shaping belongs on the frames.
    this.anim = el.animate(frames, {
      duration: duration,
      easing: 'linear',
      fill: 'forwards'
    });

    if (opts.onComplete) this.anim.onfinish = opts.onComplete;
    return this.anim;
  };

  /* Where the keeper's feet land, as a share of the dust plume's own width.
     The keeper is 30.6% of the goal wide and the plume 26%, so a pose offset
     of p.x% of the keeper is p.x * .306 / .26 of the plume. game.js uses this
     to put the puff under him instead of under the middle of the goal. */
  PoseAnimator.prototype.landing = function (name) {
    var p = POSES[name] || POSES.idle;
    return (p.x * 1.177).toFixed(1) + '%';
  };

  PoseAnimator.prototype.reset = function (opts) {
    var el = this.el;
    var self = this;
    return this.play('idle', {
      duration: (opts && opts.duration) || 520,
      onComplete: function () {
        // Hand the transform back to CSS so the idle bob can resume.
        clearTimeout(self.poseTimer);
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
