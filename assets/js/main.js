/* ==========================================================================
   Rheinland Digitalwerk — site behaviour
   Language switch, navigation, scroll reveals, service icons, contact form.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── service + contact icons (inline so they inherit currentColor) ── */

  var ICONS = {
    pen:   '<path d="M4 20l4-1 10-10a2.8 2.8 0 0 0-4-4L4 15l-1 4z"/><path d="M13.5 6.5l4 4"/>',
    web:   '<rect x="3" y="4" width="18" height="15" rx="2.5"/><path d="M3 9h18M7.5 13h6"/>',
    cart:  '<path d="M3 4h2.2l2.3 11h9.6l2-7.5H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    card:  '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10 6h4M9.5 10h5v5h-5z"/>',
    chat:  '<path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12z"/><path d="M9 11h6M9 14h3.5"/>',
    brand: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>',
    target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".4" fill="currentColor"/>',
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

  /* ── language ───────────────────────────────────────────────────── */

  var STORE = 'rdw-lang';
  var current = 'de';

  function applyLang(lang) {
    var dict = (window.I18N || {})[lang];
    if (!dict) return;
    current = lang;

    doc.setAttribute('lang', lang);
    doc.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (node) {
      var val = dict[node.getAttribute('data-i18n')];
      if (val === undefined) return;
      // a handful of strings carry a link, so those go in as markup
      if (val.indexOf('<a ') !== -1) node.innerHTML = val;
      else node.textContent = val;
    });

    // Arabic reads better a touch larger and looser
    document.body.style.fontFamily = lang === 'ar'
      ? '"Noto Kufi Arabic", "Segoe UI", Tahoma, sans-serif'
      : '';
    document.body.style.lineHeight = lang === 'ar' ? '1.85' : '';

    Array.prototype.forEach.call(document.querySelectorAll('.lang-opt'), function (o) {
      o.classList.toggle('is-on', o.getAttribute('data-lang') === lang);
    });

    try { localStorage.setItem(STORE, lang); } catch (e) { /* private mode */ }
  }

  var toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyLang(current === 'de' ? 'ar' : 'de');
    });
  }

  (function initLang() {
    var saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) { /* ignore */ }
    if (!saved && (navigator.language || '').toLowerCase().indexOf('ar') === 0) saved = 'ar';
    if (saved === 'ar') applyLang('ar');
  }());

  /* ── header: shadow on scroll + mobile menu ─────────────────────── */

  var header = document.getElementById('siteHeader');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  var onScroll = function () {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 12);
  };
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
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ── active section in the nav ──────────────────────────────────── */

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

  /* ── reveal on scroll ───────────────────────────────────────────── */

  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (r) { r.classList.add('is-in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(en.target.parentNode.children, en.target);
        en.target.style.transitionDelay = Math.min(idx, 6) * 55 + 'ms';
        en.target.classList.add('is-in');
        ro.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    Array.prototype.forEach.call(reveals, function (r) { ro.observe(r); });
  }

  /* ── cards follow the pointer for the glow highlight ────────────── */

  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.card'), function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* ── package buttons preselect the matching topic ───────────────── */

  var topicSelect = document.getElementById('topicSelect');
  Array.prototype.forEach.call(document.querySelectorAll('[data-pkg]'), function (btn) {
    btn.addEventListener('click', function () {
      if (!topicSelect) return;
      topicSelect.selectedIndex = topicSelect.options.length - 1; // "Komplettpaket / Gründung"
      var name = btn.getAttribute('data-pkg');
      var msg = document.querySelector('#contactForm [name="message"]');
      if (msg && !msg.value) {
        msg.value = current === 'ar'
          ? 'مرحباً، يهمني عرض سعر لباقة «' + name + '».\n\n'
          : 'Guten Tag, ich interessiere mich für das Paket "' + name + '".\n\n';
      }
    });
  });

  /* ── contact form ───────────────────────────────────────────────────
     There is no backend yet, so the form composes a complete, well
     formatted e-mail and hands it to the visitor's mail client. Swap the
     submit handler for a POST to a form endpoint (Formspree, Netlify
     Forms, a small PHP script …) once hosting is decided.
     ──────────────────────────────────────────────────────────────────── */

  var TARGET_MAIL = 'info@rheinland-digitalwerk.de';
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var dict = (window.I18N || {})[current] || {};

      if (!form.checkValidity()) {
        form.reportValidity();
        if (status) {
          status.textContent = dict['ct.err'] || '';
          status.className = 'form-status err';
        }
        return;
      }

      var d = new FormData(form);
      var g = function (k) { return (d.get(k) || '').toString().trim(); };

      var subject = 'Anfrage über die Website — ' + (g('name') || 'ohne Namen');
      var body =
        'Name:        ' + g('name') + '\n' +
        'Unternehmen: ' + g('company') + '\n' +
        'E-Mail:      ' + g('email') + '\n' +
        'Telefon:     ' + g('phone') + '\n' +
        'Thema:       ' + g('topic') + '\n' +
        '\n' + g('message') + '\n';

      window.location.href = 'mailto:' + TARGET_MAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (status) {
        status.textContent = dict['ct.ok'] || '';
        status.className = 'form-status ok';
      }
    });
  }

  /* ── footer year ────────────────────────────────────────────────── */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}());
