/* Scale the fixed 390x844 stage to fit whatever viewport we get,
   without ever letting the page itself scroll. */
(function () {
  'use strict';

  var STAGE_W = 390;
  var STAGE_H = 844;

  var viewport = document.getElementById('viewport');
  var stage = document.getElementById('stage');

  function fit() {
    // clientWidth/Height exclude the safe-area padding on #viewport,
    // so notches and home indicators are already accounted for.
    var w = viewport.clientWidth;
    var h = viewport.clientHeight;
    if (!w || !h) return;

    var scale = Math.min(w / STAGE_W, h / STAGE_H);

    // On anything wider than a phone the design is presented as a centred
    // device-sized frame rather than blown up to fill the desktop.
    if (w > 480) scale = Math.min(scale, 1);

    stage.style.setProperty('--fit', scale);
  }

  var raf = 0;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { raf = 0; fit(); });
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  // The soft keyboard shrinks the visual viewport rather than firing resize
  // on some browsers; re-fit from that signal too.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule);
    window.visualViewport.addEventListener('scroll', schedule);
  }

  // Belt and braces: if anything ever manages to scroll the document, undo it.
  window.addEventListener('scroll', function () {
    if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
  }, { passive: true });

  fit();
  window.FSStage = { fit: fit, width: STAGE_W, height: STAGE_H };
})();
