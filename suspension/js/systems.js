/* Suspension Lab — the six suspension systems: hard points, 3D assembly, kinematics and tear-down procedure. */
'use strict';

const CUT_INFOS = new Set(['tyre', 'rim', 'hub', 'disc', 'drum', 'damper', 'cdc', 'spring', 'airspring', 'bushing', 'lbj', 'topmount', 'bumpstop', 'axlehousing', 'diff', 'driveshaft', 'pivotbush']);

/* ── assembly helper ─────────────────────────────────────── */
class Asm {
  constructor() { this.parts = []; this.springSpans = []; }
  part(id, info, opt = {}) {
    const p = { id, info, name: opt.name || PARTS[info].name, explode: opt.explode ? V3(...opt.explode) : null, cut: opt.cut ?? CUT_INFOS.has(info), pieces: [] };
    this.parts.push(p); return p;
  }
  ex(p, sx = 1) { return p.explode ? V3(p.explode.x * sx, p.explode.y, p.explode.z) : V3(0, 0, 0); }
  rigid(p, body, obj, sx = 1) { p.pieces.push({ kind: 'rigid', body, obj, sx, ex: this.ex(p, sx) }); return obj; }
  span(p, a, b, obj, sx = 1) { p.pieces.push({ kind: 'span', a, b, obj, ex: this.ex(p, sx) }); return obj; }
  dyn(p, obj, update, sx = 1) { p.pieces.push({ kind: 'dyn', obj, update, ex: this.ex(p, sx) }); return obj; }
}
const A3 = (a) => V3(a[0], a[1], a[2] ?? 0);

/* Rotation about an axis parallel to Z through point c (x, y) */
function rotZAbout(c, a) {
  return new THREE.Matrix4().makeTranslation(c[0], c[1], 0).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(-c[0], -c[1], 0));
}
function knuckleMatrix(pose, BL0) {
  return new THREE.Matrix4().makeTranslation(pose.BL[0] - BL0[0], pose.BL[1] - BL0[1], 0).multiply(rotZAbout(BL0, pose.phi));
}

/* ── span-object builders (built along +Y, length-adjustable) ── */
function springSpan({ L, ao, bo, R, wire, turns, mat }) {
  const g = new THREE.Group();
  const c = coilSpring({ R, wire, turns, len: L - ao - bo, mat }); c.position.y = ao; g.add(c);
  g.userData.setLength = (l) => c.userData.setLength(l - ao - bo);
  return g;
}
function topAttached(obj, off) { // object that stays at distance `off` below the top anchor
  const g = new THREE.Group(); g.add(obj);
  g.userData.setLength = (l) => { obj.position.y = l - off; };
  return g;
}
function bumpStopObj() {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 12; i++) { const y = -0.07 + i * (0.07 / 12); pts.push([0.019 + 0.006 * Math.abs(Math.sin(i * Math.PI / 3)) + (i < 3 ? -0.004 * (3 - i) : 0), y]); }
  pts.unshift([0.011, -0.07]); pts.push([0.011, 0]);
  g.add(lathe(pts, MAT.pu, 40));
  const boot = []; for (let i = 0; i <= 20; i++) { boot.push([0.03 + 0.004 * (i % 2), -0.075 - i * 0.0075]); }
  boot.unshift([0.012, -0.072]);
  g.add(lathe(boot, MAT.boot, 40));
  return g;
}
function tieRodObj(L) {
  const g = new THREE.Group();
  const shaft = cyl(0.009, 1, MAT.zinc, { seg: 14 }); g.add(shaft);
  const inner = sph(0.016, MAT.steel); g.add(inner);
  const outer = new THREE.Group();
  outer.add(cyl(0.017, 0.06, MAT.ecoat)); outer.add(at(sph(0.022, MAT.ecoat), 0, 0.03, 0));
  outer.add(at(cyl(0.008, 0.06, MAT.zinc), 0, 0.055, 0)); outer.add(at(cyl(0.012, 0.012, MAT.zinc, { seg: 6 }), 0, 0.085, 0));
  outer.add(at(lathe([[0.022, 0.035], [0.026, 0.045], [0.014, 0.06]], MAT.rubber, 24), 0, 0, 0));
  const lock = cyl(0.014, 0.012, MAT.zinc, { seg: 6 }); g.add(lock); g.add(outer);
  const boot = []; for (let i = 0; i <= 14; i++) boot.push([0.016 + 0.007 * (i % 2), 0.02 + i * 0.008]); boot.unshift([0.008, 0.012]);
  g.add(lathe(boot, MAT.boot, 28));
  g.userData.setLength = (l) => { shaft.scale.y = l - 0.06; shaft.position.y = (l - 0.06) / 2; outer.position.y = l - 0.03; lock.position.y = l - 0.08; };
  g.userData.setLength(L);
  return g;
}
function dropLinkObj(L) {
  const g = new THREE.Group();
  const body = cyl(0.008, 1, MAT.ecoat, { seg: 12 }); g.add(body);
  const e1 = grp(sph(0.016, MAT.plastic), at(cyl(0.007, 0.03, MAT.zinc), 0, -0.02, 0)); g.add(e1);
  const e2 = grp(sph(0.016, MAT.plastic), at(cyl(0.007, 0.03, MAT.zinc), 0, 0.02, 0)); g.add(e2);
  g.userData.setLength = (l) => { body.scale.y = l; body.position.y = l / 2; e2.position.y = l; };
  g.userData.setLength(L);
  return g;
}
function driveShaftObj(L) {
  const g = new THREE.Group();
  const tri = lathe([[0.02, 0], [0.045, 0.01], [0.047, 0.08], [0.035, 0.1], [0.02, 0.1]], MAT.steel, 40); g.add(tri);
  const b1 = []; for (let i = 0; i <= 10; i++) b1.push([0.02 + 0.016 * (1 - i / 10) + 0.006 * (i % 2), 0.1 + i * 0.009]); g.add(lathe(b1, MAT.boot, 32));
  const shaft = cyl(0.0125, 1, MAT.darkSteel, { seg: 16 }); g.add(shaft);
  const outer = new THREE.Group();
  const b2 = []; for (let i = 0; i <= 10; i++) b2.push([0.014 + 0.024 * (i / 10) + 0.006 * (i % 2), -0.17 + i * 0.01]); outer.add(lathe(b2, MAT.boot, 32));
  outer.add(lathe([[0.03, -0.07], [0.048, -0.055], [0.05, -0.03], [0.042, -0.005], [0.024, 0.0], [0.016, 0.04], [0.001, 0.04]], MAT.steel, 40));
  g.add(outer);
  g.userData.setLength = (l) => { shaft.scale.y = l - 0.3; shaft.position.y = 0.1 + (l - 0.3) / 2 + 0.02; outer.position.y = l - 0.02; };
  g.userData.setLength(L);
  return g;
}
function heightLinkObj(L) {
  const g = new THREE.Group();
  const r = cyl(0.004, 1, MAT.plastic, { seg: 8 }); g.add(r);
  g.add(sph(0.008, MAT.plastic)); const e = sph(0.008, MAT.plastic); g.add(e);
  g.userData.setLength = (l) => { r.scale.y = l; r.position.y = l / 2; e.position.y = l; };
  g.userData.setLength(L);
  return g;
}
function topMountObj(p, dir, r = 0.075) {
  const g = new THREE.Group();
  g.add(lathe([[0.012, -0.02], [r * 0.62, -0.02], [r, -0.004], [r, 0.006], [r * 0.6, 0.012], [r * 0.5, 0.03], [0.02, 0.034], [0.012, 0.034]], MAT.ecoat, 48));
  g.add(lathe([[0.016, -0.03], [r * 0.55, -0.03], [r * 0.6, -0.02], [0.02, -0.02]], MAT.rubber, 40));
  g.add(at(lathe([[r * 0.7, -0.05], [r * 1.12, -0.04], [r * 1.12, -0.03], [r * 0.7, -0.035]], MAT.ecoat, 48), 0, 0, 0));
  g.add(at(torus(r * 0.72, 0.006, MAT.ball), 0, -0.024, 0)); g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; const st = cyl(0.005, 0.05, MAT.zinc, { seg: 8 }); st.position.set(Math.cos(a) * r * 0.85, 0.02, Math.sin(a) * r * 0.85); g.add(st); }
  return placeAxis(g, p, dir);
}
function towerGlass(T, sx = 1) {
  const g = new THREE.Group();
  const cap = cyl(0.13, 0.012, MAT.glass); cap.position.set(T[0], T[1] + 0.01, T[2] ?? 0); g.add(cap);
  const wall = cyl(0.13, 0.32, MAT.glass, { open: true }); wall.position.set(T[0], T[1] - 0.15, T[2] ?? 0); g.add(wall);
  const wing = box(0.01, 0.55, 1.1, MAT.glass); wing.position.set(T[0] - sx * 0.2, T[1] - 0.22, 0); g.add(wing);
  const leg = box(0.12, 0.12, 1.3, MAT.glass); leg.position.set(T[0] - sx * 0.28, T[1] - 0.42, 0); g.add(leg);
  return g;
}
function rackObj() {
  const g = new THREE.Group();
  g.add(rod(V3(-0.45, 0, 0), V3(0.2, 0, 0), 0.028, MAT.castAlu, 24));
  const boot = []; for (let i = 0; i <= 12; i++) boot.push([0.02 + 0.009 * (i % 2), i * 0.007]);
  const b = lathe(boot, MAT.boot, 28); b.rotation.z = -Math.PI / 2; b.position.x = 0.2; g.add(b);
  const pin = cyl(0.035, 0.09, MAT.castAlu); pin.position.set(-0.32, 0.05, 0.0); pin.rotation.x = -0.35; g.add(pin);
  const col = rod(V3(-0.32, 0.09, -0.02), V3(-0.3, 0.32, 0.25), 0.012, MAT.steel); g.add(col);
  const mot = cyl(0.05, 0.14, MAT.darkSteel); mot.rotation.z = Math.PI / 2; mot.position.set(-0.08, -0.03, -0.02); g.add(mot);
  for (const x of [-0.25, 0.1]) { const br = box(0.04, 0.06, 0.07, MAT.ecoat); br.position.set(x, 0, 0.0); g.add(br); }
  return g;
}
function arbObj(pts, r = 0.012, clamps = []) {
  const g = new THREE.Group();
  g.add(pathTube(pts.map(A3), r, MAT.ecoat, 120));
  clamps.forEach((c) => { const cl = grp(at(box(0.05, 0.045, 0.06, MAT.rubber), 0, 0, 0), at(box(0.055, 0.012, 0.075, MAT.steel), 0, 0.028, 0)); cl.position.copy(A3(c)); g.add(cl); });
  return g;
}
function subframeObj(segs, brackets = []) {
  const g = new THREE.Group();
  segs.forEach(([a, b, w = 0.07, h = 0.06]) => {
    const A = A3(a), B = A3(b); const d = B.clone().sub(A); const L = d.length();
    const m = box(w, L, h, MAT.ecoat); m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(m);
  });
  brackets.forEach((p) => { const P = A3(p); g.add(at(box(0.05, 0.07, 0.06, MAT.ecoat), P.x, P.y, P.z)); });
  return g;
}
function knuckleObj(W, sx, ends, mat = MAT.iron) {
  const g = new THREE.Group(); const kc = V3(W[0] - sx * 0.058, W[1], 0);
  const boss = cyl(0.066, 0.045, mat); boss.rotation.z = Math.PI / 2; boss.position.copy(kc); g.add(boss);
  const ring = cyl(0.05, 0.02, mat); ring.rotation.z = Math.PI / 2; ring.position.copy(kc).add(V3(-sx * 0.03, 0, 0)); g.add(ring);
  ends.forEach((e) => { const E = A3(e); g.add(rod(kc, E, 0.024, mat, 16, 0.016)); g.add(sph(0.021, mat, E)); });
  // caliper ears (rear upper)
  const ear = rod(kc.clone().add(V3(0, 0.03, -0.03)), kc.clone().add(V3(sx * 0.02, 0.1, -0.1)), 0.014, mat); g.add(ear);
  const ear2 = rod(kc.clone().add(V3(0, -0.02, -0.04)), kc.clone().add(V3(sx * 0.02, -0.02, -0.13)), 0.014, mat); g.add(ear2);
  return g;
}

