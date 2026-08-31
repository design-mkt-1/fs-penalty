/* Three locales, no dependencies, same shape as the other modules.

   Every visible string lives in STRINGS below rather than in the markup or
   in game.js/form.js, so adding a fourth language is one more object and
   nothing else. Nodes opt in with data-i18n="key"; attributes with
   data-i18n-attr="attr:key" (semicolon-separated for more than one).

   Uzbek is written in Latin script for this market, so there is no RTL work.
   The apostrophe in oʻ and gʻ is U+02BB, which the latin subset of the
   Montserrat cut carries -- see the @font-face block in css/tokens.css. */
(function () {
  'use strict';

  var LANGS = ['uz', 'ru', 'en'];
  var FALLBACK = 'en';
  var STORE_KEY = 'fs-lang';

  /* \n means a real line break in the rendered text -- only the tagline uses
     it, and it is the reason the markup no longer carries a <br>. */
  var STRINGS = {
    en: {
      'title':          'FanSport — Score the penalty and win!',
      'hdr.sound':      'Toggle sound',
      'hdr.lang':       'Language',
      'tagline':        'Score the penalty\nand win!',
      'goal.aim':       'Choose where to shoot',
      /* The six targets carry only a multiplier, and three of those repeat.
         The position is what tells them apart; game.js joins it to the
         multiplier, which stays in the markup. */
      'cell.tl':        'Top left',
      'cell.tc':        'Top centre',
      'cell.tr':        'Top right',
      'cell.bl':        'Bottom left',
      'cell.bc':        'Bottom centre',
      'cell.br':        'Bottom right',
      'ball.shoot':     'Shoot at a random spot',
      'msg.miss':       'So close! One more try',
      'msg.goal':       'GOAL!',
      'promo.sport':    'sport',
      'promo.bonus':    'bonus',
      'promo.sub':      'or up to (AMOUNT) + 150 FS',
      'tabs.label':     'Sign up with',
      'tab.phone':      'PHONE',
      'tab.email':      'EMAIL',
      'field.country':  'Country code',
      'field.phone':    '90 123 45 67',
      'field.email':    'you@example.com',
      'field.bonus':    'Select bonus',
      'err.phone':      'Invalid phone number',
      'err.email':      'Invalid email address',
      'bonus.casino':   'Casino bonus',
      'bonus.sport':    'Sport bonus',
      'bonus.none':     'No bonus',
      'cta.continue':   'CONTINUE',
      'foot.have':      'Already have an account?',
      'foot.login':     'Log in',
      'done.title':     'Registration Successful!',
      'done.sub':       'Your secure account has been created.',
      'done.phone':     'ACCOUNT PHONE',
      'done.email':     'ACCOUNT EMAIL',
      'done.password':  'PASSWORD',
      'cta.website':    'GO TO WEBSITE'
    },

    uz: {
      'title':          'FanSport — Penaltini uring va yuting!',
      'hdr.sound':      'Ovozni yoqish yoki oʻchirish',
      'hdr.lang':       'Til',
      'tagline':        'Penaltini uring\nva yuting!',
      'goal.aim':       'Qayerga urishni tanlang',
      'cell.tl':        'Yuqori chap',
      'cell.tc':        'Yuqori oʻrta',
      'cell.tr':        'Yuqori oʻng',
      'cell.bl':        'Pastki chap',
      'cell.bc':        'Pastki oʻrta',
      'cell.br':        'Pastki oʻng',
      'ball.shoot':     'Tasodifiy joyga urish',
      'msg.miss':       'Ozgina qoldi! Yana urinib koʻring',
      'msg.goal':       'GOL!',
      'promo.sport':    'sport',
      'promo.bonus':    'bonus',
      'promo.sub':      'yoki (AMOUNT) gacha + 150 FS',
      'tabs.label':     'Roʻyxatdan oʻtish usuli',
      'tab.phone':      'TELEFON',
      'tab.email':      'EMAIL',
      'field.country':  'Mamlakat kodi',
      'field.phone':    '90 123 45 67',
      'field.email':    'siz@example.com',
      'field.bonus':    'Bonusni tanlang',
      'err.phone':      'Telefon raqami notoʻgʻri',
      'err.email':      'Email manzili notoʻgʻri',
      'bonus.casino':   'Kazino bonusi',
      'bonus.sport':    'Sport bonusi',
      'bonus.none':     'Bonussiz',
      'cta.continue':   'DAVOM ETISH',
      'foot.have':      'Akkauntingiz bormi?',
      'foot.login':     'Kirish',
      'done.title':     'Roʻyxatdan oʻtdingiz!',
      'done.sub':       'Xavfsiz akkauntingiz yaratildi.',
      'done.phone':     'AKKAUNT TELEFONI',
      'done.email':     'AKKAUNT EMAILI',
      'done.password':  'PAROL',
      'cta.website':    'SAYTGA OʻTISH'
    },

    ru: {
      'title':          'FanSport — Забей пенальти и выиграй!',
      'hdr.sound':      'Включить или выключить звук',
      'hdr.lang':       'Язык',
      'tagline':        'Забей пенальти\nи выиграй!',
      'goal.aim':       'Выберите, куда бить',
      'cell.tl':        'Вверху слева',
      'cell.tc':        'Вверху по центру',
      'cell.tr':        'Вверху справа',
      'cell.bl':        'Внизу слева',
      'cell.bc':        'Внизу по центру',
      'cell.br':        'Внизу справа',
      'ball.shoot':     'Удар в случайную точку',
      'msg.miss':       'Так близко! Ещё попытка',
      'msg.goal':       'ГОЛ!',
      'promo.sport':    'спорт',
      'promo.bonus':    'бонус',
      'promo.sub':      'или до (AMOUNT) + 150 FS',
      'tabs.label':     'Способ регистрации',
      'tab.phone':      'ТЕЛЕФОН',
      'tab.email':      'EMAIL',
      'field.country':  'Код страны',
      'field.phone':    '90 123 45 67',
      'field.email':    'vy@example.com',
      'field.bonus':    'Выберите бонус',
      'err.phone':      'Неверный номер телефона',
      'err.email':      'Неверный адрес почты',
      'bonus.casino':   'Бонус казино',
      'bonus.sport':    'Спортивный бонус',
      'bonus.none':     'Без бонуса',
      'cta.continue':   'ПРОДОЛЖИТЬ',
      'foot.have':      'Уже есть аккаунт?',
      'foot.login':     'Войти',
      'done.title':     'Регистрация успешна!',
      'done.sub':       'Ваш защищённый аккаунт создан.',
      'done.phone':     'ТЕЛЕФОН АККАУНТА',
      'done.email':     'ПОЧТА АККАУНТА',
      'done.password':  'ПАРОЛЬ',
      'cta.website':    'ПЕРЕЙТИ НА САЙТ'
    }
  };

  /* Shown inside the menu, so each language names itself. Never translated. */
  var ENDONYM = { uz: 'Oʻzbekcha', ru: 'Русский', en: 'English' };

  var lang = FALLBACK;
  var watchers = [];
  var btn, menu, options;
  var hideTimer = 0;

  /* Must match the exit transition on .lang-menu in css/game.css. */
  var EXIT_MS = 120;

  /* ── strings ──────────────────────────────────────────────── */

  function t(key) {
    var table = STRINGS[lang];
    var value = table && table[key];
    if (value == null) value = STRINGS[FALLBACK][key];
    return value == null ? key : value;
  }

  function setText(el, value) {
    if (value.indexOf('\n') < 0) { el.textContent = value; return; }
    el.textContent = '';
    value.split('\n').forEach(function (line, i) {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  }

  /* Re-render one subtree. form.js calls it with the done step after it
     swaps the account label between phone and email. */
  function apply(root) {
    root = root || document;

    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (el) {
      setText(el, t(el.getAttribute('data-i18n')));
    });

    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length === 2) el.setAttribute(bits[0].trim(), t(bits[1].trim()));
      });
    });

    document.documentElement.lang = lang;
  }

  function set(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE_KEY, next); } catch (e) { /* private mode */ }
    apply();
    syncSelector();
    watchers.forEach(function (fn) { fn(next); });
  }

  /* Saved choice wins, then the browser's own language, then English. */
  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
    if (LANGS.indexOf(saved) >= 0) return saved;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) >= 0 ? nav : FALLBACK;
  }

  /* ── selector ─────────────────────────────────────────────── */

  /* A listbox, not a dialog: focus moves along the options with the arrow
     keys instead of being trapped, so this deliberately does not reuse the
     Tab trap in form.js -- that pattern is for modals. */

  function isOpen() {
    return btn.getAttribute('aria-expanded') === 'true';
  }

  /* reset.css forces [hidden] to display:none !important, so the menu cannot
     transition its own display. Unhide first, let one frame pass, then add
     the class the transition runs on -- the same two-step as form.js. */
  function openMenu(focusIndex) {
    clearTimeout(hideTimer);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    FSFx.next(function () { menu.classList.add('is-open'); });

    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    var i = typeof focusIndex === 'number' ? focusIndex : LANGS.indexOf(lang);
    options[Math.max(0, i)].focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus) {
    if (!isOpen()) return;
    menu.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');

    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('pointerdown', onPointerDown, true);

    // Focus has to leave before the menu is taken out of the layout, or the
    // browser drops it on <body> and the next Tab starts from the top.
    if (restoreFocus !== false) btn.focus({ preventScroll: true });
    else if (menu.contains(document.activeElement)) document.activeElement.blur();

    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { menu.hidden = true; }, EXIT_MS);
  }

  function move(step) {
    var here = options.indexOf(document.activeElement);
    var next = (here + step + options.length) % options.length;
    options[next].focus({ preventScroll: true });
  }

  function onKeydown(ev) {
    switch (ev.key) {
      case 'Escape':    ev.preventDefault(); closeMenu(); break;
      case 'ArrowDown': ev.preventDefault(); move(1); break;
      case 'ArrowUp':   ev.preventDefault(); move(-1); break;
      case 'Home':      ev.preventDefault(); options[0].focus({ preventScroll: true }); break;
      case 'End':       ev.preventDefault(); options[options.length - 1].focus({ preventScroll: true }); break;
      case 'Enter':
      case ' ':
        if (options.indexOf(document.activeElement) >= 0) {
          ev.preventDefault();
          choose(document.activeElement);
        }
        break;
      case 'Tab':
        /* Hand focus back to the trigger and let the Tab carry on from there,
           forwards or backwards. Closing with `false` blurred instead, which
           is the exact failure the comment in closeMenu warns about: the next
           Tab restarted from the top of the page. */
        closeMenu();
        break;
    }
  }

  function onPointerDown(ev) {
    if (!menu.contains(ev.target) && ev.target !== btn) closeMenu(false);
  }

  function choose(option) {
    set(option.getAttribute('data-lang'));
    closeMenu();
  }

  function syncSelector() {
    if (!btn) return;
    btn.querySelector('.lang__code').textContent = lang.toUpperCase();

    // The trigger carries a globe now, the way the design draws it, so there
    // is no flag on it to keep in step with the choice -- only the code and
    // which row shows its tick.
    options.forEach(function (o) {
      o.setAttribute('aria-selected',
                     String(o.getAttribute('data-lang') === lang));
    });
  }

  function wireSelector() {
    btn = document.querySelector('.lang');
    menu = document.querySelector('.lang-menu');
    if (!btn || !menu) return;

    options = Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'));
    options.forEach(function (o) {
      var code = o.getAttribute('data-lang');
      o.querySelector('.lang-opt__name').textContent = ENDONYM[code] || code;
      o.addEventListener('click', function () { choose(o); });
    });

    btn.addEventListener('click', function () {
      if (isOpen()) closeMenu(); else openMenu();
    });

    // Opening straight onto an end of the list is the expected shortcut.
    btn.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); openMenu(0); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); openMenu(options.length - 1); }
    });

    syncSelector();
  }

  /* ── boot ─────────────────────────────────────────────────── */

  function init() {
    lang = detect();
    apply();
    wireSelector();
  }

  window.FSI18n = {
    init: init,
    t: t,
    set: set,
    apply: apply,
    langs: LANGS,
    current: function () { return lang; },
    onChange: function (fn) { watchers.push(fn); }
  };
})();
