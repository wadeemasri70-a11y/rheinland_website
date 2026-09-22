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
    pin:   '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'
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
    });

    Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (o) {
      o.classList.toggle('is-on', o.getAttribute('data-lang') === lang);
    });

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

      if (status) { status.textContent = dict['ct.ok'] || ''; status.className = 'form-status ok'; }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}());
