/* ECM Lab — part drawings.
   Each function returns SVG markup for a 160 × 120 view box, drawn to look like the real part
   (material, colour, shape). Gradients come from the shared <defs> in index.html. */

const SVGNS = 'http://www.w3.org/2000/svg';

function grads() {
  const lin = (id, stops, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rad = (id, stops) =>
    `<radialGradient id="${id}" cx=".4" cy=".35" r=".75">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  return [
    lin('gBlk', [[0, '#4a4d52'], [.45, '#232528'], [1, '#0e0f11']]),
    lin('gBlkH', [[0, '#3b3e43'], [.5, '#1b1c1f'], [1, '#2b2d31']], 1, 0),
    lin('gMet', [[0, '#f1f3f5'], [.35, '#b9bec4'], [.7, '#8b9198'], [1, '#d6dade']]),
    lin('gMetH', [[0, '#9aa0a7'], [.3, '#eef0f2'], [.6, '#a3a9b0'], [1, '#71777e']], 1, 0),
    lin('gAlu', [[0, '#e3e5e7'], [.5, '#b7bbbf'], [1, '#8e9398']]),
    lin('gBrass', [[0, '#f6dc8a'], [.45, '#c9a03c'], [1, '#8a6a1c']], 1, 0),
    lin('gCu', [[0, '#f3b07a'], [.5, '#c46c2c'], [1, '#7d3d12']], 1, 0),
    lin('gRed', [[0, '#ff6a5a'], [.5, '#c81e1e'], [1, '#7e0e0e']]),
    lin('gAmber', [[0, '#ffd27a'], [.5, '#f59a0c'], [1, '#b06200']]),
    lin('gGlass', [[0, 'rgba(235,245,255,.95)'], [.5, 'rgba(170,195,220,.75)'], [1, 'rgba(120,150,180,.85)']]),
    lin('gBlue', [[0, '#5d8ff0'], [1, '#1d47a8']]),
    lin('gGreen', [[0, '#5fd17a'], [1, '#17793a']]),
    lin('gGrey', [[0, '#a4a9ae'], [1, '#5d6268']]),
    lin('gWhite', [[0, '#ffffff'], [1, '#c9ccd0']]),
    lin('gRubber', [[0, '#3a3a3a'], [1, '#111']], 1, 0),
    lin('gHeat', [[0, '#fff3b0'], [.4, '#ff9a1f'], [1, '#b22a00']], 1, 0),
    rad('gBulb', [[0, '#ffffff'], [.5, '#fff6cf'], [1, '#e8d9a0']]),
    rad('gChrome', [[0, '#ffffff'], [.4, '#cfd5db'], [1, '#6d747c']]),
    rad('gLensR', [[0, '#ff8d80'], [.6, '#d01818'], [1, '#6c0606']]),
    rad('gLensA', [[0, '#ffe2a0'], [.6, '#f29a10'], [1, '#9c5600']])
  ].join('');
}

/* small helpers */
const S = {
  conn(x, y, w = 26, h = 18, fill = 'url(#gBlk)', pins = 3) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#000" stroke-width="1"/>`;
    s += `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="2" fill="#0a0a0a" opacity=".55"/>`;
    for (let i = 0; i < pins; i++) {
      const px = x + 6 + (i * (w - 12)) / Math.max(1, pins - 1);
      s += `<rect x="${px - 1.5}" y="${y + h / 2 - 3}" width="3" height="6" fill="url(#gBrass)"/>`;
    }
    return s;
  },
  wires(x, y, colors, len = 30, dir = 1) {
    return colors.map((c, i) => {
      const [base, tr] = c.split('-');
      const yy = y + i * 4;
      const d = `M${x} ${yy} c ${10 * dir} 0 ${15 * dir} 6 ${len * dir} 6`;
      return `<path d="${d}" stroke="${WIRE[base]}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
        (tr ? `<path d="${d}" stroke="${WIRE[tr]}" stroke-width="1.2" stroke-dasharray="3 4" fill="none"/>` : '');
    }).join('');
  },
  hex(cx, cy, r, fill = 'url(#gMetH)') {
    const pts = [...Array(6)].map((_, i) => {
      const a = Math.PI / 6 + i * Math.PI / 3;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${fill}" stroke="#555" stroke-width="1"/>`;
  },
  threads(x, y, w, h, n = 6, fill = 'url(#gMetH)') {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#666" stroke-width=".8"/>`;
    for (let i = 1; i < n; i++) s += `<line x1="${x}" y1="${y + (h * i) / n}" x2="${x + w}" y2="${y + (h * i) / n - 1.5}" stroke="#555" stroke-width=".9"/>`;
    return s;
  },
  oring(x, y, w, color = '#2b2b2b') { return `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${color}"/>`; },
  shine(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" opacity=".18"/>`; }
};

const DRAW = {
  ckp() {
    return `
      <g transform="translate(20 6)">
        <circle cx="96" cy="70" r="40" fill="url(#gMet)" stroke="#555"/>
        ${[...Array(30)].map((_, i) => i > 26 ? '' : `<rect x="94" y="26" width="5" height="7" fill="url(#gMetH)" transform="rotate(${i * 12} 96 70)"/>`).join('')}
        <circle cx="96" cy="70" r="14" fill="#6a6f75"/>
      </g>
      <rect x="18" y="44" width="58" height="22" rx="4" fill="url(#gBlk)"/>
      <rect x="64" y="47" width="22" height="16" rx="3" fill="url(#gBlk)"/>
      <rect x="84" y="50" width="6" height="10" fill="#333"/>
      <rect x="34" y="34" width="22" height="14" rx="3" fill="url(#gBlk)"/>
      <circle cx="45" cy="41" r="4" fill="url(#gMet)"/>
      ${S.oring(70, 46, 3, '#6b2a12')}
      ${S.conn(4, 46, 18, 18, 'url(#gBlk)', 2)}
      ${S.shine(22, 47, 44, 4)}`;
  },
  hall() {
    return `
      <rect x="40" y="24" width="38" height="58" rx="5" fill="url(#gBlk)"/>
      <rect x="30" y="54" width="58" height="12" rx="6" fill="url(#gBlk)"/>
      <circle cx="36" cy="60" r="4" fill="url(#gMet)"/><circle cx="82" cy="60" r="4" fill="url(#gMet)"/>
      <rect x="49" y="82" width="20" height="22" rx="3" fill="#2a2c30"/>
      ${S.oring(48, 86, 22, '#1d1d1d')}
      <rect x="54" y="100" width="10" height="6" fill="#111"/>
      ${S.conn(44, 6, 30, 20, 'url(#gGrey)', 3)}
      ${S.shine(44, 28, 6, 40)}
      <path d="M105 30 l20 0 l0 20 l14 0 l0 20 l-14 0 l0 20 l-20 0z" fill="url(#gMet)" stroke="#666"/>`;
  },
  maf() {
    return `
      <rect x="8" y="48" width="144" height="46" rx="6" fill="url(#gBlk)"/>
      <ellipse cx="10" cy="71" rx="6" ry="23" fill="#0b0b0c"/>
      <ellipse cx="150" cy="71" rx="6" ry="23" fill="#2d2f33"/>
      <path d="M26 52 h108" stroke="#000" opacity=".4"/>
      <rect x="54" y="20" width="52" height="34" rx="4" fill="url(#gBlk)"/>
      <rect x="62" y="28" width="36" height="6" rx="2" fill="#555"/>
      <text x="80" y="47" font-size="7" fill="#cfd3d8" text-anchor="middle" font-family="monospace">HFM</text>
      ${S.conn(66, 6, 28, 16, 'url(#gBlk)', 5)}
      <circle cx="58" cy="50" r="3" fill="url(#gMet)"/><circle cx="102" cy="50" r="3" fill="url(#gMet)"/>
      ${S.shine(12, 52, 136, 5)}`;
  },
  map() {
    return `
      <rect x="34" y="34" width="70" height="44" rx="6" fill="url(#gBlk)"/>
      <rect x="14" y="48" width="24" height="16" rx="3" fill="url(#gBlk)"/>
      <circle cx="22" cy="56" r="4" fill="url(#gMet)"/>
      <rect x="58" y="78" width="16" height="14" fill="#1f2023"/>
      ${S.oring(56, 88, 20, '#c06a1f')}
      <rect x="61" y="92" width="10" height="14" rx="2" fill="#141518"/>
      ${S.conn(100, 44, 36, 24, 'url(#gGrey)', 3)}
      ${S.shine(38, 38, 62, 5)}
      <text x="69" y="62" font-size="7" fill="#9aa0a7" text-anchor="middle" font-family="monospace">kPa</text>`;
  },
  rps() {
    return `
      ${S.threads(66, 82, 26, 26, 7)}
      ${S.hex(79, 72, 20)}
      <rect x="62" y="30" width="34" height="32" rx="4" fill="url(#gMetH)" stroke="#666"/>
      ${S.conn(60, 10, 38, 22, 'url(#gBlk)', 3)}
      <rect x="74" y="106" width="10" height="8" fill="#888"/>
      <path d="M8 96 h52 M98 96 h54" stroke="#9aa0a7" stroke-width="10"/>
      <path d="M8 96 h52 M98 96 h54" stroke="#cfd4d9" stroke-width="3"/>`;
  },
  iat() {
    return `
      <rect x="22" y="44" width="56" height="30" rx="5" fill="url(#gBlk)"/>
      <rect x="78" y="52" width="40" height="14" rx="3" fill="url(#gBlk)"/>
      <path d="M118 54 h22 v10 h-22z" fill="none" stroke="#333" stroke-width="2"/>
      <rect x="124" y="56" width="10" height="6" rx="3" fill="#7a3a1c"/>
      ${S.oring(80, 50, 4, '#1f1f1f')}
      ${S.conn(4, 46, 22, 26, 'url(#gGrey)', 2)}
      ${S.shine(26, 48, 48, 4)}`;
  },
  ect() {
    return `
      ${S.threads(88, 50, 26, 22, 6, 'url(#gBrass)')}
      <rect x="114" y="54" width="22" height="14" rx="3" fill="url(#gBrass)"/>
      ${S.hex(78, 61, 18, 'url(#gBrass)')}
      <rect x="22" y="48" width="44" height="26" rx="4" fill="url(#gBlue)"/>
      ${S.conn(10, 50, 20, 22, 'url(#gBlue)', 2)}
      ${S.oring(62, 52, 4, '#202020')}
      ${S.shine(24, 51, 38, 4)}`;
  },
  tps() {
    return `
      <rect x="18" y="20" width="96" height="84" rx="8" fill="url(#gAlu)" stroke="#888"/>
      <circle cx="66" cy="62" r="34" fill="#3a3d42"/>
      <circle cx="66" cy="62" r="28" fill="url(#gBlk)"/>
      <circle cx="66" cy="62" r="6" fill="url(#gMet)"/>
      <path d="M66 62 L88 44" stroke="#c9ced3" stroke-width="3"/>
      <rect x="92" y="46" width="44" height="32" rx="4" fill="url(#gBlk)"/>
      ${S.conn(126, 50, 26, 24, 'url(#gBlk)', 4)}
      <circle cx="26" cy="28" r="3" fill="url(#gMet)"/><circle cx="106" cy="96" r="3" fill="url(#gMet)"/>`;
  },
  app() {
    return `
      <rect x="86" y="8" width="56" height="38" rx="6" fill="url(#gBlk)"/>
      ${S.conn(110, 14, 26, 18, 'url(#gGrey)', 6)}
      <circle cx="98" cy="30" r="9" fill="#333"/><circle cx="98" cy="30" r="4" fill="url(#gMet)"/>
      <path d="M98 30 L52 98" stroke="url(#gBlkH)" stroke-width="10" stroke-linecap="round"/>
      <rect x="20" y="86" width="56" height="26" rx="6" fill="url(#gRubber)" transform="rotate(-18 48 99)"/>
      ${[0, 1, 2, 3, 4].map(i => `<line x1="${27 + i * 10}" y1="94" x2="${24 + i * 10}" y2="110" stroke="#444" transform="rotate(-18 48 99)"/>`).join('')}`;
  },
  o2() {
    return `
      <path d="M16 32 C 40 28, 50 50, 70 52" stroke="#4c4f55" stroke-width="7" fill="none"/>
      <path d="M16 32 C 40 28, 50 50, 70 52" stroke="#8d939a" stroke-width="2" stroke-dasharray="2 2" fill="none"/>
      ${S.conn(2, 22, 18, 22, 'url(#gGrey)', 4)}
      <rect x="66" y="44" width="22" height="16" rx="3" fill="url(#gMetH)"/>
      ${S.hex(98, 52, 14)}
      ${S.threads(110, 44, 16, 16, 5)}
      <rect x="126" y="46" width="20" height="12" rx="4" fill="url(#gMet)"/>
      <rect x="130" y="48" width="3" height="8" fill="#333"/><rect x="137" y="48" width="3" height="8" fill="#333"/>`;
  },
  knock() {
    return `
      <ellipse cx="66" cy="70" rx="40" ry="16" fill="#151618"/>
      <ellipse cx="66" cy="62" rx="40" ry="16" fill="url(#gBlk)"/>
      <ellipse cx="66" cy="62" rx="14" ry="6" fill="#090909"/>
      <rect x="61" y="40" width="10" height="24" fill="url(#gMetH)"/>
      ${S.hex(66, 40, 9)}
      <rect x="100" y="52" width="16" height="12" rx="3" fill="url(#gBlk)"/>
      <path d="M116 58 c 10 0 14 -14 26 -14" stroke="#222" stroke-width="6" fill="none"/>
      ${S.conn(134, 32, 22, 18, 'url(#gGrey)', 2)}
      ${S.shine(36, 54, 52, 4)}`;
  },
  egt() {
    return `
      <path d="M10 30 C 40 20, 60 60, 90 52" stroke="#8a9097" stroke-width="5" fill="none"/>
      <path d="M10 30 C 40 20, 60 60, 90 52" stroke="#d3d7db" stroke-width="1.5" stroke-dasharray="1.5 2" fill="none"/>
      ${S.conn(2, 22, 18, 18, 'url(#gBlk)', 2)}
      ${S.hex(98, 54, 10)}
      ${S.threads(106, 49, 12, 10, 4)}
      <rect x="118" y="51" width="34" height="6" rx="3" fill="url(#gMet)"/>`;
  },
  dpfp() {
    return `
      <rect x="30" y="30" width="80" height="54" rx="6" fill="url(#gBlk)"/>
      <rect x="44" y="84" width="10" height="20" rx="3" fill="#1d1e21"/><rect x="86" y="84" width="10" height="20" rx="3" fill="#1d1e21"/>
      <path d="M49 104 c 0 10 -20 10 -30 10" stroke="#333" stroke-width="6" fill="none"/>
      <path d="M91 104 c 0 10 20 10 40 10" stroke="#333" stroke-width="6" fill="none"/>
      <rect x="20" y="40" width="14" height="10" rx="2" fill="url(#gBlk)"/><circle cx="25" cy="45" r="3" fill="url(#gMet)"/>
      ${S.conn(108, 42, 32, 22, 'url(#gGrey)', 3)}
      <text x="70" y="62" font-size="8" fill="#9aa0a7" text-anchor="middle" font-family="monospace">ΔP</text>
      ${S.shine(34, 34, 72, 5)}`;
  },
  oilsw() {
    return `
      ${S.threads(66, 74, 24, 24, 6, 'url(#gBrass)')}
      ${S.hex(78, 64, 20, 'url(#gBrass)')}
      <rect x="62" y="30" width="32" height="24" rx="10" fill="url(#gBlk)"/>
      <rect x="74" y="12" width="8" height="20" fill="url(#gBrass)"/>
      <path d="M78 12 C 100 2, 120 10, 150 6" stroke="${WIRE.Y}" stroke-width="3" fill="none"/>`;
  },
  brksw() {
    return `
      <rect x="40" y="40" width="60" height="40" rx="6" fill="url(#gWhite)" stroke="#999"/>
      ${S.threads(98, 52, 22, 16, 5, 'url(#gWhite)')}
      <rect x="120" y="56" width="22" height="8" rx="4" fill="#222"/>
      <circle cx="144" cy="60" r="5" fill="#111"/>
      ${S.conn(14, 46, 30, 28, 'url(#gBlk)', 3)}`;
  },
  injp() {
    return `
      <rect x="62" y="12" width="36" height="22" rx="4" fill="url(#gBlk)"/>
      ${S.conn(92, 14, 26, 16, 'url(#gBlk)', 2)}
      ${S.oring(64, 34, 32, '#d26b16')}
      <rect x="66" y="38" width="28" height="34" rx="3" fill="url(#gGreen)"/>
      <rect x="66" y="72" width="28" height="12" fill="url(#gMetH)"/>
      ${S.oring(64, 84, 32, '#1b1b1b')}
      <rect x="72" y="88" width="16" height="16" rx="2" fill="url(#gMetH)"/>
      <path d="M80 104 l-10 14 h20z" fill="#b8dcff" opacity=".7"/>
      ${S.shine(68, 40, 6, 28)}`;
  },
  coil() {
    return `
      ${S.conn(48, 6, 34, 18, 'url(#gBlk)', 4)}
      <rect x="40" y="20" width="58" height="22" rx="4" fill="url(#gBlk)"/>
      <rect x="92" y="24" width="18" height="12" rx="3" fill="url(#gBlk)"/><circle cx="104" cy="30" r="3" fill="url(#gMet)"/>
      <rect x="55" y="42" width="28" height="52" rx="4" fill="url(#gBlkH)"/>
      <rect x="57" y="92" width="24" height="10" rx="3" fill="#3b3b3b"/>
      ${S.shine(58, 46, 5, 42)}
      <g transform="translate(118 30)">
        <rect x="6" y="0" width="12" height="10" fill="url(#gMet)"/>
        <rect x="2" y="10" width="20" height="26" rx="3" fill="url(#gWhite)"/>
        ${[...Array(4)].map((_, i) => `<rect x="1" y="${13 + i * 6}" width="22" height="2" fill="#ddd"/>`).join('')}
        ${S.hex(12, 42, 11)}
        ${S.threads(6, 50, 12, 18, 5)}
        <rect x="11" y="68" width="2" height="6" fill="#999"/>
      </g>`;
  },
  etb() {
    return `
      <rect x="10" y="24" width="96" height="80" rx="8" fill="url(#gAlu)" stroke="#888"/>
      <circle cx="58" cy="64" r="32" fill="#2b2d31"/>
      <circle cx="58" cy="64" r="30" fill="#17181b"/>
      <ellipse cx="58" cy="64" rx="30" ry="9" fill="url(#gMet)" transform="rotate(-25 58 64)"/>
      <rect x="55" y="34" width="6" height="60" fill="#8b9198" transform="rotate(-25 58 64)"/>
      <rect x="104" y="36" width="44" height="56" rx="8" fill="url(#gBlk)"/>
      ${S.conn(112, 10, 30, 22, 'url(#gBlk)', 6)}
      <circle cx="18" cy="32" r="3" fill="url(#gMet)"/><circle cx="98" cy="96" r="3" fill="url(#gMet)"/>
      ${S.shine(14, 28, 88, 4)}`;
  },
  fpump() {
    return `
      <ellipse cx="80" cy="18" rx="44" ry="10" fill="url(#gBlk)"/>
      <rect x="36" y="14" width="88" height="8" fill="url(#gBlk)"/>
      <rect x="58" y="4" width="12" height="12" rx="2" fill="url(#gWhite)"/>
      ${S.conn(84, 4, 22, 12, 'url(#gGrey)', 4)}
      <rect x="44" y="26" width="4" height="70" fill="url(#gMetH)"/><rect x="112" y="26" width="4" height="70" fill="url(#gMetH)"/>
      <rect x="54" y="34" width="34" height="62" rx="8" fill="url(#gWhite)" stroke="#999"/>
      <rect x="58" y="40" width="26" height="40" rx="4" fill="url(#gMetH)"/>
      <rect x="50" y="96" width="44" height="16" rx="5" fill="#d7d9d2"/>
      <path d="M116 70 L148 96" stroke="#333" stroke-width="3"/>
      <rect x="140" y="92" width="18" height="10" rx="5" fill="#eab308"/>`;
  },
  solenoid() {
    return `
      <rect x="40" y="30" width="62" height="54" rx="8" fill="url(#gBlk)"/>
      ${S.conn(48, 8, 34, 22, 'url(#gBlk)', 2)}
      <rect x="102" y="44" width="26" height="12" rx="3" fill="url(#gBlk)"/>
      <rect x="102" y="62" width="26" height="12" rx="3" fill="url(#gBlk)"/>
      <rect x="128" y="46" width="14" height="8" rx="2" fill="#2c2d31"/><rect x="128" y="64" width="14" height="8" rx="2" fill="#2c2d31"/>
      <rect x="20" y="50" width="22" height="16" rx="3" fill="url(#gMetH)"/>
      <circle cx="46" cy="90" r="5" fill="url(#gMet)"/>
      ${S.shine(44, 34, 54, 5)}`;
  },
  injd() {
    return `
      ${S.conn(18, 16, 26, 18, 'url(#gBlk)', 2)}
      <rect x="40" y="18" width="40" height="18" rx="4" fill="url(#gBlk)"/>
      <rect x="76" y="20" width="16" height="14" rx="2" fill="url(#gMetH)"/>
      <path d="M92 27 h30" stroke="url(#gMetH)" stroke-width="6"/>
      <rect x="44" y="36" width="32" height="30" rx="3" fill="url(#gMetH)"/>
      <rect x="52" y="66" width="16" height="36" fill="url(#gMetH)"/>
      ${S.oring(50, 80, 20, '#7a2c10')}
      <rect x="56" y="102" width="8" height="10" fill="url(#gMet)"/>
      <path d="M60 112 l-14 8 M60 112 l14 8 M60 112 v8" stroke="#a7d3ff" stroke-width="1.5"/>
      ${S.shine(48, 40, 5, 22)}`;
  },
  hpp() {
    return `
      <rect x="20" y="36" width="100" height="64" rx="10" fill="url(#gAlu)" stroke="#888"/>
      <circle cx="20" cy="68" r="22" fill="url(#gAlu)" stroke="#888"/>
      <circle cx="20" cy="68" r="8" fill="#555"/>
      <rect x="66" y="12" width="30" height="26" rx="6" fill="url(#gBlk)"/>
      ${S.conn(96, 14, 26, 18, 'url(#gBlk)', 2)}
      <path d="M120 60 h26" stroke="url(#gMetH)" stroke-width="8"/>
      ${S.hex(110, 60, 8)}
      <circle cx="38" cy="44" r="3" fill="url(#gMet)"/><circle cx="110" cy="92" r="3" fill="url(#gMet)"/>`;
  },
  glow() {
    return `
      <rect x="20" y="52" width="16" height="16" rx="2" fill="url(#gBrass)"/>
      <circle cx="22" cy="60" r="3" fill="#666"/>
      ${S.hex(48, 60, 12)}
      ${S.threads(58, 54, 22, 12, 5)}
      <rect x="80" y="55" width="44" height="10" fill="url(#gMetH)"/>
      <rect x="124" y="56" width="22" height="8" rx="4" class="glow-tip" fill="url(#gHeat)"/>`;
  },
  egr() {
    return `
      <rect x="20" y="62" width="76" height="38" rx="5" fill="url(#gMet)" stroke="#777"/>
      <circle cx="58" cy="81" r="14" fill="#2a2a2a"/>
      <rect x="40" y="18" width="72" height="46" rx="8" fill="url(#gBlk)"/>
      ${S.conn(112, 26, 30, 20, 'url(#gBlk)', 5)}
      <rect x="10" y="74" width="12" height="14" fill="url(#gMetH)"/>
      <rect x="94" y="74" width="12" height="14" fill="url(#gMetH)"/>
      <path d="M24 86 q 10 -8 20 0 t 20 0 t 20 0" stroke="#7a4a25" stroke-width="2" fill="none" opacity=".6"/>
      ${S.shine(44, 22, 64, 5)}`;
  },
  vgt() {
    return `
      <path d="M70 20 a 46 46 0 1 1 -1 0" fill="url(#gMet)" stroke="#777"/>
      <circle cx="70" cy="66" r="30" fill="#444"/>
      ${[...Array(12)].map((_, i) => `<rect x="68" y="40" width="4" height="14" fill="#9aa0a7" transform="rotate(${i * 30} 70 66)"/>`).join('')}
      <circle cx="70" cy="66" r="10" fill="url(#gMet)"/>
      <circle cx="132" cy="38" r="20" fill="url(#gBlk)"/>
      <rect x="112" y="36" width="10" height="40" fill="url(#gMetH)"/>
      <circle cx="132" cy="38" r="6" fill="#333"/>`;
  },
  fan() {
    return `
      <rect x="10" y="6" width="140" height="108" rx="10" fill="url(#gBlk)"/>
      <circle cx="80" cy="60" r="48" fill="#0c0c0d"/>
      <g class="spin" style="transform-origin:80px 60px">
        ${[...Array(7)].map((_, i) => `<path d="M80 60 C 90 30, 110 20, 118 34 C 112 46, 96 54, 80 60z" fill="#2c2e33" stroke="#444" transform="rotate(${i * 51.4} 80 60)"/>`).join('')}
      </g>
      <circle cx="80" cy="60" r="12" fill="url(#gBlk)" stroke="#555"/>
      ${S.conn(122, 90, 22, 14, 'url(#gGrey)', 2)}`;
  },
  relay() {
    return `
      <rect x="40" y="18" width="80" height="74" rx="4" fill="url(#gBlk)"/>
      <rect x="44" y="22" width="72" height="10" rx="2" fill="#fff" opacity=".08"/>
      <text x="80" y="54" font-size="9" fill="#d0d4d8" text-anchor="middle" font-family="monospace">12V 30A</text>
      <g stroke="#d0d4d8" stroke-width="1" fill="none"><rect x="54" y="62" width="14" height="18"/><path d="M90 62 v6 l10 6 M90 80 v-6"/></g>
      <text x="61" y="88" font-size="6" fill="#aaa" text-anchor="middle">85 86</text><text x="95" y="88" font-size="6" fill="#aaa" text-anchor="middle">30 87</text>
      ${[52, 70, 90, 108].map(x => `<rect x="${x - 3}" y="92" width="6" height="16" fill="url(#gBrass)"/>`).join('')}`;
  },
  mil() {
    return `
      <rect x="20" y="22" width="120" height="76" rx="12" fill="#101114"/>
      <path class="mil-icon" d="M42 70 v-20 h8 v-6 h20 v6 h14 l8 8 h8 v-6 h6 v28 h-6 v-6 h-8 l-6 8 h-30 l-6 -6 h-8z" fill="url(#gAmber)"/>
      <text x="80" y="92" font-size="9" fill="#f59a0c" text-anchor="middle" font-family="monospace">CHECK</text>`;
  },
  ecm() {
    return `
      <rect x="14" y="20" width="132" height="84" rx="6" fill="url(#gAlu)" stroke="#888"/>
      ${[...Array(9)].map((_, i) => `<rect x="${22 + i * 14}" y="26" width="8" height="40" rx="2" fill="#c3c7cb" stroke="#999" stroke-width=".6"/>`).join('')}
      <rect x="22" y="72" width="54" height="26" rx="3" fill="url(#gBlk)"/>
      <rect x="84" y="72" width="54" height="26" rx="3" fill="url(#gBlk)"/>
      ${[...Array(8)].map((_, i) => `<rect x="${27 + i * 6}" y="80" width="3" height="10" fill="url(#gBrass)"/><rect x="${89 + i * 6}" y="80" width="3" height="10" fill="url(#gBrass)"/>`).join('')}
      <rect x="10" y="40" width="8" height="10" fill="#999"/><rect x="142" y="40" width="8" height="10" fill="#999"/>`;
  },
  battery() {
    return `
      <rect x="20" y="30" width="120" height="78" rx="5" fill="url(#gBlk)"/>
      <rect x="20" y="30" width="120" height="14" rx="4" fill="#2c2f34"/>
      <rect x="30" y="18" width="18" height="14" rx="2" fill="url(#gChrome)"/>
      <rect x="112" y="18" width="18" height="14" rx="2" fill="url(#gChrome)"/>
      <rect x="26" y="14" width="26" height="8" rx="3" fill="url(#gRed)"/>
      <text x="39" y="56" font-size="14" fill="#ff5a4a" text-anchor="middle" font-weight="700">+</text>
      <text x="121" y="56" font-size="14" fill="#cfd3d8" text-anchor="middle" font-weight="700">−</text>
      <text x="80" y="82" font-size="11" fill="#e8eaed" text-anchor="middle" font-family="monospace">12V 65Ah</text>
      <circle cx="68" cy="38" r="4" fill="#26a14b"/><circle cx="68" cy="38" r="1.5" fill="#bff5cf"/>`;
  },
  alternator() {
    return `
      <circle cx="74" cy="62" r="46" fill="url(#gAlu)" stroke="#888"/>
      ${[...Array(16)].map((_, i) => `<rect x="72" y="22" width="5" height="14" rx="1" fill="#3b3e43" transform="rotate(${i * 22.5} 74 62)"/>`).join('')}
      <circle cx="74" cy="62" r="20" fill="url(#gMet)"/>
      ${[...Array(6)].map((_, i) => `<line x1="74" y1="62" x2="74" y2="45" stroke="#555" stroke-width="2" transform="rotate(${i * 60} 74 62)"/>`).join('')}
      <circle cx="74" cy="62" r="9" fill="#2c2c2c"/>
      <rect x="114" y="34" width="34" height="22" rx="3" fill="url(#gBlk)"/>
      <circle cx="140" cy="45" r="5" fill="url(#gChrome)"/><text x="127" y="49" font-size="7" fill="#ccc">B+</text>`;
  },
  starter() {
    return `
      <rect x="20" y="50" width="86" height="46" rx="8" fill="url(#gBlk)"/>
      <rect x="40" y="18" width="70" height="30" rx="14" fill="url(#gMetH)" stroke="#777"/>
      <circle cx="110" cy="26" r="6" fill="url(#gChrome)"/><circle cx="110" cy="40" r="4" fill="url(#gBrass)"/>
      <rect x="104" y="54" width="30" height="38" rx="4" fill="url(#gAlu)"/>
      <rect x="134" y="64" width="18" height="18" fill="url(#gMetH)"/>
      ${[...Array(5)].map((_, i) => `<rect x="${136 + i * 3}" y="62" width="2" height="22" fill="#666"/>`).join('')}
      ${S.shine(24, 54, 78, 5)}`;
  },
  fusebox() {
    const cols = ['#d42a24', '#2a66d6', '#f2c815', '#23a046', '#e9e9e4', '#8a5a2b', '#d42a24', '#2a66d6', '#f2c815', '#2a66d6', '#d42a24', '#23a046'];
    return `
      <rect x="14" y="14" width="132" height="92" rx="8" fill="url(#gBlk)"/>
      <rect x="20" y="20" width="120" height="80" rx="4" fill="#15161a"/>
      ${cols.map((c, i) => `<rect x="${26 + (i % 6) * 19}" y="${26 + Math.floor(i / 6) * 22}" width="12" height="16" rx="2" fill="${c}"/><rect x="${29 + (i % 6) * 19}" y="${28 + Math.floor(i / 6) * 22}" width="6" height="4" fill="#fff" opacity=".35"/>`).join('')}
      <rect x="26" y="72" width="30" height="24" rx="2" fill="url(#gBlk)" stroke="#444"/>
      <rect x="62" y="72" width="30" height="24" rx="2" fill="url(#gBlk)" stroke="#444"/>
      <rect x="98" y="72" width="36" height="24" rx="2" fill="#e05a1a"/>`;
  },
  ignsw() {
    return `
      <circle cx="80" cy="60" r="46" fill="url(#gChrome)" stroke="#666"/>
      <circle cx="80" cy="60" r="34" fill="#202226"/>
      <rect x="74" y="34" width="12" height="52" rx="3" fill="url(#gMet)" transform="rotate(30 80 60)"/>
      <text x="54" y="22" font-size="8" fill="var(--ink-2)" font-family="monospace">LOCK</text>
      <text x="106" y="26" font-size="8" fill="var(--ink-2)" font-family="monospace">ACC</text>
      <text x="130" y="64" font-size="8" fill="var(--ink-2)" font-family="monospace">ON</text>
      <text x="118" y="104" font-size="8" fill="var(--ink-2)" font-family="monospace">ST</text>`;
  },
  headlamp() {
    return `
      <path d="M10 30 Q 80 4 150 30 L 146 96 Q 80 112 14 96z" fill="url(#gBlk)"/>
      <path d="M16 34 Q 80 12 144 34 L 140 92 Q 80 106 20 92z" fill="url(#gGlass)" opacity=".5"/>
      <circle cx="54" cy="62" r="26" fill="url(#gChrome)"/>
      <circle cx="54" cy="62" r="8" class="bulb" fill="url(#gBulb)"/>
      <circle cx="110" cy="62" r="20" fill="url(#gChrome)"/>
      <circle cx="110" cy="62" r="6" class="bulb" fill="url(#gBulb)"/>
      <path d="M130 40 L 144 40 L 142 84 L 132 84z" fill="url(#gLensA)" opacity=".85"/>`;
  },
  taillamp() {
    return `
      <path d="M14 26 L 146 34 L 140 94 L 22 100z" fill="#1d0808"/>
      <path d="M20 32 L 92 36 L 90 92 L 26 95z" fill="url(#gLensR)"/>
      <path d="M96 36 L 140 39 L 138 62 L 95 62z" fill="url(#gLensA)"/>
      <path d="M95 64 L 138 64 L 136 90 L 94 91z" fill="url(#gWhite)" opacity=".9"/>
      ${[0, 1, 2, 3].map(i => `<line x1="${30 + i * 16}" y1="36" x2="${32 + i * 15}" y2="93" stroke="#fff" opacity=".12"/>`).join('')}`;
  },
  bulb() {
    return `
      <ellipse cx="80" cy="48" rx="26" ry="32" fill="url(#gBulb)" class="bulb" stroke="#bbb"/>
      <path d="M70 54 q 5 -14 10 0 q 5 14 10 0" stroke="#555" stroke-width="1.5" fill="none"/>
      <line x1="70" y1="54" x2="70" y2="82" stroke="#777"/><line x1="90" y1="54" x2="90" y2="82" stroke="#777"/>
      <rect x="64" y="78" width="32" height="26" rx="2" fill="url(#gMetH)"/>
      <rect x="60" y="88" width="6" height="6" fill="url(#gMet)"/><rect x="94" y="88" width="6" height="6" fill="url(#gMet)"/>
      <circle cx="80" cy="106" r="5" fill="url(#gBrass)"/>`;
  },
  indicator() {
    return `
      <path d="M20 36 L 140 30 L 136 90 L 24 86z" fill="#1b1308"/>
      <path d="M26 40 L 134 36 L 130 84 L 30 82z" fill="url(#gLensA)" class="bulb-amber"/>
      <circle cx="80" cy="60" r="14" fill="url(#gBulb)" opacity=".75"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${36 + i * 16}" y1="40" x2="${38 + i * 15}" y2="82" stroke="#fff" opacity=".18"/>`).join('')}`;
  },
  foglamp() {
    return `
      <circle cx="80" cy="60" r="44" fill="url(#gBlk)"/>
      <circle cx="80" cy="60" r="36" fill="url(#gChrome)"/>
      <circle cx="80" cy="60" r="34" fill="url(#gGlass)" opacity=".6"/>
      ${[...Array(5)].map((_, i) => `<line x1="${54 + i * 13}" y1="30" x2="${54 + i * 13}" y2="90" stroke="#fff" opacity=".25"/>`).join('')}
      <circle cx="80" cy="60" r="9" class="bulb" fill="url(#gBulb)"/>`;
  },
  horn() {
    return `
      <circle cx="74" cy="62" r="44" fill="url(#gRed)"/>
      <circle cx="74" cy="62" r="34" fill="#9e1414"/>
      <path d="M74 62 m -24 0 a 24 24 0 1 1 48 0 a 18 18 0 1 1 -36 0 a 12 12 0 1 1 24 0" stroke="#5e0909" stroke-width="5" fill="none"/>
      <circle cx="74" cy="62" r="8" fill="#2b0505"/>
      <rect x="114" y="20" width="10" height="44" rx="2" fill="url(#gMetH)"/>
      <circle cx="119" cy="26" r="4" fill="#333"/>
      ${S.conn(126, 50, 22, 16, 'url(#gBlk)', 2)}`;
  },
  wiper() {
    return `
      <rect x="14" y="50" width="62" height="40" rx="18" fill="url(#gBlk)"/>
      <rect x="62" y="44" width="40" height="52" rx="6" fill="url(#gAlu)"/>
      ${S.conn(18, 30, 26, 18, 'url(#gBlk)', 5)}
      <circle cx="82" cy="70" r="7" fill="url(#gMet)"/>
      <path d="M82 70 L 118 54 L 150 24" stroke="url(#gMetH)" stroke-width="6" stroke-linecap="round" fill="none"/>
      <circle cx="118" cy="54" r="4" fill="#555"/>`;
  },
  window() {
    return `
      <path d="M30 12 L 130 12 L 130 62 L 30 62z" fill="url(#gGlass)" stroke="#9fb3c6"/>
      <path d="M40 62 L 120 112 M120 62 L 40 112" stroke="url(#gMetH)" stroke-width="6"/>
      <circle cx="80" cy="87" r="5" fill="#333"/>
      <rect x="22" y="62" width="116" height="6" fill="url(#gMetH)"/>
      <circle cx="40" cy="104" r="14" fill="url(#gBlk)"/>
      <rect x="26" y="98" width="10" height="12" fill="url(#gBlk)"/>
      ${S.conn(2, 96, 18, 16, 'url(#gGrey)', 2)}`;
  },
  doorlock() {
    return `
      <rect x="28" y="30" width="70" height="56" rx="6" fill="url(#gBlk)"/>
      <rect x="98" y="50" width="54" height="6" rx="3" fill="url(#gMetH)" class="lock-rod"/>
      <circle cx="152" cy="53" r="5" fill="url(#gMet)"/>
      ${S.conn(36, 86, 26, 16, 'url(#gGrey)', 2)}
      <circle cx="40" cy="40" r="4" fill="url(#gMet)"/><circle cx="86" cy="76" r="4" fill="url(#gMet)"/>
      ${S.shine(32, 34, 62, 4)}`;
  },
  blower() {
    return `
      <circle cx="74" cy="62" r="46" fill="url(#gBlk)"/>
      <circle cx="74" cy="62" r="38" fill="#0e0f11"/>
      <g class="spin" style="transform-origin:74px 62px">
        ${[...Array(24)].map((_, i) => `<rect x="72" y="26" width="4" height="14" rx="1" fill="#3d4046" transform="rotate(${i * 15} 74 62)"/>`).join('')}
      </g>
      <circle cx="74" cy="62" r="18" fill="url(#gBlk)" stroke="#444"/>
      <rect x="116" y="40" width="34" height="40" rx="4" fill="url(#gBlk)"/>
      ${S.conn(120, 46, 26, 16, 'url(#gGrey)', 2)}`;
  },
  defog() {
    return `
      <path d="M14 22 Q 80 6 146 22 L 152 100 Q 80 114 8 100z" fill="url(#gGlass)" stroke="#9fb3c6"/>
      ${[...Array(9)].map((_, i) => `<path class="defog-line" d="M18 ${32 + i * 8} Q 80 ${20 + i * 8} 142 ${32 + i * 8}" stroke="#a75b2a" stroke-width="1.4" fill="none"/>`).join('')}
      <rect x="10" y="30" width="6" height="68" fill="#a75b2a"/><rect x="144" y="30" width="6" height="68" fill="#a75b2a"/>`;
  },
  mirror() {
    return `
      <path d="M20 30 Q 30 14 90 18 Q 146 22 144 60 Q 142 98 86 100 Q 26 102 20 70z" fill="url(#gBlk)"/>
      <path d="M30 34 Q 40 24 90 27 Q 134 30 134 60 Q 132 88 86 90 Q 36 92 30 68z" fill="url(#gChrome)"/>
      <path d="M40 40 L 90 34" stroke="#fff" stroke-width="3" opacity=".6"/>
      <rect x="2" y="54" width="22" height="20" rx="3" fill="url(#gBlk)"/>`;
  },
  dome() {
    return `
      <rect x="20" y="32" width="120" height="56" rx="12" fill="url(#gWhite)" stroke="#aaa"/>
      <rect x="34" y="42" width="92" height="36" rx="8" fill="#fffbe6" class="bulb" stroke="#ccc"/>
      <rect x="54" y="56" width="52" height="8" rx="4" fill="url(#gMetH)"/>
      <rect x="66" y="88" width="28" height="10" rx="2" fill="#bbb"/>`;
  },
  cluster() {
    return `
      <rect x="6" y="16" width="148" height="88" rx="20" fill="#0d0e11"/>
      <circle cx="46" cy="60" r="32" fill="#14161a" stroke="#333"/><circle cx="114" cy="60" r="32" fill="#14161a" stroke="#333"/>
      ${[...Array(9)].map((_, i) => `<line x1="46" y1="32" x2="46" y2="37" stroke="#ddd" transform="rotate(${-120 + i * 30} 46 60)"/><line x1="114" y1="32" x2="114" y2="37" stroke="#ddd" transform="rotate(${-120 + i * 30} 114 60)"/>`).join('')}
      <line x1="46" y1="60" x2="46" y2="34" stroke="#ff4a2a" stroke-width="2" transform="rotate(-60 46 60)"/>
      <line x1="114" y1="60" x2="114" y2="34" stroke="#ff4a2a" stroke-width="2" transform="rotate(-20 114 60)"/>
      <circle cx="80" cy="94" r="4" fill="#f59a0c"/><circle cx="68" cy="94" r="4" fill="#d42a24"/><circle cx="92" cy="94" r="4" fill="#23a046"/>`;
  },
  acclutch() {
    return `
      <rect x="62" y="30" width="86" height="62" rx="10" fill="url(#gAlu)" stroke="#888"/>
      <circle cx="54" cy="61" r="40" fill="url(#gBlk)"/>
      ${[...Array(6)].map((_, i) => `<circle cx="54" cy="61" r="${36 - i * 2}" fill="none" stroke="#333"/>`).join('')}
      <circle cx="54" cy="61" r="22" fill="url(#gMet)"/>
      <circle cx="54" cy="61" r="6" fill="#444"/>
      ${S.conn(100, 10, 26, 18, 'url(#gBlk)', 2)}`;
  }
};

function partSVG(id, cls = '') {
  const p = PART[id];
  const fn = DRAW[p.draw] || DRAW.relay;
  return `<svg class="part-svg ${cls}" viewBox="0 0 160 120" role="img" aria-label="${p.name}">${fn()}</svg>`;
}
