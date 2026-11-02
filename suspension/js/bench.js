/* Suspension Lab — 3D tear-down bench: renderer, orbit camera, picking, explode/teardown animation,
   live kinematics, half-section view and BOM balloons. */
'use strict';

const Bench = (() => {
  let leaderSvg, renderer, scene, camera, root, ground, grid, keyLight, container, balloonLayer, tip, road, car = null, spinList = [], spinA = 0;
  let wideMode = true;
  const SPIN = new Set(['tyre', 'rim', 'wheelnuts', 'disc', 'drum', 'hub']);
  let sysDef = null, built = null, bodies = {}, parts = [], partById = {}, pickables = [];
  let lastT = performance.now(), clock = 0, needKin = true;
  const st = {
    hl: new Set(), showBody: true, drive: false, spin: false, allNames: false,
    s: 0, sTarget: 0, cycle: false, section: false, balloons: false, hideRemoved: false, isolate: false,
    autoRot: false, selected: null, hover: null, dark: false, frozen: false
  };
  const cam = { target: V3(0.5, 0.45, 0), r: 2.8, th: 0.8, ph: 1.15, dTarget: V3(0.5, 0.45, 0), dr: 2.8, dth: 0.8, dph: 1.15 };
  const tmpBox = new THREE.Box3(), tmpV = new THREE.Vector3();
  const api = { onSelect: null, onFrame: null, onLabel: null, st, nameOf: (p) => p.name, descOf: () => '' };

  /* ── environment ────────────────────────────────────────── */
  function makeEnv() {
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: 0x1c2026, side: THREE.BackSide }));
    room.position.y = 2; es.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0x101214 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.99; es.add(floor);
    const panel = (w, h, x, y, z, ry, rx, k) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 1.02) });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); es.add(p);
    };
    panel(4, 0.6, 0, 4.9, 0, 0, Math.PI / 2, 3.2);
    panel(3, 0.5, -1.5, 4.9, 2, 0, Math.PI / 2, 2.2);
    panel(2.5, 2, 4.9, 2, 0, -Math.PI / 2, 0, 1.6);
    panel(2.5, 1.6, -4.9, 1.5, -1, Math.PI / 2, 0, 0.9);
    panel(3, 1.2, 0, 2, -4.9, 0, 0, 1.0);
    panel(3, 1.2, 1, 1.5, 4.9, Math.PI, 0, 1.2);
    const tex = pm.fromScene(es, 0.035).texture;
    pm.dispose();
    return tex;
  }

  function init(el) {
    container = el;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3D suspension model. Drag to orbit, scroll or pinch to zoom, right-drag or two fingers to pan. Click a part for details.');
    renderer.domElement.tabIndex = 0;

    scene = new THREE.Scene();
    scene.environment = makeEnv();
    camera = new THREE.PerspectiveCamera(34, 1, 0.02, 40);

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30302c, 0.35));
    keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
    keyLight.position.set(2.4, 4.2, 2.6); keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    Object.assign(keyLight.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 10 });
    keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.55); fill.position.set(-3, 2, -2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe2c0, 0.6); rim.position.set(-1, 1.5, 4); scene.add(rim);

    ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    grid = new THREE.PolarGridHelper(3, 16, 12, 64, 0x8894a0, 0x8894a0);
    grid.material.transparent = true; grid.material.opacity = 0.22; grid.position.y = 0.001; scene.add(grid);

    root = new THREE.Group(); scene.add(root);
    road = makeRoad(); road.visible = false; scene.add(road);

    balloonLayer = document.createElement('div'); balloonLayer.className = 'balloons'; el.appendChild(balloonLayer);
    leaderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaderSvg.setAttribute('class', 'leaders'); el.insertBefore(leaderSvg, balloonLayer);
    tip = document.createElement('div'); tip.className = 'tip3d'; tip.hidden = true; el.appendChild(tip);

    bindControls(renderer.domElement);
    new ResizeObserver(resize).observe(el); resize();
    requestAnimationFrame(loop);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function setTheme(dark) {
    st.dark = dark;
    ground.material.opacity = dark ? 0.45 : 0.2;
    grid.material.color = new THREE.Color(dark ? 0x7d8a98 : 0x8894a0); grid.material.opacity = dark ? 0.18 : 0.25;
    renderer.toneMappingExposure = dark ? 1.15 : 1.05;
  }

  /* ── load a system ─────────────────────────────────────── */
  function clear() {
    root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((m) => m.dispose()); } });
    root.clear(); bodies = {}; parts = []; partById = {}; pickables = []; balloonLayer.innerHTML = ''; leaderSvg.innerHTML = '';
  }
  function load(def) {
    clear(); sysDef = def; built = def.build();
    built.parts.forEach((p, i) => {
      p.n = i + 1; p.t = 0; p.tt = 0; p.mats = []; p.holders = [];
      p.plane = new THREE.Plane(V3(0, 0, -1), 0);
      p.pieces.forEach((pc) => {
        const holder = new THREE.Group(); holder.userData.ex = pc.ex; pc.holder = holder; p.holders.push(holder);
        holder.add(pc.obj);
        if (pc.kind === 'rigid') bodyGroup(pc.body).add(holder); else root.add(holder);
        pc.obj.traverse((o) => {
          if (!o.isMesh) return;
          o.material = o.material.clone();
          o.material.userData.base = { transparent: o.material.transparent, opacity: o.material.opacity, depthWrite: o.material.depthWrite, side: o.material.side };
          p.mats.push(o.material); o.userData.part = p; pickables.push(o);
        });
      });
      const b = document.createElement('button'); b.className = 'balloon'; b.textContent = p.n; b.title = p.name; b.tabIndex = -1;
      b.addEventListener('click', () => select(p.id, true)); balloonLayer.appendChild(b); p.balloon = b;
      const lb = document.createElement('button'); lb.className = 'plabel'; lb.hidden = true; lb.tabIndex = -1;
      lb.addEventListener('click', () => api.onLabel && api.onLabel(p.id)); balloonLayer.appendChild(lb); p.label = lb;
      partById[p.id] = p; parts.push(p);
    });
    car = def.car ? carBody(def.car) : null; spinList = [];
    if (car) {
      root.add(car); car.visible = st.showBody;
      car.userData.spinners.forEach(([o, sx]) => spinList.push({ obj: o, q0: o.quaternion.clone(), sx }));
      const zf = def.car.axle === 'front' ? 0 : def.car.wb; road.position.z = zf - def.car.wb / 2; road.position.x = -1.1; // keep-left: centre line on the vehicle's right
    }
    road.visible = !!car && st.showBody;
    built.parts.forEach((p) => { if (SPIN.has(p.info)) p.pieces.forEach((pc) => spinList.push({ obj: pc.obj, q0: pc.obj.quaternion.clone(), sx: pc.sx || 1 })); });
    st.s = 0; st.sTarget = 0; st.cycle = false; st.selected = null; st.hover = null; st.isolate = false; st.hl = new Set();
    applySection(); applyGhost(); needKin = true;
    resetView(true);
    return built;
  }
  function bodyGroup(name) {
    if (!bodies[name]) { const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g); bodies[name] = g; }
    return bodies[name];
  }

  /* ── kinematics update ─────────────────────────────────── */
  let lastSol = null;
  function kin() {
    const sol = built.solve(st.s); lastSol = sol;
    for (const [n, g] of Object.entries(bodies)) { const m = sol.mats[n] || new THREE.Matrix4(); g.matrix.copy(m); g.matrixWorldNeedsUpdate = true; }
    for (const p of parts) for (const pc of p.pieces) {
      if (pc.kind === 'span') {
        const a = pc.a[1].clone().applyMatrix4(sol.mats[pc.a[0]]), b = pc.b[1].clone().applyMatrix4(sol.mats[pc.b[0]]);
        const d = b.clone().sub(a); const L = d.length();
        pc.obj.position.copy(a); pc.obj.quaternion.setFromUnitVectors(UP, d.normalize());
        pc.obj.userData.setLength && pc.obj.userData.setLength(L);
      } else if (pc.kind === 'dyn') pc.update({ s: st.s, pose: sol.pose });
    }
  }
  function springLen(s) {
    const sp = built.springSpans[0]; if (!sp) return null;
    if (sp === 'leaf') return 0.4 - s;
    const sol = built.solve(s);
    return sp[0][1].clone().applyMatrix4(sol.mats[sp[0][0]]).distanceTo(sp[1][1].clone().applyMatrix4(sol.mats[sp[1][0]]));
  }
  function readouts() {
    const pose = lastSol.pose; const h = 0.002;
    const mr = (springLen(st.s - h) - springLen(st.s + h)) / (2 * h);
    return { s: st.s, camber: pose.camber, halfTrack: pose.halfTrack, rcH: pose.rcH, mr, springLen: springLen(st.s), dz: pose.dz ?? 0 };
  }

  /* ── teardown state ────────────────────────────────────── */
  function setRemoved(ids) {
    const set = new Set(ids);
    parts.forEach((p) => { if (p.pieces[0] && p.pieces[0].ex.lengthSq() > 0) p.tt = set.has(p.id) ? 1 : 0; });
    if (set.size) { st.cycle = false; st.sTarget = 0; }
  }
  const anyRemoved = () => parts.some((p) => p.tt > 0 || p.t > 0.002);

  /* ── visual modes ──────────────────────────────────────── */
  function applySection() {
    parts.forEach((p) => p.mats.forEach((m) => {
      const on = st.section && p.cut;
      m.clippingPlanes = on ? [p.plane] : null;
      m.side = on ? THREE.DoubleSide : m.userData.base.side;
      m.clipShadows = on; m.needsUpdate = true;
    }));
  }
  function applyGhost() {
    parts.forEach((p) => {
      const ghost = st.isolate && st.selected && p.id !== st.selected;
      p.mats.forEach((m) => {
        const b = m.userData.base;
        if (ghost) { m.transparent = true; m.opacity = Math.min(b.opacity, 0.1); m.depthWrite = false; }
        else { m.transparent = b.transparent; m.opacity = b.opacity; m.depthWrite = b.depthWrite; }
        m.needsUpdate = true;
      });
    });
  }
  function setEmissive(p, color, k) {
    if (!p) return;
    p.mats.forEach((m) => { if (m.emissive) { m.emissive.setHex(color); m.emissiveIntensity = k; } });
  }
  function select(id, focus, quiet) {
    if (st.selected && partById[st.selected]) setEmissive(partById[st.selected], 0x000000, 0);
    st.selected = id && partById[id] ? id : null;
    parts.forEach((p) => p.balloon.classList.toggle('sel', p.id === st.selected));
    applyGhost();
    if (focus && st.selected) focusPart(st.selected);
    api.onSelect && api.onSelect(st.selected, quiet);
  }
  function partCenter(p, out) {
    tmpBox.makeEmpty();
    p.holders.forEach((h) => { if (h.visible) tmpBox.expandByObject(h); });
    return tmpBox.isEmpty() ? null : tmpBox.getCenter(out);
  }
  function fit(k = 1) {
    const box = new THREE.Box3();
    parts.forEach((p) => p.holders.forEach((h) => { if (h.visible) box.expandByObject(h); }));
    if (box.isEmpty()) return;
    const c = box.getCenter(V3(0, 0, 0)); const r = box.getSize(V3(0, 0, 0)).length() / 2;
    const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    cam.dTarget.copy(c); cam.dr = clampR(r / Math.sin(half) * 0.82 * k);
  }
  function focusPart(id) { const c = partCenter(partById[id], V3(0, 0, 0)); if (c) cam.dTarget.copy(c); }

  /* ── camera ────────────────────────────────────────────── */
  function resetView(snap) {
    const c = sysDef.camera; const pos = A3(c.pos), tg = A3(c.target);
    const d = pos.clone().sub(tg); const r = d.length() * Math.max(1, Math.min(1.45, 1.15 / (camera.aspect || 1.3)));
    cam.dTarget.copy(tg); cam.dr = r; cam.dth = Math.atan2(d.x, d.z); cam.dph = Math.acos(d.y / r);
    if (snap) { cam.target.copy(tg); cam.r = r; cam.th = cam.dth; cam.ph = cam.dph; }
  }
  function updateCamera(dt) {
    if (st.autoRot) cam.dth += dt * 0.25;
    const k = 1 - Math.exp(-dt * 10);
    cam.target.lerp(cam.dTarget, k); cam.r += (cam.dr - cam.r) * k; cam.th += (cam.dth - cam.th) * k; cam.ph += (cam.dph - cam.ph) * k;
    const sp = Math.sin(cam.ph);
    camera.position.set(cam.target.x + cam.r * sp * Math.sin(cam.th), cam.target.y + cam.r * Math.cos(cam.ph), cam.target.z + cam.r * sp * Math.cos(cam.th));
    camera.lookAt(cam.target);
  }
  function bindControls(el) {
    const ptrs = new Map(); let mode = null, moved = 0, last = null, pinch = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; last = { x: e.clientX, y: e.clientY };
      mode = (e.button === 2 || e.shiftKey || e.ctrlKey) ? 'pan' : 'rot';
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; mode = 'pinch'; }
    });
    el.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) { hoverAt(e); return; }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cam.dr = clampR(cam.dr * pinch.d / Math.max(d, 1)); pan(m.x - pinch.m.x, m.y - pinch.m.y); pinch = { d, m }; moved += 10; return;
      }
      const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; moved += Math.abs(dx) + Math.abs(dy);
      if (mode === 'rot') { cam.dth -= dx * 0.008; cam.dph = Math.min(Math.PI * 0.49, Math.max(0.12, cam.dph - dy * 0.006)); }
      else if (mode === 'pan') pan(dx, dy);
      tip.hidden = true;
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0) { if (moved < 6 && mode !== 'pinch') pickAt(e); mode = null; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (!ptrs.size) { setHover(null); tip.hidden = true; } });
    el.addEventListener('wheel', (e) => { e.preventDefault(); cam.dr = clampR(cam.dr * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    el.addEventListener('keydown', (e) => {
      const k = e.key; let used = true;
      if (k === 'ArrowLeft') cam.dth -= 0.15; else if (k === 'ArrowRight') cam.dth += 0.15;
      else if (k === 'ArrowUp') cam.dph = Math.max(0.12, cam.dph - 0.1); else if (k === 'ArrowDown') cam.dph = Math.min(1.53, cam.dph + 0.1);
      else if (k === '+' || k === '=') cam.dr = clampR(cam.dr * 0.9); else if (k === '-') cam.dr = clampR(cam.dr * 1.1);
      else used = false;
      if (used) e.preventDefault();
    });
  }
  const clampR = (r) => Math.min(11, Math.max(0.35, r));
  function pan(dx, dy) {
    const s = cam.r * 0.0011;
    const right = V3(Math.cos(cam.th), 0, -Math.sin(cam.th));
    const upv = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    cam.dTarget.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
  }
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  function hitAt(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false).filter((h) => {
      const p = h.object.userData.part; if (!visibleMesh(h.object)) return false;
      if (st.isolate && st.selected && p.id !== st.selected) return false;
      if (st.section && p.cut && p.plane.distanceToPoint(h.point) < 0) return false;
      return true;
    });
    const solid = hits.find((h) => !h.object.material.userData.base.transparent);
    return (solid || hits[0])?.object.userData.part || null;
  }
  function visibleMesh(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function setHover(p) {
    if (st.hover === p) return;
    if (st.hover && st.hover.id !== st.selected) setEmissive(st.hover, 0, 0);
    st.hover = p;
    if (p && p.id !== st.selected) setEmissive(p, 0x3a7bd5, 0.35);
    renderer.domElement.style.cursor = p ? 'pointer' : 'grab';
  }
  let hoverPending = null;
  function hoverAt(e) { hoverPending = e; }
  function doHover() {
    const e = hoverPending; hoverPending = null; if (!e) return;
    const p = hitAt(e); setHover(p);
    if (p) { const r = container.getBoundingClientRect(); tip.hidden = false; tip.textContent = `${p.n}. ${api.nameOf(p)}`; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; }
    else tip.hidden = true;
  }
  function pickAt(e) { const p = hitAt(e); select(p ? p.id : null, false); }

  /* ── main loop ─────────────────────────────────────────── */
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; clock += dt;
    if (!built || !container.getClientRects().length) return;
    doHover();
    // teardown animation
    wideMode = container.clientWidth >= 700;
    let moving = false;
    for (const p of parts) {
      if (Math.abs(p.tt - p.t) > 0.0005) { p.t += (p.tt - p.t) * (1 - Math.exp(-dt * 5)); moving = true; } else p.t = p.tt;
      const e = p.t * p.t * (3 - 2 * p.t);
      p.holders.forEach((h) => { h.position.copy(h.userData.ex).multiplyScalar(e); h.visible = !(st.hideRemoved && p.t > 0.97); });
      const gone = st.hideRemoved && p.t > 0.97;
      const call = st.allNames && wideMode && p.explode; // side callout with leader line
      p.balloon.hidden = !(st.balloons || (st.allNames && !wideMode && p.explode)) || gone || p.id === st.selected || st.hl.has(p.id) || call;
      p.label.hidden = gone || !(p.id === st.selected || st.hl.has(p.id) || call);
      p.call = call && p.id !== st.selected;
    }
    // travel
    const locked = anyRemoved();
    if (st.cycle && !locked) st.sTarget = 0.075 * Math.sin(clock * 2 * Math.PI * 0.45);
    if (st.drive && !locked) { const ph = clock % 4.2; st.sTarget = 0.018 * Math.sin(clock * 5.3) + 0.01 * Math.sin(clock * 13.1 + 1) + (ph < 0.5 ? 0.065 * Math.sin(ph / 0.5 * Math.PI) : 0) + (ph > 2.1 && ph < 2.6 ? -0.045 * Math.sin((ph - 2.1) / 0.5 * Math.PI) : 0); }
    if ((st.drive || st.spin) && !locked) {
      spinA += dt * 6; const q = new THREE.Quaternion();
      spinList.forEach((w) => { q.setFromAxisAngle(UP, w.sx * spinA); w.obj.quaternion.copy(w.q0).multiply(q); });
      if (road.visible) road.userData.tex.offset.y -= dt * 0.48;
    }
    if (locked) st.sTarget = 0;
    const ds = (st.sTarget - st.s) * (1 - Math.exp(-dt * 9));
    if (Math.abs(ds) > 1e-6 || needKin || moving) { st.s += ds; kin(); needKin = false; }
    // selection pulse
    if (st.selected) setEmissive(partById[st.selected], 0xff8a1a, 0.22 + 0.14 * Math.sin(clock * 4));
    st.hl.forEach((id) => { if (id !== st.selected && partById[id]) setEmissive(partById[id], 0x14b8ff, 0.3 + 0.2 * Math.sin(clock * 5)); });
    updateCamera(dt);
    // section planes face away from the camera
    if (st.section) {
      const toward = Math.sign(camera.position.z - cam.target.z) || 1;
      parts.forEach((p) => { if (!p.cut) return; const c = partCenter(p, tmpV); if (!c) return; p.plane.normal.set(0, 0, -toward); p.plane.constant = toward * c.z; });
    }
    renderer.render(scene, camera);
    placeBalloons();
    api.onFrame && api.onFrame(readouts(), locked);
  }
  function placeBalloons() {
    const w = container.clientWidth, h = container.clientHeight; const boxes = [], calls = [];
    for (const p of parts) {
      if (p.balloon.hidden && p.label.hidden) continue;
      const c = partCenter(p, tmpV); if (!c) { p.balloon.hidden = true; p.label.hidden = true; continue; }
      c.project(camera);
      if (c.z > 1) { p.balloon.hidden = true; p.label.hidden = true; continue; }
      const x = ((c.x + 1) / 2) * w, y = ((1 - c.y) / 2) * h;
      if (!p.balloon.hidden) p.balloon.style.transform = `translate(${x}px, ${y}px)`;
      if (!p.label.hidden) {
        const sel = p.id === st.selected; const key = api.nameOf(p) + (sel ? '|s' : '') + (st.allNames ? '|m' : '');
        if (p.label.dataset.key !== key) {
          p.label.dataset.key = key;
          const d = sel ? api.descOf(p) : '';
          p.label.innerHTML = `<b><i>${p.n}</i>${esc3(api.nameOf(p))}</b>${d ? `<span>${esc3(d)}</span>` : ''}`;
          p.label.classList.toggle('sel', sel); p.label.classList.toggle('mini', !sel && st.allNames && !st.hl.has(p.id));
          p.label._w = p.label.offsetWidth; p.label._h = p.label.offsetHeight;
        }
        if (p.call) { calls.push({ p, x, y, w: p.label._w, h: p.label._h }); continue; }
        boxes.push({ p, x, y, w: p.label._w, h: p.label._h, pri: sel ? 2 : st.hl.has(p.id) ? 1 : 0 });
      }
    }
    // place important labels first, then push others down until they no longer overlap
    boxes.sort((a, b) => b.pri - a.pri || a.y - b.y);
    const placed = [];
    for (const bx of boxes) {
      let lx = Math.max(6, Math.min(w - bx.w - 6, bx.x - bx.w / 2)), ly = Math.max(6, Math.min(h - bx.h - 6, bx.y - bx.h - 14));
      for (let k = 0; k < 14; k++) {
        const hit = placed.find((o) => lx < o.x + o.w + 3 && lx + bx.w + 3 > o.x && ly < o.y + o.h + 3 && ly + bx.h + 3 > o.y);
        if (!hit) break;
        ly = hit.y + hit.h + 4; if (ly + bx.h > h - 6) { ly = Math.max(6, hit.y - bx.h - 4); lx = Math.min(w - bx.w - 6, hit.x + hit.w + 4); }
      }
      placed.push({ x: lx, y: ly, w: bx.w, h: bx.h });
      bx.p.label.style.transform = `translate(${lx}px, ${ly}px)`;
      bx.p.label.classList.toggle('far', Math.abs(ly + bx.h - bx.y) > 40);
    }
    // exploded-drawing callouts: two columns at the sides, ordered by height, joined by leader lines
    let svg = '';
    if (calls.length) {
      const cols = [calls.filter((c) => c.x < w / 2), calls.filter((c) => c.x >= w / 2)];
      cols.forEach((col, side) => {
        col.sort((a, b2) => a.y - b2.y);
        const top = 64, bot = h - 8; const gap = col.length ? Math.min(30, (bot - top) / col.length) : 30;
        let y = top; const ys = col.map((c) => { y = Math.max(y, c.y - c.h / 2); const v = y; y += gap; return v; });
        const over = ys.length ? ys[ys.length - 1] + gap - bot : 0; if (over > 0) for (let i = ys.length - 1, lim = bot - gap; i >= 0; i--) { ys[i] = Math.min(ys[i], lim); lim -= gap; }
        col.forEach((c, i) => {
          const lx = side === 0 ? 8 : w - c.w - 8; const ly = Math.max(top, ys[i]);
          c.p.label.style.transform = `translate(${lx}px, ${ly}px)`;
          const ax = side === 0 ? lx + c.w : lx; const ay = ly + c.h / 2;
          svg += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} L${(ax + (side === 0 ? 14 : -14)).toFixed(1)} ${ay.toFixed(1)} L${c.x.toFixed(1)} ${c.y.toFixed(1)}"/><circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.2"/>`;
        });
      });
    }
    if (leaderSvg._last !== svg) { leaderSvg.innerHTML = svg; leaderSvg._last = svg; }
  }
  const esc3 = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function highlight(ids) {
    st.hl.forEach((id) => { if (id !== st.selected && partById[id]) setEmissive(partById[id], 0, 0); });
    st.hl = new Set((ids || []).filter((id) => partById[id]));
  }
  function refreshLabels() { parts.forEach((p) => { p.label.dataset.key = ''; p.balloon.title = api.nameOf(p); }); }
  function snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }

  Object.defineProperties(api, { parts: { get: () => parts }, built: { get: () => built } });
  return Object.assign(api, {
    init, load, setTheme, select, focusPart, resetView, fit, setRemoved, readouts, snapshot, highlight, refreshLabels,
    setBody(on) { st.showBody = on; if (car) car.visible = on; road.visible = on && !!car; },
    setDrive(on) { st.drive = on; st.cycle = false; if (!on) st.sTarget = 0; },
    setSpin(on) { st.spin = on; },
    setAllNames(on) { st.allNames = on; parts.forEach((p) => { p.label.dataset.key = ''; }); },
    viewCar() {
      if (!car) return; const bx = new THREE.Box3().setFromObject(car); const c = bx.getCenter(V3(0, 0, 0));
      cam.dTarget.copy(c); cam.dr = clampR(bx.getSize(V3(0, 0, 0)).length() / 2 / Math.sin((camera.fov * Math.PI / 180) / 2) * 0.75);
      cam.dth = Math.atan2(1.6, 1.2); cam.dph = 1.15;
    },
    setTravel(m) { st.cycle = false; st.sTarget = m; },
    setCycle(on) { st.cycle = on; if (!on) st.sTarget = 0; },
    setSection(on) { st.section = on; applySection(); },
    setIsolate(on) { st.isolate = on; applyGhost(); },
    setBalloons(on) { st.balloons = on; },
    setHideRemoved(on) { st.hideRemoved = on; },
    setAutoRot(on) { st.autoRot = on; },
    zoom(f) { cam.dr = clampR(cam.dr * f); }
  });
})();
