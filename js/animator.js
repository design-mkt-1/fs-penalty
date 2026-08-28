/* Character animation behind a narrow interface.
   PoseAnimator ships now: discrete pose sprites + transforms.
   A SpineAnimator with the same three methods can replace it later without
   touching game.js — pose names mirror the reference rig deliberately. */
(function () {
  'use strict';

  /* Where the keeper ends up for each pose, in stage-logical pixels.
     L/R are from the viewer's point of view, matching the panel columns.
     The sprite already carries the body angle, so these are pure translations
     that carry the character across to the panel he is covering. */
  var POSES = {
    idle:             { x:   0, y:   0, scale: 1    },
    jump_L1:          { x: -40, y:  22, scale: 1    },  // low  left
    jump_L2:          { x: -46, y: -30, scale: 1    },  // high left
    jump_R1:          { x:  40, y:  22, scale: 1    },  // low  right
    jump_R2:          { x:  46, y: -30, scale: 1    },  // high right
    jump_center:      { x:   0, y: -18, scale: 1.02 },  // high centre
    jump_center_down: { x:   0, y:   8, scale: .96  }   // low  centre
  };

  /* Which dive covers which panel. */
  var COVERS = {
    tl: 'jump_L2', tc: 'jump_center',      tr: 'jump_R2',
    bl: 'jump_L1', bc: 'jump_center_down', br: 'jump_R1'
  };

  /* Where the keeper goes when he guesses wrong — always the far side. */
  var WRONG_WAY = {
    tl: 'jump_R2', tc: 'jump_L2',          tr: 'jump_L2',
    bl: 'jump_R1', bc: 'jump_center_down', br: 'jump_L1'
  };

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

    var to = 'translateX(-50%) translate(' + p.x + 'px,' + p.y + 'px) ' +
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
