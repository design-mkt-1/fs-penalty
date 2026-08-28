/* Small SFX pool. Silent until the first user gesture, mute state persisted.
   Missing files are tolerated: a sound that fails to load simply never plays. */
(function () {
  'use strict';

  var KEY = 'fs-muted';
  var FILES = {
    kick:   'assets/audio/kick.mp3',
    save:   'assets/audio/save.mp3',
    net:    'assets/audio/net.mp3',
    cheer:  'assets/audio/cheer.mp3',
    whistle:'assets/audio/whistle.mp3'
  };

  var pool = {};
  var unlocked = false;
  var muted = localStorage.getItem(KEY) === '1';

  function load() {
    Object.keys(FILES).forEach(function (name) {
      var a = new Audio();
      a.preload = 'auto';
      a.src = FILES[name];
      a.addEventListener('error', function () { pool[name] = null; });
      pool[name] = a;
    });
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // Priming each element inside the gesture is what buys us playback later.
    Object.keys(pool).forEach(function (name) {
      var a = pool[name];
      if (!a) return;
      a.muted = true;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    });
  }

  function play(name, volume) {
    if (muted || !unlocked) return;
    var src = pool[name];
    if (!src) return;
    var node = src.cloneNode();
    node.volume = typeof volume === 'number' ? volume : 1;
    var p = node.play();
    if (p && p.catch) p.catch(function () {});
  }

  function setMuted(next) {
    muted = !!next;
    localStorage.setItem(KEY, muted ? '1' : '0');
    document.querySelectorAll('.mute').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(muted));
    });
  }

  load();

  window.FSAudio = {
    unlock: unlock,
    play: play,
    setMuted: setMuted,
    isMuted: function () { return muted; },
    toggle: function () { setMuted(!muted); }
  };
})();
