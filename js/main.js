/* Boot. Wires the mute button, unlocks audio on the first gesture,
   and hands control to the game. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* All four init() calls share this callback, so anything that throws up
       here takes the whole page down with it. The mute button is a convenience;
       the game is not. */
    var muteBtn = document.querySelector('.mute');
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', String(FSAudio.isMuted()));
      muteBtn.addEventListener('click', function () { FSAudio.toggle(); });
    }

    // Audio can only start inside a user gesture.
    var unlock = function () {
      FSAudio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });

    FSI18n.init();
    FSForm.init();
    FSGame.init();
    FSStage.fit();
  });
})();