/* ── wheel end (both sides of an axle, or one corner) ─────── */
function wheelEnd(A, sides, o = {}) {
  const R = o.R ?? 0.32, w = o.w ?? 0.22, rr = o.rr ?? 0.215, discR = o.discR ?? 0.15;
  const nuts = A.part('wheelnuts', 'wheelnuts', { explode: [0.8, 0.05, 0] });
  const tyre = A.part('tyre', 'tyre', { explode: [0.64, 0, 0] });
  const rim = A.part('rim', 'rim', { explode: [0.47, 0, 0] });
  const brake = o.drum ? A.part('drum', 'drum', { explode: [0.36, 0, 0] }) : A.part('disc', 'disc', { explode: [0.34, 0, 0] });
  const cal = o.drum ? null : A.part('caliper', 'caliper', { explode: [0.16, 0.2, -0.32] });
  const hub = A.part('hub', 'hub', { explode: o.hubEx ?? [0.2, 0, 0] });
  sides.forEach(({ W, sx, body }) => {
    const Wv = A3(W);
    A.rigid(tyre, body, orientWheel(tyreMesh(R, w, rr), Wv, sx), sx);
    A.rigid(rim, body, orientWheel(rimMesh(rr, w - 0.02), Wv, sx), sx);
    A.rigid(nuts, body, orientWheel(nutsMesh(5, 0.056, 0.068), Wv, sx), sx);
    A.rigid(hub, body, orientWheel(hubMesh(), Wv.clone().add(V3(sx * 0.02, 0, 0)), sx), sx);
    const dpos = Wv.clone().add(V3(sx * (0.04 - 0.058), 0, 0));
    if (o.drum) A.rigid(brake, body, orientWheel(drumMesh(discR, 0.08), Wv.clone().add(V3(-sx * 0.0, 0, 0)), sx), sx);
    else {
      A.rigid(brake, body, orientWheel(discMesh(discR), dpos, sx), sx);
      const ang = o.calAng ?? -2.3;
      A.rigid(cal, body, orientWheel(caliperMesh(discR, sx > 0 ? ang : Math.PI - ang), dpos, sx), sx);
    }
  });
  return { nuts, tyre, rim, brake, cal, hub };
}

/* ═════════════════════════════════════════════════════════
   1. MacPherson strut — front, FWD
   ═════════════════════════════════════════════════════════ */
const HP_MAC = { AL: [0.31, 0.16], BL: [0.72, 0.13], T: [0.57, 0.98], S: [0.63, 0.30], W: [0.76, 0.32], Rt: 0.32, camber0: -0.6 };

function buildMacPherson() {
  const A = new Asm(); const hp = HP_MAC; const W = [...hp.W, 0];
  const T = A3(hp.T), S = A3(hp.S); const axis = T.clone().sub(S).normalize();
  wheelEnd(A, [{ W, sx: 1, body: 'knuckle' }], { calAng: -2.3 });

  const kn = A.part('knuckle', 'knuckle', { explode: [0.1, -0.12, 0.42] });
  const kobj = knuckleObj(W, 1, [[0.72, 0.165, 0], [0.632, 0.33, 0], [0.628, 0.40, 0], [0.665, 0.30, -0.15]]);
  const clamp = cyl(0.034, 0.12, MAT.iron, { open: false }); placeAxis(clamp, S.clone().addScaledVector(axis, 0.07), axis); kobj.add(clamp);
  for (const d of [0.04, 0.1]) kobj.add(bolt(S.clone().addScaledVector(axis, d).add(V3(0, 0, 0.045)), V3(0, 0, -1), 0.09, 0.006));
  A.rigid(kn, 'knuckle', kobj);

  const lca = A.part('lca', 'lca', { explode: [-0.05, -0.3, 0.12] });
  A.rigid(lca, 'lca', wishbone([V3(0.31, 0.16, 0.04), V3(0.31, 0.16, -0.25)], V3(0.72, 0.13, 0)));
  const bj = A.part('lbj', 'lbj', { explode: [0.16, -0.22, 0], name: 'Lower ball joint' });
  A.rigid(bj, 'lca', ballJointMesh(V3(0.72, 0.13, 0), UP, 0.045));
  const bush = A.part('bushing', 'bushing', { explode: [-0.2, -0.3, 0], name: 'Lower-arm bushings (front radial / rear hydro)' });
  A.rigid(bush, 'lca', bushingMesh(V3(0.31, 0.16, 0.04), V3(0, 0, 1), 0.03, 0.05));
  A.rigid(bush, 'lca', bushingMesh(V3(0.31, 0.16, -0.25), V3(0, 1, 0), 0.036, 0.055));

  const L0 = T.distanceTo(S);
  const dmp = A.part('damper', 'damper', { explode: [0, -0.02, 0.62], name: 'Strut damper (twin-tube)' });
  A.span(dmp, ['knuckle', S], ['chassis', T], damperUnit({ len: L0, body: 0.42, rOut: 0.026, seatAt: 0.38, seatR: 0.085, bottom: 'none' }));
  const spr = A.part('spring', 'spring', { explode: [0, 0.06, 0.95], name: 'Coil spring (side-load)' });
  A.span(spr, ['knuckle', S], ['chassis', T], springSpan({ L: L0, ao: 0.395, bo: 0.055, R: 0.074, wire: 0.0125, turns: 5.2, mat: MAT.spring }));
  A.springSpans.push([['knuckle', S], ['chassis', T]]);
  const bs = A.part('bumpstop', 'bumpstop', { explode: [0, 0.16, 0.62] });
  A.span(bs, ['knuckle', S], ['chassis', T], topAttached(bumpStopObj(), 0.03));
  const tm = A.part('topmount', 'topmount', { explode: [0, 0.3, 0.62] });
  A.rigid(tm, 'chassis', topMountObj(T, axis));

  const ds = A.part('driveshaft', 'driveshaft', { explode: [-0.12, -0.2, 0.22], name: 'Drive shaft (tripod + Rzeppa CV)' });
  A.span(ds, ['chassis', V3(0.06, 0.31, 0)], ['knuckle', V3(0.735, 0.32, 0)], driveShaftObj(0.67));
  const tr = A.part('tierod', 'tierod', { explode: [0.0, -0.08, -0.3] });
  A.span(tr, ['chassis', V3(0.255, 0.27, -0.15)], ['knuckle', V3(0.665, 0.30, -0.15)], tieRodObj(0.41));
  const rk = A.part('rack', 'rack');
  A.rigid(rk, 'chassis', at(rackObj(), 0.0, 0.27, -0.15));

  const arb = A.part('arb', 'arb', { explode: [0, -0.06, 0.5] });
  A.rigid(arb, 'chassis', arbObj([[-0.45, 0.2, 0.2], [0.15, 0.2, 0.2], [0.42, 0.22, 0.18], [0.56, 0.245, 0.08], [0.595, 0.25, 0.045]], 0.012, [[-0.2, 0.2, 0.2], [0.12, 0.2, 0.2]]));
  const dl = A.part('droplink', 'droplink', { explode: [0.05, 0, 0.3] });
  A.span(dl, ['chassis', V3(0.595, 0.25, 0.045)], ['knuckle', V3(0.617, 0.47, 0.045)], dropLinkObj(0.22));

  const sf = A.part('subframe', 'subframe');
  A.rigid(sf, 'chassis', subframeObj([[[0.25, 0.15, 0.35], [0.25, 0.15, -0.45]], [[-0.45, 0.14, -0.1], [0.25, 0.14, -0.1]], [[-0.45, 0.14, 0.12], [0.25, 0.14, 0.12], 0.05, 0.05]], [[0.3, 0.16, 0.08], [0.3, 0.16, -0.0], [0.3, 0.16, -0.21], [0.3, 0.16, -0.29]]));
  const bd = A.part('body', 'body', { name: 'Strut tower & inner wing (shown transparent)' });
  A.rigid(bd, 'chassis', towerGlass([0.57, 0.98, -0.0]));

  return {
    parts: A.parts, springSpans: A.springSpans, kinType: 'strut', hp,
    solve(s) {
      const pose = KM.strut(hp, s);
      return { pose, mats: { chassis: new THREE.Matrix4(), knuckle: knuckleMatrix(pose, hp.BL), lca: rotZAbout(hp.AL, pose.th) } };
    }
  };
}

/* ═════════════════════════════════════════════════════════
   2. Double wishbone (SLA) — front, RWD
   ═════════════════════════════════════════════════════════ */
const HP_DW = { AL: [0.30, 0.17], BL: [0.72, 0.13], AU: [0.40, 0.49], BU: [0.64, 0.50], W: [0.76, 0.32], Rt: 0.32, camber0: -0.5 };

