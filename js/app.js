'use strict';
/* LeadSite V2 — interface */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { esc, money } = LV;

const S = {
  cfg: LV.loadConfig(),
  crm: LV.loadCRM(),
  results: [],
  ctx: {},
  sel: new Set(),
  filter: 'all',
  drawer: { id: null, tab: 'info', list: [] },
  queue: null,
};

const CATS = ['Barbearia', 'Salão de beleza', 'Clínica de estética', 'Manicure', 'Restaurante', 'Hamburgueria', 'Pizzaria', 'Lanchonete', 'Açaíteria', 'Padaria', 'Cafeteria', 'Academia', 'Studio de pilates', 'Pet shop', 'Clínica veterinária', 'Dentista', 'Clínica médica', 'Fisioterapia', 'Psicólogo', 'Oficina mecânica', 'Auto elétrica', 'Lava jato', 'Borracharia', 'Advogado', 'Contabilidade', 'Imobiliária', 'Loja de roupas', 'Ótica', 'Floricultura', 'Escola de idiomas', 'Autoescola', 'Marcenaria', 'Vidraçaria', 'Serralheria', 'Dedetizadora', 'Buffet', 'Fotógrafo', 'Tatuagem', 'Chaveiro', 'Assistência técnica de celular'];

/* ---------------- util ---------------- */
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), 2600);
}
const saveCRM = () => { LV.saveCRM(S.crm); renderKpis(); };
const stageLabel = (id) => LV.STAGES.find((s) => s.id === id)?.label || id;
const daysSince = (iso) => (iso ? (Date.now() - new Date(iso)) / 864e5 : Infinity);
const isDue = (l) => (l.stage === 'abordado' || l.stage === 'followup') && daysSince(l.lastContact) >= (S.cfg.followupDias || 2);
const getLead = (id) => S.crm[id] || S.results.find((r) => r.id === id);

/* ---------------- KPIs ---------------- */
function renderKpis() {
  const all = Object.values(S.crm);
  const ganhos = all.filter((l) => l.stage === 'convertido');
  const abord = all.filter((l) => l.stage !== 'base').length;
  const receita = ganhos.reduce((a, l) => a + Number(l.valor || S.cfg.preco || 0), 0);
  const mrr = ganhos.reduce((a, l) => a + Number(l.mensal ?? S.cfg.mensalidade ?? 0), 0);
  const conv = abord ? Math.round((ganhos.length / abord) * 100) : 0;
  const recebido = all.filter((l) => l.pagamento === 'confirmado').reduce((a, l) => a + Number(l.valorPago ?? l.valor ?? 0), 0);
  $('#kpis').innerHTML = [
    ['No CRM', all.length], ['Abordados', abord], ['Conversão', conv + '%'], ['Fechado', money(receita)], ['Recebido', money(recebido)], ['Recorrente/mês', money(mrr)],
  ].map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${k}</span></div>`).join('');
  const due = all.filter(isDue).length;
  $('#navFollow').hidden = !due; $('#navFollow').textContent = due;
}

/* ---------------- rotas ---------------- */
function route() {
  const v = (location.hash.match(/#\/(\w+)/) || [])[1] || 'inicio';
  $$('.view').forEach((s) => (s.hidden = s.id !== 'view-' + v));
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === v));
  if (v === 'inicio' && !route._jv) { route._jv = true; JVUI.montar($('#view-inicio'), { nav: (d) => (location.hash = '#/' + d), modo: 'site' }); }
  if (v === 'metas') renderMetas();
  if (v === 'insta') renderInsta();
  if (v === 'pipeline') renderPipeline();
  if (v === 'config') renderConfig();
  if (v === 'buscar') $('#demoBanner').hidden = !!S.cfg.apiKey || !S.results.length;
}

/* ---------------- busca ---------------- */
async function doSearch(e) {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const max = Number(fd.max);
  const ctx = { categoria: fd.categoria.trim(), cidade: fd.cidade.trim(), bairro: fd.bairro.trim() };
  const query = `${ctx.categoria} em ${ctx.bairro ? ctx.bairro + ', ' : ''}${ctx.cidade}`;
  const btn = $('#btnSearch'); btn.disabled = true; btn.textContent = 'Buscando...';
  $('#emptySearch').hidden = true;
  $('#results').innerHTML = `<div class="loading">Minerando "${esc(query)}"...</div>`;
  try {
    let places;
    if (S.cfg.apiKey) {
      places = await LV.searchPlaces({ apiKey: S.cfg.apiKey, query, max, onPage: (n) => ($('#results .loading').textContent = `Minerando... ${n} encontrados`) });
    } else {
      await new Promise((r) => setTimeout(r, 500));
      places = LV.demoPlaces(ctx.categoria, ctx.cidade, max);
    }
    S.ctx = ctx;
    S.results = places.map((p) => LV.normalize(p, ctx)).sort((a, b) => b.score - a.score);
    S.sel.clear(); S.filter = 'all';
    $$('#filters button').forEach((b) => b.classList.toggle('on', b.dataset.f === 'all'));
    LV.saveLast({ ctx, results: S.results });
    renderResults();
    $('#demoBanner').hidden = !!S.cfg.apiKey;
  } catch (err) {
    $('#results').innerHTML = `<div class="loading">❌ ${esc(err.message)}<br><small>Confira a chave e se a "Places API (New)" está ativada no Google Cloud.</small></div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Buscar';
  }
}

function filtered() {
  const f = S.filter;
  return S.results.filter((l) =>
    f === 'semsite' ? l.siteTipo !== 'tem' :
    f === 'quente' ? l.temp === 'quente' :
    f === 'celular' ? l.mobile :
    f === 'novos' ? !S.crm[l.id] : true);
}

const SITE_TAG = { sem: ['t-sem', 'Sem site'], social: ['t-social', 'Só Instagram/link'], tem: ['t-tem', 'Tem site'] };

function cardHTML(l) {
  const inCrm = S.crm[l.id];
  const [sc, st] = SITE_TAG[l.siteTipo];
  return `<article class="card ${S.sel.has(l.id) ? 'sel' : ''} ${inCrm ? 'incrm' : ''}" data-id="${esc(l.id)}">
    <div class="ctop">
      <input type="checkbox" class="pick" ${S.sel.has(l.id) ? 'checked' : ''} title="Selecionar">
      <h3 data-act="open">${esc(l.nome)}</h3>
      <span class="score s-${l.temp}" title="Score de conversão">${l.score}</span>
    </div>
    <div class="tags">
      <span class="tag t-${l.temp}">${l.temp[0].toUpperCase() + l.temp.slice(1)}</span>
      <span class="tag ${sc}">${st}</span>
      <span class="tag">${esc(l.categoria)}</span>
      ${inCrm ? `<span class="tag t-crm">CRM · ${stageLabel(inCrm.stage)}</span>` : ''}
    </div>
    <div class="line"><span class="ic stars">★</span><span><b>${l.rating || '–'}</b> · ${l.reviews} avaliações</span></div>
    <div class="line"><span class="ic">☎</span><span>${esc(l.telefone || 'sem telefone')} ${l.mobile ? '<span class="tag t-sem" style="background:var(--wa2);color:var(--wa)">WhatsApp</span>' : ''}</span></div>
    <div class="line addr"><span class="ic">⌖</span><span>${esc(l.endereco)}</span></div>
    ${l.why.length ? `<div class="why">Por que é bom: <b>${esc(l.why.join(' · '))}</b></div>` : ''}
    <div class="cact">
      <button class="btn wa" data-act="wa" ${l.wa ? '' : 'disabled'}>WhatsApp</button>
      <button class="btn" data-act="crm">${inCrm ? 'Abrir ficha' : '+ CRM'}</button>
      <button class="btn" data-act="site">Site</button>
    </div>
  </article>`;
}

