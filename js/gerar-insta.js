/* Gerador de sites (lead de fora) + fila do Instagram — usa as funções do app.js (S, LV, $, esc, toast, copy, addToCRM, saveCRM, prepareLead, openDrawer, roboBase) */

/* ---------------- gerador de sites ---------------- */
const G = { lead: null };
function leadDoForm() {
  const fd = Object.fromEntries(new FormData($('#gerarForm')));
  const ph = LV.phoneInfo(fd.telefone);
  const base = G.lead && G.lead.nome === fd.nome.trim() ? G.lead : {};
  const insta = String(fd.instagram || '').trim().replace(/^@|^https?:\/\/(www\.)?instagram\.com\//g, '').replace(/[/?#].*$/, '');
  const fotos = String(fd.fotos || '').split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  const l = {
    ...base,
    id: base.id || 'ext_' + (ph.digits || Date.now().toString(36)),
    nome: fd.nome.trim(), categoria: fd.categoria.trim(), cidade: fd.cidade.trim(), telefone: fd.telefone.trim(), telDigits: ph.digits, wa: ph.wa, mobile: ph.mobile,
    endereco: fd.endereco.trim(), rating: Number(fd.rating) || 0, reviews: Number(fd.reviews) || 0,
    site: insta ? `https://instagram.com/${insta}` : base.site || '', siteTipo: insta ? 'social' : base.siteTipo || 'sem',
    resumo: fd.resumo.trim() || undefined, externo: true,
  };
  l.fotos = fotos.length ? fotos : base.fotos;
  const lg = fd.logo.trim();
  l.sx = { ...(base.sx || {}) }; if (lg) l.sx.lg = lg; else delete l.sx.lg;
  return l;
}
let gerarT = null;
function gerarPreview() {
  clearTimeout(gerarT);
  gerarT = setTimeout(() => {
    const f = $('#gerarForm'); if (!f.elements.nome.value.trim() || !f.elements.categoria.value.trim()) return;
    $('#gerarFrame').srcdoc = LSite.page(LV.siteData(S.cfg, leadDoForm()), { exported: false });
  }, 400);
}
function bindGerar() {
  const f = $('#gerarForm'); if (!f) return;
  f.addEventListener('input', gerarPreview);
  $('#gerarLimpar').onclick = () => { f.reset(); G.lead = null; $('#gerarOut').innerHTML = ''; $('#gerarFrame').srcdoc = ''; };
  $('#gerarBuscar').onclick = async () => {
    const q = f.elements.busca.value.trim(); if (!q) return toast('Digite o nome e a cidade do negócio');
    if (!S.cfg.apiKey) return toast('Coloque a chave do Google em Configurações para buscar');
    const b = $('#gerarBuscar'); b.disabled = true; b.textContent = 'Buscando…';
    try {
      const [p] = await LV.searchPlaces({ apiKey: S.cfg.apiKey, query: q, max: 1 });
      if (!p) throw new Error('não encontrei esse negócio no Google');
      const cidade = q.split(',').slice(1).join(',').trim() || (p.formattedAddress || '').split(' - ').slice(-2, -1)[0] || '';
      const l = LV.normalize(p, { categoria: p.primaryTypeDisplayName?.text || '', cidade });
      try { await LV.enrich(S.cfg, l); } catch { /* sem fotos extras */ }
      G.lead = l;
      Object.entries({ nome: l.nome, categoria: l.categoria, telefone: l.telefone, cidade: l.cidade, endereco: l.endereco, rating: l.rating || '', reviews: l.reviews || '', resumo: l.resumo || '', fotos: (l.fotos || []).join('\n') })
        .forEach(([k, v]) => (f.elements[k].value = v ?? ''));
      const ig = (l.site || '').match(/instagram\.com\/([^/?#]+)/); if (ig) f.elements.instagram.value = '@' + ig[1];
      gerarPreview(); toast(`${l.nome} preenchido${l.fotos?.length ? ` com ${l.fotos.length} fotos reais` : ''}`);
    } catch (e) { toast('Busca: ' + e.message); } finally { b.disabled = false; b.textContent = '🔎 Buscar'; }
  };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#gerarBtn'); btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      const l = leadDoForm();
      const lead = S.crm[l.id] ? Object.assign(S.crm[l.id], l) : addToCRM(l, 'base', true);
      saveCRM();
      const link = await prepareLead(lead);
      G.lead = lead;
      const wa = lead.wa ? `https://wa.me/${lead.wa}?text=${encodeURIComponent(link)}` : '';
      $('#gerarOut').innerHTML = `<div class="gerar-ok"><b>✅ Prévia pronta</b><input readonly value="${esc(link)}" onclick="this.select()">
        <div class="row actions"><button type="button" class="btn primary" id="gCopiar">Copiar link</button><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Abrir</a>
        ${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button type="button" class="btn" id="gCRM">Abrir no CRM (Efetivar)</button></div></div>`;
      $('#gCopiar').onclick = () => copy(link);
      $('#gCRM').onclick = () => { S.drawer.tab = 'site'; openDrawer(lead.id); };
    } catch (err) { toast('Erro: ' + err.message); } finally { btn.disabled = false; btn.textContent = '✨ Gerar prévia'; }
  });
}

/* ---------------- Instagram (fila do robô) ---------------- */
async function renderInsta() {
  const box = $('#igLista');
  try {
    const j = await (await fetch(roboBase() + '/instagram')).json();
    $('#igResumo').textContent = `Hoje: ${j.hoje}/${j.limite} contatos · ${j.fila.length} na fila · ${j.enviados} já contatados pelo Instagram · ritmo: 1 a cada 20–30 min`;
    if (!j.fila.length) { box.innerHTML = '<p class="muted">Fila vazia. O robô coloca aqui os leads quentes/mornos sem site que têm Instagram mas não têm celular. Eles nunca recebem WhatsApp.</p>'; return; }
    box.innerHTML = j.fila.map((l) => `<div class="ig-card" data-id="${esc(l.id)}">
      <div class="ig-h"><div><b>${esc(l.nome)}</b> <span class="pill">${esc(l.temp || '')}</span><div class="muted small">${esc(l.categoria || '')} · ${esc(String(l.cidade || '').split(',')[0])}${l.rating ? ` · ${String(l.rating).replace('.', ',')}⭐ (${l.reviews})` : ''}</div></div>
      ${l.insta ? `<a class="btn primary" href="https://instagram.com/${esc(l.insta)}" target="_blank" rel="noopener">Abrir @${esc(l.insta)}</a>` : ''}</div>
      <div class="ig-msgs"><div><span class="muted small">Story</span><p>${esc(l.story)}</p><button class="btn" data-ig-copy="${esc(l.story)}">Copiar</button></div>
      <div><span class="muted small">Direct</span><p>${esc(l.direct)}</p><button class="btn" data-ig-copy="${esc(l.direct)}">Copiar</button></div></div>
      <div class="row actions"><button class="btn primary" data-ig="enviado">✅ Enviei</button><button class="btn" data-ig="pular">🔒 Privado / pular</button><button class="btn" data-ig="respondeu">🔥 Respondeu</button></div></div>`).join('');
  } catch { $('#igResumo').textContent = 'Robô desligado: abra o INICIAR.bat do robô para ver a fila do Instagram.'; box.innerHTML = ''; }
}
function bindInsta() {
  $('#igAtualizar')?.addEventListener('click', renderInsta);
  $('#igLista')?.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-ig-copy]'); if (c) return copy(c.dataset.igCopy);
    const b = e.target.closest('[data-ig]'); if (!b) return;
    const id = b.closest('.ig-card').dataset.id;
    try { await fetch(`${roboBase()}/instagram/${encodeURIComponent(id)}/${b.dataset.ig}`, { method: 'POST' }); }
    catch { return toast('Robô desligado'); }
    toast({ enviado: 'Marcado como enviado', pular: 'Pulado', respondeu: 'Lead movido para negociação' }[b.dataset.ig]);
    renderInsta();
  });
}
