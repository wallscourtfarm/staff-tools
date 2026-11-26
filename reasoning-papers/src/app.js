/* Reasoning Papers: the page (topic ticks, paper preview, mark scheme, printing). */
(function () {
  const F = RP.F;
  const YEARS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6'];
  const PAPER_YEARS = ['Y3', 'Y4', 'Y5', 'Y6'];
  const AREAS = ['Number and Place Value', 'Number Facts', 'Addition and Subtraction', 'Multiplication and Division',
    'Fractions', 'Ratio and Proportion', 'Algebra', 'Geometry', 'Measures', 'Money', 'Time', 'Statistics'];
  const KEY = 'wfa_reasoning_papers_v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TOPIC = {};
  YEARS.forEach(y => (RP.TOPICS[y] || []).forEach(t => TOPIC[t.id] = t));

  let S = { year: 'Y4', ticks: {}, length: 'standard', seed: 1, view: 'paper', title: 'Reasoning', panel: true };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
  if (!PAPER_YEARS.includes(S.year)) S.year = 'Y4';
  let paper = [];        // current questions
  let save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

  const ready = id => (RP.byTopic[id] || []).length > 0;
  const ticked = () => Object.values(S.ticks).flat().filter(id => TOPIC[id] && ready(id) && YEARS.indexOf(TOPIC[id].year) <= YEARS.indexOf(S.year));
  const ctx = () => ({ year: S.year });

  /* ---------- topic panel ---------- */
  function topicBlock(y) {
    const list = RP.TOPICS[y] || [];
    const tk = new Set(S.ticks[y] || []);
    let h = '';
    for (const a of AREAS) {
      const items = list.filter(t => t.area === a);
      if (!items.length) continue;
      h += `<div class="ah"><span>${a}</span>${items.some(ready) ? `<button data-area="${y}|${a}">tick all</button>` : ''}</div>`;
      for (const t of items) {
        const ok = ready(t.id);
        h += `<label class="trow ${ok ? '' : 'off'}"><input type="checkbox" data-t="${t.id}" data-y="${y}" ${tk.has(t.id) && ok ? 'checked' : ''} ${ok ? '' : 'disabled'}>
          <span>${esc(t.text)} <span class="tc">${t.code ? esc(t.code) : (t.nc ? 'Curriculum' : 'School')}</span>${ok ? '' : ' <span class="soon">not ready yet</span>'}</span></label>`;
      }
    }
    return h;
  }
  function renderPanel() {
    const yi = YEARS.indexOf(S.year);
    const n = ticked().length;
    let h = `<button class="btn pri pclose" id="panelBtn2">Show the paper</button><div class="ptitle">What to include</div>
      <div class="psum">${n ? `${n} topic${n === 1 ? '' : 's'} ticked` : 'Tick the topics you have taught.'}
        <small>${paper.length ? `This paper: ${paper.length} questions, ${paper.reduce((a, q) => a + q.marks, 0)} marks` : ''}</small></div>
      <div class="prow"><label>Length</label><div class="pseg" id="len">
        ${[['short', 'Short'], ['standard', 'Standard'], ['full', 'Full (35)']].map(([k, l]) => `<button data-len="${k}" class="${S.length === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="prow"><label for="ttl">Cover title</label><input id="ttl" class="ttl" value="${esc(S.title)}" maxlength="40"></div>
      <div class="yh">Year ${S.year[1]} <button class="btn" data-all="${S.year}">Tick all</button><button class="btn" data-none="${S.year}">Clear</button></div>
      ${topicBlock(S.year)}`;
    for (let i = yi - 1; i >= 0; i--) {
      const y = YEARS[i], k = (S.ticks[y] || []).filter(ready).length;
      h += `<details class="ey"${k ? ' open' : ''}><summary><div class="yh">Year ${y[1]} (earlier year)${k ? ` <small>${k} ticked</small>` : ''}</div></summary>
        <div class="prow"><button class="btn" data-all="${y}">Tick all</button><button class="btn" data-none="${y}">Clear</button></div>${topicBlock(y)}</details>`;
    }
    $('#pbody').innerHTML = h;
  }

  /* ---------- paper building ---------- */
  function build(newSeed) {
    if (newSeed) S.seed = Math.floor(Math.random() * 2147483647);
    const ids = ticked();
    paper = [];
    try { paper = RP.buildPaper(ids, RP.LENGTHS[S.length], S.seed, ctx()); }
    catch (e) { console.error(e); alert('Something went wrong making the paper: ' + e.message); }
    save();
    renderPanel();
    renderPages();
  }

  /* ---------- pages ---------- */
  const markTxt = m => m === 1 ? '1 mark' : `${m} marks`;
  function qHTML(q, i, show) {
    let guide = '';
    if (show) {
      const g = [];
      if (q.marks === 2 && q.method) g.push('Award <b>2 marks</b> for the correct answer. Award <b>1 mark</b> for a correct method with no more than one arithmetic error.');
      else if (q.marks === 2) g.push('Award <b>2 marks</b> for a fully correct answer.');
      if (q.guide) g.push(q.guide);
      const t = TOPIC[q.topic];
      g.push(`<span style="color:#666">Assesses: ${t ? esc((t.code ? t.code + ' ' : '') + t.text) : q.topic}</span>`);
      guide = `<div class="guide">${g.join(' ')}</div>`;
    }
    return `<div class="q" data-i="${i}"><div class="qn">${i + 1}</div><div class="qb">${q.html(show)}</div><div class="qm">${markTxt(q.marks)}</div>${guide}
      <div class="qtools"><button data-swap="${i}" title="Swap this question for another one">&#8635; Swap</button></div></div>`;
  }
  const head = () => `<div class="ph"><span>Year ${S.year[1]} Mathematics: ${esc(S.title)}</span><span>Wallscourt Farm Academy</span></div>`;
  const foot = (p, n, show) => `<div class="pf"><span>${show ? 'Mark scheme' : ''}</span><b>${p}</b><span>${S.year}-${S.seed.toString(36).toUpperCase()}</span></div>`;

  function cover(total) {
    return `<div class="page"><div class="cover">
      <div class="ctop"><img src="../logo.png" alt="" onerror="this.style.display='none'"><span style="font-size:13pt">Wallscourt Farm Academy</span></div>
      <h1>Mathematics</h1><h2>Year ${S.year[1]}: ${esc(S.title)}</h2>
      <div class="fields"><span>Name</span><span></span><span>Class</span><span></span><span>Date</span><span></span></div>
      <div class="instr"><b>Instructions</b><ul>
        <li>You may not use a calculator.</li>
        <li>Answer every question you can. If you get stuck, go on to the next one.</li>
        <li>Write your answers in the boxes or on the lines.</li>
        <li>Where you see <b>Show your method</b>, write your working in the box. You may get a mark for it even if your answer is wrong.</li>
        <li>The number next to each question shows how many marks it is worth.</li>
      </ul></div>
      <div class="score">Total marks <span class="ab"></span> out of ${total}</div>
    </div>${foot('', 0, false)}</div>`;
  }

  // Measure questions at print width, then pack them onto A4 pages.
  function paginate(items) {
    const m = document.createElement('div');
    m.className = 'measure';
    m.innerHTML = `<div class="page">${head()}<div class="qs">${items.join('')}</div></div>`;
    document.body.appendChild(m);
    const pg = m.querySelector('.page');
    const mm = pg.getBoundingClientRect().width / 210;
    const avail = (297 - 13 - 15 - 6) * mm - m.querySelector('.ph').getBoundingClientRect().height - 8 * mm;
    const hs = [...m.querySelectorAll('.qs > *')].map(e => e.getBoundingClientRect().height);
    m.remove();
    const pages = [[]];
    let used = 0;
    hs.forEach((h, i) => {
      if (used + h > avail && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(items[i]);
      used += h;
    });
    return pages;
  }

  function summaryRows() {
    return paper.map((q, i) => {
      const t = TOPIC[q.topic];
      return `<tr><td class="c"><b>${i + 1}</b></td><td><span class="av">${q.answer === undefined ? 'See question' : q.answer}</span></td><td class="c">${q.marks}</td><td>${t ? esc(t.code || (t.nc ? 'Curriculum' : 'School')) : ''}</td><td>${t ? esc(t.text) : ''}</td></tr>`;
    });
  }
  const SUMHEAD = '<tr><th>Q</th><th>Answer</th><th>Marks</th><th>Code</th><th>What it assesses</th></tr>';
  function summaryPages() {
    const intro = `<div class="sumh">Mark scheme: answers</div><div class="sumn">Year ${S.year[1]} ${esc(S.title)}, paper ${S.year}-${S.seed.toString(36).toUpperCase()}. Total ${paper.reduce((a, q) => a + q.marks, 0)} marks. The pages after this table show each question with the answer drawn on it.</div>`;
    const rows = summaryRows();
    const m = document.createElement('div');
    m.className = 'measure';
    m.innerHTML = `<div class="page">${head()}<div class="si">${intro}</div><table class="sum">${SUMHEAD}${rows.join('')}</table></div>`;
    document.body.appendChild(m);
    const mm = m.querySelector('.page').getBoundingClientRect().width / 210;
    const full = (297 - 13 - 15 - 6) * mm - m.querySelector('.ph').getBoundingClientRect().height - 8 * mm;
    const introH = m.querySelector('.si').getBoundingClientRect().height;
    const trs = [...m.querySelectorAll('table.sum tr')];
    const headH = trs[0].getBoundingClientRect().height, hs = trs.slice(1).map(r => r.getBoundingClientRect().height);
    m.remove();
    const pages = [[]];
    let used = introH + headH;
    hs.forEach((h, i) => {
      if (used + h > full && pages[pages.length - 1].length) { pages.push([]); used = headH; }
      pages[pages.length - 1].push(rows[i]); used += h;
    });
    return pages.map((p, k) => `<div class="page">${head()}${k ? '' : intro}<table class="sum">${SUMHEAD}${p.join('')}</table>${foot('', 0, true)}</div>`).join('');
  }

  function renderPages() {
    const box = $('#pages');
    $('#empty').hidden = paper.length > 0;
    if (!paper.length) { box.innerHTML = ''; return; }
    const show = S.view === 'scheme';
    const items = paper.map((q, i) => qHTML(q, i, show));
    const pages = paginate(items);
    const total = paper.reduce((a, q) => a + q.marks, 0);
    let h = show ? summaryPages() : cover(total);
    pages.forEach((p, k) => h += `<div class="page">${head()}<div class="qs">${p.join('')}</div>${foot(k + 1, pages.length, show)}</div>`);
    box.innerHTML = h;
    $('#printBtn span').textContent = show ? 'Print scheme' : 'Print paper';
    fit();
  }
  function fit() {
    const v = $('#view'), w = v.clientWidth - 36, pagePx = 210 * 3.7795;
    const z = Math.min(1, w / pagePx);
    $('#pages').style.transform = z < 1 ? `scale(${z})` : '';
    $('#pages').style.marginBottom = z < 1 ? `-${(1 - z) * $('#pages').scrollHeight}px` : '';
  }

  /* ---------- popovers ---------- */
  function pop(html) {
    const p = $('#pop'); p.innerHTML = `<div class="card">${html}<div class="prow" style="justify-content:flex-end"><button class="btn pri" data-close>Close</button></div></div>`; p.hidden = false;
  }
  function yearPicker() {
    pop(`<h2>Which year group is the paper for?</h2><div class="yeargrid">${PAPER_YEARS.map(y => `<button data-year="${y}" class="${S.year === y ? 'on' : ''}">Year ${y[1]}</button>`).join('')}</div>
      <p style="font-size:15px;color:#456">You can also tick topics from earlier years.</p>`);
  }
  function help() {
    pop(`<h2>How to use</h2>
      <ol style="padding-left:20px;line-height:1.45">
        <li>Choose the <b>year group</b>.</li>
        <li><b>Tick the topics</b> you have taught. Earlier years' topics are further down the list.</li>
        <li>Choose a <b>length</b>: Short (about 10 marks), Standard (about 20) or Full (35 marks, like a SATs paper).</li>
        <li>Press <b>New paper</b> for a different set of questions. Point at a question and press <b>Swap</b> to change just that one.</li>
        <li><b>Paper</b> shows the test; <b>Mark scheme</b> shows the answers, drawn in red on each question, with a quick answer table first.</li>
        <li>Press <b>Print</b>. Print at <b>100% / Actual size</b> so drawings can be measured with a ruler or protractor.</li>
      </ol>
      <p style="font-size:15px;color:#456">Every question is made from the topic lists the year-group teams agreed in November 2026, plus the rest of the National Curriculum. Numbers are made fresh each time and every answer is checked by the tool. No pupil information is used or stored. Topics marked "not ready yet" have no questions yet.</p>`);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('button, [data-close]');
    if (e.target.id === 'pop') { $('#pop').hidden = true; return; }
    if (!b) return;
    if (b.dataset.close !== undefined) { $('#pop').hidden = true; return; }
    if (b.id === 'yearBtn') return yearPicker();
    if (b.id === 'helpBtn') return help();
    if (b.id === 'newBtn') return build(true);
    if (b.id === 'printBtn') { if (!paper.length) return; return window.print(); }
    if (b.id === 'panelBtn' || b.id === 'panelBtn2') { S.panel = !S.panel; $('#panel').classList.toggle('closed', !S.panel); save(); return fit(); }
    if (b.dataset.view) { S.view = b.dataset.view; document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x.dataset.view === S.view)); save(); return renderPages(); }
    if (b.dataset.year) { S.year = b.dataset.year; $('#yearBtn b').textContent = 'Year ' + S.year[1]; $('#pop').hidden = true; return build(false); }
    if (b.dataset.len) { S.length = b.dataset.len; return build(false); }
    if (b.dataset.all || b.dataset.none) {
      const y = b.dataset.all || b.dataset.none;
      S.ticks[y] = b.dataset.all ? (RP.TOPICS[y] || []).filter(t => ready(t.id)).map(t => t.id) : [];
      return build(false);
    }
    if (b.dataset.area) {
      const [y, a] = b.dataset.area.split('|');
      const ids = (RP.TOPICS[y] || []).filter(t => t.area === a && ready(t.id)).map(t => t.id);
      const cur = new Set(S.ticks[y] || []);
      const all = ids.every(id => cur.has(id));
      ids.forEach(id => all ? cur.delete(id) : cur.add(id));
      S.ticks[y] = [...cur];
      return build(false);
    }
    if (b.dataset.swap !== undefined) {
      const i = +b.dataset.swap;
      try { paper[i] = RP.swap(paper[i], Math.floor(Math.random() * 2147483647), ctx(), paper.map(q => q.gen.id)); }
      catch (err) { console.error(err); }
      renderPanel();
      return renderPages();
    }
  });
  document.addEventListener('change', e => {
    const c = e.target;
    if (c.dataset.t) {
      const y = c.dataset.y, cur = new Set(S.ticks[y] || []);
      c.checked ? cur.add(c.dataset.t) : cur.delete(c.dataset.t);
      S.ticks[y] = [...cur];
      build(false);
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'ttl') { S.title = e.target.value || 'Reasoning'; save(); clearTimeout(window._tt); window._tt = setTimeout(renderPages, 400); }
  });
  window.addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(fit, 150); });
  window.addEventListener('beforeprint', () => { $('#pages').style.transform = ''; $('#pages').style.marginBottom = ''; });
  window.addEventListener('afterprint', fit);

  /* ---------- start ---------- */
  $('#ver').textContent = RP.VERSION;
  $('#yearBtn b').textContent = 'Year ' + S.year[1];
  document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x.dataset.view === S.view));
  // test hook: ?test=Y4 ticks every topic up to Y4 (not saved); &seed=, &view=scheme
  const qp = new URLSearchParams(location.search);
  if (qp.get('test')) {
    const y = qp.get('test'); S.year = y; S.ticks = {}; S.length = qp.get('len') || 'full';
    YEARS.slice(0, YEARS.indexOf(y) + 1).forEach(yy => S.ticks[yy] = (RP.TOPICS[yy] || []).map(t => t.id));
    if (qp.get('seed')) S.seed = +qp.get('seed');
    if (qp.get('view')) S.view = qp.get('view');
    save = () => { };
    $('#yearBtn b').textContent = 'Year ' + S.year[1];
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('on', x.dataset.view === S.view));
  }
  if (window.innerWidth <= 900 && ticked().length) S.panel = false;
  $('#panel').classList.toggle('closed', !S.panel);
  build(false);
})();
