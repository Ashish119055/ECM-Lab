/* Suspension Lab — materials and procedural geometry builders (Three.js).
   World frame: +X outboard (left-hand corner), +Y up, +Z forward. Units: metres. */
'use strict';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const MAT = {};

function initMaterials() {
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false; // treat hex colours as sRGB
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  Object.assign(MAT, {
    ecoat: P({ color: 0x25292e, metalness: 0.25, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
    steel: S({ color: 0xaab3bc, metalness: 0.92, roughness: 0.3 }),
    darkSteel: S({ color: 0x5f6770, metalness: 0.85, roughness: 0.42 }),
    zinc: S({ color: 0xc9c2a6, metalness: 0.9, roughness: 0.35 }),
    chrome: S({ color: 0xf4f7fa, metalness: 1, roughness: 0.05 }),
    alu: S({ color: 0xd3d9df, metalness: 0.9, roughness: 0.22 }),
    castAlu: S({ color: 0xb6bec6, metalness: 0.7, roughness: 0.52 }),
    iron: S({ color: 0x7c8289, metalness: 0.7, roughness: 0.62 }),
    rubber: S({ color: 0x1c1d1f, metalness: 0, roughness: 0.86 }),
    tyre: S({ color: 0x1e1f21, metalness: 0, roughness: 0.93 }),
    tyreSide: S({ color: 0x2a2b2e, metalness: 0, roughness: 0.8 }),
    spring: P({ color: 0xd0302a, metalness: 0.3, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    leaf: P({ color: 0x2b2f34, metalness: 0.45, roughness: 0.45, clearcoat: 0.4 }),
    damper: P({ color: 0x1d62c4, metalness: 0.35, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
    damperGold: P({ color: 0xe0a21a, metalness: 0.45, roughness: 0.3, clearcoat: 0.8 }),
    pu: S({ color: 0xe9b31a, roughness: 0.72 }),
    caliper: P({ color: 0xc8161d, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }),
    disc: S({ color: 0x9aa1a8, metalness: 0.88, roughness: 0.33 }),
    discHat: S({ color: 0x55595e, metalness: 0.6, roughness: 0.6 }),
    pad: S({ color: 0x5a4a3c, roughness: 0.9 }),
    oil: P({ color: 0xe0921b, metalness: 0, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
    gas: S({ color: 0x8fd0ff, transparent: true, opacity: 0.28, depthWrite: false }),
    air: S({ color: 0xa8e1ff, transparent: true, opacity: 0.18, depthWrite: false }),
    boot: S({ color: 0x2a2c30, roughness: 0.65 }),
    glass: S({ color: 0x8ea4ba, metalness: 0.1, roughness: 0.45, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
    brass: S({ color: 0xcfa43a, metalness: 0.9, roughness: 0.3 }),
    plastic: S({ color: 0x2b2f34, roughness: 0.55 }),
    ecu: S({ color: 0x3f464e, metalness: 0.7, roughness: 0.38 }),
    airline: S({ color: 0x1f7fd0, roughness: 0.45 }),
    grease: S({ color: 0x5c8d2e, roughness: 0.55 }),
    ball: S({ color: 0xe6ebf0, metalness: 1, roughness: 0.12 }),
    bellows: S({ color: 0x232527, roughness: 0.6 }),
    green: S({ color: 0x2b9a5a, roughness: 0.5 })
  });
  for (const m of Object.values(MAT)) if (m.transparent) m.side = THREE.DoubleSide;
}

/* ── primitives ─────────────────────────────────────────── */
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = !mat.transparent; m.receiveShadow = true;
  return m;
}
function grp(...kids) { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; }
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }
function cyl(r, h, mat, o = {}) {
  return mesh(new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 32, 1, !!o.open), mat);
}
/* Cylinder whose axis runs from a to b */
function rod(a, b, r, mat, seg = 20, r2) {
  const d = b.clone().sub(a); const L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2 ?? r, r, L, seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
function sph(r, mat, p) { const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat); if (p) m.position.copy(p); return m; }
function box(w, h, d, mat, p) { const m = mesh(new THREE.BoxGeometry(w, h, d), mat); if (p) m.position.copy(p); return m; }
function lathe(pts, mat, seg = 56) {
  return mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
}
function alignY(obj, dir) { obj.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); return obj; }
/* Point the object's local +Y along `dir` and place it at `p` */
function placeAxis(obj, p, dir) { obj.position.copy(p); return alignY(obj, dir); }
function pathTube(pts, r, mat, seg = 64, closed = false) {
  const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  return mesh(new THREE.TubeGeometry(c, seg, r, 12, closed), mat);
}
function torus(R, r, mat, arc = Math.PI * 2) { return mesh(new THREE.TorusGeometry(R, r, 12, 40, arc), mat); }
/* Thin plate (gusset) through three or more coplanar points */
function plate(points, t, mat) {
  const [a, b, c] = points;
  const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  const xA = b.clone().sub(a).normalize(); const yA = n.clone().cross(xA);
  const shape = new THREE.Shape(points.map((p) => { const d = p.clone().sub(a); return new THREE.Vector2(d.dot(xA), d.dot(yA)); }));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2 });
  g.translate(0, 0, -t / 2);
  const m = mesh(g, mat);
  const basis = new THREE.Matrix4().makeBasis(xA, yA, n);
  m.quaternion.setFromRotationMatrix(basis); m.position.copy(a);
  return m;
}
function bolt(p, dir, len, r, mat = MAT.zinc) {
  const g = grp(rod(V3(0, 0, 0), V3(0, len, 0), r, mat, 12));
  const head = cyl(r * 1.7, r * 1.2, mat, { seg: 6 }); head.position.y = 0; g.add(head);
  return placeAxis(g, p, dir);
}

/* ── helical coil spring (length can be updated without distorting the wire) ── */
function coilSpring({ R = 0.07, wire = 0.012, turns = 6.5, len = 0.3, mat = MAT.spring, seg = 420 }) {
  const dead = 0.85;
  const yAt = (th) => {
    const usable = len - wire; const d = wire * 1.05 / usable;
    let f;
    if (th < dead) f = (th / dead) * d;
    else if (th > turns - dead) f = 1 - d + ((th - (turns - dead)) / dead) * d;
    else f = d + ((th - dead) / (turns - 2 * dead)) * (1 - 2 * d);
    return wire / 2 + usable * f;
  };
  class Helix extends THREE.Curve {
    getPoint(t, tgt = new THREE.Vector3()) {
      const th = t * turns; const a = th * Math.PI * 2;
      return tgt.set(R * Math.cos(a), yAt(th), R * Math.sin(a));
    }
  }
  const radial = 10;
  const geo = new THREE.TubeGeometry(new Helix(), seg, wire / 2, radial, false);
  const pos = geo.attributes.position; const base = pos.array.slice();
  const pathY = []; for (let i = 0; i <= seg; i++) pathY.push(yAt((i / seg) * turns));
  const m = mesh(geo, mat);
  m.userData.restLen = len;
  m.userData.setLength = (L) => {
    const s = (L - wire) / (len - wire);
    for (let i = 0; i <= seg; i++) {
      const py = pathY[i]; const ny = wire / 2 + (py - wire / 2) * s;
      for (let j = 0; j <= radial; j++) { const k = (i * (radial + 1) + j) * 3; pos.array[k + 1] = ny + (base[k + 1] - py); }
    }
    pos.needsUpdate = true; geo.computeBoundingSphere();
  };
  return m;
}

/* ── damper: built along +Y from bottom mount (y = 0) to top mount (y = L) ── */
function damperUnit({ len, body = 0.4, rOut = 0.024, rod: rodR = 0.011, mat = MAT.damper, bottom = 'eye', seatAt = null, seatR = 0.08, cdc = false }) {
  const g = new THREE.Group();
  const outer = cyl(rOut, body, mat, { open: false }); outer.position.y = body / 2 + 0.02; outer.material = mat; g.add(outer);
  const inner = cyl(rOut * 0.68, body - 0.02, MAT.steel, { open: true }); inner.position.y = body / 2 + 0.02; g.add(inner);
  const oil = cyl(rOut * 0.66, body - 0.04, MAT.oil); oil.position.y = body / 2 + 0.02; g.add(oil);
  const resOil = lathe([[rOut * 0.72, 0.03], [rOut * 0.96, 0.03], [rOut * 0.96, body * 0.62], [rOut * 0.72, body * 0.62]], MAT.oil, 32); g.add(resOil);
  const resGas = lathe([[rOut * 0.72, body * 0.62], [rOut * 0.96, body * 0.62], [rOut * 0.96, body], [rOut * 0.72, body]], MAT.gas, 32); g.add(resGas);
  const baseValve = cyl(rOut * 0.66, 0.012, MAT.brass); baseValve.position.y = 0.035; g.add(baseValve);
  const cap = cyl(rOut * 0.75, 0.018, MAT.steel); cap.position.y = body + 0.028; g.add(cap);
  if (bottom === 'eye') { const eye = torus(0.02, 0.008, MAT.ecoat); eye.position.y = 0.0; g.add(eye); const bsh = cyl(0.013, 0.03, MAT.rubber); bsh.rotation.x = Math.PI / 2; g.add(bsh); g.add(at(cyl(rOut * 0.9, 0.02, mat), 0, 0.02, 0)); }
  if (bottom === 'clamp') { const br = box(0.06, 0.07, 0.03, MAT.ecoat); br.position.set(0, 0.045, -rOut - 0.01); g.add(br); }
  if (seatAt != null) { const seat = lathe([[rOut, seatAt - 0.01], [seatR, seatAt + 0.004], [seatR + 0.006, seatAt + 0.016], [seatR, seatAt + 0.012], [rOut, seatAt]], MAT.ecoat); g.add(seat); }
  if (cdc) { const v = cyl(0.022, 0.07, MAT.alu); v.rotation.z = Math.PI / 2; v.position.set(rOut + 0.03, body * 0.3, 0); g.add(v); g.add(at(box(0.03, 0.025, 0.03, MAT.plastic), rOut + 0.075, body * 0.3, 0)); }
  // moving rod group (top end is fixed at y = L)
  const rg = new THREE.Group();
  const rodLen = len - body + body * 0.55;
  const r = cyl(rodR, rodLen, MAT.chrome); r.position.y = rodLen / 2; rg.add(r);
  const piston = cyl(rOut * 0.66, 0.014, MAT.brass); piston.position.y = 0.008; rg.add(piston);
  for (let i = 0; i < 4; i++) { const sh = cyl(rOut * (0.5 - i * 0.06), 0.0018, MAT.steel); sh.position.y = 0.017 + i * 0.0022; rg.add(sh); }
  const nut = cyl(0.013, 0.01, MAT.zinc, { seg: 6 }); nut.position.y = rodLen + 0.006; rg.add(nut);
  g.add(rg);
  g.userData.setLength = (L) => { rg.position.y = L - rodLen; };
  g.userData.setLength(len);
  return g;
}

/* ── wheel end ──────────────────────────────────────────── */
/* Tyre: axis along +Y (call orientWheel to turn it). R outer, w width, rr rim radius */
function tyreMesh(R = 0.32, w = 0.22, rr = 0.215) {
  const h = w / 2; const g = 0.009;
  const outer = [
    [rr, -h * 0.86], [rr + 0.02, -h * 0.98], [R - 0.05, -h * 1.02], [R - 0.016, -h * 0.94], [R - 0.003, -h * 0.72],
    [R, -h * 0.6], [R, -h * 0.4], [R - g, -h * 0.38], [R - g, -h * 0.26], [R, -h * 0.24], [R, -0.012], [R - g, -0.01],
    [R - g, 0.01], [R, 0.012], [R, h * 0.24], [R - g, h * 0.26], [R - g, h * 0.38], [R, h * 0.4], [R, h * 0.6],
    [R - 0.003, h * 0.72], [R - 0.016, h * 0.94], [R - 0.05, h * 1.02], [rr + 0.02, h * 0.98], [rr, h * 0.86],
    [rr + 0.012, h * 0.78], [R - 0.06, h * 0.86], [R - 0.022, h * 0.6], [R - 0.022, -h * 0.6], [R - 0.06, -h * 0.86], [rr + 0.012, -h * 0.78], [rr, -h * 0.86]
  ];
  const t = lathe(outer, MAT.tyre, 96);
  t.material = MAT.tyre;
  return t;
}
function rimMesh(rr = 0.215, w = 0.2, spokes = 5, pcd = 0.056) {
  const h = w / 2; const g = new THREE.Group();
  const barrel = lathe([
    [rr + 0.012, -h], [rr + 0.012, -h + 0.008], [rr - 0.004, -h + 0.016], [rr - 0.006, -h + 0.04], [rr - 0.035, -h + 0.06],
    [rr - 0.035, 0.0], [rr - 0.006, h - 0.04], [rr - 0.004, h - 0.016], [rr + 0.012, h - 0.008], [rr + 0.012, h],
    [rr + 0.002, h], [rr - 0.012, h - 0.02], [rr - 0.045, 0.0], [rr - 0.045, -h + 0.06], [rr - 0.012, -h + 0.02], [rr + 0.002, -h]
  ], MAT.alu, 96);
  g.add(barrel);
  const face = 0.04; // ET40: hub mounting face 40 mm outboard of the rim centre-line
  const hub = lathe([[0.03, face - 0.01], [0.085, face - 0.01], [0.09, face + 0.012], [0.075, face + 0.022], [0.03, face + 0.022]], MAT.alu, 48);
  g.add(hub);
  for (let i = 0; i < spokes; i++) {
    for (const off of [-0.11, 0.11]) {
      const a = (i / spokes) * Math.PI * 2 + off;
      const p1 = V3(Math.cos(a) * 0.075, face + 0.006, Math.sin(a) * 0.075);
      const p2 = V3(Math.cos(a + off * 0.25) * (rr - 0.03), face - 0.012, Math.sin(a + off * 0.25) * (rr - 0.03));
      const s = rod(p1, p2, 0.012, MAT.alu, 10, 0.009); s.scale.set(1.25, 1, 0.75); g.add(s);
    }
  }
  const capC = cyl(0.03, 0.012, MAT.chrome); capC.position.y = face + 0.024; g.add(capC);
  g.userData.face = face; g.userData.pcd = pcd;
  return g;
}
function nutsMesh(n = 5, pcd = 0.056, y = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const nut = grp(cyl(0.0105, 0.018, MAT.chrome, { seg: 6 }), at(cyl(0.007, 0.006, MAT.chrome, { r2: 0.009 }), 0, 0.012, 0));
    nut.position.set(Math.cos(a) * pcd, y, Math.sin(a) * pcd); g.add(nut);
  }
  return g;
}
function discMesh(R = 0.15, t = 0.026, hatH = 0.045) {
  const g = new THREE.Group(); const ri = R * 0.58; const pl = t * 0.3;
  g.add(lathe([[ri, -t / 2], [R, -t / 2], [R, -t / 2 + pl], [ri, -t / 2 + pl]], MAT.disc, 72));
  g.add(lathe([[ri, t / 2 - pl], [R, t / 2 - pl], [R, t / 2], [ri, t / 2]], MAT.disc, 72));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const v = box((R - ri) * 0.92, t - 2 * pl, 0.006, MAT.discHat);
    v.position.set(Math.cos(a) * (R + ri) / 2, 0, Math.sin(a) * (R + ri) / 2); v.rotation.y = -a + 0.25; g.add(v);
  }
  g.add(lathe([[ri, t / 2], [ri + 0.004, t / 2], [ri * 0.95, t / 2 + hatH], [0.035, t / 2 + hatH], [0.035, t / 2 + hatH - 0.007], [ri * 0.95 - 0.007, t / 2 + hatH - 0.007], [ri - 0.004, t / 2]], MAT.discHat, 64));
  return g;
}
function drumMesh(R = 0.15, w = 0.07) {
  const g = new THREE.Group();
  g.add(lathe([[R, -w / 2], [R + 0.01, -w / 2], [R + 0.012, w / 2 - 0.01], [R * 0.6, w / 2], [0.04, w / 2], [0.04, w / 2 - 0.008], [R - 0.006, w / 2 - 0.012], [R - 0.006, -w / 2]], MAT.iron, 64));
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const f = box(0.006, w * 0.7, 0.012, MAT.iron); f.position.set(Math.cos(a) * (R + 0.012), -0.004, Math.sin(a) * (R + 0.012)); f.rotation.y = -a; g.add(f); }
  return g;
}
function hubMesh(studs = 5, pcd = 0.056) {
  const g = new THREE.Group();
  const body = cyl(0.046, 0.075, MAT.steel, { open: true }); body.position.y = -0.03; g.add(body);
  const innerRace = cyl(0.026, 0.075, MAT.steel); innerRace.position.y = -0.03; g.add(innerRace);
  for (const yy of [-0.05, -0.012]) for (let i = 0; i < 13; i++) { const a = (i / 13) * Math.PI * 2; g.add(sph(0.0085, MAT.ball, V3(Math.cos(a) * 0.036, yy, Math.sin(a) * 0.036))); }
  const fl = lathe([[0.03, 0.008], [0.072, 0.008], [0.072, 0.02], [0.03, 0.02]], MAT.steel, 48); g.add(fl);
  const enc = lathe([[0.046, -0.07], [0.05, -0.07], [0.05, -0.064], [0.046, -0.064]], MAT.plastic, 48); g.add(enc);
  for (let i = 0; i < studs; i++) { const a = (i / studs) * Math.PI * 2; const s = cyl(0.0065, 0.05, MAT.zinc, { seg: 10 }); s.position.set(Math.cos(a) * pcd, 0.04, Math.sin(a) * pcd); g.add(s); }
  return g;
}
/* Caliper straddling the disc edge. ang = position angle around the wheel axis (0 = +Z forward, π/2 = up) */
function caliperMesh(discR = 0.15, ang = 2.4) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const rc = discR - 0.025;
  const shape = new THREE.Shape(); const w = 0.13, h = 0.06, r = 0.018;
  shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const ex = new THREE.ExtrudeGeometry(shape, { depth: 0.085, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3 });
  ex.translate(0, 0, -0.0425);
  const bm = mesh(ex, MAT.caliper); bm.rotation.x = Math.PI / 2; body.add(bm); // extrusion along Y (wheel axis)
  const pist = cyl(0.028, 0.03, MAT.caliper); pist.position.set(0, -0.055, 0); body.add(pist);
  body.add(at(box(0.11, 0.008, 0.05, MAT.pad), 0, -0.022, 0)); body.add(at(box(0.11, 0.008, 0.05, MAT.pad), 0, 0.022, 0));
  body.add(at(box(0.11, 0.05, 0.012, MAT.ecoat), 0, -0.025, -0.045));
  body.add(at(cyl(0.004, 0.02, MAT.brass), 0.03, -0.06, 0.02));
  // tangential direction around axis
  body.position.set(Math.cos(ang) * rc, 0, Math.sin(ang) * rc);
  body.rotation.y = -ang + Math.PI / 2;
  g.add(body);
  return g;
}
/* Turn an axis-Y wheel-end object so its +Y points along +X (sx = 1) or −X (sx = −1), placed at p */
function orientWheel(obj, p, sx = 1) { obj.rotation.set(0, 0, -sx * Math.PI / 2); obj.position.copy(p); return obj; }

