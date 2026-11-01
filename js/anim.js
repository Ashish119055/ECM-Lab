/* ECM Lab — "How it works" animations for the part drawer.
   Each animation draws a cut-away of the working principle in the top of a canvas and returns
   the instantaneous output signal, which is traced like an oscilloscope underneath. */

const Anim = (() => {
  let raf = 0;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
  const TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(ctx, txt, x, y, c, size = 11, align = 'left') {
    ctx.fillStyle = c; ctx.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`; ctx.textAlign = align; ctx.fillText(txt, x, y);
  }
  function metal(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#e9ecef'); g.addColorStop(.5, '#9aa0a7'); g.addColorStop(1, '#c9cdd2'); return g;
  }
  function coilDraw(ctx, x, y, w, h, on, turns = 9) {
    ctx.strokeStyle = on ? '#ff9a2f' : '#b8743c'; ctx.lineWidth = 3;
    for (let i = 0; i < turns; i++) { const xx = x + (i + .5) * w / turns; ctx.beginPath(); ctx.ellipse(xx, y + h / 2, w / turns / 2.2, h / 2, 0, 0, TAU); ctx.stroke(); }
    if (on) { ctx.fillStyle = 'rgba(255,170,60,.12)'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12); }
  }

  const A = {
    wheel(c, st, W, H, k) {
      const cx = W * 0.3, cy = H * 0.6, R = Math.min(W * 0.2, H * 0.3);
      st.a = (st.a || 0) + st.dt * 2.2;
      c.save(); c.translate(cx, cy); c.rotate(st.a);
      c.fillStyle = metal(c, -R, -R, 2 * R, 2 * R); c.beginPath(); c.arc(0, 0, R * 0.86, 0, TAU); c.fill();
      for (let i = 0; i < 60; i++) {
        if (i >= 58) continue;
        c.save(); c.rotate(i * TAU / 60); c.fillStyle = '#8f959c'; c.fillRect(-R * 0.035, -R, R * 0.07, R * 0.16); c.restore();
      }
      c.fillStyle = '#5b6168'; c.beginPath(); c.arc(0, 0, R * 0.25, 0, TAU); c.fill();
      c.restore();
      // sensor
      c.fillStyle = '#1d1e21'; rr(c, cx - 12, cy - R - 48, 24, 40, 4); c.fill();
      c.fillStyle = '#c46c2c'; c.fillRect(cx - 9, cy - R - 24, 18, 12);
      label(c, 'magnet + coil', cx + 20, cy - R - 20, k.ink2, 10);
      // compute signal from nearest tooth to top (-90°)
      let rel = ((-Math.PI / 2 - st.a) % TAU + TAU) % TAU; // angle in wheel coordinates
      const pos = rel / (TAU / 60);
      const i = Math.round(pos), d = pos - i;
      const tooth = ((i % 60) + 60) % 60;
      const present = tooth < 58;
      const v = present ? -Math.sin(d * Math.PI * 2) * Math.exp(-d * d * 6) * 1.0 : 0;
      label(c, '60 − 2 reluctor wheel', W * 0.6, cy + 20, k.ink2, 10);
      label(c, present ? '' : '◄ missing-tooth gap = TDC reference', W * 0.6, cy, k.accent, 11);
      return { v, min: -1.1, max: 1.1, text: `${(v * 8).toFixed(1)} V AC`, unit: 'AC volts' };
    },
    hall(c, st, W, H, k) {
      const cx = W * 0.32, cy = H * 0.55, R = Math.min(W * 0.2, H * 0.38);
      st.a = (st.a || 0) + st.dt * 1.4;
      c.save(); c.translate(cx, cy); c.rotate(st.a);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = metal(c, -R, -R, 2 * R, 2 * R);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, i * TAU / 4, i * TAU / 4 + TAU / 8); c.closePath(); c.fill();
      }
      c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, R * .3, 0, TAU); c.fill();
      c.restore();
      const rel = (((-Math.PI / 2 - st.a) % TAU) + TAU) % TAU;
      const vane = (rel % (TAU / 4)) < TAU / 8;
      c.fillStyle = '#d42a24'; c.fillRect(cx - 34, cy - R - 8, 14, 18); label(c, 'N', cx - 31, cy - R + 5, '#fff', 10);
      c.fillStyle = '#1d1e21'; rr(c, cx + 20, cy - R - 10, 20, 22, 3); c.fill();
      c.fillStyle = vane ? '#666' : '#4ade80'; c.fillRect(cx + 25, cy - R - 4, 10, 10);
      if (!vane) { c.strokeStyle = 'rgba(80,150,255,.6)'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(cx - 20, cy - R + 1); c.lineTo(cx + 20, cy - R + 1); c.stroke(); c.setLineDash([]); }
      label(c, 'Hall chip', cx + 46, cy - R + 4, k.ink2, 10);
      label(c, vane ? 'Vane blocks field → 0 V' : 'Field reaches chip → 5 V', W * 0.6, cy + 10, k.accent, 11);
      const v = vane ? 0.2 : 5;
      return { v, min: -0.5, max: 5.5, text: `${v.toFixed(1)} V`, unit: 'volts' };
    },
    therm(c, st, W, H, k, part) {
      const ptc = part.id === 'egt';
      const T = ptc ? 450 + 400 * Math.sin(st.t * 0.5) : 50 + 48 * Math.sin(st.t * 0.6);
      const x = W * 0.12, y = H * 0.12, h = H * 0.7;
      const frac = ptc ? (T + 40) / 940 : (T + 0) / 100;
      c.fillStyle = k.line; rr(c, x, y, 18, h, 9); c.fill();
      const g = c.createLinearGradient(0, y + h, 0, y); g.addColorStop(0, '#2563eb'); g.addColorStop(1, '#ef4444');
      c.fillStyle = g; rr(c, x + 3, y + h - frac * h + 3, 12, frac * h - 6, 6); c.fill();
      label(c, `${Math.round(T)} °C`, x + 26, y + h - frac * h + 6, k.ink, 12);
      // curve
      const gx = W * 0.4, gy = H * 0.1, gw = W * 0.54, gh = H * 0.72;
      c.strokeStyle = k.line; c.lineWidth = 1; c.strokeRect(gx, gy, gw, gh);
      c.strokeStyle = k.signal; c.lineWidth = 2; c.beginPath();
      const Rf = t => ptc ? 200 * (1 + 0.00385 * t) : 2400 * Math.exp(3500 * (1 / (t + 273.15) - 1 / 293.15));
      const tMin = ptc ? -40 : -20, tMax = ptc ? 900 : 120;
      const rMax = ptc ? Rf(900) : Rf(-20);
      for (let i = 0; i <= 60; i++) {
        const t = tMin + (tMax - tMin) * i / 60; const r = Rf(t);
        const px = gx + gw * i / 60, py = gy + gh - gh * Math.min(1, r / rMax);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
      const r = Rf(T);
      const dx = gx + gw * (T - tMin) / (tMax - tMin), dy = gy + gh - gh * Math.min(1, r / rMax);
      c.fillStyle = k.accent; c.beginPath(); c.arc(dx, dy, 5, 0, TAU); c.fill();
      label(c, ptc ? 'PTC: resistance rises with heat' : 'NTC: resistance falls with heat', gx + 6, gy + 14, k.ink2, 10);
      label(c, `${r > 1000 ? (r / 1000).toFixed(2) + ' kΩ' : Math.round(r) + ' Ω'}`, dx + 8, dy - 6, k.ink, 11);
      const v = ptc ? 5 * r / (r + 1000) : 5 * r / (r + 2490);
      return { v, min: 0, max: 5, text: `${v.toFixed(2)} V`, unit: 'signal volts' };
    },
    pot(c, st, W, H, k, part) {
      const pos = 0.5 + 0.5 * Math.sin(st.t * 0.9);
      const cx = W * 0.3, cy = H * 0.62, R = Math.min(W * 0.2, H * 0.48);
      c.lineWidth = 10; c.strokeStyle = '#3a3d42'; c.beginPath(); c.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#7a4a25'; c.beginPath(); c.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      const a = Math.PI * 1.1 + pos * Math.PI * 0.8;
      c.strokeStyle = metal(c, cx - R, cy - R, R, R); c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); c.stroke();
      c.fillStyle = '#d0d4d8'; c.beginPath(); c.arc(cx, cy, 7, 0, TAU); c.fill();
      label(c, '0.5 V', cx - R - 12, cy + 16, k.ink2, 10); label(c, '4.5 V', cx + R - 18, cy + 16, k.ink2, 10);
      label(c, part.id === 'app' ? 'Pedal travel' : 'Throttle angle', W * 0.58, H * 0.25, k.ink2, 11);
      label(c, `${Math.round(pos * 100)} %`, W * 0.58, H * 0.25 + 22, k.ink, 18);
      const v1 = 0.5 + pos * 4, v2 = part.id === 'app' ? v1 / 2 : 5 - v1;
      label(c, `Track 1  ${v1.toFixed(2)} V`, W * 0.58, H * 0.62, k.signal, 11);
      label(c, `Track 2  ${v2.toFixed(2)} V`, W * 0.58, H * 0.62 + 18, k.accent, 11);
      return { v: v1, v2, min: 0, max: 5, text: `${v1.toFixed(2)} V`, unit: 'volts' };
    },
    press(c, st, W, H, k, part) {
      const p = 0.5 + 0.5 * Math.sin(st.t * 0.8);
      const x = W * 0.12, y = H * 0.18, w = W * 0.36, h = H * 0.6;
      c.fillStyle = '#1d1e21'; rr(c, x, y, w, h, 8); c.fill();
      c.fillStyle = k.bg2; c.fillRect(x + 10, y + 10, w - 20, h * 0.35);
      label(c, 'reference vacuum', x + 16, y + 28, k.ink2, 10);
      const dy = (p - 0.5) * 18;
      c.strokeStyle = '#9aa0a7'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 10, y + h * 0.45); c.quadraticCurveTo(x + w / 2, y + h * 0.45 - dy * 2, x + w - 10, y + h * 0.45); c.stroke();
      for (let i = 0; i < 4; i++) { c.fillStyle = '#facc15'; c.fillRect(x + w * 0.3 + i * 12, y + h * 0.45 - dy - 4, 6, 3); }
      for (let i = 0; i < 5; i++) {
        const ax = x + 20 + i * (w - 40) / 4, ay = y + h * 0.85;
        c.strokeStyle = k.signal; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - 10 - p * 14); c.stroke();
        c.beginPath(); c.moveTo(ax - 4, ay - 6 - p * 14); c.lineTo(ax, ay - 12 - p * 14); c.lineTo(ax + 4, ay - 6 - p * 14); c.stroke();
      }
      label(c, 'strain gauges on silicon diaphragm', x, y + h + 18, k.ink2, 10);
      const ranges = { map: [20, 105, 'kPa'], boost: [100, 250, 'kPa'], rps: [0, 1800, 'bar'], dpfp: [0, 40, 'kPa'] };
      const [lo, hi, u] = ranges[part.id] || [0, 100, 'kPa'];
      const val = lo + (hi - lo) * p;
      label(c, 'Pressure', W * 0.6, H * 0.3, k.ink2, 11);
      label(c, `${Math.round(val)} ${u}`, W * 0.6, H * 0.3 + 22, k.ink, 18);
      const v = 0.5 + p * 4;
      return { v, min: 0, max: 5, text: `${v.toFixed(2)} V`, unit: 'volts' };
    },
    hotwire(c, st, W, H, k) {
      const flow = 0.5 + 0.5 * Math.sin(st.t * 0.7);
      const x = W * 0.06, y = H * 0.26, w = W * 0.62, h = H * 0.46;
      c.fillStyle = '#1d1e21'; rr(c, x, y, w, h, 10); c.fill();
      c.fillStyle = k.bg2; c.fillRect(x + 6, y + 8, w - 12, h - 16);
      st.parts = st.parts || [...Array(40)].map(() => ({ x: Math.random(), y: Math.random() }));
      st.parts.forEach(p => {
        p.x += st.dt * (0.15 + flow * 0.9); if (p.x > 1) { p.x = 0; p.y = Math.random(); }
        c.fillStyle = 'rgba(90,181,238,.8)'; c.fillRect(x + 8 + p.x * (w - 16), y + 10 + p.y * (h - 20), 6, 2);
      });
      const hx = x + w * 0.55;
      c.fillStyle = `rgba(255,${140 - flow * 60},40,1)`; c.fillRect(hx, y + 10, 4, h - 20);
      c.shadowColor = '#ff9a2f'; c.shadowBlur = 14; c.fillRect(hx, y + 10, 4, h - 20); c.shadowBlur = 0;
      label(c, 'heated film (held at ≈ 120 °C above air)', x, y - 8, k.ink2, 10);
      label(c, 'Air flow', W * 0.73, H * 0.32, k.ink2, 11);
      label(c, `${(2 + flow * 120).toFixed(0)} g/s`, W * 0.73, H * 0.32 + 22, k.ink, 18);
      const v = 1 + flow * 3.4;
      return { v, min: 0, max: 5, text: `${v.toFixed(2)} V`, unit: 'volts' };
    },
    o2(c, st, W, H, k, part) {
      const down = part.id === 'o2down';
      st.ph = (st.ph || 0) + st.dt * 1.1;
      const rich = Math.sin(st.ph * Math.PI) > 0;
      const x = W * 0.04, y = H * 0.36, w = W * 0.62, h = H * 0.3;
      c.fillStyle = '#5b6168'; rr(c, x, y, w, h, h / 2); c.fill();
      c.fillStyle = k.bg2; rr(c, x + 5, y + 5, w - 10, h - 10, h / 2); c.fill();
      st.pp = st.pp || [...Array(36)].map(() => ({ x: Math.random(), y: Math.random(), o: Math.random() }));
      st.pp.forEach(p => {
        p.x += st.dt * 0.4; if (p.x > 1) { p.x = 0; p.y = Math.random(); p.o = Math.random(); }
        const isO2 = down ? p.o < 0.45 : rich ? p.o < 0.1 : p.o < 0.7;
        c.fillStyle = isO2 ? '#5ab5ee' : '#666'; c.beginPath(); c.arc(x + 10 + p.x * (w - 20), y + 8 + p.y * (h - 16), isO2 ? 3 : 2.5, 0, TAU); c.fill();
      });
      const sx = x + w * 0.5;
      c.fillStyle = '#c9cdd2'; c.fillRect(sx - 8, y - 46, 16, 50);
      c.fillStyle = '#e8d8a8'; c.fillRect(sx - 5, y - 4, 10, 18);
      label(c, 'zirconia element', sx + 14, y - 30, k.ink2, 10);
      label(c, '● O₂ molecules', W * 0.7, H * 0.2, '#5ab5ee', 11);
      const v = down ? 0.66 + Math.sin(st.t) * 0.03 : (rich ? 0.82 : 0.14) + Math.sin(st.t * 9) * 0.02;
      label(c, down ? 'Catalyst storing O₂ → steady' : rich ? 'RICH: little O₂ → 0.8 V' : 'LEAN: excess O₂ → 0.1 V', W * 0.7, H * 0.5, k.accent, 11);
      return { v, min: 0, max: 1, text: `${v.toFixed(2)} V`, unit: 'volts' };
    },
    piezo(c, st, W, H, k) {
      st.kt = (st.kt || 0) + st.dt;
      const knock = (st.t % 4) > 3.2;
      const shake = knock ? Math.sin(st.t * 120) * 3 : Math.sin(st.t * 40) * 0.6;
      const x = W * 0.1 + shake, y = H * 0.18, w = W * 0.4, h = H * 0.6;
      c.fillStyle = '#7c838b'; rr(c, x, y, w, h, 6); c.fill();
      c.fillStyle = '#5b6168'; for (let i = 0; i < 3; i++) { rr(c, x + 12 + i * (w - 24) / 3, y + 10, (w - 24) / 3 - 8, h * 0.45, 4); c.fill(); }
      c.fillStyle = '#1d1e21'; c.beginPath(); c.ellipse(x + w + 14, y + h * 0.7, 14, 22, 0, 0, TAU); c.fill();
      if (knock) for (let i = 1; i < 4; i++) { c.strokeStyle = `rgba(239,68,68,${1 - i / 4})`; c.lineWidth = 2; c.beginPath(); c.arc(x + w * 0.5, y + h * 0.25, i * 18 + (st.t * 60 % 18), -0.6, 0.6); c.stroke(); }
      label(c, knock ? 'KNOCK detected → ECM retards timing' : 'Normal combustion', W * 0.6, H * 0.3, knock ? '#ef4444' : k.ink2, 11);
      label(c, 'piezo crystal squeezed by vibration', W * 0.6, H * 0.3 + 18, k.ink2, 10);
      const v = knock ? Math.sin(st.t * 200) * (0.6 + Math.random() * 0.4) : Math.sin(st.t * 160) * 0.08 * Math.random();
      return { v, min: -1.1, max: 1.1, text: `${v.toFixed(2)} V`, unit: 'volts' };
    },
    switch(c, st, W, H, k, part) {
      const on = Math.sin(st.t * 1.2) > 0;
      const x = W * 0.12, y = H * 0.5;
      c.strokeStyle = k.ink; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y); c.stroke();
      c.beginPath(); c.moveTo(x + 60, y); c.lineTo(x + 110, on ? y : y - 28); c.stroke();
      c.beginPath(); c.moveTo(x + 112, y); c.lineTo(x + 170, y); c.stroke();
      c.fillStyle = k.ink; [x + 60, x + 112].forEach(px => { c.beginPath(); c.arc(px, y, 5, 0, TAU); c.fill(); });
      const lit = part.id === 'oilp' ? !on : on;
      c.fillStyle = lit ? '#fbbf24' : k.line; c.beginPath(); c.arc(x + 200, y, 16, 0, TAU); c.fill();
      if (lit) { c.shadowColor = '#fbbf24'; c.shadowBlur = 20; c.fill(); c.shadowBlur = 0; }
      label(c, part.id === 'oilp' ? (on ? 'Oil pressure OK → switch open' : 'No pressure → closed → lamp ON') : on ? 'Closed' : 'Open', x, y + 44, k.accent, 11);
      const v = part.id === 'oilp' ? (on ? 12 : 0) : on ? 12 : 0;
      return { v, min: -1, max: 14, text: `${v.toFixed(1)} V`, unit: 'volts' };
    },
    injector(c, st, W, H, k, part) {
      const diesel = part.id === 'injd';
      const period = 1.6, ph = st.t % period, on = ph < 0.45;
      const x = W * 0.16, y = H * 0.06, w = 70, h = H * 0.7;
      c.fillStyle = diesel ? metal(c, x, y, w, h) : '#1f9a42'; rr(c, x, y, w, h * 0.7, 6); c.fill();
      c.fillStyle = metal(c, x, y, w, h); rr(c, x + 18, y + h * 0.7, w - 36, h * 0.3, 3); c.fill();
      coilDraw(c, x + 8, y + h * 0.18, w - 16, h * 0.22, on, 7);
      const lift = on ? 6 : 0;
      c.fillStyle = '#e5e7eb'; c.fillRect(x + w / 2 - 3, y + h * 0.42 - lift, 6, h * 0.58);
      if (on) {
        st.sp = st.sp || [];
        for (let i = 0; i < 6; i++) st.sp.push({ x: x + w / 2, y: y + h + 2, vx: (Math.random() - .5) * 90, vy: 80 + Math.random() * 90, l: 0.5 });
      }
      st.sp = (st.sp || []).filter(p => (p.l -= st.dt) > 0);
      st.sp.forEach(p => { p.x += p.vx * st.dt; p.y += p.vy * st.dt; c.fillStyle = diesel ? 'rgba(214,190,90,.8)' : 'rgba(150,200,255,.85)'; c.fillRect(p.x, p.y, 2, 2); });
      label(c, on ? 'Coil energised → needle lifts → spray' : 'Spring holds needle closed', W * 0.5, H * 0.25, k.accent, 11);
      label(c, diesel ? 'Rail pressure 300 – 2000 bar' : 'Fuel pressure 3 – 4 bar', W * 0.5, H * 0.25 + 18, k.ink2, 10);
      let v;
      if (diesel) v = on ? (ph < 0.08 ? 20 : 12) : 0;
      else v = on ? 0.3 : ph < 0.52 ? 60 * Math.exp(-(ph - 0.45) * 60) + 12 : 12;
      return diesel ? { v, min: -2, max: 24, text: `${v.toFixed(0)} A`, unit: 'current (peak & hold)' }
        : { v, min: -2, max: 64, text: `${v.toFixed(1)} V`, unit: 'driver volts (to ground)' };
    },
    coil(c, st, W, H, k) {
      const period = 1.4, ph = st.t % period, dwell = ph < 0.5, spark = ph >= 0.5 && ph < 0.62;
      const x = W * 0.08, y = H * 0.12;
      c.fillStyle = '#26282c'; rr(c, x, y, 120, H * 0.62, 8); c.fill();
      coilDraw(c, x + 10, y + 12, 100, 22, dwell, 6);
      coilDraw(c, x + 10, y + 46, 100, 30, spark, 16);
      label(c, 'primary', x + 128, y + 28, k.ink2, 10); label(c, 'secondary', x + 128, y + 66, k.ink2, 10);
      const px = W * 0.56, py = H * 0.55;
      c.fillStyle = '#e5e7eb'; c.fillRect(px, py - 30, 10, 26); c.fillRect(px, py + 4, 10, 26);
      if (spark) { c.strokeStyle = '#93c5fd'; c.lineWidth = 3; c.shadowColor = '#60a5fa'; c.shadowBlur = 16; c.beginPath(); c.moveTo(px + 5, py - 4); c.lineTo(px + 1, py); c.lineTo(px + 9, py + 1); c.lineTo(px + 5, py + 4); c.stroke(); c.shadowBlur = 0; }
      label(c, dwell ? 'Dwell: field builds' : spark ? 'Field collapses → 25 kV spark' : 'Waiting for next cycle', W * 0.66, H * 0.5, k.accent, 11);
      const v = dwell ? 0.6 : spark ? (ph < 0.52 ? 350 : 40) : 12;
      return { v, min: -10, max: 380, text: `${v.toFixed(0)} V`, unit: 'primary volts' };
    },
    motor(c, st, W, H, k, part) {
      const duty = 0.5 + 0.35 * Math.sin(st.t * 0.5);
      st.a = (st.a || 0) + st.dt * duty * 14;
      const cx = W * 0.28, cy = H * 0.48, R = Math.min(W * 0.18, H * 0.36);
      c.fillStyle = '#d42a24'; c.fillRect(cx - R - 18, cy - R * .6, 16, R * 1.2);
      c.fillStyle = '#2563eb'; c.fillRect(cx + R + 2, cy - R * .6, 16, R * 1.2);
      label(c, 'N', cx - R - 14, cy + 4, '#fff', 11); label(c, 'S', cx + R + 6, cy + 4, '#fff', 11);
      c.save(); c.translate(cx, cy); c.rotate(st.a);
      for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.fillStyle = metal(c, -R, -R, R, R); rr(c, -6, -R, 12, R, 3); c.fill(); c.fillStyle = '#b8743c'; c.fillRect(-9, -R * 0.75, 18, R * 0.35); }
      c.restore();
      c.fillStyle = '#444'; c.beginPath(); c.arc(cx, cy, 8, 0, TAU); c.fill();
      label(c, `PWM duty ${Math.round(duty * 100)} %`, W * 0.6, H * 0.32, k.ink, 14);
      label(c, 'Average voltage sets speed / position', W * 0.6, H * 0.32 + 20, k.ink2, 10);
      const ph = (st.t * 6) % 1;
      const v = ph < duty ? 12 : 0;
      return { v, min: -1, max: 14, text: `${(duty * 12).toFixed(1)} V avg`, unit: 'PWM volts' };
    },
    solenoid(c, st, W, H, k) {
      const duty = 0.5 + 0.4 * Math.sin(st.t * 0.6);
      const x = W * 0.1, y = H * 0.2, w = W * 0.38, h = H * 0.44;
      c.fillStyle = '#26282c'; rr(c, x, y, w, h, 8); c.fill();
      coilDraw(c, x + 10, y + 8, w - 20, h - 16, true, 10);
      const px = x + 10 + duty * 30;
      c.fillStyle = metal(c, px, y + h / 2 - 8, w, 16); c.fillRect(px, y + h / 2 - 8, w * 0.8, 16);
      c.fillStyle = '#9aa0a7'; c.fillRect(px + w * 0.8, y + h / 2 - 3, 40, 6);
      label(c, `Duty ${Math.round(duty * 100)} % → valve ${Math.round(duty * 100)} % open`, W * 0.56, H * 0.35, k.accent, 11);
      label(c, 'Magnetic force vs return spring', W * 0.56, H * 0.35 + 18, k.ink2, 10);
      const ph = (st.t * 8) % 1;
      const v = ph < duty ? 0.3 : 12;
      return { v, min: -1, max: 14, text: `${Math.round(duty * 100)} % duty`, unit: 'driver volts' };
    },
    glow(c, st, W, H, k, part) {
      const ph = st.t % 8, on = ph < 5;
      const T = on ? 1000 * (1 - Math.exp(-ph * 1.1)) : 1000 * Math.exp(-(ph - 5) * 1.3);
      const frac = Math.min(1, T / 1000);
      const x = W * 0.08, y = H * 0.42;
      if (part.id === 'defog') {
        for (let i = 0; i < 8; i++) { c.strokeStyle = `rgb(${120 + frac * 135},${70 + frac * 60},${40})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x, H * 0.12 + i * 12); c.quadraticCurveTo(W * 0.3, H * 0.06 + i * 12, W * 0.55, H * 0.12 + i * 12); c.stroke(); }
        c.fillStyle = `rgba(200,220,240,${0.6 * (1 - frac)})`; c.fillRect(x, H * 0.08, W * 0.47, 100);
      } else {
        c.fillStyle = metal(c, x, y, 200, 16); c.fillRect(x, y, W * 0.4, 16);
        c.fillStyle = `rgb(${80 + frac * 175},${60 + frac * 120},${40 + frac * 20})`;
        c.shadowColor = '#ff7a1a'; c.shadowBlur = 30 * frac; rr(c, x + W * 0.4, y + 2, 40, 12, 6); c.fill(); c.shadowBlur = 0;
      }
      label(c, `${Math.round(T)} °C`, W * 0.66, H * 0.3, k.ink, 18);
      label(c, on ? 'Heating (12 V applied)' : 'Off – cooling', W * 0.66, H * 0.3 + 20, k.accent, 11);
      return { v: on ? 12 : 0, min: -1, max: 14, text: on ? '12 V' : '0 V', unit: 'supply volts' };
    },
    relay(c, st, W, H, k) {
      const on = Math.sin(st.t * 1.1) > 0;
      const x = W * 0.08, y = H * 0.18;
      c.strokeStyle = k.ink2; c.lineWidth = 1.5; c.strokeRect(x, y, W * 0.5, H * 0.6);
      coilDraw(c, x + 14, y + 20, 70, 26, on, 7);
      label(c, '85', x + 10, y + H * 0.6 - 8, k.ink2, 10); label(c, '86', x + 70, y + H * 0.6 - 8, k.ink2, 10);
      const ax = x + 120;
      c.strokeStyle = k.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, y + 70); c.lineTo(ax + 50, on ? y + 70 : y + 46); c.stroke();
      c.beginPath(); c.moveTo(ax + 52, y + 70); c.lineTo(ax + 70, y + 70); c.stroke();
      label(c, '30', ax - 6, y + 90, k.ink2, 10); label(c, '87', ax + 56, y + 90, k.ink2, 10);
      c.fillStyle = on ? '#fbbf24' : k.line; c.beginPath(); c.arc(W * 0.75, H * 0.45, 18, 0, TAU); c.fill();
      if (on) { c.shadowColor = '#fbbf24'; c.shadowBlur = 24; c.fill(); c.shadowBlur = 0; }
      label(c, on ? 'Small coil current closes big contacts' : 'Coil off – contacts open', W * 0.6, H * 0.85, k.accent, 11);
      return { v: on ? 12 : 0, min: -1, max: 14, text: on ? 'Coil 12 V' : 'Coil 0 V', unit: 'coil volts' };
    },
    lamp(c, st, W, H, k, part) {
      const on = part.id === 'indicator' ? (st.t % 0.8) < 0.4 : Math.sin(st.t * 0.9) > -0.3;
      const cx = W * 0.3, cy = H * 0.45;
      const col = part.id === 'indicator' ? '#f59a0c' : part.id === 'taillamp' || part.id === 'brakelamp' ? '#ef4444' : part.id === 'mil' ? '#f59a0c' : '#fff3c4';
      c.fillStyle = on ? col : k.line; c.beginPath(); c.arc(cx, cy, 34, 0, TAU); c.fill();
      if (on) { c.shadowColor = col; c.shadowBlur = 40; c.fill(); c.shadowBlur = 0; }
      c.strokeStyle = on ? '#fff' : k.ink2; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 12, cy + 8); for (let i = 0; i < 6; i++) c.lineTo(cx - 12 + i * 5, cy + (i % 2 ? -6 : 6)); c.stroke();
      label(c, on ? 'Current flows → filament / LED lights' : 'Circuit open', W * 0.58, H * 0.4, k.accent, 11);
      label(c, 'I = P ÷ V', W * 0.58, H * 0.4 + 18, k.ink2, 10);
      return { v: on ? 4.6 : 0, min: -0.5, max: 6, text: on ? '≈ 4.6 A' : '0 A', unit: 'current' };
    },
    horn(c, st, W, H, k) {
      const on = (st.t % 2) < 1.2;
      const cx = W * 0.22, cy = H * 0.45;
      c.fillStyle = '#c81e1e'; c.beginPath(); c.arc(cx, cy, 42, 0, TAU); c.fill();
      const d = on ? Math.sin(st.t * 180) * 3 : 0;
      c.fillStyle = '#7e0e0e'; c.beginPath(); c.arc(cx, cy, 22 + d, 0, TAU); c.fill();
      if (on) for (let i = 1; i < 5; i++) { c.strokeStyle = `rgba(250,204,21,${1 - i / 5})`; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, 44 + i * 14 + (st.t * 80 % 14), -0.7, 0.7); c.stroke(); }
      label(c, on ? 'Diaphragm vibrates ≈ 420 Hz' : 'Horn pad released', W * 0.6, H * 0.4, k.accent, 11);
      const v = on ? Math.sin(st.t * 60) * 5 : 0;
      return { v, min: -6, max: 6, text: on ? '420 Hz' : 'Silent', unit: 'sound' };
    },
    wiper(c, st, W, H, k) {
      const a = Math.sin(st.t * 2) * 0.5 + 0.5;
      c.fillStyle = 'rgba(160,190,220,.35)'; c.beginPath(); c.moveTo(W * 0.05, H * 0.85); c.lineTo(W * 0.12, H * 0.1); c.lineTo(W * 0.6, H * 0.1); c.lineTo(W * 0.66, H * 0.85); c.closePath(); c.fill();
      const px = W * 0.2, py = H * 0.82, L = H * 0.7;
      const ang = -Math.PI * (0.08 + a * 0.75);
      c.strokeStyle = '#1d1e21'; c.lineWidth = 5; c.beginPath(); c.moveTo(px, py); c.lineTo(px + L * Math.cos(ang), py + L * Math.sin(ang)); c.stroke();
      label(c, 'Park switch stops arms at rest', W * 0.7, H * 0.4, k.ink2, 10);
      return { v: 12, min: -1, max: 14, text: 'Low speed 12 V', unit: 'motor volts' };
    },
    window(c, st, W, H, k) {
      const pos = 0.5 + 0.5 * Math.sin(st.t * 0.7);
      const up = Math.cos(st.t * 0.7) > 0;
      const x = W * 0.1, y = H * 0.08, w = W * 0.4, h = H * 0.8;
      c.strokeStyle = k.ink2; c.lineWidth = 2; c.strokeRect(x, y, w, h);
      c.fillStyle = 'rgba(160,190,220,.6)'; c.fillRect(x + 4, y + 4 + (1 - pos) * h * 0.55, w - 8, h * 0.45);
      c.fillStyle = k.panel; c.fillRect(x, y + h * 0.5, w, h * 0.5); c.strokeRect(x, y + h * 0.5, w, h * 0.5);
      label(c, up ? '▲ UP: pin A +12 V, pin B 0 V' : '▼ DOWN: polarity reversed', W * 0.56, H * 0.4, k.accent, 11);
      return { v: up ? 12 : -12, min: -14, max: 14, text: up ? '+12 V' : '−12 V', unit: 'motor polarity' };
    },
    lock(c, st, W, H, k) {
      const ph = st.t % 3, locked = ph > 1.5;
      const x = W * 0.12, y = H * 0.35;
      c.fillStyle = '#1d1e21'; rr(c, x, y, 90, 50, 6); c.fill();
      c.fillStyle = metal(c, 0, 0, 1, 10); c.fillRect(x + 90, y + 20, locked ? 70 : 40, 8);
      label(c, locked ? 'LOCKED' : 'UNLOCKED', W * 0.6, H * 0.4, k.accent, 14);
      const pulse = (ph > 1.5 && ph < 1.8) ? 12 : (ph < 0.3 ? -12 : 0);
      return { v: pulse, min: -14, max: 14, text: `${pulse} V`, unit: 'actuator pulse' };
    },
    battery(c, st, W, H, k) {
      const ph = st.t % 9;
      const v = ph < 3 ? 12.6 : ph < 4 ? 10.2 + Math.sin(st.t * 30) * 0.2 : 14.2;
      const x = W * 0.1, y = H * 0.2, w = W * 0.38, h = H * 0.56;
      c.fillStyle = '#1d1e21'; rr(c, x, y, w, h, 6); c.fill();
      for (let i = 0; i < 6; i++) { c.fillStyle = '#3d4046'; c.fillRect(x + 8 + i * (w - 16) / 6, y + 10, (w - 16) / 6 - 4, h - 20); }
      c.fillStyle = '#d42a24'; c.fillRect(x + 10, y - 10, 18, 10); c.fillStyle = '#888'; c.fillRect(x + w - 28, y - 10, 18, 10);
      label(c, ph < 3 ? 'Resting: 12.6 V' : ph < 4 ? 'Cranking: drops to ≈ 10 V' : 'Engine running: alternator 14.2 V', W * 0.56, H * 0.4, k.accent, 11);
      label(c, '6 cells × 2.1 V', W * 0.56, H * 0.4 + 18, k.ink2, 10);
      return { v, min: 8, max: 15, text: `${v.toFixed(1)} V`, unit: 'battery volts' };
    },
    ecm(c, st, W, H, k) {
      const x = W * 0.36, y = H * 0.18, w = W * 0.28, h = H * 0.6;
      c.fillStyle = k.panel; c.strokeStyle = k.ink2; c.lineWidth = 1.5; rr(c, x, y, w, h, 8); c.fill(); c.stroke();
      label(c, 'MCU', x + w / 2, y + h / 2 + 4, k.ink, 14, 'center');
      ['CKP', 'MAF', 'ECT', 'APP'].forEach((t, i) => {
        const yy = y + 14 + i * (h - 20) / 4; label(c, t, W * 0.04, yy + 4, k.ink2, 10);
        c.strokeStyle = k.line; c.beginPath(); c.moveTo(W * 0.12, yy); c.lineTo(x, yy); c.stroke();
        const p = (st.t * 0.8 + i * 0.25) % 1; c.fillStyle = k.signal; c.beginPath(); c.arc(W * 0.12 + p * (x - W * 0.12), yy, 3, 0, TAU); c.fill();
      });
      ['INJ', 'IGN', 'ETB', 'FAN'].forEach((t, i) => {
        const yy = y + 14 + i * (h - 20) / 4; label(c, t, W * 0.9, yy + 4, k.ink2, 10);
        c.strokeStyle = k.line; c.beginPath(); c.moveTo(x + w, yy); c.lineTo(W * 0.88, yy); c.stroke();
        const p = (st.t * 0.8 + i * 0.25) % 1; c.fillStyle = k.accent; c.beginPath(); c.arc(x + w + p * (W * 0.88 - x - w), yy, 3, 0, TAU); c.fill();
      });
      const bit = Math.floor(st.t * 14) % 7 === 0 ? 0 : (Math.floor(st.t * 37) % 3 ? 1 : 0);
      return { v: bit ? 3.5 : 2.5, min: 1.5, max: 4.5, text: 'CAN-H', unit: 'CAN bus volts' };
    }
  };

  function start(canvas, part) {
    stop();
    const ctx = canvas.getContext('2d');
    const st = { t: 0, dt: 0, buf: [], buf2: [] };
    let last = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.dt = Math.min(0.05, (now - last) / 1000) * (reduce ? 0.3 : 1); last = now; st.t += st.dt;
      const k = { ink: css('--ink'), ink2: css('--ink-2'), line: css('--line'), accent: css('--accent'), signal: css('--signal'), panel: css('--panel'), bg2: css('--bg-2') };
      ctx.clearRect(0, 0, W, H);
      const topH = H * 0.6;
      const fn = A[part.anim] || A.ecm;
      const out = fn(ctx, st, W, topH, k, part);
      // trace
      const ty = topH + 8, th = H - ty - 8;
      ctx.fillStyle = k.bg2; rr(ctx, 6, ty, W - 12, th, 8); ctx.fill();
      ctx.strokeStyle = k.line; ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(6 + i * (W - 12) / 10, ty); ctx.lineTo(6 + i * (W - 12) / 10, ty + th); ctx.stroke(); }
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(6, ty + i * th / 4); ctx.lineTo(W - 6, ty + i * th / 4); ctx.stroke(); }
      st.buf.push(out.v); if (out.v2 !== undefined) st.buf2.push(out.v2);
      const N = Math.floor((W - 12) / 1.5);
      while (st.buf.length > N) st.buf.shift(); while (st.buf2.length > N) st.buf2.shift();
      const yOf = v => ty + th - 6 - (v - out.min) / (out.max - out.min) * (th - 12);
      const plot = (buf, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        buf.forEach((v, i) => { const x = 6 + i * 1.5; i ? ctx.lineTo(x, yOf(v)) : ctx.moveTo(x, yOf(v)); });
        ctx.stroke();
      };
      if (st.buf2.length) plot(st.buf2, k.accent);
      plot(st.buf, k.signal);
      label(ctx, out.unit.toUpperCase(), 14, ty + 16, k.ink2, 10);
      label(ctx, out.text, W - 14, ty + 18, k.ink, 13, 'right');
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  return { start, stop };
})();
