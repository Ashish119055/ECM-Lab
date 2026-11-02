/* Suspension Lab — planar kinematic solvers (front view: x lateral, y vertical; side view for beam axles).
   All lengths in metres, angles in radians. Wheel travel s > 0 = bump (wheel rises relative to body). */
'use strict';

const KM = {
  rot(p, c, a) { const dx = p[0] - c[0], dy = p[1] - c[1], C = Math.cos(a), S = Math.sin(a); return [c[0] + dx * C - dy * S, c[1] + dx * S + dy * C]; },
  sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; },
  add(a, b) { return [a[0] + b[0], a[1] + b[1]]; },
  len(a) { return Math.hypot(a[0], a[1]); },
  ang(a) { return Math.atan2(a[1], a[0]); },
  dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); },
  /* Intersection of two circles, the solution nearest `near` */
  circles(c1, r1, c2, r2, near) {
    const d = KM.dist(c1, c2); const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const ex = [(c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d];
    const m = [c1[0] + a * ex[0], c1[1] + a * ex[1]];
    const p1 = [m[0] - h * ex[1], m[1] + h * ex[0]]; const p2 = [m[0] + h * ex[1], m[1] - h * ex[0]];
    return KM.dist(p1, near) < KM.dist(p2, near) ? p1 : p2;
  },
  /* Intersection of line (p1,p2) with line (p3,p4); null if parallel */
  lines(p1, p2, p3, p4) {
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  },
  bisect(f, target, lo, hi, n = 48) {
    let flo = f(lo) - target;
    for (let i = 0; i < n; i++) {
      const mid = (lo + hi) / 2; const fm = f(mid) - target;
      if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
    }
    return (lo + hi) / 2;
  },

  /* Contact patch, instant centre, roll centre for a corner pose */
  finish(pose, hp) {
    const Rt = hp.Rt;
    pose.CP = [pose.W[0] + Rt * Math.sin(pose.phi), pose.W[1] - Rt * Math.cos(pose.phi)];
    pose.camber = hp.camber0 - pose.phi * 180 / Math.PI;
    if (pose.IC) {
      const cp = pose.CP, ic = pose.IC;
      if (Math.abs(ic[0] - cp[0]) > 1e-6) {
        const y = cp[1] + (ic[1] - cp[1]) * (0 - cp[0]) / (ic[0] - cp[0]);
        pose.RC = [0, y]; pose.rcH = y - cp[1];
      }
    }
    pose.halfTrack = pose.CP[0];
    return pose;
  },

  /* Short-long arm (double wishbone, and multi-link treated as a virtual SLA) */
  slaPose(hp, th) {
    const BL = KM.rot(hp.BL, hp.AL, th);
    const lU = KM.dist(hp.AU, hp.BU), h = KM.dist(hp.BL, hp.BU);
    const BU = KM.circles(hp.AU, lU, BL, h, hp.BU);
    const phi = KM.ang(KM.sub(BU, BL)) - KM.ang(KM.sub(hp.BU, hp.BL));
    const W = KM.add(BL, KM.rot(KM.sub(hp.W, hp.BL), [0, 0], phi));
    const thU = KM.ang(KM.sub(BU, hp.AU)) - KM.ang(KM.sub(hp.BU, hp.AU));
    const IC = KM.lines(hp.AL, BL, hp.AU, BU);
    return { th, thU, phi, BL, BU, W, IC };
  },
  sla(hp, s) {
    const th = KM.bisect((t) => KM.slaPose(hp, t).W[1], hp.W[1] + s, -0.7, 0.7);
    return KM.finish(KM.slaPose(hp, th), hp);
  },

  /* MacPherson strut: lower arm + slider (strut axis through fixed top mount T) */
  strutPose(hp, th) {
    const BL = KM.rot(hp.BL, hp.AL, th);
    const phi = KM.ang(KM.sub(hp.T, BL)) - KM.ang(KM.sub(hp.T, hp.BL));
    const W = KM.add(BL, KM.rot(KM.sub(hp.W, hp.BL), [0, 0], phi));
    const u = KM.sub(hp.T, BL); const perp = [-u[1], u[0]];
    const IC = KM.lines(hp.AL, BL, hp.T, KM.add(hp.T, perp));
    return { th, phi, BL, W, IC, T: hp.T };
  },
  strut(hp, s) {
    const th = KM.bisect((t) => KM.strutPose(hp, t).W[1], hp.W[1] + s, -0.7, 0.7);
    return KM.finish(KM.strutPose(hp, th), hp);
  },

  /* Twist beam in side view (z, y): arm rotates about pivot P */
  twist(hp, s) {
    const f = (a) => KM.rot(hp.Wside, hp.Pside, a)[1];
    const a = KM.bisect(f, hp.Wside[1] + s, -0.6, 0.6);
    const Wn = KM.rot(hp.Wside, hp.Pside, a);
    return { alpha: a, phi: 0, camber: hp.camber0, W: [hp.W[0], hp.W[1] + s], Wside: Wn, dz: Wn[0] - hp.Wside[0], CP: [hp.W[0], hp.W[1] + s - hp.Rt], halfTrack: hp.W[0], rcH: hp.rcH, RC: [0, hp.W[1] + s - hp.Rt + hp.rcH] };
  },
  /* Hotchkiss leaf-spring axle: axle translates; spring arch reduces */
  live(hp, s) {
    return { phi: 0, camber: hp.camber0, W: [hp.W[0], hp.W[1] + s], arch: hp.arch0 - s, CP: [hp.W[0], hp.W[1] + s - hp.Rt], halfTrack: hp.W[0], rcH: hp.rcH, RC: [0, hp.W[1] + s - hp.Rt + hp.rcH], dz: 0 };
  }
};
