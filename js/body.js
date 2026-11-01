/* ECM Lab — body electrics bench: switch panel, top-view car and live circuit diagram */

const Body = (() => {
  const B = {
    light: 0, high: false, fog: false, turn: 0, hazard: false, reverse: false, horn: false,
    wiper: 0, washer: false, win: [1, 1, 1, 1], winT: [1, 1, 1, 1], locked: false, lockPulse: 0,
    doorOpen: false, blower: 0, defog: false, mirror: false, mirrorA: 0,
    flash: 0, flashOn: false, wiperA: 0, wiperDir: 1, intT: 0,
    faults: {}, sel: 'head', sound: true
  };
  const WINS = ['Front L', 'Front R', 'Rear L', 'Rear R'];

  /* ── audio (starts only after a user gesture) ── */
  let ac = null, hornNodes = null;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; }
  function click(freq = 1800, dur = 0.015, vol = 0.08) {
    const a = audio(); if (!a || !B.sound) return;
    const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur + 0.01);
  }
  function hornSound(on) {
    const a = audio(); if (!a) return;
    if (on && !hornNodes && B.sound) {
      const g = a.createGain(); g.gain.value = 0.05; g.connect(a.destination);
      const o1 = a.createOscillator(), o2 = a.createOscillator(); o1.type = o2.type = 'sawtooth';
      o1.frequency.value = 410; o2.frequency.value = 500; o1.connect(g); o2.connect(g); o1.start(); o2.start();
      hornNodes = { g, o: [o1, o2] };
    } else if (!on && hornNodes) { hornNodes.o.forEach(o => o.stop()); hornNodes = null; }
  }

  /* ── electrical model ── */
  const key = () => Sim.s.key;
  function demand(id) {
    switch (id) {
      case 'park': return B.light >= 1;
      case 'head': return B.light === 2 && !B.high;
      case 'high': return B.light === 2 && B.high;
      case 'fog': return B.fog && B.light >= 1;
      case 'turn': return B.hazard || (B.turn !== 0 && key() >= 2);
      case 'brake': return !!Sim.s.brake;
      case 'rev': return B.reverse && key() >= 2;
      case 'horn': return B.horn;
      case 'wiper': return (B.wiper > 0 || B.washer || Math.abs(B.wiperA) > 0.02) && key() >= 1;
      case 'window': return key() >= 2 && B.win.some((w, i) => Math.abs(w - B.winT[i]) > 0.001);
      case 'lock': return B.lockPulse > 0;
      case 'dome': return B.doorOpen;
      case 'blower': return B.blower > 0 && key() >= 2;
      case 'defog': return B.defog && key() >= 2;
      case 'mirror': return B.mirror && key() >= 1;
      case 'ac': return !!Sim.s.ac && Sim.s.running;
      default: return false;
    }
  }
  function needsKey(id) { return { turn: 'ON', rev: 'ON', wiper: 'ACC', window: 'ON', blower: 'ON', defog: 'ON', mirror: 'ACC', ac: 'engine running' }[id]; }

  function state(id) {
    const C = CIRCUITS[id]; const f = B.faults[id];
    const v = Sim.s.vbat;
    const sw = demand(id);
    let lit = sw && f !== 'fuse' && f !== 'relay';
    if (id === 'turn' && lit) lit = B.flashOn;
    let loadFrac = 1, vLoad = lit ? v - 0.15 : 0;
    if (f === 'load') loadFrac = C.loads > 1 ? (C.loads - 1) / C.loads : 0;
    if (f === 'ground' && lit) vLoad = v * 0.55;
    let watts = C.watts * C.loads;
    if (id === 'blower') watts = [0, 50, 90, 150, 220][B.blower];
    if (id === 'turn') watts = 21 * (B.hazard ? 6 : 3);
    const amps = lit ? (watts / v) * (vLoad / v) * loadFrac : 0;
    const bright = lit ? (f === 'ground' ? 0.4 : 1) * (loadFrac > 0 ? 1 : 0) : 0;
    return { sw, lit, amps, vLoad, bright, fault: f };
  }

  /* ── switch panel ── */
  function sw(label, id, on, cls = '') { return `<button class="sw-btn ${cls} ${on ? 'on' : ''}" data-sw="${id}" aria-pressed="${!!on}">${label}</button>`; }
  function renderPanel() {
    const k = key();
    const warn = need => need && ((need === 'ON' && k < 2) || (need === 'ACC' && k < 1)) ? `<em>needs key ${need}</em>` : '';
    $('#switchPanel').innerHTML = `
      <div class="sw-group"><span>Light switch</span><div class="sw-row">
        ${sw('OFF', 'light:0', B.light === 0)}${sw('Parking', 'light:1', B.light === 1)}${sw('Head', 'light:2', B.light === 2)}
        ${sw('High beam', 'high', B.high)}${sw('Fog', 'fog', B.fog)}</div></div>
      <div class="sw-group"><span>Indicators ${warn(B.hazard ? '' : 'ON')}</span><div class="sw-row">
        ${sw('◄ Left', 'turn:-1', B.turn === -1, 'amber')}${sw('Off', 'turn:0', B.turn === 0)}${sw('Right ►', 'turn:1', B.turn === 1, 'amber')}${sw('▲ Hazard', 'hazard', B.hazard, 'amber')}</div></div>
      <div class="sw-group"><span>Driving</span><div class="sw-row">
        ${sw('Brake pedal', 'brake', Sim.s.brake)}${sw('Reverse gear', 'reverse', B.reverse)}<button class="sw-btn" data-hold="horn" aria-label="Horn – press and hold">Horn (hold)</button></div></div>
      <div class="sw-group"><span>Wipers ${warn('ACC')}</span><div class="sw-row">
        ${sw('OFF', 'wiper:0', B.wiper === 0)}${sw('INT', 'wiper:1', B.wiper === 1)}${sw('LO', 'wiper:2', B.wiper === 2)}${sw('HI', 'wiper:3', B.wiper === 3)}<button class="sw-btn" data-hold="washer">Wash (hold)</button></div></div>
      <div class="sw-group"><span>Power windows ${warn('ON')}</span><div class="win-grid">
        ${WINS.map((n, i) => `<div class="win"><div class="glass"><i id="winG${i}" style="height:${B.win[i] * 100}%"></i><b id="winP${i}">${Math.round(B.win[i] * 100)}%</b></div>
          <button class="sw-btn" data-win="${i}">${B.winT[i] > 0.5 ? '▼' : '▲'}</button><span>${n}</span></div>`).join('')}</div></div>
      <div class="sw-group"><span>Doors</span><div class="sw-row">
        ${sw('Lock all', 'lock', B.locked)}${sw('Unlock all', 'unlock', !B.locked)}${sw('Open driver door', 'door', B.doorOpen)}</div></div>
      <div class="sw-group"><span>Climate ${warn('ON')}</span><div class="sw-row">
        ${[0, 1, 2, 3, 4].map(n => sw(n ? `Fan ${n}` : 'Fan off', 'blower:' + n, B.blower === n)).join('')}${sw('Rear defog', 'defog', B.defog)}${sw('A/C', 'ac', Sim.s.ac)}</div></div>
      <div class="sw-group"><span>Mirrors &amp; sound</span><div class="sw-row">
        ${sw('Adjust mirror', 'mirror', B.mirror)}${sw('Sound', 'sound', B.sound)}</div></div>`;
    $$('#switchPanel [data-sw]').forEach(b => b.addEventListener('click', () => toggle(b.dataset.sw)));
    $$('#switchPanel [data-hold]').forEach(b => {
      const id = b.dataset.hold;
      const on = e => { e.preventDefault(); audio(); B[id] = true; b.classList.add('on'); if (id === 'horn') { hornSound(true); select('horn', true); } else select('wiper', true); };
      const off = () => { B[id] = false; b.classList.remove('on'); if (id === 'horn') hornSound(false); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) on(e); });
      b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') off(); });
    });
    $$('#switchPanel [data-win]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.win; B.winT[i] = B.winT[i] > 0.5 ? 0 : 1; click(900, 0.02); select('window', true); renderPanel();
    }));
  }
  function toggle(id) {
    audio();
    const [k, v] = id.split(':');
    let circ = null;
    switch (k) {
      case 'light': B.light = +v; circ = B.light === 2 ? (B.high ? 'high' : 'head') : 'park'; break;
      case 'high': B.high = !B.high; circ = B.high ? 'high' : 'head'; if (B.high && B.light < 2) B.light = 2; break;
      case 'fog': B.fog = !B.fog; circ = 'fog'; break;
      case 'turn': B.turn = +v; circ = 'turn'; break;
      case 'hazard': B.hazard = !B.hazard; circ = 'turn'; break;
      case 'brake': Sim.s.brake = !Sim.s.brake; circ = 'brake'; App.syncDash(); break;
      case 'reverse': B.reverse = !B.reverse; circ = 'rev'; break;
      case 'wiper': B.wiper = +v; circ = 'wiper'; break;
      case 'lock': B.locked = true; B.lockPulse = 0.4; circ = 'lock'; click(500, 0.04, 0.12); break;
      case 'unlock': B.locked = false; B.lockPulse = 0.4; circ = 'lock'; click(500, 0.04, 0.12); break;
      case 'door': B.doorOpen = !B.doorOpen; circ = 'dome'; break;
      case 'blower': B.blower = +v; circ = 'blower'; break;
      case 'defog': B.defog = !B.defog; circ = 'defog'; break;
      case 'ac': Sim.s.ac = !Sim.s.ac; circ = 'ac'; App.syncDash(); if (Sim.s.ac && !Sim.s.running) App.toast('A/C clutch engages only with the engine running'); break;
      case 'mirror': B.mirror = !B.mirror; circ = 'mirror'; break;
      case 'sound': B.sound = !B.sound; if (!B.sound) hornSound(false); break;
    }
    if (circ && CIRCUITS[circ].relay && !['lock'].includes(k)) click(1200, 0.012, 0.06);
    renderPanel();
    if (circ) select(circ, true);
  }

  /* ── top-view car ── */
  function renderCar() {
    const lamp = (id, el) => `<g class="car-lamp" data-lamp="${id}">${el}</g>`;
    $('#topCar').innerHTML = `
      <defs>
        <filter id="lampGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
        <linearGradient id="beamLow" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
        <linearGradient id="beamHigh" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f4fbff" stop-opacity=".95"/><stop offset="1" stop-color="#e9f6ff" stop-opacity="0"/></linearGradient>
      </defs>
      <!-- beams -->
      ${lamp('head', `<path d="M86 128 L118 128 L150 30 L40 30 Z" fill="url(#beamLow)"/><path d="M242 128 L274 128 L320 30 L210 30 Z" fill="url(#beamLow)"/>`)}
      ${lamp('high', `<path d="M84 128 L120 128 L170 0 L10 0 Z" fill="url(#beamHigh)"/><path d="M240 128 L276 128 L350 0 L190 0 Z" fill="url(#beamHigh)"/>`)}
      ${lamp('fog', `<path d="M90 112 L110 112 L150 70 L36 70 Z" fill="url(#beamLow)" opacity=".8"/><path d="M250 112 L270 112 L324 70 L210 70 Z" fill="url(#beamLow)" opacity=".8"/>`)}
      <!-- body -->
      <path d="M104 120 Q180 98 256 120 Q290 132 292 180 L296 640 Q294 700 256 712 Q180 726 104 712 Q66 700 64 640 L68 180 Q70 132 104 120 Z" fill="var(--car)" stroke="var(--car-line)" stroke-width="2.5"/>
      <path d="M120 150 Q180 136 240 150 M150 160 L146 290 M210 160 L214 290" stroke="var(--car-line)" fill="none" opacity=".5"/>
      <rect x="96" y="186" width="40" height="26" rx="3" fill="#1d1f23"/><rect x="100" y="182" width="7" height="5" fill="#d42a24"/><text x="116" y="203" text-anchor="middle" font-size="8" fill="#ccc" font-family="var(--f-mono)">BAT</text>
      <rect x="222" y="186" width="44" height="26" rx="3" fill="#1d1f23"/><text x="244" y="203" text-anchor="middle" font-size="8" fill="#ccc" font-family="var(--f-mono)">FUSE</text>
      <path d="M92 300 Q180 272 268 300 L258 360 Q180 346 102 360 Z" fill="var(--glass)" stroke="var(--car-line)"/>
      <path d="M102 362 Q180 350 258 362 L258 556 Q180 566 102 556 Z" fill="var(--car-2)" stroke="var(--car-line)"/>
      <path d="M102 560 Q180 572 258 560 L270 612 Q180 630 90 612 Z" fill="var(--glass)" stroke="var(--car-line)"/>
      <g id="defogLines">${[0, 1, 2, 3, 4].map(i => `<path d="M${104 - i * 2} ${574 + i * 8} Q180 ${586 + i * 8} ${256 + i * 2} ${574 + i * 8}" stroke="#a75b2a" stroke-width="1.3" fill="none"/>`).join('')}</g>
      <!-- side windows (glass level) -->
      ${[[70, 310, 0], [276, 310, 1], [70, 456, 2], [276, 456, 3]].map(([x, y, i]) => `<rect x="${x}" y="${y}" width="14" height="128" rx="3" fill="none" stroke="var(--car-line)"/><rect id="sideG${i}" x="${x + 2}" y="${y + 2}" width="10" height="124" rx="2" fill="var(--glass)"/>`).join('')}
      <path d="M64 300 H84 M64 450 H84 M64 594 H84 M276 300 H296 M276 450 H296 M276 594 H296" stroke="var(--car-line)" stroke-width="2"/>
      <!-- door locks -->
      ${[[92, 400], [92, 530], [268, 400], [268, 530]].map(([x, y]) => `<circle class="lockpin" cx="${x}" cy="${y}" r="5"/>`).join('')}
      <!-- driver door (opens) -->
      <g id="doorFR"><rect x="292" y="300" width="7" height="150" rx="3" fill="var(--car)" stroke="var(--car-line)" stroke-width="2"/></g>
      <!-- mirrors -->
      <g id="mirL"><path d="M66 300 L44 296 Q38 306 46 314 L66 312 Z" fill="var(--car-2)" stroke="var(--car-line)"/></g>
      <g id="mirR"><path d="M294 300 L316 296 Q322 306 314 314 L294 312 Z" fill="var(--car-2)" stroke="var(--car-line)"/></g>
      <!-- wipers -->
      <g id="wipL"><line x1="128" y1="352" x2="54" y2="352" stroke="#1b1b1d" stroke-width="4" stroke-linecap="round"/></g>
      <g id="wipR"><line x1="206" y1="352" x2="132" y2="352" stroke="#1b1b1d" stroke-width="4" stroke-linecap="round"/></g>
      <circle cx="128" cy="352" r="4" fill="#333"/><circle cx="206" cy="352" r="4" fill="#333"/>
      <!-- dash: blower + A/C -->
      <g transform="translate(150 382)"><circle r="10" fill="var(--panel)" stroke="var(--car-line)"/><g id="blowerFan">${[0, 1, 2, 3].map(i => `<path d="M0 0 Q4 -6 0 -9 Q-3 -5 0 0" fill="var(--ink-2)" transform="rotate(${i * 90})"/>`).join('')}</g></g>
      <text id="acTxt" x="196" y="386" font-family="var(--f-mono)" font-size="10" font-weight="600" fill="var(--ink-2)">A/C</text>
      <!-- dome -->
      ${lamp('dome', `<circle cx="180" cy="452" r="34" fill="#fff3c4" filter="url(#lampGlow)" opacity=".9"/>`)}
      <rect x="168" y="446" width="24" height="12" rx="4" fill="var(--panel)" stroke="var(--car-line)"/>
      <!-- horn -->
      <g transform="translate(180 108)"><circle r="7" fill="#c81e1e"/>${lamp('horn', [1, 2, 3].map(i => `<path d="M${-10 - i * 7} ${-6 - i * 5} Q0 ${-16 - i * 8} ${10 + i * 7} ${-6 - i * 5}" stroke="#facc15" stroke-width="2.5" fill="none"/>`).join(''))}</g>
      <!-- front lamps -->
      <path d="M84 132 L122 126 L120 142 L86 148 Z" fill="url(#gGlass)" stroke="var(--car-line)"/><path d="M238 126 L276 132 L274 148 L240 142 Z" fill="url(#gGlass)" stroke="var(--car-line)"/>
      ${lamp('headgl', `<path d="M84 132 L122 126 L120 142 L86 148 Z M238 126 L276 132 L274 148 L240 142 Z" fill="#fff8d6" filter="url(#lampGlow)"/>`)}
      <circle cx="100" cy="116" r="6" fill="url(#gGlass)" stroke="var(--car-line)"/><circle cx="260" cy="116" r="6" fill="url(#gGlass)" stroke="var(--car-line)"/>
      <!-- indicators -->
      ${['L', 'R'].map(sd => {
        const xs = sd === 'L' ? [[74, 150], [64, 300], [76, 690]] : [[286, 150], [296, 300], [284, 690]];
        return xs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#a26a10"/>`).join('') + lamp('turn' + sd, xs.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="#ffa21a" filter="url(#lampGlow)"/><circle cx="${x}" cy="${y}" r="5" fill="#ffd27a"/>`).join(''));
      }).join('')}
      <!-- rear lamps -->
      <path d="M78 692 L118 702 L116 714 L84 708 Z M242 702 L282 692 L276 708 L244 714 Z" fill="#7a1010"/>
      ${lamp('park', `<path d="M78 692 L118 702 L116 714 L84 708 Z M242 702 L282 692 L276 708 L244 714 Z" fill="#ff3b30" opacity=".75"/>`)}
      ${lamp('brake', `<path d="M78 692 L118 702 L116 714 L84 708 Z M242 702 L282 692 L276 708 L244 714 Z" fill="#ff2a1a" filter="url(#lampGlow)"/><path d="M78 692 L118 702 L116 714 L84 708 Z M242 702 L282 692 L276 708 L244 714 Z" fill="#ff5a4a"/><rect x="160" y="614" width="40" height="5" rx="2" fill="#ff2a1a"/>`)}
      <rect x="160" y="614" width="40" height="5" rx="2" fill="#7a1010" opacity=".5"/>
      ${lamp('rev', `<rect x="122" y="704" width="18" height="8" rx="2" fill="#fff" filter="url(#lampGlow)"/><rect x="220" y="704" width="18" height="8" rx="2" fill="#fff" filter="url(#lampGlow)"/><rect x="122" y="704" width="18" height="8" rx="2" fill="#fff"/><rect x="220" y="704" width="18" height="8" rx="2" fill="#fff"/>`)}
      ${lamp('parkF', `<circle cx="100" cy="116" r="6" fill="#fff3c4"/><circle cx="260" cy="116" r="6" fill="#fff3c4"/>`)}
      ${lamp('fogF', `<circle cx="100" cy="116" r="12" fill="#fff8d6" filter="url(#lampGlow)"/><circle cx="260" cy="116" r="12" fill="#fff8d6" filter="url(#lampGlow)"/>`)}
      <text x="180" y="770" text-anchor="middle" font-family="var(--f-mono)" font-size="11" fill="var(--ink-2)">TOP VIEW · FRONT ▲</text>
      <text id="lockTxt" x="180" y="796" text-anchor="middle" font-family="var(--f-mono)" font-size="11" font-weight="600" fill="var(--ink-2)"></text>`;
  }

  function updateCar() {
    const show = (id, op) => { $$(`#topCar [data-lamp="${id}"]`).forEach(g => g.style.opacity = op); };
    const st = id => state(id);
    const park = st('park'), head = st('head'), high = st('high'), fog = st('fog'), turn = st('turn'), brake = st('brake'), rev = st('rev');
    show('park', park.bright); show('parkF', park.bright);
    show('head', head.bright); show('headgl', Math.max(head.bright, high.bright)); show('high', high.bright);
    show('fog', fog.bright); show('fogF', fog.bright);
    const tOn = turn.bright;
    show('turnL', (B.hazard || B.turn === -1) ? tOn : 0); show('turnR', (B.hazard || B.turn === 1) ? tOn : 0);
    show('brake', brake.bright); show('rev', rev.bright);
    show('dome', st('dome').bright);
    show('horn', st('horn').lit ? (Math.sin(performance.now() / 40) > 0 ? 1 : 0.4) : 0);
    $$('#defogLines path').forEach(p => p.setAttribute('stroke', st('defog').lit ? '#ff8a2a' : '#a75b2a'));
    $('#acTxt').setAttribute('fill', st('ac').lit ? 'var(--signal)' : 'var(--ink-2)');
    const fan = $('#blowerFan'); if (fan) { fan.classList.toggle('spin', st('blower').lit); fan.classList.toggle('slow', B.blower < 3); }
    $$('#topCar .lockpin').forEach(c => { c.setAttribute('fill', B.locked ? 'var(--car-line)' : 'var(--bad)'); c.setAttribute('r', B.locked ? 4 : 6); });
    $('#lockTxt').textContent = B.locked ? 'DOORS LOCKED' : 'DOORS UNLOCKED';
    $('#doorFR').setAttribute('transform', B.doorOpen ? 'rotate(-24 296 300)' : '');
    const wa = B.wiperA * 120;
    $('#wipL').setAttribute('transform', `rotate(${wa} 128 352)`); $('#wipR').setAttribute('transform', `rotate(${wa} 206 352)`);
    const m = B.mirror ? Math.sin(B.mirrorA) * 10 : 0;
    $('#mirL').setAttribute('transform', `rotate(${m} 66 306)`); $('#mirR').setAttribute('transform', `rotate(${-m} 294 306)`);
    B.win.forEach((w, i) => {
      const g = $('#sideG' + i); if (g) { g.setAttribute('height', 124 * w); }
      const pg = $('#winG' + i); if (pg) pg.style.height = w * 100 + '%';
      const pp = $('#winP' + i); if (pp) pp.textContent = Math.round(w * 100) + '%';
    });
  }

  /* ── circuit diagram ── */
  function renderCircuit() {
    const id = B.sel, C = CIRCUITS[id], st = state(id), f = st.fault;
    const P = PART[C.part];
    $('#circTitle').textContent = C.name;
    const wire = (d, code, flow) => `${wireStrokes(code, d, 5)}${flow ? `<path class="flow" d="${d}"/>` : ''}`;
    const on = st.lit || (id === 'turn' && st.sw && f !== 'fuse' && f !== 'relay');
    const flowMain = st.amps > 0;
    const coilOn = st.sw && f !== 'fuse';
    const relay = !!C.relay;
    const fuseCol = FUSE_COLOR[C.fuse[2]] || '#d42a24';
    const gnd = (x, y, bad) => `<g stroke="${bad ? 'var(--bad)' : 'var(--ink)'}" stroke-width="2.2" fill="none">${bad ? `<path d="M${x} ${y} l5 4 l-10 6 l10 6 l-10 6 l5 4"/>` : `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 26}"/>`}<line x1="${x - 12}" y1="${y + 26}" x2="${x + 12}" y2="${y + 26}"/><line x1="${x - 8}" y1="${y + 31}" x2="${x + 8}" y2="${y + 31}"/><line x1="${x - 4}" y1="${y + 36}" x2="${x + 4}" y2="${y + 36}"/></g>`;
    const n = Math.min(C.loads, 4);
    const loadYs = [...Array(n)].map((_, i) => 60 + (i - (n - 1) / 2) * 34 + (n > 1 ? 20 : 0));
    const loadSym = (x, y) => {
      const lamp = ['taillamp', 'headlamp', 'foglamp', 'indicator', 'brakelamp', 'reverselamp', 'dome'].includes(C.part);
      const col = C.part === 'indicator' ? '#ffa21a' : ['taillamp', 'brakelamp'].includes(C.part) ? '#ff3b30' : '#fff2b0';
      const brokenLoad = f === 'load' && (C.loads === 1 || y === loadYs[0]);
      if (lamp) return `<circle cx="${x}" cy="${y}" r="13" fill="${st.bright && !brokenLoad ? col : 'var(--panel)'}" stroke="var(--ink)" stroke-width="2" ${st.bright && !brokenLoad ? 'filter="url(#cGlow)"' : ''}/>
        <path d="M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}" stroke="${brokenLoad ? 'var(--bad)' : 'var(--ink)'}" stroke-width="2"/>`;
      return `<circle cx="${x}" cy="${y}" r="15" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="lbl-b" style="font-size:14px">M</text>
        ${brokenLoad ? `<path d="M${x - 10} ${y - 10} L${x + 10} ${y + 10}" stroke="var(--bad)" stroke-width="3"/>` : ''}`;
    };
    const xF = 190, xR1 = 300, xR2 = 400, xL1 = 470, xL = 540, xL2 = 610, yM = 60;
    let svg = `<defs><filter id="cGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    // battery
    svg += `<svg x="10" y="22" width="100" height="76" viewBox="0 0 160 120">${DRAW.battery()}</svg><text class="lbl" x="60" y="114" text-anchor="middle">BATTERY ${Sim.s.vbat.toFixed(1)} V</text>`;
    svg += wire(`M106 ${yM} H${xF - 22}`, 'R', flowMain || coilOn);
    // fuse
    svg += `<rect x="${xF - 22}" y="${yM - 12}" width="44" height="24" rx="4" fill="${fuseCol}" stroke="#000" stroke-opacity=".4"/>
      <path d="M${xF - 12} ${yM} h7 l3 -5 l4 10 l3 -5 h7" stroke="${f === 'fuse' ? 'var(--bad)' : '#fff'}" stroke-width="2" fill="none" ${f === 'fuse' ? 'stroke-dasharray="4 5"' : ''}/>
      <text class="lbl-b" x="${xF}" y="${yM - 20}" text-anchor="middle">${C.fuse[0]} · ${C.fuse[1]}</text>
      ${f === 'fuse' ? `<text class="lbl" x="${xF}" y="${yM + 30}" text-anchor="middle" fill="var(--bad)" style="fill:var(--bad)">BLOWN</text>` : ''}`;
    if (relay) {
      svg += wire(`M${xF + 22} ${yM} H${xR1}`, C.wire, flowMain);
      // relay box
      svg += `<rect x="${xR1 - 10}" y="22" width="${xR2 - xR1 + 20}" height="216" rx="8" fill="none" stroke="var(--ink-2)" stroke-dasharray="5 4"/>
        <text class="lbl-b" x="${(xR1 + xR2) / 2}" y="16" text-anchor="middle">${C.relay}</text>
        <circle cx="${xR1}" cy="${yM}" r="4" fill="var(--ink)"/><circle cx="${xR2}" cy="${yM}" r="4" fill="var(--ink)"/>
        <line x1="${xR1}" y1="${yM}" x2="${xR2 - 8}" y2="${coilOn && f !== 'relay' ? yM : yM - 26}" stroke="var(--ink)" stroke-width="3"/>
        <text class="lbl" x="${xR1}" y="${yM + 20}" text-anchor="middle">30</text><text class="lbl" x="${xR2}" y="${yM + 20}" text-anchor="middle">87</text>
        <rect x="${(xR1 + xR2) / 2 - 22}" y="186" width="44" height="30" fill="${coilOn ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'none'}" stroke="var(--ink)" stroke-width="2"/>
        <path d="M${(xR1 + xR2) / 2 - 22} 186 l44 30" stroke="var(--ink)" stroke-width="1.5"/>
        <line x1="${(xR1 + xR2) / 2}" y1="186" x2="${(xR1 + xR2) / 2}" y2="${yM + 2}" stroke="var(--ink-2)" stroke-dasharray="3 4"/>
        <text class="lbl" x="${xR1 - 2}" y="230">86</text><text class="lbl" x="${xR2 - 12}" y="230">85</text>
        ${f === 'relay' ? `<text class="lbl" x="${(xR1 + xR2) / 2}" y="${yM + 44}" text-anchor="middle" style="fill:var(--bad)">CONTACTS FAILED</text>` : ''}`;
      // coil control circuit
      svg += wire(`M240 ${yM} V201 H${(xR1 + xR2) / 2 - 22}`, 'G-R', coilOn);
      svg += wire(`M${(xR1 + xR2) / 2 + 22} 201 H460`, 'G-B', coilOn);
      svg += `<circle cx="240" cy="${yM}" r="3.5" fill="var(--ink)"/>
        <circle cx="460" cy="201" r="4" fill="var(--ink)"/><line x1="460" y1="201" x2="500" y2="${st.sw ? 201 : 184}" stroke="var(--ink)" stroke-width="3"/><circle cx="504" cy="201" r="4" fill="var(--ink)"/>
        <text class="lbl" x="482" y="236" text-anchor="middle">${C.sw}</text>`;
      svg += wire('M504 201 H560', 'B', coilOn) + gnd(560, 201, false);
      svg += wire(`M${xR2} ${yM} H${xL1}`, C.wire, flowMain);
    } else {
      svg += wire(`M${xF + 22} ${yM} H${xR1}`, C.wire, flowMain);
      svg += `<circle cx="${xR1}" cy="${yM}" r="4" fill="var(--ink)"/><line x1="${xR1}" y1="${yM}" x2="${xR2 - 8}" y2="${st.sw ? yM : yM - 26}" stroke="var(--ink)" stroke-width="3"/><circle cx="${xR2}" cy="${yM}" r="4" fill="var(--ink)"/>
        <text class="lbl-b" x="${(xR1 + xR2) / 2}" y="${yM + 34}" text-anchor="middle">SWITCH</text><text class="lbl" x="${(xR1 + xR2) / 2}" y="${yM + 50}" text-anchor="middle">${C.sw}</text>`;
      svg += wire(`M${xR2} ${yM} H${xL1}`, C.wire, flowMain);
    }
    // loads in parallel
    const yTop = loadYs[0], yBot = loadYs[loadYs.length - 1];
    if (n > 1) svg += wire(`M${xL1} ${yTop} V${yBot}`, C.wire, false) + wire(`M${xL2} ${yTop} V${yBot}`, 'B', false);
    if (n > 1 && loadYs[0] !== yM) svg += wire(`M${xL1} ${yM} V${yTop}`, C.wire, false);
    loadYs.forEach(y => { svg += wire(`M${xL1} ${y} H${xL - 16}`, C.wire, flowMain) + wire(`M${xL + 16} ${y} H${xL2}`, 'B', flowMain) + loadSym(xL, y); });
    svg += `<text class="lbl-b" x="${xL}" y="${Math.max(yBot, yM) + 38}" text-anchor="middle">${P.short} × ${C.loads}</text>`;
    svg += wire(`M${xL2} ${yM} H680 V${Math.max(yBot, yM) + 20}`, 'B', flowMain) + gnd(680, Math.max(yBot, yM) + 20, f === 'ground');
    if (f === 'ground') svg += `<text class="lbl" x="700" y="${Math.max(yBot, yM) + 30}" style="fill:var(--bad)">corroded</text>`;
    svg += `<text class="lbl" x="${xL1 + 4}" y="${yM - 10}">${st.vLoad.toFixed(1)} V</text>`;
    $('#circuit').innerHTML = svg;
    // info
    const need = needsKey(id);
    let note = '';
    if (!st.sw) note = need && ((need === 'ON' && key() < 2) || (need === 'ACC' && key() < 1)) ? `This circuit is fed from the ignition. Turn the key to ${need} and operate the switch.` : need === 'engine running' && !Sim.s.running ? 'The ECM only energises the A/C relay with the engine running.' : 'Switch is open: no current flows.';
    else if (f === 'fuse') note = 'Fuse blown: 0 V after the fuse. Find the short to ground before fitting a new fuse.';
    else if (f === 'relay') note = 'Relay coil clicks but the contacts do not close: 12 V on pin 30, 0 V on pin 87.';
    else if (f === 'load') note = C.loads > 1 ? (id === 'turn' ? 'One bulb open: current drops and the flasher hyper-flashes.' : 'One bulb open: that lamp is dark, the others still work.') : 'Load open-circuit: full 12 V at the connector but no current.';
    else if (f === 'ground') note = `High-resistance ground: only ${st.vLoad.toFixed(1)} V across the load, so it works weakly. Voltage-drop test the ground.`;
    else note = 'Circuit working normally.';
    $('#circInfo').innerHTML = `
      <div><span>Fuse</span><b>${C.fuse[0]} ${C.fuse[1]}</b></div>
      <div><span>Control</span><b>${C.relay || 'Direct switch'}</b></div>
      <div><span>Voltage at load</span><b>${st.vLoad.toFixed(1)} V</b></div>
      <div><span>Current</span><b>${st.amps.toFixed(1)} A</b></div>
      <div class="circ-note">${note}</div>`;
    const faults = [['', 'No fault'], ['fuse', 'Blow fuse'], ['relay', C.relay ? 'Fail relay' : null], ['load', C.loads > 1 ? 'Blow one bulb' : 'Open load'], ['ground', 'Bad ground']].filter(x => x[1]);
    $('#bodyFaults').innerHTML = '<span class="ctl-label">Fault</span>' + faults.map(([k, l]) => `<button class="chip ${(f || '') === k ? 'on' : ''}" data-bf="${k}">${l}</button>`).join('') +
      `<button class="chip" id="bodyPart">Part details</button>`;
    $$('#bodyFaults [data-bf]').forEach(b => b.addEventListener('click', () => { if (b.dataset.bf) B.faults[id] = b.dataset.bf; else delete B.faults[id]; renderCircuit(); }));
    $('#bodyPart').addEventListener('click', () => Drawer.open(C.part));
  }

  function select(id, fromSwitch) {
    B.sel = id; const s = $('#circSel'); if (s) s.value = id; renderCircuit();
  }

  let slowT = 0, lastFlash = false;
  function step(dt) {
    // flasher
    const turnOn = demand('turn') && B.faults.turn !== 'fuse' && B.faults.turn !== 'relay';
    const rate = B.faults.turn === 'load' ? 3.0 : 1.5;
    if (turnOn) { B.flash += dt * rate; B.flashOn = (B.flash % 1) < 0.5; } else { B.flash = 0; B.flashOn = false; }
    if (B.flashOn !== lastFlash && turnOn) click(B.flashOn ? 2200 : 1600, 0.012, 0.07);
    lastFlash = B.flashOn;
    // wipers
    const wiperPow = key() >= 1 && B.faults.wiper !== 'fuse' && B.faults.wiper !== 'relay' && B.faults.wiper !== 'load';
    const speed = B.washer ? 1.4 : [0, 1.0, 1.0, 1.8][B.wiper];
    if (wiperPow && (B.wiper > 0 || B.washer || B.wiperA > 0.01)) {
      if (B.wiper === 1 && !B.washer && B.wiperA <= 0.01 && B.wiperDir === 1) { B.intT += dt; if (B.intT < 3) { B.wiperA = 0; } else B.intT = 0; }
      if (!(B.wiper === 1 && B.intT > 0 && B.intT < 3) || B.washer) {
        const sp = (speed || 1) * (B.faults.wiper === 'ground' ? 0.5 : 1);
        B.wiperA += B.wiperDir * dt * sp;
        if (B.wiperA >= 1) { B.wiperA = 1; B.wiperDir = -1; }
        if (B.wiperA <= 0) { B.wiperA = 0; B.wiperDir = 1; }
        if (B.wiper === 0 && !B.washer && B.wiperDir === 1) B.wiperA = 0; // parked
      }
    }
    // windows
    const winPow = key() >= 2 && !['fuse', 'relay', 'load'].includes(B.faults.window);
    B.win.forEach((w, i) => {
      if (!winPow) return;
      const sp = 0.3 * (B.faults.window === 'ground' ? 0.4 : 1) * dt;
      if (w < B.winT[i]) B.win[i] = Math.min(B.winT[i], w + sp); else if (w > B.winT[i]) B.win[i] = Math.max(B.winT[i], w - sp);
    });
    if (B.lockPulse > 0) B.lockPulse = Math.max(0, B.lockPulse - dt);
    B.mirrorA += dt * 2;
    // total current
    let total = 0; Object.keys(CIRCUITS).forEach(id => total += state(id).amps);
    B.total = total;
    slowT += dt;
  }

  function frame() {
    updateCar();
    $('#ampVal').textContent = `${(B.total || 0).toFixed(1)} A`;
    if (slowT > 0.15) { slowT = 0; renderCircuit(); }
  }

  function init() {
    $('#circSel').innerHTML = Object.entries(CIRCUITS).map(([k, c]) => `<option value="${k}">${c.name}</option>`).join('');
    $('#circSel').addEventListener('change', e => select(e.target.value));
    renderPanel(); renderCar(); select('head');
  }
  return { init, step, frame, select, renderPanel, B, current: () => B.total || 0 };
})();
