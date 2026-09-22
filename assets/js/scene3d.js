/* ==========================================================================
   Rheinland Digitalwerk — hero scene (3D)

   A small robot walks along a desk that meets a wall on the left of the
   frame, plugs a cable into the wall socket, the workspace comes to life,
   the laptop boots, and the robot hops across the keyboard writing code.

   Geometry, lighting and perspective are real 3D (see engine3d.js); the
   look is INSIDE-style — near-silhouettes lifted by a coloured rim light —
   in the brand palette. Two themes: night (default) and day.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.E3D;
  var canvas = document.getElementById('scene3d');
  if (!E || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── palette ─────────────────────────────────────────────────────────
     Every material carries a night and a day colour so switching themes
     is a lookup, not a rebuild. Values trace back to the logo:
     #01247A navy · #00B2C0 cyan · #001854 deep navy · #E4791E orange
     ─────────────────────────────────────────────────────────────────── */

  function lerp(a, b, t) { return a + (b - a) * t; }

  function M(night, day, extra) {
    var m = { n: night, d: day };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  var MAT = {
    wall:     M([23, 36, 59],  [212, 219, 231], { nofog: 1, flat: 1, layer: 0 }),
    wallTrim: M([10, 16, 29],  [206, 214, 227], { nofog: 1, flat: 1, layer: 0 }),
    wallBack: M([28, 44, 71],  [212, 220, 233], { nofog: 1, flat: 1, layer: 0 }),
    desk:     M([31, 47, 74],  [203, 192, 176], { nofog: 1, flat: 1, layer: 1 }),
    deskEdge: M([17, 26, 43],  [172, 161, 146], { nofog: 1, flat: 1, layer: 1 }),

    shell:    M([21, 33, 56],  [206, 215, 228]),   // robot body
    shellDk:  M([13, 21, 37],  [172, 183, 200]),
    joint:    M([9, 15, 27],   [126, 140, 162]),
    accent:   M([1, 36, 122],  [1, 36, 122]),      // brand navy, both themes

    lidBack:  M([27, 42, 68],  [150, 163, 184]),
    lidFace:  M([14, 22, 38],  [120, 133, 154]),
    deck:     M([30, 45, 72],  [186, 196, 211]),
    key:      M([13, 21, 36],  [126, 139, 160]),
    chrome:   M([96, 124, 162], [232, 236, 241]),
    grille:   M([8, 13, 23],    [150, 158, 170]),
    keyLit:   M([0, 138, 158], [0, 158, 178]),

    socket:   M([34, 50, 78],  [236, 240, 246]),
    socketIn: M([14, 22, 38],  [196, 204, 217]),
    slot:     M([6, 10, 18],   [96, 106, 122]),
    plug:     M([18, 28, 48],  [190, 199, 214]),
    cable:    M([10, 16, 28],  [120, 131, 150]),

    /* emissive — these ignore lighting and glow */
    visor:    M([16, 122, 140], [70, 176, 190], { emis: 1 }),
    eye:      M([150, 244, 252], [232, 252, 255], { emis: 1 }),
    core:     M([162, 84, 26],  [206, 112, 40], { emis: 1 }),
    screen:   M([26, 62, 95],  [224, 233, 243], { emis: 1 }),
    screenOff:M([13, 20, 33],  [139, 148, 163], { emis: 1 })
  };

  var THEMES = {
    night: {
      bgTop: '#152541', bgBot: '#0A1322',
      fog: [13, 23, 40], fogNear: 55, fogFar: 215,
      amb: 0.31,
      key: { dir: E.norm([0.55, 0.72, 0.42]), c: [150, 178, 214], i: 0.62 },
      rim: { dir: E.norm([-0.80, 0.22, -0.48]), c: [47, 227, 240], i: 1.55, p: 2.2 },
      fill:{ dir: E.norm([-0.3, -0.25, 0.7]), c: [20, 48, 84], i: 0.28 },
      ground: 'rgba(0,0,0,0.42)',
      glow: 1
    },
    day: {
      bgTop: '#EEF2F8', bgBot: '#DCE4EE',
      fog: [231, 237, 245], fogNear: 60, fogFar: 235,
      amb: 0.58,
      key: { dir: E.norm([0.5, 0.78, 0.38]), c: [255, 251, 242], i: 0.52 },
      rim: { dir: E.norm([-0.7, 0.2, -0.6]), c: [0, 178, 192], i: 0.30, p: 3.0 },
      fill:{ dir: E.norm([-0.35, -0.2, 0.65]), c: [196, 212, 232], i: 0.30 },
      ground: 'rgba(38,52,74,0.16)',
      glow: 0.35
    }
  };

  var theme = 'night';
  function T() { return THEMES[theme]; }
  function col(mat) { return theme === 'night' ? mat.n : mat.d; }

  /* ── world ───────────────────────────────────────────────────────── */

  var world = new E.Node('world');

  /* room: the wall sits at x = 0 and faces +X, the desk runs away to +X */
  var room = world.add(new E.Node('room'));
  room.faces = []
    // left wall — the "wall" at the left edge of the frame
    .concat(E.grid([0, -70, 40], [0, 190, 0], [0, 0, -96], 6, 10, MAT.wall))
    // back wall, for depth
    .concat(E.grid([0, -70, -54], [230, 0, 0], [0, 190, 0], 12, 8, MAT.wallBack))
    // desk top, heavily subdivided so smaller objects sort correctly on it
    .concat(E.grid([0, 0, 34], [216, 0, 0], [0, 0, -88], 14, 9, MAT.desk))
    // desk apron — subdivided like everything else, a single quad this
    // close to the camera would sort in front of the whole scene
    .concat(E.grid([0, 0, 34], [216, 0, 0], [0, -5, 0], 14, 1, MAT.deskEdge))
    .concat(E.grid([0, -5, 34], [216, 0, 0], [0, 0, -88], 14, 6, MAT.deskEdge))
    // skirting where wall meets desk
    .concat(E.grid([0.5, 0, 32], [0, 1.4, 0], [0, 0, -84], 1, 8, MAT.wallTrim))
    .concat(E.grid([0.5, 0, -52], [228, 0, 0], [0, 1.4, 0], 12, 1, MAT.wallTrim));

  /* wall socket */
  var SOCKET = [1.0, 24, -20];
  var socket = world.add(new E.Node('socket'));
  socket.setTRS([E.trans(SOCKET[0], SOCKET[1], SOCKET[2])]);
  socket.faces = []
    .concat(E.box([1.1, 0, 0], [2.2, 15, 11], MAT.socket, { left: true }))
    .concat(E.box([2.3, 0, 0], [0.5, 9.5, 7], MAT.socketIn, { left: true }))
    .concat(E.quad([2.6, -2.0, 1.7], [2.6, -2.0, 0.7], [2.6, 2.0, 0.7], [2.6, 2.0, 1.7], MAT.slot))
    .concat(E.quad([2.6, -2.0, -0.7], [2.6, -2.0, -1.7], [2.6, 2.0, -1.7], [2.6, 2.0, -0.7], MAT.slot));

  /* ── laptop ──────────────────────────────────────────────────────── */

  var LAPTOP = { x: 34, z: -20, rot: -1.30 };

  /* The laptop is built from a single "modernity" value: 0 is the boxy
     machine it boots as, 1 is a slim modern one. Fat bezels give way to a
     screen that nearly fills the lid, the lid itself gets thinner, a camera
     notch appears, the front edge picks up a chamfer and speaker grilles
     show up beside the keyboard. The shell colour shifts from dull plastic
     to something more metallic at the same time.

     Only the shell is rebuilt. The keys keep their positions, because the
     robot's hop targets are derived from them and must not drift. */

  var SCR_W = 28.6, SCR_H = 18.6;          // screen panel, in laptop units
  var SCREEN_QUAD = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var LID_TILT = 0.30;

  var laptop = world.add(new E.Node('laptop'));
  laptop.setTRS([E.trans(LAPTOP.x, 0, LAPTOP.z), E.rotY(LAPTOP.rot)]);
  laptop.faces = [];

  var chassis = laptop.add(new E.Node('chassis'));
  var lid = laptop.add(new E.Node('lid'));

  /* shell colours, old → modern */
  var SHELL = {
    lidBack: { a: [27, 42, 68],  b: [46, 66, 96],  ad: [150, 163, 184], bd: [196, 202, 210] },
    deck:    { a: [30, 45, 72],  b: [44, 63, 92],  ad: [186, 196, 211], bd: [206, 211, 218] },
    lidFace: { a: [14, 22, 38],  b: [22, 33, 52],  ad: [120, 133, 154], bd: [150, 158, 170] }
  };

  var modernity = -1;

  function buildShell(m) {
    if (Math.abs(m - modernity) < 0.012) return;
    modernity = m;

    var bez   = lerp(2.4, 0.75, m);     // frame around the panel
    var lidD  = lerp(1.2, 0.5, m);      // how thick the lid is
    var baseH = 1.5;                    // fixed: the keys and hop targets sit on it
    SCR_W = lerp(28.6, 32.2, m);
    SCR_H = lerp(18.6, 21.8, m);
    LID_TILT = lerp(0.30, 0.23, m);

    var outW = SCR_W + bez * 2;
    var outH = SCR_H + bez * 2;
    var y0 = 0.9;                        // lid starts just above the hinge
    var sy0 = y0 + bez;                  // panel bottom

    lid.setTRS([E.trans(-11.5, baseH, 0), E.rotZ(LID_TILT)]);

    var f = E.box([-lidD / 2, y0 + outH / 2, 0], [lidD, outH, outW], MAT.lidBack, { right: true })
      .concat(E.quad(
        [0.05, sy0 + SCR_H, SCR_W / 2], [0.05, sy0 + SCR_H, -SCR_W / 2],
        [0.05, sy0, -SCR_W / 2], [0.05, sy0, SCR_W / 2], MAT.screen));

    /* a bright edge along the top of the lid, the way milled aluminium
       catches light — only worth having once the lid is thin */
    if (m > 0.15) {
      f = f.concat(E.quad(
        [0.06, y0 + outH, outW / 2], [0.06, y0 + outH, -outW / 2],
        [-lidD, y0 + outH, -outW / 2], [-lidD, y0 + outH, outW / 2], MAT.chrome));
    }
    /* camera notch */
    if (m > 0.35) {
      f = f.concat(E.box([0.08, sy0 + SCR_H + bez * 0.5, 0], [0.1, Math.min(0.55, bez * 0.6), 2.2], MAT.lidFace));
    }
    lid.faces = f;

    SCREEN_QUAD[0] = [0.06, sy0 + SCR_H, SCR_W / 2];    // top-left, seen from the front
    SCREEN_QUAD[1] = [0.06, sy0 + SCR_H, -SCR_W / 2];   // top-right
    SCREEN_QUAD[2] = [0.06, sy0, SCR_W / 2];            // bottom-left

    /* ── base ── */
    var cham = lerp(0, 0.55, m);         // chamfer along the front lip
    var c = E.box([0, baseH / 2, 0], [23 - cham, baseH, 33], {
      top: MAT.deck, bottom: MAT.lidFace, front: MAT.lidBack, back: MAT.lidBack,
      left: MAT.lidBack, right: MAT.lidBack
    });
    if (cham > 0.02) {
      var xf = (23 - cham) / 2;
      c = c.concat(E.quad(
        [xf, baseH, 16.5], [xf, baseH, -16.5],
        [xf + cham, baseH - cham, -16.5], [xf + cham, baseH - cham, 16.5], MAT.chrome));
    }
    /* speaker grilles either side of the keyboard */
    if (m > 0.3) {
      var g = (m - 0.3) / 0.7;
      for (var i = 0; i < 2; i++) {
        var zz = (i ? 1 : -1) * 15.1;
        c = c.concat(E.quad(
          [-8.6, baseH + 0.02, zz + 0.7 * g], [-8.6, baseH + 0.02, zz - 0.7 * g],
          [5.2, baseH + 0.02, zz - 0.7 * g], [5.2, baseH + 0.02, zz + 0.7 * g], MAT.grille));
      }
    }
    chassis.faces = c;

    /* shell tint */
    for (var k in SHELL) {
      var sp = SHELL[k], mat = MAT[k];
      for (var ci = 0; ci < 3; ci++) {
        mat.n[ci] = sp.a[ci] + (sp.b[ci] - sp.a[ci]) * m;
        mat.d[ci] = sp.ad[ci] + (sp.bd[ci] - sp.ad[ci]) * m;
      }
    }
  }

  /* keyboard: five rows of keys on the deck, each one hoppable */
  var KEYS = [];
  (function buildKeys() {
    var rows = [
      { x: -7.4, n: 13, w: 1.55, d: 1.5 },
      { x: -4.6, n: 13, w: 1.55, d: 1.7 },
      { x: -1.8, n: 12, w: 1.70, d: 1.7 },
      { x: 1.0,  n: 11, w: 1.85, d: 1.7 },
      { x: 4.0,  n: 5,  w: 4.60, d: 1.7 }
    ];
    var faces = [];
    rows.forEach(function (row, ri) {
      var span = 28.4;
      var start = -span / 2;
      var gap = span / row.n;
      for (var j = 0; j < row.n; j++) {
        var z = start + gap * (j + 0.5);
        var w = Math.min(row.w, gap - 0.2);
        if (ri === 4) w = (j === 2) ? 9.5 : 3.0;
        if (ri === 4) z = [-11.5, -6.5, 0, 6.5, 11.5][j];
        var k = { x: row.x, z: z, w: w, d: row.d, ri: ri };
        /* every key carries its own material object so the backlight can
           tint them one at a time without cloning geometry */
        k.mat = { n: MAT.key.n.slice(), d: MAT.key.d.slice(), layer: 2 };
        k.faces = E.box([row.x, 1.78, z], [row.d, 0.78, w], k.mat, { bottom: true });
        KEYS.push(k);
        faces = faces.concat(k.faces);
      }
    });
    laptop.faces = laptop.faces.concat(faces);
  }());

  buildShell(0);

  /* trackpad */
  laptop.faces = laptop.faces.concat(
    E.quad([9.2, 1.56, 4.6], [9.2, 1.56, -4.6], [6.0, 1.56, -4.6], [6.0, 1.56, 4.6], MAT.lidFace));

  /* ── the robot ───────────────────────────────────────────────────── */

  var rig = {};
  var robot = world.add(new E.Node('robot'));
  rig.root = robot;

  /* Proportions are deliberately toy-like — a big head with a wrap-around
     visor band, a small body. The band glows on the front and both sides,
     so the face still reads when the robot is seen in profile. */

  var body = robot.add(new E.Node('body'));  rig.body = body;
  body.setTRS([E.trans(0, 4.4, 0)]);
  body.faces = []
    .concat(E.box([0, 3.2, 0], [5.6, 6.4, 7.6], MAT.shell))
    .concat(E.box([2.5, 3.3, 0], [1.0, 3.6, 4.6], MAT.shellDk))
    .concat(E.box([3.05, 3.3, 0], [0.3, 1.5, 1.5], MAT.core))
    .concat(E.box([0, 6.8, 0], [3.0, 1.4, 3.6], MAT.joint));     // neck

  var head = body.add(new E.Node('head')); rig.head = head;
  head.setTRS([E.trans(0, 7.5, 0)]);
  head.faces = []
    .concat(E.box([0, 3.6, 0], [7.4, 7.4, 8.2], MAT.shell))
    // visor band: proud of the shell, emissive on front and both sides
    .concat(E.box([0.15, 3.9, 0], [7.6, 3.0, 8.4], {
      front: MAT.visor, left: MAT.visor, right: MAT.visor,
      top: MAT.shellDk, bottom: MAT.shellDk, back: MAT.shellDk }))
    // ear pods
    .concat(E.box([-0.8, 3.5, 4.5], [2.8, 2.8, 1.0], MAT.joint))
    .concat(E.box([-0.8, 3.5, -4.5], [2.8, 2.8, 1.0], MAT.joint));

  /* antenna on its own node: it lags behind the head and springs back,
     which does more for the sense of weight than any amount of easing */
  rig.ant = head.add(new E.Node('ant'));
  rig.ant.setTRS([E.trans(-2.2, 7.2, 0)]);
  rig.ant.faces = []
    .concat(E.box([0, 1.2, 0], [0.45, 2.4, 0.45], MAT.joint))
    .concat(E.box([0, 2.7, 0], [1.0, 1.0, 1.0], MAT.core));


  /* the two eyes sit slightly proud of the band so they read brighter */
  rig.eyes = head.add(new E.Node('eyes'));
  rig.eyes.faces = []
    .concat(E.quad([3.95, 3.0, 3.0], [3.95, 3.0, 1.0], [3.95, 4.8, 1.0], [3.95, 4.8, 3.0], MAT.eye))
    .concat(E.quad([3.95, 3.0, -1.0], [3.95, 3.0, -3.0], [3.95, 4.8, -3.0], [3.95, 4.8, -1.0], MAT.eye));

  function makeArm(side) {
    var n = body.add(new E.Node('arm' + side));
    n.setTRS([E.trans(0, 5.6, 4.3 * side)]);
    n.faces = []
      .concat(E.box([0, -2.1, 0], [2.1, 4.4, 2.1], MAT.shellDk))
      .concat(E.box([0, -4.7, 0], [1.9, 1.9, 1.9], MAT.joint));
    return n;
  }
  rig.armF = makeArm(1);
  rig.armB = makeArm(-1);

  function makeLeg(side) {
    var n = robot.add(new E.Node('leg' + side));
    n.setTRS([E.trans(0, 4.4, 2.1 * side)]);
    n.faces = []
      .concat(E.box([0, -1.7, 0], [2.5, 3.6, 2.7], MAT.shellDk))
      .concat(E.box([0.4, -3.8, 0], [4.2, 1.6, 3.1], MAT.joint));
    return n;
  }
  rig.legF = makeLeg(1);
  rig.legB = makeLeg(-1);

  /* the plug the robot carries */
  var plug = world.add(new E.Node('plug'));
  plug.faces = []
    .concat(E.box([0, 0, 0], [3.0, 3.4, 4.6], MAT.plug))
    .concat(E.box([1.9, 0, 1.1], [1.6, 0.7, 0.7], MAT.joint))
    .concat(E.box([1.9, 0, -1.1], [1.6, 0.7, 0.7], MAT.joint));

  /* ── camera ──────────────────────────────────────────────────────── */

  var cam = new E.Camera({ eye: [68, 38, 94], at: [30, 10, -20], fov: 38, shiftX: -0.17, shiftY: 0.04 });
  var renderer = new E.Renderer(canvas);

  /* ── shading ─────────────────────────────────────────────────────── */

  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  var _pool = [];
  var _poolN = 0;

  function grab() {
    var o = _pool[_poolN];
    if (!o) { o = _pool[_poolN] = { pts: [], n: 0, depth: 0, mat: null, cx: 0, cy: 0, fill: '' }; }
    _poolN++;
    return o;
  }

  /* Blend a lit colour toward the fog colour with distance. */
  function fogMix(c, depth, t, mat) {
    if (mat && mat.nofog) return c;
    var f = (depth - t.fogNear) / (t.fogFar - t.fogNear);
    f = f < 0 ? 0 : f > 1 ? 1 : f;
    f *= 0.30;
    return [
      c[0] + (t.fog[0] - c[0]) * f,
      c[1] + (t.fog[1] - c[1]) * f,
      c[2] + (t.fog[2] - c[2]) * f
    ];
  }

  function shade(mat, n, centroid, depth) {
    var t = T();
    var base = col(mat);

    if (mat.emis) {
      var e = fogMix(base, depth, t, mat);
      return 'rgb(' + (e[0] | 0) + ',' + (e[1] | 0) + ',' + (e[2] | 0) + ')';
    }

    // view vector; flip the normal toward the camera so both sides light sanely
    var vx = cam.eye[0] - centroid[0], vy = cam.eye[1] - centroid[1], vz = cam.eye[2] - centroid[2];
    var vl = Math.hypot(vx, vy, vz) || 1;
    vx /= vl; vy /= vl; vz /= vl;
    var facing = n[0] * vx + n[1] * vy + n[2] * vz;
    var nx = n[0], ny = n[1], nz = n[2];
    if (facing < 0) { nx = -nx; ny = -ny; nz = -nz; facing = -facing; }

    var kd = nx * t.key.dir[0] + ny * t.key.dir[1] + nz * t.key.dir[2];
    kd = kd < 0 ? 0 : kd;
    // half-lambert keeps the shadow side readable instead of crushing it
    var kl = (kd * 0.72 + 0.28) * t.key.i * kd;

    var fd = nx * t.fill.dir[0] + ny * t.fill.dir[1] + nz * t.fill.dir[2];
    fd = fd < 0 ? 0 : fd;
    var fl = fd * t.fill.i;

    // rim: bright where the surface turns away from the eye, aimed from behind
    var rd = nx * t.rim.dir[0] + ny * t.rim.dir[1] + nz * t.rim.dir[2];
    rd = rd < 0 ? 0 : rd;
    var rim = mat.flat ? 0 : Math.pow(1 - (facing > 1 ? 1 : facing), t.rim.p) * rd * t.rim.i;

    var lr = t.amb + kl * (t.key.c[0] / 255) + fl * (t.fill.c[0] / 255);
    var lg = t.amb + kl * (t.key.c[1] / 255) + fl * (t.fill.c[1] / 255);
    var lb = t.amb + kl * (t.key.c[2] / 255) + fl * (t.fill.c[2] / 255);

    var c = [
      base[0] * lr + t.rim.c[0] * rim,
      base[1] * lg + t.rim.c[1] * rim,
      base[2] * lb + t.rim.c[2] * rim
    ];
    c = fogMix(c, depth, t, mat);
    return 'rgb(' + clamp255(c[0] | 0) + ',' + clamp255(c[1] | 0) + ',' + clamp255(c[2] | 0) + ')';
  }

  /* ── collect + draw ──────────────────────────────────────────────── */

  var drawList = [];

  /* the screen's lit and unlit colours, kept aside because MAT.screen is
     mutated every frame to fade between them */
  var SCREEN_ON  = { n: MAT.screen.n.slice(), d: MAT.screen.d.slice() };
  var SCREEN_OFF = { n: MAT.screenOff.n.slice(), d: MAT.screenOff.d.slice() };

  function collect(node) {
    if (!node.visible) return;
    var m = node.world, f = node.faces, i, j;
    for (i = 0; i < f.length; i++) {
      var fc = f[i];
      var item = grab();
      var pts = item.pts;
      var ok = true, depth = 0;
      var wx = 0, wy = 0, wz = 0;
      for (j = 0; j < 4; j++) {
        var wp = E.xform(m, fc.v[j]);
        wx += wp[0]; wy += wp[1]; wz += wp[2];
        var vp = cam.toView(wp);
        var sp = renderer.projectView(vp, cam);
        if (!sp) { ok = false; break; }
        pts[j * 2] = sp.x; pts[j * 2 + 1] = sp.y;
        depth += sp.z;
      }
      if (!ok) { _poolN--; continue; }
      item.depth = depth / 4;
      item.mat = fc.mat;
      var centroid = [wx / 4, wy / 4, wz / 4];
      item.cx = (pts[0] + pts[2] + pts[4] + pts[6]) / 4;
      item.cy = (pts[1] + pts[3] + pts[5] + pts[7]) / 4;
      item.layer = fc.mat.layer === undefined ? 2 : fc.mat.layer;
      item.fill = shade(fc.mat, E.applyR(m.r, fc.n), centroid, item.depth);
      drawList.push(item);
    }
    for (i = 0; i < node.children.length; i++) collect(node.children[i]);
  }

  function byDepth(a, b) {
    if (a.layer !== b.layer) return a.layer - b.layer;
    return b.depth - a.depth;
  }

  /* project a world point to screen (or null) */
  function proj(p) {
    return renderer.projectView(cam.toView(p), cam);
  }

  function paintBackground(ctx, w, h) {
    var t = T();
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, t.bgTop);
    g.addColorStop(1, t.bgBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* a wide, very soft highlight washing down the left wall */
  function wallPool(ctx, pwr) {
    var c = proj([0.2, 46, -16]);
    var e = proj([0.2, 46, 34]);
    if (!c || !e) return;
    var r = Math.max(40, Math.abs(e.x - c.x) * 2.4);
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    var tint = theme === 'night' ? '58,104,158' : '255,255,255';
    var a = (theme === 'night' ? 0.22 : 0.55) * (0.30 + 0.70 * pwr);
    g.addColorStop(0, 'rgba(' + tint + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + tint + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.2832); ctx.fill();
  }

  /* light spilling onto the desk around the laptop */
  function deskPool(ctx, pwr) {
    var c = proj([LAPTOP.x + 4, 0.05, LAPTOP.z + 14]);
    var e = proj([LAPTOP.x + 50, 0.05, LAPTOP.z + 14]);
    if (!c || !e) return;
    var r = Math.max(30, Math.abs(e.x - c.x));
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    var tint = theme === 'night' ? '44,104,156' : '255,252,244';
    var a = (theme === 'night' ? 0.54 : 0.5) * (0.18 + 0.82 * pwr);
    g.addColorStop(0, 'rgba(' + tint + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + tint + ',0)');
    ctx.save();
    ctx.translate(c.x, c.y); ctx.scale(1, 0.34); ctx.translate(-c.x, -c.y);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  /* soft contact shadow on the desk under a world point */
  function contactShadow(ctx, at, radius, strength) {
    var c = proj([at[0], 0.06, at[2]]);
    var e = proj([at[0] + radius, 0.06, at[2]]);
    if (!c || !e) return;
    var rx = Math.abs(e.x - c.x) || 6;
    var ry = rx * 0.36;
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rx);
    var base = theme === 'night' ? '0,4,10' : '40,54,76';
    g.addColorStop(0, 'rgba(' + base + ',' + (0.5 * strength).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(' + base + ',' + (0.22 * strength).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + base + ',0)');
    ctx.save();
    ctx.translate(c.x, c.y); ctx.scale(1, ry / rx); ctx.translate(-c.x, -c.y);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, rx, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  /* additive bloom around an emissive point */
  function glowAt(ctx, world3, radiusCm, rgb, alpha) {
    var c = proj(world3);
    var e = proj([world3[0] + radiusCm, world3[1], world3[2]]);
    if (!c || !e) return;
    var r = Math.max(4, Math.abs(e.x - c.x) * 2.2);
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (alpha * 0.85).toFixed(3) + ')');
    g.addColorStop(0.4, 'rgba(' + rgb + ',' + (alpha * 0.22).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  /* Depth haze and vignette, in screen space. Doing it here rather than
     per face keeps large planes free of banding and gives the calm falloff
     the design is after. */
  function atmosphere(ctx, w, h) {
    var t = T();
    var hz = ctx.createLinearGradient(0, h * 0.34, 0, h);
    hz.addColorStop(0, 'rgba(' + t.fog.join(',') + ',' + (theme === 'night' ? 0.30 : 0.26) + ')');
    hz.addColorStop(0.45, 'rgba(' + t.fog.join(',') + ',0.05)');
    hz.addColorStop(1, 'rgba(' + t.fog.join(',') + ',0)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, w, h);

    // the far right of the desk sinks away, leaving room for the headline
    var side = ctx.createLinearGradient(w * 0.34, 0, w, 0);
    side.addColorStop(0, 'rgba(' + t.fog.join(',') + ',0)');
    side.addColorStop(1, 'rgba(' + t.fog.join(',') + ',' + (theme === 'night' ? 0.72 : 0.62) + ')');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);

    var vg = ctx.createRadialGradient(w * 0.38, h * 0.48, Math.min(w, h) * 0.20,
                                      w * 0.38, h * 0.48, Math.max(w, h) * 0.78);
    var vc = theme === 'night' ? '0,0,0' : '60,74,96';
    vg.addColorStop(0, 'rgba(' + vc + ',0)');
    vg.addColorStop(1, 'rgba(' + vc + ',' + (theme === 'night' ? 0.55 : 0.16) + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  /* ── cable ─────────────────────────────────────────────────────────
     A sagging run from the plug to the side of the laptop. Sampled in 3D
     and pushed as individual segments so it sorts against the scene
     instead of being painted flatly on top. */

  var CABLE_N = 26;
  var cablePts = [];

  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
            a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2]];
  }

  function buildCable(st) {
    var from = st.plugWorld || [SOCKET[0] + 3.4, SOCKET[1], SOCKET[2]];
    var to = E.xform(laptop.world, [-3, 0.9, 16.8]);
    var p0 = [from[0] + 1.4, from[1] - 1.8, from[2]];
    var p1 = [from[0] + 6, from[1] * 0.25, from[2] + 10];
    var p2 = [to[0] - 6, 0.8, to[2] + 26];
    var p3 = to;
    cablePts.length = 0;
    for (var i = 0; i <= CABLE_N; i++) cablePts.push(bez(p0, p1, p2, p3, i / CABLE_N));
  }

  function pushCable(st) {
    buildCable(st);
    for (var i = 0; i < CABLE_N; i++) {
      var a = proj(cablePts[i]), b = proj(cablePts[i + 1]);
      if (!a || !b) continue;
      var it = grab();
      it.special = 'cable';
      it.layer = 2;
      it.depth = (a.z + b.z) / 2;
      it.ax = a.x; it.ay = a.y; it.bx = b.x; it.by = b.y;
      it.t0 = i / CABLE_N; it.t1 = (i + 1) / CABLE_N;
      it.w = Math.max(1.4, 190 / it.depth);
      drawList.push(it);
    }
  }

  function drawCableSeg(ctx, it, st) {
    var base = col(MAT.cable);
    ctx.lineCap = 'round';
    ctx.lineWidth = it.w;
    ctx.strokeStyle = 'rgb(' + base[0] + ',' + base[1] + ',' + base[2] + ')';
    ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.bx, it.by); ctx.stroke();

    if (st.cableLit > 0) {
      ctx.strokeStyle = 'rgba(0,178,192,' + (0.35 * st.cableLit).toFixed(3) + ')';
      ctx.lineWidth = it.w * 0.5;
      ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.bx, it.by); ctx.stroke();
    }
    // the bead of energy running up the cable after the plug goes in
    if (st.pulse >= 0) {
      var p = 1 - st.pulse;   // travels from the plug toward the laptop
      var d = Math.abs(((it.t0 + it.t1) / 2) - p);
      if (d < 0.14) {
        var a = (1 - d / 0.14);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(120,240,252,' + (a * 0.9).toFixed(3) + ')';
        ctx.lineWidth = it.w * (1 + a * 1.6);
        ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.bx, it.by); ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ── code on the laptop screen ─────────────────────────────────────
     Drawn inside the screen's own plane: the quad's projected corners give
     an affine basis, so the text sits on the surface in perspective. */

  function pushScreen(st) {
    if (!st.screen) return;
    var a = proj(E.xform(lid.world, SCREEN_QUAD[0]));
    var b = proj(E.xform(lid.world, SCREEN_QUAD[1]));
    var c = proj(E.xform(lid.world, SCREEN_QUAD[2]));
    if (!a || !b || !c) return;
    var it = grab();
    it.special = 'screen';
    it.layer = 2;
    it.depth = (a.z + b.z + c.z) / 3 - 0.6;   // just in front of the panel
    it.a = a; it.b = b; it.c = c;
    drawList.push(it);
  }

  function drawScreenContent(ctx, it, st) {
    var A = window.RDW_ANIM;
    if (!A) return;
    var a = it.a, b = it.b, c = it.c;
    // basis: 10 sub-units per centimetre keeps font sizes in a sane range
    var ux = (b.x - a.x) / (SCR_W * 10), uy = (b.y - a.y) / (SCR_W * 10);
    var vx = (c.x - a.x) / (SCR_H * 10), vy = (c.y - a.y) / (SCR_H * 10);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x + (c.x - a.x), b.y + (c.y - a.y));
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(ux, uy, vx, vy, a.x, a.y);

    var pal = A.CODE_COL[theme];
    var W = SCR_W * 10, H = SCR_H * 10;

    // boot wordmark
    if (st.mark > 0.01) {
      ctx.globalAlpha = st.mark;
      ctx.textAlign = 'center';
      ctx.font = '700 22px Poppins, sans-serif';
      ctx.fillStyle = theme === 'night' ? '#5FE9F5' : '#0E7490';
      ctx.fillText('RHEINLAND', W * 0.5, H * 0.46);
      ctx.font = '700 13px Poppins, sans-serif';
      ctx.fillStyle = '#E4791E';
      ctx.fillText('D I G I T A L W E R K', W * 0.5, H * 0.60);
      ctx.globalAlpha = 1;
    }

    // typed code
    if (st.lines) {
      ctx.textAlign = 'left';
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      var lh = 15, x0 = 16, y0 = 28;
      for (var i = 0; i < A.CODE.length; i++) {
        var p = st.lines[i] || 0;
        if (p <= 0) continue;
        var parts = A.CODE[i], x = x0, y = y0 + i * lh + (i === 7 ? 10 : 0);
        var full = parts.map(function (q) { return q[0]; }).join('');
        var shown = Math.round(full.length * Math.min(1, p));
        var used = 0;
        for (var j = 0; j < parts.length && used < shown; j++) {
          var txt = parts[j][0];
          var take = Math.min(txt.length, shown - used);
          var sub = txt.slice(0, take);
          ctx.fillStyle = pal[parts[j][1]] || pal.op;
          ctx.fillText(sub, x, y);
          x += ctx.measureText(sub).width;
          used += take;
        }
        if (st.caret && p > 0 && p < 1) {
          ctx.fillStyle = theme === 'night' ? '#5FE9F5' : '#0E7490';
          ctx.fillRect(x, y - 10, 7, 13);
        }
      }
    }

    // scanline sweep as the panel wakes
    if (st.sweep > 0 && st.sweep < 1) {
      ctx.fillStyle = theme === 'night'
        ? 'rgba(160,240,252,' + (0.20 * (1 - st.sweep)).toFixed(3) + ')'
        : 'rgba(255,255,255,' + (0.35 * (1 - st.sweep)).toFixed(3) + ')';
      ctx.fillRect(0, H * st.sweep, W, H * 0.09);
    }
    ctx.restore();
  }

  /* ── spark at the socket ───────────────────────────────────────────── */

  function sparkPass(ctx, st) {
    if (!st.spark) return;
    var o = proj([SOCKET[0] + 3, SOCKET[1], SOCKET[2]]);
    var e = proj([SOCKET[0] + 3, SOCKET[1] + 6, SOCKET[2]]);
    if (!o || !e) return;
    var r = Math.abs(e.y - o.y) * (0.5 + 1.5 * (1 - st.spark));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,214,160,' + (st.spark * 0.9).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.lineCap = 'round';
    for (var i = 0; i < 9; i++) {
      var ang = (i / 9) * 6.2832 + 0.3;
      ctx.beginPath();
      ctx.moveTo(o.x + Math.cos(ang) * r * 0.25, o.y + Math.sin(ang) * r * 0.25);
      ctx.lineTo(o.x + Math.cos(ang) * r, o.y + Math.sin(ang) * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── dust ────────────────────────────────────────────────────────────
     Slow motes drifting through the light. Night only: in the day theme
     they read as dirt on the screen rather than atmosphere. Positions are
     kept in normalised screen space so a resize never strands them. */

  var motes = null;

  function initMotes() {
    motes = [];
    for (var i = 0; i < 46; i++) {
      motes.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.6,
        vy: -(0.006 + Math.random() * 0.016),
        vx: (Math.random() - 0.5) * 0.010,
        a: 0.10 + Math.random() * 0.34,
        ph: Math.random() * 6.28
      });
    }
  }

  function dustPass(ctx, w, h, dt, power) {
    if (theme !== 'night' || reduced) return;
    if (!motes) initMotes();
    var step = Math.min(3, dt / 16.67);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y += m.vy * 0.01 * step;
      m.x += (m.vx + Math.sin(m.ph) * 0.004) * 0.01 * step;
      m.ph += 0.004 * step;
      if (m.y < -0.04) { m.y = 1.04; m.x = Math.random(); }
      if (m.x < -0.04) m.x = 1.04;
      if (m.x > 1.04) m.x = -0.04;

      // motes drifting in front of the lit screen catch more light
      var near = 1 - Math.min(1, Math.abs(m.x - 0.30) / 0.34);
      var alpha = m.a * (0.18 + 0.82 * power) * (0.30 + 0.70 * near);
      if (alpha < 0.004) continue;
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(150,222,240,' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── RGB keyboard backlight ──────────────────────────────────────────
     A hue wave runs across the keyboard once the robot starts typing. Keys
     are tinted by mutating their own material, so no geometry is rebuilt
     and the painter's sort is untouched. */

  function hsl(h, sat, lum, out) {
    h = ((h % 360) + 360) / 360;
    var c = (1 - Math.abs(2 * lum - 1)) * sat;
    var x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    var m = lum - c / 2;
    var r = 0, g = 0, b = 0, seg = Math.floor(h * 6) % 6;
    if (seg === 0) { r = c; g = x; }
    else if (seg === 1) { r = x; g = c; }
    else if (seg === 2) { g = c; b = x; }
    else if (seg === 3) { g = x; b = c; }
    else if (seg === 4) { r = x; b = c; }
    else { r = c; b = x; }
    out[0] = (r + m) * 255; out[1] = (g + m) * 255; out[2] = (b + m) * 255;
    return out;
  }

  var _hsl = [0, 0, 0];

  function backlight(state) {
    var amt = state && state.rgb ? state.rgb : 0;
    var now = (state && state.rgbT) || 0;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i], m = k.mat;
      if (amt <= 0.002) {
        m.n[0] = MAT.key.n[0]; m.n[1] = MAT.key.n[1]; m.n[2] = MAT.key.n[2];
        m.d[0] = MAT.key.d[0]; m.d[1] = MAT.key.d[1]; m.d[2] = MAT.key.d[2];
        continue;
      }
      // hue follows the key's place along the board, so the wave travels
      var hue = (now * 0.045) + k.z * 7 + k.ri * 26;
      hsl(hue, 0.85, 0.52, _hsl);
      for (var c = 0; c < 3; c++) {
        m.n[c] = MAT.key.n[c] + (_hsl[c] - MAT.key.n[c]) * amt * 0.92;
        m.d[c] = MAT.key.d[c] + (_hsl[c] - MAT.key.d[c]) * amt * 0.55;
      }
    }
  }

  /* underglow spilling from beneath the laptop onto the desk */
  function rgbGlow(ctx, state) {
    var amt = state && state.rgb ? state.rgb : 0;
    if (amt <= 0.01) return;
    var now = (state && state.rgbT) || 0;
    for (var i = 0; i < 3; i++) {
      var off = i * 11 - 11;
      var p = proj(E.xform(laptop.world, [6, 0.4, off * 1.6]));
      var e = proj(E.xform(laptop.world, [22, 0.4, off * 1.6]));
      if (!p || !e) continue;
      var r = Math.max(14, Math.abs(e.x - p.x) * 1.5);
      hsl(now * 0.045 + off * 11, 0.9, 0.55, _hsl);
      var rgb = (_hsl[0] | 0) + ',' + (_hsl[1] | 0) + ',' + (_hsl[2] | 0);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (0.30 * amt).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y); ctx.scale(1, 0.4); ctx.translate(-p.x, -p.y);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  function renderFrame(state) {
    var ctx = renderer.ctx, w = renderer.w, h = renderer.h;

    world.updateWorld(null);

    paintBackground(ctx, w, h);
    var pwr = state ? (state.cableLit || 0) : 1;
    wallPool(ctx, pwr);
    deskPool(ctx, pwr);

    // shadows go down before the geometry so they sit under everything
    ctx.save();
    contactShadow(ctx, [LAPTOP.x, 0, LAPTOP.z], 26, 1);
    var rp = rig.root.world.t;
    contactShadow(ctx, [rp[0], 0, rp[2]],
      7.5 * ((state && state.shadowWide) || 1), state ? state.shadow : 1);
    ctx.restore();

    drawList.length = 0;
    _poolN = 0;

    // the panel is dark until the laptop boots
    var sp = state && state.screen !== undefined ? state.screen : 1;
    for (var ci = 0; ci < 3; ci++) {
      MAT.screen.n[ci] = SCREEN_ON.n[ci] + (SCREEN_OFF.n[ci] - SCREEN_ON.n[ci]) * (1 - sp);
      MAT.screen.d[ci] = SCREEN_ON.d[ci] + (SCREEN_OFF.d[ci] - SCREEN_ON.d[ci]) * (1 - sp);
    }

    buildShell(state && state.modern !== undefined ? state.modern : 1);
    backlight(state);

    // light the key the robot just landed on
    var lk = state && state.litKey >= 0 ? KEYS[state.litKey] : null;
    if (lk) { for (var q = 0; q < lk.faces.length; q++) lk.faces[q].mat = MAT.keyLit; }

    collect(world);
    if (lk) { for (var q2 = 0; q2 < lk.faces.length; q2++) lk.faces[q2].mat = lk.mat; }

    pushCable(state || {});
    pushScreen(state || {});
    drawList.sort(byDepth);

    for (var i = 0; i < drawList.length; i++) {
      var it = drawList[i];
      if (it.special === 'cable') { drawCableSeg(ctx, it, state || {}); continue; }
      if (it.special === 'screen') { drawScreenContent(ctx, it, state || {}); continue; }
      var p = it.pts;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[2], p[3]);
      ctx.lineTo(p[4], p[5]);
      ctx.lineTo(p[6], p[7]);
      ctx.closePath();
      ctx.fillStyle = it.fill;
      ctx.strokeStyle = it.fill;
      ctx.fill();
      ctx.stroke();
    }

    sparkPass(ctx, state || {});
    rgbGlow(ctx, state || {});
    emissivePass(ctx, state);
    if (state && state.flash) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(190,225,255,' + state.flash.toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    atmosphere(ctx, w, h);
    dustPass(ctx, w, h, (state && state.dt) || 16.67,
             state ? (state.cableLit || 0) : 1);

    if (state && state.fade > 0.001) {
      ctx.fillStyle = (theme === 'night' ? 'rgba(6,11,20,' : 'rgba(247,249,252,') + Math.min(1, state.fade).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* Bloom around the light sources, additive, after the solid pass. */
  function emissivePass(ctx, state) {
    var s = state || {};
    var g = T().glow;
    if (g <= 0) return;

    var hw = rig.head.world;
    var visor = E.xform(hw, [4.4, 3.7, 0]);
    var eye = s.eyeGlow === undefined ? 1 : s.eyeGlow;
    glowAt(ctx, visor, 3.2, '47,227,240', 0.5 * g * eye);

    var core = E.xform(rig.body.world, [3.3, 3.3, 0]);
    glowAt(ctx, core, 1.5, '228,121,30', 0.34 * g * (s.core === undefined ? 1 : s.core));

    var ant = E.xform(hw, [-2.2, 9.6, 0]);
    glowAt(ctx, ant, 1.1, '228,121,30', 0.3 * g * (s.core === undefined ? 1 : s.core));

    if (s.socket) {
      glowAt(ctx, [SOCKET[0] + 2, SOCKET[1], SOCKET[2]], 7, '228,121,30', 0.6 * g * s.socket);
    }
    if (s.screen) {
      var sc = E.xform(lid.world, [0.06, SCR_H / 2 + 1.2, 0]);
      glowAt(ctx, sc, 26, theme === 'night' ? '70,150,210' : '150,200,230', 0.30 * g * s.screen);
    }
  }

  /* ── boot ────────────────────────────────────────────────────────── */

  function sizeCanvas() {
    var r = canvas.getBoundingClientRect();
    renderer.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2));
  }

  rig.root.setTRS([E.trans(150, 0, 6), E.rotY(Math.PI * 0.86)]);
  plug.setTRS([E.trans(150, 6, 12)]);

  sizeCanvas();
  renderFrame({ shadow: 1 });

  window.addEventListener('resize', function () { sizeCanvas(); renderFrame({ shadow: 1 }); }, { passive: true });

  window.RDW_SCENE = {
    rig: rig, cam: cam, world: world, KEYS: KEYS, laptop: laptop, lid: lid,
    plug: plug, socket: socket, SOCKET: SOCKET, LAPTOP: LAPTOP,
    SCREEN_QUAD: SCREEN_QUAD, SCR_W: SCR_W, SCR_H: SCR_H,
    renderer: renderer, renderFrame: renderFrame, proj: proj, glowAt: glowAt,
    setTheme: function (t) { theme = t; }, getTheme: function () { return theme; },
    setShift: function (sx, sy) { cam.shiftX = sx; cam.shiftY = sy; },
    setCam: function (eye, at, fov, sx, sy) {
      cam.eye = eye; cam.at = at; if (fov) cam.fov = fov;
      if (sx !== undefined) cam.shiftX = sx;
      if (sy !== undefined) cam.shiftY = sy;
      cam.build();
    },
    placeRobot: function (x, z, rotY) {
      rig.root.setTRS([E.trans(x, 0, z), E.rotY(rotY)]);
    },
    sizeCanvas: sizeCanvas, MAT: MAT, reduced: reduced
  };
}());
