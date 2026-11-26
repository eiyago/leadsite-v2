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
  $('#kpis').innerHTML = [
    ['No CRM', all.length], ['Abordados', abord], ['Conversão', conv + '%'], ['Vendido', money(receita)], ['Recorrente/mês', money(mrr)],
  ].map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${k}</span></div>`).join('');
  const due = all.filter(isDue).length;
  $('#navFollow').hidden = !due; $('#navFollow').textContent = due;
}

/* ---------------- rotas ---------------- */
function route() {
  const v = (location.hash.match(/#\/(\w+)/) || [])[1] || 'buscar';
  $$('.view').forEach((s) => (s.hidden = s.id !== 'view-' + v));
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === v));
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
      <a class="btn" data-act="demo" href="${esc(LV.demoLink(S.cfg, l))}" target="_blank" rel="noopener">Prévia</a>
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

function openWA(l, text) {
  if (!l.wa) return toast('Lead sem telefone');
  window.open(LV.waLink(l, text), '_blank', 'noopener');
  markContacted(l);
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
        <b>${esc(l.nome)}</b>
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
    const link = LV.demoLink(S.cfg, l);
    return `
    <div class="panel"><p style="margin-top:0">Prévia de site gerada automaticamente com os dados do Google deste negócio. Mande o link na abordagem: o dono vê o próprio negócio com site pronto — é o gatilho mais forte de conversão.</p>
      <input readonly value="${esc(link)}" onclick="this.select()">
      <div class="row actions"><a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener">Abrir prévia</a><button class="btn" data-do="copyLink">Copiar link</button><div class="spacer"></div>
      <button class="btn wa" data-do="sendSite" ${l.wa ? '' : 'disabled'}>Enviar prévia no WhatsApp</button></div></div>
    <iframe src="${esc(link)}" style="width:100%;height:520px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe>`;
  },

  venda: (l) => `
    <div class="panel kv">
      <span>Valor do site (R$)</span><div><input type="number" data-field="valor" value="${esc(l.valor ?? S.cfg.preco)}"></div>
      <span>Mensalidade (R$)</span><div><input type="number" data-field="mensal" value="${esc(l.mensal ?? S.cfg.mensalidade)}"></div>
      <span>Plano</span><div class="seg" data-seg="plano">${['Site Essencial', 'Site + Google', 'Site + Tráfego'].map((p) => `<button data-v="${p}" class="${l.plano === p ? 'on' : ''}">${p}</button>`).join('')}</div>
      <span>Status</span><div class="seg" data-seg="status">${[['convertido', 'Ganho ✅'], ['perdido', 'Perdido'], ['agendado', 'Em negociação']].map(([v, t]) => `<button data-v="${v}" class="${l.stage === v ? 'on' : ''}">${t}</button>`).join('')}</div>
    </div>
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
  $('#dPrev').onclick = () => { const { list, id } = S.drawer; S.drawer.id = list[list.indexOf(id) - 1]; S.drawer.tpl = null; renderDrawer(); };
  $('#dNext').onclick = () => { const { list, id } = S.drawer; S.drawer.id = list[list.indexOf(id) + 1]; S.drawer.tpl = null; renderDrawer(); };
  $('#dTabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.drawer.tab = b.dataset.t; renderDrawer(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#queue').hidden) closeQueue(); else if (!$('#drawer').hidden) closeDrawer(); } });

  const body = $('#dBody');
  body.addEventListener('change', (e) => {
    const l = S.crm[S.drawer.id]; const t = e.target;
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
      copyLink: () => copy(LV.demoLink(S.cfg, l)),
      sendSite: () => openWA(l, msgFor(l, LV.autoTemplate(l))),
      copyProp: () => copy($('#propTxt').value),
      sendProp: () => { openWA(l, $('#propTxt').value); if (l.stage !== 'convertido') setStage(l.id, 'agendado'); },
      ics: () => LV.download(`reuniao-${l.nome.replace(/\W+/g, '-')}.ics`, icsFile(l), 'text/calendar'),
      confirm: () => openWA(l, msgFor(l, 'confirmacao')),
    };
    acts[b.dataset.do]?.();
    if (!['copy', 'copyObj', 'copyLink', 'copyProp', 'ics', 'sendTpl', 'sendObj'].includes(b.dataset.do)) renderDrawer();
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
  $('#qMsg').value = msgFor(crm || l, key);
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

/* ---------------- configurações ---------------- */
function renderConfig() {
  const f = $('#cfgForm');
  ['apiKey', 'meuNome', 'empresa', 'meuWhats', 'preco', 'mensalidade', 'followupDias', 'webhook', 'demoBase'].forEach((k) => (f.elements[k].value = S.cfg[k] ?? ''));
  $('#tplEditor').innerHTML = Object.entries(LV.TEMPLATES).map(([k, t]) =>
    `<div class="tplrow"><b>${t.label}</b><textarea rows="5" data-tpl="${k}">${esc(S.cfg.templates?.[k] || t.text)}</textarea></div>`).join('');
}
function bindConfig() {
  const f = $('#cfgForm');
  f.onsubmit = (e) => {
    e.preventDefault();
    const c = { ...S.cfg };
    ['apiKey', 'meuNome', 'empresa', 'meuWhats', 'webhook', 'demoBase'].forEach((k) => (c[k] = f.elements[k].value.trim()));
    ['preco', 'mensalidade', 'followupDias'].forEach((k) => (c[k] = Number(f.elements[k].value) || 0));
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
  bindResults(); bindKanban(); bindDrawer(); bindQueue(); bindConfig();
  renderKpis();
  window.addEventListener('hashchange', route); route();
})();
