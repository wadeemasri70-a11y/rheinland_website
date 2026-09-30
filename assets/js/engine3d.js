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

  /* A box with rounded edges and corners, centred at c with size s.

     Built as a subdivided cube whose vertices are pulled onto the rounded
     surface: each point is clamped into the inner box (the box shrunk by
     the radius on every side), and the offset left over is resized to the
     radius. Points in the middle of a face are unchanged; points in the
     band along an edge land on a quarter-circle, spaced by tan() so the
     facets are even in angle. Winding and per-side material keys match
     box(). */
  function rbox(c, s, r, seg, mat, skip) {
    var h = [s[0] / 2, s[1] / 2, s[2] / 2];
    r = Math.max(0.001, Math.min(r, h[0], h[1], h[2]));
    seg = Math.max(1, seg | 0);
    var sk = skip || {};

    function samples(hh) {
      var inner = hh - r, out = [-hh], k;
      for (k = seg - 1; k >= 1; k--) out.push(-inner - r * Math.tan(k / seg * Math.PI / 4));
      out.push(-inner);
      if (inner > 1e-6) out.push(inner);
      for (k = 1; k < seg; k++) out.push(inner + r * Math.tan(k / seg * Math.PI / 4));
      out.push(hh);
      return out;
    }
    var S = [samples(h[0]), samples(h[1]), samples(h[2])];

    function round(p) {
      var q = [0, 0, 0], d = [0, 0, 0], len = 0, i;
      for (i = 0; i < 3; i++) {
        var lim = h[i] - r;
        q[i] = p[i] > lim ? lim : p[i] < -lim ? -lim : p[i];
        d[i] = p[i] - q[i];
        len += d[i] * d[i];
      }
      len = Math.sqrt(len) || 1;
      return [c[0] + q[0] + d[0] / len * r, c[1] + q[1] + d[1] / len * r, c[2] + q[2] + d[2] / len * r];
    }

    /* one side: axis `n` fixed at sign*h, `u` and `v` swept so that
       cross(u, v) points outward */
    function side(n, sign, u, du, v, dv, m) {
      var out = [], su = S[u].slice(), sv = S[v].slice();
      if (du < 0) su.reverse();
      if (dv < 0) sv.reverse();
      for (var i = 0; i < su.length - 1; i++) {
        for (var j = 0; j < sv.length - 1; j++) {
          var P = function (a, b) {
            var p = [0, 0, 0];
            p[n] = sign * h[n]; p[u] = a; p[v] = b;
            return round(p);
          };
          out.push(face([P(su[i], sv[j]), P(su[i + 1], sv[j]), P(su[i + 1], sv[j + 1]), P(su[i], sv[j + 1])], m));
        }
      }
      return out;
    }

    var out = [];
    if (!sk.front)  out = out.concat(side(2,  1, 0,  1, 1,  1, mat.front || mat));
    if (!sk.back)   out = out.concat(side(2, -1, 0, -1, 1,  1, mat.back || mat));
    if (!sk.right)  out = out.concat(side(0,  1, 2, -1, 1,  1, mat.right || mat));
    if (!sk.left)   out = out.concat(side(0, -1, 2,  1, 1,  1, mat.left || mat));
    if (!sk.top)    out = out.concat(side(1,  1, 0,  1, 2, -1, mat.top || mat));
    if (!sk.bottom) out = out.concat(side(1, -1, 0,  1, 2,  1, mat.bottom || mat));
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
    Node: Node, box: box, rbox: rbox, quad: quad, grid: grid, face: face, faceNormal: faceNormal,
    Camera: Camera, Renderer: Renderer
  };
}(window));
