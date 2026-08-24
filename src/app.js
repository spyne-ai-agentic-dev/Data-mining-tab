/* ============================================================================
 * Data Mining — app (state machine + views).
 *
 * Flow:  upload  ->  analyzing  ->  results   (with an error fallback)
 * All dynamic content comes from DM_API (which is mock or backend per config).
 * The views only render; they never hold data.
 * ==========================================================================*/
(function () {
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mount = $('#content');

  const state = {
    name: 'upload',           // upload | analyzing | results | error
    scanId: null,
    results: null,
    sample: false,            // true = force bundled sample (offline demo)
    error: null,
    files:     { lead: false, activity: false },  // present? (for the UI)
    fileObjs:  {},            // real File objects for the API
    fileNames: {},            // display labels
  };

  /* ============================ UPLOAD ============================ */
  function viewUpload() {
    const cfg = window.DM_MOCK.uploadConfig;
    const zone = (z) => `
      <div class="drop ${state.files[z.id] ? 'done' : ''}" data-zone="${z.id}">
        <div class="dh"><span class="di">${ic(state.files[z.id] ? 'check_circle' : z.icon, 'ic ic-lg')}</span>
          <div><h4>${z.title}</h4><div class="req">${z.req}</div></div></div>
        ${state.files[z.id]
          ? `<div class="doneline">${ic('check_circle','ic ic-18')} ${state.fileNames[z.id] || z.doneLabel}</div>`
          : `<div class="fields"><div class="fl">Columns we read</div>
               <div class="field-tags">${z.columns.map(f => `<span class="ftag">${f}</span>`).join('')}</div></div>
             <div class="act"><button class="btn sec sm" data-upload="${z.id}">${ic('cloud_upload','ic ic-sm')} Choose file</button></div>`}
        <input type="file" accept=".csv,text/csv" data-file="${z.id}" hidden>
      </div>`;
    return `
      <div class="page-head"><div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div>
        <div class="page-desc">Upload your past lead data. Our AI reads your history, finds the customers already sitting in your CRM, and shows how many extra appointments you could book each month, on autopilot.</div></div></div>
      <div class="card up-hero"><div class="up-hero-inner">
        <div class="eyebrow">${cfg.eyebrow}</div>
        <h2>${cfg.title}</h2>
        <p>${cfg.blurb}</p>
        <div class="up-steps">${cfg.steps.map((s,i)=>`<span class="up-step"><span class="n">${i+1}</span> ${s}</span>`).join('')}</div>
      </div></div>
      <div class="drop-grid">${cfg.zones.map(zone).join('')}</div>
      <div class="up-foot">
        <button class="btn lg" id="analyzeBtn">${ic('scan','ic')} Analyze my data</button>
        <span class="trust">${ic('shield','ic ic-18')} ${cfg.trust}</span>
        <span style="flex:1"></span>
        <button class="reset-link" id="prefill">${ic('sparkle','ic ic-sm')} ${cfg.sampleLabel}</button>
      </div>`;
  }
  function pick(id) { const inp = $(`input[data-file="${id}"]`); if (inp) inp.click(); }
  function fmtSize(b) { return b > 1e6 ? (b/1e6).toFixed(1)+' MB' : Math.round(b/1e3)+' KB'; }
  function mountUpload() {
    $$('.drop[data-zone]').forEach(d => {
      const id = d.dataset.zone;
      if (!state.files[id]) { d.style.cursor = 'pointer'; d.onclick = (e) => { if (e.target.closest('[data-upload]')) return; pick(id); }; }
    });
    $$('[data-upload]').forEach(b => b.onclick = (e) => { e.stopPropagation(); pick(b.dataset.upload); });
    $$('input[data-file]').forEach(inp => inp.onchange = (e) => {
      const id = inp.dataset.file, f = e.target.files[0];
      if (f) { state.files[id] = true; state.fileObjs[id] = f; state.fileNames[id] = `${f.name} · ${fmtSize(f.size)}`; render(); }
    });
    $('#prefill').onclick   = () => analyze({ sample: true });
    $('#analyzeBtn').onclick = () => analyze({ sample: false });
  }

  function analyze(opts) { state.sample = !!(opts && opts.sample); state.name = 'analyzing'; render(); }

  /* ============================ ANALYZING ============================ */
  function viewAnalyzing() {
    return `<div class="an-wrap">
      <div class="an-orb">${ic('scan','ic ic-xl')}</div>
      <h2>Analyzing your data</h2>
      <div class="sub">Checking your file, reading 3 years of history, and matching every outbound play. This takes a few seconds.</div>
      <div class="an-prog"><div class="fill" id="anfill"></div></div>
      <div class="an-rows" id="anrows"></div>
    </div>`;
  }
  const anRows = (steps) => steps.map(r =>
    `<div class="an-row"><span class="tk"></span><div class="an-tx"><span class="an-l">${r[0]}</span>${r[3]?`<span class="an-d">${r[3]}</span>`:''}</div><span class="v ${r[2]||''}">${r[1]==='done'?'':r[1]}</span></div>`
  ).join('');

  async function mountAnalyzing() {
    try {
      const scan  = state.sample ? { scanId: 'sample' } : await window.DM_API.createScan(state.fileObjs);
      state.scanId = scan.scanId;
      const steps = state.sample ? window.DM_MOCK.steps : await window.DM_API.getScanSteps(state.scanId);
      $('#anrows').innerHTML = anRows(steps);
      animateSteps(async () => {
        state.results = state.sample ? window.DM_MOCK.results : await window.DM_API.getResults(state.scanId);
        state.name = 'results'; render();
      });
    } catch (err) { state.error = err.message || String(err); state.name = 'error'; render(); }
  }
  function animateSteps(done) {
    const rows = $$('#anrows .an-row'); if (!rows.length) return done();
    const cfg = window.DM_CONFIG.analyze; let k = 0;
    const HOLD = [0, 820, 820, 700, 640, 700, 760, 640, 640, 700]; // per-step dwell; validation steps linger
    rows[0].classList.add('active'); rows[0].querySelector('.tk').outerHTML = '<span class="spin"></span>';
    const step = () => {
      if (k < rows.length) {
        const rr = rows[k]; rr.classList.add('done');
        const s = rr.querySelector('.spin');
        if (s) s.outerHTML = '<span class="tk">' + ic('check','ic ic-sm') + '</span>';
        else rr.querySelector('.tk').innerHTML = ic('check','ic ic-sm');
        $('#anfill').style.width = Math.round((k+1)/rows.length*100) + '%';
        k++;
        if (k < rows.length) { const nx = rows[k]; nx.classList.add('active'); const tk = nx.querySelector('.tk'); if (tk) tk.outerHTML = '<span class="spin"></span>'; }
        setTimeout(step, k >= rows.length ? cfg.stepDone : (HOLD[k] || cfg.stepMin));
      } else { done(); }
    };
    setTimeout(step, cfg.startDelay);
  }

  /* ============================ RESULTS ============================ */
  const oppRows = (list) => list.map(o => `
    <tr><td><div class="oname"><span class="oi">${ic(o.ic,'ic ic-18')}</span><div><div class="onm">${o.n}</div><div class="odesc">${o.d}</div></div></div></td>
    <td class="r"><span class="lead-v num">${o.el}</span></td>
    <td class="r"><span class="appt-v num">${typeof o.ap==='number' ? '+'+o.ap.toFixed(1) : o.ap}</span></td>
    <td class="r"><span class="chip g"><span class="dot"></span>Ready</span></td></tr>`).join('');

  function viewResults(r) {
    const src = r.sources, srcTotal = src.reduce((a,s)=>a+s.v,0);
    const opp = r.opportunities;
    return `
      <div class="page-head">
        <div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div><div class="page-desc">${r.dealer.context}</div></div>
        <div class="spacer"></div>
        <button class="reset-link" id="rescan">${ic('refresh','ic ic-sm')} Re-run scan</button>
      </div>

      <div class="headline" data-reveal>
        <div class="free"><s>${r.headline.free.was}</s> <b>${r.headline.free.now}</b></div>
        <div class="hl-in">
          <div class="hl-eyebrow">${r.headline.eyebrow}</div>
          <div class="hl-big">${r.headline.big} <span class="u">${r.headline.bigUnit}</span></div>
          <div class="hl-sub">${r.headline.sub}</div>
          <div class="hl-row">${r.headline.metrics.map(m=>`<div class="m"><div class="v num"${m.accent?' style="color:var(--spyne-primary)"':''}>${m.v}</div><div class="k">${m.k}</div></div>`).join('')}</div>
          <div class="commit">${ic('handshake','ic ic-18')} <span>${r.headline.commit}</span></div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">1</span><h3>Your business at a glance</h3><span class="note">Measured from your files</span></div>
        <div class="kpi-strip">${r.profile.map(p=>`<div class="kpi"><div class="v num">${p.v}</div><div class="k">${p.k}</div>${p.d?`<div class="d">${p.d}</div>`:''}</div>`).join('')}</div>
        <div class="card pad" style="margin-top:12px">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px">Where your leads come from</div>
          <div class="src-bar">${src.map(s=>`<span style="width:${(s.v/srcTotal*100).toFixed(1)}%;background:${s.c}"></span>`).join('')}</div>
          <div class="src-legend">${src.map(s=>`<span><i style="background:${s.c}"></i>${s.n} · <b class="num">${s.v.toLocaleString()}</b> (${Math.round(s.v/srcTotal*100)}%)</span>`).join('')}</div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">2</span><h3>The simple math</h3><span class="note">How the money is made</span></div>
        <div class="card mathcard">
          <div class="funnel">${r.math.funnel.map((f,i,arr)=>`<div class="fstep"><div class="fv ${f.cls||''} num">${f.v}</div><div class="fk">${f.k}</div><div class="fsub">${f.sub}</div>${i<arr.length-1?`<span class="arw">${ic('arrow_right','ic ic-sm')}</span>`:''}</div>`).join('')}</div>
          <div class="eqn">${r.math.equation}</div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">3</span><h3>Your 12-month plan</h3><span class="note">${r.ramp.note}</span></div>
        <div class="ramp-wrap">
          <div class="card chart">
            <div class="chart-head"><h4>${r.ramp.title}</h4>
              <div class="chart-legend">${r.ramp.legend.map(l=>`<span><i style="background:${l.warn?'var(--warning-ink)':l.color};${l.warn?'opacity:.6':''}"></i>${l.label}</span>`).join('')}</div></div>
            <div class="bars" id="bars"></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">${r.ramp.captions.map(c=>`<span>${c}</span>`).join('')}</div>
          </div>
          <div class="card roi-card">
            <h4>${r.payoff.title}</h4>
            ${r.payoff.rows.map(row=>`<div class="roi-row"><span>${row.k}</span><span class="rv ${row.money?'money':''} num">${row.v}</span></div>`).join('')}
            <div class="roi-foot">${r.payoff.foot}</div>
          </div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">4</span><h3>Opportunities we found</h3><span class="note">${opp.note}</span></div>
        <div class="card" style="overflow:hidden">
          <table class="otable">
            <thead><tr><th>Opportunity</th><th class="r">Eligible customers</th><th class="r">Extra appts / mo</th><th class="r">Status</th></tr></thead>
            <tbody>
              ${opp.groups.map(g => `<tr class="grp"><td colspan="4">${g.label}</td></tr>` + oppRows(g.items)).join('')}
              <tr><td><div class="oname"><span class="oi lock">${ic('lock','ic ic-18')}</span><div><div class="onm">${opp.locked.n}</div><div class="odesc">${opp.locked.d}</div></div></div></td><td class="r"><span class="lead-v" style="color:var(--text-3)">${opp.locked.el}</span></td><td class="r"><span style="color:var(--text-3)">${opp.locked.ap}</span></td><td class="r"><span class="chip n">Locked</span></td></tr>
            </tbody>
            <tfoot><tr><td>${opp.footer.label}</td><td class="r num">${opp.footer.eligible} <span style="color:var(--text-3);font-weight:500">${opp.footer.eligibleNote}</span></td><td class="r"><span class="num" style="color:var(--spyne-primary)">${opp.footer.appts}</span></td><td class="r"><span style="font-weight:500;color:var(--text-3);font-size:12px">${opp.footer.apptsNote}</span></td></tr></tfoot>
          </table>
        </div>
      </div>

      <p style="font-size:12.5px;color:var(--text-3);margin:10px 2px 0;line-height:1.55;max-width:92ch">${r.reconciliation}</p>

      <div class="finalcta" data-reveal>
        <span style="display:flex;width:44px;height:44px;border-radius:11px;background:rgba(255,255,255,.15);align-items:center;justify-content:center">${ic('rocket','ic ic-lg')}</span>
        <div><h3>${r.cta.title}</h3><p>${r.cta.desc}</p></div>
        <div class="spacer"></div>
        <button class="btn o">${ic('download','ic ic-sm')} ${r.cta.secondary}</button>
        <button class="btn">${ic('rocket','ic ic-sm')} ${r.cta.primary}</button>
      </div>`;
  }
  function mountResults(r) {
    const ramp = r.ramp, max = Math.max(...ramp.values), commitH = ramp.baseline / max * 100;
    $('#bars').innerHTML = `<div class="baseline" style="bottom:${commitH}%"><span class="bl-lab">${ramp.baselineLabel}</span></div>` +
      ramp.values.map((v,i)=>`<div class="bar-col"><div class="bar" style="height:0" data-h="${(v/max*100).toFixed(1)}"><span class="bv num">${v.toFixed(0)}</span></div><span class="bar-x">M${i+1}</span></div>`).join('');
    requestAnimationFrame(() => { setTimeout(() => { $$('#bars .bar').forEach((b,i) => { setTimeout(() => b.style.height = b.dataset.h + '%', i*45); }); }, 80); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold:.06, rootMargin:'0px 0px -5% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    $('#rescan').onclick = () => {
      Object.assign(state, { name:'upload', results:null, scanId:null, sample:false, files:{lead:false,activity:false}, fileObjs:{}, fileNames:{} });
      render();
    };
  }

  /* ============================ ERROR ============================ */
  function viewError() {
    return `<div class="an-wrap">
      <div class="an-orb" style="background:var(--error-soft);color:var(--error)">${ic('info','ic ic-xl')}</div>
      <h2>We hit a snag</h2>
      <div class="sub">${state.error || 'Something went wrong while analyzing your data.'}</div>
      <div style="margin-top:20px"><button class="btn" id="retry">${ic('refresh','ic ic-sm')} Try again</button></div>
    </div>`;
  }
  function mountError() { $('#retry').onclick = () => { state.name = 'upload'; render(); }; }

  /* ============================ RENDER ============================ */
  function render() {
    if (state.name === 'upload')        { mount.innerHTML = viewUpload();               mountUpload(); }
    else if (state.name === 'analyzing'){ mount.innerHTML = viewAnalyzing();            mountAnalyzing(); }
    else if (state.name === 'results')  { mount.innerHTML = viewResults(state.results); mountResults(state.results); }
    else                                { mount.innerHTML = viewError();                mountError(); }
    window.scrollTo(0, 0);
  }
  render();
})();
