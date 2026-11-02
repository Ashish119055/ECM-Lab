/* Suspension Lab — 2-DOF quarter-car ride simulator (RK4), road inputs, scopes and frequency response */
'use strict';

const Dyn = (() => {
  const g = 9.81, DT = 0.0005;
  const P = { ms: 380, mu: 42, ks: 26000, c: 2300, rr: 2.5, kt: 230000, fric: 0, air: false, sky: false };
  const R = { type: 'bump', v: 30, f: 2, amp: 10, iso: 'C', slow: false };
  let x = [0, 0, 0, 0], t = 0, dist = 0, running = true, sysDef = null, roadTab = null, roadSeed = 1;
  const HN = 1000; const hist = { a: new Float32Array(HN), d: new Float32Array(HN), f: new Float32Array(HN), i: 0, n: 0 };
  let sampleAcc = 0, airborne = 0, lastNow = 0;
  const ui = {};

  /* ── road profiles (distance-based, metres) ── */
  const ISO = { A: 16e-6, B: 64e-6, C: 256e-6, D: 1024e-6, E: 4096e-6 };
  function buildRandomRoad() {
    let s = roadSeed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const N = 140, n0 = 0.1, nMin = 0.011, nMax = 3.0, Gd = ISO[R.iso];
    const comps = [];
    for (let i = 0; i < N; i++) {
      const n = nMin * (nMax / nMin) ** ((i + 0.5) / N); const dn = n * (Math.log(nMax / nMin) / N);
      comps.push([Math.sqrt(2 * Gd * (n / n0) ** -2 * dn), 2 * Math.PI * n, rnd() * 2 * Math.PI]);
    }
    const L = 400, res = 0.01; const tab = new Float32Array(L / res + 2);
    for (let k = 0; k < tab.length; k++) { const xx = k * res; let z = 0; for (const [a, w, ph] of comps) z += a * Math.sin(w * xx + ph); tab[k] = z; }
    roadTab = { tab, res, L };
  }
  function zr(xm, tt) {
    switch (R.type) {
      case 'sine': return (R.amp / 1000) * Math.sin(2 * Math.PI * R.f * tt);
      case 'random': { if (!roadTab) buildRandomRoad(); const u = ((xm % roadTab.L) + roadTab.L) % roadTab.L / roadTab.res; const k = Math.floor(u); const fr = u - k; return roadTab.tab[k] * (1 - fr) + roadTab.tab[k + 1] * fr; }
      case 'hump': { const p = ((xm % 40) + 40) % 40 - 20; const L = 3.7; return Math.abs(p) < L / 2 ? 0.075 * Math.cos(Math.PI * p / L) ** 2 : 0; }
      case 'pothole': { const p = ((xm % 25) + 25) % 25 - 12.5; const L = 0.55; return Math.abs(p) < L / 2 ? -0.05 * Math.cos(Math.PI * p / L) ** 2 : 0; }
      case 'kerb': { const p = ((xm % 30) + 30) % 30; return p > 10 && p < 20 ? 0.04 : 0; }
      default: { const p = ((xm % 25) + 25) % 25 - 12.5; const L = 0.6; return Math.abs(p) < L / 2 ? 0.05 * Math.cos(Math.PI * p / L) ** 2 : 0; }
    }
  }

  /* ── model ── */
  const cC = () => 2 * P.c / (1 + P.rr), cR = () => P.rr * cC();
  function forces(s, z) {
    const [zs, vs, zu, vu] = s;
    const d = zu - zs, vr = vu - vs; // + = compression
    let Fs = P.ks * d;
    if (P.air) Fs += P.ks * 28 * d * d * d * (d > 0 ? 1.4 : 1); // progressive (cubic) air-spring term
    if (d > 0.07) Fs += 6 * P.ks * (d - 0.07) + 4e6 * (d - 0.07) ** 2;
    if (d < -0.09) Fs += 25 * P.ks * (d + 0.09);
    let c = vr > 0 ? cC() : cR();
    if (P.sky) {
      const cmin = 0.3 * P.c, cmax = 3 * P.c, csky = 2.6 * P.c; const rel = vs - vu;
      c = vs * rel > 0 && Math.abs(rel) > 1e-4 ? Math.min(cmax, Math.max(cmin, csky * vs / rel)) : cmin;
    }
    const Ff = P.fric * Math.tanh(vr / 0.004);
    const Fd = c * vr + Ff;
    const Ft = Math.max(P.kt * (z - zu), -(P.ms + P.mu) * g);
    return { Fs, Fd, Ft, d };
  }
  function deriv(s, z) {
    const { Fs, Fd, Ft } = forces(s, z);
    return [s[1], (Fs + Fd) / P.ms, s[3], (-Fs - Fd + Ft) / P.mu];
  }
  function step() {
    const v = R.v / 3.6;
    const z0 = zr(dist, t), z1 = zr(dist + v * DT / 2, t + DT / 2), z2 = zr(dist + v * DT, t + DT);
    const k1 = deriv(x, z0);
    const k2 = deriv(x.map((xi, i) => xi + k1[i] * DT / 2), z1);
    const k3 = deriv(x.map((xi, i) => xi + k2[i] * DT / 2), z1);
    const k4 = deriv(x.map((xi, i) => xi + k3[i] * DT), z2);
    x = x.map((xi, i) => xi + (DT / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    t += DT; dist += v * DT;
    const f = forces(x, z2); const acc = (f.Fs + f.Fd) / P.ms;
    if (f.Ft <= -(P.ms + P.mu) * g + 1) airborne = 0.6;
    sampleAcc += DT;
    if (sampleAcc >= 0.005) {
      sampleAcc = 0; const i = hist.i;
      hist.a[i] = acc; hist.d[i] = f.d * 1000; hist.f[i] = (P.ms + P.mu) * g + f.Ft;
      hist.i = (i + 1) % HN; hist.n = Math.min(HN, hist.n + 1);
    }
  }
  function reset() { x = [0, 0, 0, 0]; t = 0; dist = 0; hist.i = 0; hist.n = 0; airborne = 0; }

  /* ── linear analysis ── */
  function natural() {
    const kr = P.ks * P.kt / (P.ks + P.kt);
    return {
      fs: Math.sqrt(kr / P.ms) / (2 * Math.PI), fu: Math.sqrt((P.ks + P.kt) / P.mu) / (2 * Math.PI),
      zeta: P.c / (2 * Math.sqrt(P.ks * P.ms)), zetaU: P.c / (2 * Math.sqrt((P.ks + P.kt) * P.mu)),
      stat: (P.ms * g / kr) * 1000
    };
  }
  function frf() {
    const out = { s: [], u: [] };
    for (let i = 0; i <= 220; i++) {
      const f = 0.3 * (100) ** (i / 220); const w = 2 * Math.PI * f;
      // complex arithmetic: s = jw
      const A = [P.ks - P.ms * w * w, P.c * w], B = [P.ks, P.c * w], D = [P.ks + P.kt - P.mu * w * w, P.c * w];
      const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
      const AD = mul(A, D), BB = mul(B, B); const det = [AD[0] - BB[0], AD[1] - BB[1]];
      const dm = Math.hypot(...det);
      out.s.push([f, Math.hypot(...B) * P.kt / dm]); out.u.push([f, Math.hypot(...A) * P.kt / dm]);
    }
    return out;
  }

  /* ── UI ── */
  const SL = [
    ['ms', 'Sprung mass (¼ body)', 150, 800, 5, 'kg', (v) => v],
    ['mu', 'Unsprung mass', 20, 150, 1, 'kg', (v) => v],
    ['ks', 'Wheel rate k_s', 10000, 120000, 500, 'N/mm', (v) => (v / 1000).toFixed(1)],
    ['c', 'Damping c (mean)', 300, 8000, 50, 'N·s/m', (v) => v],
    ['rr', 'Rebound : compression', 1, 4, 0.1, ': 1', (v) => (+v).toFixed(1)],
    ['kt', 'Tyre rate k_t', 100000, 400000, 5000, 'N/mm', (v) => (v / 1000).toFixed(0)],
    ['fric', 'Coulomb friction', 0, 600, 10, 'N', (v) => v]
  ];
  function buildUI() {
    const el = document.getElementById('dynCtl');
    el.innerHTML = `
      <div class="ctl"><label class="ctl-label" for="roadSel">Road input</label>
        <select id="roadSel">
          <option value="bump">Sharp bump — 50 mm × 0.6 m</option><option value="hump">Speed hump — 75 mm × 3.7 m</option>
          <option value="pothole">Pothole — 50 mm deep</option><option value="kerb">Step / kerb — 40 mm</option>
          <option value="random">Random road (ISO 8608)</option><option value="sine">Sine (frequency sweep by hand)</option>
        </select></div>
      <div class="ctl" data-show="random"><label class="ctl-label" for="isoSel">ISO 8608 road class</label>
        <select id="isoSel"><option value="A">A — very good</option><option value="B">B — good</option><option value="C" selected>C — average</option><option value="D">D — poor</option><option value="E">E — very poor</option></select></div>
      <div class="ctl" data-hide="sine"><label class="ctl-label" for="dyn-v">Speed <b id="dyn-v-val"></b></label><input type="range" id="dyn-v" min="5" max="130" step="1"></div>
      <div class="ctl" data-show="sine"><label class="ctl-label" for="dyn-f">Frequency <b id="dyn-f-val"></b></label><input type="range" id="dyn-f" min="0.3" max="25" step="0.1"></div>
      <div class="ctl" data-show="sine"><label class="ctl-label" for="dyn-amp">Amplitude <b id="dyn-amp-val"></b></label><input type="range" id="dyn-amp" min="1" max="30" step="1"></div>
      <hr>
      ${SL.map(([k, l, a, b, st]) => `<div class="ctl"><label class="ctl-label" for="dyn-${k}">${l} <b id="dyn-${k}-val"></b></label><input type="range" id="dyn-${k}" min="${a}" max="${b}" step="${st}"></div>`).join('')}
      <hr>
      <div class="chip-row">
        <button class="chip" id="dyn-air" aria-pressed="false" title="Progressive air-spring rate">Air spring (progressive)</button>
        <button class="chip" id="dyn-sky" aria-pressed="false" title="Semi-active skyhook damper control">Skyhook CDC</button>
        <button class="chip" id="dyn-slow" aria-pressed="false">Slow motion ¼×</button>
      </div>`;
    const bindR = (id, key, obj, fmt) => {
      const inp = document.getElementById(id); const out = document.getElementById(id + '-val');
      inp.value = obj[key]; out.textContent = fmt(obj[key]);
      inp.addEventListener('input', () => { obj[key] = +inp.value; out.textContent = fmt(obj[key]); changed(); });
      ui[key] = { inp, out, fmt, obj };
    };
    bindR('dyn-v', 'v', R, (v) => `${v} km/h`); bindR('dyn-f', 'f', R, (v) => `${(+v).toFixed(1)} Hz`); bindR('dyn-amp', 'amp', R, (v) => `±${v} mm`);
    SL.forEach(([k, , , , , u, fmt]) => bindR('dyn-' + k, k, P, (v) => `${fmt(v)} ${u}`));
    document.getElementById('roadSel').addEventListener('change', (e) => { R.type = e.target.value; showHide(); reset(); });
    document.getElementById('isoSel').addEventListener('change', (e) => { R.iso = e.target.value; roadTab = null; });
    [['dyn-air', 'air', P], ['dyn-sky', 'sky', P], ['dyn-slow', 'slow', R]].forEach(([id, k, o]) => {
      const b = document.getElementById(id); ui[k] = { b };
      b.addEventListener('click', () => { o[k] = !o[k]; b.setAttribute('aria-pressed', o[k]); changed(); });
    });
    document.getElementById('dynRun').addEventListener('click', (e) => { running = !running; e.target.textContent = running ? 'Pause' : 'Run'; });
    document.getElementById('dynReset').addEventListener('click', () => { loadPreset(sysDef); });
    showHide();
  }
  function showHide() {
    document.querySelectorAll('#dynCtl [data-show]').forEach((e) => { e.hidden = e.dataset.show !== R.type; });
    document.querySelectorAll('#dynCtl [data-hide]').forEach((e) => { e.hidden = e.dataset.hide === R.type; });
  }
  function syncUI() {
    for (const [k, u] of Object.entries(ui)) {
      if (u.inp) { u.inp.value = u.obj[k]; u.out.textContent = u.fmt(u.obj[k]); }
      if (u.b) u.b.setAttribute('aria-pressed', (k === 'slow' ? R : P)[k]);
    }
  }
  function loadPreset(def) {
    sysDef = def; const p = def.preset;
    Object.assign(P, { ms: p.ms, mu: p.mu, ks: p.ks, c: p.c, kt: p.kt, rr: 2.5, fric: p.mode === 'friction' ? 280 : 0, air: p.mode === 'air', sky: p.mode === 'air' });
    syncUI(); reset(); changed();
  }
  function changed() { drawFRF(); kpis(); }

  function kpis() {
    const n = natural();
    let rmsA = 0, rmsF = 0, maxD = 0; const cnt = hist.n; const stat = (P.ms + P.mu) * g;
    for (let i = 0; i < cnt; i++) { rmsA += hist.a[i] ** 2; rmsF += (hist.f[i] - stat) ** 2; maxD = Math.max(maxD, Math.abs(hist.d[i])); }
    rmsA = cnt ? Math.sqrt(rmsA / cnt) : 0; rmsF = cnt ? Math.sqrt(rmsF / cnt) / stat * 100 : 0;
    const comfort = rmsA < 0.315 ? 'not uncomfortable' : rmsA < 0.63 ? 'a little uncomfortable' : rmsA < 1 ? 'fairly uncomfortable' : rmsA < 1.6 ? 'uncomfortable' : rmsA < 2.5 ? 'very uncomfortable' : 'extremely uncomfortable';
    const items = [
      ['Body frequency', `${n.fs.toFixed(2)} Hz`, 'target 1.0–1.5 Hz'],
      ['Wheel-hop freq.', `${n.fu.toFixed(1)} Hz`, 'unsprung mode'],
      ['Damping ratio ζ', n.zeta.toFixed(2), `wheel ζ ${n.zetaU.toFixed(2)}`],
      ['Static deflection', `${n.stat.toFixed(0)} mm`, 'ride + tyre'],
      ['RMS body accel.', `${rmsA.toFixed(2)} m/s²`, comfort + ' (ISO 2631 scale)'],
      ['Dyn. tyre load', `${rmsF.toFixed(1)} %`, airborne > 0 ? 'WHEEL LEFT GROUND' : 'RMS of static load'],
      ['Max. travel', `${maxD.toFixed(0)} mm`, 'bump stop at 70 mm']
    ];
    document.getElementById('dynKpis').innerHTML = items.map(([a, b, c]) => `<div class="kpi"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('');
  }

  function drawFRF() {
    const r = frf(); const n = natural();
    const c1 = cssVar('--s1'), c2 = cssVar('--s2');
    lineChart(document.getElementById('frf'), {
      series: [{ name: 'Body |z_s/z_r|', color: c1, pts: r.s }, { name: 'Wheel |z_u/z_r|', color: c2, pts: r.u }],
      xr: [0.3, 30], logX: true, yr: [0, Math.min(6, Math.max(...r.s.map((p) => p[1]), ...r.u.map((p) => p[1])) * 1.1)],
      xLabel: 'frequency, Hz (log)', yLabel: 'gain', xName: 'f Hz', fmtX: (v) => v, fmtY: (v) => +v.toFixed(2),
      markers: [{ x: n.fs, label: `f_body ${n.fs.toFixed(2)}` }, { x: n.fu, label: `f_hop ${n.fu.toFixed(1)}` }].concat(R.type === 'sine' ? [{ x: R.f, label: 'input' }] : [])
    });
    legend(document.getElementById('frfLegend'), [{ name: 'Body / road', color: c1 }, { name: 'Wheel / road', color: c2 }]);
  }

  /* ── drawing ── */
  function fitCanvas(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return [ctx, w, h];
  }
  function drawAnim() {
    const [ctx, W, H] = fitCanvas(document.getElementById('dynCanvas'));
    const ink = cssVar('--ink'), ink2 = cssVar('--ink-2'), line = cssVar('--line'), acc = cssVar('--accent'), s1 = cssVar('--s1'), bad = cssVar('--bad'), bg2 = cssVar('--bg-2');
    ctx.clearRect(0, 0, W, H);
    const K = 1.6; // px per mm of motion
    const pxm = 70; const cx = W * 0.5; const base = H - 44;
    const v = R.v / 3.6;
    // road
    ctx.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const xm = R.type === 'sine' ? 0 : dist + (px - cx) / pxm;
      const z = R.type === 'sine' ? zr(0, t) : zr(xm, t);
      const y = base - z * 1000 * K; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = bg2; ctx.fill(); ctx.strokeStyle = ink2; ctx.lineWidth = 2; ctx.stroke();
    // hatch marks moving with road
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    const off = R.type === 'sine' ? 0 : ((dist * pxm) % 40);
    for (let px = -off; px < W; px += 40) { ctx.beginPath(); ctx.moveTo(px, H - 8); ctx.lineTo(px + 10, H - 18); ctx.stroke(); }
    const zroad = R.type === 'sine' ? zr(0, t) : zr(dist, t);
    const rw = 42; const wy = base - rw - x[2] * 1000 * K; const by = base - rw - 175 - x[0] * 1000 * K;
    // tyre force arrow
    const fdyn = Math.max(P.kt * (zroad - x[2]), -(P.ms + P.mu) * g);
    // wheel
    ctx.save(); ctx.translate(cx, wy);
    ctx.fillStyle = '#1d1f22'; ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b9c1c9'; ctx.beginPath(); ctx.arc(0, 0, rw * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-dist / 0.32); ctx.strokeStyle = '#6b737b'; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rw * 0.55, 0); ctx.stroke(); }
    ctx.restore();
    if (airborne > 0) { ctx.fillStyle = bad; ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('WHEEL OFF THE GROUND', cx, base + 30); }
    // unsprung link + spring + damper
    const sx = cx - 26, dx = cx + 26; const top = by + 30, bot = wy - rw - 8;
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx - 12, bot); ctx.lineTo(dx + 12, bot); ctx.moveTo(cx, bot); ctx.lineTo(cx, wy); ctx.stroke();
    ctx.strokeStyle = cssVar('--bad'); ctx.lineWidth = 3; ctx.beginPath();
    const n = 9; ctx.moveTo(sx, bot);
    for (let i = 1; i < n * 2; i++) { const yy = bot + (top - bot) * i / (n * 2); ctx.lineTo(sx + (i % 2 ? 11 : -11), yy); }
    ctx.lineTo(sx, top); ctx.stroke();
    const mid = (top + bot) / 2;
    ctx.fillStyle = s1; ctx.fillRect(dx - 8, mid - 4, 16, bot - mid + 4);
    ctx.strokeStyle = ink2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx, top); ctx.lineTo(dx, mid + 6); ctx.stroke();
    ctx.fillStyle = ink2; ctx.fillRect(dx - 6, mid + 4, 12, 4);
    // body
    ctx.fillStyle = acc; ctx.globalAlpha = 0.9; roundRect(ctx, cx - 90, by - 34, 180, 64, 8); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = cssVar('--accent-ink'); ctx.font = '600 13px "IBM Plex Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`m_s = ${P.ms} kg`, cx, by + 2);
    ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillText(`z_s ${(x[0] * 1000).toFixed(1)} mm`, cx, by + 18);
    // labels
    ctx.textAlign = 'left'; ctx.fillStyle = ink2; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`k_s ${(P.ks / 1000).toFixed(1)} N/mm`, sx - 92, mid);
    ctx.fillText(`c ${P.c} N·s/m${P.sky ? ' (sky)' : ''}`, dx + 16, mid);
    ctx.fillText(`m_u ${P.mu} kg   z_u ${(x[2] * 1000).toFixed(1)} mm`, cx + rw + 10, wy + 4);
    ctx.fillText(`F_tyre ${((P.ms + P.mu) * g + fdyn).toFixed(0)} N`, cx + rw + 10, wy + 20);
    ctx.fillText(R.type === 'sine' ? `road z_r = ${(zroad * 1000).toFixed(1)} mm @ ${R.f} Hz` : `${R.v} km/h   z_r ${(zroad * 1000).toFixed(1)} mm`, 12, 18);
    // static reference line for body
    ctx.strokeStyle = line; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; const by0 = base - rw - 175;
    ctx.beginPath(); ctx.moveTo(cx - 130, by0); ctx.lineTo(cx - 92, by0); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText('static', cx - 168, by0 + 4);
  }
  function roundRect(ctx, x0, y0, w, h, r) { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); }
  function drawScope(id, arr, color, fixed) {
    const [ctx, W, H] = fitCanvas(document.getElementById(id));
    ctx.clearRect(0, 0, W, H);
    const n = hist.n; if (!n) return;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { const v = arr[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (fixed) { lo = Math.min(lo, fixed[0]); hi = Math.max(hi, fixed[1]); }
    const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    const Y = (v) => H - 16 - (v - lo) / (hi - lo) * (H - 24);
    ctx.strokeStyle = cssVar('--line'); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
    if (lo < 0 && hi > 0) { ctx.beginPath(); ctx.moveTo(34, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = cssVar('--ink-2'); ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'right';
    ctx.fillText(fmtN(hi - pad), 32, Y(hi - pad) + 3); ctx.fillText(fmtN(lo + pad), 32, Y(lo + pad) + 3);
    ctx.textAlign = 'left'; ctx.fillText('−5 s', 36, H - 3); ctx.textAlign = 'right'; ctx.fillText('now', W - 2, H - 3);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    const start = (hist.i - n + HN) % HN;
    for (let k = 0; k < n; k++) { const v = arr[(start + k) % HN]; const px = 36 + (W - 38) * (k + HN - n) / HN; k ? ctx.lineTo(px, Y(v)) : ctx.moveTo(px, Y(v)); }
    ctx.stroke();
  }
  const fmtN = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2));

  let kpiT = 0;
  function frame(now) {
    const dtw = Math.min(0.05, (now - (lastNow || now)) / 1000); lastNow = now;
    if (!document.getElementById('view-dyn').hidden) {
      if (running) { const steps = Math.round(dtw * (R.slow ? 0.25 : 1) / DT); for (let i = 0; i < steps; i++) step(); airborne = Math.max(0, airborne - dtw); }
      drawAnim();
      drawScope('sc1', hist.a, cssVar('--s1'), [-1, 1]);
      drawScope('sc2', hist.d, cssVar('--s2'), [-10, 10]);
      drawScope('sc3', hist.f, cssVar('--s3'));
      kpiT += dtw; if (kpiT > 0.25) { kpiT = 0; kpis(); }
    }
    requestAnimationFrame(frame);
  }

  function theory() {
    document.getElementById('dynTheory').innerHTML = `<h2>The model</h2><div class="cols">
      <div><h3>Equations of motion</h3><p>Displacements z_s (body), z_u (wheel) and z_r (road) are measured from static equilibrium, positive up.</p>
      <div class="eq">m_s·z̈_s = k_s(z_u − z_s) + c(ż_u − ż_s)</div>
      <div class="eq">m_u·z̈_u = −k_s(z_u − z_s) − c(ż_u − ż_s) + k_t(z_r − z_u)</div>
      <p>The tyre force cannot pull: when k_t(z_r − z_u) &lt; −(m_s+m_u)g the wheel leaves the road. Bump and rebound stops act at +70 / −90 mm. Damping is asymmetric (rebound : compression) about the mean c.</p></div>
      <div><h3>Natural frequencies</h3><div class="eq">f_body ≈ (1/2π)·√(k_ride/m_s),  k_ride = k_s·k_t/(k_s+k_t)</div><div class="eq">f_hop ≈ (1/2π)·√((k_s+k_t)/m_u)</div>
      <p>Between the two modes (≈ 4–8 Hz) the body is well isolated. Lowering m_u raises f_hop and cuts dynamic tyre load (better grip) — this is why unsprung mass matters so much for a leaf-sprung live axle.</p></div>
      <div><h3>The damping compromise</h3><div class="eq">ζ = c / (2·√(k_s·m_s))</div><p>Low ζ (≈ 0.2) isolates well above f_body but lets the body float at resonance. High ζ (≈ 0.6) controls the body and wheel but transmits harshness. A semi-active skyhook damper (as on CDC air suspension) applies damping only when it opposes the body's absolute velocity, so it gets most of both.</p></div>
      <div><h3>Comfort &amp; grip metrics</h3><p><b>RMS body acceleration</b> is compared with the ISO 2631-1 comfort scale (&lt; 0.315 m/s² not uncomfortable … &gt; 2 m/s² extremely uncomfortable). The value here is unweighted; ISO applies frequency weighting W_k, which peaks at 4–8 Hz. <b>Dynamic tyre load</b> (RMS / static) is the road-holding index: lower means more consistent grip.</p></div></div>`;
  }

  function init() { buildUI(); theory(); requestAnimationFrame(frame); }
  return { init, loadPreset, redraw: changed };
})();
