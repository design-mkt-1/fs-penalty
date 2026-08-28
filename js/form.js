/* Registration card behaviour. Client-side only: no request is ever sent.
   Tab switch, per-tab validation, then the "Complete" state from the design. */
(function () {
  'use strict';

  var sheet, card, stepForm, stepDone, tabs, phoneInput, emailInput;
  var mode = 'phone';

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

  function clearError(f) {
    f.classList.remove('is-invalid');
    var e = f.querySelector('.err');
    if (e) e.hidden = true;
  }

  function showError(f) {
    f.classList.add('is-invalid');
    var e = f.querySelector('.err');
    if (e) e.hidden = false;
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

    var label = stepDone.querySelector('dt[data-label="account"]');
    label.textContent = mode === 'phone' ? 'ACCOUNT PHONE' : 'ACCOUNT EMAIL';
    stepDone.querySelector('.done__id').textContent =
      mode === 'phone' ? '+998 ' + value : value;

    stepForm.hidden = true;
    stepDone.hidden = false;
    card.scrollTop = 0;
    FSAudio.play('whistle', 0.5);
  }

  /* Matches the fallback in game.js: a hidden tab never fires rAF, and the
     card must not be left mounted at opacity 0. */
  function nextFrame(cb) {
    if (document.hidden) setTimeout(cb, 16);
    else requestAnimationFrame(cb);
  }

  function open() {
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    nextFrame(function () { sheet.classList.add('is-open'); });
  }

  function close() {
    sheet.classList.remove('is-open');
    setTimeout(function () {
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
    }, 280);
  }

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

    card.querySelector('[data-action="close"]').addEventListener('click', close);

    // The soft keyboard changes the usable height; re-fit the stage around it.
    card.addEventListener('focusin', function () { FSStage.fit(); });
    card.addEventListener('focusout', function () { FSStage.fit(); });
  }

  window.FSForm = { init: init, open: open, close: close };
})();
