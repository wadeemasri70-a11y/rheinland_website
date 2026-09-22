/* ==========================================================================
   Rheinland Digitalwerk — hero animation

   The beats, in order: the robot walks in along the desk dragging a cable,
   plugs it into the wall socket, a spark jumps, energy runs up the cable,
   the laptop boots, the robot climbs onto the keyboard and hops across it
   writing one line of code per hop — then runs out of steam, sags, topples
   onto its back across the keys, catches its breath, and the whole thing
   fades out and starts again.

   Motion is deliberately unhurried; the brief asked for calm. Everything is
   driven off one keyframe timeline, so retiming means editing `T` only.
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
    soft:   function (t) { return t * t * (3 - 2 * t); },
    /* slow teeter, then gravity takes over */
    topple: function (t) { return t < .35 ? t * t * 1.2 : 0.147 + Math.pow((t - .35) / .65, 1.7) * 0.853; }
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

  /* ── the code the robot writes ───────────────────────────────────── */

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
    night: { kw: '#FFAE63', fn: '#5FE9F5', str: '#93E3A8', key: '#9DC0EE', num: '#FFD79B', op: '#6E88AA', cm: '#4E6A8C' },
    day:   { kw: '#B45309', fn: '#0E7490', str: '#166534', key: '#1E3A8A', num: '#92400E', op: '#64748B', cm: '#94A3B8' }
  };

  /* ── timeline (ms) ───────────────────────────────────────────────── */

  var T = {
    walkFrom:  600,
    walkTo:   2900,    // reaches the plug lying on the desk
    grab:     3280,    // hand closes on it
    pickTo:   4000,    // back upright, plug in hand
    carryTo:  6000,    // carries it to the socket
    reach:    6700,
    contact:  7300,
    pulseFrom:7400,
    pulseTo:  9200,
    boot:     9100,
    mark:     9800,
    markOut: 11200,
    turn:    11000,
    runTo:   13100,
    climbTo: 14100,
    hopFrom: 14250,
    hopEvery:  880
  };

  /* one hop per line of code */
  var HOPS = CODE.length;
  T.hopTo   = T.hopFrom + HOPS * T.hopEvery;   // 13750 + 7*880 = 19910
  T.tireTo  = T.hopTo + 2300;                  // out of steam
  T.flopTo  = T.tireTo + 950;                  // topples over
  T.restTo  = T.flopTo + 3000;                 // lies there breathing
  T.fadeTo  = T.restTo + 1100;                 // fade out
  T.loop    = T.fadeTo;                        // and round again
  T.end     = T.loop;

  /* hop across the two rows nearest the viewer, left to right, so the
     robot never covers the code it is writing */
  var HOP_KEYS = (function () {
    var rowA = [], rowB = [];
    for (var i = 0; i < KEYS.length; i++) {
      if (KEYS[i].ri === 2) rowA.push(i);
      if (KEYS[i].ri === 3) rowB.push(i);
    }
    var pick = [];
    for (var j = 0; j <= HOPS; j++) {
      var src = (j % 2 === 0) ? rowA : rowB;
      pick.push(src[Math.max(0, src.length - 2 - Math.round(j * 1.25))]);
    }
    return pick;
  }());

  function keyWorld(k) { return E.xform(laptop.world, [k.x, 2.35, k.z]); }

  var WALK_FROM = 118, SOCKET_X = 15;
  var SOCK = S.SOCKET;

  /* The plug starts on the desk beside the laptop. The robot walks in with
     empty hands, crouches over it, picks it up and carries it to the wall —
     which reads far better than having it arrive holding the thing. */
  var PLUG_REST = [56, 1.8, 1];
  var PICK_X = PLUG_REST[0] + 6.5;     // where the robot stands to reach it

  /* ── springy antenna ─────────────────────────────────────────────────
     A one-dimensional damped spring driven by the body's vertical
     acceleration. It costs almost nothing and is most of what makes the
     robot feel like it has weight. */

  var antA = 0, antV = 0, prevY = null, prevVel = 0;

  function springAntenna(yy, dt) {
    var d = Math.max(1, dt);
    var vel = prevY === null ? 0 : (yy - prevY) / d;
    var acc = (vel - prevVel) / d;
    prevY = yy; prevVel = vel;

    var drive = -acc * 900;                       // the mast lags the body
    antV += (-antA * 0.055 - antV * 0.11 + drive * 0.0016) * d;
    antA += antV * d * 0.06;
    if (antA > 0.9) { antA = 0.9; antV *= -0.3; }
    if (antA < -0.9) { antA = -0.9; antV *= -0.3; }
    return antA;
  }

  /* ── per-frame state ─────────────────────────────────────────────── */

  var walkPhase = 0;
  var gait = 0;             // 0 standing, 1 walking; smoothed so legs never snap

  /* shape of one hop, as fractions of the beat */
  var AP = 0.17;            // crouch before the push
  var FLIGHT = 0.66;        // time off the ground

  function update(t, dt) {
    var st = { shadow: 1, socket: 0, screen: 0, eyeGlow: 1, core: 1, fade: 0, litKey: -1 };

    /* fade in at the top of the loop, out at the end */
    if (t < 700) st.fade = 1 - clamp01(t / 700);
    else if (t > T.restTo) st.fade = clamp01((t - T.restTo) / (T.fadeTo - T.restTo));

    var x, z = -4, face = Math.PI, ground = 0, scale = 1;
    var hopIndex = -1, hopP = 0, onKeys = false, hopArc = 0;
    var lift = 0, lean = 0, roll = 0, tip = 0;

    /* ---- where is the robot ---- */
    if (t < T.turn) {
      x = track([
        [0, WALK_FROM, 'linear'],
        [T.walkFrom, WALK_FROM, 'linear'],
        [T.walkTo, PICK_X, 'inOut'],      // up to the plug
        [T.pickTo, PICK_X, 'linear'],     // stood over it, picking it up
        [T.carryTo, SOCKET_X, 'inOut'],   // carries it to the wall
        [T.turn, SOCKET_X, 'linear']
      ], t);
      z = track([
        [0, -2, 'linear'],
        [T.walkTo, PLUG_REST[2] + 3.5, 'inOut'],
        [T.pickTo, PLUG_REST[2] + 3.5, 'linear'],
        [T.carryTo, SOCK[2] + 4, 'inOut']
      ], t);
      face = Math.PI;

      /* crouching over the plug */
      if (t > T.walkTo - 200 && t < T.pickTo) {
        lean += track([
          [T.walkTo - 200, 0, 'linear'],
          [T.grab, 27, 'out'],
          [T.grab + 220, 24, 'linear'],
          [T.pickTo, 0, 'soft']
        ], t);
        lift += track([
          [T.walkTo - 200, 0, 'linear'],
          [T.grab, -1.7, 'out'],
          [T.grab + 220, -1.5, 'linear'],
          [T.pickTo, 0, 'soft']
        ], t);
      }
    } else if (t < T.climbTo) {
      x = track([[T.turn, SOCKET_X, 'linear'], [T.runTo, S.LAPTOP.x - 22, 'inOut'],
                 [T.climbTo, S.LAPTOP.x - 22, 'linear']], t);
      z = track([[T.turn, SOCK[2] + 4, 'linear'], [T.runTo, 6, 'inOut']], t);
      face = track([[T.turn, Math.PI, 'linear'], [T.turn + 800, Math.PI * 2, 'soft']], t);
    } else {
      onKeys = true;
      face = Math.PI * 2 + 0.55;
      scale = 0.52;
      var kFirst = keyWorld(KEYS[HOP_KEYS[0]]);

      if (t < T.hopFrom) {
        x = kFirst[0]; z = kFirst[2]; ground = kFirst[1];
      } else if (t < T.hopTo) {
        hopIndex = Math.floor((t - T.hopFrom) / T.hopEvery);
        hopP = ((t - T.hopFrom) % T.hopEvery) / T.hopEvery;

        var a = keyWorld(KEYS[HOP_KEYS[Math.min(HOP_KEYS.length - 1, hopIndex)]]);
        var b = keyWorld(KEYS[HOP_KEYS[Math.min(HOP_KEYS.length - 1, hopIndex + 1)]]);

        /* A hop is three distinct things, and easing the whole beat with
           one curve made all of them mushy:

             crouch   — the robot sinks in place, going nowhere
             flight   — constant horizontal speed, vertical on a parabola
             recovery — the landing is absorbed, then it straightens up

           The horizontal used to be eased in and out, which had the robot
           decelerating in mid-air. Nothing decelerates in mid-air, and it
           was the main reason the hops looked floaty. */

        var fatigue = hopIndex / Math.max(1, HOPS - 1);
        var H = lerp(3.4, 2.1, fatigue);      // later hops are lower
        var CROUCH = 0.9, LAND = 0.7;

        var move, arc = 0;
        if (hopP < AP) {
          move = 0;
          lift = -CROUCH * Math.sin((hopP / AP) * Math.PI / 2);
        } else if (hopP < AP + FLIGHT) {
          var q = (hopP - AP) / FLIGHT;
          move = q;                                    // constant speed
          arc = 4 * q * (1 - q);                       // parabola, peaks at 1
          lift = -CROUCH * (1 - q) * (1 - q) + H * arc;
        } else {
          var r = (hopP - AP - FLIGHT) / (1 - AP - FLIGHT);
          move = 1;
          lift = -LAND * Math.sin(r * Math.PI);        // absorb, then stand
        }

        x = lerp(a[0], b[0], move);
        z = lerp(a[2], b[2], move);
        ground = lerp(a[1], b[1], move);
        hopArc = arc;

        // lean forward into the hop, upright again by the landing
        lean = 7.5 * Math.sin(Math.min(1, hopP / (AP + FLIGHT)) * Math.PI) * (1 - fatigue * 0.35);
        if (hopP < AP + 0.08) st.litKey = HOP_KEYS[Math.min(HOP_KEYS.length - 1, hopIndex)];
        if (hopP < 0.30) st.litKey = HOP_KEYS[Math.min(HOP_KEYS.length - 1, hopIndex)];
      } else {
        var last = keyWorld(KEYS[HOP_KEYS[Math.min(HOP_KEYS.length - 1, HOPS)]]);
        x = last[0]; z = last[2]; ground = last[1];

        if (t < T.tireTo) {
          /* ---- out of steam: the robot sags and sways ---- */
          var f = clamp01((t - T.hopTo) / (T.tireTo - T.hopTo));
          lean = track([[T.hopTo, 0, 'linear'], [T.tireTo, 13, 'soft']], t);
          roll = Math.sin((t - T.hopTo) * 0.0034) * 5.5 * f;
          lift = -1.0 * f + Math.sin((t - T.hopTo) * 0.0021) * 0.42 * f;  // heavy breathing
        } else if (t < T.flopTo) {
          /* ---- topples onto its back across the keys ---- */
          var fp = (t - T.tireTo) / (T.flopTo - T.tireTo);
          tip = Ease.topple(fp) * Math.PI * 0.5;
          lean = 13 * (1 - fp);
          roll = 5.5 * (1 - fp);
          lift = -1.0 + 3.1 * Ease.out(clamp01(fp * 1.4));
        } else {
          /* ---- lying down, catching its breath ---- */
          var rp = clamp01((t - T.flopTo) / 420);
          var bounce = Math.sin(rp * Math.PI) * 0.55 * (1 - rp);
          tip = Math.PI * 0.5 + Math.sin(rp * Math.PI * 2) * 0.05 * (1 - rp);
          lift = 3.1 + bounce + Math.sin((t - T.flopTo) * 0.0016) * 0.20;
        }
      }
    }

    /* the climb from desk to keyboard */
    if (t >= T.runTo && t <= T.climbTo) {
      var cp = (t - T.runTo) / (T.climbTo - T.runTo);
      var k0 = keyWorld(KEYS[HOP_KEYS[0]]);
      x = lerp(S.LAPTOP.x - 22, k0[0], Ease.inOut(cp));
      z = lerp(6, k0[2], Ease.inOut(cp));
      ground = lerp(0, k0[1], Ease.soft(cp));
      scale = lerp(1, 0.52, Ease.soft(cp));
      lift = Math.sin(cp * Math.PI) * 5.5;
      lean = 12 * Math.sin(cp * Math.PI);
      face = Math.PI * 2 + 0.55 * cp;
    }

    /* the stretch up to the socket */
    if (t > T.reach - 500 && t < T.contact + 900) {
      lift = track([
        [T.reach - 500, 0, 'linear'],
        [T.reach - 150, -0.9, 'out'],     // sink before the push
        [T.contact, 3.4, 'out'],          // up on tiptoe
        [T.contact + 320, 0.4, 'out'],
        [T.contact + 900, 0, 'soft']
      ], t);
    }

    /* ---- gait ────────────────────────────────────────────────────────
       Walking used to switch on and off between two frames, so the legs
       jumped to mid-stride on the first step and snapped straight on the
       last. `gait` eases between the two states and scales every part of
       the walk, which also lets the cycle wind down in place. */

    var walking = (t > T.walkFrom && t < T.walkTo - 260)
               || (t > T.pickTo && t < T.carryTo - 200)
               || (t > T.turn + 700 && t < T.runTo);
    var speed = t < T.carryTo ? 0.85 : 1.2;

    gait += ((walking ? 1 : 0) - gait) * Math.min(1, dt * 0.007);
    if (gait < 0.002) gait = 0;

    walkPhase += dt * (0.0060 * speed * gait + 0.0004);

    var stride = Math.sin(walkPhase) * gait;
    if (gait > 0) {
      /* body dips onto each footfall and sways a little side to side */
      lift += -Math.abs(stride) * 0.50 * speed;
      lean += 2.4 * speed * gait;
      roll += Math.cos(walkPhase) * 2.2 * speed * gait;
    }
    if (gait < 0.9 && (!onKeys || t < T.hopTo)) {
      lift += Math.sin(t * 0.0016) * 0.16 * (1 - gait);   // idle breathing
    }

    var yy = ground + lift;

    rig.root.setTRS([
      E.trans(x, yy, z),
      E.rotY(face),
      E.rotZ(tip),
      E.scaleU(scale)
    ]);
    rig.body.setTRS([E.trans(0, 4.4, 0), E.rotZ(lean * Math.PI / 180), E.rotX(roll * Math.PI / 180)]);

    /* shadow: fades as the robot leaves the surface, widens when it lies down */
    var air = clamp01(Math.max(0, lift) / 4);
    st.shadow = (1 - air * 0.75) * (onKeys ? 0.55 : 1);
    st.shadowWide = tip > 0.6 ? 1.7 : 1;

    /* ---- limbs ---- */
    /* How far off the ground the robot is, 0..1. Taken from the arc rather
       than from `lift`, because the hop height drops as the robot tires and
       dividing by a fixed height left the late hops with limp legs. */
    var airborne = hopIndex >= 0 ? hopArc
                 : (t >= T.runTo && t <= T.climbTo) ? Math.sin((t - T.runTo) / (T.climbTo - T.runTo) * Math.PI) : 0;

    if (tip > 0.05) {
      /* sprawled: arms out, legs loose */
      var sp = clamp01(tip / (Math.PI * 0.5));
      rig.legF.setTRS([E.trans(0, 4.4, 2.1), E.rotZ(-0.42 * sp)]);
      rig.legB.setTRS([E.trans(0, 4.4, -2.1), E.rotZ(-0.20 * sp)]);
      rig.armF.setTRS([E.trans(0, 5.6, 4.3), E.rotZ(0.85 * sp), E.rotX(0.22 * sp)]);
      rig.armB.setTRS([E.trans(0, 5.6, -4.3), E.rotZ(0.70 * sp), E.rotX(-0.18 * sp)]);
    } else if (airborne > 0.03) {
      /* legs tuck on the way up and reach for the surface on the way down */
      var tuck = Math.pow(airborne, 0.7);
      rig.legF.setTRS([E.trans(0, 4.4, 2.1), E.rotZ(-0.66 * tuck)]);
      rig.legB.setTRS([E.trans(0, 4.4, -2.1), E.rotZ(0.50 * tuck)]);
      rig.armF.setTRS([E.trans(0, 5.6, 4.3), E.rotZ(-0.42 - 0.78 * tuck)]);
      rig.armB.setTRS([E.trans(0, 5.6, -4.3), E.rotZ(-0.30 - 0.86 * tuck)]);
    } else {
      var legRad = stride * 17 * speed * Math.PI / 180;
      rig.legF.setTRS([E.trans(0, 4.4, 2.1), E.rotZ(legRad)]);
      rig.legB.setTRS([E.trans(0, 4.4, -2.1), E.rotZ(-legRad)]);

      /* arms trail the legs by a beat, which stops the walk looking mechanical */
      var armRad = Math.sin(walkPhase - 0.42) * gait * 13 * speed * Math.PI / 180;

      /* the near arm lifts the plug to the socket between reach and contact */
      var lifting = t > T.walkTo - 200 && t < T.contact + 1400;
      var armF = track([
        [T.walkTo - 200, -armRad, 'linear'],
        [T.grab - 120, 0.62, 'out'],      // reaches down and forward
        [T.grab + 180, 0.66, 'linear'],   // closes on the plug
        [T.pickTo, 0.08, 'soft'],         // straightens, holding it
        [T.carryTo, 0.05, 'linear'],      // carried at the side
        [T.reach, -2.05, 'out'],          // up to the socket
        [T.contact, -2.28, 'out'],
        [T.contact + 700, -2.05, 'soft'],
        [T.contact + 1400, 0, 'soft']
      ], t);

      /* tired arms hang heavier */
      var sag = (t > T.hopTo && t < T.flopTo) ? clamp01((t - T.hopTo) / 2300) * 0.45 : 0;

      rig.armF.setTRS([E.trans(0, 5.6, 4.3), E.rotZ((lifting ? armF : -armRad) - sag)]);
      rig.armB.setTRS([E.trans(0, 5.6, -4.3), E.rotZ(armRad - sag)]);
    }

    /* head: counter-bobs while walking, looks up at the socket, droops when tired */
    var tilt = track([
      [0, 0, 'linear'],
      [T.walkTo - 300, 0, 'linear'],
      [T.grab, 0.40, 'out'],            // looks down at the plug
      [T.pickTo, 0.10, 'soft'],
      [T.carryTo, 0, 'soft'],
      [T.reach, -0.32, 'out'],
      [T.contact + 700, -0.32, 'linear'],
      [T.turn, 0, 'soft'],
      [T.climbTo, 0, 'linear'],
      [T.climbTo + 600, -0.18, 'soft'],
      [T.hopTo, -0.18, 'linear'],
      [T.tireTo, 0.42, 'soft'],          // chin drops
      [T.flopTo, 0.10, 'soft'],
      [T.flopTo + 500, -0.12, 'soft']    // settles back looking up
    ], t);
    if (walking) tilt += -stride * 0.035;   // keeps the head steadier than the body
    rig.head.setTRS([E.trans(0, 7.5, 0), E.rotZ(tilt)]);

    /* the antenna follows everything else, late */
    if (rig.ant) {
      var a2 = springAntenna(yy / Math.max(0.2, scale), dt);
      rig.ant.setTRS([E.trans(-2.2, 7.2, 0), E.rotZ(a2), E.rotX(a2 * 0.4)]);
    }

    /* ---- eyes ---- */
    var lit = t < T.contact ? 0 : clamp01((t - T.contact) / 900);
    var tired = t > T.hopTo ? clamp01((t - T.hopTo) / 2600) : 0;
    var blinkT = (t + 900) % 5200;
    var slow = t > T.flopTo ? ((t - T.flopTo) % 2400) < 380 : false;   // long, heavy blinks
    var blink = (blinkT < 150 || slow) ? 0 : 1;
    rig.eyes.visible = blink > 0.5;
    st.eyeGlow = (0.55 + 0.45 * lit) * (1 - tired * 0.45) * blink;
    st.core = (0.35 + 0.65 * lit) * (1 - tired * 0.35);

    /* ---- the plug ---- */
    /* where the near hand is, near enough for the plug to sit in it */
    function handAt(hy) {
      return [x + 4.8 * Math.cos(face + 0.28), hy, z + 4.8 * -Math.sin(face + 0.28)];
    }

    var pw;
    if (t < T.grab) {
      pw = PLUG_REST.slice();                       // lying on the desk
    } else if (t < T.pickTo) {
      var g = Ease.out(clamp01((t - T.grab) / (T.pickTo - T.grab)));
      var h = handAt(3.4);
      pw = [lerp(PLUG_REST[0], h[0], g), lerp(PLUG_REST[1], h[1], g), lerp(PLUG_REST[2], h[2], g)];
    } else if (t < T.reach) {
      pw = handAt(3.4);                             // carried
    } else if (t < T.contact) {
      var pp = Ease.out(clamp01((t - T.reach) / (T.contact - T.reach)));
      var h2 = handAt(3.4);
      pw = [lerp(h2[0], SOCK[0] + 4.2, pp), lerp(h2[1], SOCK[1], pp), lerp(h2[2], SOCK[2], pp)];
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

    /* ---- laptop ---- */
    st.screen = clamp01((t - T.boot) / 700);
    st.sweep = clamp01((t - T.boot) / 1100);
    st.mark = track([
      [T.mark - 500, 0, 'linear'], [T.mark, 1, 'out'],
      [T.markOut - 400, 1, 'linear'], [T.markOut, 0, 'soft']
    ], t);

    /* ---- the laptop turns into a modern RGB machine ----
       It boots as a plain grey box; once the robot starts writing code the
       keyboard lighting comes up. The ramp is slow on purpose so it reads
       as the machine waking up rather than as a light switch. */
    /* the chassis modernises slightly ahead of the lighting, so the shape
       changes first and the backlight arrives as the finishing touch */
    st.modern = clamp01((t - T.hopFrom + 900) / 2200);
    st.rgb = clamp01((t - T.hopFrom + 200) / 2900) * (t > T.fadeTo - 900 ? clamp01((T.fadeTo - t) / 900) : 1);
    st.rgbT = t;

    /* ---- typing: one line per hop ---- */
    st.lines = [];
    for (var i = 0; i < CODE.length; i++) {
      st.lines.push(clamp01((t - (T.hopFrom + i * T.hopEvery + 150)) / 500));
    }
    st.caret = t > T.hopFrom && t < T.tireTo && (t % 1100) < 620;

    return st;
  }

  function reset() { walkPhase = 0; gait = 0; antA = 0; antV = 0; prevY = null; prevVel = 0; }

  window.RDW_ANIM = {
    T: T, update: update, reset: reset,
    CODE: CODE, CODE_COL: CODE_COL,
    HOP_KEYS: HOP_KEYS, keyWorld: keyWorld, Ease: Ease, track: track
  };
}());
