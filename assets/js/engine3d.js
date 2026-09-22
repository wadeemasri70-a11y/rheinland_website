/* ==========================================================================
   A very small 3D engine: hierarchical transforms, perspective projection,
   painter's-algorithm sorting and per-face lighting, drawn to a 2D canvas.

   Why not a 3D library: the site ships no build step and no dependencies,
   and the scene is a few hundred quads. This is enough to give real
   geometry, real perspective and real lighting, which is what the look
   needs — silhouettes with a bright rim, INSIDE-style.

   Conventions: right-handed, +X right, +Y up, +Z toward the viewer.
   All lengths are centimetres; the robot is about 18 cm tall.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ── vectors ─────────────────────────────────────────────────────── */

  function v3(x, y, z) { return [x, y, z]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function norm(a) {
    var l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }

  /* ── transforms: { r: 3x3 row-major array(9), t: vec3 } ──────────── */

  var IDENT = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };

  function rotX(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { r: [1, 0, 0, 0, c, -s, 0, s, c], t: [0, 0, 0] };
  }
  function rotY(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { r: [c, 0, s, 0, 1, 0, -s, 0, c], t: [0, 0, 0] };
  }
  function rotZ(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { r: [c, -s, 0, s, c, 0, 0, 0, 1], t: [0, 0, 0] };
  }
  function trans(x, y, z) { return { r: IDENT.r.slice(), t: [x, y, z] }; }
  function scaleU(s) { return { r: [s, 0, 0, 0, s, 0, 0, 0, s], t: [0, 0, 0] }; }

  function mulR(a, b) {
    var o = new Array(9);
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
      }
    }
    return o;
  }
  function applyR(r, p) {
    return [
      r[0] * p[0] + r[1] * p[1] + r[2] * p[2],
      r[3] * p[0] + r[4] * p[1] + r[5] * p[2],
      r[6] * p[0] + r[7] * p[1] + r[8] * p[2]
    ];
  }
  /* world = A then B applied outward: compose(parent, local) */
  function compose(a, b) {
    return { r: mulR(a.r, b.r), t: add(applyR(a.r, b.t), a.t) };
  }
  function xform(m, p) { return add(applyR(m.r, p), m.t); }

  /* ── scene graph ─────────────────────────────────────────────────── */

  function Node(name) {
    this.name = name || '';
    this.local = { r: IDENT.r.slice(), t: [0, 0, 0] };
    this.world = { r: IDENT.r.slice(), t: [0, 0, 0] };
    this.children = [];
    this.faces = [];
    this.visible = true;
  }

  Node.prototype.add = function (child) { this.children.push(child); return child; };

  /* Rebuild `local` from a list of transforms applied left to right. */
  Node.prototype.setTRS = function (list) {
    var m = { r: IDENT.r.slice(), t: [0, 0, 0] };
    for (var i = 0; i < list.length; i++) m = compose(m, list[i]);
    this.local = m;
    return this;
  };

  Node.prototype.updateWorld = function (parentWorld) {
    this.world = parentWorld ? compose(parentWorld, this.local) : this.local;
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].updateWorld(this.world);
    }
  };

  /* ── geometry ────────────────────────────────────────────────────── */

  /* A face is { v: [p0..p3], mat, n } in the owning node's local space. */
  function face(v, mat) { return { v: v, mat: mat, n: faceNormal(v) }; }

  function faceNormal(v) {
    return norm(cross(sub(v[1], v[0]), sub(v[3], v[0])));
  }

  /* Axis-aligned box centred at c with size s. `skip` hides named faces. */
  function box(c, s, mat, skip) {
    var x = s[0] / 2, y = s[1] / 2, z = s[2] / 2;
    var cx = c[0], cy = c[1], cz = c[2];
    var P = function (a, b, d) { return [cx + a * x, cy + b * y, cz + d * z]; };
    var out = [];
    var sk = skip || {};
    // winding chosen so the normal points outward
    if (!sk.front)  out.push(face([P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], mat.front || mat));
    if (!sk.back)   out.push(face([P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], mat.back || mat));
    if (!sk.right)  out.push(face([P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], mat.right || mat));
    if (!sk.left)   out.push(face([P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], mat.left || mat));
    if (!sk.top)    out.push(face([P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)], mat.top || mat));
    if (!sk.bottom) out.push(face([P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)], mat.bottom || mat));
    return out;
  }

  /* A single quad, given as four points. */
  function quad(a, b, c, d, mat) { return [face([a, b, c, d], mat)]; }

  /* A quad subdivided into an nu x nv grid.

     Large surfaces must be split: this renderer sorts faces by the depth of
     their centroid, so one big quad whose centre happens to sit nearer the
     camera than a small object will paint straight over it. Subdividing
     keeps each piece local enough for the ordering to hold. */
  function grid(o, uVec, vVec, nu, nv, mat) {
    var out = [];
    for (var i = 0; i < nu; i++) {
      for (var j = 0; j < nv; j++) {
        var u0 = i / nu, u1 = (i + 1) / nu;
        var v0 = j / nv, v1 = (j + 1) / nv;
        var p = function (u, v) {
          return [o[0] + uVec[0] * u + vVec[0] * v,
                  o[1] + uVec[1] * u + vVec[1] * v,
                  o[2] + uVec[2] * u + vVec[2] * v];
        };
        out.push(face([p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], mat));
      }
    }
    return out;
  }

  /* ── camera ──────────────────────────────────────────────────────── */

  function Camera(opts) {
    this.eye = opts.eye;
    this.at = opts.at;
    this.up = opts.up || [0, 1, 0];
    this.fov = opts.fov || 34;
    this.shiftX = opts.shiftX || 0;   // screen widths, negative moves left
    this.shiftY = opts.shiftY || 0;
    this.build();
  }

  Camera.prototype.build = function () {
    var f = norm(sub(this.at, this.eye));     // forward
    var r = norm(cross(f, this.up));          // right
    var u = cross(r, f);                      // true up
    // view rotation maps world -> camera (camera looks down -Z)
    this.vr = [r[0], r[1], r[2], u[0], u[1], u[2], -f[0], -f[1], -f[2]];
    this.fwd = f;
  };

  Camera.prototype.toView = function (p) {
    return applyR(this.vr, sub(p, this.eye));
  };

  /* ── renderer ────────────────────────────────────────────────────── */

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1; this.h = 1; this.dpr = 1;
    this.buf = [];
  }

  Renderer.prototype.resize = function (w, h, dpr) {
    this.w = Math.max(1, Math.round(w));
    this.h = Math.max(1, Math.round(h));
    this.dpr = dpr || 1;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  /* Project a camera-space point to screen. Returns null when behind. */
  Renderer.prototype.projectView = function (vp, cam) {
    var z = -vp[2];
    if (z < 0.05) return null;
    var fl = (this.h * 0.5) / Math.tan(cam.fov * Math.PI / 360);
    return {
      x: this.w * (0.5 + cam.shiftX) + vp[0] * fl / z,
      y: this.h * (0.5 + cam.shiftY) - vp[1] * fl / z,
      z: z
    };
  };

  root.E3D = {
    v3: v3, add: add, sub: sub, scale: scale, dot: dot, cross: cross, norm: norm,
    rotX: rotX, rotY: rotY, rotZ: rotZ, trans: trans, scaleU: scaleU, compose: compose, xform: xform,
    applyR: applyR, IDENT: IDENT,
    Node: Node, box: box, quad: quad, grid: grid, face: face, faceNormal: faceNormal,
    Camera: Camera, Renderer: Renderer
  };
}(window));