function buildSLAcommon(A, hp, opts) {
  const W = [...hp.W, 0];
  wheelEnd(A, [{ W, sx: 1, body: 'knuckle' }], { calAng: -2.3 });
  const kn = A.part('knuckle', 'knuckle', { explode: [0.12, -0.05, 0.5], name: opts.knName });
  A.rigid(kn, 'knuckle', knuckleObj(W, 1, [[0.72, 0.16, 0], [0.645, 0.475, 0], [0.675, 0.28, -0.15]], opts.knMat));
  const lca = A.part('lca', 'lca', { explode: [-0.05, -0.34, 0.1] });
  A.rigid(lca, 'lca', wishbone([V3(0.30, 0.17, 0.15), V3(0.30, 0.17, -0.15)], V3(0.72, 0.13, 0), 0.018, opts.armMat));
  const fork = grp(at(box(0.05, 0.03, 0.05, opts.armMat), 0.5, 0.18, 0)); A.rigid(lca, 'lca', fork);
  const uca = A.part('uca', 'uca', { explode: [-0.05, 0.22, -0.32] });
  const uw = new THREE.Group();
  [V3(0.40, 0.49, 0.15), V3(0.40, 0.49, -0.17)].forEach((p) => { uw.add(rod(p, V3(0.64, 0.50, 0), 0.015, opts.armMat, 16, 0.013)); uw.add(sph(0.018, opts.armMat, p)); });
  uw.add(sph(0.022, opts.armMat, V3(0.64, 0.50, 0)));
  A.rigid(uca, 'uca', uw);
  const bj = A.part('lbj', 'lbj', { explode: [0.2, 0, 0.25], name: 'Ball joints (upper & lower)' });
  A.rigid(bj, 'lca', ballJointMesh(V3(0.72, 0.13, 0), UP, 0.045));
  A.rigid(bj, 'uca', ballJointMesh(V3(0.64, 0.50, 0), V3(0, -1, 0), 0.04));
  const bush = A.part('bushing', 'bushing', { explode: [-0.28, 0, 0], name: 'Wishbone bushings (×4)' });
  A.rigid(bush, 'lca', bushingMesh(V3(0.30, 0.17, 0.15), V3(0, 0, 1)));
  A.rigid(bush, 'lca', bushingMesh(V3(0.30, 0.17, -0.15), V3(0, 0, 1)));
  A.rigid(bush, 'uca', bushingMesh(V3(0.40, 0.49, 0.15), V3(0, 0, 1), 0.024, 0.04));
  A.rigid(bush, 'uca', bushingMesh(V3(0.40, 0.49, -0.17), V3(0, 0, 1), 0.024, 0.04));

  const tr = A.part('tierod', 'tierod', { explode: [0, -0.1, -0.3] });
  A.span(tr, ['chassis', V3(0.25, 0.25, -0.15)], ['knuckle', V3(0.675, 0.28, -0.15)], tieRodObj(0.43));
  const rk = A.part('rack', 'rack');
  A.rigid(rk, 'chassis', at(rackObj(), -0.01, 0.25, -0.15));
  const arb = A.part('arb', 'arb', { explode: [0, -0.04, 0.45] });
  A.rigid(arb, 'chassis', arbObj([[-0.45, 0.3, 0.26], [0.2, 0.3, 0.26], [0.42, 0.31, 0.2], [0.52, 0.31, 0.1]], 0.012, [[-0.2, 0.3, 0.26], [0.15, 0.3, 0.26]]));
  const dl = A.part('droplink', 'droplink', { explode: [0.08, 0.06, 0.3] });
  A.span(dl, ['lca', V3(0.535, 0.18, 0.075)], ['chassis', V3(0.52, 0.31, 0.1)], dropLinkObj(0.13));
  const sf = A.part('subframe', 'subframe', { name: opts.sfName || 'Subframe & arm brackets' });
  A.rigid(sf, 'chassis', subframeObj([[[0.24, 0.16, 0.4], [0.24, 0.16, -0.45]], [[-0.45, 0.15, -0.08], [0.24, 0.15, -0.08]], [[-0.45, 0.15, 0.1], [0.24, 0.15, 0.1], 0.05, 0.05], [[0.37, 0.49, 0.2], [0.37, 0.49, -0.22], 0.05, 0.06]], [[0.27, 0.17, 0.15], [0.27, 0.17, -0.15], [0.37, 0.52, 0.15], [0.37, 0.52, -0.17]]));
  const bd = A.part('body', 'body', { name: 'Damper tower & inner wing (shown transparent)' });
  A.rigid(bd, 'chassis', towerGlass([0.44, 0.98, 0]));
}
function slaSolve(hp) {
  return (s) => {
    const pose = KM.sla(hp, s);
    return { pose, mats: { chassis: new THREE.Matrix4(), knuckle: knuckleMatrix(pose, hp.BL), lca: rotZAbout(hp.AL, pose.th), uca: rotZAbout(hp.AU, pose.thU) } };
  };
}
function buildDoubleWishbone() {
  const A = new Asm(); const hp = HP_DW;
  buildSLAcommon(A, hp, { knMat: MAT.castAlu, armMat: MAT.castAlu, knName: 'Steering knuckle (forged aluminium)' });
  const B = V3(0.50, 0.175, 0), T = V3(0.44, 0.98, 0); const axis = T.clone().sub(B).normalize(); const L0 = B.distanceTo(T);
  const dmp = A.part('damper', 'damper', { explode: [-0.1, 0.0, 0.62], name: 'Coil-over damper (monotube)' });
  A.span(dmp, ['lca', B], ['chassis', T], damperUnit({ len: L0, body: 0.42, rOut: 0.024, seatAt: 0.44, seatR: 0.078, bottom: 'eye', mat: MAT.damperGold }));
  const spr = A.part('spring', 'spring', { explode: [-0.1, 0.1, 0.92] });
  A.span(spr, ['lca', B], ['chassis', T], springSpan({ L: L0, ao: 0.455, bo: 0.055, R: 0.068, wire: 0.012, turns: 6, mat: MAT.spring }));
  A.springSpans.push([['lca', B], ['chassis', T]]);
  const bs = A.part('bumpstop', 'bumpstop', { explode: [-0.1, 0.2, 0.62] });
  A.span(bs, ['lca', B], ['chassis', T], topAttached(bumpStopObj(), 0.03));
  const tm = A.part('topmount', 'topmount', { explode: [-0.1, 0.32, 0.62], name: 'Damper top mount' });
  A.rigid(tm, 'chassis', topMountObj(T, axis, 0.07));
  return { parts: A.parts, springSpans: A.springSpans, kinType: 'sla', hp, solve: slaSolve(hp) };
}

/* ═════════════════════════════════════════════════════════
   3. Multi-link (5-link) — rear, RWD
   ═════════════════════════════════════════════════════════ */
const HP_ML = { AL: [0.28, 0.15], BL: [0.71, 0.12], AU: [0.40, 0.47], BU: [0.645, 0.49], W: [0.76, 0.32], Rt: 0.32, camber0: -1.4 };

function buildMultiLink() {
  const A = new Asm(); const hp = HP_ML; const W = [...hp.W, 0];
  wheelEnd(A, [{ W, sx: 1, body: 'knuckle' }], { calAng: -2.0, discR: 0.14 });
  const kn = A.part('knuckle', 'knuckle', { explode: [0.15, -0.05, 0.55], name: 'Wheel carrier (hub carrier)' });
  A.rigid(kn, 'knuckle', knuckleObj(W, 1, [[0.645, 0.49, 0.05], [0.645, 0.49, -0.05], [0.71, 0.12, 0.09], [0.71, 0.12, -0.085], [0.69, 0.22, -0.19]], MAT.castAlu));

  const links = [
    ['link_uf', 'link_uf', [0.645, 0.49, 0.05], [0.40, 0.47, 0.24], [0, 0.22, 0.25]],
    ['link_ur', 'link_ur', [0.645, 0.49, -0.05], [0.41, 0.47, -0.22], [0, 0.22, -0.25]],
    ['link_camber', 'link_camber', [0.71, 0.12, 0.09], [0.28, 0.15, 0.13], [0, -0.16, 0.3]],
    ['link_toe', 'link_toe', [0.69, 0.22, -0.19], [0.27, 0.21, -0.2], [0, -0.1, -0.3]]
  ];
  links.forEach(([id, info, kp, cp, ex]) => {
    const p = A.part(id, info, { explode: ex });
    const K = A3(kp), C = A3(cp); const L = K.distanceTo(C);
    const o = new THREE.Group(); const body = cyl(0.012, 1, info === 'link_toe' ? MAT.zinc : MAT.castAlu, { seg: 14 }); o.add(body);
    const e1 = bushingMesh(V3(0, 0, 0), V3(0, 0, 1), 0.022, 0.035); const e2 = bushingMesh(V3(0, 0, 0), V3(0, 0, 1), 0.02, 0.03); o.add(e1); o.add(e2);
    o.userData.setLength = (l) => { body.scale.y = l - 0.03; body.position.y = l / 2; e2.position.y = l; };
    o.userData.setLength(L);
    A.span(p, ['chassis', C], ['knuckle', K], o);
  });

  const sl = A.part('springlink', 'springlink', { explode: [0, -0.34, 0] });
  const slo = wishbone([V3(0.28, 0.15, -0.04), V3(0.28, 0.15, -0.13)], V3(0.71, 0.12, -0.085), 0.017, MAT.castAlu, 0.01);
  slo.add(at(lathe([[0.0, -0.012], [0.068, -0.012], [0.072, 0.012], [0.066, 0.012], [0.062, -0.004], [0, -0.004]], MAT.castAlu, 40), 0.485, 0.155, -0.085));
  A.rigid(sl, 'lca', slo);
  const bush = A.part('bushing', 'bushing', { explode: [-0.25, -0.3, 0], name: 'Spring-link bushings' });
  A.rigid(bush, 'lca', bushingMesh(V3(0.28, 0.15, -0.04), V3(0, 0, 1), 0.026, 0.04));
  A.rigid(bush, 'lca', bushingMesh(V3(0.28, 0.15, -0.13), V3(0, 0, 1), 0.026, 0.04));
  A.rigid(bush, 'lca', bushingMesh(V3(0.71, 0.12, -0.085), V3(0, 0, 1), 0.03, 0.05));

  const SB = V3(0.485, 0.165, -0.085), ST = V3(0.48, 0.44, -0.085);
  const spr = A.part('spring', 'spring', { explode: [0, -0.18, -0.55], name: 'Coil spring (barrel)' });
  A.span(spr, ['lca', SB], ['chassis', ST], springSpan({ L: SB.distanceTo(ST), ao: 0.0, bo: 0.0, R: 0.056, wire: 0.0115, turns: 5.5, mat: MAT.spring }));
  A.springSpans.push([['lca', SB], ['chassis', ST]]);
  const DB = V3(0.62, 0.135, -0.13), DT = V3(0.57, 0.8, -0.18);
  const dmp = A.part('damper', 'damper', { explode: [0.1, 0.12, -0.45], name: 'Damper (twin-tube)' });
  A.span(dmp, ['lca', DB], ['chassis', DT], damperUnit({ len: DB.distanceTo(DT), body: 0.36, rOut: 0.023, bottom: 'eye' }));
  const tm = A.part('topmount', 'topmount', { explode: [0.1, 0.3, -0.45], name: 'Damper top mount' });
  A.rigid(tm, 'chassis', topMountObj(DT, DT.clone().sub(DB), 0.05));

  const ds = A.part('driveshaft', 'driveshaft', { explode: [-0.15, 0.05, 0.3] });
  A.span(ds, ['chassis', V3(0.11, 0.32, 0)], ['knuckle', V3(0.735, 0.32, 0)], driveShaftObj(0.62));
  const df = A.part('diff', 'diff', { name: 'Rear differential (final drive)' });
  const dfo = new THREE.Group();
  const pump = lathe([[0.0, -0.1], [0.08, -0.095], [0.115, -0.04], [0.115, 0.035], [0.085, 0.085], [0.0, 0.09]], MAT.iron, 48); pump.rotation.z = Math.PI / 2; pump.position.set(-0.05, 0.32, 0); dfo.add(pump);
  const nose = cyl(0.05, 0.2, MAT.iron); nose.rotation.x = Math.PI / 2; nose.position.set(-0.05, 0.32, 0.18); dfo.add(nose);
  A.rigid(df, 'chassis', dfo);

  const arb = A.part('arb', 'arb', { explode: [0, -0.05, -0.4] });
  A.rigid(arb, 'chassis', arbObj([[-0.45, 0.26, -0.32], [0.2, 0.26, -0.32], [0.42, 0.27, -0.29], [0.5, 0.27, -0.24]], 0.0105, [[-0.2, 0.26, -0.32], [0.15, 0.26, -0.32]]));
  const dl = A.part('droplink', 'droplink', { explode: [0.1, 0.05, -0.3] });
  A.span(dl, ['lca', V3(0.53, 0.15, -0.125)], ['chassis', V3(0.5, 0.27, -0.24)], dropLinkObj(0.18));

  const sf = A.part('subframe', 'subframe', { name: 'Rear subframe (rubber-mounted)' });
  A.rigid(sf, 'chassis', subframeObj([
    [[0.22, 0.18, 0.4], [0.22, 0.18, -0.45]], [[-0.45, 0.17, 0.27], [0.22, 0.17, 0.27]], [[-0.45, 0.17, -0.38], [0.22, 0.17, -0.38]],
    [[0.3, 0.17, 0.25], [0.38, 0.47, 0.24], 0.05, 0.05], [[0.3, 0.17, -0.25], [0.39, 0.47, -0.22], 0.05, 0.05], [[0.38, 0.47, 0.24], [0.39, 0.47, -0.22], 0.05, 0.05]
  ], [[0.26, 0.15, 0.13], [0.25, 0.21, -0.2], [0.26, 0.15, -0.085], [0.45, 0.45, -0.085]]));
  const bd = A.part('body', 'body', { name: 'Rear body rail & damper mount (transparent)' });
  const bdo = new THREE.Group(); bdo.add(at(box(0.16, 0.12, 1.3, MAT.glass), 0.42, 0.86, 0)); bdo.add(at(box(0.01, 0.4, 1.1, MAT.glass), 0.32, 0.7, 0));
  A.rigid(bd, 'chassis', bdo);

  return { parts: A.parts, springSpans: A.springSpans, kinType: 'sla', hp, solve: slaSolve(hp) };
}

