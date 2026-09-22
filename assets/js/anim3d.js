/* ==========================================================================
   Rheinland Digitalwerk — hero animation

   The beats, in order: the robot walks in along the desk dragging a cable,
   plugs it into the wall socket, a spark jumps, energy runs up the cable,
   the laptop boots, the robot climbs onto the keyboard and hops across it,
   writing one line of code per hop.

   Motion is deliberately unhurried — the brief asked for calm. Everything
   is driven off one keyframe timeline so retiming means editing `T` only.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.RDW_SCENE;
  var E = window.E3D;
  if (!S || !E) return;

  var rig = S.rig, KEYS = S.KEYS, laptop = S.laptop, plug = S.plug;

  /* ── easing + keyframe sampling ──────────────────────────────────── */

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var Ease = {
    linear: function (t) { return t; },
    inOut:  function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    out:    function (t) { return 1 - Math.pow(1 - t, 3); },
    'in':   function (t) { return t * t * t; },
    soft:   function (t) { return t * t * (3 - 2 * t); }
  };

  function track(frames, t) {
    if (t <= frames[0][0]) return frames[0][1];
    for (var i = 1; i < frames.length; i++) {
      if (t <= frames[i][0]) {
        var a = frames[i - 1], b = frames[i];
        var e = Ease[b[2] || 'inOut'] || Ease.inOut;
        return lerp(a[1], b[1], e(clamp01((t - a[0]) / ((b[0] - a[0]) || 1))));
      }
    }
    return frames[frames.length - 1][1];
  }

  function burst(t, start, rise, fall) {
    if (t < start) return 0;
    if (t < start + rise) return (t - start) / rise;
    if (t < start + rise + fall) return 1 - (t - start - rise) / fall;
    return 0;
  }

  /* ── timeline (ms) ───────────────────────────────────────────────── */

  var T = {
    walkFrom:  600,
    walkTo:    5200,
    reach:     6100,
    push:      6700,
    contact:   6700,
    pulseFrom: 6800,
    pulseTo:   8600,
    boot:      8500,
    mark:      9200,
    markOut:  10600,
    turn:     10400,
    runTo:    12600,
    climbTo:  13600,
    hopFrom:  13700,
    hopEvery:  900,
    end:      24000
  };

  /* hop across the middle rows, left to right, so the robot never blocks
     the code it is typing */
  var HOP_KEYS = (function () {
    var r1 = [], r2 = [];
    for (var i = 0; i < KEYS.length; i++) {
      if (KEYS[i].ri === 2) r1.push(i);
      if (KEYS[i].ri === 3) r2.push(i);
    }
    var pick = [];
    for (var j = 0; j < 8; j++) {
      var src = (j % 2 === 0) ? r1 : r2;
      pick.push(src[Math.min(src.length - 1, 1 + Math.floor(j * 1.35))]);
    }
    return pick;
  }());
  var HOPS = HOP_KEYS.length;
  T.hopTo = T.hopFrom + HOPS * T.hopEvery;

  /* world position of a key top */
  function keyWorld(k) {
    return E.xform(laptop.world, [k.x, 2.35, k.z]);
  }

  var WALK_FROM = 118, SOCKET_X = 15;
  var SOCK = S.SOCKET;

  /* ── code the robot writes ───────────────────────────────────────── */

  var CODE = [
    [['const ', 'kw'], ['auftritt', 'fn'], [' = ', 'op'], ['marke', 'fn'], ['({', 'op']],
    [['  name', 'key'], [': ', 'op'], ['"Ihr Unternehmen"', 'str'], [',', 'op']],
    [['  website', 'key'], [': ', 'op'], ['true', 'num'], [',', 'op']],
    [['  onlineshop', 'key'], [': ', 'op'], ['true', 'num'], [',', 'op']],
    [['  sichtbarkeit', 'key'], [': ', 'op'], ['"maximal"', 'str'], [',', 'op']],
    [['});', 'op']],
    [['// bereit.', 'cm']]
  ];

  var CODE_COL = {
    night: { kw: '#FFAE63', fn: '#5FE9F5', str: '#93E3A8', key: '#9DC0EE', num: '#FFD79B', op: '#6E88AA', cm: '#4E6A8C', bg: 'rgba(5,16,32,0.55)' },
    day:   { kw: '#B45309', fn: '#0E7490', str: '#166534', key: '#1E3A8A', num: '#92400E', op: '#64748B', cm: '#94A3B8', bg: 'rgba(255,255,255,0.55)' }
  };

  /* ── per-frame state ─────────────────────────────────────────────── */

  var walkPhase = 0, lastT = 0;

  function update(t, dt) {
    var st = { shadow: 1, socket: 0, screen: 0, eyeGlow: 1, core: 1 };

    /* ---- where is the robot ---- */
    var x, z = -4, face = Math.PI, ground = 0, scale = 1;
    var onKeys = false, hopIndex = -1, hopP = 0;

    if (t < T.turn) {
      x = track([
        [0, WALK_FROM, 'linear'],
        [T.walkFrom, WALK_FROM, 'linear'],
        [T.walkTo, SOCKET_X, 'inOut'],
        [T.turn, SOCKET_X, 'linear']
      ], t);
      z = track([[0, -4, 'linear'], [T.walkTo, SOCK[2] + 4, 'inOut']], t);
      face = Math.PI * (t < T.walkTo ? 1 : 1);
    } else if (t < T.climbTo) {
      // turn around and walk back toward the laptop
      x = track([[T.turn, SOCKET_X, 'linear'], [T.runTo, S.LAPTOP.x - 22, 'inOut'],
                 [T.climbTo, S.LAPTOP.x - 22, 'linear']], t);
      z = track([[T.turn, SOCK[2] + 4, 'linear'], [T.runTo, 6, 'inOut']], t);
      face = track([[T.turn, Math.PI, 'linear'], [T.turn + 700, Math.PI * 2, 'inOut']], t);
    } else {
      onKeys = true;
      var k0 = KEYS[HOP_KEYS[0]];
      if (t < T.hopFrom) {
        var w0 = keyWorld(k0);
        x = w0[0]; z = w0[2]; ground = w0[1];
      } else if (t < T.hopTo) {
        hopIndex = Math.floor((t - T.hopFrom) / T.hopEvery);
        hopP = ((t - T.hopFrom) % T.hopEvery) / T.hopEvery;
        var a = keyWorld(KEYS[HOP_KEYS[Math.min(HOPS - 1, hopIndex)]]);
        var b = keyWorld(KEYS[HOP_KEYS[Math.min(HOPS - 1, hopIndex + 1)]]);
        var e = Ease.inOut(clamp01(hopP * 1.25));
        x = lerp(a[0], b[0], e); z = lerp(a[2], b[2], e); ground = lerp(a[1], b[1], e);
      } else {
        var wl = keyWorld(KEYS[HOP_KEYS[HOPS - 1]]);
        x = wl[0]; z = wl[2]; ground = wl[1];
      }
      face = Math.PI * 2 + 0.55;
      scale = 0.52;
    }

    /* ---- gait ---- */
    var walking = (t > T.walkFrom && t < T.walkTo) || (t > T.turn + 600 && t < T.runTo);
    var speed = t < T.walkTo ? 0.85 : 1.25;
    if (walking) {
      walkPhase += dt * 0.0060 * speed;
    } else {
      walkPhase += dt * 0.0004;
    }

    var bob = walking ? Math.abs(Math.sin(walkPhase)) * -0.55 * speed : Math.sin(t * 0.0016) * -0.16;
    var lean = walking ? 2.2 * speed : 0;
    var lift = 0;

    /* the stretch up to the socket */
    if (t > T.reach - 500 && t < T.contact + 900) {
      lift = track([
        [T.reach - 500, 0, 'linear'],
        [T.reach - 150, -0.9, 'out'],
        [T.contact, 3.4, 'out'],
        [T.contact + 320, 0.4, 'out'],
        [T.contact + 900, 0, 'soft']
      ], t);
    }

    /* the climb onto the keyboard */
    if (t >= T.runTo && t <= T.climbTo) {
      var cp = (t - T.runTo) / (T.climbTo - T.runTo);
      lift += Math.sin(cp * Math.PI) * 5;
      var kw0 = keyWorld(KEYS[HOP_KEYS[0]]);
      x = lerp(S.LAPTOP.x - 22, kw0[0], Ease.inOut(cp));
      z = lerp(6, kw0[2], Ease.inOut(cp));
      ground = lerp(0, kw0[1], Ease.soft(cp));
      scale = lerp(1, 0.52, Ease.soft(cp));
      lean = 10 * Math.sin(cp * Math.PI);
      face = Math.PI * 2 + 0.55 * cp;
    }

    if (hopIndex >= 0) {
      lift += Math.sin(hopP * Math.PI) * 2.4;
      lean = 7 * Math.sin(hopP * Math.PI * 2);
    }

    var yy = ground + bob + lift;
    rig.root.setTRS([E.trans(x, yy, z), E.rotY(face), E.scaleU(scale)]);
    rig.body.setTRS([E.trans(0, 4.4, 0), E.rotZ(lean * Math.PI / 180)]);

    st.shadow = clamp01(1 - Math.max(0, lift) / 7) * (onKeys ? 0.5 : 1);

    /* ---- limbs ---- */
    var swing = walking ? Math.sin(walkPhase) * 15 * speed : 0;
    var airborne = (hopIndex >= 0) ? Math.sin(hopP * Math.PI)
                 : (t >= T.runTo && t <= T.climbTo) ? Math.sin((t - T.runTo) / (T.climbTo - T.runTo) * Math.PI) : 0;

    if (airborne > 0.02) {
      rig.legF.setTRS([E.trans(0, 4.4, 2.1), E.rotZ(-0.6 * airborne)]);
      rig.legB.setTRS([E.trans(0, 4.4, -2.1), E.rotZ(0.5 * airborne)]);
      rig.armF.setTRS([E.trans(0, 5.6, 4.3), E.rotZ(-1.0 - 1.1 * airborne)]);
      rig.armB.setTRS([E.trans(0, 5.6, -4.3), E.rotZ(-0.8 - 1.2 * airborne)]);
    } else {
      var rad = swing * Math.PI / 180;
      rig.legF.setTRS([E.trans(0, 4.4, 2.1), E.rotZ(rad)]);
      rig.legB.setTRS([E.trans(0, 4.4, -2.1), E.rotZ(-rad)]);

      /* the near arm lifts the plug to the socket between reach and contact */
      var armF = track([
        [0, -rad * 0.7, 'linear'],
        [T.walkTo, -rad * 0.7, 'linear'],
        [T.walkTo + 200, 0.1, 'soft'],
        [T.reach, -2.05, 'out'],
        [T.contact, -2.25, 'out'],
        [T.contact + 700, -2.05, 'soft'],
        [T.contact + 1400, 0, 'soft']
      ], t);
      var useLift = t > T.walkTo && t < T.contact + 1400;
      rig.armF.setTRS([E.trans(0, 5.6, 4.3), E.rotZ(useLift ? armF : -rad * 0.7)]);
      rig.armB.setTRS([E.trans(0, 5.6, -4.3), E.rotZ(rad * 0.7)]);
    }

    /* head: up at the socket, then toward the screen */
    var tilt = track([
      [0, 0, 'linear'],
      [T.walkTo, 0, 'linear'],
      [T.reach, -0.30, 'out'],
      [T.contact + 700, -0.30, 'linear'],
      [T.turn, 0, 'soft'],
      [T.climbTo, 0, 'linear'],
      [T.climbTo + 500, -0.20, 'soft']
    ], t);
    rig.head.setTRS([E.trans(0, 7.5, 0), E.rotZ(tilt)]);

    /* ---- eyes: a slow blink, and a brighten when the power comes on ---- */
    var lit = t < T.contact ? 0 : clamp01((t - T.contact) / 900);
    var blinkT = (t + 900) % 5200;
    var blink = blinkT < 150 ? 0.12 : 1;
    rig.eyes.visible = blink > 0.5;
    st.eyeGlow = (0.55 + 0.45 * lit) * (blink > 0.5 ? 1 : 0.2);
    st.core = 0.35 + 0.65 * lit;

    /* ---- the plug ---- */
    var pw;
    if (t < T.walkTo + 200) {
      pw = [x + 5.5 * Math.cos(face + 0.3), 3.2, z + 5.5 * -Math.sin(face + 0.3)];
    } else if (t < T.contact) {
      var pp = Ease.out(clamp01((t - T.walkTo - 200) / (T.contact - T.walkTo - 200)));
      pw = [lerp(x + 5.5, SOCK[0] + 4.2, pp), lerp(3.2, SOCK[1], pp), lerp(z, SOCK[2], pp)];
    } else {
      pw = [SOCK[0] + 3.4, SOCK[1], SOCK[2]];
    }
    plug.setTRS([E.trans(pw[0], pw[1], pw[2]), E.rotY(Math.PI)]);
    S.plugWorld = pw;

    /* ---- power ---- */
    st.socket = burst(t, T.contact - 60, 120, 700) * 1.2 + lit * 0.3;
    st.spark = burst(t, T.contact - 40, 90, 420);
    st.flash = burst(t, T.contact - 40, 80, 560) * 0.14;
    st.pulse = (t >= T.pulseFrom && t <= T.pulseTo) ? (t - T.pulseFrom) / (T.pulseTo - T.pulseFrom) : -1;
    st.cableLit = lit;

    /* ---- laptop screen ---- */
    st.screen = clamp01((t - T.boot) / 700);
    st.sweep = clamp01((t - T.boot) / 1100);
    st.mark = track([
      [T.mark - 500, 0, 'linear'], [T.mark, 1, 'out'],
      [T.markOut - 400, 1, 'linear'], [T.markOut, 0, 'soft']
    ], t);

    /* ---- typing: one line per hop ---- */
    st.lines = [];
    for (var i = 0; i < CODE.length; i++) {
      var start = T.hopFrom + i * T.hopEvery + 150;
      st.lines.push(clamp01((t - start) / 520));
    }
    st.caret = t > T.hopFrom && (t % 1100) < 620;

    /* ---- the key under the robot lights up on landing ---- */
    st.litKey = (hopIndex >= 0 && hopP < 0.3) ? HOP_KEYS[hopIndex] : -1;

    return st;
  }

  window.RDW_ANIM = {
    T: T, update: update, CODE: CODE, CODE_COL: CODE_COL,
    HOP_KEYS: HOP_KEYS, keyWorld: keyWorld, Ease: Ease, track: track
  };
}());
