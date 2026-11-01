/* ECM Lab — engine & ECM simulation model.
   A simplified but physically sensible model: values move toward targets with time constants,
   and every sensor value is converted to the voltage the ECM would actually see on its pin. */

const Sim = (() => {
  const s = {
    engine: 'petrol',
    key: 0,             // 0 OFF, 1 ACC, 2 ON, 3 START
    running: false, cranking: false, crankT: 0,
    rpm: 0, pedal: 0, tp: 0,
    ect: 24, iat: 28, ambient: 24,
    vbat: 12.6, gear: 'N', speed: 0, ac: false,
    map: 100, maf: 0, o2: 0.45, o2d: 0.45, o2Phase: 0, stft: 0, ltft: 1.6,
    pw: 0, adv: 0, dwell: 0, knockRetard: 0,
    pumpOn: false, primeT: 0, fan: false, mil: false, milFlash: false,
    closedLoop: false, limp: false, misfire: 0,
    // diesel
    rail: 0, railTarget: 0, boost: 100, egr: 0, vgt: 0, qty: 0, glowT: 0, glowOn: false, afterGlow: 0,
    soot: 38, egt: 24, scv: 0,
    theta: 0,           // crank angle (deg, 0–720)
    faults: new Set(),
    dtcs: new Map(),    // code → {desc, status}
    history: { o2: [], tps: [], app: [], map: [], maf: [], rpm: [], rail: [] },
    histT: 0, t: 0,
    msg: ''
  };

  const isP = () => s.engine === 'petrol';
  const has = f => s.faults.has(f);
  const approach = (cur, target, rate, dt) => cur + (target - cur) * Math.min(1, rate * dt);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // NTC thermistor: temperature → resistance (Ω), β model, R25 = 2.2 kΩ-ish
  const ntcR = t => 2400 * Math.exp(3500 * (1 / (t + 273.15) - 1 / 293.15));
  const ntcV = t => 5 * ntcR(t) / (ntcR(t) + 2490);

  function setDTC(code, desc) { if (!s.dtcs.has(code)) s.dtcs.set(code, { desc, status: 'Active' }); }

  function evaluateFaultCodes() {
    if (s.key < 2) return;
    s.faults.forEach(f => {
      const F = FAULTS[f];
      if (!F || !F.engines.includes(s.engine)) return;
      setDTC(F.dtc, F.label);
      if (f === 'inj1_open' && s.running) setDTC('P0301', 'Cylinder 1 misfire detected');
      if (f === 'coil2_open' && s.running) setDTC('P0302', 'Cylinder 2 misfire detected');
    });
    if (s.engine === 'diesel' && s.soot > 85 && !has('dpf_block')) setDTC('P2463', 'DPF soot accumulation');
  }

  function step(dt) {
    s.t += dt;
    const P = isP();
    const ign = s.key >= 2;

    // ── battery voltage
    const vTarget = s.cranking ? (P ? 10.4 : 9.9) : s.running ? 14.2 : (s.key >= 2 ? 12.3 : 12.6);
    s.vbat = approach(s.vbat, vTarget, 4, dt);

    // ── START handling (spring-return key)
    if (s.key === 3) {
      if (!s.running) { s.cranking = true; s.crankT += dt; }
      const needSync = has('ckp_open') ? Infinity : has('cmp_open') ? 2.6 : 0.9;
      let needFuel = has('fpump_relay') ? Infinity : 0;
      let coldPenalty = 0;
      if (!P) {
        if (has('scv_open') || has('rps_open')) coldPenalty += 1.2;
        if (s.ect < 30 && has('glow_open')) coldPenalty += 1.5;
        if (s.ect < 30 && s.glowT > 0.5) coldPenalty += 2.5; // started before glow finished
      }
      if (!s.running && s.crankT > Math.max(needSync, needFuel) + coldPenalty) {
        s.running = true; s.cranking = false; s.key = 2; s.crankT = 0;
        s.afterGlow = !P && s.ect < 60 ? 40 : 0;
        s.msg = 'Engine started';
      } else if (s.crankT > 4.5) {
        s.cranking = false; s.key = 2; s.crankT = 0;
        s.msg = has('ckp_open') ? 'Cranks, no start: ECM sees no crank signal (no RPM).'
          : has('fpump_relay') ? 'Cranks, no start: no fuel pump run signal.'
            : 'Engine did not start — try again';
      }
    } else { s.cranking = false; s.crankT = 0; }

    if (!ign) { s.running = false; }
    if (s.running && has('ckp_open')) { s.running = false; s.msg = 'Engine stalled: crank signal lost (P0335).'; }
    if (s.running && has('fpump_relay')) { s.running = false; s.msg = 'Engine stalled: fuel pump stopped.'; }

    // ── limp modes
    s.limp = (P && (has('tps_open') || has('etb_fault') || has('app_open'))) ||
      (!P && (has('rps_open') || has('scv_open') || has('boost_open') || has('app_open') || has('dpf_block') || has('vgt_open')));

    // ── throttle / pedal
    let pedal = has('app_open') ? 0 : s.pedal;
    if (P) {
      const etbOK = !(has('tps_open') || has('etb_fault'));
      const idleAir = s.running ? 2.5 + Math.max(0, (40 - s.ect) * 0.04) + (s.ac ? 0.8 : 0) : 0;
      s.tp = approach(s.tp, ign ? (etbOK ? clamp(idleAir + pedal * 0.97, 0, 100) : 7) : 0, 10, dt);
    } else {
      s.tp = approach(s.tp, ign ? pedal : 0, 10, dt);
    }

    // ── RPM
    const idle = P ? (s.ect < 40 ? 1150 : s.ect < 70 ? 950 : 760) + (s.ac ? 80 : 0)
      : (s.ect < 40 ? 950 : 800) + (s.ac ? 60 : 0);
    const maxR = P ? 6400 : 4500;
    let target = 0;
    if (s.running) {
      const demand = P ? s.tp / 100 : s.tp / 100;
      target = idle + demand * (maxR - idle) * (s.gear === 'D' ? 0.72 : 1);
      if (s.limp) target = Math.min(target, P ? (has('app_open') ? 1300 : 1600) : 2400);
      if (P && has('knock_open')) target *= 0.94;
      if (!P && has('egr_stuck')) target *= 0.85;
      if (has('maf_open') && !P) target = Math.min(target, 3000);
    } else if (s.cranking) target = P ? 240 : 210;
    s.rpm = approach(s.rpm, target, s.running ? 2.6 : s.cranking ? 6 : 1.8, dt);
    if (s.rpm < 5) s.rpm = 0;

    // misfire roughness
    s.misfire = s.running ? ((has('inj1_open') ? 1 : 0) + (P && has('coil2_open') ? 1 : 0)) : 0;
    const rough = s.misfire ? Math.sin(s.t * 31) * 45 * s.misfire + (Math.random() - .5) * 40 * s.misfire : 0;
    const rpm = Math.max(0, s.rpm + rough);
    s.rpmShown = rpm;

    // crank angle
    s.theta = (s.theta + rpm / 60 * 720 * dt * 0.5) % 720;

    // ── vehicle speed
    const vTarget2 = s.gear === 'D' && s.running ? clamp((rpm - 900) * 0.042, 0, 220) : 0;
    s.speed = approach(s.speed, vTarget2, 0.35, dt);
    if (s.speed < 0.3) s.speed = 0;

    // ── temperatures
    if (s.running) {
      const heat = 0.55 + rpm / 3000;
      s.ect = approach(s.ect, s.fan ? 92 : 97, 0.006 * heat, dt * 10);
    } else s.ect = approach(s.ect, s.ambient, 0.0008, dt * 10);
    s.iat = approach(s.iat, s.running ? s.ambient + 8 + (P ? 0 : (s.boost - 100) * 0.12) : s.ambient + 4, 0.02, dt);

    // ── fuel pump (prime 2 s at key ON)
    if (s.key >= 2 && s.primeT < 2 && !s.running) s.primeT += dt;
    if (s.key < 2) s.primeT = 0;
    s.pumpOn = !has('fpump_relay') && ign && (s.running || s.cranking || s.primeT < 2);

    // ── air: MAP / MAF
    if (P) {
      const vac = s.running || s.cranking ? 100 - (100 - 28) * Math.pow(1 - s.tp / 100, 2.4) * clamp(rpm / 700, 0, 1) : 100;
      s.map = approach(s.map, vac, 6, dt);
      s.maf = approach(s.maf, s.running || s.cranking ? rpm * 1.6 / 120 * (s.map / 100) * 1.18 * 0.95 : 0, 6, dt);
    } else {
      const boostT = s.running ? 100 + clamp((rpm - 1400) / 1600, 0, 1) * (s.tp / 100) * (has('vgt_open') || has('boost_open') ? 30 : 130) : 100;
      s.boost = approach(s.boost, boostT, 1.8, dt);
      s.map = s.boost;
      const egrFrac = s.egr / 100 * 0.35;
      s.maf = approach(s.maf, s.running || s.cranking ? rpm * 1.5 / 120 * (s.boost / 100) * 1.2 * (1 - egrFrac) : 0, 4, dt);
    }

    // ── petrol fuel & ignition
    if (P) {
      s.closedLoop = s.running && s.ect > 45 && !has('o2_open') && s.tp < 85;
      const coldEnrich = 1 + Math.max(0, (70 - (has('ect_open') ? -40 : s.ect)) * 0.012);
      const load = has('map_open') ? 0.45 : s.map / 100;
      s.pw = s.running || s.cranking ? (s.cranking ? 6.5 : 1.15 + load * 8.6 * coldEnrich * (1 + (s.stft + s.ltft) / 100)) : 0;
      s.o2Phase += dt * (0.8 + rpm / 2500);
      if (s.closedLoop) {
        s.o2 = 0.47 + 0.4 * Math.tanh(Math.sin(s.o2Phase * Math.PI) * 3);
        s.stft = Math.sin(s.o2Phase * Math.PI - 1.2) * 4.5;
      } else {
        s.o2 = has('o2_open') ? 0.45 : s.running ? (s.ect < 45 ? 0.82 : 0.75) : approach(s.o2, 0.05, 0.2, dt);
        s.stft = 0;
      }
      s.o2d = s.running && s.ect > 45 ? 0.66 + Math.sin(s.t * 0.6) * 0.03 : approach(s.o2d, 0.05, 0.1, dt);
      s.knockRetard = has('knock_open') ? 6 : (s.tp > 80 && rpm < 2500 ? 2 * Math.abs(Math.sin(s.t * 3)) : 0);
      s.adv = s.running ? clamp(10 + rpm / 6400 * 26 - (s.map / 100) * 8 - s.knockRetard, 2, 40) : s.cranking ? 5 : 0;
      s.dwell = s.running || s.cranking ? clamp(3.2 - (s.vbat - 12) * 0.35, 1.8, 4.5) : 0;
    } else {
      // ── diesel fuel system
      s.qty = s.running ? clamp(6 + s.tp * 0.5 * (s.limp ? 0.5 : 1), 4, 55) : s.cranking ? 30 : 0;
      s.railTarget = s.running ? 280 + rpm / 4500 * 900 + s.tp * 6 : s.cranking ? 300 : 0;
      if (s.limp) s.railTarget = Math.min(s.railTarget, 700);
      let railGoal = s.railTarget;
      if (has('scv_open') && (s.running || s.cranking)) railGoal = 1100; // pump on full delivery, PRV caps it
      s.rail = approach(s.rail, s.pumpOn || s.running || s.cranking ? railGoal : 0, s.running ? 3 : 1.5, dt);
      s.scv = s.running ? clamp(48 - (s.railTarget - 300) / 40, 8, 60) : 0;
      s.egr = has('egr_stuck') ? 85 : s.running && s.ect > 40 && s.tp < 40 && !has('maf_open') ? 42 - s.tp : 0;
      s.vgt = s.running ? clamp(78 - (rpm - 1500) / 60, 30, 85) : 0;
      // glow plug control
      if (s.key >= 2 && !s.running && s.glowT === 0 && s.ect < 60 && !s._glowDone) {
        s.glowT = clamp((60 - (has('ect_open') ? -40 : s.ect)) * 0.12, 1, 10); s._glowDone = true;
      }
      if (s.key < 2) { s._glowDone = false; s.glowT = 0; s.afterGlow = 0; }
      if (s.glowT > 0) s.glowT = Math.max(0, s.glowT - dt);
      if (s.afterGlow > 0 && s.running) s.afterGlow = Math.max(0, s.afterGlow - dt);
      s.glowOn = s.glowT > 0 || (s.afterGlow > 0 && s.running);
      s.egt = approach(s.egt, s.running ? 140 + s.qty * 9 + (s.limp ? 0 : 0) : s.ambient, 0.4, dt);
      if (s.running) s.soot = clamp(s.soot + dt * 0.02 * (1 + s.qty / 20), 0, 100);
    }

    // ── cooling fan
    s.fan = ign && (s.ect > 98 || (s.fan && s.ect > 93) || s.ac || has('ect_open'));

    // ── fault codes & MIL
    evaluateFaultCodes();
    const active = [...s.dtcs.keys()].length > 0;
    s.milFlash = s.running && P && has('coil2_open');
    s.mil = ign && (!s.running || active);

    // ── trend history (10 s at ~20 Hz)
    s.histT += dt;
    if (s.histT > 0.05) {
      s.histT = 0;
      const h = s.history;
      h.o2.push(s.o2); h.tps.push(sig('tps')); h.map.push(sig(P ? 'map' : 'boost')); h.maf.push(sig('maf'));
      h.rpm.push(rpm); h.rail.push(sig('rps')); h.app.push(sig('app'));
      for (const k of Object.keys(h)) if (h[k].length > 220) h[k].shift();
    }
  }

  /* Voltage the ECM sees on a sensor's main signal pin */
  function sig(id) {
    const P = isP();
    const ign = s.key >= 2;
    if (!ign && !['oilp', 'brksw'].includes(id)) return 0;
    switch (id) {
      case 'ckp': return has('ckp_open') ? 0 : s.rpm > 0 ? clamp(s.rpm / 300, 0.3, 18) : 0; // AC peak
      case 'cmp': return has('cmp_open') ? 0 : s.rpm > 0 ? 2.5 : 0.1;                       // average of square
      case 'maf': return has('maf_open') ? 0 : clamp(1.0 + Math.log10(1 + s.maf) * 1.45, 0.98, 4.8);
      case 'map': return has('map_open') ? 0 : clamp(0.2 + s.map / 105 * 4.3, 0.2, 4.8);
      case 'boost': return has('boost_open') ? 0 : clamp(0.5 + (s.boost - 20) / 230 * 4, 0.5, 4.6);
      case 'iat': return has('iat_short') ? 0.05 : ntcV(s.iat);
      case 'ect': return has('ect_open') ? 4.95 : ntcV(s.ect);
      case 'tps': return has('tps_open') ? 0 : 0.5 + s.tp / 100 * 4.0;
      case 'app': return has('app_open') ? 0 : 0.8 + s.pedal / 100 * 3.4;
      case 'o2up': return has('o2_open') ? 0.45 : s.o2;
      case 'o2down': return s.o2d;
      case 'knock': return has('knock_open') ? 0 : s.running ? 0.05 + (s.knockRetard > 0 ? 0.4 : 0.1) * Math.random() : 0;
      case 'vss': return has('vss_open') ? 0 : s.speed > 0 ? 2.5 : 0;
      case 'rps': return has('rps_open') ? 0 : 0.5 + s.rail / 2000 * 4;
      case 'fts': return ntcV(s.ambient + (s.running ? (s.ect - s.ambient) * 0.6 : 0));
      case 'egt': return clamp(0.8 + s.egt / 900 * 3.6, 0.5, 4.5);
      case 'dpfp': return 0.5 + (s.maf / 160) * (s.soot / 100) * 3.5 * (has('dpf_block') ? 2 : 1);
      case 'oilp': return s.running ? 12 : 0;      // switch open when pressure present
      case 'brksw': return s.brake ? 12 : 0;
      default: return 0;
    }
  }

  /* Human-readable value for a part (used on map / wiring / live data) */
  function reading(id) {
    const P = isP();
    const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
    switch (id) {
      case 'ckp': return has('ckp_open') ? '0 rpm (no signal)' : `${Math.round(s.rpmShown || 0)} rpm`;
      case 'cmp': return has('cmp_open') ? 'No sync' : s.rpm > 0 ? 'Synced' : 'Stopped';
      case 'maf': return has('maf_open') ? '— (fault)' : `${f1(s.maf)} g/s`;
      case 'map': return has('map_open') ? '— (fault)' : `${Math.round(s.map)} kPa`;
      case 'boost': return has('boost_open') ? '— (fault)' : `${Math.round(s.boost)} kPa abs`;
      case 'iat': return has('iat_short') ? '140 °C (fault)' : `${Math.round(s.iat)} °C`;
      case 'ect': return has('ect_open') ? '−40 °C (fault)' : `${Math.round(s.ect)} °C`;
      case 'tps': return has('tps_open') ? '— (fault)' : `${f1(s.tp)} %`;
      case 'app': return has('app_open') ? '— (fault)' : `${Math.round(s.pedal)} %`;
      case 'o2up': return `${f2(sig('o2up'))} V ${s.closedLoop ? (s.o2 > 0.5 ? 'rich' : 'lean') : '(open loop)'}`;
      case 'o2down': return `${f2(s.o2d)} V`;
      case 'knock': return has('knock_open') ? 'Fault – retard 6°' : `Retard ${f1(s.knockRetard)}°`;
      case 'vss': return `${Math.round(has('vss_open') ? 0 : s.speed)} km/h`;
      case 'rps': return has('rps_open') ? '— (fault)' : `${Math.round(s.rail)} bar`;
      case 'fts': return `${Math.round(s.ambient + (s.running ? (s.ect - s.ambient) * 0.6 : 0))} °C`;
      case 'egt': return `${Math.round(s.egt)} °C`;
      case 'dpfp': return `${f1(Math.max(0, (sig('dpfp') - 0.5) * 12))} kPa · soot ${Math.round(s.soot)} %`;
      case 'oilp': return s.running ? 'Open (pressure OK)' : 'Closed (lamp ON)';
      case 'brksw': return s.brake ? 'Pressed' : 'Released';
      case 'injp': return `${f2(s.pw)} ms`;
      case 'coil': return `${f1(s.adv)}° BTDC · dwell ${f1(s.dwell)} ms`;
      case 'etb': return `${f1(s.tp)} % open`;
      case 'fpump': return s.pumpOn ? 'Running' : 'Off';
      case 'purge': return s.closedLoop ? `${Math.round(20 + s.tp / 2)} % duty` : '0 % (closed)';
      case 'vvt': return s.running ? `${Math.round(clamp(s.rpm / 200, 0, 30))}° advance` : '0°';
      case 'injd': return `${f1(s.qty)} mm³/stroke`;
      case 'scv': return `${Math.round(s.scv)} % duty`;
      case 'prv': return `${Math.round(s.running ? 20 + s.rail / 40 : 0)} % duty`;
      case 'glow': return s.glowOn ? (s.glowT > 0 ? `Pre-glow ${f1(s.glowT)} s` : 'After-glow') : 'Off';
      case 'egr': return `${Math.round(s.egr)} % open`;
      case 'vgt': return `${Math.round(s.vgt)} % duty`;
      case 'fan': return s.fan ? 'ON' : 'Off';
      case 'mil': return s.mil ? (s.milFlash ? 'Flashing' : 'ON') : 'Off';
      case 'ecm': return s.key >= 2 ? 'Powered' : 'Sleep';
      case 'mainrelay': return s.key >= 2 ? 'Closed' : 'Open';
      case 'battery': return `${f1(s.vbat)} V`;
      case 'alternator': return s.running ? `${f1(s.vbat)} V charging` : 'Not charging';
      case 'starter': return s.cranking ? 'Cranking' : 'Off';
      case 'ignsw': return ['LOCK', 'ACC', 'ON', 'START'][s.key];
      default: return '';
    }
  }

  /* Voltage at a given pin role (for wiring diagram / multimeter) */
  function pinVolts(part, role, pinIdx) {
    const ign = s.key >= 2;
    switch (role) {
      case 'ref': return ign ? 5.0 : 0;
      case 'gnd': return ign ? 0.02 : 0;
      case 'cg': return 0.01;
      case 'sh': return 0;
      case 'bat': return part.id === 'battery' || part.id === 'ecm' && pinIdx === 0 || part.id === 'mainrelay' && pinIdx === 0 || part.id === 'ignsw' && pinIdx === 0 || part.id === 'alternator' || part.id === 'starter' || part.id === 'fusebox' || part.id === 'dome' || part.id === 'cluster' && pinIdx === 0 ? s.vbat : ign ? s.vbat : 0;
      case 'heat': return ign ? (s.running ? s.vbat * 0.45 : s.vbat) : 0;
      case 'can': return ign ? 2.5 : 0;
      case 'sig': {
        if (part.id === 'maf' && pinIdx === 4) return sig('iat');
        if (part.id === 'boost' && pinIdx === 1) return sig('iat');
        if (part.id === 'tps' && pinIdx === 2) return has('tps_open') ? 4.5 : 4.5 - s.tp / 100 * 4.0;
        if (part.id === 'app' && pinIdx === 4) return ign ? (0.4 + s.pedal / 100 * 1.7) : 0;
        if (part.id === 'coil') return s.running ? 0.6 : 0;
        if (part.id === 'egr') return ign ? 0.6 + s.egr / 100 * 3.8 : 0;
        if (part.id === 'glow') return s.glowOn ? 0 : 5;
        if (part.id === 'mainrelay' || part.id === 'ecm') return ign ? s.vbat : 0;
        if (part.id === 'alternator') return s.running ? 0.5 : ign ? 1.2 : 0;
        if (part.id === 'starter') return s.cranking ? s.vbat : 0;
        if (part.id === 'dome') return 12;
        return sig(part.id);
      }
      case 'drv': return ign ? s.vbat * (1 - duty(part.id)) + 0.25 * duty(part.id) : 0;
      case 'hs': return ign ? s.vbat * duty(part.id) : 0;
      default: return 0;
    }
  }

  function duty(id) {
    const P = isP();
    switch (id) {
      case 'injp': return s.running ? clamp(s.pw / (120000 / Math.max(s.rpm, 1)), 0, 0.9) : s.cranking ? 0.05 : 0;
      case 'coil': return s.running || s.cranking ? clamp(s.dwell / (120000 / Math.max(s.rpm, 1)), 0, 0.6) : 0;
      case 'etb': return s.tp / 100 * 0.6 + 0.15;
      case 'fpump': return s.pumpOn ? 1 : 0;
      case 'purge': return s.closedLoop ? 0.2 + s.tp / 200 : 0;
      case 'vvt': return s.running ? 0.4 : 0;
      case 'injd': return s.running ? 0.04 : 0;
      case 'scv': return s.scv / 100;
      case 'prv': return s.running ? 0.3 : 0;
      case 'glow': return s.glowOn ? 1 : 0;
      case 'egr': return s.egr / 100;
      case 'vgt': return s.vgt / 100;
      case 'fan': return s.fan ? 1 : 0;
      case 'mil': return s.mil ? 1 : 0;
      case 'mainrelay': return s.key >= 2 ? 1 : 0;
      case 'ignsw': return s.key >= 2 ? 1 : 0;
      case 'fusebox': return 1;
      default: return s.key >= 2 ? 1 : 0;
    }
  }

  /* Is a part currently "active" (for glow / flow animation on map & wiring) */
  function active(id) {
    const P = isP();
    switch (id) {
      case 'injp': case 'injd': return (s.running || s.cranking) && !(s.faults.has('fpump_relay'));
      case 'coil': return s.running || s.cranking;
      case 'fpump': return s.pumpOn;
      case 'fan': return s.fan;
      case 'glow': return s.glowOn;
      case 'egr': return s.egr > 1;
      case 'starter': return s.cranking;
      case 'alternator': return s.running;
      case 'mil': return s.mil;
      case 'purge': return s.closedLoop;
      default: return s.key >= 2;
    }
  }

  function liveData() {
    const P = isP();
    const rows = [
      ['Engine speed', `${Math.round(s.rpmShown || 0)}`, 'rpm'],
      ['Coolant temp (ECT)', reading('ect').replace(' °C', ''), '°C'],
      ['Intake air temp (IAT)', reading('iat').replace(' °C', ''), '°C'],
      ['Battery voltage', s.vbat.toFixed(1), 'V'],
      ['Vehicle speed', `${Math.round(has('vss_open') ? 0 : s.speed)}`, 'km/h'],
      ['Accel. pedal APP1', has('app_open') ? '0.00' : sig('app').toFixed(2), 'V'],
      ['Mass air flow', has('maf_open') ? '—' : s.maf.toFixed(1), 'g/s']
    ];
    if (P) rows.push(
      ['Throttle angle', has('tps_open') ? '—' : s.tp.toFixed(1), '%'],
      ['MAP', has('map_open') ? '—' : Math.round(s.map) + '', 'kPa'],
      ['Injector pulse width', s.pw.toFixed(2), 'ms'],
      ['Ignition advance', s.adv.toFixed(1), '° BTDC'],
      ['Knock retard', s.knockRetard.toFixed(1), '°'],
      ['O2 sensor B1S1', sig('o2up').toFixed(2), 'V'],
      ['O2 sensor B1S2', s.o2d.toFixed(2), 'V'],
      ['Short-term fuel trim', s.stft.toFixed(1), '%'],
      ['Long-term fuel trim', s.ltft.toFixed(1), '%'],
      ['Fuel system status', s.closedLoop ? 'CL' : 'OL', ''],
    );
    else rows.push(
      ['Rail pressure – desired', Math.round(s.railTarget) + '', 'bar'],
      ['Rail pressure – actual', has('rps_open') ? '—' : Math.round(s.rail) + '', 'bar'],
      ['Pump control valve', Math.round(s.scv) + '', '%'],
      ['Injection quantity', s.qty.toFixed(1), 'mm³'],
      ['Boost pressure', has('boost_open') ? '—' : Math.round(s.boost) + '', 'kPa'],
      ['VGT duty', Math.round(s.vgt) + '', '%'],
      ['EGR position', Math.round(s.egr) + '', '%'],
      ['Glow plug', s.glowOn ? 'ON' : 'OFF', ''],
      ['Exhaust temp (EGT)', Math.round(s.egt) + '', '°C'],
      ['DPF soot load', Math.round(s.soot) + '', '%'],
    );
    rows.push(['Fuel pump', s.pumpOn ? 'ON' : 'OFF', ''], ['Cooling fan', s.fan ? 'ON' : 'OFF', ''], ['Limp mode', s.limp ? 'YES' : 'NO', '']);
    return rows;
  }

  function reset() {
    Object.assign(s, { key: 0, running: false, cranking: false, rpm: 0, pedal: 0, tp: 0, ect: s.ambient, iat: s.ambient + 4, speed: 0, gear: 'N', rail: 0, boost: 100, map: 100, maf: 0, glowT: 0, afterGlow: 0, _glowDone: false, primeT: 0 });
    s.dtcs.clear();
  }

  return { s, step, sig, reading, pinVolts, duty, active, liveData, reset, setDTC, ntcV, has };
})();