/* ═════════════════════════════════════════════════════════
   4. Twist-beam axle — rear, FWD (both wheels)
   ═════════════════════════════════════════════════════════ */
const HP_TB = { W: [0.74, 0.31], Wside: [0, 0.31], Pside: [0.46, 0.35], Rt: 0.31, camber0: -1.4, rcH: 0.13 };

function buildTwistBeam() {
  const A = new Asm(); const hp = HP_TB;
  const sides = [1, -1].map((sx) => ({ W: [sx * 0.74, 0.31, 0], sx, body: 'beam' }));
  wheelEnd(A, sides, { R: 0.31, w: 0.205, rr: 0.203, discR: 0.13, calAng: -2.0, hubEx: [0.22, 0, 0] });

  const stub = A.part('stubaxle', 'stubaxle', { explode: [0.12, -0.08, 0] });
  const beam = A.part('twistbeam', 'twistbeam', { explode: [0, -0.38, 0.05] });
  const pb = A.part('pivotbush', 'pivotbush', { explode: [0.22, -0.42, 0.3] });
  const spr = A.part('spring', 'spring', { explode: [0, 0.32, 0] });
  const dmp = A.part('damper', 'damper', { explode: [0.05, 0.25, -0.3] });
  const bs = A.part('bumpstop', 'bumpstop', { explode: [0, 0.45, 0], name: 'Bump stop (in spring)' });

  const bo = new THREE.Group();
  // cross beam: V/U open section extruded along X
  const sh = new THREE.Shape([[-0.055, -0.04], [-0.06, -0.034], [0, 0.03], [0.06, -0.034], [0.055, -0.04], [0, 0.022]].map(([a, b]) => new THREE.Vector2(a, b)));
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false }); bg.translate(0, 0, -0.6);
  const bm = mesh(bg, MAT.ecoat); bm.rotation.y = Math.PI / 2; bm.position.set(0, 0.33, 0.18); bo.add(bm);
  A.rigid(beam, 'beam', bo);
  sides.forEach(({ sx }) => {
    const arm = new THREE.Group();
    const P = V3(sx * 0.6, 0.35, 0.46), C = V3(sx * 0.645, 0.31, 0.0), D = V3(sx * 0.6, 0.28, -0.13);
    arm.add(rod(P, C, 0.03, MAT.ecoat, 20, 0.032)); arm.add(rod(C, D, 0.028, MAT.ecoat, 20, 0.022));
    arm.add(rod(P.clone().add(V3(0, 0, -0.02)), V3(sx * 0.6, 0.33, 0.18), 0.03, MAT.ecoat));
    arm.add(cyl(0.045, 0.07, MAT.ecoat)); arm.children[arm.children.length - 1].rotation.z = Math.PI / 2; arm.children[arm.children.length - 1].position.copy(P);
    const seat = lathe([[0.0, -0.01], [0.066, -0.01], [0.07, 0.012], [0.064, 0.012], [0.06, 0.0], [0, 0.0]], MAT.ecoat, 40); seat.position.set(sx * 0.53, 0.3, 0.04); arm.add(seat);
    arm.add(rod(V3(sx * 0.53, 0.3, 0.04), V3(sx * 0.63, 0.31, 0.06), 0.018, MAT.ecoat));
    arm.add(at(box(0.05, 0.05, 0.03, MAT.ecoat), sx * 0.6, 0.27, -0.13));
    A.rigid(beam, 'beam', arm, sx);
    const plateO = box(0.012, 0.16, 0.16, MAT.ecoat); plateO.position.set(sx * 0.665, 0.31, 0);
    const spindle = cyl(0.022, 0.07, MAT.steel); spindle.rotation.z = Math.PI / 2; spindle.position.set(sx * 0.7, 0.31, 0);
    A.rigid(stub, 'beam', grp(plateO, spindle, ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => { const bb = cyl(0.007, 0.03, MAT.zinc, { seg: 6 }); bb.rotation.z = Math.PI / 2; bb.position.set(sx * 0.675, 0.31 + a * 0.055, b * 0.055); return bb; })), sx);
    A.rigid(pb, 'beam', bushingMesh(P, V3(1, 0, 0), 0.04, 0.075), sx);
    const brk = grp(at(box(0.11, 0.1, 0.012, MAT.ecoat), sx * 0.6, 0.38, 0.5), at(box(0.11, 0.1, 0.012, MAT.ecoat), sx * 0.6, 0.38, 0.42));
    A.rigid(A.parts.find((p) => p.id === 'body') || A.part('body', 'body', { name: 'Body rails, pivot brackets & spring towers (transparent)' }), 'chassis', brk, sx);
    const SB = V3(sx * 0.53, 0.31, 0.04), ST = V3(sx * 0.53, 0.57, 0.04);
    A.span(spr, ['beam', SB], ['chassis', ST], springSpan({ L: ST.y - SB.y, ao: 0, bo: 0, R: 0.058, wire: 0.0115, turns: 5, mat: MAT.spring }), sx);
    if (sx > 0) A.springSpans.push([['beam', SB], ['chassis', ST]]);
    A.span(bs, ['beam', SB], ['chassis', ST], topAttached(bumpStopObj(), 0.0), sx);
    const DB = V3(sx * 0.6, 0.28, -0.13), DT = V3(sx * 0.575, 0.7, -0.24);
    A.span(dmp, ['beam', DB], ['chassis', DT], damperUnit({ len: DB.distanceTo(DT), body: 0.27, rOut: 0.022, bottom: 'eye' }), sx);
  });
  const bd = A.parts.find((p) => p.id === 'body');
  const bdo = new THREE.Group();
  [1, -1].forEach((sx) => { bdo.add(at(box(0.12, 0.1, 1.4, MAT.glass), sx * 0.55, 0.64, 0.05)); bdo.add(at(cyl(0.08, 0.04, MAT.glass), sx * 0.53, 0.59, 0.04)); });
  bdo.add(at(box(1.0, 0.01, 1.2, MAT.glass), 0, 0.72, 0.05));
  A.rigid(bd, 'chassis', bdo);

  return {
    parts: A.parts, springSpans: A.springSpans, kinType: 'twist', hp,
    solve(s) {
      const pose = KM.twist(hp, s);
      const P = hp.Pside; // [z, y]
      const m = new THREE.Matrix4().makeTranslation(0, P[1], P[0]).multiply(new THREE.Matrix4().makeRotationX(-pose.alpha)).multiply(new THREE.Matrix4().makeTranslation(0, -P[1], -P[0]));
      return { pose, mats: { chassis: new THREE.Matrix4(), beam: m } };
    }
  };
}

/* ═════════════════════════════════════════════════════════
   5. Leaf-spring live axle (Hotchkiss) — rear, pickup / LCV
   ═════════════════════════════════════════════════════════ */
const HP_LEAF = { W: [0.82, 0.38], Rt: 0.38, camber0: 0, arch0: 0.1, rcH: 0.0, half: 0.7, eyeY: 0.445 };

