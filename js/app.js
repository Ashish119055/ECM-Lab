/* ECM Lab — app shell: routing, global controls, main loop */

const App = (() => {
  const VIEWS = ['map', 'wiring', 'sim', 'body', 'parts', 'quiz'];
  const DASH_VIEWS = ['map', 'wiring', 'sim', 'body'];
  let view = 'map', toastT = 0;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ecmlab.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ecmlab.' + k, v); } catch (e) { /* storage unavailable */ } }
  };

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function route() {
    const h = location.hash.replace('#', '');
    view = VIEWS.includes(h) ? h : 'map';
    VIEWS.forEach(v => { $('#view-' + v).hidden = v !== view; });
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.view === view));
    $('#dash').hidden = !DASH_VIEWS.includes(view);
    if (view === 'map') MapView.render();
    if (view === 'wiring') WiringView.render();
    if (view === 'sim') SimView.slow();
    if (view === 'parts') LibView.render();
    if (view === 'quiz' && !$('#quiz').innerHTML) QuizView.render();
    if (view === 'body') Body.renderPanel();
  }

  function setEngine(e) {
    if (Sim.s.engine === e) return;
    Sim.s.engine = e;
    Sim.reset();
    [...Sim.s.faults].forEach(f => { if (!FAULTS[f].engines.includes(e)) Sim.s.faults.delete(f); });
    $$('#engineSeg button').forEach(b => b.setAttribute('aria-checked', b.dataset.engine === e));
    $('#lampGlow').hidden = e !== 'diesel';
    store.set('engine', e);
    syncDash();
    route();
    toast(e === 'diesel' ? 'Diesel common-rail selected: glow plugs, rail pressure, turbo, EGR, DPF' : 'Petrol MPFI selected: spark ignition, port injection, O2 closed loop');
  }

  function syncDash() {
    const s = Sim.s;
    $$('#keyRow button').forEach(b => b.classList.toggle('on', +b.dataset.key === s.key));
    $$('#gearSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.gear === s.gear));
    $('#acBtn').setAttribute('aria-pressed', !!s.ac);
    $('#brakeBtn').setAttribute('aria-pressed', !!s.brake);
    $('#pedal').value = s.pedal; $('#pedalVal').textContent = `${Math.round(s.pedal)} %`;
  }

  function faultsChanged() {
    if (view === 'wiring') WiringView.render();
    if (view === 'map') MapView.update();
    SimView.buildFaults();
  }

  function initControls() {
    $$('#keyRow button').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.key;
      Sim.s.msg = '';
      if (k === 3) {
        if (Sim.s.running) { toast('Engine is already running'); return; }
        if (Sim.s.key < 2) { Sim.s.key = 2; }
        Sim.s.key = 3; Sim.s.crankT = 0;
      } else Sim.s.key = k;
      syncDash();
      if (view === 'body') Body.renderPanel();
    }));
    $('#pedal').addEventListener('input', e => { Sim.s.pedal = +e.target.value; $('#pedalVal').textContent = `${e.target.value} %`; });
    $$('#gearSeg button').forEach(b => b.addEventListener('click', () => { Sim.s.gear = b.dataset.gear; syncDash(); }));
    $('#acBtn').addEventListener('click', () => { Sim.s.ac = !Sim.s.ac; syncDash(); if (view === 'body') Body.renderPanel(); });
    $('#brakeBtn').addEventListener('click', () => { Sim.s.brake = !Sim.s.brake; syncDash(); if (view === 'body') { Body.renderPanel(); Body.select('brake'); } });
    $$('#engineSeg button').forEach(b => b.addEventListener('click', () => setEngine(b.dataset.engine)));
    $('#themeBtn').addEventListener('click', () => {
      const root = document.documentElement;
      const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = isDark ? 'light' : 'dark';
      store.set('theme', root.dataset.theme);
    });
  }

  let last = performance.now(), slowAcc = 0, prevKeyShown = -1, prevRunning = null;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    Sim.step(dt);
    Body.step(dt);
    const s = Sim.s;
    // dash readouts every frame (cheap)
    $('#roRpm').textContent = Math.round(s.rpmShown || 0);
    $('#roBat').textContent = `${s.vbat.toFixed(1)} V`;
    $('#roStatus').textContent = s.cranking ? 'Cranking' : s.running ? (s.limp ? 'Limp mode' : 'Running') : s.key >= 2 ? 'Key ON' : s.key === 1 ? 'ACC' : 'Off';
    const mil = $('#lampMil');
    mil.classList.toggle('lit', s.mil); mil.classList.toggle('flash', s.milFlash);
    $('#lampGlow').classList.toggle('lit', s.glowOn && s.glowT > 0);
    $('#lampBat').classList.toggle('lit', s.key >= 2 && !s.running);
    $('#lampOil').classList.toggle('lit', s.key >= 2 && !s.running);
    if (s.key !== prevKeyShown || s.running !== prevRunning) { syncDash(); prevKeyShown = s.key; prevRunning = s.running; if (view === 'body') Body.renderPanel(); }
    if (s.msg && s.msg !== App._lastMsg) { App._lastMsg = s.msg; toast(s.msg); setTimeout(() => { if (Sim.s.msg === s.msg) Sim.s.msg = ''; }, 3500); }

    if (view === 'sim') SimView.frame(dt);
    if (view === 'body') Body.frame();
    slowAcc += dt;
    if (slowAcc > 0.2) {
      slowAcc = 0;
      if (view === 'map') MapView.update();
      if (view === 'wiring') WiringView.update();
      if (view === 'sim') SimView.slow();
      Drawer.update();
    }
    requestAnimationFrame(loop);
  }

  function init() {
    $('#gdefs').innerHTML = grads();
    const theme = store.get('theme', '');
    if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
    const eng = store.get('engine', 'petrol');
    Sim.s.engine = eng === 'diesel' ? 'diesel' : 'petrol';
    $$('#engineSeg button').forEach(b => b.setAttribute('aria-checked', b.dataset.engine === Sim.s.engine));
    $('#lampGlow').hidden = Sim.s.engine !== 'diesel';
    initControls();
    MapView.init(); SimView.init(); LibView.init(); Drawer.init(); Body.init();
    window.addEventListener('hashchange', route);
    route();
    requestAnimationFrame(loop);
  }

  return { init, route, toast, setEngine, syncDash, faultsChanged, store };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init); else App.init();