/* ── joints ─────────────────────────────────────────────── */
function bushingMesh(p, axis, rOut = 0.03, len = 0.05) {
  const g = new THREE.Group();
  g.add(cyl(rOut, len, MAT.steel, { open: true }));
  g.add(lathe([[rOut * 0.42, -len / 2], [rOut * 0.97, -len / 2 + 0.004], [rOut * 0.97, len / 2 - 0.004], [rOut * 0.42, len / 2]], MAT.rubber, 40));
  g.add(cyl(rOut * 0.4, len + 0.012, MAT.zinc, { open: true }));
  g.add(at(cyl(rOut * 0.18, len + 0.04, MAT.zinc), 0, 0, 0));
  return placeAxis(g, p, axis);
}
function ballJointMesh(p, up = UP, stud = 0.05) {
  const g = new THREE.Group();
  g.add(lathe([[0.002, -0.022], [0.026, -0.022], [0.028, 0.0], [0.022, 0.012], [0.017, 0.012], [0.017, 0.0], [0.002, 0.0]], MAT.ecoat, 40));
  g.add(sph(0.016, MAT.ball, V3(0, -0.005, 0)));
  g.add(lathe([[0.017, -0.02], [0.02, -0.018], [0.02, 0.008], [0.017, 0.008]], MAT.plastic, 32));
  g.add(at(cyl(0.011, stud, MAT.zinc, { r2: 0.008 }), 0, stud / 2 + 0.005, 0));
  g.add(lathe([[0.022, 0.008], [0.03, 0.016], [0.026, 0.028], [0.014, 0.036], [0.012, 0.04]], MAT.rubber, 32));
  g.add(at(cyl(0.013, 0.012, MAT.zinc, { seg: 6 }), 0, stud + 0.002, 0));
  return placeAxis(g, p, up);
}
/* Tube-arm between two points with eye ends */
function linkMesh(a, b, r = 0.014, mat = MAT.ecoat) {
  const g = new THREE.Group();
  g.add(rod(a, b, r, mat, 16));
  return g;
}
/* Wishbone / A-arm from pivots to outer point */
function wishbone(pivots, outer, r = 0.017, mat = MAT.ecoat, plateT = 0.008) {
  const g = new THREE.Group();
  pivots.forEach((p) => g.add(rod(p, outer, r, mat, 18, r * 0.82)));
  if (pivots.length === 2) {
    const [a, b] = pivots;
    const pa = a.clone().lerp(outer, 0.18); const pb = b.clone().lerp(outer, 0.18);
    const pc = outer.clone().lerp(a.clone().lerp(b, 0.5), 0.12);
    g.add(plate([pa, pb, pc], plateT, mat));
    g.add(rod(a, b, r * 0.55, mat, 10));
  }
  pivots.forEach((p) => g.add(sph(r * 1.25, mat, p)));
  g.add(sph(r * 1.5, mat, outer));
  return g;
}

