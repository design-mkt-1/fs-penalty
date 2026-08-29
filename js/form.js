/* Registration card behaviour. Client-side only: no request is ever sent.
   Tab switch, per-tab validation, then the "Complete" state from the design.

   The card claims role="dialog" aria-modal="true" in the markup, so it has to
   behave like one: focus moves in on open, Tab stays inside, Escape closes,
   and focus goes back where it came from. */
(function () {
  'use strict';

  /* IT will replace this with the real signup URL. While it is null the
     "GO TO WEBSITE" button reloads the page, which is the safe stand-in.
     Pointing it at the real destination is a one-line change. */
  var DESTINATION = null;   // e.g. 'https://fansport.example/signup?utm=penalty'

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),' +
                  'select:not([disabled]),textarea:not([disabled]),' +
                  '[tabindex]:not([tabindex="-1"])';

  var sheet, card, stepForm, stepDone, tabs, phoneInput, emailInput;
  var mode = 'phone';
  var lastFocus = null;
  var closing = false;

  function field(name) {
    return card.querySelector('.field[data-for="' + name + '"]');
  }

  function setTab(next) {
    mode = next;
    tabs.forEach(function (t) {
      var on = t.dataset.tab === next;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    ['phone', 'email'].forEach(function (name) {
      var f = field(name);
      f.hidden = name !== next;
      clearError(f);
    });
  }

  /* The error line fades rather than appearing. It used to be a plain
     `hidden` toggle, so a failed submit snapped 22px of card into existence
     with nothing to explain the movement.

     Two steps, because reset.css forces [hidden] to display:none !important
     and display cannot be transitioned: unhide one frame ahead of the class
     going on, and take the class off one transition ahead of hiding. The
     language menu and the registration card itself both do this already. */
  var ERR_OUT = 160;
  var errTimers = {};

  function clearError(f) {
    f.classList.remove('is-invalid');
    var e = f.querySelector('.err');
    if (!e || e.hidden) return;
    e.classList.remove('is-shown');
    clearTimeout(errTimers[e.id]);
    errTimers[e.id] = setTimeout(function () { e.hidden = true; }, ERR_OUT);
  }

  function showError(f) {
    f.classList.add('is-invalid');
    var e = f.querySelector('.err');
    if (!e) return;
    clearTimeout(errTimers[e.id]);
    e.hidden = false;
    nextFrame(function () { e.classList.add('is-shown'); });
  }

  function validate() {
    var f = field(mode);
    var input = f.querySelector('input');
    var value = input.value.trim();
    var ok;

    if (mode === 'phone') {
      // Digits only once separators are stripped, 7 to 15 of them (E.164 range).
      var digits = value.replace(/[^\d]/g, '');
      ok = digits.length >= 7 && digits.length <= 15 && !/[a-z]/i.test(value);
    } else {
      ok = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);
    }

    if (ok) clearError(f); else showError(f);
    return ok ? value : null;
  }

  function submit(ev) {
    ev.preventDefault();
    var value = validate();
    if (!value) return;

    // Swap the key, not the text: a later language change re-renders from it.
    var label = stepDone.querySelector('dt[data-label="account"]');
    label.setAttribute('data-i18n', mode === 'phone' ? 'done.phone' : 'done.email');
    FSI18n.apply(stepDone);
    stepDone.querySelector('.done__id').textContent =
      mode === 'phone' ? '+998 ' + value : value;

    stepForm.hidden = true;
    stepDone.hidden = false;
    // #promo-title lives inside the step just hidden, so the dialog would be
    // left naming an element nobody can reach. Move the name with the step.
    card.setAttribute('aria-labelledby', 'done-title');
    card.scrollTop = 0;
    FSAudio.play('whistle', 0.5);
  }

  /* ── focus containment ────────────────────────────────────── */

  /* Only what is genuinely on screen: the email field is hidden while the
     phone tab is active, and one of the two steps is always hidden. */
  function focusables() {
    return Array.prototype.filter.call(
      card.querySelectorAll(FOCUSABLE),
      function (el) { return el.getClientRects().length > 0; }
    );
  }

  /* Every focus() call passes preventScroll: the page must never scroll, and
     the browser's default scroll-into-view would break that on its own. */
  function onKeydown(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;

    var list = focusables();
    if (!list.length) return;

    var first = list[0];
    var last = list[list.length - 1];

    if (!card.contains(document.activeElement)) {
      ev.preventDefault();
      (ev.shiftKey ? last : first).focus({ preventScroll: true });
    } else if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  /* ── open / close ─────────────────────────────────────────── */

  /* Matches the fallback in game.js: a hidden tab never fires rAF, and the
     card must not be left mounted at opacity 0. */
  function nextFrame(cb) {
    if (document.hidden) setTimeout(cb, 16);
    else requestAnimationFrame(cb);
  }

  function open() {
    if (!sheet.hidden) return;
    lastFocus = document.activeElement;
    closing = false;

    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onKeydown, true);

    nextFrame(function () {
      sheet.classList.add('is-open');
      // The card itself, not the first field: on a phone, focusing a text
      // input pops the soft keyboard the instant the goal is scored.
      card.focus({ preventScroll: true });
    });
  }

  /* onDone runs once the card is fully gone. "GO TO WEBSITE" passes the
     navigation; Escape passes nothing and simply hands the pitch back. */
  function close(onDone) {
    if (closing || sheet.hidden) return;
    closing = true;

    sheet.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown, true);

    setTimeout(function () {
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
      closing = false;
      restore();

      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      lastFocus = null;

      // The stage still carries data-state="form", which holds .panel and
      // .ball at pointer-events:none, and the attempt counter is still past
      // the end of the scripted sequence. Hand both back to the game, or the
      // page stays dead behind a card nobody can see.
      if (window.FSGame && FSGame.reset) FSGame.reset();

      if (typeof onDone === 'function') onDone();
    }, 280);
  }

  /* Back to the opening state, so a second visit does not start on the
     success screen with the previous answer still sitting in the field. */
  function restore() {
    stepDone.hidden = true;
    stepForm.hidden = false;
    card.setAttribute('aria-labelledby', 'promo-title');
    phoneInput.value = '';
    emailInput.value = '';
    setTab('phone');
    card.scrollTop = 0;
  }

  function go() {
    if (DESTINATION) window.location.assign(DESTINATION);
    else window.location.reload();
  }

  /* ── boot ─────────────────────────────────────────────────── */

  function init() {
    sheet    = document.querySelector('.sheet');
    card     = sheet.querySelector('.card');
    stepForm = card.querySelector('[data-step="form"]');
    stepDone = card.querySelector('[data-step="done"]');
    tabs     = Array.prototype.slice.call(card.querySelectorAll('.tab'));
    phoneInput = card.querySelector('#fs-phone');
    emailInput = card.querySelector('#fs-email');

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { setTab(t.dataset.tab); });
    });

    [phoneInput, emailInput].forEach(function (input) {
      input.addEventListener('input', function () {
        clearError(input.closest('.field'));
      });
    });

    card.addEventListener('submit', submit);

    card.querySelector('[data-action="close"]')
        .addEventListener('click', function () { close(go); });

    // The soft keyboard changes the usable height; re-fit the stage around it.
    card.addEventListener('focusin', function () { FSStage.fit(); });
    card.addEventListener('focusout', function () { FSStage.fit(); });
  }

  window.FSForm = { init: init, open: open, close: close };
})();