function renderResults() {
  const list = filtered();
  $('#resultsBar').hidden = !S.results.length;
  const sem = S.results.filter((l) => l.siteTipo !== 'tem').length;
  const hot = S.results.filter((l) => l.temp === 'quente').length;
  $('#counts').innerHTML = `<b>${hot}</b> quentes · <b>${sem}</b> sem site · <b>${S.results.length}</b> total`;
  $('#results').innerHTML = list.length ? list.map(cardHTML).join('') : (S.results.length ? '<div class="loading">Nenhum lead neste filtro.</div>' : '');
  $('#selAll').checked = list.length && list.every((l) => S.sel.has(l.id));
}

/* ---------------- CRM ---------------- */
function addToCRM(l, stage = 'base', silent) {
  if (S.crm[l.id]) return S.crm[l.id];
  const lead = { ...l, stage, notas: [], hist: [{ stage, at: LV.now() }], createdAt: LV.now(), valor: S.cfg.preco, mensal: S.cfg.mensalidade };
  S.crm[l.id] = lead; saveCRM();
  LV.webhook(S.cfg, 'lead.created', lead);
  if (!silent) toast(`${l.nome} enviado ao CRM`);
  return lead;
}

function setStage(id, stage) {
  const l = S.crm[id]; if (!l || l.stage === stage) return;
  l.stage = stage; l.hist = [...(l.hist || []), { stage, at: LV.now() }];
  if (stage === 'abordado' || stage === 'followup') l.lastContact = LV.now();
  saveCRM(); LV.webhook(S.cfg, 'lead.stage', l);
}

function markContacted(l) {
  const lead = addToCRM(l, 'abordado', true);
  if (lead.stage === 'base') setStage(lead.id, 'abordado');
  else if (lead.stage === 'abordado' && daysSince(lead.lastContact) >= 1) setStage(lead.id, 'followup');
  lead.lastContact = LV.now();
  lead.toques = (lead.toques || 0) + 1;
  saveCRM(); LV.webhook(S.cfg, 'lead.contacted', lead);
}

/* prepara fotos/avaliações reais + link curto; salva no CRM */
const preparing = new Map();
function prepareLead(l) {
  if (!preparing.has(l.id)) {
    preparing.set(l.id, LV.prepare(S.cfg, l).then((r) => { if (S.crm[l.id]) { Object.assign(S.crm[l.id], { fotos: l.fotos, avaliacoes: l.avaliacoes, horarios: l.horarios, resumo: l.resumo, enriched: l.enriched, short: l.short, shortKey: l.shortKey }); saveCRM(); } return r; })
      .finally(() => preparing.delete(l.id)));
  }
  return preparing.get(l.id);
}

/* abre o WhatsApp já com o link curto (a janela abre no clique para não ser bloqueada) */
async function openWA(l, text) {
  if (!l.wa) return toast('Lead sem telefone');
  const before = LV.linkFor(S.cfg, l);
  const win = window.open('', '_blank');
  if (win) win.document.write('<p style="font:16px system-ui;padding:40px;color:#555">Preparando a prévia e abrindo o WhatsApp…</p>');
  try { await prepareLead(l); } catch { /* segue com o link longo */ }
  const final = (typeof text === 'function' ? text() : text).split(before).join(LV.linkFor(S.cfg, l));
  const url = LV.waLink(l, final);
  if (win) win.location.href = url; else window.open(url, '_blank');
  markContacted(l);
}

/* ---------------- robô vendedor (roda no seu PC) ---------------- */
const roboBase = () => (S.cfg.roboUrl || 'http://localhost:3210').replace(/\/$/, '');
async function syncRobo(silencioso) {
  try {
    const [st, leads] = await Promise.all([fetch(roboBase() + '/status').then((r) => r.json()), fetch(roboBase() + '/leads').then((r) => r.json())]);
    const ordem = LV.STAGES.map((s) => s.id);
    let novos = 0, atual = 0;
    for (const b of leads) {
      if (!b.stage) continue;
      const cur = S.crm[b.id];
      const extra = { resumoRobo: b.resumoRobo, conversa: b.conversa, etapaRobo: b.etapaRobo, linkRobo: b.linkPrevia, humano: b.humano };
      if (!cur) {
        const { stage, linkPrevia, ...rest } = b;
        S.crm[b.id] = { ...rest, ...extra, why: [], stage, notas: [], hist: [{ stage, at: LV.now() }], createdAt: b.abordadoEm || LV.now(), lastContact: b.abordadoEm, valor: S.cfg.preco, mensal: S.cfg.mensalidade, robo: true };
        novos++;
      } else {
        Object.assign(cur, extra, { fotos: cur.fotos || b.fotos, avaliacoes: cur.avaliacoes || b.avaliacoes, horarios: cur.horarios || b.horarios, robo: true });
        if (!['convertido', 'perdido'].includes(cur.stage) && ordem.indexOf(b.stage) > ordem.indexOf(cur.stage)) { setStage(cur.id, b.stage); atual++; }
        if (b.stage === 'perdido' && cur.stage !== 'perdido' && cur.stage !== 'convertido') { setStage(cur.id, 'perdido'); atual++; }
      }
    }
    saveCRM();
    $('#roboStatus').textContent = `🤖 ${st.conectado ? 'online' : 'WhatsApp desconectado'}${st.pausado ? ' · pausado' : ''} · hoje ${st.hoje}/${st.cota} · ${st.responderam} responderam · ${st.prontos} p/ fechar`;
    if (!$('#view-pipeline').hidden) renderPipeline();
    if (!silencioso || novos || atual) toast(`Robô: ${novos} novos, ${atual} atualizados`);
  } catch {
    $('#roboStatus').textContent = '🤖 offline';
    if (!silencioso) toast('Robô não encontrado. Ele está ligado neste computador?');
  }
}

/* ---------------- pipeline ---------------- */
function renderPipeline() {
  const q = ($('#crmSearch').value || '').toLowerCase();
  const all = Object.values(S.crm).filter((l) => !q || `${l.nome} ${l.cidade} ${l.telefone} ${l.categoria}`.toLowerCase().includes(q));
  const due = Object.values(S.crm).filter(isDue);
  const base = Object.values(S.crm).filter((l) => l.stage === 'base' && l.wa);
  const hoje = Object.values(S.crm).filter((l) => l.agenda && new Date(l.agenda).toDateString() === new Date().toDateString());
  $('#todo').innerHTML = `
    <div class="panel"><span class="n">${base.length}</span><p>leads na Base prontos para a 1ª abordagem</p><button class="btn wa" data-q="base" ${base.length ? '' : 'disabled'}>Abordar</button></div>
    <div class="panel"><span class="n" style="color:var(--hot)">${due.length}</span><p>precisam de follow-up hoje</p><button class="btn wa" data-q="due" ${due.length ? '' : 'disabled'}>Fazer follow-up</button></div>
    <div class="panel"><span class="n">${hoje.length}</span><p>reuniões marcadas para hoje</p></div>`;
  $('#kanban').innerHTML = LV.STAGES.map((st) => {
    const items = all.filter((l) => l.stage === st.id).sort((a, b) => b.score - a.score);
    const tot = items.reduce((a, l) => a + Number(l.valor || 0), 0);
    return `<div class="col" data-stage="${st.id}">
      <h3>${st.label} <small>${items.length}${st.id === 'convertido' && tot ? ' · ' + money(tot) : ''}</small></h3>
      ${items.map((l) => `<div class="kc ${l.temp}" draggable="true" data-id="${esc(l.id)}">
        <button class="kx" title="${st.id === 'perdido' ? 'Remover do CRM' : 'Não fechou → Perdido'}">×</button>
        <b>${esc(l.nome)}</b>${l.oficial ? ' <span class="tag t-crm" style="font-size:10px">site no ar</span>' : ''}
        <small>${l.score} · ${esc(l.categoria)} · ${esc(l.cidade)}</small>
        <small>${esc(l.telefone || '—')}</small>
        ${isDue(l) ? '<span class="due">⏰ follow-up pendente</span>' : ''}
        ${l.agenda ? `<small>📅 ${new Date(l.agenda).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small>` : ''}
      </div>`).join('')}
    </div>`;
  }).join('');
}

