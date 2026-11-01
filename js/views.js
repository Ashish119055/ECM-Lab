/* ECM Lab — views: car map, wiring diagram, simulator, parts library, quiz, part drawer */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const kindVar = k => `var(--k-${k})`;
const engParts = () => PARTS.filter(p => p.engines.includes(Sim.s.engine));
const fmtV = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

function wireStrokes(code, d, w = 4.5, extra = '') {
  const [b, t] = code.split('-');
  const outline = (b === 'B' || b === 'W') ? `<path class="w-base" d="${d}" stroke="var(--ink-2)" stroke-width="${w + 1.6}" opacity=".55" ${extra}/>` : '';
  return outline + `<path class="w-base" d="${d}" stroke="${WIRE[b]}" stroke-width="${w}" ${extra}/>` +
    (t ? `<path class="w-base" d="${d}" stroke="${WIRE[t]}" stroke-width="${w * 0.42}" stroke-dasharray="5 6"/>` : '');
}

/* ───────────────────────── CAR MAP ───────────────────────── */
const MapView = (() => {
  let kind = 'all';
  function carSide() {
    const wheel = (cx) => `
      <g><circle cx="${cx}" cy="350" r="56" fill="#17191c"/><circle cx="${cx}" cy="350" r="49" fill="#24272b"/>
      <circle cx="${cx}" cy="350" r="36" fill="url(#gMet)"/><circle cx="${cx}" cy="350" r="25" fill="#6f757c"/>
      ${[...Array(5)].map((_, i) => `<rect x="${cx - 4}" y="316" width="8" height="24" rx="3" fill="url(#gMetH)" transform="rotate(${i * 72} ${cx} 350)"/>`).join('')}
      <circle cx="${cx}" cy="350" r="7" fill="#3a3f45"/></g>`;
    return `
      <defs><clipPath id="bayClip"><path d="M58 240 L322 207 L336 207 L336 338 L52 338 Z"/></clipPath></defs>
      <text x="22" y="430" class="map-cap" font-family="var(--f-mono)" font-size="11" fill="var(--ink-2)">◄ FRONT</text>
      <text x="978" y="430" text-anchor="end" font-family="var(--f-mono)" font-size="11" fill="var(--ink-2)">REAR ►</text>
      <line x1="10" y1="406" x2="990" y2="406" stroke="var(--line)" stroke-width="2"/>
      <path d="M30 332 L33 290 Q36 246 64 236 L322 205 L430 128 Q440 121 458 120 L648 120 Q668 121 684 130 L800 200 L924 210 Q956 216 960 250 L968 318 Q970 340 948 340 L845 340 A70 70 0 0 0 705 340 L285 340 A70 70 0 0 0 145 340 L52 340 Q30 340 30 332 Z"
        fill="var(--car)" stroke="var(--car-line)" stroke-width="2.5"/>
      <path d="M338 208 L432 140 Q440 134 455 134 L548 134 L548 208 Z" fill="var(--glass)" opacity=".75"/>
      <path d="M558 134 L645 134 Q662 135 674 142 L772 202 L558 208 Z" fill="var(--glass)" opacity=".75"/>
      <path d="M548 134 V336 M338 210 V336 M700 204 V290 M336 210 L800 202" stroke="var(--car-line)" stroke-width="1.5" fill="none"/>
      <rect x="486" y="232" width="34" height="7" rx="3" fill="var(--car-line)"/><rect x="626" y="230" width="34" height="7" rx="3" fill="var(--car-line)"/>
      <!-- cabin hints -->
      <g stroke="var(--car-line)" stroke-width="1.5" fill="none" opacity=".55">
        <path d="M344 214 Q380 206 420 214 L420 236 Q380 244 344 238"/>
        <ellipse cx="438" cy="214" rx="6" ry="20" transform="rotate(-25 438 214)"/>
        <path d="M478 330 L500 236 Q505 222 520 224 L528 230 L512 300 L540 300 L540 330 Z"/>
        <path d="M610 330 L622 246 Q628 232 642 236 L650 242 L640 300 L690 300 L690 330 Z"/>
        <path d="M392 330 l10 -24 M376 300 l10 -16"/>
      </g>
      <!-- engine bay cut-away -->
      <path d="M58 240 L322 207 L336 207 L336 338 L52 338 Z" fill="var(--bay)" stroke="var(--car-line)" stroke-dasharray="5 4"/>
      <g clip-path="url(#bayClip)">
        <rect x="64" y="246" width="14" height="88" rx="2" fill="var(--car-2)" stroke="var(--car-line)"/>
        ${[...Array(10)].map((_, i) => `<line x1="64" y1="${252 + i * 8}" x2="78" y2="${252 + i * 8}" stroke="var(--car-line)" opacity=".6"/>`).join('')}
        <rect x="92" y="236" width="40" height="24" rx="3" fill="#1d1f23"/><rect x="96" y="232" width="8" height="5" fill="#d42a24"/><rect x="120" y="232" width="8" height="5" fill="#777"/>
        <rect x="138" y="228" width="32" height="16" rx="5" fill="#2a2d31"/>
        <path d="M170 236 Q186 236 196 240" stroke="#2a2d31" stroke-width="10" fill="none"/>
        <rect x="190" y="232" width="18" height="16" rx="3" fill="url(#gAlu)"/>
        <path d="M206 238 Q230 222 300 228" stroke="url(#gAlu)" stroke-width="12" fill="none"/>
        <rect x="174" y="236" width="134" height="24" rx="4" fill="var(--car-2)" stroke="var(--car-line)"/>
        <rect x="180" y="258" width="124" height="76" rx="6" fill="var(--car-2)" stroke="var(--car-line)"/>
        ${[0, 1, 2, 3].map(i => `<rect x="${194 + i * 28}" y="264" width="20" height="44" rx="3" fill="var(--car)" stroke="var(--car-line)" opacity=".8"/>`).join('')}
        <circle cx="142" cy="302" r="18" fill="url(#gAlu)" stroke="#777"/><circle cx="166" cy="332" r="14" fill="#2a2d31"/>
        <path d="M300 288 Q320 292 326 312 L330 338" stroke="#7a7f86" stroke-width="9" fill="none"/>
        <path d="M296 304 L336 304 L336 338 L292 338 Z" fill="var(--car-2)" stroke="var(--car-line)"/>
        <path d="M86 270 L90 330" stroke="#2a2d31" stroke-width="10" opacity=".6"/>
      </g>
      <!-- underbody -->
      <path d="M330 338 Q334 372 360 376 L900 378" stroke="#7a7f86" stroke-width="8" fill="none"/>
      <rect x="372" y="366" width="66" height="22" rx="9" fill="url(#gMet)" stroke="#777"/>
      <text x="405" y="381" text-anchor="middle" font-family="var(--f-mono)" font-size="9" fill="#333">CAT/DPF</text>
      <rect x="818" y="364" width="92" height="28" rx="12" fill="url(#gMet)" stroke="#777"/>
      <rect x="586" y="342" width="120" height="30" rx="8" fill="var(--car-2)" stroke="var(--car-line)"/>
      <text x="646" y="362" text-anchor="middle" font-family="var(--f-mono)" font-size="9" fill="var(--ink-2)">FUEL TANK</text>
      ${wheel(215)}${wheel(775)}
      <path d="M36 262 Q40 250 60 246 L62 276 L36 280Z" fill="url(#gGlass)" stroke="var(--car-line)"/>
      <path d="M952 228 L962 230 L966 270 L954 270Z" fill="url(#gLensR)"/>
      <g id="hsLayer"></g>`;
  }
  function render() {
    const svg = $('#carMap');
    svg.innerHTML = carSide();
    const layer = $('#hsLayer');
    const list = engParts().filter(p => p.loc && (kind === 'all' || p.kind === kind));
    layer.innerHTML = list.map(p => `
      <g class="hs" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
        <circle class="ring" cx="${p.loc.x}" cy="${p.loc.y}" r="8" stroke="${kindVar(p.kind)}"/>
        <circle class="core" cx="${p.loc.x}" cy="${p.loc.y}" r="7" fill="${kindVar(p.kind)}"/>
        <text x="${p.loc.x + 10}" y="${p.loc.y - 8}">${p.short}</text>
      </g>`).join('');
    $('#mapList').innerHTML = list.map(p => `
      <button class="ml-item" data-id="${p.id}">
        ${partSVG(p.id)}
        <span><span class="ml-name">${p.name}</span>
        <span class="ml-meta"><i class="dot k-${p.kind}"></i>${p.short}<span class="ml-live" data-live="${p.id}"></span></span></span>
      </button>`).join('');
    $$('.hs', layer).forEach(g => {
      g.addEventListener('click', () => Drawer.open(g.dataset.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Drawer.open(g.dataset.id); } });
      g.addEventListener('mouseenter', () => $(`.ml-item[data-id="${g.dataset.id}"]`)?.classList.add('hl'));
      g.addEventListener('mouseleave', () => $(`.ml-item[data-id="${g.dataset.id}"]`)?.classList.remove('hl'));
    });
    $$('.ml-item').forEach(b => {
      b.addEventListener('click', () => Drawer.open(b.dataset.id));
      b.addEventListener('mouseenter', () => $(`.hs[data-id="${b.dataset.id}"]`)?.classList.add('hl'));
      b.addEventListener('mouseleave', () => $(`.hs[data-id="${b.dataset.id}"]`)?.classList.remove('hl'));
    });
    update();
  }
  function faultedParts() {
    const set = new Set();
    Sim.s.faults.forEach(f => { const F = FAULTS[f]; if (!F || !F.engines.includes(Sim.s.engine)) return; set.add(F.part || (Sim.s.engine === 'petrol' ? 'injp' : 'injd')); });
    return set;
  }
  function update() {
    const bad = faultedParts();
    $$('#hsLayer .hs').forEach(g => {
      const id = g.dataset.id;
      g.classList.toggle('active', Sim.active(id) && Sim.s.key >= 2);
      g.classList.toggle('fault', bad.has(id));
    });
    $$('#mapList [data-live]').forEach(el => { el.textContent = Sim.s.key >= 2 || ['battery', 'ignsw'].includes(el.dataset.live) ? Sim.reading(el.dataset.live) : ''; });
  }
  function pulse(id) {
    const g = $(`#hsLayer .hs[data-id="${id}"]`);
    if (!g) return;
    g.classList.remove('pulse'); void g.getBBox(); g.classList.add('pulse');
    g.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
  function init() {
    $$('#mapFilters .chip[data-kind]').forEach(c => c.addEventListener('click', () => {
      kind = c.dataset.kind; $$('#mapFilters .chip[data-kind]').forEach(x => x.classList.toggle('on', x === c)); render();
    }));
    $('#labelsBtn').addEventListener('click', e => {
      const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      e.currentTarget.setAttribute('aria-pressed', on); $('#carMap').classList.toggle('nolabels', !on);
    });
  }
  return { init, render, update, pulse, setKind: k => { kind = k; } };
})();

