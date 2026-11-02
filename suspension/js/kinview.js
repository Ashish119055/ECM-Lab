/* Suspension Lab — kinematics view: live geometry diagram + curves vs wheel travel */
'use strict';

const KinView = (() => {
  let def, built, curves = null;
  const S = [];
  for (let s = -0.08; s <= 0.0801; s += 0.004) S.push(+s.toFixed(4));

  function springLen(s) {
    const sp = built.springSpans[0]; if (!sp) return null;
    if (sp === 'leaf') return 0.4 - s;
    const sol = built.solve(s);
    return sp[0][1].clone().applyMatrix4(sol.mats[sp[0][0]]).distanceTo(sp[1][1].clone().applyMatrix4(sol.mats[sp[1][0]]));
  }
  const mrAt = (s) => (springLen(s - 0.002) - springLen(s + 0.002)) / 0.004;

  function setSystem(d, b) {
    def = d; built = b;
    curves = { camber: [], rc: [], track: [], mr: [], dz: [], arch: [] };
    S.forEach((s) => {
      const p = built.solve(s).pose;
      curves.camber.push([s * 1000, p.camber]);
      curves.rc.push([s * 1000, (p.rcH ?? NaN) * 1000]);
      curves.track.push([s * 1000, (p.halfTrack - built.hp.W[0]) * 1000]);
      curves.mr.push([s * 1000, mrAt(s)]);
      curves.dz.push([s * 1000, (p.dz ?? 0) * 1000]);
      if (p.arch != null) curves.arch.push([s * 1000, p.arch * 1000]);
    });
  }

  function render(s) {
    if (!def) return;
    const pose = built.solve(s).pose; const pose0 = built.solve(0).pose;
    const t = built.kinType;
    document.getElementById('kinTitle').textContent = `${sysName(def)} — ${tr('kin_suffix')}`;
    document.getElementById('kinLede').textContent = t === 'twist' || t === 'live' ? tr('kin_lede_side') : tr('kin_lede_corner');
    document.getElementById('kinDiagTitle').textContent = t === 'twist' || t === 'live' ? 'Side-view geometry' : 'Front-view geometry';
    drawDiagram(pose, pose0, s);
    drawCharts(s);
    kpis(pose, s);
  }

  /* ── diagram ───────────────────────────────────────────── */
  function drawDiagram(p, p0, s) {
    const svg = document.getElementById('kinSvg'); svg.innerHTML = '';
    const t = built.kinType; const W = 640, H = 480; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const side = t === 'twist' || t === 'live';
    const sc = side ? (t === 'live' ? 330 : 360) : 430;
    const ox = side ? (t === 'live' ? 0.9 : 0.85) : 0.2, oy = side ? 0.95 : 1.06;
    const P = (x, y) => side ? [(ox - x) * sc + 40, (oy - y) * sc] : [(x + ox) * sc, (oy - y) * sc];
    const line = (a, b, cls, g = svg) => { const A = P(...a), B = P(...b); return svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: cls }, g); };
    const pt = (a, cls, r = 5, g = svg) => { const A = P(...a); return svgEl('circle', { cx: A[0], cy: A[1], r, class: cls }, g); };
    const lbl = (a, txt, dx = 8, dy = -8, anchor = 'start', g = svg) => { const A = P(...a); const e = svgEl('text', { x: A[0] + dx, y: A[1] + dy, class: 'g-lbl', 'text-anchor': anchor }, g); e.textContent = txt; return e; };
    const ext = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const clip = svgEl('clipPath', { id: 'kclip' }, svgEl('defs', {}, svg)); svgEl('rect', { x: 0, y: 0, width: W, height: H }, clip);
    const root = svgEl('g', { 'clip-path': 'url(#kclip)' }, svg);
    const legend = [];

    if (!side) {
      const hp = built.hp; const gy = p.CP[1];
      // ground
      line([-0.4, gy], [1.3, gy], 'g-ground', root);
      for (let x = -0.15; x < 1.2; x += 0.05) line([x, gy], [x - 0.025, gy - 0.025], 'g-hatch', root);
      line([0, -0.1], [0, 1.15], 'g-cl', root); lbl([0, 1.0], 'vehicle centre-line', 6, 4, 'start', root);
      const drawCorner = (q, ghost) => {
        const g = svgEl('g', { class: ghost ? 'g-ghost' : '' }, root);
        // tyre outline (rotated rectangle)
        const c = Math.cos(q.phi), sn = Math.sin(q.phi); const hw = 0.11, hr = hp.Rt;
        const corner = (u, v) => [q.W[0] + u * c - v * sn, q.W[1] + u * sn + v * c];
        const pts = [corner(-hw, -hr), corner(hw, -hr), corner(hw, hr), corner(-hw, hr)].map((a) => P(...a).join(',')).join(' ');
        svgEl('polygon', { points: pts, class: 'g-tyre' }, g);
        line(corner(0, -hr), corner(0, hr), 'g-cons', g);
        if (t === 'strut') {
          const Sp = KM.add(q.BL, KM.rot(KM.sub(built.hp.S || q.BL, hp.BL), [0, 0], q.phi));
          line(q.BL, KM.add(q.W, [-0.06 * c, -0.06 * sn]), 'g-upright', g);
          line(Sp, hp.T, 'g-strut', g);
          line(hp.AL, q.BL, 'g-arm', g);
          pt(hp.T, 'g-fix', 6, g); pt(hp.AL, 'g-fix', 6, g); pt(q.BL, 'g-pt', 5, g);
        } else {
          line(q.BL, q.BU, 'g-upright', g); line([(q.BL[0] + q.BU[0]) / 2, (q.BL[1] + q.BU[1]) / 2], q.W, 'g-upright', g);
          line(hp.AL, q.BL, 'g-arm', g); line(hp.AU, q.BU, 'g-arm2', g);
          pt(hp.AL, 'g-fix', 6, g); pt(hp.AU, 'g-fix', 6, g); pt(q.BL, 'g-pt', 5, g); pt(q.BU, 'g-pt', 5, g);
        }
        pt(q.W, 'g-pt', 4, g);
      };
      drawCorner(p0, true); drawCorner(p, false);
      // construction lines → IC → RC
      if (p.IC) {
        if (t === 'strut') { line(hp.AL, ext(hp.AL, p.IC, 1), 'g-cons', root); line(hp.T, p.IC, 'g-cons', root); }
        else { line(p.BL, p.IC, 'g-cons', root); line(p.BU, p.IC, 'g-cons', root); }
        line(p.CP, p.IC, 'g-rc', root);
        const icIn = p.IC[0] > -0.2;
        if (icIn) { pt(p.IC, 'g-ic', 5, root); lbl(p.IC, 'IC', 8, -8, 'start', root); }
        else { lbl([-0.17, Math.max(0, Math.min(1.05, p.IC[1]))], `IC at x = ${p.IC[0].toFixed(2)} m, y = ${(p.IC[1] - p.CP[1]).toFixed(2)} m ←`, 2, -6, 'start', root); }
      }
      if (p.RC) { pt(p.RC, 'g-rcpt', 6, root); lbl(p.RC, `RC ${(p.rcH * 1000).toFixed(0)} mm`, 9, 4, 'start', root); }
      pt(p.CP, 'g-pt', 4, root); lbl(p.CP, 'contact patch', 8, 16, 'start', root);
      lbl(p.W, `camber ${p.camber.toFixed(2)}°`, 30, -6, 'start', root);
      legend.push({ name: 'Lower arm', color: cssVar('--ink') });
      legend.push(t === 'strut' ? { name: 'Strut', color: cssVar('--s1') } : { name: 'Upper arm', color: cssVar('--s3') });
      legend.push({ name: 'Knuckle', color: cssVar('--accent') }, { name: 'IC rays', color: cssVar('--ink-2'), dash: 1 }, { name: 'Roll-centre ray', color: cssVar('--bad'), dash: 1 });
    } else if (built.kinType === 'twist') {
      const hp = built.hp; const gy = p.CP[1];
      line([1.0, gy], [-0.6, gy], 'g-ground', root);
      for (let z = -0.55; z < 0.95; z += 0.05) line([z, gy], [z - 0.025, gy - 0.025], 'g-hatch', root);
      const draw = (q, ghost) => {
        const g = svgEl('g', { class: ghost ? 'g-ghost' : '' }, root);
        const Wz = q.Wside; const C = P(...Wz);
        svgEl('circle', { cx: C[0], cy: C[1], r: hp.Rt * sc, class: 'g-tyre' }, g);
        line(hp.Pside, Wz, 'g-arm', g);
        const beamPt = KM.rot([0.18, 0.33], hp.Pside, q.alpha);
        const B = P(...beamPt); svgEl('path', { d: `M${B[0] - 14},${B[1] + 10} L${B[0]},${B[1] - 10} L${B[0] + 14},${B[1] + 10}`, fill: 'none', stroke: cssVar('--accent'), 'stroke-width': 4 }, g);
        const SB = KM.rot([0.04, 0.31], hp.Pside, q.alpha); spring(g, SB, [0.04, 0.57], 7);
        const DB = KM.rot([-0.13, 0.28], hp.Pside, q.alpha); line(DB, [-0.24, 0.7], 'g-strut', g);
        pt(Wz, 'g-pt', 4, g);
      };
      draw(p0, true); draw(p, false);
      // wheel-centre arc
      const arc = []; for (let a = -0.25; a <= 0.25; a += 0.01) arc.push(P(...KM.rot(hp.Wside, hp.Pside, a)).join(','));
      svgEl('polyline', { points: arc.join(' '), class: 'g-cons' }, root);
      pt(hp.Pside, 'g-fix', 7, root); lbl(hp.Pside, 'pivot bushing', 10, -10, 'start', root);
      lbl(p.Wside, `Δx wheel centre ${(p.dz * 1000).toFixed(1)} mm`, 14, -14, 'start', root);
      lbl([0.78, 0.9], '← front', 0, 0, 'start', root);
      line([0.8, 0.57], [-0.45, 0.57], 'g-cl', root); lbl([-0.45, 0.6], 'body', 0, 0, 'end', root);
      legend.push({ name: 'Trailing arm', color: cssVar('--ink') }, { name: 'Twist beam (section)', color: cssVar('--accent') }, { name: 'Damper', color: cssVar('--s1') }, { name: 'Wheel-centre path', color: cssVar('--ink-2'), dash: 1 });
    } else {
      const hp = built.hp; const gy = p.CP[1];
      line([1.2, gy], [-1.0, gy], 'g-ground', root);
      for (let z = -0.95; z < 1.2; z += 0.05) line([z, gy], [z - 0.025, gy - 0.025], 'g-hatch', root);
      line([1.15, 0.64], [-1.0, 0.64], 'g-arm2', root); lbl([0.25, 0.68], 'frame rail', 0, 0, 'start', root);
      const draw = (q, ghost) => {
        const g = svgEl('g', { class: ghost ? 'g-ghost' : '' }, root);
        const yc = 0.3205 + (q.W[1] - hp.W[1]);
        for (let k = 0; k < 3; k++) {
          const pts = []; const half = [0.7, 0.58, 0.46][k];
          for (let z = -half; z <= half + 1e-6; z += 0.02) pts.push(P(z, yc - k * 0.012 + q.arch * (z / 0.7) ** 2).join(','));
          svgEl('polyline', { points: pts.join(' '), class: 'g-leaf', 'stroke-width': 3 }, g);
        }
        const C = P(0, q.W[1]); svgEl('circle', { cx: C[0], cy: C[1], r: hp.Rt * sc, class: 'g-tyre' }, g);
        svgEl('circle', { cx: C[0], cy: C[1], r: 0.045 * sc, fill: cssVar('--accent') }, g);
      };
      draw(built.solve(0).pose, true); draw(p, false);
      pt([0.7, 0.445], 'g-fix', 6, root); lbl([0.7, 0.445], 'front eye (fixed)', -6, 22, 'start', root);
      line([-0.7, 0.445], [-0.78, 0.55], 'g-arm', root); pt([-0.78, 0.55], 'g-fix', 6, root); pt([-0.7, 0.445], 'g-pt', 5, root); lbl([-0.78, 0.55], 'shackle', -10, -8, 'end', root);
      line([0.7, 0.445], [0.75, 0.64], 'g-arm', root);
      lbl([0, p.W[1] + 0.06], `spring arch ${(p.arch * 1000).toFixed(0)} mm`, 0, 0, 'middle', root);
      lbl([0.95, 0.9], '← front', 0, 0, 'start', root);
      legend.push({ name: 'Leaf pack', color: cssVar('--ink') }, { name: 'Frame', color: cssVar('--s3') }, { name: 'Axle', color: cssVar('--accent') });
    }
    legendEl(legend);

    function spring(g, a, b, n) {
      const A = P(...a), B = P(...b); const pts = [A];
      for (let i = 1; i < n * 2; i++) { const t = i / (n * 2); pts.push([A[0] + (B[0] - A[0]) * t + (i % 2 ? 10 : -10), A[1] + (B[1] - A[1]) * t]); }
      pts.push(B); svgEl('polyline', { points: pts.map((q) => q.join(',')).join(' '), fill: 'none', stroke: cssVar('--bad'), 'stroke-width': 3 }, g);
    }
  }
  function legendEl(items) { legend(document.getElementById('kinLegend'), items); }

  /* ── charts ────────────────────────────────────────────── */
  function drawCharts(s) {
    const t = built.kinType; const x = s * 1000; const xr = [-80, 80];
    const c1 = cssVar('--s1'), c2 = cssVar('--s2'), c3 = cssVar('--s3');
    document.getElementById('c1Title').textContent = 'Camber vs wheel travel';
    lineChart(document.getElementById('kinC1'), { series: [{ name: 'Camber °', color: c1, pts: curves.camber }], xr, xLabel: 'wheel travel, mm (+ bump)', yLabel: 'deg', cursorX: x, xName: 'travel mm', fmtY: (v) => +v.toFixed(2), yr: t === 'twist' || t === 'live' ? [curves.camber[0][1] - 1, curves.camber[0][1] + 1] : undefined });
    if (t === 'twist') {
      document.getElementById('c2Title').textContent = 'Wheel-centre fore/aft shift';
      lineChart(document.getElementById('kinC2'), { series: [{ name: 'Δx mm', color: c2, pts: curves.dz }], xr, xLabel: 'wheel travel, mm', yLabel: 'mm (+ fwd)', cursorX: x, xName: 'travel mm', fmtY: (v) => +v.toFixed(1) });
    } else if (t === 'live') {
      document.getElementById('c2Title').textContent = 'Leaf-spring arch';
      lineChart(document.getElementById('kinC2'), { series: [{ name: 'Arch mm', color: c2, pts: curves.arch }], xr, xLabel: 'wheel travel, mm', yLabel: 'mm', cursorX: x, xName: 'travel mm', fmtY: (v) => +v.toFixed(0) });
    } else {
      document.getElementById('c2Title').textContent = 'Roll-centre height & track change';
      lineChart(document.getElementById('kinC2'), { series: [{ name: 'RC height mm', color: c2, pts: curves.rc }, { name: 'Half-track Δ mm', color: c3, pts: curves.track, dash: '6 4' }], xr, xLabel: 'wheel travel, mm', yLabel: 'mm', cursorX: x, xName: 'travel mm', fmtY: (v) => +v.toFixed(0) });
    }
    document.getElementById('c3Title').textContent = 'Spring motion ratio';
    lineChart(document.getElementById('kinC3'), { series: [{ name: 'MR', color: c1, pts: curves.mr }], xr, xLabel: 'wheel travel, mm', yLabel: 'spring / wheel', cursorX: x, xName: 'travel mm', fmtY: (v) => +v.toFixed(3) });
  }

  function kpis(p, s) {
    const k = (s * 1000).toFixed(0);
    const gain = (built.solve(s + 0.025).pose.camber - built.solve(s - 0.025).pose.camber);
    const mr = mrAt(s); const ks = def.preset.ks; const kspring = ks / (mrAt(0) ** 2);
    const items = [
      ['Camber', `${p.camber.toFixed(2)}°`, 'top in = negative'],
      ['Camber gain', `${gain.toFixed(2)}°`, 'per 50 mm bump'],
      ['Roll centre', p.rcH != null ? `${(p.rcH * 1000).toFixed(0)} mm` : '—', 'above ground'],
      ['Half-track Δ', `${((p.halfTrack - built.hp.W[0]) * 1000).toFixed(1)} mm`, 'tyre scrub'],
      ['Motion ratio', mr.toFixed(3), 'spring / wheel'],
      ['Wheel rate', `${(kspring * mr * mr / 1000).toFixed(1)} N/mm`, `spring ${(kspring / 1000).toFixed(0)} N/mm`]
    ];
    document.getElementById('kinKpis').innerHTML = items.map(([a, b, c]) => `<div class="kpi"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('');
    document.getElementById('kinTravelVal').textContent = `${k > 0 ? '+' : ''}${k} mm`;
    theory();
  }

  let theoryFor = null;
  function theory() {
    if (theoryFor === def.id) return; theoryFor = def.id;
    const t = built.kinType; const el = document.getElementById('kinTheory');
    const common = `<div><h3>Motion ratio &amp; wheel rate</h3><p>The spring sees only a fraction of the wheel movement: MR = Δ(spring length) / Δ(wheel travel). Force and displacement both scale by MR, so the rate at the wheel is</p><div class="eq">k_wheel = k_spring · MR²</div><p>In series with the tyre, the ride rate is k_ride = k_wheel·k_t / (k_wheel + k_t), and the body natural frequency is f = (1/2π)·√(k_ride / m_s).</p></div>`;
    if (t === 'sla' || t === 'strut') {
      el.innerHTML = `<h2>Engineering notes</h2><div class="cols">
      <div><h3>Instant centre (IC) &amp; swing arm</h3><p>In the front view the knuckle moves, for an instant, as if it were pivoting about one point: the intersection of the ${t === 'strut' ? 'lower-arm line and the line through the top mount perpendicular to the strut axis' : 'upper- and lower-arm lines'}. The distance from the contact patch to the IC is the front-view swing-arm length (FVSA). Camber gain is approximately</p><div class="eq">dγ/dz ≈ 1 / FVSA  [rad/m]</div><p>A short FVSA gives strong camber gain but large track change (tyre scrub).</p></div>
      <div><h3>Roll centre (RC)</h3><p>The roll centre is where the line from the contact patch through the IC crosses the vehicle centre-line. Lateral tyre forces act on the body there, so the roll moment is</p><div class="eq">M_roll = m_s · a_y · (h_CG − h_RC)</div><p>A higher RC means less roll but more "jacking" and more track change. Watch how the RC moves as the wheel travels — designers keep this migration small for consistent handling.</p></div>
      ${common}
      <div><h3>Why camber matters</h3><p>Tyres make most lateral force with a little negative camber relative to the road. In a corner the body rolls by φ, so the outer wheel's camber to the road is γ_road = γ_body + φ. An SLA with good camber gain cancels part of φ. A MacPherson strut recovers only ~20–40 % of it, which is why strut cars use more static negative camber and higher roll stiffness.</p></div></div>`;
    } else if (t === 'twist') {
      el.innerHTML = `<h2>Engineering notes</h2><div class="cols">
      <div><h3>Heave vs roll</h3><p>In heave both trailing arms rotate together about the pivot axis, so camber and toe relative to the body stay constant. The wheel centre follows an arc of radius ≈ 0.46 m, so it moves slightly back in bump (a little anti-lift). In roll the beam twists: the roll stiffness from the beam is</p><div class="eq">K_φ ≈ (G·J / L_beam) · (t / a)²</div><p>where J ≈ Σ b·t³/3 for the open section, t = track, a = beam distance from the wheel line.</p></div>
      <div><h3>Roll centre</h3><p>For a twist beam the roll centre lies close to the shear centre of the beam section, typically 100–180 mm above ground — higher than most independent rear axles. The beam's position along the arms sets the balance between trailing-arm and solid-axle behaviour.</p></div>
      ${common}</div>`;
    } else {
      el.innerHTML = `<h2>Engineering notes</h2><div class="cols">
      <div><h3>Leaf rate</h3><p>Treating the spring pack as a simply supported beam of span L loaded at the centre:</p><div class="eq">k ≈ 8·n·E·b·t³ / (3·L³)</div><p>with n leaves of width b and thickness t. U-bolts clamp part of the span, which makes it inactive and raises k. Inter-leaf friction adds a Coulomb force, F_f ≈ μ·N, giving a hysteresis loop on the force–deflection curve.</p></div>
      <div><h3>Roll centre &amp; roll-steer</h3><p>The lateral reaction passes through the spring eyes and shackles, so the roll centre sits near the spring-seat height — high, around 300–350 mm. The axle moves on an arc around the front eye. Its inclination gives roll-steer: in roll one side moves forward and the other back, steering the rear axle.</p></div>
      ${common}</div>`;
    }
  }

  return { setSystem, render };
})();
