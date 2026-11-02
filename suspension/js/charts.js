/* Suspension Lab — small SVG line-chart helper (one y-axis, 2px lines, crosshair tooltip) */
'use strict';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1; const step0 = span / n; const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || mag * 10;
  const t = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) t.push(+v.toFixed(10));
  return t;
}

/* opts: series [{name, color, pts:[[x,y]], dash}], xLabel, yLabel, xr:[a,b], yr:[a,b] (optional), logX, cursorX, fmtX, fmtY, markers [{x,label}] */
function lineChart(svg, opts) {
  const W = svg.clientWidth || 400, H = svg.clientHeight || 170;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
  const m = { l: 46, r: 12, t: 18, b: 30 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const all = opts.series.flatMap((s) => s.pts);
  let [x0, x1] = opts.xr || [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  let [y0, y1] = opts.yr || [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  if (!opts.yr) { const pad = (y1 - y0) * 0.12 || Math.abs(y0) * 0.1 || 1; y0 -= pad; y1 += pad; }
  const lx = (v) => (opts.logX ? Math.log10(v) : v);
  const X = (v) => m.l + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * iw;
  const Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * ih;
  const fx = opts.fmtX || ((v) => v), fy = opts.fmtY || ((v) => +v.toFixed(2));
  // grid & axes
  const yt = niceTicks(y0, y1, Math.max(3, Math.floor(ih / 32)));
  yt.forEach((v) => { svgEl('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: Math.abs(v) < 1e-9 ? 'zero' : 'gr' }, svg); svgEl('text', { x: m.l - 6, y: Y(v) + 3.5, 'text-anchor': 'end' }, svg).textContent = fy(v); });
  const xt = opts.logX ? [0.5, 1, 2, 5, 10, 20, 50].filter((v) => v >= x0 && v <= x1) : niceTicks(x0, x1, Math.max(3, Math.floor(iw / 70)));
  xt.forEach((v) => { svgEl('line', { y1: m.t, y2: m.t + ih, x1: X(v), x2: X(v), class: Math.abs(v) < 1e-9 ? 'zero' : 'gr' }, svg); svgEl('text', { x: X(v), y: m.t + ih + 14, 'text-anchor': 'middle' }, svg).textContent = fx(v); });
  svgEl('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'ax' }, svg);
  if (opts.xLabel) svgEl('text', { x: m.l + iw, y: H - 2, 'text-anchor': 'end' }, svg).textContent = opts.xLabel;
  if (opts.yLabel) svgEl('text', { x: 4, y: 10 }, svg).textContent = opts.yLabel;
  (opts.markers || []).forEach((mk) => {
    if (mk.x < x0 || mk.x > x1) return;
    svgEl('line', { x1: X(mk.x), x2: X(mk.x), y1: m.t, y2: m.t + ih, class: 'cursor', 'stroke-opacity': 0.5 }, svg);
    svgEl('text', { x: X(mk.x) + 4, y: m.t + 11 }, svg).textContent = mk.label;
  });
  // series
  opts.series.forEach((s) => {
    const d = s.pts.filter((p) => isFinite(p[1])).map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(Math.max(y0, Math.min(y1, p[1]))).toFixed(1)}`).join('');
    svgEl('path', { d, class: 'ln', stroke: s.color, 'stroke-dasharray': s.dash || '' }, svg);
  });
  // current-value cursor
  if (opts.cursorX != null) {
    svgEl('line', { x1: X(opts.cursorX), x2: X(opts.cursorX), y1: m.t, y2: m.t + ih, class: 'cursor' }, svg);
    opts.series.forEach((s) => { const v = interp(s.pts, opts.cursorX); if (isFinite(v)) svgEl('circle', { cx: X(opts.cursorX), cy: Y(Math.max(y0, Math.min(y1, v))), r: 4.5, fill: s.color, class: 'dot' }, svg); });
  }
  // hover crosshair + tooltip
  const hov = svgEl('g', { 'pointer-events': 'none' }, svg);
  const hit = svgEl('rect', { x: m.l, y: m.t, width: iw, height: ih, class: 'hit' }, svg);
  const inv = (px) => { const t = (px - m.l) / iw; return opts.logX ? 10 ** (lx(x0) + t * (lx(x1) - lx(x0))) : x0 + t * (x1 - x0); };
  const show = (e) => {
    const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width);
    const xv = inv(Math.max(m.l, Math.min(m.l + iw, px)));
    hov.innerHTML = '';
    svgEl('line', { x1: X(xv), x2: X(xv), y1: m.t, y2: m.t + ih, class: 'cursor' }, hov);
    const lines = [`${opts.xName || 'x'}: ${fx(+xv.toFixed(opts.logX ? 2 : 1))}`];
    opts.series.forEach((s) => { const v = interp(s.pts, xv); if (!isFinite(v)) return; svgEl('circle', { cx: X(xv), cy: Y(Math.max(y0, Math.min(y1, v))), r: 4, fill: s.color, class: 'dot' }, hov); lines.push(`${s.name}: ${fy(v)}`); });
    const tw = Math.max(...lines.map((l) => l.length)) * 6.6 + 14, th = lines.length * 14 + 8;
    let tx = X(xv) + 10; if (tx + tw > W) tx = X(xv) - tw - 10;
    const g = svgEl('g', { class: 'tipbox' }, hov);
    svgEl('rect', { x: tx, y: m.t + 4, width: tw, height: th, rx: 5 }, g);
    lines.forEach((l, i) => { svgEl('text', { x: tx + 7, y: m.t + 18 + i * 14 }, g).textContent = l; });
  };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerleave', () => { hov.innerHTML = ''; });
  return { X, Y };
}
function interp(pts, x) {
  if (!pts.length) return NaN;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [a, b] = [pts[i - 1], pts[i]]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1); }
  return pts[pts.length - 1][1];
}
function legend(el, items) {
  el.innerHTML = items.map((i) => `<span><i style="background:${i.color};color:${i.color}" class="${i.dash ? 'dash' : ''}"></i>${i.name}</span>`).join('');
}
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
