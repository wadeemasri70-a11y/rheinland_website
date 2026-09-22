/* ==========================================================================
   Rheinland Digitalwerk — hero scene
   A small robot drags a power cable across a dark desk, plugs it into the
   wall socket, the workshop lights up, the laptop boots, and the robot
   hops across the keyboard writing code.

   No dependencies. One rAF loop drives an SVG keyframe timeline plus a
   canvas dust layer. Everything is authored in the SVG's 1200x720 space.
   ========================================================================== */
(function () {
  'use strict';

  var svg = document.getElementById('scene');
  if (!svg) return;

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── tiny animation toolkit ─────────────────────────────────────── */

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var Ease = {
    linear:  function (t) { return t; },
    inOut:   function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    out:     function (t) { return 1 - Math.pow(1 - t, 3); },
    'in':    function (t) { return t * t * t; },
    outBack: function (t) { var c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    // a short, snappy overshoot used for landings
    land:    function (t) { return 1 - Math.pow(1 - t, 4); }
  };

  /* Sample a keyframe track. frames: [[time, value, easeOfThisSegment], ...] */
  function track(frames, t) {
    if (t <= frames[0][0]) return frames[0][1];
    for (var i = 1; i < frames.length; i++) {
      if (t <= frames[i][0]) {
        var a = frames[i - 1], b = frames[i];
        var span = b[0] - a[0] || 1;
        var e = Ease[b[2] || 'inOut'] || Ease.inOut;
        return lerp(a[1], b[1], e(clamp01((t - a[0]) / span)));
      }
    }
    return frames[frames.length - 1][1];
  }

  /* value that rises to 1 over `dur` starting at `start`, then decays */
  function burst(t, start, rise, fall) {
    if (t < start) return 0;
    if (t < start + rise) return (t - start) / rise;
    if (t < start + rise + fall) return 1 - (t - start - rise) / fall;
    return 0;
  }

  var el = {
    robot:    $('robot'),
    rbBody:   $('rbBody'),
    rbHead:   $('rbHead'),
    rbTorso:  $('rbTorso'),
    rbArmF:   $('rbArmF'),
    rbArmB:   $('rbArmB'),
    rbLegF:   $('rbLegF'),
    rbLegB:   $('rbLegB'),
    rbEyes:   $('rbEyes'),
    rbEyeL:   $('rbEyeL'),
    rbEyeR:   $('rbEyeR'),
    rbVisor:  $('rbVisorGlass'),
    rbCore:   $('rbCore'),
    rbAnt:    $('rbAntBall'),
    rbHalo:   $('rbHalo'),
    rbShadow: $('rbShadow'),
    plug:     $('plug'),
    plugLed:  $('plugLed'),
    cableTail:$('cableTail'),
    cablePulse:$('cablePulse'),
    cableLit: $('cableLit'),
    socketGlow:$('socketGlow'),
    socketSlots:$('socketSlots'),
    spark:    $('spark'),
    flash:    $('flash'),
    lampGlow: $('lampGlow'),
    deskRim:  $('deskRim'),
    screenOn: $('screenOn'),
    screenOff:$('screenOff'),
    screenPool:$('screenPool'),
    screenPanel:$('screenPanel'),
    bootMark: $('bootMark'),
    crtSweep: $('crtSweep'),
    scanlines:$('scanlines'),
    codeLines:$('codeLines'),
    keyboard: $('keyboard'),
    layerFar: $('layerFar'),
    dust:     $('dust')
  };

  var SVGNS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ── keyboard: built in perspective so keys can light up per hop ──── */

  // Deck trapezoid: back edge y=552 (x 706..1002), front edge y=600 (x 676..1032)
  function deckY(t) { return 552 + 48 * t; }
  function deckL(t) { return 706 - 30 * t; }
  function deckR(t) { return 1002 + 30 * t; }

  var KEYS = [];          // {cx, cy, node}
  var ROW_COUNTS = [13, 13, 12, 7];

  (function buildKeyboard() {
    var frag = document.createDocumentFragment();
    for (var r = 0; r < 4; r++) {
      var t0 = 0.12 + r * 0.185;
      var t1 = t0 + 0.155;
      var yTop = deckY(t0), yBot = deckY(t1);
      var lT = deckL(t0) + 14, rT = deckR(t0) - 14;
      var lB = deckL(t1) + 14, rB = deckR(t1) - 14;
      var n = ROW_COUNTS[r];

      for (var j = 0; j < n; j++) {
        // bottom row: a wide spacebar in the middle
        var f0 = j / n, f1 = (j + 1) / n;
        if (r === 3) {
          var spans = [0, .14, .26, .74, .86, 1];
          if (j < 5) { f0 = spans[j]; f1 = spans[j + 1]; }
          else continue;
        }
        var pad = 0.006;
        var a0 = f0 + pad, a1 = f1 - pad;

        var x1 = lerp(lT, rT, a0), x2 = lerp(lT, rT, a1);
        var x3 = lerp(lB, rB, a1), x4 = lerp(lB, rB, a0);

        var key = mk('polygon', {
          points: x1.toFixed(1) + ',' + yTop.toFixed(1) + ' ' +
                  x2.toFixed(1) + ',' + yTop.toFixed(1) + ' ' +
                  x3.toFixed(1) + ',' + yBot.toFixed(1) + ' ' +
                  x4.toFixed(1) + ',' + yBot.toFixed(1),
          fill: '#020A18',
          stroke: '#062A55',
          'stroke-width': '0.7'
        });
        frag.appendChild(key);
        KEYS.push({ cx: (x1 + x2) / 2, cy: yTop + 1, row: r, node: key });
      }
    }
    el.keyboard.appendChild(frag);
  }());

  /* scanlines on the screen */
  (function buildScanlines() {
    var frag = document.createDocumentFragment();
    for (var y = 304; y < 548; y += 4) {
      frag.appendChild(mk('rect', { x: 706, y: y, width: 296, height: 1 }));
    }
    el.scanlines.appendChild(frag);
  }());

  /* ── the code the robot writes ──────────────────────────────────── */

  var CODE = [
    [['const ', 'kw'], ['auftritt', 'fn'], [' = ', 'op'], ['neueMarke', 'fn'], ['({', 'op']],
    [['  name', 'key'], [': ', 'op'], ['"Ihr Unternehmen"', 'str'], [',', 'op']],
    [['  website', 'key'], [': ', 'op'], ['true', 'num'], [',', 'op']],
    [['  onlineshop', 'key'], [': ', 'op'], ['true', 'num'], [',', 'op']],
    [['  sichtbarkeit', 'key'], [': ', 'op'], ['"maximal"', 'str'], [',', 'op']],
    [['  anfragen', 'key'], [': ', 'op'], ['Infinity', 'num'], [',', 'op']],
    [['});', 'op']],
    [['// bereit zum starten.', 'cm']]
  ];

  var LINE_X = 720;
  var LINE_Y0 = 336;
  var LINE_H = 18;
  var lines = [];   // {g, clipRect, width, caret}

  (function buildCode() {
    var defs = svg.querySelector('defs');
    CODE.forEach(function (parts, i) {
      var y = LINE_Y0 + i * LINE_H + (i === 7 ? 14 : 0);

      var clip = mk('clipPath', { id: 'clipLine' + i });
      var cr = mk('rect', { x: LINE_X - 2, y: y - 13, width: 0, height: 17 });
      clip.appendChild(cr);
      defs.appendChild(clip);

      var g = mk('g', { 'clip-path': 'url(#clipLine' + i + ')' });
      var text = mk('text', { x: LINE_X, y: y, 'xml:space': 'preserve' });
      parts.forEach(function (p) {
        var ts = mk('tspan', { 'class': 'ct-' + p[1] });
        ts.textContent = p[0];
        text.appendChild(ts);
      });
      g.appendChild(text);
      el.codeLines.appendChild(g);

      var caret = mk('rect', { x: LINE_X, y: y - 11, width: 7, height: 14, fill: '#2FE3F0', opacity: 0 });
      el.codeLines.appendChild(caret);

      lines.push({ text: text, clip: cr, caret: caret, y: y, width: 0, typed: 0, active: false, done: false });
    });
  }());

  function measureCode() {
    lines.forEach(function (l) {
      try { l.width = l.text.getComputedTextLength(); }
      catch (e) { l.width = 150; }
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureCode);
  }
  measureCode();

  /* ── timeline ───────────────────────────────────────────────────── */

  var T = {
    walkEnd:   2400,
    reachEnd:  3080,
    pushEnd:   3460,
    contact:   3460,
    pulseFrom: 3520,
    pulseTo:   5000,
    bootFrom:  5000,
    bootMark:  5500,
    bootOut:   6500,
    runFrom:   6500,
    runTo:     8050,
    jumpFrom:  8050,
    jumpTo:    8760,
    hopFrom:   8760,
    hopEvery:  560,
    end:       15200
  };

  // keys the robot lands on, left to right then a couple back
  var HOP_KEYS = [14, 28, 17, 31, 20, 34, 23, 25];
  var HOPS = HOP_KEYS.length;
  T.hopTo = T.hopFrom + HOPS * T.hopEvery;

  var DESK_Y = 600;
  var S_WALK = 0.72;
  var S_KEYS = 0.60;

  function footY(scale, ground) { return ground - 40 * scale; }

  var trkX = [
    [0,            -130, 'linear'],
    [T.walkEnd,     205,  'out'],
    [T.runFrom,     205,  'linear'],
    [T.runTo,       660,  'inOut'],
    [T.jumpFrom,    660,  'linear'],
    [T.jumpTo,      KEYS[HOP_KEYS[0]] ? KEYS[HOP_KEYS[0]].cx : 780, 'linear']
  ];

  var trkScale = [
    [0,          S_WALK, 'linear'],
    [T.runFrom,  S_WALK, 'linear'],
    [T.jumpFrom, S_WALK, 'linear'],
    [T.jumpTo,   S_KEYS, 'inOut']
  ];

  /* ── per-frame render ───────────────────────────────────────────── */

  var lastT = 0, walkPhase = 0;

  function render(t) {
    var dt = Math.max(0, Math.min(64, t - lastT));
    lastT = t;

    /* ---- robot position ---- */
    var x = track(trkX, t);
    var scale = track(trkScale, t);
    var ground = DESK_Y;

    // hop sequence across the keyboard
    var hopIndex = -1, hopP = 0;
    if (t >= T.hopFrom && t < T.hopTo) {
      hopIndex = Math.floor((t - T.hopFrom) / T.hopEvery);
      hopP = ((t - T.hopFrom) % T.hopEvery) / T.hopEvery;
      var from = KEYS[HOP_KEYS[Math.max(0, hopIndex)]];
      var to   = KEYS[HOP_KEYS[Math.min(HOPS - 1, hopIndex + 1)]];
      if (from && to) {
        x = lerp(from.cx, to.cx, Ease.inOut(hopP));
        ground = lerp(from.cy, to.cy, Ease.inOut(hopP));
      }
    } else if (t >= T.hopTo) {
      var lastKey = KEYS[HOP_KEYS[HOPS - 1]];
      if (lastKey) { x = lastKey.cx; ground = lastKey.cy; }
    } else if (t >= T.jumpTo) {
      var k0 = KEYS[HOP_KEYS[0]];
      if (k0) { x = k0.cx; ground = k0.cy; }
    }

    var y = footY(scale, ground);

    /* ---- vertical motion: walk bob, tiptoe push, jump arc, hops ---- */
    var bob = 0, lean = 0, crouch = 0;

    var isWalking = t < T.walkEnd || (t > T.runFrom && t < T.runTo);
    var speed = t < T.walkEnd ? 0.9 : 1.8;
    if (isWalking) {
      walkPhase += dt * 0.011 * speed;
      bob = Math.abs(Math.sin(walkPhase)) * -3.2 * (speed);
      lean = 4 * (speed - 0.6);
    } else {
      walkPhase += dt * 0.0006;   // idle breathing
      bob = Math.sin(t * 0.0022) * -1.2;
    }

    // tiptoe + shove when inserting the plug
    if (t > T.reachEnd - 200 && t < T.contact + 420) {
      var pu = track([
        [T.reachEnd - 200, 0, 'linear'],
        [T.reachEnd + 120, 6, 'out'],      // dip down (wind-up)
        [T.contact,      -15, 'out'],      // stretch up
        [T.contact + 260, -3, 'out'],
        [T.contact + 420,  0, 'inOut']
      ], t);
      crouch = pu;
    }

    // leap onto the keyboard
    if (t >= T.jumpFrom && t <= T.jumpTo) {
      var jp = (t - T.jumpFrom) / (T.jumpTo - T.jumpFrom);
      crouch -= Math.sin(jp * Math.PI) * 78;
      lean = 14 * Math.sin(jp * Math.PI);
    }

    // hop arc between keys
    if (hopIndex >= 0) {
      crouch -= Math.sin(hopP * Math.PI) * 24;
      lean = 8 * Math.sin(hopP * Math.PI * 2);
    }

    el.robot.setAttribute('transform',
      'translate(' + x.toFixed(2) + ',' + (y + bob + crouch).toFixed(2) + ') scale(' + scale.toFixed(3) + ')');
    el.rbBody.setAttribute('transform', 'rotate(' + lean.toFixed(2) + ',0,10)');

    // shadow shrinks as the robot leaves the ground
    var air = clamp01(-crouch / 60);
    el.rbShadow.setAttribute('opacity', (0.55 * (1 - air * 0.8)).toFixed(3));
    el.rbShadow.setAttribute('rx', (30 * (1 - air * 0.35)).toFixed(1));
    el.rbShadow.setAttribute('cy', ((ground - (y + bob + crouch)) / scale).toFixed(1));

    /* ---- limbs ---- */
    var legSwing = isWalking ? Math.sin(walkPhase) * 30 * speed : 0;
    var armSwing = isWalking ? -Math.sin(walkPhase) * 22 * speed : 0;

    if (hopIndex >= 0 || (t >= T.jumpFrom && t <= T.jumpTo)) {
      var tuck = Math.sin((hopIndex >= 0 ? hopP : (t - T.jumpFrom) / (T.jumpTo - T.jumpFrom)) * Math.PI);
      legSwing = 0;
      el.rbLegF.setAttribute('transform', 'rotate(' + (-38 * tuck) + ',0,8)');
      el.rbLegB.setAttribute('transform', 'rotate(' + (32 * tuck) + ',0,8)');
      el.rbArmF.setAttribute('transform', 'translate(18,-24) rotate(' + (-55 - 70 * tuck) + ')');
      el.rbArmB.setAttribute('transform', 'translate(-18,-24) rotate(' + (48 + 70 * tuck) + ')');
    } else {
      el.rbLegF.setAttribute('transform', 'rotate(' + legSwing.toFixed(1) + ',0,8)');
      el.rbLegB.setAttribute('transform', 'rotate(' + (-legSwing).toFixed(1) + ',0,8)');

      // the front arm lifts the plug into the socket between reachEnd and contact
      var armF = track([
        [0,                    armSwing + 8, 'linear'],
        [T.walkEnd,            armSwing + 8, 'linear'],
        [T.walkEnd + 80,       10,  'out'],
        [T.reachEnd,          -128, 'out'],     // raised toward the socket
        [T.contact,           -142, 'out'],
        [T.contact + 500,     -128, 'inOut'],
        [T.contact + 900,       6,  'inOut'],
        [T.runFrom,             6,  'linear']
      ], t);
      if (t > T.walkEnd && t < T.runFrom) {
        el.rbArmF.setAttribute('transform', 'translate(18,-24) rotate(' + armF.toFixed(1) + ')');
      } else {
        el.rbArmF.setAttribute('transform', 'translate(18,-24) rotate(' + (armSwing + 8).toFixed(1) + ')');
      }
      el.rbArmB.setAttribute('transform', 'translate(-18,-24) rotate(' + (-armSwing - 8).toFixed(1) + ')');
    }

    // head: looks up at the socket, then at the screen
    var headTilt = track([
      [0, 0, 'linear'],
      [T.walkEnd, 0, 'linear'],
      [T.reachEnd, -13, 'out'],
      [T.contact + 500, -13, 'linear'],
      [T.contact + 900, -4, 'inOut'],
      [T.runFrom, 0, 'inOut'],
      [T.jumpTo, 0, 'linear'],
      [T.jumpTo + 400, -10, 'out']
    ], t);
    el.rbHead.setAttribute('transform', 'translate(0,-40) rotate(' + headTilt.toFixed(1) + ',0,14)');

    /* ---- eye blink + power state ---- */
    var lit = t < T.contact ? 0 : clamp01((t - T.contact) / 700);
    var blink = ((t + 400) % 4200) < 130 ? 0.06 : 1;
    if (hopIndex >= 0) blink = 1;
    var eyeH = 11 * blink;
    el.rbEyeL.setAttribute('height', eyeH.toFixed(2));
    el.rbEyeR.setAttribute('height', eyeH.toFixed(2));
    el.rbEyeL.setAttribute('y', (-3.4 + (11 - eyeH) / 2).toFixed(2));
    el.rbEyeR.setAttribute('y', (-3.4 + (11 - eyeH) / 2).toFixed(2));
    el.rbEyes.setAttribute('opacity', (0.55 + 0.45 * lit).toFixed(3));
    el.rbVisor.setAttribute('opacity', (0.20 + 0.42 * lit).toFixed(3));
    el.rbCore.setAttribute('opacity', (0.35 + 0.55 * lit * (0.75 + 0.25 * Math.sin(t * 0.004))).toFixed(3));
    el.rbAnt.setAttribute('opacity', (0.35 + 0.6 * lit * (0.7 + 0.3 * Math.sin(t * 0.006 + 1))).toFixed(3));
    el.rbHalo.setAttribute('opacity', (0.5 * lit).toFixed(3));

    /* ---- the plug ---- */
    var plugX, plugY, plugRot = 0;
    if (t < T.walkEnd + 80) {
      // dragged along at hand height
      plugX = x + 21 * scale;
      plugY = y + bob + crouch + 4 * scale;
      plugRot = Math.sin(walkPhase * 2) * 7;
    } else if (t < T.contact + 40) {
      var pt = clamp01((t - (T.walkEnd + 80)) / (T.contact - T.walkEnd - 80));
      var e = Ease.out(pt);
      plugX = lerp(x + 21 * scale, 232, e);
      plugY = lerp(y + bob + 4 * scale, 512, e);
      plugRot = lerp(plugRot, 0, e);
    } else {
      plugX = 232; plugY = 512;
    }
    el.plug.setAttribute('transform',
      'translate(' + plugX.toFixed(1) + ',' + plugY.toFixed(1) + ') rotate(' + plugRot.toFixed(1) + ') scale(0.9)');
    el.plugLed.setAttribute('opacity', (0.3 + 0.65 * lit).toFixed(2));

    // the loose end of the cable follows the plug
    var anchorX = 344, anchorY = 602;
    var cx = (anchorX + plugX) / 2;
    var cy = Math.max(anchorY, plugY) + 22;
    el.cableTail.setAttribute('d',
      'M' + anchorX + ' ' + anchorY + ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + plugX.toFixed(1) + ' ' + (plugY + 8).toFixed(1));

    /* ---- the spark and the room waking up ---- */
    var sp = burst(t, T.contact - 30, 70, 300);
    el.spark.setAttribute('opacity', sp.toFixed(3));
    el.spark.setAttribute('transform',
      'translate(232,500) scale(' + (0.4 + 0.9 * (1 - sp)).toFixed(3) + ') translate(-232,-500)');
    el.flash.setAttribute('opacity', (burst(t, T.contact - 30, 60, 420) * 0.30).toFixed(3));
    el.socketGlow.setAttribute('opacity', (0.85 * sp + 0.22 * lit).toFixed(3));
    el.socketSlots.setAttribute('fill', lit > .3 ? '#2FE3F0' : '#00304F');

    /* ---- energy travels up the cable ---- */
    if (t >= T.pulseFrom && t <= T.pulseTo) {
      var pp = (t - T.pulseFrom) / (T.pulseTo - T.pulseFrom);
      el.cablePulse.setAttribute('opacity', (0.95 * (1 - Math.pow(pp, 3))).toFixed(3));
      el.cablePulse.setAttribute('stroke-dashoffset', (-cableLen * (1 - Ease.out(pp))).toFixed(1));
    } else {
      el.cablePulse.setAttribute('opacity', 0);
    }
    el.cableLit.setAttribute('opacity', (0.75 * lit).toFixed(3));

    /* ---- lamp, rim light, ambient ---- */
    var flick = t < T.contact + 900
      ? (Math.random() > .5 ? 1 : 0.25)      // the lamp stutters before it settles
      : 1;
    var roomLit = clamp01((t - T.pulseFrom) / 1400);
    el.lampGlow.setAttribute('opacity', (roomLit * flick).toFixed(3));
    el.deskRim.setAttribute('opacity', (0.5 * roomLit).toFixed(3));
    el.layerFar.setAttribute('opacity', (0.55 + 0.45 * roomLit).toFixed(3));

    /* ---- laptop boot ---- */
    var screenLit = clamp01((t - T.bootFrom) / 500);
    el.screenOn.setAttribute('opacity', screenLit.toFixed(3));
    el.screenOff.setAttribute('opacity', (1 - screenLit).toFixed(3));
    el.screenPanel.setAttribute('opacity', (0.5 + 0.5 * screenLit).toFixed(3));
    el.screenPool.setAttribute('opacity', (0.9 * screenLit).toFixed(3));

    // CRT sweep across the panel as it comes up
    var sw = clamp01((t - T.bootFrom) / 900);
    if (sw > 0 && sw < 1) {
      el.crtSweep.setAttribute('opacity', (0.20 * (1 - sw)).toFixed(3));
      el.crtSweep.setAttribute('y', (302 + 244 * sw).toFixed(1));
    } else {
      el.crtSweep.setAttribute('opacity', 0);
    }

    el.bootMark.setAttribute('opacity', track([
      [T.bootMark - 400, 0, 'linear'],
      [T.bootMark, 1, 'out'],
      [T.bootOut - 300, 1, 'linear'],
      [T.bootOut, 0, 'inOut']
    ], t).toFixed(3));

    /* ---- typing: one line per hop ---- */
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      var startAt = T.hopFrom + i * T.hopEvery + 120;
      var typeDur = Math.min(T.hopEvery - 60, 40 + L.width * 7);
      var p = clamp01((t - startAt) / typeDur);
      var w = L.width * p;
      L.clip.setAttribute('width', (w + 2).toFixed(1));
      var caretOn = (p > 0 && p < 1) || (i === lines.length - 1 && p >= 1 && (t % 1000) < 520);
      L.caret.setAttribute('x', (LINE_X + w).toFixed(1));
      L.caret.setAttribute('opacity', caretOn ? 0.9 : 0);
    }

    /* ---- the key under the robot lights up on landing ---- */
    for (var k = 0; k < KEYS.length; k++) {
      var want = '#020A18';
      if (hopIndex >= 0 && KEYS[k] === KEYS[HOP_KEYS[hopIndex]] && hopP < 0.22) want = '#0B5E78';
      if (KEYS[k]._c !== want) { KEYS[k].node.setAttribute('fill', want); KEYS[k]._c = want; }
    }
  }

  /* cable pulse setup — needs the path length */
  var cableLen = 600;
  try {
    cableLen = el.cablePulse.getTotalLength() || 600;
  } catch (e) { /* jsdom / very old engines */ }
  el.cablePulse.setAttribute('stroke-dasharray', (cableLen * 0.16) + ' ' + (cableLen * 2));
  el.cablePulse.setAttribute('stroke-dashoffset', 0);

  /* ── dust motes ─────────────────────────────────────────────────── */

  var dctx = el.dust ? el.dust.getContext('2d') : null;
  var motes = [], dw = 0, dh = 0, dpr = 1;

  function sizeDust() {
    if (!el.dust) return;
    var r = el.dust.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    dw = Math.max(1, Math.round(r.width));
    dh = Math.max(1, Math.round(r.height));
    el.dust.width = Math.round(dw * dpr);
    el.dust.height = Math.round(dh * dpr);
    if (dctx) dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.round(Math.min(70, (dw * dh) / 22000));
    motes = [];
    for (var i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * dw,
        y: Math.random() * dh,
        r: 0.5 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.10,
        vy: -0.05 - Math.random() * 0.14,
        a: 0.10 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function drawDust(t, power) {
    if (!dctx || !motes.length) return;
    dctx.clearRect(0, 0, dw, dh);
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.x += m.vx + Math.sin(t * 0.0004 + m.ph) * 0.12;
      m.y += m.vy;
      if (m.y < -4) { m.y = dh + 4; m.x = Math.random() * dw; }
      if (m.x < -4) m.x = dw + 4;
      if (m.x > dw + 4) m.x = -4;
      // motes near the middle sit in the lamp beam and read brighter
      var beam = 1 - Math.min(1, Math.abs(m.x - dw * 0.52) / (dw * 0.42));
      var alpha = m.a * (0.25 + 0.75 * power) * (0.35 + 0.65 * beam);
      dctx.beginPath();
      dctx.arc(m.x, m.y, m.r, 0, 6.2832);
      dctx.fillStyle = 'rgba(160,232,246,' + alpha.toFixed(3) + ')';
      dctx.fill();
    }
  }

  /* ── run loop ───────────────────────────────────────────────────── */

  var startTime = null, raf = 0, visible = true, running = false;

  function frame(now) {
    if (startTime === null) startTime = now;
    var t = now - startTime;
    render(t);
    drawDust(t, clamp01((t - T.pulseFrom) / 1500));
    if (t > T.end + 20000) startTime = now - T.end;   // park in the idle state
    if (visible) raf = requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    cancelAnimationFrame(raf);
    startTime = null;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function showFinalFrame() {
    render(T.end);
    drawDust(T.end, 1);
  }

  sizeDust();
  window.addEventListener('resize', function () { sizeDust(); }, { passive: true });

  /* wide screens crop the artwork; narrow screens show all of it */
  var wide = window.matchMedia('(min-width: 901px)');
  function fit() {
    svg.setAttribute('preserveAspectRatio', wide.matches ? 'xMidYMid slice' : 'xMidYMid meet');
  }
  fit();
  (wide.addEventListener ? wide.addEventListener('change', fit) : wide.addListener(fit));

  if (reduced) {
    showFinalFrame();
  } else {
    var hero = document.getElementById('hero');
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !running) { running = true; raf = requestAnimationFrame(frame); }
      }, { threshold: 0.02 }).observe(hero);
    }
    start();
  }

  /* replay button */
  var replay = document.getElementById('sceneReplay');
  if (replay) {
    if (reduced) { replay.hidden = true; }
    replay.addEventListener('click', function () {
      replay.classList.add('is-busy');
      lines.forEach(function (L) { L.clip.setAttribute('width', 0); });
      walkPhase = 0;
      start();
      setTimeout(function () { replay.classList.remove('is-busy'); }, 1200);
    });
  }
}());
