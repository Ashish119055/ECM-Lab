/* Suspension Lab — app shell: languages, routing, system switching, procedure / BOM / part drawer,
   "how it works" lesson, full screen, compare */
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

  /* ── language ── */
  function buildLang() {
    $('#langSeg').innerHTML = LANGS.map(([k, l]) => `<button role="radio" data-lang="${k}" aria-checked="${k === LANG}">${l}</button>`).join('');
    $('#langSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
  }
  function setLang(l) {
    LANG = UI[l] ? l : 'en'; store.set('lang', LANG);
    document.documentElement.lang = LANG;
    document.querySelectorAll('#langSeg [data-lang]').forEach((b) => b.setAttribute('aria-checked', b.dataset.lang === LANG));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
    buildSysbarLabels();
    if (!Bench.built) return;
    $('#stTitle').textContent = sysName(state.sys); $('#stAxle').textContent = sysAxle(state.sys);
    Bench.refreshLabels();
    renderProc(); renderBom(); renderSys(); renderCompare(); renderTheory();
    if (Bench.st.selected) openDrawer(Bench.st.selected);
    if (how.on) showScene();
    refreshCharts();
  }
  Bench.nameOf = (p) => partName(p);
  Bench.descOf = (p) => partSimple(p);

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
    bar.innerHTML = SYSTEMS.map((s) => `<button class="sys-card" role="radio" aria-checked="false" data-sys="${s.id}"><svg viewBox="0 0 44 38" aria-hidden="true">${ICONS[s.id]}</svg><span><b></b><small>${esc(s.axle)}</small></span></button>`).join('');
    buildSysbarLabels();
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-sys]'); if (b) setSystem(b.dataset.sys); });
    bar.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const i = SYSTEMS.indexOf(state.sys); const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + SYSTEMS.length) % SYSTEMS.length;
      setSystem(SYSTEMS[j].id); bar.querySelector(`[data-sys="${SYSTEMS[j].id}"]`).focus(); e.preventDefault();
    });
  }
  function buildSysbarLabels() { SYSTEMS.forEach((s) => { const c = document.querySelector(`.sys-card[data-sys="${s.id}"]`); if (c) { c.querySelector('b').textContent = sysName(s); c.querySelector('small').textContent = sysAxle(s); } }); }

  function setSystem(id) {
    const def = SYS_BY_ID[id] || SYSTEMS[0];
    howStop();
    state.sys = def; state.step = 0; state.exploded = false; stopPlay(); store.set('sys', def.id);
    document.querySelectorAll('.sys-card').forEach((b) => { const on = b.dataset.sys === def.id; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const card = document.querySelector(`.sys-card[data-sys="${def.id}"]`); if (card) card.parentElement.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
    const built = Bench.load(def);
    $('#stTitle').textContent = sysName(def); $('#stAxle').textContent = sysAxle(def);
    ['#tbExplode', '#tbIsolate', '#tbSection'].forEach((s) => $(s).setAttribute('aria-pressed', false)); $('#tbIsolate').disabled = true;
    Bench.setSection(false);
    $('#cycleBtn').setAttribute('aria-pressed', false); $('#travel').value = 0; state.travel = 0;
    Bench.setBody($('#tbBody').getAttribute('aria-pressed') === 'true');
    closeDrawer();
    renderProc(); renderBom(); renderSys();
    renderCompare();
    if (state.view === 'diagram') enterDiagram(); else setDrive(true);
  }

  /* ── procedure ── */
  const removedIds = () => state.exploded ? Bench.parts.filter((p) => p.explode).map((p) => p.id) : state.sys.steps.slice(0, state.step).flatMap((s) => s.parts);
  function applyRemoval() { Bench.setRemoved(removedIds()); renderBomState(); }
  function renderProc() {
    const s = state.sys; const n = s.steps.length; const k = state.step; const tx = sysTx(s);
    const pname = (id) => { const p = Bench.parts.find((q) => q.id === id); return p ? partName(p) : id; };
    $('#paneProc').innerHTML = `
      <div class="proc-top"><h3>${tr('proc_title')}</h3><span class="pill">${state.exploded ? tr('exploded_view') : `${k} / ${n} ${tr('done_of')}`}</span></div>
      <div class="prog"><i style="width:${(state.exploded ? 1 : k / n) * 100}%"></i></div>
      <div class="proc-ctl">
        <button class="btn ghost" id="pReset" ${k === 0 && !state.exploded ? 'disabled' : ''}>${tr('reassemble')}</button>
        <button class="btn ghost" id="pPrev" ${k === 0 || state.exploded ? 'disabled' : ''}>${tr('back')}</button>
        <button class="btn accent" id="pNext" ${k >= n || state.exploded ? 'disabled' : ''}>${k === 0 ? tr('start') : tr('next')}</button>
        <button class="btn ghost" id="pPlay" ${state.exploded ? 'disabled' : ''}>${state.playing ? tr('pause') : tr('auto')}</button>
      </div>
      <div class="prep"><b>${tr('prep_title')}</b>${esc(tx ? tx.prep : s.prep)}</div>
      <ol class="steps">${s.steps.map((st, i) => {
        const cls = state.exploded || i < k ? 'done' : i === k ? 'cur' : '';
        const open = i === k && !state.exploded;
        const title = tx && tx.steps[i] ? tx.steps[i] : st.t;
        const warn = st.warn ? (tx && tx.warn && tx.warn[i]) || st.warn : '';
        return `<li class="step ${cls}"><button data-goto="${i}" aria-expanded="${open}"><span class="num">${state.exploded || i < k ? '✓' : i + 1}</span><span class="st">${esc(title)}</span></button>
        ${open ? `<div class="step-detail">
          ${st.parts.length ? `<div class="kv"><span>${tr('parts')}</span><div class="plist">${st.parts.map((id) => `<button data-part="${id}">${esc(pname(id))}</button>`).join('')}</div></div>` : ''}
          ${tx ? (torqueOf(st.torque) ? `<div class="kv"><span>${tr('torque')}</span><span>${torqueOf(st.torque)}</span></div>` : '') : `
          <div class="kv"><span>${tr('tools')}</span><span>${esc(st.tool)}</span></div>
          <div class="kv"><span>${tr('torque')}</span><span>${esc(st.torque)}</span></div>
          ${st.note ? `<div class="kv"><span>${tr('notes')}</span><span>${esc(st.note)}</span></div>` : ''}`}
          ${warn ? `<div class="warn"><b>${tr('warning')}:</b> ${esc(warn)}</div>` : ''}
        </div>` : ''}</li>`;
      }).join('')}</ol>
      ${k >= n && !state.exploded ? `<div class="done-card"><b>${tr('complete_title')}</b><br>${tr('complete_text')}</div>` : ''}`;
    $('#pNext').onclick = () => go(k + 1);
    $('#pPrev').onclick = () => go(k - 1);
    $('#pReset').onclick = () => { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); go(0); };
    $('#pPlay').onclick = () => (state.playing ? stopPlay() : startPlay());
    $('#paneProc').querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { if (!state.exploded) go(+b.dataset.goto); }));
    $('#paneProc').querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => Bench.select(b.dataset.part, true)));
    const curEl = $('#paneProc .step.cur') || $('#paneProc .done-card');
    if (curEl && k > 0 && state.view === 'bench' && window.innerWidth > 1080) curEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  const torqueOf = (s) => { const m = (s || '').match(/\d+(?:[–-]\d+)?\s*N·m/g); return m ? [...new Set(m)].join(' / ') : ''; };
  function go(k) {
    howStop();
    state.step = Math.max(0, Math.min(state.sys.steps.length, k));
    applyRemoval(); renderProc();
    const st = state.sys.steps[state.step - 1];
    if (st && st.parts[0]) Bench.select(st.parts[0], false, true); else Bench.select(null, false, true);
    if (state.step >= state.sys.steps.length) stopPlay();
  }
  function startPlay() { if (state.step >= state.sys.steps.length) go(0); state.playing = setInterval(() => go(state.step + 1), 2800); renderProc(); }
  function stopPlay() { if (state.playing) clearInterval(state.playing); state.playing = null; if ($('#pPlay')) renderProc(); }

  /* ── parts list ── */
  function renderBom() {
    const groups = {};
    Bench.parts.forEach((p) => { const c = PARTS[p.info].cat; (groups[c] = groups[c] || []).push(p); });
    $('#paneBom').innerHTML = `<p class="meta">${tr('bom_intro')}</p>` +
      Object.keys(CATS).filter((c) => groups[c]).map((c) => `<div class="bom-group"><h3><i style="background:${CATS[c].color}"></i>${esc(catName(c))}</h3>${groups[c].map((p) => `<button class="bom-item" data-part="${p.id}"><span class="n">${p.n}</span><span>${esc(partName(p))}</span><span class="state" data-state="${p.id}"></span></button>`).join('')}</div>`).join('');
    $('#paneBom').querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => Bench.select(b.dataset.part, true)));
    renderBomState();
  }
  function renderBomState() {
    const rem = new Set(removedIds());
    Bench.parts.forEach((p) => {
      const el = document.querySelector(`[data-state="${p.id}"]`); if (!el) return;
      el.textContent = !p.explode ? tr('fixed') : rem.has(p.id) ? tr('removed') : tr('fitted'); el.classList.toggle('off', rem.has(p.id));
    });
  }

  /* ── system pane ── */
  function renderSys() {
    const s = state.sys; const tx = sysTx(s);
    const body = tx ? `<div class="simple"><h3>${tr('desc')}</h3><p>${esc(tx.simple)}</p><h3>${tr('how_works')}</h3><p>${esc(tx.how)}</p></div>`
      : `<p>${esc(s.desc)}</p><h3>${tr('how_works')}</h3><p>${esc(s.how)}</p>
      <div class="pc"><div><h3>${tr('advantages')}</h3><ul class="pro">${s.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h3>${tr('limitations')}</h3><ul class="con">${s.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <h3>${tr('where')}</h3><p>${esc(s.used)}</p>`;
    $('#paneSys').innerHTML = `<div class="sys-pane"><h2>${esc(sysName(s))}</h2><p class="meta">${esc(sysAxle(s))}</p>${body}
      <div class="d-actions"><button class="btn accent" id="sysHow">${tr('how_btn')}</button><a class="btn ghost" href="#theory">${tr('tab_theory')} →</a><a class="btn ghost" href="#diagram">${tr('tab_diagram')} →</a></div></div>`;
    $('#sysHow').onclick = () => { if (state.view !== 'bench') location.hash = '#bench'; $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); howStart(); };
  }

  /* ── part drawer ── */
  function openDrawer(id) {
    const p = Bench.parts.find((q) => q.id === id); if (!p) { closeDrawer(); return; }
    const d = PARTS[p.info]; const cat = CATS[d.cat];
    const stepIdx = state.sys.steps.findIndex((s) => s.parts.includes(id));
    $('#drawerCat').textContent = catName(d.cat); $('#drawerCat').style.background = cat.color + '26'; $('#drawerCat').style.color = 'var(--ink)';
    const en = LANG === 'en';
    $('#drawerBody').innerHTML = `
      <div class="meta">${tr('item')} ${p.n}${stepIdx >= 0 ? ` · ${tr('removed_in_step')} ${stepIdx + 1}` : ` · ${tr('fixed_struct')}`}</div>
      <h2>${esc(partName(p))}</h2>
      <div class="simple"><h3>${tr('simple')}</h3><p>${esc(partSimple(p))}</p></div>
      <div class="d-actions">
        <button class="btn accent" id="dWork">${tr('see_working')}</button>
        ${p.cut ? `<button class="btn ghost" id="dCut">${tr('show_section')}</button>` : ''}
        <button class="btn ghost" id="dIso">${tr('isolate_btn')}</button>
        ${stepIdx >= 0 ? `<button class="btn ghost" id="dGo">${tr('go_step')} ${stepIdx + 1}</button>` : ''}
      </div>
      ${en ? `<h3>${tr('desc')}</h3><p>${esc(d.fn)}</p>
      <h3>${tr('construction')}</h3><p>${esc(d.build)}</p>
      <h3>${tr('failures')}</h3><ul>${d.fail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>${tr('inspection')}</h3><ul>${d.test.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    $('#drawer').hidden = false;
    $('#dGo') && ($('#dGo').onclick = () => { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); go(stepIdx + 1); Bench.select(id, true); setSide('proc'); });
    $('#dCut') && ($('#dCut').onclick = () => toggleTb('#tbSection', true));
    $('#dIso').onclick = () => toggleTb('#tbIsolate', true);
    $('#dWork').onclick = () => seeWorking(id);
    document.querySelectorAll('.bom-item').forEach((b) => b.classList.toggle('sel', b.dataset.part === id));
  }
  function closeDrawer() { $('#drawer').hidden = true; document.querySelectorAll('.bom-item.sel').forEach((b) => b.classList.remove('sel')); }
  $('#drawerBack').addEventListener('click', () => Bench.select(null));

  /* Show one part moving: reassemble, isolate it, cut it open if it has internals, bounce the wheel */
  function seeWorking(id) {
    howStop();
    if (state.exploded || state.step) { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); state.step = 0; applyRemoval(); renderProc(); }
    Bench.select(id, true);
    toggleTb('#tbIsolate', true);
    const p = Bench.parts.find((q) => q.id === id);
    toggleTb('#tbSection', !!(p && p.cut && ['damper', 'cdc', 'airspring', 'bushing', 'lbj', 'hub', 'tyre', 'topmount'].includes(p.info)));
    setDrive(false); $('#cycleBtn').setAttribute('aria-pressed', true); Bench.setCycle(true);
    if (window.innerWidth <= 1080) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
    if (sel === '#tbExplode') { howStop(); state.exploded = on; stopPlay(); applyRemoval(); renderProc(); setTimeout(() => (on ? Bench.fit() : Bench.resetView(false)), on ? 900 : 0); }
    if (sel === '#tbSection') Bench.setSection(on);
    if (sel === '#tbLabels') Bench.setBalloons(on);
    if (sel === '#tbIsolate') Bench.setIsolate(on);
    if (sel === '#tbHide') Bench.setHideRemoved(on);
    if (sel === '#tbRotate') Bench.setAutoRot(on);
  }
  ['#tbExplode', '#tbSection', '#tbLabels', '#tbIsolate', '#tbHide', '#tbRotate'].forEach((s) => $(s).addEventListener('click', () => toggleTb(s)));
  $('#tbReset').addEventListener('click', () => Bench.resetView(false));
  $('#tbBody').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); Bench.setBody(on); });
  $('#tbCar').addEventListener('click', () => { if ($('#tbBody').getAttribute('aria-pressed') !== 'true') $('#tbBody').click(); Bench.viewCar(); });

  /* ── continuous drive animation (wheels turn, road moves, bumps) ── */
  function setDrive(on) {
    $('#driveBtn').setAttribute('aria-pressed', on); Bench.setDrive(on);
    if (on) { $('#cycleBtn').setAttribute('aria-pressed', false); }
  }
  $('#driveBtn').addEventListener('click', (e) => { howStop(); setDrive(e.currentTarget.getAttribute('aria-pressed') !== 'true'); });

  /* ── full screen (real fullscreen where allowed, otherwise fill the window) ── */
  const stageEl = $('#stage');
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const isFull = () => fsEl() === stageEl || stageEl.classList.contains('max');
  function setFullUI() {
    const on = isFull(); $('#tbFull').setAttribute('aria-pressed', on);
    $('#tbFull span').textContent = on ? tr('tb_exitfull') : tr('tb_full');
    document.body.style.overflow = stageEl.classList.contains('max') ? 'hidden' : '';
    setTimeout(() => Bench.resetView(false), 350);
  }
  function toggleFull() {
    if (isFull()) {
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {});
      stageEl.classList.remove('max'); setFullUI(); return;
    }
    const req = stageEl.requestFullscreen || stageEl.webkitRequestFullscreen;
    const fallback = () => { stageEl.classList.add('max'); setFullUI(); };
    if (!req) { fallback(); return; }
    try { const r = req.call(stageEl); if (r && r.catch) r.catch(fallback); } catch (e) { fallback(); }
    setTimeout(() => { if (!fsEl()) fallback(); }, 400);
  }
  $('#tbFull').addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', setFullUI); document.addEventListener('webkitfullscreenchange', setFullUI);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stageEl.classList.contains('max')) { stageEl.classList.remove('max'); setFullUI(); } });

  /* ── travel ── */
  const travel = $('#travel');
  travel.addEventListener('input', () => { howStop(); setDrive(false); state.travel = +travel.value; $('#cycleBtn').setAttribute('aria-pressed', false); Bench.setTravel(state.travel / 1000); });
  $('#cycleBtn').addEventListener('click', (e) => { setDrive(false); const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); Bench.setCycle(on); if (!on) { travel.value = 0; state.travel = 0; } });

  let roT = 0;
  Bench.onFrame = (r, locked) => {
    const now = performance.now(); if (now - roT < 100) return; roT = now;
    $('#travelBox').classList.toggle('locked', locked); travel.disabled = locked; $('#cycleBtn').disabled = locked;
    const mm = (r.s * 1000); $('#travelVal').textContent = locked ? tr('locked') : `${mm > 0 ? '+' : ''}${mm.toFixed(0)} mm`;
    if (Bench.st.cycle || Bench.st.drive || how.on) travel.value = Math.round(mm);
    $('#driveBtn').disabled = locked;
  };
  Bench.onSelect = (id, quiet) => {
    $('#tbIsolate').disabled = !id;
    if (quiet) { closeDrawer(); return; }
    if (!id) { if ($('#tbIsolate').getAttribute('aria-pressed') === 'true') toggleTb('#tbIsolate', false); closeDrawer(); return; }
    if (state.side !== 'proc' && state.side !== 'bom' && state.side !== 'sys') setSide('proc');
    openDrawer(id);
  };
  Bench.onLabel = () => { if (!isFull() && window.innerWidth <= 1080 && !$('#drawer').hidden) $('#drawer').scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  /* ── "How it works" lesson ── */
  const how = { on: false, i: 0, t: 0, paused: false, raf: 0, last: 0, userSection: false, wasDriving: false };
  const scenes = () => HOW.common;
  function sceneText(sc) {
    const r = HOW.roles[state.sys.id];
    if (sc.k === 'arm' || sc.k === 'extra') return r[`${sc.k}_${LANG}`] || r[`${sc.k}_en`];
    return sc[LANG] || sc.en;
  }
  function showScene() {
    const list = scenes(); const sc = list[how.i]; const r = HOW.roles[state.sys.id];
    $('#howText').textContent = sceneText(sc);
    $('#howCount').textContent = `${how.i + 1} / ${list.length}`;
    $('#howPause').textContent = how.paused ? '▶' : '❚❚';
    const ids = sc.roles.flatMap((role) => r[role] || []);
    Bench.highlight(ids);
    Bench.setSection(!!sc.section || how.userSection);
  }
  function howStart() {
    if (how.on) return;
    stopPlay(); closeDrawer(); Bench.select(null, false, true);
    if (state.exploded || state.step) { state.exploded = false; $('#tbExplode').setAttribute('aria-pressed', false); state.step = 0; applyRemoval(); renderProc(); }
    if ($('#tbIsolate').getAttribute('aria-pressed') === 'true') toggleTb('#tbIsolate', false);
    Bench.setCycle(false); $('#cycleBtn').setAttribute('aria-pressed', false);
    how.userSection = $('#tbSection').getAttribute('aria-pressed') === 'true';
    how.wasDriving = Bench.st.drive; setDrive(false); Bench.setSpin(true);
    Object.assign(how, { on: true, i: 0, t: 0, paused: false, last: performance.now() });
    $('#how').hidden = false; stageEl.classList.add('how-on');
    showScene(); how.raf = requestAnimationFrame(howTick);
  }
  function howTick(now) {
    if (!how.on) return;
    const dt = Math.min(0.1, (now - how.last) / 1000); how.last = now;
    const list = scenes(); let sc = list[how.i];
    if (!how.paused) {
      how.t += dt;
      if (how.t > sc.dur) { how.i = (how.i + 1) % list.length; how.t = 0; sc = list[how.i]; showScene(); }
    }
    Bench.setTravel(sc.s(how.t));
    $('#howProg').style.width = `${((how.i + Math.min(1, how.t / sc.dur)) / list.length) * 100}%`;
    how.raf = requestAnimationFrame(howTick);
  }
  function howJump(d) { const n = scenes().length; how.i = (how.i + d + n) % n; how.t = 0; showScene(); }
  function howStop() {
    if (!how.on) return;
    how.on = false; cancelAnimationFrame(how.raf);
    $('#how').hidden = true; stageEl.classList.remove('how-on');
    Bench.highlight([]); Bench.setTravel(0); Bench.setSection(how.userSection); Bench.setSpin(false);
    if (how.wasDriving) setDrive(true);
  }
  $('#howBtn').addEventListener('click', howStart);
  $('#howStop').addEventListener('click', howStop);
  $('#howPrev').addEventListener('click', () => howJump(-1));
  $('#howNext').addEventListener('click', () => howJump(1));
  $('#howPause').addEventListener('click', () => { how.paused = !how.paused; $('#howPause').textContent = how.paused ? '▶' : '❚❚'; });

  /* ── diagram (exploded view with every part named) ── */
  function enterDiagram() {
    howStop(); stopPlay(); setDrive(false); Bench.setCycle(false);
    document.body.classList.add('diagram-mode'); $('#diagramHint').hidden = false;
    state.step = 0; toggleTb('#tbExplode', true); Bench.setAllNames(true);
    setTimeout(() => Bench.fit($('#viewport').clientWidth >= 700 ? 1.5 : 1.3), 950);
    setSide('bom');
  }
  function leaveDiagram() {
    if (!document.body.classList.contains('diagram-mode')) return;
    document.body.classList.remove('diagram-mode'); $('#diagramHint').hidden = true;
    Bench.setAllNames(false); toggleTb('#tbExplode', false); setSide('proc'); setDrive(true);
  }

  /* ── theory ── */
  function renderTheory() {
    const list = THEORY[LANG] || THEORY.en; const head = THEORY_HEAD[LANG] || THEORY_HEAD.en;
    $('#thToc').innerHTML = list.map((s, i) => `<a href="#theory" data-th="${s.id}">${i + 1}. ${esc(s.h)}</a>`).join('');
    $('#thList').innerHTML = list.map((s, i) => `<article class="panel th-card ${s.svg ? '' : 'nosvg'}" id="th-${s.id}">
      <div><h2><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.h)}</h2>
        ${(s.p || []).slice(0, s.id === 'parts' ? 0 : 9).map((x) => `<p>${esc(x)}</p>`).join('')}
        ${s.eq ? `<div class="th-eq">${esc(s.eq)}</div>` : ''}
        ${s.li ? `<ul>${s.li.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${s.id === 'parts' && s.p ? s.p.map((x) => `<p style="margin-top:10px">${esc(x)}</p>`).join('') : ''}
        ${s.table ? `<div class="scroll-x"><table class="th-table"><thead><tr><th>${head[0]}</th><th>${head[1]}</th></tr></thead><tbody>${s.table.map(([x, y]) => `<tr><td>${esc(x)}</td><td>${esc(y)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </div>
      ${s.svg ? `<div class="th-fig">${THEORY_SVG[s.svg].replace(/\{(\w+)\}/g, (m, k) => (THEORY_SVG_TX[LANG] || THEORY_SVG_TX.en)[k] || '')}</div>` : ''}
    </article>`).join('');
    $('#thToc').querySelectorAll('[data-th]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('th-' + el.dataset.th).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  }

  /* ── compare ── */
  function renderCompare() {
    const keys = ['comfort', 'handling', 'load', 'packaging', 'cost', 'simplicity'];
    const bar = (v) => `<div class="bar"><i>${[1, 2, 3, 4, 5].map((i) => `<b class="${i <= v ? 'on' : ''}"></b>`).join('')}</i><span>${v}</span></div>`;
    $('#cmpRatings').innerHTML = `<thead><tr><th>${tr('c_system')}</th>${keys.map((k) => `<th>${tr('c_' + k)}</th>`).join('')}</tr></thead><tbody>${SYSTEMS.map((s) => `<tr class="${s === state.sys ? 'cur' : ''}"><td class="sysn">${esc(sysName(s))}<small>${esc(sysAxle(s))}</small></td>${keys.map((k) => `<td>${bar(s.ratings[k])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('#cmpCards').innerHTML = SYSTEMS.map((s) => `<div class="cmp-card ${s === state.sys ? 'cur' : ''}"><h3>${esc(sysName(s))}</h3><small>${esc(sysAxle(s))}</small><dl>${keys.map((k) => `<dt>${tr('c_' + k)}</dt><dd>${bar(s.ratings[k])}</dd>`).join('')}</dl></div>`).join('');
  }

  /* ── routing ── */
  function route() {
    const v = (location.hash || '#bench').slice(1); const view = ['bench', 'diagram', 'theory', 'compare'].includes(v) ? v : 'bench';
    if (view !== 'bench') howStop();
    const prev = state.view; state.view = view;
    const sec = view === 'diagram' ? 'bench' : view;
    document.querySelectorAll('.view').forEach((s) => { s.hidden = s.id !== 'view-' + sec; });
    if (view === 'diagram' && Bench.built) enterDiagram();
    if (prev === 'diagram' && view !== 'diagram') leaveDiagram();
    if (view === 'theory') window.scrollTo(0, 0);
    document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.view === view));
    refreshCharts();
  }
  function refreshCharts() { /* charts removed; kept as a hook for theme/resize */ }
  window.addEventListener('hashchange', route);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(refreshCharts, 150); });

  /* ── boot ── */
  initMaterials();
  Bench.init($('#viewport'));
  Bench.setTheme(isDark());
  buildLang();
  buildSysbar();
  renderTheory();
  route();
  setSystem(store.get('sys') || SYSTEMS[0].id);
  setLang(store.get('lang') || 'en');
  route();
  window.SuspLab = { setSystem, go, state, setLang, howStart, howStop, toggleFull };
})();