function buildLeaf() {
  const A = new Asm(); const hp = HP_LEAF;
  const sides = [1, -1].map((sx) => ({ W: [sx * 0.82, 0.38, 0], sx, body: 'axle' }));
  wheelEnd(A, sides, { R: 0.38, w: 0.245, rr: 0.203, discR: 0.15, drum: true, hubEx: [0.22, 0, 0] });
  hp.rcH = 0.326 - (0.38 - hp.Rt);

  const half = A.part('halfshaft', 'halfshaft', { explode: [0.62, -0.02, 0] });
  const hous = A.part('axlehousing', 'axlehousing', { explode: [0, -0.5, 0] });
  const diff = A.part('diff', 'diff', { explode: [0, -0.5, 0.28], name: 'Differential carrier & cover' });
  const ub = A.part('ubolt', 'ubolt', { explode: [0, 0.32, 0] });
  const leaf = A.part('leaf', 'leaf', { explode: [0.28, -0.28, 0] });
  const shk = A.part('shackle', 'shackle', { explode: [0.12, 0.05, -0.25] });
  const dmp = A.part('damper', 'damper', { explode: [0.25, 0.2, 0] });
  const bs = A.part('bumpstop', 'bumpstop', { explode: [0, 0.18, 0], name: 'Frame bump stops (PU)' });
  const fr = A.part('hanger', 'hanger');

  const ho = new THREE.Group();
  ho.add(rod(V3(-0.74, 0.38, 0), V3(0.74, 0.38, 0), 0.042, MAT.ecoat, 28));
  ho.add(rod(V3(-0.3, 0.38, 0), V3(0.3, 0.38, 0), 0.05, MAT.ecoat, 28));
  [1, -1].forEach((sx) => { const bp = cyl(0.165, 0.008, MAT.ecoat); bp.rotation.z = Math.PI / 2; bp.position.set(sx * 0.745, 0.38, 0); ho.add(bp); const sp = box(0.07, 0.014, 0.13, MAT.ecoat); sp.position.set(sx * 0.5, 0.335, 0); ho.add(sp); ho.add(at(box(0.04, 0.05, 0.04, MAT.ecoat), sx * 0.6, 0.34, sx * 0.1)); });
  A.rigid(hous, 'axle', ho);
  const dfo = new THREE.Group();
  const pump = lathe([[0.0, -0.12], [0.11, -0.11], [0.15, -0.04], [0.15, 0.05], [0.11, 0.1], [0.0, 0.11]], MAT.iron, 48); pump.rotation.z = Math.PI / 2; pump.position.set(0.05, 0.38, 0); dfo.add(pump);
  const nose = cyl(0.065, 0.22, MAT.iron, { r2: 0.05 }); nose.rotation.x = Math.PI / 2; nose.position.set(0.05, 0.38, 0.2); dfo.add(nose);
  const yoke = cyl(0.04, 0.03, MAT.steel); yoke.rotation.x = Math.PI / 2; yoke.position.set(0.05, 0.38, 0.325); dfo.add(yoke);
  const cover = cyl(0.13, 0.02, MAT.ecoat); cover.rotation.x = Math.PI / 2; cover.position.set(0.05, 0.38, -0.12); dfo.add(cover);
  const crown = cyl(0.11, 0.025, MAT.brass); crown.rotation.z = Math.PI / 2; crown.position.set(0.0, 0.38, 0); dfo.add(crown);
  A.rigid(diff, 'axle', dfo);

  const leaves = [1.4, 1.16, 0.92, 0.68, 0.44]; const t = 0.011;
  const yc0 = 0.326 - t / 2;
  sides.forEach(({ sx }) => {
    const hs = grp(rod(V3(sx * 0.08, 0.38, 0), V3(sx * 0.79, 0.38, 0), 0.016, MAT.steel, 16));
    const fl = cyl(0.075, 0.012, MAT.steel); fl.rotation.z = Math.PI / 2; fl.position.set(sx * 0.795, 0.38, 0); hs.add(fl);
    A.rigid(half, 'axle', hs, sx);
    const x = sx * 0.5;
    const pack = new THREE.Group(); const meshes = [];
    leaves.forEach((L, k) => { const m = leafMesh(L, 0.065, t); m.position.set(x, 0, 0); pack.add(m); meshes.push([m, k]); });
    const eyeF = torus(0.02, 0.007, MAT.leaf); eyeF.rotation.y = Math.PI / 2; eyeF.position.set(x, hp.eyeY, 0.7); pack.add(eyeF);
    const eyeR = eyeF.clone(); eyeR.position.z = -0.7; pack.add(eyeR);
    const cb = cyl(0.006, 0.08, MAT.zinc); cb.position.set(x, 0.3, 0); pack.add(cb);
    const clips = [-0.32, 0.32].map((z) => { const c = box(0.075, 0.05, 0.02, MAT.zinc); c.position.set(x, 0.3, z); pack.add(c); return c; });
    A.dyn(leaf, pack, (st) => {
      const s = st.s; const arch = hp.arch0 - s; const yc = yc0 + s;
      meshes.forEach(([m, k]) => m.userData.bend((z) => yc - k * t + arch * (z / hp.half) ** 2));
      clips.forEach((c) => { c.position.y = yc - 0.02 + arch * (c.position.z / hp.half) ** 2; });
      cb.position.y = yc - 0.03;
    }, sx);
    // U-bolts and plate
    const u = new THREE.Group();
    [0.05, -0.05].forEach((z) => {
      const arc = torus(0.044, 0.007, MAT.zinc, Math.PI); arc.position.set(x, 0.38, z); u.add(arc);
      [-1, 1].forEach((side) => u.add(rod(V3(x + side * 0.044, 0.38, z), V3(x + side * 0.044, 0.245, z), 0.007, MAT.zinc, 10)));
    });
    u.add(at(box(0.11, 0.014, 0.14, MAT.ecoat), x, 0.252, 0));
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => u.add(at(cyl(0.011, 0.018, MAT.zinc, { seg: 6 }), x + a * 0.044, 0.235, b * 0.05))));
    A.rigid(ub, 'axle', u, sx);
    // shackle
    const sk = new THREE.Group();
    [-1, 1].forEach((side) => sk.add(rod(V3(x + side * 0.042, hp.eyeY, -0.7), V3(x + side * 0.042, 0.55, -0.78), 0.008, MAT.ecoat, 10)));
    [[hp.eyeY, -0.7], [0.55, -0.78]].forEach(([y, z]) => { const b = cyl(0.008, 0.11, MAT.zinc); b.rotation.z = Math.PI / 2; b.position.set(x, y, z); sk.add(b); });
    A.rigid(shk, 'chassis', sk, sx);
    // frame rail + hangers
    const f = new THREE.Group();
    f.add(at(box(0.055, 0.12, 1.95, MAT.ecoat), x, 0.62, 0));
    f.add(rod(V3(x, 0.56, 0.75), V3(x, hp.eyeY, 0.7), 0.025, MAT.ecoat)); const fb = cyl(0.009, 0.1, MAT.zinc); fb.rotation.z = Math.PI / 2; fb.position.set(x, hp.eyeY, 0.7); f.add(fb);
    f.add(at(box(0.05, 0.05, 0.05, MAT.ecoat), x, 0.56, -0.78));
    f.add(at(box(0.05, 0.05, 0.05, MAT.ecoat), sx * 0.56, 0.66, -sx * 0.3));
    A.rigid(fr, 'chassis', f, sx);
    A.rigid(bs, 'chassis', at(box(0.06, 0.05, 0.08, MAT.pu), x, 0.535, 0), sx);
    const DB = V3(sx * 0.6, 0.34, sx * 0.1), DT = V3(sx * 0.56, 0.66, -sx * 0.3);
    A.span(dmp, ['axle', DB], ['chassis', DT], damperUnit({ len: DB.distanceTo(DT), body: 0.3, rOut: 0.025, bottom: 'eye', mat: MAT.damperGold }), sx);
  });
  A.springSpans.push('leaf');
  const cm = new THREE.Group();
  [0.95, -1.0].forEach((z) => cm.add(at(box(1.0, 0.1, 0.06, MAT.ecoat), 0, 0.64, z)));
  A.rigid(fr, 'chassis', cm);

  return {
    parts: A.parts, springSpans: A.springSpans, kinType: 'live', hp,
    solve(s) { const pose = KM.live(hp, s); return { pose, mats: { chassis: new THREE.Matrix4(), axle: new THREE.Matrix4().makeTranslation(0, s, 0) } }; }
  };
}

/* ═════════════════════════════════════════════════════════
   6. Air suspension — front double wishbone with air strut + CDC
   ═════════════════════════════════════════════════════════ */
function buildAir() {
  const A = new Asm(); const hp = HP_DW;
  buildSLAcommon(A, hp, { knMat: MAT.castAlu, armMat: MAT.castAlu, knName: 'Steering knuckle (forged aluminium)', sfName: 'Aluminium subframe & arm brackets' });
  const B = V3(0.50, 0.175, 0), T = V3(0.44, 0.98, 0); const axis = T.clone().sub(B).normalize(); const L0 = B.distanceTo(T);
  const dmp = A.part('cdc', 'cdc', { explode: [-0.1, -0.04, 0.62], name: 'CDC adaptive damper' });
  A.span(dmp, ['lca', B], ['chassis', T], damperUnit({ len: L0, body: 0.44, rOut: 0.025, bottom: 'eye', mat: MAT.darkSteel, cdc: true }));
  const as = A.part('airspring', 'airspring', { explode: [-0.1, 0.12, 0.92] });
  const aso = new THREE.Group(); const asm = airSpringMesh(0.31, 0.074, 0.05); asm.position.y = 0.45; aso.add(asm);
  aso.userData.setLength = (l) => asm.userData.setLength(l - 0.45 - 0.035);
  aso.userData.setLength(L0);
  A.span(as, ['lca', B], ['chassis', T], aso);
  A.springSpans.push([['lca', B], ['chassis', T]]);
  const tm = A.part('topmount', 'topmount', { explode: [-0.1, 0.32, 0.62], name: 'Air-strut top mount' });
  A.rigid(tm, 'chassis', topMountObj(T.clone().add(V3(0, 0.035, 0)), axis, 0.07));

  const hs = A.part('heightsensor', 'heightsensor', { explode: [-0.1, 0.1, 0.32] });
  const hso = grp(at(box(0.045, 0.05, 0.03, MAT.plastic), 0.37, 0.3, 0.12), rod(V3(0.37, 0.3, 0.13), V3(0.45, 0.3, 0.1), 0.004, MAT.steel), at(box(0.02, 0.02, 0.03, MAT.green), 0.34, 0.3, 0.12));
  A.rigid(hs, 'chassis', hso);
  A.span(hs, ['chassis', V3(0.45, 0.3, 0.1)], ['lca', V3(0.475, 0.18, 0.085)], heightLinkObj(0.12));

  const comp = A.part('compressor', 'compressor', { explode: [-0.25, 0, 0.25] });
  const co = new THREE.Group();
  const mot = cyl(0.045, 0.13, MAT.darkSteel); mot.rotation.z = Math.PI / 2; mot.position.set(-0.08, 0.22, 0.34); co.add(mot);
  const head = box(0.07, 0.08, 0.07, MAT.alu); head.position.set(0.02, 0.24, 0.34); co.add(head);
  for (let i = 0; i < 5; i++) co.add(at(box(0.075, 0.004, 0.075, MAT.alu), 0.02, 0.28 + i * 0.008, 0.34));
  const dry = cyl(0.028, 0.13, MAT.alu); dry.position.set(0.02, 0.24, 0.42); co.add(dry);
  co.add(at(box(0.25, 0.01, 0.16, MAT.ecoat), -0.03, 0.17, 0.37));
  A.rigid(comp, 'chassis', co);
  const res = A.part('reservoir', 'reservoir', { explode: [-0.2, -0.05, -0.25] });
  const ro = new THREE.Group(); const tank = cyl(0.07, 0.4, MAT.alu); tank.rotation.z = Math.PI / 2; tank.position.set(-0.14, 0.2, -0.36); ro.add(tank);
  [-0.34, 0.06].forEach((x) => { const e = sph(0.07, MAT.alu); e.scale.x = 0.35; e.position.set(x, 0.2, -0.36); ro.add(e); });
  ro.add(at(cyl(0.008, 0.03, MAT.brass), 0.05, 0.27, -0.36));
  A.rigid(res, 'chassis', ro);
  const vb = A.part('valveblock', 'valveblock', { explode: [0.0, 0.18, 0.2] });
  const vbo = new THREE.Group(); vbo.add(at(box(0.1, 0.06, 0.05, MAT.alu), 0.2, 0.46, 0.3));
  for (let i = 0; i < 4; i++) vbo.add(at(cyl(0.011, 0.03, MAT.plastic), 0.165 + i * 0.023, 0.505, 0.3));
  vbo.add(at(box(0.04, 0.02, 0.03, MAT.plastic), 0.2, 0.46, 0.335));
  A.rigid(vb, 'chassis', vbo);
  const ecu = A.part('ecu', 'ecu', { explode: [-0.2, 0.2, -0.2], name: 'Suspension control ECU' });
  const eo = grp(at(box(0.17, 0.035, 0.13, MAT.ecu), 0.02, 0.62, -0.18), at(box(0.06, 0.03, 0.03, MAT.plastic), 0.02, 0.62, -0.1));
  for (let i = 0; i < 7; i++) eo.add(at(box(0.004, 0.01, 0.12, MAT.ecu), -0.05 + i * 0.022, 0.643, -0.18));
  A.rigid(ecu, 'chassis', eo);
  const al = A.part('airlines', 'airlines', { explode: [0.0, 0.1, 0.1] });
  const alo = grp(
    pathTube([V3(0.02, 0.29, 0.42), V3(0.08, 0.36, 0.38), V3(0.15, 0.44, 0.33), V3(0.17, 0.46, 0.3)].map((v) => v), 0.0035, MAT.airline, 40),
    pathTube([V3(0.05, 0.27, -0.36), V3(0.15, 0.32, -0.1), V3(0.2, 0.4, 0.15), V3(0.22, 0.43, 0.3)], 0.0035, MAT.airline, 60),
    pathTube([V3(0.24, 0.47, 0.3), V3(0.32, 0.62, 0.22), V3(0.42, 0.92, 0.08), V3(0.48, 1.03, 0.0)], 0.0035, MAT.airline, 60),
    pathTube([V3(0.16, 0.47, 0.3), V3(0.0, 0.5, 0.33), V3(-0.4, 0.5, 0.32)], 0.0035, MAT.airline, 40)
  );
  A.rigid(al, 'chassis', alo);
  return { parts: A.parts, springSpans: A.springSpans, kinType: 'sla', hp, solve: slaSolve(hp) };
}