function bindKanban() {
  const k = $('#kanban');
  k.addEventListener('click', (e) => {
    const c = e.target.closest('.kc'); if (!c) return;
    if (e.target.closest('.kx')) {
      const l = S.crm[c.dataset.id]; if (!l) return;
      if (l.stage === 'perdido') { delete S.crm[l.id]; saveCRM(); toast(`${l.nome} removido do CRM`); }
      else { setStage(l.id, 'perdido'); toast(`${l.nome} → Perdido`); }
      renderPipeline(); return;
    }
    const ids = $$('.kc', k).map((x) => x.dataset.id);
    openDrawer(c.dataset.id, ids);
  });
  k.addEventListener('dragstart', (e) => { const c = e.target.closest('.kc'); if (!c) return; c.classList.add('dragging'); e.dataTransfer.setData('text/plain', c.dataset.id); });
  k.addEventListener('dragend', (e) => e.target.closest('.kc')?.classList.remove('dragging'));
  k.addEventListener('dragover', (e) => { const col = e.target.closest('.col'); if (!col) return; e.preventDefault(); $$('.col', k).forEach((c) => c.classList.toggle('over', c === col)); });
  k.addEventListener('drop', (e) => {
    const col = e.target.closest('.col'); if (!col) return; e.preventDefault();
    setStage(e.dataTransfer.getData('text/plain'), col.dataset.stage); renderPipeline();
  });
  $('#todo').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const all = Object.values(S.crm);
    if (b.dataset.q === 'base') startQueue(all.filter((l) => l.stage === 'base' && l.wa).sort((a, b) => b.score - a.score));
    else startQueue(all.filter(isDue), 'followup1');
  });
}

/* ---------------- ficha (drawer) ---------------- */
function openDrawer(id, list) {
  const l = getLead(id); if (!l) return;
  if (!S.crm[id]) addToCRM(l);
  S.drawer = { id, tab: S.drawer.tab || 'info', list: list || [id] };
  $('#drawer').hidden = $('#drawerBg').hidden = false;
  renderDrawer();
  warmLead(S.crm[id]);
}

/* busca fotos/avaliações e link curto em segundo plano e atualiza a ficha */
function warmLead(l) {
  if (!l) return;
  const before = LV.linkFor(S.cfg, l);
  prepareLead(l).then(() => {
    const after = LV.linkFor(S.cfg, l);
    swapLinks(before, after);
    if (S.drawer.id === l.id && !$('#drawer').hidden && S.drawer.tab === 'site' && !document.activeElement?.dataset?.sx) renderDrawer();
  }).catch(() => { /* ok */ });
}
function closeDrawer() {
  $('#drawer').hidden = $('#drawerBg').hidden = true;
  if (!$('#view-pipeline').hidden) renderPipeline();
  if (!$('#view-buscar').hidden) renderResults();
}