/* ───────────────────────── WIRING DIAGRAM ───────────────────────── */
const WiringView = (() => {
  let probe = null;
  const W = 1320, CW = 178, LX = 18, RX = W - 18 - CW, ECM1 = 560, ECM2 = 760, LBUS = 214, RBUS = 1104, TOP = 168;
  const routedToECM = r => ['ref', 'gnd', 'sig', 'sh', 'drv', 'hs', 'heat', 'can'].includes(r);
  const ground = (x, y) => `<g stroke="var(--ink)" stroke-width="2"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + 8}"/><line x1="${x - 9}" y1="${y + 8}" x2="${x + 9}" y2="${y + 8}"/><line x1="${x - 6}" y1="${y + 12}" x2="${x + 6}" y2="${y + 12}"/><line x1="${x - 3}" y1="${y + 16}" x2="${x + 3}" y2="${y + 16}"/></g>`;

  function faultPin(part) {
    for (const f of Sim.s.faults) {
      const F = FAULTS[f]; if (!F || !F.engines.includes(Sim.s.engine)) continue;
      const pid = F.part || (Sim.s.engine === 'petrol' ? 'injp' : 'injd');
      if (pid !== part.id) continue;
      let i = part.pins.findIndex(p => p[1] === (part.kind === 'sensor' ? 'sig' : 'drv'));
      if (i < 0) i = part.pins.findIndex(p => p[1] === 'hs');
      return i;
    }
    return -1;
  }

  function comp(p, x, y, side) {
    const h = Math.max(62, p.pins.length * 20 + 18);
    const edge = side === 'L' ? x + CW : x;
    let s = `<g class="comp" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
      <rect class="cbox" x="${x}" y="${y}" width="${CW}" height="${h}" rx="8"/>
      <svg x="${side === 'L' ? x + 6 : x + CW - 72}" y="${y + 6}" width="66" height="50" viewBox="0 0 160 120">${(DRAW[p.draw] || DRAW.relay)()}</svg>
      <text class="cname" x="${side === 'L' ? x + 78 : x + 10}" y="${y + 22}">${p.short}</text>
      <text class="csub" x="${side === 'L' ? x + 78 : x + 10}" y="${y + 36}">${p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name}</text>`;
    s += '</g>';
    const wires = [];
    const fp = faultPin(p);
    p.pins.forEach((pin, i) => {
      const [no, role, col, ecmPin, desc] = pin;
      const py = y + 18 + i * 20 + (h - (p.pins.length * 20 + 18)) / 2 + 6;
      s += `<text class="pin" x="${side === 'L' ? edge - 4 : edge + 4}" y="${py - 4}" text-anchor="${side === 'L' ? 'end' : 'start'}">${no}</text>`;
      let x2, d, endMark = '';
      if (routedToECM(role)) {
        x2 = side === 'L' ? ECM1 : ECM2;
      } else if (role === 'bat') {
        x2 = side === 'L' ? LBUS : RBUS;
        endMark = `<circle cx="${x2}" cy="${py}" r="3.5" fill="${WIRE.R}"/>`;
      } else {
        x2 = side === 'L' ? edge + 10 : edge - 10;
        endMark = ground(x2, py);
      }
      d = `M${edge} ${py} H${x2}`;
      const out = ['drv', 'hs', 'ref', 'heat'].includes(role);
      const broken = i === fp;
      const midX = (edge + x2) / 2;
      wires.push(`<g class="wire${broken ? ' broken' : ''}" data-part="${p.id}" data-pin="${i}" data-role="${role}">
        ${wireStrokes(col, d, 4.5, broken ? 'stroke-dasharray="10 7"' : '')}
        <path class="w-flow${out ? ' out' : ''}" d="${d}"/>
        <path class="w-hit" d="${d}"><title>${p.short} pin ${no} · ${desc} · ${WIRE_NAME[col.split('-')[0]]}${col.includes('-') ? '/' + WIRE_NAME[col.split('-')[1]] : ''}</title></path>
        ${routedToECM(role) ? `<text class="w-col" x="${side === 'L' ? LBUS + 8 : RBUS - 8}" y="${py - 5}" text-anchor="${side === 'L' ? 'start' : 'end'}">${col} · ${desc}</text>` : `<text class="w-col" x="${side === 'L' ? edge + 8 : edge - 8}" y="${py - 5}" text-anchor="${side === 'L' ? 'start' : 'end'}">${col}</text>`}
        ${routedToECM(role) ? `<text class="w-val" x="${side === 'L' ? x2 - 8 : x2 + 8}" y="${py - 5}" text-anchor="${side === 'L' ? 'end' : 'start'}"></text>
          <text class="pin" x="${side === 'L' ? x2 + 6 : x2 - 6}" y="${py + 3}" text-anchor="${side === 'L' ? 'start' : 'end'}">${ecmPin}</text>` : ''}
        ${broken ? `<text class="brk" x="${midX}" y="${py + 5}" text-anchor="middle">✕ OPEN</text>` : ''}
        ${endMark}
      </g>`);
    });
    return { svg: s, wires: wires.join(''), h };
  }

  function render() {
    const eng = Sim.s.engine;
    const sensors = PARTS.filter(p => p.kind === 'sensor' && p.engines.includes(eng) && p.id !== 'oilp');
    const acts = PARTS.filter(p => p.kind === 'actuator' && p.engines.includes(eng)).concat([PART.mil]);
    let yL = TOP + 24, yR = TOP + 24, compsL = '', compsR = '', wires = '';
    sensors.forEach(p => { const c = comp(p, LX, yL, 'L'); compsL += c.svg; wires += c.wires; yL += c.h + 14; });
    acts.forEach(p => { const c = comp(p, RX, yR, 'R'); compsR += c.svg; wires += c.wires; yR += c.h + 14; });
    const bottom = Math.max(yL, yR) + 10;
    const H = bottom + 110;
    const svg = $('#wiring');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const ecmH = bottom - TOP;
    svg.innerHTML = `
      <defs><pattern id="ecmHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="var(--panel)"/><line x1="0" y1="0" x2="0" y2="8" stroke="var(--line)" stroke-width="2"/></pattern></defs>
      <!-- power supply -->
      <g class="comp" data-id="battery" tabindex="0" role="button" aria-label="Battery">
        <rect class="cbox" x="18" y="18" width="150" height="86" rx="8"/>
        <svg x="24" y="24" width="72" height="54" viewBox="0 0 160 120">${DRAW.battery()}</svg>
        <text class="cname" x="100" y="44">BAT</text><text class="csub" x="100" y="58" id="wBatV">12.6 V</text>
      </g>
      <g class="wire" data-part="battery" data-pin="0" data-role="bat">${wireStrokes('R', 'M168 40 H270')}<path class="w-flow on" d="M168 40 H270"/><path class="w-hit" d="M168 40 H270"/></g>
      <rect x="270" y="30" width="56" height="20" rx="3" fill="#e05a1a"/><text class="pin" x="298" y="64" text-anchor="middle">FL MAIN 100A</text>
      <g class="wire" data-part="fusebox" data-pin="0" data-role="bat">${wireStrokes('R', 'M326 40 H380')}<path class="w-flow on" d="M326 40 H380"/><path class="w-hit" d="M326 40 H380"/></g>
      <rect x="380" y="32" width="30" height="16" rx="2" fill="${FUSE_COLOR.L}"/><text class="pin" x="395" y="64" text-anchor="middle">EFI 15A</text>
      <g class="wire" data-part="mainrelay" data-pin="0" data-role="bat">${wireStrokes('R', 'M410 40 H470')}<path class="w-flow on" d="M410 40 H470"/><path class="w-hit" d="M410 40 H470"/></g>
      <g class="comp" data-id="mainrelay" tabindex="0" role="button" aria-label="EFI main relay">
        <rect class="cbox" x="470" y="18" width="120" height="86" rx="8"/>
        <text class="cname" x="482" y="40">EFI RELAY</text>
        <g stroke="var(--ink)" stroke-width="1.6" fill="none"><rect x="484" y="52" width="22" height="30"/><path d="M484 52 l22 30"/><path id="wRelayArm" d="M540 82 L566 66"/><path d="M566 82 h12"/></g>
        <text class="pin" x="484" y="96">85 86</text><text class="pin" x="538" y="96">30 87</text>
      </g>
      <g class="wire" data-part="mainrelay" data-pin="1" data-role="hs">${wireStrokes('R-B', `M590 60 H660 V${TOP}`)}<path class="w-flow out" d="M590 60 H660 V${TOP}"/><path class="w-hit" d="M590 60 H660 V${TOP}"/>
        <text class="w-val" x="668" y="${TOP - 10}"></text><text class="w-col" x="600" y="54">R-B  +B (EFI)</text></g>
      <g class="wire" data-part="mainrelay" data-pin="1" data-role="hs">${wireStrokes('R-B', `M640 60 V128 H${LBUS} V${bottom}`)}${wireStrokes('R-B', `M640 128 H${RBUS} V${bottom}`)}
        <path class="w-hit" d="M640 128 H${LBUS} M640 128 H${RBUS}"/></g>
      <text class="pin" x="${LBUS + 6}" y="${TOP + 12}">+B bus</text><text class="pin" x="${RBUS - 6}" y="${TOP + 12}" text-anchor="end">+B bus</text>
      <g class="comp" data-id="ignsw" tabindex="0" role="button" aria-label="Ignition switch">
        <rect class="cbox" x="830" y="18" width="150" height="86" rx="8"/>
        <svg x="836" y="26" width="64" height="48" viewBox="0 0 160 120">${DRAW.ignsw()}</svg>
        <text class="cname" x="904" y="44">IG SW</text><text class="csub" x="904" y="58" id="wKey">LOCK</text>
      </g>
      <g class="wire" data-part="ignsw" data-pin="2" data-role="hs">${wireStrokes('B-Y', `M830 70 H700 V${TOP}`)}<path class="w-flow out" d="M830 70 H700 V${TOP}"/><path class="w-hit" d="M830 70 H700 V${TOP}"/><text class="w-col" x="820" y="64" text-anchor="end">B-Y  IG</text></g>
      <g class="wire" data-part="ignsw" data-pin="2" data-role="hs">${wireStrokes('B-Y', 'M760 70 V90 H495 V82')}<path class="w-hit" d="M760 70 V90 H495 V82"/></g>
      ${ground(484, 82)}
      <g class="wire" data-part="battery" data-pin="0" data-role="bat">${wireStrokes('R', 'M200 40 V12 H1000 V40 H980')}<path class="w-hit" d="M200 40 V12 H1000 V40"/></g>
      <!-- ECM -->
      <g class="comp" data-id="ecm" tabindex="0" role="button" aria-label="Engine control module">
        <rect class="ecm-box" x="${ECM1}" y="${TOP}" width="${ECM2 - ECM1}" height="${ecmH}" rx="10"/>
        <rect x="${ECM1 + 30}" y="${TOP + ecmH / 2 - 70}" width="${ECM2 - ECM1 - 60}" height="140" rx="8" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>
        <text class="ecm-title" x="${(ECM1 + ECM2) / 2}" y="${TOP + ecmH / 2 - 20}" text-anchor="middle">ECM</text>
        <text class="csub" x="${(ECM1 + ECM2) / 2}" y="${TOP + ecmH / 2}" text-anchor="middle">${eng === 'petrol' ? 'Petrol MPFI' : 'Diesel common-rail'}</text>
        <text class="pin" x="${(ECM1 + ECM2) / 2}" y="${TOP + ecmH / 2 + 22}" text-anchor="middle">5 V reg · A/D · CPU · drivers</text>
        <text class="pin" x="${(ECM1 + ECM2) / 2}" y="${TOP + ecmH / 2 + 38}" text-anchor="middle">CAN 500 kbit/s</text>
        <text class="pin" x="${ECM1 + 6}" y="${TOP + 14}">INPUTS ►</text><text class="pin" x="${ECM2 - 6}" y="${TOP + 14}" text-anchor="end">► OUTPUTS</text>
        <text class="pin" x="660" y="${TOP + 28}" text-anchor="middle">+B</text><text class="pin" x="700" y="${TOP + 28}" text-anchor="middle">IG</text>
      </g>
      ${compsL}${compsR}${wires}
      <!-- ECM grounds & CAN -->
      <g class="wire" data-part="ecm" data-pin="3" data-role="cg">${wireStrokes('B', `M620 ${bottom} V${bottom + 40}`)}<path class="w-hit" d="M620 ${bottom} V${bottom + 40}"/></g>
      ${ground(620, bottom + 40)}<text class="pin" x="630" y="${bottom + 22}">E01 power ground</text>
      <g class="wire" data-part="ecm" data-pin="4" data-role="can">${wireStrokes('L', `M690 ${bottom} V${bottom + 52} H820`)}<path class="w-flow out" d="M690 ${bottom} V${bottom + 52} H820"/><path class="w-hit" d="M690 ${bottom} V${bottom + 52} H820"/></g>
      <g class="wire" data-part="ecm" data-pin="5" data-role="can">${wireStrokes('W', `M710 ${bottom} V${bottom + 40} H820`)}<path class="w-flow out" d="M710 ${bottom} V${bottom + 40} H820"/><path class="w-hit" d="M710 ${bottom} V${bottom + 40} H820"/></g>
      <g transform="translate(822 ${bottom + 24})">
        <path d="M0 0 H110 L100 40 H10 Z" fill="#1d1f23"/>
        ${[...Array(8)].map((_, i) => `<rect x="${14 + i * 11}" y="8" width="6" height="8" fill="url(#gBrass)"/><rect x="${18 + i * 10}" y="24" width="6" height="8" fill="url(#gBrass)"/>`).join('')}
        <text class="pin" x="55" y="56" text-anchor="middle">OBD-II DLC (pins 6 / 14 CAN, 16 +B)</text>
      </g>
      <text class="pin" x="18" y="${H - 14}">Example colours: R red · B black · W white · Y yellow · G green · L blue · BR brown · GR grey · P pink · O orange · V violet. Second letter = tracer stripe. Always use the maker's diagram for a specific car.</text>`;
    // events
    $$('.comp', svg).forEach(g => {
      g.addEventListener('click', () => Drawer.open(g.dataset.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter') Drawer.open(g.dataset.id); });
      g.addEventListener('mouseenter', () => { svg.classList.add('dim'); g.classList.add('hl'); $$(`.wire[data-part="${g.dataset.id}"]`, svg).forEach(w => w.classList.add('hl')); });
      g.addEventListener('mouseleave', () => { svg.classList.remove('dim'); $$('.hl', svg).forEach(x => x.classList.remove('hl')); });
    });
    $$('.wire', svg).forEach(w => w.addEventListener('click', () => {
      $$('.wire .w-base.probe', svg).forEach(x => x.classList.remove('probe'));
      probe = { part: w.dataset.part, pin: +w.dataset.pin, role: w.dataset.role };
      update(true);
    }));
    $('#wireLegend').innerHTML = Object.entries(WIRE_NAME).map(([k, n]) => `<span><i style="background:${WIRE[k]}"></i>${k} ${n}</span>`).join('');
    update(true);
  }

  function update() {
    const svg = $('#wiring');
    if (!svg) return;
    const s = Sim.s;
    svg.classList.toggle('live', s.key >= 1);
    $$('.wire', svg).forEach(w => {
      const p = PART[w.dataset.part]; if (!p) return;
      const role = w.dataset.role, i = +w.dataset.pin;
      const v = w.classList.contains('broken') ? 0 : Sim.pinVolts(p, role, i);
      const val = $('.w-val', w);
      if (val) {
        if (s.key < 2 && !['bat'].includes(role)) val.textContent = role === 'hs' && p.id === 'mainrelay' ? '0 V' : '';
        else if (p.id === 'ckp' && role === 'sig') val.textContent = `${fmtV(v)} V AC`;
        else val.textContent = `${fmtV(v)} V`;
      }
      const flow = $('.w-flow', w);
      if (flow) flow.classList.toggle('on', v > 0.3 && (role === 'sig' || role === 'ref' || role === 'can' || role === 'bat' || Sim.active(p.id)));
    });
    $('#wBatV') && ($('#wBatV').textContent = `${s.vbat.toFixed(1)} V`);
    $('#wKey') && ($('#wKey').textContent = ['LOCK', 'ACC', 'ON', 'START'][s.key]);
    const arm = $('#wRelayArm'); if (arm) arm.setAttribute('d', s.key >= 2 ? 'M540 82 L566 80' : 'M540 82 L566 66');
    // multimeter
    if (probe) {
      const p = PART[probe.part];
      const broken = $(`.wire.broken[data-part="${probe.part}"][data-pin="${probe.pin}"]`, svg);
      const v = broken ? 0 : Sim.pinVolts(p, probe.role, probe.pin);
      const pin = p.pins[probe.pin] || p.pins[0];
      $('#dmmVal').textContent = (p.id === 'ckp' && probe.role === 'sig') ? fmtV(v) : fmtV(v);
      $('#dmmUnit').textContent = (p.id === 'ckp' && probe.role === 'sig') ? 'V AC' : 'V DC';
      $('#dmmInfo').textContent = `${p.short} pin ${pin[0]} (${pin[2]}) · ${pin[4]}${broken ? ' · open circuit!' : ''}`;
      $$(`.wire[data-part="${probe.part}"][data-pin="${probe.pin}"] .w-base`, svg).forEach(x => x.classList.add('probe'));
    }
  }
  return { render, update };
})();

/* ───────────────────────── SIMULATOR ───────────────────────── */
const SimView = (() => {
  let thetaV = 0, lastDtcKey = null, lastFaultEng = '';
  const offsets = { 1: 0, 2: 540, 3: 180, 4: 360 };

  function setupCanvas(cv) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w, h };
  }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function gauge(cv, val, max, label, unit, opts = {}) {
    const g = setupCanvas(cv); if (!g) return;
    const { c, w, h } = g; const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#12161b'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a3038'; c.lineWidth = 2; c.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ticks = opts.ticks || 7;
    if (opts.red) { c.strokeStyle = '#d0261f'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R - 8, a0 + (a1 - a0) * opts.red, a1); c.stroke(); }
    for (let i = 0; i <= ticks * 2; i++) {
      const a = a0 + (a1 - a0) * i / (ticks * 2), major = i % 2 === 0;
      c.strokeStyle = '#d6dde4'; c.lineWidth = major ? 2.4 : 1.2;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); c.lineTo(cx + Math.cos(a) * (R - (major ? 14 : 9)), cy + Math.sin(a) * (R - (major ? 14 : 9))); c.stroke();
      if (major && opts.labels) {
        c.fillStyle = '#c7d0d8'; c.font = `600 ${Math.max(9, R * 0.13)}px "IBM Plex Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(opts.labels[i / 2], cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26));
      }
    }
    const frac = Math.max(0, Math.min(1, val / max));
    const a = a0 + (a1 - a0) * frac;
    c.strokeStyle = '#ff5a2a'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); c.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); c.stroke();
    c.fillStyle = '#333a42'; c.beginPath(); c.arc(cx, cy, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e6edf3'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = `600 ${R * 0.24}px "IBM Plex Mono", monospace`; c.fillText(opts.text ?? Math.round(val), cx, cy + R * 0.5);
    c.fillStyle = '#8a97a4'; c.font = `600 ${R * 0.11}px "IBM Plex Mono", monospace`; c.fillText(unit, cx, cy + R * 0.68);
    c.fillText(label, cx, cy - R * 0.32);
  }

  function engine(dt) {
    const g = setupCanvas($('#engineCv')); if (!g) return;
    const { c, w, h } = g; const s = Sim.s; const P = s.engine === 'petrol';
    const slow = +$('#slowmo').value;
    const rpm = s.rpmShown || 0;
    thetaV = (thetaV + rpm / 60 * 360 * dt / (slow * 2)) % 720;
    c.clearRect(0, 0, w, h);
    const ink = css('--ink'), ink2 = css('--ink-2'), line = css('--line'), panel = css('--panel'), bg2 = css('--bg-2');
    const cw = w / 4, bore = Math.min(cw * 0.56, 76), top = 36, chamber = 18, stroke = Math.max(30, Math.min((h - 110) / 3.2, 70));
    const crankR = stroke / 2, rod = stroke * 1.6;
    [1, 2, 3, 4].forEach((cyl, idx) => {
      const cx = cw * idx + cw / 2;
      const phi = ((thetaV - offsets[cyl]) % 720 + 720) % 720;
      const rad = phi * Math.PI / 180;
      const yc = top + chamber + rod + crankR + 10;
      const pinX = cx + crankR * Math.sin(rad), pinY = yc - crankR * Math.cos(rad);
      const pistonPinY = pinY - Math.sqrt(rod * rod - (pinX - cx) ** 2);
      const pistonTop = pistonPinY - 16;
      const misfire = (cyl === 1 && Sim.has('inj1_open')) || (cyl === 2 && P && Sim.has('coil2_open'));
      const fueled = s.running || s.cranking;
      // cylinder walls
      c.fillStyle = bg2; c.fillRect(cx - bore / 2, top, bore, yc - top - crankR - 6);
      // gas
      let gas = null;
      if (fueled) {
        if (phi < 70 && !misfire && s.running) gas = `rgba(255,${120 + phi * 1.5},30,${0.85 - phi / 90})`;
        else if (phi < 180) gas = misfire ? 'rgba(120,170,220,.35)' : 'rgba(200,120,60,.25)';
        else if (phi < 360) gas = 'rgba(120,120,120,.35)';
        else if (phi < 540) gas = P ? 'rgba(90,181,238,.35)' : 'rgba(170,210,240,.3)';
        else gas = P ? `rgba(90,181,238,${0.35 + (phi - 540) / 400})` : `rgba(170,210,240,${0.3 + (phi - 540) / 500})`;
      }
      if (gas) { c.fillStyle = gas; c.fillRect(cx - bore / 2, top, bore, pistonTop - top); }
      // head
      c.fillStyle = css('--car-2'); c.fillRect(cx - bore / 2 - 10, top - 22, bore + 20, 22);
      c.strokeStyle = ink2; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - bore / 2, top); c.lineTo(cx - bore / 2, yc - crankR - 6); c.moveTo(cx + bore / 2, top); c.lineTo(cx + bore / 2, yc - crankR - 6); c.stroke();
      // valves
      const inOpen = phi > 350 && phi < 560, exOpen = phi > 160 && phi < 370;
      const vDraw = (vx, open, col) => { const d = open ? 7 : 0; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(vx, top - 20); c.lineTo(vx, top + d); c.stroke(); c.fillStyle = col; c.fillRect(vx - 7, top + d - 2, 14, 3); };
      vDraw(cx - bore * 0.28, inOpen, '#5ab5ee'); vDraw(cx + bore * 0.28, exOpen, '#9aa0a7');
      // spark plug / injector
      if (P) {
        c.fillStyle = '#e5e7eb'; c.fillRect(cx - 3, top - 26, 6, 26);
        const sparkAt = 720 - s.adv;
        if (fueled && !misfire && (phi > sparkAt - 10 || phi < 3)) { c.fillStyle = '#93c5fd'; c.shadowColor = '#60a5fa'; c.shadowBlur = 18; c.beginPath(); c.arc(cx, top + 3, 5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0; }
        // port injector spray
        const injOK = !(cyl === 1 && Sim.has('inj1_open'));
        c.fillStyle = '#1f9a42'; c.fillRect(cx - bore / 2 - 18, top - 30, 8, 16);
        if (fueled && injOK && phi > 300 && phi < 420) { c.fillStyle = 'rgba(150,200,255,.8)'; for (let i = 0; i < 10; i++) c.fillRect(cx - bore / 2 - 12 + Math.random() * 12, top - 14 + Math.random() * 12, 2, 2); }
      } else {
        c.fillStyle = '#c9cdd2'; c.fillRect(cx - 4, top - 30, 8, 30);
        const injOK = !(cyl === 1 && Sim.has('inj1_open'));
        if (fueled && injOK && (phi > 700 || phi < 18)) { c.fillStyle = 'rgba(214,190,90,.9)'; for (let i = 0; i < 16; i++) { const a = (Math.random() - .5) * 2.2; const r = Math.random() * 18; c.fillRect(cx + Math.sin(a) * r, top + 2 + Math.cos(a) * r * 0.6, 2, 2); } }
        if (s.glowOn) { c.fillStyle = '#ff7a1a'; c.shadowColor = '#ff7a1a'; c.shadowBlur = 12; c.fillRect(cx + bore * 0.12, top - 4, 5, 9); c.shadowBlur = 0; }
      }
      // piston + rod + crank
      c.fillStyle = '#b9bec4'; c.fillRect(cx - bore / 2 + 2, pistonTop, bore - 4, 24);
      c.fillStyle = '#7f858c'; for (let i = 0; i < 3; i++) c.fillRect(cx - bore / 2 + 2, pistonTop + 3 + i * 4, bore - 4, 1.4);
      c.strokeStyle = '#8b9198'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, pistonPinY); c.lineTo(pinX, pinY); c.stroke();
      c.strokeStyle = ink2; c.lineWidth = 2; c.beginPath(); c.arc(cx, yc, crankR + 6, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#5b6168'; c.beginPath(); c.arc(pinX, pinY, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = ink2; c.beginPath(); c.arc(cx, yc, 3, 0, Math.PI * 2); c.fill();
      // label
      const strokeName = phi < 180 ? 'POWER' : phi < 360 ? 'EXHAUST' : phi < 540 ? 'INTAKE' : 'COMPRESS';
      const col = phi < 180 ? '#e8590c' : phi < 360 ? ink2 : phi < 540 ? css('--signal') : css('--accent');
      c.textAlign = 'center'; c.fillStyle = ink; c.font = '600 12px "IBM Plex Mono", monospace'; c.fillText(`CYL ${cyl}`, cx, h - 26);
      c.fillStyle = fueled || s.rpm > 0 ? col : ink2; c.font = '600 11px "IBM Plex Mono", monospace'; c.fillText(misfire && s.running ? 'MISFIRE' : strokeName, cx, h - 10);
      if (misfire && s.running) { c.fillStyle = css('--bad'); c.fillText('MISFIRE', cx, h - 10); }
    });
    $('#cycleInfo').textContent = `firing order 1-3-4-2 · crank ${Math.round(thetaV % 360)}°`;
  }

  function channels() {
    return Sim.s.engine === 'petrol'
      ? [['ckp', 'CKP crank sensor (60-2)'], ['ckpcmp', 'CKP + CMP sync'], ['inj', 'Injector #1 driver'], ['ign', 'Ignition #1 primary'], ['o2', 'O2 sensor B1S1 (10 s)'], ['tps', 'TPS track 1 (10 s)'], ['map', 'MAP sensor (10 s)'], ['maf', 'MAF sensor (10 s)']]
      : [['ckp', 'CKP crank sensor (60-2)'], ['ckpcmp', 'CKP + CMP sync'], ['injd', 'Injector #1 current'], ['rail', 'Rail pressure sensor (10 s)'], ['map', 'Boost sensor (10 s)'], ['maf', 'MAF sensor (10 s)'], ['app', 'Accelerator pedal APP1 (10 s)']];
  }

  function scope() {
    const g = setupCanvas($('#scopeCv')); if (!g) return;
    const { c, w, h } = g; const s = Sim.s; const ch = $('#scopeCh').value;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(80,200,140,.14)'; c.lineWidth = 1;
    for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(i * w / 10, 0); c.lineTo(i * w / 10, h); c.stroke(); }
    for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(0, i * h / 8); c.lineTo(w, i * h / 8); c.stroke(); }
    const rpm = s.rpmShown || 0;
    const turning = rpm > 30;
    const plot = (fn, min, max, col, yOff = 0, yScale = 1) => {
      c.strokeStyle = col; c.lineWidth = 1.8; c.beginPath();
      for (let x = 0; x <= w; x++) {
        const v = fn(x / w);
        const y = yOff + (h * yScale) - ((v - min) / (max - min)) * (h * yScale - 16) - 8;
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    };
    let foot = '';
    const cycleMs = turning ? 120000 / rpm : 0;
    const cycleChans = ['ckp', 'ckpcmp', 'inj', 'ign', 'injd'];
    if (cycleChans.includes(ch)) {
      const ckp = f => {
        if (!turning || Sim.has('ckp_open')) return 0;
        const a = (f * 720) % 360, tooth = Math.floor(a / 6);
        if (tooth >= 58) return 0;
        const amp = Math.min(9, Math.max(0.6, rpm / 350));
        return amp * Math.sin(2 * Math.PI * (a % 6) / 6);
      };
      const cmp = f => (!turning || Sim.has('cmp_open')) ? 0.1 : (f * 720 > 80 && f * 720 < 260 ? 5 : 0.1);
      if (ch === 'ckp') { plot(ckp, -10, 10, '#6cf2a8'); foot = `CKP: ±${Math.min(9, Math.max(0.6, rpm / 350)).toFixed(1)} V AC · 58 teeth + 2-tooth gap per rev`; }
      if (ch === 'ckpcmp') { plot(ckp, -10, 10, '#6cf2a8', 0, 0.5); plot(cmp, -0.5, 6, '#ffd166', h * 0.5, 0.5); foot = 'Green = CKP · Yellow = CMP (one pulse per 720°)'; }
      if (ch === 'inj') {
        const pwDeg = turning ? s.pw * rpm * 6 / 1000 : 0;
        const dead = Sim.has('inj1_open');
        plot(f => {
          if (s.key < 2) return 0;
          if (dead) return 0;
          if (!turning) return s.vbat;
          const a = f * 720, st = 330;
          if (a >= st && a < st + pwDeg) return 0.3;
          if (a >= st + pwDeg && a < st + pwDeg + 12) return s.vbat + 55 * Math.exp(-(a - st - pwDeg) / 3);
          return s.vbat;
        }, -5, 75, '#6cf2a8');
        foot = dead ? 'Flat 0 V: injector coil open (no +12 V through winding)' : `Pulse width ${s.pw.toFixed(2)} ms · inductive spike ≈ 60 V at turn-off`;
      }
      if (ch === 'ign') {
        const dwellDeg = turning ? s.dwell * rpm * 6 / 1000 : 0;
        const fire = 720 - s.adv;
        plot(f => {
          if (s.key < 2) return 0;
          if (!turning) return s.vbat;
          const a = f * 720;
          if (a > fire - dwellDeg && a < fire) return 0.8;
          if (a >= fire && a < fire + 2) return 360;
          if (a >= fire + 2 && a < fire + 14) return 40 + Math.sin((a - fire) * 3) * 15;
          if (a >= fire + 14 && a < fire + 24) return s.vbat + Math.sin((a - fire) * 6) * 8 * Math.exp(-(a - fire - 14) / 4);
          return s.vbat;
        }, -20, 400, '#6cf2a8');
        foot = `Dwell ${s.dwell.toFixed(1)} ms · spark at ${s.adv.toFixed(0)}° BTDC · firing line ≈ 350 V primary`;
      }
      if (ch === 'injd') {
        const dead = Sim.has('inj1_open');
        plot(f => {
          if (!turning || dead) return 0;
          const a = f * 720;
          if (a > 700 && a < 704) return 12;
          if (a > 710 && a < 713) return 20;
          if (a >= 713 && a < 713 + s.qty * 0.35) return 12;
          return 0;
        }, -2, 24, '#6cf2a8');
        foot = dead ? 'No current: injector circuit open' : 'Pilot + main injection · peak 20 A / hold 12 A';
      }
      // cursor synced with engine animation (cyl 1)
      const cx = (thetaV % 720) / 720 * w;
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, h); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(200,255,220,.7)'; c.font = '600 10px "IBM Plex Mono", monospace'; c.textAlign = 'left';
      c.fillText('0°', 4, h - 4); c.textAlign = 'right'; c.fillText('720° (one engine cycle)', w - 4, h - 4);
      foot += turning ? ` · cycle ${cycleMs.toFixed(1)} ms (${(cycleMs / 10).toFixed(2)} ms/div)` : ' · engine not turning';
    } else {
      const H = s.history;
      const map = { o2: [H.o2, 0, 1, 'V'], tps: [H.tps, 0, 5, 'V'], map: [H.map, 0, 5, 'V'], maf: [H.maf, 0, 5, 'V'], rail: [H.rail, 0, 5, 'V'], app: [H.app, 0, 5, 'V'] };
      const [buf, min, max] = map[ch];
      if (buf.length > 1) {
        c.strokeStyle = '#6cf2a8'; c.lineWidth = 1.8; c.beginPath();
        buf.forEach((v, i) => { const x = w - (buf.length - 1 - i) * (w / 220); const y = h - ((v - min) / (max - min)) * (h - 16) - 8; i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.stroke();
      }
      const last = buf[buf.length - 1] ?? 0;
      c.fillStyle = 'rgba(200,255,220,.7)'; c.font = '600 10px "IBM Plex Mono", monospace'; c.textAlign = 'left';
      c.fillText(`${max} V`, 4, 12); c.fillText(`${min} V`, 4, h - 4); c.textAlign = 'right'; c.fillText('now', w - 4, h - 4);
      foot = `Now ${last.toFixed(2)} V · 1 s/div`;
      if (ch === 'o2') foot += s.closedLoop ? ' · closed loop: switching rich/lean' : ' · open loop';
    }
    $('#scopeFoot').textContent = foot;
  }

  function buildFaults() {
    const eng = Sim.s.engine;
    $('#faultList').innerHTML = Object.entries(FAULTS).filter(([, F]) => F.engines.includes(eng)).map(([k, F]) => `
      <button class="fault" data-f="${k}" aria-pressed="${Sim.s.faults.has(k)}">
        <span class="sw"></span>
        <span><b>${F.label} <code>${F.dtc}</code></b><small>${F.effect}</small></span>
      </button>`).join('');
    $$('#faultList .fault').forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.f, on = !Sim.s.faults.has(f);
      on ? Sim.s.faults.add(f) : Sim.s.faults.delete(f);
      b.setAttribute('aria-pressed', on);
      App.toast(on ? `Fault injected: ${FAULTS[f].label}` : `Repaired: ${FAULTS[f].label}. Clear codes to turn off MIL.`);
      App.faultsChanged();
    }));
    lastFaultEng = eng;
  }

  function slow() {
    const s = Sim.s;
    // channels
    const sel = $('#scopeCh');
    const chs = channels();
    if (sel.dataset.eng !== s.engine) { sel.innerHTML = chs.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''); sel.dataset.eng = s.engine; }
    if (lastFaultEng !== s.engine) buildFaults();
    // live table
    $('#liveTable').innerHTML = Sim.liveData().map(([n, v, u]) => `<tr class="${v === '—' || v === 'YES' ? 'warn' : ''}"><td>${n}</td><td>${s.key >= 2 ? v : '—'}</td><td>${u}</td></tr>`).join('');
    const pill = $('#loopPill');
    if (s.engine === 'petrol') { pill.textContent = s.closedLoop ? 'Closed loop' : 'Open loop'; pill.className = 'pill ' + (s.closedLoop ? 'ok' : ''); }
    else { pill.textContent = s.limp ? 'Limp mode' : s.running ? 'Normal' : 'Stopped'; pill.className = 'pill ' + (s.limp ? 'bad' : s.running ? 'ok' : ''); }
    // dtcs
    const key = [...s.dtcs.keys()].join(',');
    if (key !== lastDtcKey) {
      lastDtcKey = key;
      $('#dtcList').innerHTML = s.dtcs.size ? [...s.dtcs].map(([c, d]) => `<li><b>${c}</b> ${d.desc}</li>`).join('') : '<li class="none">No fault codes stored</li>';
    }
    // message
    let msg = s.msg;
    if (!msg) {
      if (s.key === 0) msg = 'Key in LOCK. Turn to ON.';
      else if (s.key === 1) msg = 'ACC: radio and accessories only. ECM is off.';
      else if (s.cranking) msg = 'Cranking… ECM waiting for CKP + CMP sync.';
      else if (!s.running) msg = s.engine === 'diesel' && s.glowT > 0 ? `Wait for glow lamp to go out (${s.glowT.toFixed(1)} s), then START.` : s.pumpOn ? 'Key ON: fuel pump priming, MIL bulb check. Press START.' : 'Key ON, engine off. Press START.';
      else msg = s.limp ? 'Engine running in LIMP mode: power limited. Read fault codes.' : s.misfire ? 'Engine shaking: misfire detected.' : 'Engine running normally.';
    }
    $('#simMsg').textContent = msg;
  }

  function frame(dt) {
    const s = Sim.s; const P = s.engine === 'petrol';
    const max = P ? 7000 : 5000;
    gauge($('#gRpm'), s.rpmShown || 0, max, 'RPM ×1000', 'rpm', { labels: P ? ['0', '1', '2', '3', '4', '5', '6', '7'] : ['0', '1', '2', '3', '4', '5'], ticks: P ? 7 : 5, red: P ? 6.2 / 7 : 4.3 / 5, text: Math.round(s.rpmShown || 0) });
    gauge($('#gSpeed'), Sim.has('vss_open') ? 0 : s.speed, 220, 'SPEED', 'km/h', { labels: ['0', '40', '80', '120', '160', '200', ''], ticks: 6 });
    const ectShown = Sim.has('ect_open') ? -40 : s.ect;
    gauge($('#gTemp'), Math.max(0, ectShown - 40), 90, 'COOLANT', '°C', { labels: ['C', '', '', 'H'], ticks: 3, red: 0.78, text: Math.round(ectShown) });
    engine(dt); scope();
  }

  function init() {
    $('#slowmo').addEventListener('input', e => { $('#slowVal').textContent = `1/${e.target.value * 2}`; });
    $('#clearDtc').addEventListener('click', () => { Sim.s.dtcs.clear(); lastDtcKey = 'x'; App.toast('Codes cleared. Active faults will set again.'); });
    $('#repairAll').addEventListener('click', () => { Sim.s.faults.clear(); buildFaults(); App.faultsChanged(); App.toast('All faults repaired. Clear codes to reset the MIL.'); });
  }
  return { init, frame, slow, buildFaults };
})();

/* ───────────────────────── PARTS LIBRARY ───────────────────────── */
const LibView = (() => {
  let kind = 'all', q = '';
  function render() {
    const query = q.trim().toLowerCase();
    const list = PARTS.filter(p => (kind === 'all' || p.kind === kind) && (!query ||
      [p.name, p.short, p.func, ...(p.dtcs || []).map(d => d[0])].join(' ').toLowerCase().includes(query)));
    $('#partCount').textContent = PARTS.length;
    $('#libGrid').innerHTML = list.length ? list.map(p => `
      <button class="card" data-id="${p.id}">
        <span class="art">${partSVG(p.id)}</span>
        <span class="nm">${p.name}</span>
        <span class="meta"><i class="dot k-${p.kind}"></i>${p.short}
          ${p.engines.length === 1 ? `<span class="tag">${p.engines[0]} only</span>` : ''}</span>
      </button>`).join('') : '<p class="hint">No parts match that search.</p>';
    $$('#libGrid .card').forEach(c => c.addEventListener('click', () => Drawer.open(c.dataset.id)));
  }
  function init() {
    $('#partSearch').addEventListener('input', e => { q = e.target.value; render(); });
    $$('#libFilters .chip').forEach(c => c.addEventListener('click', () => { kind = c.dataset.kind; $$('#libFilters .chip').forEach(x => x.classList.toggle('on', x === c)); render(); }));
  }
  return { init, render };
})();

/* ───────────────────────── QUIZ ───────────────────────── */
const QuizView = (() => {
  let i = 0, score = 0, answered = false;
  function render() {
    const el = $('#quiz');
    if (i >= QUIZ.length) {
      const pct = Math.round(score / QUIZ.length * 100);
      el.innerHTML = `<div class="q-text">You scored ${score} / ${QUIZ.length} (${pct} %)</div>
        <p class="lede">${pct >= 80 ? 'Workshop-ready. Try diagnosing injected faults in the simulator without looking at the fault list.' : 'Open the Parts library and review the sensors you missed, then try again.'}</p>
        <div class="q-actions"><button class="btn accent" id="qRestart">Start again</button></div>`;
      $('#qRestart').onclick = () => { i = 0; score = 0; answered = false; render(); };
      return;
    }
    const Q = QUIZ[i];
    el.innerHTML = `<div class="q-prog"><span>Question ${i + 1} of ${QUIZ.length}</span><span>Score ${score}</span></div>
      <div class="q-bar"><i style="width:${i / QUIZ.length * 100}%"></i></div>
      <div class="q-text">${Q.q}</div>
      <div class="q-opts">${Q.a.map((a, k) => `<button class="q-opt" data-k="${k}">${String.fromCharCode(65 + k)}. ${a}</button>`).join('')}</div>
      <div id="qWhy"></div>
      <div class="q-actions"><button class="btn" id="qNext" hidden>Next question</button></div>`;
    answered = false;
    $$('.q-opt', el).forEach(b => b.addEventListener('click', () => {
      if (answered) return; answered = true;
      const k = +b.dataset.k;
      if (k === Q.c) score++;
      $$('.q-opt', el).forEach(x => { x.disabled = true; if (+x.dataset.k === Q.c) x.classList.add('right'); });
      if (k !== Q.c) b.classList.add('wrong');
      $('#qWhy').innerHTML = `<div class="q-why"><b>${k === Q.c ? 'Correct.' : 'Not quite.'}</b> ${Q.why}</div>`;
      $('#qNext').hidden = false;
    }));
    $('#qNext').onclick = () => { i++; render(); };
  }
  return { render };
})();

/* ───────────────────────── PART DRAWER ───────────────────────── */
const Drawer = (() => {
  let current = null;
  function open(id) {
    const p = PART[id]; if (!p) return;
    current = id;
    $('#dChips').innerHTML = `<span class="tag" style="border-color:${kindVar(p.kind)};color:${kindVar(p.kind)}">${KINDS[p.kind].label}</span>` +
      p.engines.map(e => `<span class="tag">${e}</span>`).join('');
    const fault = p.fault && FAULTS[p.fault] && FAULTS[p.fault].engines.includes(Sim.s.engine) ? p.fault : null;
    $('#dContent').innerHTML = `
      <div class="d-hero">
        <div class="art">${partSVG(id)}</div>
        <div>
          <div class="d-short">${p.short}</div>
          <h2 class="d-title" id="dTitle">${p.name}</h2>
          <p class="note" style="margin-top:4px">${p.where}</p>
          <div class="d-live" id="dLive" ${Sim.reading(id) ? '' : 'hidden'}><span>Live</span><b></b></div>
        </div>
      </div>
      <div class="d-sec"><h3>What it does</h3><p>${p.func}</p></div>
      <div class="d-sec"><h3>How it works</h3><p>${p.work}</p><canvas class="d-anim" id="dAnim" aria-label="Animation of how the ${p.name} works"></canvas></div>
      <div class="d-sec"><h3>Signal &amp; specifications</h3>
        <div class="kv"><div>Signal type</div><div>${p.signal}</div>${p.specs.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>
        <p class="note">Typical values. Check the workshop manual for the exact vehicle.</p></div>
      <div class="d-sec"><h3>Connector &amp; wiring</h3>
        <div class="scroll-x"><table class="pins"><thead><tr><th>Pin</th><th>Function</th><th>Wire</th><th>To</th><th>Now</th></tr></thead><tbody>
        ${p.pins.map((pin, i) => { const [b, t] = pin[2].split('-'); return `<tr><td class="mono">${pin[0]}</td><td>${pin[4]}</td>
          <td><span class="wsw" style="background:${t ? `repeating-linear-gradient(90deg, ${WIRE[b]} 0 8px, ${WIRE[t]} 8px 12px)` : WIRE[b]}"></span><span class="mono">${pin[2]}</span></td>
          <td class="mono">${pin[3]}</td><td class="mono" data-pv="${i}"></td></tr>`; }).join('')}
        </tbody></table></div></div>
      <div class="d-sec"><h3>Symptoms when it fails</h3><ul class="ticks">${p.symptoms.map(x => `<li>${x}</li>`).join('')}</ul></div>
      ${p.dtcs.length ? `<div class="d-sec"><h3>Fault codes</h3><div class="dtc-tbl">${p.dtcs.map(([c, d]) => `<div><b>${c}</b><span>${d}</span></div>`).join('')}</div></div>` : ''}
      <div class="d-sec"><h3>How to test it</h3><ol class="steps">${p.test.map(x => `<li>${x}</li>`).join('')}</ol></div>
      <div class="d-actions">
        ${p.loc ? `<button class="btn" id="dShow">Show on car</button>` : ''}
        ${fault ? `<button class="btn accent" id="dFault">${Sim.s.faults.has(fault) ? 'Repair this fault' : 'Simulate this fault'}</button>` : ''}
        ${p.body ? `<button class="btn ghost" id="dBody">Open circuit on bench</button>` : ''}
      </div>`;
    $('#drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => Anim.start($('#dAnim'), p));
    $('#dShow')?.addEventListener('click', () => {
      close();
      if (!p.engines.includes(Sim.s.engine)) App.setEngine(p.engines[0]);
      MapView.setKind('all'); $$('#mapFilters .chip[data-kind]').forEach(x => x.classList.toggle('on', x.dataset.kind === 'all'));
      location.hash = 'map'; App.route(); setTimeout(() => MapView.pulse(id), 80);
    });
    $('#dFault')?.addEventListener('click', () => {
      if (Sim.s.faults.has(fault)) Sim.s.faults.delete(fault); else Sim.s.faults.add(fault);
      App.faultsChanged(); close(); location.hash = 'sim'; App.route();
      App.toast(Sim.s.faults.has(fault) ? `Fault active: ${FAULTS[fault].label}. Start the engine and diagnose.` : 'Fault repaired');
    });
    $('#dBody')?.addEventListener('click', () => { close(); location.hash = 'body'; App.route(); Body.select(p.body); });
    $('.drawer-body [data-close]')?.focus();
    update();
  }
  function update() {
    if (!current || $('#drawer').hidden) return;
    const p = PART[current];
    const r = Sim.reading(current);
    const live = $('#dLive');
    if (live) { live.hidden = !r || (Sim.s.key < 2 && !['battery', 'ignsw'].includes(current)); $('b', live).textContent = r; }
    $$('#dContent [data-pv]').forEach(td => {
      const i = +td.dataset.pv; const role = p.pins[i][1];
      const v = Sim.pinVolts(p, role, i);
      td.textContent = role === 'cg' || role === 'sh' ? '0 V' : `${fmtV(v)} V`;
    });
  }
  function close() {
    Anim.stop(); $('#drawer').hidden = true; current = null; document.body.style.overflow = '';
  }
  function init() {
    $$('#drawer [data-close]').forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) close(); });
  }
  return { init, open, close, update };
})();