/* ═════════════════════════════════════════════════════════
   System catalogue: descriptions, design data, tear-down steps
   ═════════════════════════════════════════════════════════ */
const SYSTEMS = [
  {
    id: 'macpherson', name: 'MacPherson strut', axle: 'Front · FWD', build: buildMacPherson, car: { kind: 'hatch', axle: 'front', wb: 2.55, R: 0.32, track: 0.76, real: [['front', 1]] },
    camera: { pos: [0.95, 1.25, 2.15], target: [0.45, 0.5, 0] },
    history: 'Earle S. MacPherson (GM, then Ford) — first in production on the 1950 Ford Consul / Zephyr (UK).',
    used: 'Most front-wheel-drive cars: VW Golf, Toyota Corolla, Hyundai i20, Maruti Swift, Tesla Model 3 (front is double wishbone), Porsche 911 (front).',
    desc: 'The damper body is a structural member: it is clamped to the knuckle and replaces the upper wishbone. The single lower control arm locates the bottom, and the top mount locates the top. The steering axis runs from the lower ball joint to the top-mount bearing.',
    how: 'Vertical load goes through the coil spring, sitting on a seat welded to the strut tube, into the strut tower. Lateral tyre force makes a moment about the strut, pressing the piston rod and guide sideways. That is why the spring axis is offset and inclined (a "side-load spring"), to cancel the bending and reduce stiction. As the wheel rises, the lower arm swings up and the strut shortens through its fixed top point, so camber changes only a little.',
    pros: ['Few parts, low cost, light', 'Compact in width — leaves room for a transverse engine and gearbox', 'Large spacing between load points gives low bushing forces', 'Easy to assemble as a pre-built module'],
    cons: ['Poor camber gain: in roll the wheel leans with the body (positive camber relative to the road)', 'Strut friction under side load (harshness)', 'Tall — sets bonnet height', 'Kingpin geometry limited by the strut and tyre position'],
    char: { 'Unsprung mass / corner': '≈ 38–45 kg', 'Camber gain': '−0.3 to −0.6 °/50 mm bump', 'Roll-centre height': '40–110 mm', 'Wheel travel': '≈ 180 mm', 'Spring motion ratio': '≈ 0.95' },
    ratings: { comfort: 3, handling: 3, load: 3, packaging: 5, cost: 5, simplicity: 5 },
    preset: { ms: 380, mu: 42, ks: 26000, c: 2300, kt: 230000, mode: 'linear' },
    prep: 'Park on level ground, engage P / 1st gear and parking brake, chock the opposite axle. Slacken the wheel nuts (and the drive-shaft nut, if being removed) while the wheel is on the ground. Lift at the sill jacking point and support on axle stands — never work under a car held only by a jack.',
    steps: [
      { t: 'Remove wheel nuts', parts: ['wheelnuts'], tool: '19 / 17 mm socket, breaker bar', torque: 'Refit 110–120 N·m, star pattern, by torque wrench', note: 'Already loosened on the ground. Locking-nut key from the glovebox. Never use an impact gun to final-tighten alloy wheels.' },
      { t: 'Remove road wheel', parts: ['tyre', 'rim'], tool: 'Hands — wheel lift if heavy', torque: '—', note: 'Clean the hub/wheel contact faces before refitting; any rust scale causes run-out and brake judder.' },
      { t: 'Disconnect drop link from strut', parts: ['droplink'], tool: '16 mm spanner + T30 / 5 mm hex to hold stud', torque: '45–65 N·m', note: 'Hold the ball-stud while turning the nut, or the joint just spins. Tighten again only at ride height.' },
      { t: 'Remove brake caliper & carrier', parts: ['caliper'], tool: '18 mm socket (carrier), 7 mm hex (guide pins)', torque: 'Carrier 100–120 N·m (new bolts / thread-lock)', note: 'Hang the caliper from the spring with wire. Never let it hang on the flexible hose. Leave the hydraulic circuit closed.', warn: 'Brake dust: do not blow out with compressed air.' },
      { t: 'Remove brake disc', parts: ['disc'], tool: 'T30 (retaining screw), copper mallet', torque: 'Screw 8–12 N·m', note: 'Mark the disc-to-hub position. Measure thickness and DTV against the minimum stamped on the hat.' },
      { t: 'Split tie-rod end from steering arm', parts: ['tierod'], tool: '18 mm spanner, ball-joint splitter', torque: '40–55 N·m + new self-locking nut', note: 'Count turns or mark the thread if the tie rod is unscrewed, so toe is roughly kept. A full 4-wheel alignment is required afterwards.' },
      { t: 'Separate lower ball joint', parts: ['lbj'], tool: '16 mm pinch-bolt, wedge / pry bar', torque: 'Pinch bolt 50–60 N·m (new nut)', note: 'Push the lower arm down to pull the ball stud out of the knuckle. Take care not to split the ball-joint boot.' },
      { t: 'Push drive shaft out of hub', parts: ['driveshaft'], tool: '32–36 mm hub-nut socket, puller', torque: 'Hub nut 200–280 N·m (+ angle) — always a new nut', note: 'Support the drive shaft. Do not let it hang on the inner joint (tripod can fall apart) or bend the outer joint past its limit.', warn: 'Never load the wheel bearing with the hub nut loose — it brinells the races.' },
      { t: 'Remove knuckle and hub bearing', parts: ['knuckle', 'hub'], tool: '18–21 mm strut clamp bolts, hub press', torque: 'Strut–knuckle bolts 70 N·m + 90°', note: 'The cam-shaped bolt on the upper hole may be the camber adjuster — mark it. The bearing is pressed out of the knuckle; press the new one in on its outer race only.' },
      { t: 'Remove strut assembly & dismantle', parts: ['damper', 'spring', 'bumpstop', 'topmount'], tool: 'Top-mount nuts 13 / 15 mm, spring compressor, rod-nut tool', torque: 'Top nuts 50–65 N·m; rod nut 40–60 N·m', note: 'Undo the three top-mount nuts last while an assistant supports the strut. On the bench, compress the spring evenly with a clamp-type compressor until it is loose, then undo the piston-rod nut.', warn: 'A compressed coil spring stores 1–2 kJ. Use a certified compressor, keep both jaws engaged, and never use homemade clamps.' },
      { t: 'Remove anti-roll bar', parts: ['arb'], tool: '13 / 15 mm (clamps)', torque: 'Clamps 45–60 N·m', note: 'Often requires lowering the subframe by 20–30 mm on a support. Note the position of the bar collars.' },
      { t: 'Remove lower control arm', parts: ['lca', 'bushing'], tool: '18–21 mm, bush press', torque: 'Pivot bolts 100–150 N·m + angle — tighten at ride height', note: 'Hydro (rear) bush orientation is marked. Fit it the wrong way round and the car shimmies under braking.' }
    ]
  },
  {
    id: 'wishbone', name: 'Double wishbone (SLA)', axle: 'Front · RWD', build: buildDoubleWishbone, car: { kind: 'suv', axle: 'front', wb: 2.75, R: 0.32, track: 0.76, real: [['front', 1]] },
    camera: { pos: [0.3, 1.3, 2.2], target: [0.45, 0.46, 0] },
    history: 'Introduced on the 1934 Citroën Traction Avant and pre-war GM "Knee-Action". The standard for racing cars, light trucks and premium front axles ever since.',
    used: 'Honda Accord (to 2012), Mazda MX-5, Toyota Hilux / Fortuner front, Jaguar F-Type, most racing cars.',
    desc: 'Two transverse A-shaped arms of unequal length (Short-Long Arm, SLA) hold the knuckle at the top and bottom. Because the arms do all the locating, the coil-over damper carries no side load and can be tuned for damping alone.',
    how: 'In front view, the two arm lines meet at the instant centre (IC). The wheel rotates about it momentarily, so the IC location sets camber gain (1/FVSA length) and, with the contact patch, the roll-centre height. A shorter upper arm pulls the top of the tyre inward in bump, counteracting body roll so the tyre stays flat in corners. In side view, inclining the arm pivot axes gives anti-dive.',
    pros: ['Best camber control — tyre stays upright in roll', 'Freedom to place the roll centre, anti-dive and KPI', 'Damper sees no side load → low friction, good ride', 'High lateral stiffness'],
    cons: ['More parts, joints and cost', 'Wide — hard to package next to a transverse engine', 'Upper arm needs height in the wheel arch or a tall knuckle', 'Many bushings to maintain'],
    char: { 'Unsprung mass / corner': '≈ 35–42 kg (Al arms)', 'Camber gain': '−0.8 to −1.4 °/50 mm bump', 'Roll-centre height': '30–120 mm', 'Wheel travel': '≈ 200 mm', 'Spring motion ratio': '≈ 0.45–0.65 (on lower arm)' },
    ratings: { comfort: 4, handling: 5, load: 4, packaging: 2, cost: 2, simplicity: 3 },
    preset: { ms: 400, mu: 38, ks: 28000, c: 2600, kt: 240000, mode: 'linear' },
    prep: 'Lift and support the vehicle on stands at the chassis lift points. The spring load acts on the lower arm: keep a jack under the lower arm whenever the damper or ball joints are disconnected.',
    steps: [
      { t: 'Remove wheel nuts', parts: ['wheelnuts'], tool: '21 mm socket, breaker bar', torque: 'Refit 120–140 N·m, star pattern', note: 'Loosen on the ground; final torque with the wheels back on the ground.' },
      { t: 'Remove road wheel', parts: ['tyre', 'rim'], tool: '—', torque: '—', note: 'Inspect the inner tyre shoulder: inner-edge wear points to too much negative camber or toe-out.' },
      { t: 'Remove caliper (4-pot) & disc', parts: ['caliper', 'disc'], tool: '19 mm caliper bolts', torque: '110–130 N·m', note: 'Support the caliper with wire. Fixed calipers bolt straight to the knuckle and have no carrier.' },
      { t: 'Remove hub bearing unit', parts: ['hub'], tool: '4 × M12 bolts from behind, ABS sensor T25', torque: '80–100 N·m', note: 'Unplug the ABS sensor first. Gen-3 bolt-on units are replaced as a complete assembly.' },
      { t: 'Split tie-rod end', parts: ['tierod'], tool: 'Ball-joint splitter', torque: '45–60 N·m', note: 'Alignment needed afterwards.' },
      { t: 'Disconnect drop link', parts: ['droplink'], tool: '16 mm + hex', torque: '50–60 N·m', note: 'The bar may be preloaded on a lifted car — support the lower arm with a jack.' },
      { t: 'Remove coil-over unit', parts: ['damper', 'spring', 'bumpstop', 'topmount'], tool: 'Lower eye bolt 18 mm, top nuts 14 mm, spring compressor', torque: 'Lower bolt 100 N·m (at ride height); top 40–55 N·m', note: 'Jack under the lower arm and take the load before removing the lower eye bolt. Dismantle on the bench with a coil-over compressor.', warn: 'Stored spring energy — compress before undoing the rod nut.' },
      { t: 'Split ball joints & remove upper wishbone', parts: ['uca', 'lbj'], tool: 'Ball-joint splitter, 17 mm pivot bolts', torque: 'Upper BJ 55 N·m, lower BJ 80–110 N·m; pivots 70 N·m at ride height', note: 'Some upper arms carry camber shims or eccentric bolts at the body brackets — count and mark them. Ball joints may be pressed into the arm (removed with a C-press) or bolted.' },
      { t: 'Remove knuckle', parts: ['knuckle'], tool: 'Hands — support the knuckle', torque: '—', note: 'Check the steering arm and the ball-joint tapers for damage. A bent knuckle shows up as a KPI / caster error on the alignment rig.' },
      { t: 'Remove anti-roll bar', parts: ['arb'], tool: '13 mm', torque: '45 N·m', note: 'Inspect the D-bushes for ovality.' },
      { t: 'Remove lower wishbone & bushings', parts: ['lca', 'bushing'], tool: '21 mm, bush press', torque: '120–150 N·m at ride height', note: 'Load the arm to the design height (use a jack and measure) before final tightening, so the rubber is not pre-twisted.' }
    ]
  },
  {
    id: 'multilink', name: 'Multi-link (5-link)', axle: 'Rear · RWD', build: buildMultiLink, car: { kind: 'sedan', axle: 'rear', wb: 2.85, R: 0.32, track: 0.76, real: [['rear', 1]] },
    camera: { pos: [-0.25, 1.3, -2.0], target: [0.45, 0.36, 0] },
    history: 'Mercedes-Benz W201 (190E, 1982) "Raumlenkerachse" — five independent links, each defining one constraint.',
    used: 'Mercedes C/E-class rear, BMW 3-series rear, Audi A4 (front & rear), Ford Focus "Control Blade" rear, most premium cars.',
    desc: 'The wheel carrier has six degrees of freedom. Five separate links — two upper, a camber link, a spring link and a toe link — each remove one, leaving only vertical travel. Splitting the wishbones into single links lets the designer set kinematics and elasto-kinematics independently.',
    how: 'Each link is a two-force member (ball joint or bushing at both ends), so it carries mainly axial load. The lines of the upper links meet in a virtual pivot that can lie where no real arm could fit — for example outside the wheel, giving a negative scrub radius or a tailored roll centre. Toe-link geometry and bushing rates are tuned so that braking, driving and side forces all produce slight toe-in on the outer rear wheel (stable, understeering compliance-steer).',
    pros: ['Independent tuning of camber, toe, anti-squat, roll centre and compliance', 'Excellent ride / handling compromise', 'Separates longitudinal compliance (comfort) from lateral stiffness (precision)', 'Compact in height'],
    cons: ['Many links and bushings — highest cost and complexity', 'Sensitive to bushing wear (rear toe drift)', 'Needs a 4-wheel alignment after any repair', 'Hard-point tolerances are critical'],
    char: { 'Unsprung mass / corner': '≈ 40–48 kg', 'Camber gain': '−1.0 to −1.6 °/50 mm bump', 'Roll-centre height': '60–140 mm', 'Wheel travel': '≈ 200 mm', 'Spring motion ratio': '≈ 0.45–0.7' },
    ratings: { comfort: 5, handling: 5, load: 3, packaging: 4, cost: 1, simplicity: 1 },
    preset: { ms: 360, mu: 45, ks: 24000, c: 2200, kt: 230000, mode: 'linear' },
    prep: 'Support the vehicle on stands. The coil spring is preloaded between the spring link and the body: keep a jack under the spring link until the spring is out. Mark every eccentric (camber / toe) bolt before loosening.',
    steps: [
      { t: 'Remove wheel nuts & wheel', parts: ['wheelnuts', 'tyre', 'rim'], tool: '17 mm', torque: '110–130 N·m', note: 'Loosen the drive-shaft collar nut on the ground (huge torque, about 400 N·m).' },
      { t: 'Remove caliper & disc', parts: ['caliper', 'disc'], tool: 'E-Torx / 16 mm', torque: '80–115 N·m', note: 'Electric parking brake: put the EPB actuator in service (retract) mode with a scan tool first.', warn: 'Forcing an EPB caliper piston back destroys the motor gear.' },
      { t: 'Remove hub & push out drive shaft', parts: ['hub', 'driveshaft'], tool: 'Hub-nut socket, puller', torque: 'Hub nut 300–400 N·m — new nut', note: 'Support the shaft from the diff end.' },
      { t: 'Remove damper', parts: ['damper', 'topmount'], tool: '18 mm lower, 13 mm top', torque: '100 N·m + 90° (lower, at ride height)', note: 'Rear dampers usually do not hold the spring — they can come out first.' },
      { t: 'Disconnect stabiliser link', parts: ['droplink'], tool: '16 mm + hex', torque: '50 N·m', note: '' },
      { t: 'Lower spring link & remove spring', parts: ['spring'], tool: 'Trolley jack, spring compressor (if needed)', torque: '—', note: 'With the jack under the spring link, undo its outer bolt, then lower the jack slowly until the spring is free. Note the isolator orientation and the spring end position.', warn: 'Lower slowly — a preloaded spring can eject the jack.' },
      { t: 'Disconnect toe link', parts: ['link_toe'], tool: '18 mm, eccentric bolt', torque: '90 N·m + 90°', note: 'Mark the eccentric washer position — it sets rear toe.' },
      { t: 'Remove upper links', parts: ['link_uf', 'link_ur'], tool: '18 mm', torque: '70 N·m + 90°', note: 'Upper links are often handed (L/R) and asymmetric — label them.' },
      { t: 'Remove camber link & wheel carrier', parts: ['link_camber', 'knuckle'], tool: '18 mm, cam bolt', torque: '90–120 N·m', note: 'The camber cam bolt is often seized in the bush sleeve — penetrating oil the day before.' },
      { t: 'Remove spring link & bushings', parts: ['springlink', 'bushing'], tool: '21 mm, bush press', torque: '120 N·m + 90° at ride height', note: 'The hydro-bushing has an arrow that must point to the vehicle front.' },
      { t: 'Remove rear anti-roll bar', parts: ['arb'], tool: '13 mm', torque: '25–45 N·m', note: '' }
    ]
  },
  {
    id: 'twistbeam', name: 'Twist-beam axle', axle: 'Rear · FWD', build: buildTwistBeam, car: { kind: 'hatch', axle: 'rear', wb: 2.5, R: 0.31, track: 0.74, w: 0.205, real: [['rear', 1], ['rear', -1]] },
    camera: { pos: [1.95, 1.2, -1.75], target: [0, 0.36, 0.08] },
    history: 'Audi 50 / VW Golf Mk1 (1974) "Verbundlenkerachse" — combined trailing-arm axle.',
    used: 'Most small and compact FWD cars: VW Polo / Golf (low power), Hyundai i10–i20, Maruti Swift / Baleno, Honda City, Renault Clio, Toyota Yaris.',
    desc: 'Two trailing arms welded to a cross-beam that is stiff in bending but soft in torsion. In heave the whole axle pivots about the front bushings. In roll the beam twists, so it also works as the anti-roll bar.',
    how: 'Parallel bump: both arms rotate together about the pivot axis; camber and toe stay fixed relative to the body. In roll, one arm rises and the other falls, the beam twists, and the wheels camber with the body (like a solid axle). Where the beam sits along the arm sets the behaviour: near the pivots it acts as independent trailing arms, near the wheels as a rigid axle. Compliance-steer is set by angling the pivot bushes.',
    pros: ['Very cheap, light and robust', 'Compact — flat boot floor, room for the spare wheel or fuel tank', 'Built-in anti-roll function', 'Few bushings (two), simple alignment'],
    cons: ['Limited camber control in roll', 'Cross-coupled: one-wheel bumps disturb the other side', 'Lateral compliance and roll-steer are hard to tune at the same time', 'Not suitable for driven rear wheels'],
    char: { 'Unsprung mass / corner': '≈ 32–38 kg (½ beam)', 'Camber gain (heave)': '0 °', 'Roll-centre height': '≈ 100–180 mm (near the shear centre)', 'Wheel travel': '≈ 180 mm', 'Spring motion ratio': '≈ 0.8–0.9' },
    ratings: { comfort: 3, handling: 2, load: 3, packaging: 5, cost: 5, simplicity: 5 },
    preset: { ms: 300, mu: 36, ks: 22000, c: 1900, kt: 210000, mode: 'linear' },
    prep: 'Lift on a two-post lift or stands under the body sills. Disconnect the brake hoses, ABS sensor leads and handbrake cables from the beam first. A transmission jack or a second jack is needed to support the beam — it weighs 15–25 kg.',
    steps: [
      { t: 'Remove wheel nuts & both wheels', parts: ['wheelnuts', 'tyre', 'rim'], tool: '17 mm', torque: '110–120 N·m', note: '' },
      { t: 'Remove calipers & discs', parts: ['caliper', 'disc'], tool: '13 / 15 mm', torque: '65 N·m', note: 'Tie the calipers to the beam. Unclip the handbrake cable.' },
      { t: 'Remove hub bearings', parts: ['hub'], tool: '30 mm hub nut, or 4 bolts', torque: '175 N·m + 180° (typical)', note: 'Rear hubs are often one-shot bolts — replace them.' },
      { t: 'Remove stub axles', parts: ['stubaxle'], tool: '4 × 16 mm', torque: '70 N·m', note: 'Shims between the plate and stub set toe and camber. Keep them in order.' },
      { t: 'Support beam & remove dampers', parts: ['damper'], tool: '16 / 18 mm', torque: 'Lower 70 N·m at ride height', note: 'With the dampers off, the beam drops until the springs are unloaded. Lower it carefully on the jack.', warn: 'Keep the jack under the beam — it is held up only by the dampers.' },
      { t: 'Remove coil springs & bump stops', parts: ['spring', 'bumpstop'], tool: '—', torque: '—', note: 'Lower the beam until the springs can be lifted out. Check the orientation of the lower spring end in the seat.' },
      { t: 'Unbolt pivot brackets, lower beam & press out bushes', parts: ['twistbeam', 'pivotbush'], tool: '18 mm, bush puller kit', torque: '80 N·m + 90° (with beam at ride height)', note: 'Lower the axle on the jack with a helper balancing it. The voided pivot bushes are angled: align the mark with the arm before pressing new ones in.' }
    ]
  },
  {
    id: 'leaf', name: 'Leaf-spring live axle', axle: 'Rear · 4×2 pickup', build: buildLeaf, car: { kind: 'pickup', axle: 'rear', wb: 3.1, R: 0.38, track: 0.82, w: 0.245, real: [['rear', 1], ['rear', -1]] },
    camera: { pos: [2.45, 1.05, -1.55], target: [0.15, 0.4, -0.05] },
    history: 'Carriage springs of the 1700s. Hotchkiss drive (1900s), where the springs also take the drive torque, is still common on pickups and light commercial vehicles.',
    used: 'Toyota Hilux, Isuzu D-Max, Mahindra Bolero / Scorpio (older), Tata Ace, Ford Ranger, most trucks and buses.',
    desc: 'A rigid axle housing (with differential and half-shafts) is clamped by U-bolts to two longitudinal semi-elliptic leaf springs. The springs carry the load, locate the axle in every direction and react the drive and brake torque — no extra links are needed.',
    how: 'Each spring is fixed to the frame at the front eye and hangs on a swinging shackle at the rear, so its length can change as it flattens. Inter-leaf friction gives built-in (but uncontrolled) damping. Because the axle is rigid, a bump on one side tilts both wheels, but the camber of a fully loaded axle stays constant and track width never changes — ideal for carrying heavy loads.',
    pros: ['Huge load capacity at low cost', 'Simple, robust, easy to repair in the field', 'No alignment changes with load (track and camber stay constant)', 'Spreads load into the frame at two points'],
    cons: ['Very high unsprung mass → poor ride and grip on rough roads', 'Axle wind-up and tramp under hard acceleration', 'Inter-leaf friction makes the ride harsh on small bumps', 'Roll-steer and poor lateral location'],
    char: { 'Unsprung mass (axle)': '≈ 90–140 kg total', 'Camber gain': '0 ° (heave) — follows road in single-wheel bump', 'Roll-centre height': '≈ spring seat (high, 300–350 mm)', 'Wheel travel': '≈ 200–250 mm', 'Spring motion ratio': '1.0 (spring under axle)' },
    ratings: { comfort: 1, handling: 1, load: 5, packaging: 3, cost: 5, simplicity: 5 },
    preset: { ms: 520, mu: 70, ks: 60000, c: 3000, kt: 300000, mode: 'friction' },
    prep: 'Chock the front wheels and support the frame on stands ahead of the rear spring hangers. Support the axle separately with a trolley jack. Disconnect the brake hose (or the axle-mounted junction), ABS leads and the propshaft (mark the flange).',
    steps: [
      { t: 'Remove wheel nuts & both wheels', parts: ['wheelnuts', 'tyre', 'rim'], tool: '21 mm, breaker bar', torque: '160–200 N·m (LCV)', note: '' },
      { t: 'Remove brake drums', parts: ['drum'], tool: 'Adjuster tool, M8 jacking bolts', torque: '—', note: 'Back off the self-adjuster through the backing-plate slot if the drum has a wear lip.' },
      { t: 'Withdraw half-shafts', parts: ['halfshaft'], tool: 'Slide hammer, retainer bolts 14 mm', torque: 'Retainer 60–70 N·m', note: 'Semi-floating shaft: remove the retainer plate (or C-clip inside the diff), then pull. Catch the oil.' },
      { t: 'Remove dampers', parts: ['damper'], tool: '19 mm', torque: '70–90 N·m', note: 'Staggered dampers — one in front of the axle, one behind — reduce axle tramp.' },
      { t: 'Support axle, remove U-bolts', parts: ['ubolt'], tool: '22–24 mm deep socket', torque: 'Refit 140–200 N·m criss-cross; re-torque after 500 km', note: 'Always fit new U-bolts and nuts — they stretch on first tightening.', warn: 'Axle can roll or tip on the jack: use a cradle and a helper.' },
      { t: 'Lower axle & differential', parts: ['axlehousing', 'diff'], tool: 'Trolley jack / axle cradle', torque: '—', note: 'Remove the propshaft first (mark the flange). The diff carrier separates from the housing at the cover or the third-member flange.' },
      { t: 'Remove leaf springs', parts: ['leaf'], tool: '24 mm eye bolts', torque: 'Eye / shackle bolts 120–160 N·m — tighten at ride height', note: 'Remove the front eye bolt, then the shackle bolt. Springs weigh 20–35 kg each.' },
      { t: 'Remove shackles & bump stops', parts: ['shackle', 'bumpstop'], tool: '19 mm', torque: '90 N·m', note: 'Check the shackle bushes and hanger holes for wear and ovality.' }
    ]
  },
  {
    id: 'air', name: 'Air suspension (adaptive)', axle: 'Front · AWD luxury', build: buildAir, car: { kind: 'sedan', axle: 'front', wb: 3.0, R: 0.32, track: 0.76, real: [['front', 1]] },
    camera: { pos: [0.2, 1.35, 2.3], target: [0.35, 0.5, 0] },
    history: 'Cadillac Eldorado Brougham (1957). The modern electronic generation: Mercedes AIRMATIC (W220, 1998), Audi adaptive air (A8 D3, 2002).',
    used: 'Mercedes S/E-class, Audi A8 / Q7, Range Rover, Porsche Cayenne / Taycan, Tesla Model S / X, coaches and trucks.',
    desc: 'A double-wishbone corner whose coil spring is replaced by a rolling-lobe air spring around an adaptive (CDC) damper. A compressor, reservoir, valve block, height sensors and an ECU keep the ride height constant at any load and let the driver or ECU change it.',
    how: 'The spring force is pressure × effective area. Adding air raises the car; venting lowers it. Because the rate k ≈ n·p·A²/V rises with load, the natural frequency stays almost constant from empty to fully laden. The ECU levels slowly using the height sensors, and controls the CDC damper fast (about 1 kHz) with a skyhook strategy using body accelerometers.',
    pros: ['Constant ride height and natural frequency at any load', 'Selectable height: access, off-road, motorway lowering (aero)', 'Very low spring rate possible → superb comfort', 'Combines naturally with adaptive damping'],
    cons: ['Complexity and cost (compressor, valves, ECU, sensors)', 'Leaks and bellows ageing → "car sits down overnight"', 'Thermal limits on the compressor duty cycle', 'Special service procedures (depressurise, calibrate)'],
    char: { 'Unsprung mass / corner': '≈ 36–44 kg', 'Camber gain': '−0.8 to −1.4 °/50 mm (DW)', 'Ride height range': '± 25–50 mm', 'Ride frequency': '≈ 0.9–1.1 Hz at any load', 'Damper': 'CDC, 0.3–1.8 A' },
    ratings: { comfort: 5, handling: 4, load: 5, packaging: 3, cost: 1, simplicity: 1 },
    preset: { ms: 520, mu: 44, ks: 26000, c: 2600, kt: 250000, mode: 'air' },
    prep: 'Switch on "jack / workshop mode" with the diagnostic tool (or the infotainment menu) BEFORE lifting, so the system does not try to level. Lift the vehicle, then vent the air spring at the corner to be worked on via the tool or the residual-pressure valve.',
    steps: [
      { t: 'Workshop mode & depressurise corner', parts: [], tool: 'Diagnostic tool (ODIS / XENTRY), eye protection', torque: '—', note: 'Activate workshop / jack mode, then vent the air spring from the scan tool. The residual-pressure valve still holds about 2 bar in the bellows.', warn: 'Never undo an air line or strut while pressurised — line ends can whip, and dirt is blown in at high speed.' },
      { t: 'Remove wheel nuts & wheel', parts: ['wheelnuts', 'tyre', 'rim'], tool: '19 / 21 mm', torque: '120–140 N·m', note: '' },
      { t: 'Remove caliper & disc', parts: ['caliper', 'disc'], tool: '21 mm', torque: '190 N·m (fixed 6-pot)', note: '' },
      { t: 'Remove hub bearing', parts: ['hub'], tool: '4 bolts', torque: '80 N·m + 90°', note: '' },
      { t: 'Disconnect height-sensor link & drop link', parts: ['heightsensor', 'droplink'], tool: '10 mm, 16 mm', torque: '9 N·m / 60 N·m', note: 'Unclip the sensor link — never bend the lever. After refitting, run a ride-height calibration.' },
      { t: 'Disconnect air line, CDC connector & tie rod', parts: ['airlines', 'tierod'], tool: 'Voss fitting release, splitter', torque: 'Fitting 1.5–3 N·m (hand-tight + 1 turn)', note: 'Cap the open line and port immediately. Replace the fitting O-ring.' },
      { t: 'Remove air strut assembly', parts: ['cdc', 'airspring', 'topmount'], tool: '18 mm lower, 13 mm top', torque: 'Lower 90 N·m + 90° at ride height', note: 'Air struts are serviced as a unit (bellows and damper). Before the first fill, the strut must be held at installed length or the bellows will fold.', warn: 'Do not let the bellows inflate unconstrained — they can burst.' },
      { t: 'Remove upper wishbone & knuckle', parts: ['uca', 'knuckle', 'lbj'], tool: 'Splitter, 18 mm', torque: '55 / 100 N·m', note: '' },
      { t: 'Remove lower wishbone, ARB & bushings', parts: ['lca', 'arb', 'bushing'], tool: '21 mm', torque: '150 N·m at ride height', note: '' },
      { t: 'Remove supply side: valve block, compressor, reservoir, ECU', parts: ['valveblock', 'compressor', 'reservoir', 'ecu'], tool: '10 mm, air-line release tool', torque: '8–10 N·m', note: 'The compressor relay is a common failure — check it before condemning the compressor. Leak-test all fittings with soapy water after the refill.' }
    ]
  }
];
const SYS_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));