function renderDrawer() {
  const l = S.crm[S.drawer.id]; if (!l) return closeDrawer();
  const { list, tab } = S.drawer; const i = list.indexOf(l.id);
  $('#dScore').className = 'score s-' + l.temp; $('#dScore').textContent = l.score;
  $('#dTemp').className = 'tag t-' + l.temp; $('#dTemp').textContent = l.temp;
  $('#dName').textContent = l.nome;
  $('#dPos').textContent = list.length > 1 ? `${i + 1} / ${list.length}` : '';
  $('#dPrev').disabled = i <= 0; $('#dNext').disabled = i >= list.length - 1;
  $$('#dTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  $('#dBody').innerHTML = TABS[tab](l);
  if (tab === 'site') refreshPreview(l);
}

function refreshPreview(l) {
  const f = $('#sitePrev'); if (!f) return;
  const box = f.parentElement;
  const fit = () => { if (box.clientWidth) box.style.setProperty('--s', Math.min(1, box.clientWidth / 1280)); };
  fit(); requestAnimationFrame(fit);
  if (!box._ro && window.ResizeObserver) { box._ro = new ResizeObserver(fit); box._ro.observe(box); }
  const y = f.contentWindow?.scrollY || 0;
  f.srcdoc = LSite.page(LV.siteData(S.cfg, l), { exported: false });
  f.onload = () => { try { f.contentWindow.scrollTo(0, y); } catch { /* ok */ } };
}
let prevTimer;
const refreshSoon = (l) => { clearTimeout(prevTimer); prevTimer = setTimeout(() => refreshPreview(l), 450); };

/* troca o link antigo pelo novo dentro dos textos abertos na ficha */
function swapLinks(before, after) {
  if (before === after) return;
  $$('#dBody textarea, #qMsg').forEach((t) => { if (t.value.includes(before)) t.value = t.value.split(before).join(after); });
}

/* reduz o logo enviado para caber no link da prévia (quadrado de 112px, WebP) */
function shrinkLogo(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const S = 112, c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
      const k = Math.min(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
      x.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/webp', .82));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function parseSv(txt) {
  return txt.split('\n').map((x) => x.split('|').map((s) => s.trim())).filter((a) => a[0]).map((a) => [a[0], a[1] || '', a[2] || '']);
}

/* efetivar: mesmo site, sem prévia, com link oficial; lead vira Convertido */
async function efetivar(l) {
  const btn = $('[data-do="efetivar"]'); if (btn) { btn.disabled = true; btn.textContent = 'Efetivando…'; }
  try {
    await LV.officialLink(S.cfg, l);
    l.efetivado = LV.now();
    if (l.stage !== 'convertido') setStage(l.id, 'convertido');
    if (l.robo) fetch(roboBase() + '/convertido/' + encodeURIComponent(l.id), { method: 'POST' }).catch(() => { /* robô desligado */ });
    saveCRM(); LV.webhook(S.cfg, 'site.efetivado', l);
    toast('Site efetivado! Agora é oficialmente do cliente.');
  } catch (e) {
    toast('Erro ao efetivar: ' + e.message);
  } finally { if (S.drawer.tab === 'site') renderDrawer(); }
}

async function baixarZip(l) {
  const btn = $('[data-do="baixarZip"]'); if (btn) { btn.disabled = true; btn.textContent = 'Gerando arquivos…'; }
  try {
    try { await prepareLead(l); } catch { /* segue */ }
    const d = { ...LV.siteData(S.cfg, l), x: 1 };
    const P = LSite.plan(d);
    const urls = P.photos.slice(0, 8);
    const files = []; const local = [];
    for (let i = 0; i < urls.length; i++) {
      try {
        const r = await fetch(urls[i], { mode: 'cors' }); if (!r.ok) throw 0;
        const buf = new Uint8Array(await r.arrayBuffer());
        const name = `img/foto-${i + 1}.jpg`; files.push({ name, data: buf }); local.push(name);
      } catch { local.push(urls[i]); }
    }
    d.ph = local; // mesma ordem de fotos, agora dentro do site
    if (d.lg && /^https?:/.test(d.lg)) {
      try { const r = await fetch(d.lg, { mode: 'cors' }); if (!r.ok) throw 0; files.push({ name: 'img/logo.png', data: new Uint8Array(await r.arrayBuffer()) }); d.lg = 'img/logo.png'; } catch { /* mantém o link */ }
    }
    const html = LSite.page(d, { exported: true });
    const slug = (l.sx?.dn || l.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';
    const leia = `SITE ${l.sx?.dn || l.nome}\r\n\r\nComo colocar no ar:\r\n1. Acesse https://app.netlify.com/drop e arraste esta pasta.\r\n2. Em Domain settings, conecte o dominio do cliente (registro.br).\r\n\r\nArquivos: index.html (site completo) e pasta img/ (fotos).\r\nGerado pelo LeadSite V2 em ${new Date().toLocaleString('pt-BR')}.\r\n`;
    const enc = new TextEncoder();
    const blob = zip([{ name: 'index.html', data: enc.encode(html) }, ...files, { name: 'COMO-PUBLICAR.txt', data: enc.encode(leia) }]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `site-${slug}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Arquivos baixados: site-${slug}.zip (${files.length} fotos embutidas)`);
  } catch (e) {
    toast('Erro ao gerar os arquivos: ' + e.message);
  } finally { if (btn) { btn.disabled = false; btn.textContent = '⬇ Baixar arquivos (.zip)'; } }
}

/* zip simples (sem compressão) para entregar index.html + fotos */
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) { let c = (crc ^ buf[i]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ -1) >>> 0;
}
function zip(files) {
  const parts = [], central = []; let offset = 0; const enc = new TextEncoder();
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(h, name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(c, name);
    offset += 30 + name.length + size;
  }
  const csize = central.reduce((a, p) => a + p.byteLength, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, e], { type: 'application/zip' });
}

const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

const TABS = {
  info: (l) => `
    <div class="panel kv">
      <span>Categoria</span><div>${esc(l.categoria)} ${l.tipoGoogle && l.tipoGoogle !== l.categoria ? `<span class="tag">${esc(l.tipoGoogle)}</span>` : ''}</div>
      <span>Cidade</span><div>${esc(l.cidade)}</div>
      <span>Telefone</span><div>${esc(l.telefone || '—')} ${l.telDigits ? `<a class="btn sm" href="tel:${l.telDigits}">Ligar</a>` : ''} ${l.wa ? `<button class="btn sm wa" data-do="wa">WhatsApp</button>` : ''}</div>
      <span>Endereço</span><div>${esc(l.endereco)}</div>
      <span>Avaliação</span><div><span class="stars">★</span> ${l.rating || '–'} · ${l.reviews} avaliações</div>
      <span>Site</span><div>${l.site ? `<a href="${esc(l.site)}" target="_blank" rel="noopener">${esc(l.site)}</a>` : '<span class="tag t-sem">Sem site</span>'}</div>
      <span>Google</span><div><a class="btn sm" href="${esc(l.maps)}" target="_blank" rel="noopener">Ver no Google Maps</a></div>
      <span>Por que pontuou</span><div class="muted">${esc(l.why.join(' · ') || '—')}</div>
    </div>
    <div class="panel kv">
      <span>Etapa</span><div class="seg" data-seg="stage">${LV.STAGES.map((s) => `<button data-v="${s.id}" class="${l.stage === s.id ? 'on' : ''}">${s.label}</button>`).join('')}</div>
      <span>Descobrir o dono</span><div>
        <a class="btn sm" target="_blank" rel="noopener" href="${google(`"${l.nome}" ${l.cidade} proprietário OR dono OR sócio`)}">Google</a>
        <a class="btn sm" target="_blank" rel="noopener" href="${google(`site:instagram.com "${l.nome}" ${l.cidade}`)}">Instagram</a>
        <a class="btn sm" target="_blank" rel="noopener" href="${google(`"${l.nome}" ${l.cidade} CNPJ`)}">CNPJ / sócios</a>
        <a class="btn sm" target="_blank" rel="noopener" href="${google(`site:linkedin.com "${l.nome}" ${l.cidade}`)}">LinkedIn</a>
      </div>
      <span>Nome do dono</span><div><input data-field="dono" value="${esc(l.dono || '')}" placeholder="Ex.: Carlos"></div>
      <span>Toques</span><div class="muted">${l.toques || 0} mensagem(ns) · último ${l.lastContact ? new Date(l.lastContact).toLocaleString('pt-BR') : 'nunca'}</div>
      <span>Histórico</span><div class="hist">${(l.hist || []).map((h) => `${stageLabel(h.stage)} (${new Date(h.at).toLocaleDateString('pt-BR')})`).join(' → ')}</div>
    </div>
    ${l.conversa?.length ? `<div class="panel"><b>🤖 Conversa do robô</b> <span class="muted small">${esc(l.etapaRobo || '')}${l.humano ? ' · você assumiu' : ''}</span>
      ${l.resumoRobo ? `<p class="small" style="margin:6px 0 10px"><b>Resumo:</b> ${esc(l.resumoRobo)}</p>` : ''}
      <div class="chat">${l.conversa.map((m) => `<div class="bub ${m.papel === 'eu' ? 'me' : ''}"><small>${new Date(m.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small>${esc(m.texto)}</div>`).join('')}</div>
      ${l.wa ? `<a class="btn wa sm" style="margin-top:10px" href="https://wa.me/${l.wa}" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>` : ''}</div>` : ''}
    <div><button class="btn danger sm" data-do="remove">Remover do CRM</button></div>`,

  notas: (l) => `
    <div class="panel"><textarea id="noteTxt" rows="3" placeholder="Ex.: falou com a recepcionista, dono chega às 14h"></textarea>
      <div class="row actions"><div class="spacer"></div><button class="btn primary" data-do="note">Adicionar nota</button></div></div>
    ${(l.notas || []).slice().reverse().map((n) => `<div class="note"><small>${new Date(n.at).toLocaleString('pt-BR')}</small>${esc(n.t)}</div>`).join('') || '<p class="muted">Nenhuma nota ainda.</p>'}`,

  roteiros: (l) => {
    const key = S.drawer.tpl || LV.autoTemplate(l);
    return `
    <label class="f"><span>Roteiro</span><select id="tplSel">${Object.entries(LV.TEMPLATES).map(([k, t]) => `<option value="${k}" ${k === key ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
    <textarea id="tplTxt" rows="12">${esc(msgFor(l, key))}</textarea>
    <div class="row actions"><button class="btn" data-do="copy">Copiar</button><div class="spacer"></div><button class="btn wa big" data-do="sendTpl" ${l.wa ? '' : 'disabled'}>Enviar no WhatsApp</button></div>`;
  },

  objecoes: (l) => LV.OBJECOES.map(([o, r], i) => `
    <details class="obj"><summary>“${esc(o)}”</summary><p>${esc(r)}</p>
      <button class="btn sm" data-do="copyObj" data-i="${i}">Copiar</button>
      <button class="btn sm wa" data-do="sendObj" data-i="${i}" ${l.wa ? '' : 'disabled'}>Responder no WhatsApp</button></details>`).join(''),

  site: (l) => {
    const sx = l.sx || {};
    const link = LV.linkFor(S.cfg, l);
    const P = LSite.plan(LV.siteData(S.cfg, l));
    const nichos = LS_NICHE_ORDER.map((k) => `<option value="${k}" ${sx.k === k ? 'selected' : ''}>${k}</option>`).join('');
    const fontes = LS_FONTS.map((f, i) => `<option value="${i}" ${String(sx.f) === String(i) ? 'selected' : ''}>${f.d}</option>`).join('');
    const tops = [['full', 'Foto de fundo'], ['split', 'Texto + colagem'], ['center', 'Centralizado + carrossel'], ['editorial', 'Editorial (nome gigante)']]
      .map(([v, t]) => `<option value="${v}" ${sx.hl2 === v ? 'selected' : ''}>${t}</option>`).join('');
    const svTxt = (sx.sv || []).map((s) => s.filter(Boolean).join(' | ')).join('\n');
    const status = l.enriched ? `✅ ${l.fotos?.length || 0} fotos próprias, ${l.avaliacoes?.length || 0} avaliações reais${l.horarios?.length ? ', horários' : ''}${l.resumo ? ' e descrição' : ''} do Google${(l.fotos?.length || 0) < 6 ? ' (completado com banco de imagens)' : ''}` : (S.cfg.apiKey ? '⏳ Buscando fotos e avaliações reais do Google…' : 'ℹ️ Sem chave do Google: usando fotos do banco de imagens');
    return `
    <div class="panel sitebar">
      <div><b>Prévia premium</b> <span class="muted small">· ${esc(P.nk)} · direção <b>${esc(P.dirLabel)}</b> · ${esc(P.font.d)}</span><br><span class="small muted">${status}</span></div>
      <div class="spacer"></div>
      <button class="btn" data-do="reroll" title="Gera outra combinação de layout, cores e fontes">🎲 Outro visual</button>
      <a class="btn" href="${esc(LV.demoLink(S.cfg, l))}" target="_blank" rel="noopener">Abrir</a>
    </div>
    <div class="frame"><iframe id="sitePrev" title="Prévia do site"></iframe></div>
    <div class="panel">
      <label class="f"><span>Link para enviar ${l.short && link === l.short ? '(curto ✅)' : '(será encurtado ao enviar)'}</span><input readonly value="${esc(link)}" onclick="this.select()"></label>
      <div class="row actions"><button class="btn" data-do="copyLink">Copiar link</button><div class="spacer"></div>
      <button class="btn wa" data-do="sendSite" ${l.wa ? '' : 'disabled'}>Enviar prévia no WhatsApp</button></div>
    </div>
    <details class="panel edit" open><summary><b>Personalizar o site</b> <span class="muted small">(tudo opcional — em branco usa o automático)</span></summary>
      <div class="logo-row">
        <div class="logo-prev">${sx.lg ? `<img src="${esc(sx.lg)}" alt="">` : `<span class="muted small">${l.siteTipo === 'tem' ? 'ícone do site ou selo gerado' : 'selo gerado'}</span>`}</div>
        <label class="f" style="flex:1"><span>Logo do cliente — cole o link da imagem (no Instagram/site: botão direito na logo → "Copiar endereço da imagem") ou envie o arquivo</span>
          <input data-sx="lg" value="${esc(sx.lg && !sx.lg.startsWith('data:') ? sx.lg : '')}" placeholder="${sx.lg?.startsWith('data:') ? 'arquivo enviado ✔' : 'https://…/logo.png'}"></label>
        <label class="btn sm file">Enviar arquivo<input type="file" id="logoFile" accept="image/*" hidden></label>
        ${sx.lg ? '<button class="btn sm" data-do="rmLogo">Remover</button>' : ''}
      </div>
      <div class="row"><label class="f"><span>Nome exibido</span><input data-sx="dn" value="${esc(sx.dn || '')}" placeholder="${esc(l.nome)}"></label>
        <label class="f"><span>Instagram</span><input data-sx="ig" value="${esc(sx.ig || '')}" placeholder="@perfil"></label></div>
      <label class="f"><span>Título principal</span><input data-sx="hl" value="${esc(sx.hl || '')}" placeholder="${esc(P.head)}"></label>
      <label class="f"><span>Subtítulo</span><input data-sx="sub" value="${esc(sx.sub || '')}" placeholder="${esc(P.sub)}"></label>
      <label class="f"><span>Texto "Sobre"</span><textarea data-sx="ab" rows="3" placeholder="${esc(P.about.join(' '))}">${esc(sx.ab || '')}</textarea></label>
      <label class="f"><span>Serviços e preços — um por linha: Nome | descrição | preço</span><textarea data-sx="sv" rows="5" placeholder="${esc(P.svc.map((s) => s.slice(0, 2).join(' | ') + ' | R$ 50').join('\n'))}">${esc(svTxt)}</textarea></label>
      <div class="row">
        <label class="f"><span>Nicho</span><select data-sx="k"><option value="">Automático</option>${nichos}</select></label>
        <label class="f"><span>Direção visual</span><select data-sx="dir"><option value="">Automática</option>${Object.entries(LSite.DIRS).map(([k, v]) => `<option value="${k}" ${sx.dir === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label class="f"><span>Topo</span><select data-sx="hl2"><option value="">Automático</option>${tops}</select></label>
        <label class="f"><span>Fonte</span><select data-sx="f"><option value="">Automática</option>${fontes}</select></label>
        <label class="f"><span>Cor de destaque</span><input type="color" data-sx="ac" value="${esc(sx.ac || P.pal.ac)}"></label>
      </div>
      <div class="row actions"><button class="btn sm" data-do="resetSx">Voltar ao automático</button></div>
    </details>
    <div class="panel efetivar">
      <h3 style="margin:0 0 6px">${l.oficial ? '✅ Site efetivado — é oficialmente do cliente' : 'Efetivar o site do cliente'}</h3>
      <p class="muted" style="margin:0 0 10px">${l.oficial
        ? 'Este é o mesmo site da prévia, sem a faixa de prévia e liberado para aparecer no Google. Envie o link para o dono.'
        : 'Mantém <b>exatamente o mesmo site</b> que você está vendo e só tira o que é de prévia (a faixa "Prévia por…" e o bloqueio do Google). Gera o link oficial e move o lead para <b>Convertido</b>.'}</p>
      <label class="chk"><input type="checkbox" id="crOn" ${sx.cr === 0 ? '' : 'checked'}> Incluir "Site por ${esc(S.cfg.empresa || S.cfg.meuNome || 'você')}" no rodapé</label>
      ${l.oficial ? `
      <label class="f" style="margin-top:10px"><span>Link oficial do site${l.oficialKey !== LV.siteKey(S.cfg, l) ? ' — <b style="color:#c0262d">você editou o site depois; clique em Atualizar</b>' : ''}</span><input readonly value="${esc(l.oficial)}" onclick="this.select()"></label>
      <div class="row actions">
        <button class="btn" data-do="copyOficial">Copiar</button>
        <a class="btn" href="${esc(l.oficial)}" target="_blank" rel="noopener">Abrir</a>
        ${l.oficialKey !== LV.siteKey(S.cfg, l) ? '<button class="btn primary" data-do="efetivar">Atualizar link oficial</button>' : ''}
        <div class="spacer"></div>
        <button class="btn wa big" data-do="sendOficial" ${l.wa ? '' : 'disabled'}>Entregar ao dono no WhatsApp</button>
      </div>` : `
      <div class="row actions"><button class="btn primary big" data-do="efetivar">✅ Efetivar site</button></div>`}
      <details class="small muted" style="margin-top:8px"><summary>Quer colocar no domínio próprio do cliente (ex.: barbeariaking.com.br)?</summary>
        <p>Baixe os arquivos do mesmo site (com as fotos embutidas), arraste a pasta em <b>app.netlify.com/drop</b> e conecte o domínio registrado no registro.br.</p>
        <button class="btn sm" data-do="baixarZip">⬇ Baixar arquivos (.zip)</button></details>
    </div>`;
  },

  venda: (l) => `
    <div class="panel kv">
      <span>Valor do site (R$)</span><div><input type="number" data-field="valor" value="${esc(l.valor ?? S.cfg.preco)}"></div>
      <span>Mensalidade (R$)</span><div><input type="number" data-field="mensal" value="${esc(l.mensal ?? S.cfg.mensalidade)}"></div>
      <span>Plano</span><div class="seg" data-seg="plano">${['Site Essencial', 'Site + Google', 'Site + Tráfego'].map((p) => `<button data-v="${p}" class="${l.plano === p ? 'on' : ''}">${p}</button>`).join('')}</div>
      <span>Status</span><div class="seg" data-seg="status">${[['convertido', 'Ganho ✅'], ['perdido', 'Perdido'], ['agendado', 'Em negociação']].map(([v, t]) => `<button data-v="${v}" class="${l.stage === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <span>Pagamento</span><div class="seg" data-seg="pagamento">${[['pendente', 'Pendente'], ['confirmado', 'Confirmado 💰'], ['estornado', 'Estornado']].map(([v, t]) => `<button data-v="${v}" class="${(l.pagamento || '') === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <span>Valor recebido (R$)</span><div><input type="number" data-field="valorPago" value="${esc(l.valorPago ?? l.valor ?? S.cfg.preco)}">${l.pagoEm ? `<small class="muted">confirmado em ${new Date(l.pagoEm).toLocaleString('pt-BR')}</small>` : ''}</div>
    </div>
    <p class="muted small" style="margin:0">Só pagamento <b>confirmado</b> entra no faturamento recebido e nas metas de faturamento.</p>
    <label class="f"><span>Proposta</span><textarea id="propTxt" rows="12">${esc(msgFor(l, 'proposta'))}</textarea></label>
    <div class="row actions"><button class="btn" data-do="copyProp">Copiar</button><div class="spacer"></div><button class="btn wa big" data-do="sendProp" ${l.wa ? '' : 'disabled'}>Enviar proposta</button></div>`,

  agendar: (l) => {
    const v = l.agenda ? toLocalInput(l.agenda) : '';
    return `
    <div class="panel kv">
      <span>Data e hora</span><div><input type="datetime-local" data-field="agenda" value="${v}"></div>
      <span>Duração</span><div><select data-field="duracao">${[15, 30, 45, 60].map((m) => `<option value="${m}" ${(l.duracao || 30) == m ? 'selected' : ''}>${m} min</option>`).join('')}</select></div>
    </div>
    ${l.agenda ? `<div class="row actions">
      <a class="btn" target="_blank" rel="noopener" href="${gcalLink(l)}">Adicionar ao Google Agenda</a>
      <button class="btn" data-do="ics">Baixar .ics</button><div class="spacer"></div>
      <button class="btn wa" data-do="confirm" ${l.wa ? '' : 'disabled'}>Enviar confirmação</button></div>` : '<p class="muted">Escolha data e hora — o lead vai para <b>Agendado</b> automaticamente.</p>'}`;
  },
};

function msgFor(l, key) {
  const v = l.dono ? { nome: l.nome } : {};
  let m = LV.message(S.cfg, l, key, v);
  if (l.dono) m = m.replace(/^Oi(,|!)/, `Oi, ${l.dono}$1`);
  return m;
}
const toLocalInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const calFmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function gcalLink(l) {
  const a = new Date(l.agenda), b = new Date(a.getTime() + (l.duracao || 30) * 6e4);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Reunião — ' + l.nome)}&dates=${calFmt(a)}/${calFmt(b)}&details=${encodeURIComponent(`Tel: ${l.telefone}\nPrévia: ${LV.demoLink(S.cfg, l)}`)}&location=${encodeURIComponent(l.endereco)}`;
}
function icsFile(l) {
  const a = new Date(l.agenda), b = new Date(a.getTime() + (l.duracao || 30) * 6e4);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LeadSite V2//PT', 'BEGIN:VEVENT', `UID:${l.id}@leadsite`, `DTSTAMP:${calFmt(new Date())}`, `DTSTART:${calFmt(a)}`, `DTEND:${calFmt(b)}`, `SUMMARY:Reunião — ${l.nome}`, `DESCRIPTION:Tel: ${l.telefone}`, `LOCATION:${l.endereco.replace(/,/g, '\\,')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

const copy = (t) => navigator.clipboard.writeText(t).then(() => toast('Copiado!'));

function bindDrawer() {
  $('#dClose').onclick = closeDrawer; $('#drawerBg').onclick = closeDrawer;
  const go = (step) => { const { list, id } = S.drawer; const next = list[list.indexOf(id) + step]; if (!next) return; S.drawer.tpl = null; openDrawer(next, list); };
  $('#dPrev').onclick = () => go(-1);
  $('#dNext').onclick = () => go(1);
  $('#dTabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.drawer.tab = b.dataset.t; renderDrawer(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#queue').hidden) closeQueue(); else if (!$('#drawer').hidden) closeDrawer(); } });

  const body = $('#dBody');
  const setSx = (l, t) => {
    const k = t.dataset.sx; l.sx = l.sx || {};
    let v = t.value;
    if (k === 'sv') v = parseSv(v);
    if (k === 'f') v = v === '' ? null : Number(v);
    if (v === '' || v == null) delete l.sx[k]; else l.sx[k] = v;
    saveCRM(); refreshSoon(l);
  };
  body.addEventListener('input', (e) => { if (e.target.dataset.sx && e.target.tagName !== 'SELECT') setSx(S.crm[S.drawer.id], e.target); });
  body.addEventListener('change', (e) => {
    const l = S.crm[S.drawer.id]; const t = e.target;
    if (t.dataset.sx) { setSx(l, t); if (t.tagName === 'SELECT') renderDrawer(); return; }
    if (t.id === 'logoFile' && t.files[0]) {
      shrinkLogo(t.files[0]).then((url) => { l.sx = l.sx || {}; l.sx.lg = url; saveCRM(); renderDrawer(); toast('Logo aplicado'); })
        .catch(() => toast('Não consegui ler a imagem'));
      return;
    }
    if (t.id === 'crOn') { l.sx = l.sx || {}; if (t.checked) delete l.sx.cr; else l.sx.cr = 0; saveCRM(); renderDrawer(); return; }
    if (t.id === 'tplSel') { S.drawer.tpl = t.value; renderDrawer(); return; }
    const f = t.dataset.field; if (!f) return;
    l[f] = t.type === 'number' ? Number(t.value) : t.type === 'datetime-local' ? (t.value ? new Date(t.value).toISOString() : '') : t.value;
    if (f === 'agenda' && l.agenda && ['base', 'abordado', 'followup'].includes(l.stage)) setStage(l.id, 'agendado');
    saveCRM(); LV.webhook(S.cfg, 'lead.updated', l);
    if (['agenda', 'valor', 'mensal', 'dono'].includes(f)) renderDrawer();
  });
  body.addEventListener('click', (e) => {
    const l = S.crm[S.drawer.id];
    const seg = e.target.closest('.seg button');
    if (seg) {
      const kind = seg.parentElement.dataset.seg;
      if (kind === 'stage' || kind === 'status') setStage(l.id, seg.dataset.v);
      if (kind === 'plano') { l.plano = seg.dataset.v; saveCRM(); }
      if (kind === 'pagamento') {
        const v = seg.dataset.v;
        l.pagamento = v;
        if (v === 'confirmado') { l.pagoEm = LV.now(); if (l.valorPago == null) l.valorPago = Number(l.valor ?? S.cfg.preco); if (l.stage !== 'convertido') setStage(l.id, 'convertido'); }
        else l.pagoEm = null; // pendente/estornado não contam como recebido
        saveCRM(); LV.webhook(S.cfg, 'lead.pagamento', l);
        toast(v === 'confirmado' ? `💰 Pagamento de ${l.nome} confirmado!` : `Pagamento: ${v}`);
      }
      if ((kind === 'stage' || kind === 'status') && seg.dataset.v === 'convertido' && !l.pagamento) { l.pagamento = 'pendente'; saveCRM(); }
      renderDrawer(); return;
    }
    const b = e.target.closest('[data-do]'); if (!b) return;
    const obj = LV.OBJECOES[b.dataset.i];
    const acts = {
      wa: () => openWA(l, msgFor(l, LV.autoTemplate(l))),
      remove: () => { if (confirm(`Remover ${l.nome} do CRM?`)) { delete S.crm[l.id]; saveCRM(); closeDrawer(); } },
      note: () => { const t = $('#noteTxt').value.trim(); if (!t) return; (l.notas = l.notas || []).push({ t, at: LV.now() }); saveCRM(); LV.webhook(S.cfg, 'lead.note', l); },
      copy: () => copy($('#tplTxt').value),
      sendTpl: () => openWA(l, $('#tplTxt').value),
      copyObj: () => copy(obj[1]),
      sendObj: () => openWA(l, obj[1]),
      copyLink: async () => { toast('Gerando link curto…'); try { await prepareLead(l); } catch { /* ok */ } copy(LV.linkFor(S.cfg, l)); renderDrawer(); },
      sendSite: () => openWA(l, msgFor(l, LV.autoTemplate(l))),
      reroll: () => { l.sx = l.sx || {}; l.sx.v = (l.sx.v || 0) + 1; ['hl2', 'f', 'ac', 'dir'].forEach((k) => delete l.sx[k]); saveCRM(); },
      resetSx: () => { const keep = l.sx?.cr; l.sx = keep === 0 ? { cr: 0 } : {}; saveCRM(); },
      efetivar: () => efetivar(l),
      baixarZip: () => baixarZip(l),
      rmLogo: () => { if (l.sx) delete l.sx.lg; saveCRM(); },
      copyOficial: () => copy(l.oficial),
      sendOficial: () => openWA(l, msgFor(l, 'entrega')),
      copyProp: () => copy($('#propTxt').value),
      sendProp: () => { openWA(l, $('#propTxt').value); if (l.stage !== 'convertido') setStage(l.id, 'agendado'); },
      ics: () => LV.download(`reuniao-${l.nome.replace(/\W+/g, '-')}.ics`, icsFile(l), 'text/calendar'),
      confirm: () => openWA(l, msgFor(l, 'confirmacao')),
    };
    acts[b.dataset.do]?.();
    if (!['copy', 'copyObj', 'copyLink', 'copyProp', 'ics', 'sendTpl', 'sendObj', 'efetivar', 'baixarZip', 'copyOficial', 'sendOficial', 'sendSite', 'wa', 'sendProp', 'confirm'].includes(b.dataset.do)) renderDrawer();
  });
}

/* ---------------- fila de abordagem ---------------- */
function startQueue(leads, tplKey) {
  leads = leads.filter((l) => l.wa);
  if (!leads.length) return toast('Nenhum lead com telefone na seleção');
  S.queue = { leads, i: 0, tpl: tplKey || 'auto' };
  $('#qTpl').innerHTML = `<option value="auto">Automático (pela situação do site)</option>` + Object.entries(LV.TEMPLATES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('');
  $('#qTpl').value = S.queue.tpl;
  $('#queue').hidden = $('#queueBg').hidden = false;
  renderQueue();
}
function renderQueue() {
  const q = S.queue; const l = q.leads[q.i];
  if (!l) { closeQueue(); toast(`Fila concluída: ${q.leads.length} leads`); return; }
  const crm = S.crm[l.id];
  $('#qPos').textContent = `${q.i + 1} de ${q.leads.length}`;
  $('#qLead').innerHTML = `<b>${esc(l.nome)}</b> <span class="score s-${l.temp}">${l.score}</span> <span class="tag ${SITE_TAG[l.siteTipo][0]}">${SITE_TAG[l.siteTipo][1]}</span><br><small class="muted">${esc(l.telefone)} · ★ ${l.rating} (${l.reviews}) ${crm ? '· ' + stageLabel(crm.stage) : ''}</small>`;
  const key = q.tpl === 'auto' ? LV.autoTemplate(l) : q.tpl;
  const lead = crm || l;
  $('#qMsg').value = msgFor(lead, key);
  const before = LV.linkFor(S.cfg, lead);
  prepareLead(lead).then(() => { if (S.queue && S.queue.leads[S.queue.i] === l) swapLinks(before, LV.linkFor(S.cfg, lead)); }).catch(() => { /* ok */ });
}
function closeQueue() {
  $('#queue').hidden = $('#queueBg').hidden = true; S.queue = null;
  renderResults(); if (!$('#view-pipeline').hidden) renderPipeline();
}
function bindQueue() {
  $('#qClose').onclick = closeQueue; $('#queueBg').onclick = closeQueue;
  $('#qTpl').onchange = (e) => { S.queue.tpl = e.target.value; renderQueue(); };
  $('#qSkip').onclick = () => { S.queue.i++; renderQueue(); };
  $('#qSend').onclick = () => { const l = S.queue.leads[S.queue.i]; openWA(S.crm[l.id] || l, $('#qMsg').value); S.queue.i++; renderQueue(); };
}

/* ---------------- metas ---------------- */
function renderMetas() {
  const m = JV.progressoMeta();
  const fmt = (v) => JV.fmtMeta(m, v);
  $('#metaDesc').textContent = `Meta ${JV.NOME_PERIODO[m.periodo]} · medindo ${JV.NOME_METRICA[m.metrica]}`;
  const marcos = [25, 50, 75, 100];
  $('#metaBig').innerHTML = `
    <div class="mb-v"><b>${fmt(m.atual)}</b> <span>de ${fmt(m.valor)}</span></div>
    <div class="mb-bar"><i style="width:${m.pct}%"></i>${marcos.map((p) => `<u style="left:${p}%" class="${m.pct >= p ? 'ok' : ''}"><em>${p}%</em></u>`).join('')}</div>
    <div class="mb-r"><span><b>${Math.round(m.pct)}%</b> atingido</span><span>faltam <b>${fmt(m.falta)}</b></span></div>
    <p class="muted small">Período: ${m.inicio.toLocaleDateString('pt-BR')} a ${new Date(m.fim - 1).toLocaleDateString('pt-BR')}. ${m.metrica === 'recebido' ? 'Conta só pagamentos confirmados (estornos saem da conta).' : ''}</p>`;
  // celebração discreta ao passar de um marco (uma vez por marco e período)
  const chave = `lv2_marco_${m.metrica}_${m.periodo}_${m.inicio.toISOString().slice(0, 10)}`;
  const ja = Number(localStorage.getItem(chave) || 0);
  const marco = marcos.filter((p) => m.pct >= p).at(-1) || 0;
  if (marco > ja) { localStorage.setItem(chave, marco); toast(marco === 100 ? '🏆 Meta batida! Parabéns!' : `🎉 ${marco}% da meta atingido!`); $('#metaBig').classList.add('celebra'); setTimeout(() => $('#metaBig').classList.remove('celebra'), 1600); }
  $('#metaHist').innerHTML = JV.historicoMeta(6).map((h, i) => `<div class="mh"><span>${i === 0 ? 'Atual' : h.inicio.toLocaleDateString('pt-BR')}</span><div class="mh-bar"><i style="width:${h.pct}%"></i></div><b>${fmt(h.atual)}</b><small>${Math.round(h.pct)}%${h.pct >= 100 ? ' ✅' : ''}</small></div>`).join('');
  const ant = JV.metas().anteriores;
  $('#metaAnt').innerHTML = ant.length ? ant.slice().reverse().map((a) => `<div class="mh"><span>${new Date(a.criadaEm).toLocaleDateString('pt-BR')} → ${new Date(a.encerradaEm).toLocaleDateString('pt-BR')}</span><small>${JV.NOME_METRICA[a.metrica]} · ${JV.NOME_PERIODO[a.periodo]}</small><b>${JV.fmtMeta(a, a.valor)}</b></div>`).join('') : '<p class="muted small">Nenhuma meta anterior.</p>';
}
function bindMetas() {
  const f = $('#metaForm');
  $('#btnNovaMeta').onclick = () => { const m = JV.metas().atual; f.elements.metrica.value = m.metrica; f.elements.periodo.value = m.periodo; f.elements.valor.value = m.valor; f.hidden = false; };
  $('#btnCancMeta').onclick = () => (f.hidden = true);
  f.onsubmit = (e) => {
    e.preventDefault();
    const ms = JV.metas();
    ms.anteriores.push({ ...ms.atual, encerradaEm: new Date().toISOString() }); // nada é apagado
    ms.atual = { metrica: f.elements.metrica.value, periodo: f.elements.periodo.value, valor: Number(f.elements.valor.value), criadaEm: new Date().toISOString() };
    JV.salvarMetas(ms); f.hidden = true; renderMetas(); toast('Nova meta salva');
  };
}

/* ---------------- configurações ---------------- */
function renderConfig() {
  $('#jvFalar').checked = JV.cfg().falarAoIniciar;
  const f = $('#cfgForm');
  ['apiKey', 'meuNome', 'empresa', 'meuWhats', 'preco', 'mensalidade', 'followupDias', 'webhook', 'demoBase', 'roboUrl'].forEach((k) => (f.elements[k].value = S.cfg[k] ?? ''));
  f.elements.encurtar.checked = S.cfg.encurtar !== false;
  $('#tplEditor').innerHTML = Object.entries(LV.TEMPLATES).map(([k, t]) =>
    `<div class="tplrow"><b>${t.label}</b><textarea rows="5" data-tpl="${k}">${esc(S.cfg.templates?.[k] || t.text)}</textarea></div>`).join('');
}
function bindConfig() {
  const f = $('#cfgForm');
  $('#jvFalar').onchange = (e) => { JV.salvar({ falarAoIniciar: e.target.checked }); toast(e.target.checked ? 'Saudação falada ligada' : 'Saudação falada desligada'); };
  $('#jvCfgBtn').onclick = () => { location.hash = '#/inicio'; setTimeout(() => JVUI.abrirConfig(), 300); };
  f.onsubmit = (e) => {
    e.preventDefault();
    const c = { ...S.cfg };
    ['apiKey', 'meuNome', 'empresa', 'meuWhats', 'webhook', 'demoBase', 'roboUrl'].forEach((k) => (c[k] = f.elements[k].value.trim()));
    ['preco', 'mensalidade', 'followupDias'].forEach((k) => (c[k] = Number(f.elements[k].value) || 0));
    c.encurtar = f.elements.encurtar.checked;
    c.templates = {};
    $$('[data-tpl]').forEach((t) => { if (t.value.trim() !== LV.TEMPLATES[t.dataset.tpl].text) c.templates[t.dataset.tpl] = t.value; });
    S.cfg = c; LV.saveConfig(c); renderKpis(); toast('Configurações salvas');
  };
  $('#btnTestHook').onclick = async () => {
    if (!S.cfg.webhook) return toast('Salve uma URL de webhook primeiro');
    const ok = await LV.webhook(S.cfg, 'test', { id: 'teste', nome: 'Lead de teste', telefone: '(63) 99999-0000', cidade: 'Palmas, TO', categoria: 'Barbearia', score: 90, temp: 'quente', stage: 'base', rating: 4.9, reviews: 120, endereco: '', maps: '' });
    toast(ok ? 'Enviado! Confira no seu n8n/Make/planilha.' : 'Falhou ao enviar');
  };
  $('#btnBackup').onclick = () => LV.download(`leadsite-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ cfg: { ...S.cfg, apiKey: '' }, crm: S.crm }, null, 2), 'application/json');
  $('#fileRestore').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (d.crm) { S.crm = { ...S.crm, ...d.crm }; saveCRM(); }
      if (d.cfg) { S.cfg = { ...S.cfg, ...d.cfg, apiKey: S.cfg.apiKey }; LV.saveConfig(S.cfg); renderConfig(); }
      toast('Backup restaurado');
    } catch { toast('Arquivo inválido'); }
  };
  $('#btnWipe').onclick = () => { if (confirm('Apagar todos os leads do CRM? Isso não pode ser desfeito.')) { S.crm = {}; saveCRM(); toast('CRM apagado'); } };
}

/* ---------------- resultados: eventos ---------------- */
function bindResults() {
  $('#searchForm').addEventListener('submit', doSearch);
  $('#filters').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.filter = b.dataset.f; $$('#filters button').forEach((x) => x.classList.toggle('on', x === b)); renderResults();
  };
  $('#selAll').onchange = (e) => { filtered().forEach((l) => (e.target.checked ? S.sel.add(l.id) : S.sel.delete(l.id))); renderResults(); };
  $('#results').addEventListener('click', (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    const l = S.results.find((r) => r.id === card.dataset.id);
    if (e.target.classList.contains('pick')) { e.target.checked ? S.sel.add(l.id) : S.sel.delete(l.id); card.classList.toggle('sel', e.target.checked); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'wa') { openWA(S.crm[l.id] || l, msgFor(S.crm[l.id] || l, LV.autoTemplate(l))); renderResults(); }
    if (act === 'crm' || act === 'open') openDrawer(l.id, filtered().map((r) => r.id));
    if (act === 'site') { S.drawer.tab = 'site'; openDrawer(l.id, filtered().map((r) => r.id)); }
  });
  const selected = () => S.results.filter((l) => S.sel.has(l.id));
  $('#btnCsv').onclick = () => {
    const rows = (S.sel.size ? selected() : filtered()).map((l) => ({ ...l, stage: S.crm[l.id]?.stage || '' }));
    LV.download(`leads-${(S.ctx.categoria || 'busca').replace(/\W+/g, '-')}-${(S.ctx.cidade || '').replace(/\W+/g, '-')}.csv`, LV.csv(rows), 'text/csv');
  };
  $('#btnAddSel').onclick = () => {
    const list = S.sel.size ? selected() : filtered();
    let n = 0; list.forEach((l) => { if (!S.crm[l.id]) { addToCRM(l, 'base', true); n++; } });
    toast(`${n} lead(s) enviados ao CRM`); renderResults();
  };
  $('#btnQueueSel').onclick = () => startQueue((S.sel.size ? selected() : filtered()).filter((l) => !S.crm[l.id] || S.crm[l.id].stage === 'base'));
  $('#crmSearch').oninput = renderPipeline;
  $('#btnSync').onclick = () => syncRobo(false);
  setInterval(() => { if (!$('#view-pipeline').hidden && !document.hidden) syncRobo(true); }, 60e3);
  $('#btnCrmCsv').onclick = () => LV.download('crm-leadsite.csv', LV.csv(Object.values(S.crm)), 'text/csv');
}

/* ---------------- init ---------------- */
(function init() {
  $('#cats').innerHTML = CATS.map((c) => `<option value="${c}">`).join('');
  const last = LV.loadLast();
  if (last?.results?.length) {
    S.ctx = last.ctx; S.results = last.results;
    const f = $('#searchForm');
    f.elements.categoria.value = last.ctx.categoria || ''; f.elements.cidade.value = last.ctx.cidade || ''; f.elements.bairro.value = last.ctx.bairro || '';
    $('#emptySearch').hidden = true; renderResults();
  }
  bindResults(); bindKanban(); bindDrawer(); bindQueue(); bindConfig(); bindMetas(); bindGerar(); bindInsta();
  renderKpis();
  window.addEventListener('hashchange', route); route();
})();
