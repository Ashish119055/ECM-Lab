/* Suspension Lab — app shell: routing, system switching, procedure / BOM / part drawer, compare table */
'use strict';

(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const state = { sys: SYSTEMS[0], step: 0, exploded: false, view: 'bench', side: 'proc', travel: 0, playing: null };
  const store = { get(k) { try { return localStorage.getItem('susplab.' + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem('susplab.' + k, v); } catch (e) { /* ignore */ } } };

  /* ── theme ── */
  const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const savedTheme = store.get('theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $('#themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = next; store.set('theme', next);
    Bench.setTheme(isDark()); refreshCharts();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { Bench.setTheme(isDark()); refreshCharts(); });

  /* ── system icons (tiny schematic per type) ── */
  const ICONS = {
    macpherson: '<path d="M8 28h16M26 6v18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M22 9l8 2-8 2 8 2-8 2" fill="none" stroke="var(--accent)" stroke-width="1.8"/><circle cx="34" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 28l18-2" stroke="currentColor" stroke-width="2.5"/>',
    wishbone: '<path d="M6 10l18 1M6 28l20-1" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M24 11l2 16" stroke="var(--accent)" stroke-width="3"/><circle cx="34" cy="19" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 27V4" stroke="currentColor" stroke-width="1.6"/>',
    multilink: '<path d="M4 8l22 3M4 14l22-3M4 26l22 1M4 31l22-4M6 20l20 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="19" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    twistbeam: '<circle cx="8" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="36" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 20h28" stroke="var(--accent)" stroke-width="3"/><path d="M14 20l2-12M30 20l-2-12" stroke="currentColor" stroke-width="2"/>',
    leaf: '<path d="M4 14q18 10 36 0M6 17q16 8 32 0M10 20q12 5 24 0" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="22" cy="12" r="4" fill="var(--accent)"/>',
    air: '<rect x="14" y="5" width="12" height="16" rx="6" fill="none" stroke="var(--accent)" stroke-width="2.5"/><path d="M20 21v12M10 33h20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M30 10h8M34 6v8" stroke="currentColor" stroke-width="2"/>'
  };

  function buildSysbar() {
    const bar = $('#sysbar');
    bar.innerHTML = SYSTEMS.map((s) => `<button class="sys-card" role="radio" aria-checked="false" data-sys="${s.id}"><svg viewBox="0 0 44 38" aria-hidden="true">${ICONS[s.id]}</svg><span><b>${esc(s.name)}</b><small>${esc(s.axle)}</small></span></button>`).join('');
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-sys]'); if (b) setSystem(b.dataset.sys); });
    bar.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const i = SYSTEMS.indexOf(state.sys); const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + SYSTEMS.length) % SYSTEMS.length;
      setSystem(SYSTEMS[j].id); bar.querySelector(`[data-sys="${SYSTEMS[j].id}"]`).focus(); e.preventDefault();
    });
  }

  function setSystem(id) {
    const def = SYS_BY_ID[id] || SYSTEMS[0];
    state.sys = def; state.step = 0; state.exploded = false; stopPlay(); store.set('sys', def.id);
    document.querySelectorAll('.sys-card').forEach((b) => { const on = b.dataset.sys === def.id; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const card = document.querySelector(`.sys-card[data-sys="${def.id}"]`); if (card) card.parentElement.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
    const built = Bench.load(def);
    $('#stTitle').textContent = def.name; $('#stAxle').textContent = def.axle;
    $('#tbExplode').setAttribute('aria-pressed', false); $('#tbIsolate').setAttribute('aria-pressed', false); $('#tbIsolate').disabled = true;
    $('#cycleBtn').setAttribute('aria-pressed', false); $('#travel').value = 0; state.travel = 0;
    closeDrawer();
    renderProc(); renderBom(); renderSys();
    KinView.setSystem(def, built); KinView.render(state.travel / 1000);
    Dyn.loadPreset(def);
    renderCompare();
  }

  /* ── procedure ── */
  const removedIds = () => state.exploded ? Bench.parts.filter((p) => p.explode).map((p) => p.id) : state.sys.steps.slice(0, state.step).flatMap((s) => s.parts);
  function applyRemoval() { Bench.setRemoved(removedIds()); renderBomState(); }
  function renderProc() {
    const s = state.sys; const n = s.steps.length; const k = state.step;
    const cur = s.steps[k];
    const pname = (id) => Bench.parts.find((p) => p.id === id)?.name || id;
    $('#paneProc').innerHTML = `
      <div class="proc-top"><h3>Tear-down procedure</h3><span class="pill">${state.exploded ? 'exploded view' : `${k} / ${n} done`}</span></div>
      <div class="prog"><i style="width:${(state.exploded ? 1 : k / n) * 100}%"></i></div>
      <div class="proc-ctl">
        <button class="btn ghost" id="pReset" ${k === 0 && !state.exploded ? 'disabled' : ''}>⟲ Reassemble</button>
        <button class="btn ghost" id="pPrev" ${k === 0 || state.exploded ? 'disabled' : ''}>← Back</button>
        <button class="btn accent" id="pNext" ${k >= n || state.exploded ? 'disabled' : ''}>${k === 0 ? 'Start' : 'Next step'} →</button>
        <button class="btn ghost" id="pPlay" ${state.exploded ? 'disabled' : ''}>${state.playing ? '❚❚ Pause' : '▶ Auto'}</button>
      </div>
      <div class="prep"><b>Before you start — safety &amp; preparation</b>${esc(s.prep)}</div>
      <ol class="steps">${s.steps.map((st, i) => {
        const cls = state.exploded || i < k ? 'done' : i === k ? 'cur' : '';
        const open = i === k && !state.exploded;
        return `<li class="step ${cls}"><button data-goto="${i}" aria-expanded="${open}"><span class="num">${state.exploded || i < k ? '✓' : i + 1}</span><span class="st">${esc(st.t)}</span></button>
        ${open ? `<div class="step-detail">
          ${st.parts.length ? `<div class="kv"><span>Parts</span><div class="plist">${st.parts.map((id) => `<button data-part="${id}">${esc(pname(id))}</button>`).join('')}</div></div>` : ''}
          <div class="kv"><span>Tools</span><span>${esc(st.tool)}</span></div>
          <div class="kv"><span>Torque</span><span>${esc(st.torque)}</span></div>
          ${st.note ? `<div class="kv"><span>Notes</span><span>${esc(st.note)}</span></div>` : ''}
          ${st.warn ? `<div class="warn"><b>Warning:</b> ${esc(st.warn)}</div>` : ''}
        </div>` : ''}</li>`;
      }).join('')}</ol>
      ${k >= n && !state.exploded ? `<div class="done-card"><b>Tear-down complete.</b><br>Reassembly is the reverse order. Tighten every rubber-bushed pivot at ride height, torque all fasteners to spec, then carry out a 4-wheel alignment and a road test.</div>` : ''}`;
    $('#pNext').onclick = () => go(k + 1);
    $('#pPrev').onclick = () => go(k - 1);
    $('#pReset').onclick = () => { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); go(0); };
    $('#pPlay').onclick = () => (state.playing ? stopPlay() : startPlay());
    $('#paneProc').querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { if (!state.exploded) go(+b.dataset.goto); }));
    $('#paneProc').querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => Bench.select(b.dataset.part, true)));
    const curEl = $('#paneProc .step.cur') || $('#paneProc .done-card');
    if (curEl && k > 0) curEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function go(k) {
    state.step = Math.max(0, Math.min(state.sys.steps.length, k));
    applyRemoval(); renderProc();
    const st = state.sys.steps[state.step - 1];
    if (st && st.parts[0]) Bench.select(st.parts[0], false, true); else Bench.select(null, false, true);
    if (state.step >= state.sys.steps.length) stopPlay();
  }
  function startPlay() { if (state.step >= state.sys.steps.length) go(0); state.playing = setInterval(() => go(state.step + 1), 2600); renderProc(); }
  function stopPlay() { if (state.playing) clearInterval(state.playing); state.playing = null; if ($('#pPlay')) renderProc(); }

  /* ── BOM ── */
  function renderBom() {
    const groups = {};
    Bench.parts.forEach((p) => { const c = PARTS[p.info].cat; (groups[c] = groups[c] || []).push(p); });
    $('#paneBom').innerHTML = `<p class="meta">Every component in the assembly. The number matches the 3D balloon. Click a row to select and inspect the part.</p>` +
      Object.keys(CATS).filter((c) => groups[c]).map((c) => `<div class="bom-group"><h3><i style="background:${CATS[c].color}"></i>${CATS[c].label}</h3>${groups[c].map((p) => `<button class="bom-item" data-part="${p.id}"><span class="n">${p.n}</span><span>${esc(p.name)}</span><span class="state" data-state="${p.id}"></span></button>`).join('')}</div>`).join('');
    $('#paneBom').querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => Bench.select(b.dataset.part, true)));
    renderBomState();
  }
  function renderBomState() {
    const rem = new Set(removedIds());
    Bench.parts.forEach((p) => {
      const el = document.querySelector(`[data-state="${p.id}"]`); if (!el) return;
      el.textContent = !p.explode ? 'fixed' : rem.has(p.id) ? 'removed' : 'fitted'; el.classList.toggle('off', rem.has(p.id));
    });
  }

  /* ── system pane ── */
  function renderSys() {
    const s = state.sys;
    $('#paneSys').innerHTML = `<div class="sys-pane">
      <h2>${esc(s.name)}</h2><p class="meta">${esc(s.axle)}</p>
      <p>${esc(s.desc)}</p>
      <h3>How it works</h3><p>${esc(s.how)}</p>
      <div class="pc"><div><h3>Advantages</h3><ul class="pro">${s.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h3>Limitations</h3><ul class="con">${s.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <h3>Typical design values</h3><table class="tbl">${Object.entries(s.char).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      <h3>Origin</h3><p>${esc(s.history)}</p>
      <h3>Where you'll find it</h3><p>${esc(s.used)}</p>
      <div class="d-actions"><a class="btn ghost" href="#kin">Open kinematics →</a><a class="btn ghost" href="#dyn">Ride dynamics →</a></div></div>`;
  }

  /* ── part drawer ── */
  function openDrawer(id) {
    const p = Bench.parts.find((q) => q.id === id); if (!p) { closeDrawer(); return; }
    const d = PARTS[p.info]; const cat = CATS[d.cat];
    const stepIdx = state.sys.steps.findIndex((s) => s.parts.includes(id));
    $('#drawerCat').textContent = cat.label; $('#drawerCat').style.background = cat.color + '26'; $('#drawerCat').style.color = 'var(--ink)';
    $('#drawerBody').innerHTML = `
      <div class="meta">Item ${p.n}${stepIdx >= 0 ? ` · removed in step ${stepIdx + 1}` : ' · fixed structure'}</div>
      <h2>${esc(p.name)}</h2>
      <p>${esc(d.fn)}</p>
      <h3>Construction &amp; material</h3><p>${esc(d.build)}</p>
      <h3>Engineering</h3><div class="eng">${esc(d.eng)}</div>
      <h3>Typical specification</h3><table class="tbl">${Object.entries(d.specs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      <h3>Failure modes → symptoms</h3><ul>${d.fail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Inspection &amp; service</h3><ul>${d.test.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="d-actions">
        ${stepIdx >= 0 ? `<button class="btn ghost" id="dGo">Go to step ${stepIdx + 1}</button>` : ''}
        ${p.cut ? `<button class="btn ghost" id="dCut">Show in section</button>` : ''}
        <button class="btn ghost" id="dIso">Isolate</button>
      </div>`;
    $('#drawer').hidden = false;
    $('#dGo') && ($('#dGo').onclick = () => { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); go(stepIdx + 1); Bench.select(id, true); setSide('proc'); });
    $('#dCut') && ($('#dCut').onclick = () => { toggleTb('#tbSection', true); });
    $('#dIso').onclick = () => toggleTb('#tbIsolate', true);
    document.querySelectorAll('.bom-item').forEach((b) => b.classList.toggle('sel', b.dataset.part === id));
  }
  function closeDrawer() { $('#drawer').hidden = true; document.querySelectorAll('.bom-item.sel').forEach((b) => b.classList.remove('sel')); }
  $('#drawerBack').addEventListener('click', () => Bench.select(null));

  /* ── side tabs ── */
  function setSide(k) {
    state.side = k;
    document.querySelectorAll('.side-tabs [data-side]').forEach((b) => b.setAttribute('aria-selected', b.dataset.side === k));
    document.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== k; });
    closeDrawer(); if (Bench.st.selected) Bench.select(null);
  }
  document.querySelectorAll('.side-tabs [data-side]').forEach((b) => b.addEventListener('click', () => setSide(b.dataset.side)));

  /* ── toolbar ── */
  function toggleTb(sel, force) {
    const b = $(sel); if (b.disabled) return;
    const on = force ?? b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
    if (sel === '#tbExplode') { state.exploded = on; stopPlay(); applyRemoval(); renderProc(); setTimeout(() => (on ? Bench.fit() : Bench.resetView(false)), on ? 900 : 0); }
    if (sel === '#tbSection') Bench.setSection(on);
    if (sel === '#tbLabels') Bench.setBalloons(on);
    if (sel === '#tbIsolate') Bench.setIsolate(on);
    if (sel === '#tbHide') Bench.setHideRemoved(on);
    if (sel === '#tbRotate') Bench.setAutoRot(on);
  }
  ['#tbExplode', '#tbSection', '#tbLabels', '#tbIsolate', '#tbHide', '#tbRotate'].forEach((s) => $(s).addEventListener('click', () => toggleTb(s)));
  $('#tbReset').addEventListener('click', () => Bench.resetView(false));

  /* ── travel ── */
  const travel = $('#travel');
  travel.addEventListener('input', () => { state.travel = +travel.value; $('#cycleBtn').setAttribute('aria-pressed', false); Bench.setTravel(state.travel / 1000); });
  $('#cycleBtn').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); Bench.setCycle(on); if (!on) { travel.value = 0; state.travel = 0; } });

  let roT = 0;
  Bench.onFrame = (r, locked) => {
    const now = performance.now(); if (now - roT < 100) return; roT = now;
    $('#travelBox').classList.toggle('locked', locked); travel.disabled = locked; $('#cycleBtn').disabled = locked;
    const mm = (r.s * 1000); $('#travelVal').textContent = locked ? 'locked — parts removed' : `${mm > 0 ? '+' : ''}${mm.toFixed(0)} mm`;
    if (Bench.st.cycle) travel.value = Math.round(mm);
    const rows = [['Travel', `${mm.toFixed(0)} mm`], ['Camber', `${r.camber.toFixed(2)}°`]];
    if (r.rcH != null) rows.push(['Roll ctr', `${(r.rcH * 1000).toFixed(0)} mm`]);
    rows.push(['Track Δ', `${((r.halfTrack - Bench.built.hp.W[0]) * 1000).toFixed(1)} mm`]);
    if (r.springLen && Bench.built.kinType !== 'live') rows.push(['Strut L', `${(r.springLen * 1000).toFixed(0)} mm`]);
    if (isFinite(r.mr)) rows.push(['Motion r.', r.mr.toFixed(3)]);
    $('#readout').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  };
  Bench.onSelect = (id, quiet) => {
    $('#tbIsolate').disabled = !id;
    if (quiet) { closeDrawer(); return; }
    if (!id) { if ($('#tbIsolate').getAttribute('aria-pressed') === 'true') toggleTb('#tbIsolate', false); closeDrawer(); return; }
    openDrawer(id);
  };

  /* ── kinematics slider ── */
  $('#kinTravel').addEventListener('input', (e) => KinView.render(+e.target.value / 1000));

  /* ── compare ── */
  function renderCompare() {
    const keys = [['comfort', 'Ride comfort'], ['handling', 'Handling / camber control'], ['load', 'Load capacity'], ['packaging', 'Packaging'], ['cost', 'Cost (5 = cheapest)'], ['simplicity', 'Simplicity']];
    const bar = (v) => `<div class="bar"><i>${[1, 2, 3, 4, 5].map((i) => `<b class="${i <= v ? 'on' : ''}"></b>`).join('')}</i><span>${v}</span></div>`;
    $('#cmpRatings').innerHTML = `<thead><tr><th>System</th>${keys.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${SYSTEMS.map((s) => `<tr class="${s === state.sys ? 'cur' : ''}"><td class="sysn">${esc(s.name)}<small>${esc(s.axle)}</small></td>${keys.map(([k]) => `<td>${bar(s.ratings[k])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('#cmpTable').innerHTML = `<thead><tr><th>System</th><th>Key design values</th><th>Body freq. (preset)</th><th>Typical vehicles</th><th>Origin</th></tr></thead><tbody>${SYSTEMS.map((s) => {
      const p = s.preset; const kr = p.ks * p.kt / (p.ks + p.kt); const f = Math.sqrt(kr / p.ms) / (2 * Math.PI);
      return `<tr class="${s === state.sys ? 'cur' : ''}"><td class="sysn">${esc(s.name)}<small>${esc(s.axle)}</small></td><td><table class="tbl">${Object.entries(s.char).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></td><td>${f.toFixed(2)} Hz</td><td>${esc(s.used)}</td><td class="meta">${esc(s.history)}</td></tr>`;
    }).join('')}</tbody>`;
  }

  /* ── routing ── */
  function route() {
    const v = (location.hash || '#bench').slice(1); const view = ['bench', 'kin', 'dyn', 'compare'].includes(v) ? v : 'bench';
    state.view = view;
    document.querySelectorAll('.view').forEach((s) => { s.hidden = s.id !== 'view-' + view; });
    document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.view === view));
    refreshCharts();
  }
  function refreshCharts() {
    if (state.view === 'kin') KinView.render(+$('#kinTravel').value / 1000);
    if (state.view === 'dyn') Dyn.redraw();
  }
  window.addEventListener('hashchange', route);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(refreshCharts, 150); });

  /* ── boot ── */
  initMaterials();
  Bench.init($('#stage'));
  Bench.setTheme(isDark());
  buildSysbar();
  Dyn.init();
  route();
  setSystem(store.get('sys') || SYSTEMS[0].id);
  route();
  window.SuspLab = { setSystem, go, state };
})();
