/* ==========================================================================
   Rheinland Digitalwerk — hero driver
   Owns the clock, the theme, visibility pausing and the replay control.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.RDW_SCENE, A = window.RDW_ANIM;
  if (!S || !A) return;

  var canvas = document.getElementById('scene3d');
  var hero = document.getElementById('hero');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var raf = 0, startTime = null, lastT = 0, visible = true, running = false;

  function draw(t) {
    var dt = Math.max(0, Math.min(64, t - lastT));
    lastT = t;
    var st = A.update(t, dt);
    st.plugWorld = S.plugWorld;
    st.dt = dt;
    S.renderFrame(st);
  }

  function frame(now) {
    if (startTime === null) { startTime = now; lastT = 0; }
    var t = now - startTime;
    draw(t);
    if (t > A.T.loop) {            // the robot has collapsed; run it again
      startTime = now;
      lastT = 0;
      if (A.reset) A.reset();
    }
    if (visible) raf = requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    cancelAnimationFrame(raf);
    startTime = null;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function still() {
    // reduced motion: the powered-up scene with the code written, held
    // just before the robot tires out
    var st = A.update(A.T.hopTo - 40, 16);
    st.fade = 0;
    st.plugWorld = S.plugWorld;
    S.renderFrame(st);
  }

  /* On wide screens the subjects sit left so the headline has the right
     half. On narrow screens the copy is above the scene, so centre it. */
  var narrow = window.matchMedia('(max-width: 900px)');
  function frameForWidth() {
    S.setShift(narrow.matches ? -0.02 : -0.17, narrow.matches ? 0.02 : 0.05);
  }

  function fit() {
    frameForWidth();
    S.sizeCanvas();
    if (reduced || !running) still();
  }

  window.addEventListener('resize', function () { fit(); }, { passive: true });
  (narrow.addEventListener ? narrow.addEventListener('change', fit) : narrow.addListener(fit));

  /* theme follows the page */
  function syncTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'day' ? 'day' : 'night';
    S.setTheme(t);
    if (reduced) still();
  }
  window.RDW_SYNC_THEME = syncTheme;

  fit();
  syncTheme();

  if (reduced) {
    still();
  } else {
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !running) { running = true; raf = requestAnimationFrame(frame); }
      }, { threshold: 0.01 }).observe(hero);
    }
    start();
  }

  var replay = document.getElementById('sceneReplay');
  if (replay) {
    if (reduced) replay.hidden = true;
    replay.addEventListener('click', function () {
      replay.classList.add('is-busy');
      start();
      setTimeout(function () { replay.classList.remove('is-busy'); }, 1200);
    });
  }

  window.RDW_HERO = { start: start, still: still, fit: fit };
}());
