/* ==========================================================================
   Rheinland Digitalwerk — site behaviour
   Theme (night default), language (DE/EN), navigation, reveals, contact form.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── inline icons (inherit currentColor) ─────────────────────────── */

  var ICONS = {
    pen:   '<path d="M4 20l4-1 10-10a2.8 2.8 0 0 0-4-4L4 15l-1 4z"/><path d="M13.5 6.5l4 4"/>',
    web:   '<rect x="3" y="4" width="18" height="15" rx="2.5"/><path d="M3 9h18M7.5 13h6"/>',
    cart:  '<path d="M3 4h2.2l2.3 11h9.6l2-7.5H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    card:  '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10 6h4M9.5 10h5v5h-5z"/>',
    chat:  '<path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12z"/><path d="M9 11h6M9 14h3.5"/>',
    brand: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
    chart: '<path d="M4 19V7M10 19V4M16 19v-8M22 19H2"/>',
    mail:  '<rect x="2.6" y="5" width="18.8" height="14" rx="2.4"/><path d="M3.4 6.6L12 13l8.6-6.4"/>',
    phone: '<path d="M6.2 3.5h3l1.6 4-2 1.4a12.5 12.5 0 0 0 6.3 6.3l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A17.6 17.6 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2z"/>',
    pin:   '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    app:   '<rect x="6.5" y="2.2" width="11" height="19.6" rx="2.6"/><path d="M10.5 5.2h3"/><circle cx="12" cy="18.6" r=".9" fill="currentColor"/>',
    audio: '<path d="M4 14v-4M8 17.5v-11M12 20V4M16 17.5v-11M20 14v-4"/>'
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-ico]'), function (host) {
    var d = ICONS[host.getAttribute('data-ico')];
    if (!d) return;
    host.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  });

  /* ── theme ────────────────────────────────────────────────────────
     Night is the default. A stored choice always wins; if there is none
     we stay on night rather than following the system, because the hero
     was composed for it.
     ─────────────────────────────────────────────────────────────────── */

  var THEME_KEY = 'rdw-theme';
  var theme = 'night';

  function applyTheme(next, persist) {
    theme = (next === 'day') ? 'day' : 'night';
    doc.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'day' ? '#F7F9FC' : '#0C1526');
    if (window.RDW_SYNC_THEME) window.RDW_SYNC_THEME();
    updateThemeLabel();
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ } }
  }

  var themeBtn = document.getElementById('themeToggle');
  function updateThemeLabel() {
    if (!themeBtn) return;
    var dict = (window.I18N || {})[lang] || {};
    var label = theme === 'day' ? dict['theme.toNight'] : dict['theme.toDay'];
    if (label) themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('aria-pressed', theme === 'day' ? 'true' : 'false');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(theme === 'day' ? 'night' : 'day', true);
    });
  }

  /* ── language ────────────────────────────────────────────────────── */

  var LANG_KEY = 'rdw-lang';
  var lang = 'de';

  function applyLang(next, persist) {
    var dict = (window.I18N || {})[next];
    if (!dict) return;
    lang = next;
    doc.setAttribute('lang', lang);

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (node) {
      var val = dict[node.getAttribute('data-i18n')];
      if (val === undefined) return;
      if (val.indexOf('<a ') !== -1) node.innerHTML = val;   // a few strings carry a link
      else node.textContent = val;
      if (node.hasAttribute('data-initials')) node.removeAttribute('data-plain');
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (node) {
      var v = dict[node.getAttribute('data-i18n-aria')];
      if (v) node.setAttribute('aria-label', v);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (o) {
      o.classList.toggle('is-on', o.getAttribute('data-lang') === lang);
    });

    refreshInitials();
    updateThemeLabel();
    if (persist) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ } }
  }

  var langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      applyLang(lang === 'de' ? 'en' : 'de', true);
    });
  }

  (function init() {
    var savedTheme = null, savedLang = null;
    try {
      savedTheme = localStorage.getItem(THEME_KEY);
      savedLang = localStorage.getItem(LANG_KEY);
    } catch (e) { /* ignore */ }

    applyTheme(savedTheme === 'day' ? 'day' : 'night', false);

    // German is the default: the agency and its clients are German. English
    // is offered as a switch, not guessed from the browser.
    applyLang(savedLang === 'en' ? 'en' : 'de', false);
  }());

  /* ── initials in the headline ────────────────────────────────────────
     The first letter of each word picks up the orange from the logo. The
     headline is rewritten on every language switch, so this runs again
     afterwards. The original text is kept on the node so repeated runs
     never decorate an already-decorated string. */

  function decorateInitials(node) {
    if (!node) return;
    var text = node.getAttribute('data-plain');
    if (text === null) {
      text = node.textContent;
      node.setAttribute('data-plain', text);
    }
    var out = '';
    var atWordStart = true;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var isLetter = /[\p{L}\p{N}]/u.test(ch);
      if (isLetter && atWordStart) {
        out += '<span class="cap">' + ch.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
        atWordStart = false;
      } else {
        out += ch.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (!isLetter) atWordStart = true;
      }
    }
    node.innerHTML = out;
  }

  function refreshInitials() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-initials]'), decorateInitials);
  }

  /* ── header ──────────────────────────────────────────────────────── */

  var header = document.getElementById('siteHeader');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ── active section ──────────────────────────────────────────────── */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ── reveal on scroll ────────────────────────────────────────────── */

  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (r) { r.classList.add('is-in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(en.target.parentNode.children, en.target);
        en.target.style.transitionDelay = Math.min(idx, 6) * 60 + 'ms';
        en.target.classList.add('is-in');
        ro.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .1 });
    Array.prototype.forEach.call(reveals, function (r) { ro.observe(r); });
  }

  /* ── counting figures ────────────────────────────────────────────────
     The trust strip counts up from zero every time it scrolls into view,
     not just the first time. Leaving the viewport resets the figures to
     zero while they are off screen, so the next pass starts clean without
     a visible jump back.
     ──────────────────────────────────────────────────────────────────── */

  (function counters() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.strip-num[data-count]'));
    if (!nodes.length) return;

    var items = nodes.map(function (el, i) {
      return {
        el: el,
        cell: el.parentNode,
        out: el.querySelector('.n') || el,
        target: parseInt(el.getAttribute('data-count'), 10) || 0,
        delay: i * 90,
        start: 0,
        running: false,
        active: false
      };
    });

    function paint(it, v) {
      var txt = String(v);
      if (it.out.textContent !== txt) it.out.textContent = txt;
    }

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (it) { paint(it, it.target); it.cell.classList.add('is-counting'); });
      return;
    }

    items.forEach(function (it) { paint(it, 0); });

    var raf = 0;
    var DUR = 1100;

    function tick(now) {
      var busy = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.running) continue;
        var p = (now - it.start - it.delay) / DUR;
        if (p < 0) { busy = true; continue; }
        if (p >= 1) { paint(it, it.target); it.running = false; continue; }
        var e = 1 - Math.pow(1 - p, 3);            // ease out
        paint(it, Math.round(it.target * e));
        busy = true;
      }
      raf = busy ? requestAnimationFrame(tick) : 0;
    }

    function run(it) {
      if (it.active) return;              // already counting or settled
      it.active = true;
      it.start = performance.now();
      it.running = true;
      it.cell.classList.add('is-counting');
      paint(it, 0);
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function stop(it) {
      if (!it.active) return;
      it.active = false;
      it.running = false;
      it.cell.classList.remove('is-counting');
      paint(it, 0);
    }

    /* `isIntersecting` stays true for as long as a single pixel is on
       screen, so it cannot tell us when the strip has left. Watch the ratio
       against explicit thresholds instead, and use a gap between the start
       and stop points so a figure parked near the edge does not flicker. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var it = null;
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === en.target) { it = items[i]; break; }
        }
        if (!it) return;
        if (en.intersectionRatio >= 0.6) run(it);
        else if (en.intersectionRatio <= 0.15) stop(it);
      });
    }, { threshold: [0, 0.15, 0.6, 1] });

    items.forEach(function (it) { io.observe(it.el); });
  }());

  /* ── package buttons prefill the form ────────────────────────────── */

  var topicSelect = document.getElementById('topicSelect');
  Array.prototype.forEach.call(document.querySelectorAll('[data-pkg]'), function (btn) {
    btn.addEventListener('click', function () {
      if (topicSelect) topicSelect.selectedIndex = topicSelect.options.length - 1;
      var name = btn.getAttribute('data-pkg');
      var msg = document.querySelector('#contactForm [name="message"]');
      if (msg && !msg.value) {
        msg.value = lang === 'en'
          ? 'Hello, I am interested in the "' + name + '" package.\n\n'
          : 'Guten Tag, ich interessiere mich für das Paket "' + name + '".\n\n';
      }
    });
  });

  /* ── the contact machine ─────────────────────────────────────────────
     The enquiry form sits inside a screen with a keyboard drawn beneath it.
     Typing anywhere in the form lights the matching key.

     Keys are addressed by KeyboardEvent.code, which names the physical key
     rather than the character it produces. The drawing is a German QWERTZ
     layout, so on a German keyboard the lit key is also the one under the
     visitor's finger — pressing Z reports code KeyY, which is exactly where
     Z sits on this layout.
     ──────────────────────────────────────────────────────────────────── */

  (function machine() {
    var kbd = document.getElementById('machineKbd');
    var machineEl = document.querySelector('.machine');
    var form = document.getElementById('contactForm');
    if (!kbd) return;

    var ROWS = [
      [['Backquote','^'],['Digit1','1'],['Digit2','2'],['Digit3','3'],['Digit4','4'],['Digit5','5'],
       ['Digit6','6'],['Digit7','7'],['Digit8','8'],['Digit9','9'],['Digit0','0'],['Minus','ß'],
       ['Equal','´'],['Backspace','⌫','wide-1']],
      [['Tab','⇥','wide-1'],['KeyQ','Q'],['KeyW','W'],['KeyE','E'],['KeyR','R'],['KeyT','T'],['KeyY','Z'],
       ['KeyU','U'],['KeyI','I'],['KeyO','O'],['KeyP','P'],['BracketLeft','Ü'],['BracketRight','+']],
      [['CapsLock','⇪','wide-1'],['KeyA','A'],['KeyS','S'],['KeyD','D'],['KeyF','F'],['KeyG','G'],
       ['KeyH','H'],['KeyJ','J'],['KeyK','K'],['KeyL','L'],['Semicolon','Ö'],['Quote','Ä'],
       ['Enter','⏎','wide-1']],
      [['ShiftLeft','⇧','wide-2'],['KeyZ','Y'],['KeyX','X'],['KeyC','C'],['KeyV','V'],['KeyB','B'],
       ['KeyN','N'],['KeyM','M'],['Comma',','],['Period','.'],['Slash','-'],['ShiftRight','⇧','wide-2']],
      [['ControlLeft','Strg','wide-1'],['AltLeft','Alt'],['Space','','space'],
       ['AltRight','AltGr'],['ControlRight','Strg','wide-1']]
    ];

    var byCode = {};
    var byChar = {};

    ROWS.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'kbd-row';
      row.forEach(function (k) {
        var el = document.createElement('span');
        el.className = 'kbd-key' + (k[2] ? ' ' + k[2] : '');
        el.textContent = k[1];
        r.appendChild(el);
        byCode[k[0]] = el;
        if (k[1] && k[1].length === 1) byChar[k[1].toLowerCase()] = el;
      });
      kbd.appendChild(r);
    });

    var timers = new WeakMap ? new WeakMap() : null;

    function press(el) {
      if (!el) return;
      el.classList.add('is-down');
      var prev = timers && timers.get(el);
      if (prev) clearTimeout(prev);
      var id = setTimeout(function () { el.classList.remove('is-down'); }, 150);
      if (timers) timers.set(el, id);
    }

    if (form) {
      var handledAt = 0;

      form.addEventListener('keydown', function (e) {
        if (machineEl && machineEl.classList.contains('is-unplugged')) return;
        var el = byCode[e.code];
        if (!el && e.key && e.key.length === 1) el = byChar[e.key.toLowerCase()];
        if (!el && e.key === ' ') el = byCode.Space;
        if (!el) return;
        handledAt = Date.now();
        press(el);
      });

      /* Phone keyboards often report no usable code, so fall back to the
         character that was actually inserted — but only when keydown did
         not already resolve the key, or a US layout would light two. */
      form.addEventListener('input', function (e) {
        if (machineEl && machineEl.classList.contains('is-unplugged')) return;
        if (Date.now() - handledAt < 80) return;
        if (e.inputType && e.inputType.indexOf('delete') === 0) return press(byCode.Backspace);
        var d = e.data;
        if (!d) return;
        var ch = d.slice(-1).toLowerCase();
        press(byChar[ch] || (ch === ' ' ? byCode.Space : null));
      });
    }

    /* ── the plug ──────────────────────────────────────────────────────
       It can be dragged out of the socket or simply clicked. With the plug
       out the box has no power: the screen dims, the keyboard goes quiet
       and the form refuses to submit until it is back in. */

    var plugBtn = document.getElementById('machinePlug');
    var alertBox = document.getElementById('machineAlert');
    var fixBtn = document.getElementById('machineFix');
    var plugged = true;
    var inView = false;

    function setPlugged(next) {
      plugged = !!next;
      if (machineEl) machineEl.classList.toggle('is-unplugged', !plugged);
      if (alertBox) alertBox.hidden = plugged;
      if (plugBtn) {
        plugBtn.setAttribute('aria-pressed', plugged ? 'true' : 'false');
        var dict = (window.I18N || {})[lang] || {};
        var label = plugged ? dict['mch.unplugAria'] : dict['mch.plugAria'];
        if (label) plugBtn.setAttribute('aria-label', label);
      }
      /* Fields stay reachable by keyboard but cannot be filled with no
         power. readOnly is the gentler option, but it does nothing for a
         checkbox or a select, so those get disabled outright. */
      if (form) {
        Array.prototype.forEach.call(form.elements, function (el) {
          var t = el.type;
          if (t === 'submit' || t === 'checkbox' || t === 'radio' || el.tagName === 'SELECT') {
            el.disabled = !plugged;
          } else {
            el.readOnly = !plugged;
          }
        });
      }

      // with the plug out there is nothing to animate
      if (machineEl && !plugged) machineEl.classList.remove('is-live');
      else if (machineEl && inView) machineEl.classList.add('is-live');
    }
    window.RDW_SET_PLUG = setPlugged;

    /* Dragging used to be a threshold test: move far enough and the plug
       snapped out, with nothing in between. Now it follows the pointer, the
       lead pays out with it, and letting go either seats it again or leaves
       it out depending on how far it was pulled — which is how a plug
       actually behaves. */

    var cableW = document.querySelector('.mc-wire');
    var cableL = document.querySelector('.mc-live');
    var powerBox = document.querySelector('.machine-power');
    var spark = document.querySelector('.ms-spark');

    var CABLE_HOME = [283, 20, 250, 52];       // start point and first control
    var PULL_OUT = 30;                         // px before it comes loose

    function cablePath(dx, dy) {
      var r = powerBox ? powerBox.getBoundingClientRect() : null;
      var kx = r && r.width ? 300 / r.width : 1;
      var ky = r && r.height ? 62 / r.height : 1;
      var x0 = CABLE_HOME[0] + dx * kx;
      var y0 = CABLE_HOME[1] + dy * ky;
      var cx = CABLE_HOME[2] + dx * kx * 0.55;
      var cy = CABLE_HOME[3] + dy * ky * 0.75;
      return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) +
             ' C ' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
             ', 196 30, 140 44 C 84 58, 44 44, 8 60';
    }

    function setCable(dx, dy) {
      var d = (dx === null) ? '' : cablePath(dx, dy);
      if (cableW) { if (d) cableW.setAttribute('d', d); else cableW.removeAttribute('style'); }
      if (cableL && d) cableL.setAttribute('d', d);
    }

    if (plugBtn) {
      var dragging = false, sx = 0, sy = 0, dx = 0, dy = 0;

      function endDrag() {
        dragging = false;
        plugBtn.classList.remove('is-dragging');
        plugBtn.style.transform = '';
        if (cableW) cableW.removeAttribute('d');
        if (cableL) cableL.removeAttribute('d');
      }

      plugBtn.addEventListener('pointerdown', function (e) {
        if (!plugged) return;                  // already out: a tap puts it back
        dragging = true; dx = dy = 0;
        sx = e.clientX; sy = e.clientY;
        plugBtn.classList.add('is-dragging');
        try { plugBtn.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
        e.preventDefault();
      });

      plugBtn.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        /* sideways movement is damped and downward travel is capped, so the
           plug stays on its lead instead of being flung across the page */
        dx = (e.clientX - sx) * 0.45;
        dy = Math.max(-6, Math.min(56, e.clientY - sy));
        if (dx < -34) dx = -34;
        if (dx > 34) dx = 34;
        plugBtn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        setCable(dx, dy);
      });

      plugBtn.addEventListener('pointerup', function (e) {
        try { plugBtn.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (!dragging) { setPlugged(!plugged); return; }   // a tap toggles
        var pulled = Math.hypot(dx, dy);
        endDrag();
        if (pulled > PULL_OUT) {
          setPlugged(false);
          if (spark && !reduced) {
            spark.classList.remove('is-lit');
            void spark.offsetWidth;                        // restart the flash
            spark.classList.add('is-lit');
          }
        }
        // otherwise it springs back into the socket on its own
      });

      plugBtn.addEventListener('pointercancel', endDrag);
      plugBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlugged(!plugged); }
      });
    }

    if (fixBtn) {
      fixBtn.addEventListener('click', function () {
        setPlugged(true);
        var first = form && form.querySelector('input, textarea');
        if (first) first.focus();
      });
    }

    setPlugged(true);

    /* ── confirmation on the screen ──────────────────────────────────── */

    var donePanel = document.getElementById('machineDone');
    var againBtn = document.getElementById('machineAgain');

    window.RDW_MACHINE = {
      isPlugged: function () { return plugged; },
      fault: function () {
        if (!alertBox) return;
        alertBox.hidden = false;
        alertBox.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      },
      done: function () {
        if (!donePanel) return;
        donePanel.hidden = false;
      }
    };

    if (againBtn) {
      againBtn.addEventListener('click', function () {
        if (donePanel) donePanel.hidden = true;
        if (form) {
          form.reset();
          var first = form.querySelector('input');
          if (first) first.focus();
        }
        var status = document.getElementById('formStatus');
        if (status) { status.textContent = ''; status.className = 'form-status'; }
      });
    }

    /* the machine powers up when it comes into view */
    if (machineEl) {
      if (!('IntersectionObserver' in window)) machineEl.classList.add('is-live');
      else {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            inView = en.intersectionRatio > 0.12;
            machineEl.classList.toggle('is-live', inView && plugged);
          });
        }, { threshold: [0, 0.12, 0.4] }).observe(machineEl);
      }
    }
  }());

  /* ── contact form ────────────────────────────────────────────────────
     No backend yet: the form composes a complete message and hands it to
     the visitor's mail client. Replace this submit handler with a POST to
     a form endpoint once hosting is decided.
     ──────────────────────────────────────────────────────────────────── */

  var TARGET_MAIL = 'info@rheinland-digitalwerk.de';
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var dict = (window.I18N || {})[lang] || {};

      var M = window.RDW_MACHINE;
      if (M && !M.isPlugged()) {
        M.fault();
        if (status) {
          status.textContent = dict['mch.errShort'] || '';
          status.className = 'form-status err';
        }
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        if (status) { status.textContent = dict['ct.err'] || ''; status.className = 'form-status err'; }
        return;
      }

      var d = new FormData(form);
      var g = function (k) { return (d.get(k) || '').toString().trim(); };

      var subject = (lang === 'en' ? 'Website enquiry — ' : 'Anfrage über die Website — ') + (g('name') || '—');
      var body =
        'Name:     ' + g('name') + '\n' +
        'Company:  ' + g('company') + '\n' +
        'Email:    ' + g('email') + '\n' +
        'Phone:    ' + g('phone') + '\n' +
        'Topic:    ' + g('topic') + '\n\n' + g('message') + '\n';

      window.location.href = 'mailto:' + TARGET_MAIL +
        '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      if (status) { status.textContent = ''; status.className = 'form-status'; }
      if (window.RDW_MACHINE) window.RDW_MACHINE.done();
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}());