/* Deformable leaf (box with segments along Z); arch callback y(z) applied to base y */
function leafMesh(len, w, t, mat = MAT.leaf, segs = 48) {
  const geo = new THREE.BoxGeometry(w, t, len, 1, 1, segs);
  const pos = geo.attributes.position; const base = pos.array.slice();
  const m = mesh(geo, mat);
  m.userData.bend = (fy) => {
    for (let i = 0; i < pos.count; i++) { const z = base[i * 3 + 2]; pos.array[i * 3 + 1] = base[i * 3 + 1] + fy(z); }
    pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  return m;
}

/* Rolling-lobe air spring built along +Y from 0 to len */
function airSpringMesh(len = 0.3, R = 0.075, pistonR = 0.05) {
  const g = new THREE.Group();
  const bell = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push([R + 0.006 * Math.sin(t * Math.PI), 0.06 + t * 0.86]); }
  prof.push([R - 0.01, 0.94]); prof.push([pistonR * 0.6, 0.96]);
  const lobe = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (i / 10); lobe.push([pistonR + (R - pistonR) / 2 + Math.cos(a) * (R - pistonR) / 2, 0.06 - Math.sin(a) * 0.04]); }
  const bellows = lathe([...lobe.reverse(), ...prof], MAT.bellows, 64); bellows.material = MAT.bellows;
  bell.add(bellows);
  const airIn = lathe([[0.0, 0.07], [R - 0.008, 0.07], [R - 0.008, 0.92], [0, 0.92]], MAT.air, 40); bell.add(airIn);
  bell.scale.y = len; g.add(bell);
  const capT = lathe([[0, len], [R + 0.01, len], [R + 0.012, len + 0.02], [0.03, len + 0.035], [0, len + 0.035]], MAT.alu, 48); g.add(capT);
  const fitting = cyl(0.008, 0.03, MAT.brass); fitting.position.set(0.04, len + 0.045, 0); g.add(fitting);
  const piston = lathe([[0.012, -0.12], [pistonR, -0.12], [pistonR + 0.004, -0.02], [pistonR, 0.04], [0.012, 0.04]], MAT.castAlu, 48); g.add(piston);
  const guide = lathe([[R + 0.012, len * 0.25], [R + 0.016, len * 0.25], [R + 0.016, len * 0.72], [R + 0.012, len * 0.72]], MAT.alu, 48); g.add(guide);
  g.userData.setLength = (L) => {
    bell.scale.y = L; capT.position.y = L - len; fitting.position.y = L + 0.045; guide.scale.y = L / len;
  };
  return g;
}
