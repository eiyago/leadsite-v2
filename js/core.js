'use strict';
/* LeadSite V2 — núcleo: config, armazenamento, busca, score, mensagens */
const LV = (() => {
  const STAGES = [
    { id: 'base', label: 'Base' },
    { id: 'abordado', label: 'Abordado' },
    { id: 'agendado', label: 'Agendado' },
    { id: 'followup', label: 'Follow Up' },
    { id: 'convertido', label: 'Convertido' },
    { id: 'perdido', label: 'Perdido' },
  ];

  const TEMPLATES = {
    abertura_semsite: {
      label: 'Abertura — sem site',
      text: `Oi, tudo bem? 👋

Vi a *{nome}* no Google — {nota}⭐ com {avaliacoes} avaliações, parabéns pelo trabalho!

Reparei que vocês ainda não têm site, então montei uma prévia de como ficaria:
👉 {link_demo}

Hoje quem pesquisa "{categoria} em {cidade}" encontra primeiro quem tem site. Posso te mostrar em 5 minutinhos como mudar isso?

{meu_nome} — {empresa}`,
    },
    abertura_social: {
      label: 'Abertura — só Instagram/link',
      text: `Oi, tudo bem? 👋

Vi a *{nome}* no Google ({nota}⭐, {avaliacoes} avaliações) — o Instagram de vocês está ótimo!

Só que o Google não mostra Instagram como site, e aí o cliente que pesquisa "{categoria} em {cidade}" acaba no concorrente. Montei uma prévia de site pra vocês:
👉 {link_demo}

Quer que eu te mostre rapidinho como fica no celular?

{meu_nome} — {empresa}`,
    },
    abertura_comsite: {
      label: 'Abertura — já tem site',
      text: `Oi, tudo bem? 👋

Vi a *{nome}* no Google ({nota}⭐, {avaliacoes} avaliações) e dei uma olhada no site de vocês.

Montei uma versão nova, mais rápida e feita pra transformar visita em mensagem no WhatsApp:
👉 {link_demo}

Faz sentido eu te mostrar a diferença em 5 minutos?

{meu_nome} — {empresa}`,
    },
    followup1: {
      label: 'Follow-up 1 (2 dias)',
      text: `Oi! Passando pra saber se conseguiu ver a prévia do site da *{nome}* 🙂
👉 {link_demo}

Se quiser, ajusto cores, fotos e serviços sem compromisso.`,
    },
    followup2: {
      label: 'Follow-up 2 (oferta)',
      text: `Oi! Esta semana consigo colocar o site da *{nome}* no ar por {preco} + {mensalidade}/mês, já com domínio, hospedagem e botão de WhatsApp.

Quer que eu reserve sua vaga? Entrego em até 48h.`,
    },
    breakup: {
      label: 'Encerramento (último toque)',
      text: `Oi! Não quero incomodar 🙂 Vou arquivar a prévia da *{nome}* por aqui.

Se mudar de ideia, é só me chamar que coloco no ar em 48h. Sucesso!`,
    },
    proposta: {
      label: 'Proposta',
      text: `*Proposta — Site {nome}*

✅ Site profissional otimizado para celular
✅ Botão de WhatsApp e rota no Google Maps
✅ Aparecer melhor em "{categoria} em {cidade}"
✅ Domínio + hospedagem + suporte

💰 Investimento: {preco} + {mensalidade}/mês
⏱️ Entrega: até 48h após aprovação

Posso seguir?`,
    },
    confirmacao: {
      label: 'Confirmação de reunião',
      text: `Combinado! ✅ Nossa conversa sobre o site da *{nome}* ficou para {data_reuniao}.

Qualquer imprevisto é só me avisar por aqui. Até lá!
{meu_nome}`,
    },
  };

  const OBJECOES = [
    ['Não tenho dinheiro agora', 'Entendo total. Por isso o valor é dividido e a mensalidade é menor que um corte/serviço por mês. Um único cliente novo vindo do Google já paga o site. Quer que eu monte uma condição que caiba no seu mês?'],
    ['Já tenho Instagram, não preciso de site', 'O Instagram é ótimo pra quem já te segue. O site é pra quem ainda não te conhece e está pesquisando no Google agora. Um não substitui o outro — o site leva esse cliente direto pro seu WhatsApp.'],
    ['Vou pensar', 'Claro! Pra te ajudar a pensar: o que te deixaria mais seguro — ver um exemplo de cliente meu, ou ajustar a prévia com suas fotos primeiro?'],
    ['Está caro', 'Comparado a quê? Se o site trouxer 2 clientes por mês, ele se paga já no primeiro mês. E você não precisa pagar tudo de uma vez — posso parcelar.'],
    ['Meu sobrinho/conhecido faz', 'Ótimo ter alguém de confiança! A diferença é que eu entrego em 48h, cuido da hospedagem, do Google e do suporte. Se quiser, mostra a prévia pra ele e compara.'],
    ['Já tentei e não deu resultado', 'Faz sentido ficar com o pé atrás. Normalmente o problema é site sem botão de WhatsApp e que não aparece no Google. A prévia já foi feita pensando nisso. Posso te mostrar o que muda?'],
    ['Manda por e-mail / depois vejo', 'Mando sim! Pra não virar mais um e-mail esquecido, que tal 5 minutos amanhã pra eu te mostrar na tela? Qual horário é melhor, manhã ou tarde?'],
    ['Não tenho tempo', 'Por isso eu faço tudo: você só aprova a prévia. Leva menos tempo que responder esta mensagem 🙂'],
  ];

  const DEFAULT_CONFIG = {
    apiKey: '',
    meuNome: '',
    empresa: '',
    meuWhats: '',
    preco: 997,
    mensalidade: 49,
    webhook: '',
    demoBase: '',
    followupDias: 2,
    templates: {},
  };

  /* ---------- armazenamento ---------- */
  const K_CFG = 'lv2_config', K_CRM = 'lv2_crm', K_LAST = 'lv2_last';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const loadConfig = () => ({ ...DEFAULT_CONFIG, ...read(K_CFG, {}) });
  const saveConfig = (c) => write(K_CFG, c);
  const loadCRM = () => read(K_CRM, {});
  const saveCRM = (crm) => write(K_CRM, crm);
  const loadLast = () => read(K_LAST, null);
  const saveLast = (v) => write(K_LAST, v);

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => new Date().toISOString();

  const SOCIAL = /instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp|ifood|linkbio|bio\.link|beacons\.ai|taplink|tiktok\.com|goo\.gl|business\.site|sites\.google/i;
  const siteTipo = (url) => (!url ? 'sem' : SOCIAL.test(url) ? 'social' : 'tem');

  function phoneInfo(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (d.startsWith('0')) d = d.replace(/^0+/, '');
    const mobile = d.length === 11 && d[2] === '9';
    return { digits: d, mobile, wa: d.length >= 10 ? '55' + d : '' };
  }

  /* ---------- score de conversão ---------- */
  function score(l) {
    let s = 0; const why = [];
    if (l.siteTipo === 'sem') { s += 45; why.push('sem site'); }
    else if (l.siteTipo === 'social') { s += 35; why.push('só rede social'); }
    else { s += 5; }
    if (l.rating >= 4.5) { s += 15; why.push(`nota ${l.rating}`); } else if (l.rating >= 4) s += 8;
    if (l.reviews >= 100) { s += 20; why.push(`${l.reviews} avaliações`); }
    else if (l.reviews >= 30) { s += 12; why.push(`${l.reviews} avaliações`); }
    else if (l.reviews >= 10) s += 6;
    if (l.mobile) { s += 20; why.push('celular (WhatsApp)'); } else if (l.telDigits) s += 6;
    else { s -= 25; why.push('sem telefone'); }
    s = Math.max(0, Math.min(100, s));
    const temp = s >= 70 ? 'quente' : s >= 45 ? 'morno' : 'frio';
    return { score: s, temp, why };
  }

  function normalize(p, ctx) {
    const ph = phoneInfo(p.nationalPhoneNumber || p.internationalPhoneNumber);
    const l = {
      id: p.id,
      nome: p.displayName?.text || 'Sem nome',
      categoria: ctx.categoria || p.primaryTypeDisplayName?.text || '',
      tipoGoogle: p.primaryTypeDisplayName?.text || '',
      cidade: ctx.cidade || '',
      telefone: p.nationalPhoneNumber || '',
      telDigits: ph.digits, wa: ph.wa, mobile: ph.mobile,
      endereco: p.formattedAddress || '',
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
      site: p.websiteUri || '',
      siteTipo: siteTipo(p.websiteUri),
      maps: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.displayName?.text || '') + ' ' + (p.formattedAddress || ''))}`,
      horarios: p.regularOpeningHours?.weekdayDescriptions || [],
    };
    Object.assign(l, score(l));
    return l;
  }

  /* ---------- Google Places API (New) ---------- */
  const FIELDS = [
    'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
    'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount',
    'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus',
    'places.regularOpeningHours.weekdayDescriptions', 'nextPageToken',
  ].join(',');

  async function searchPlaces({ apiKey, query, max = 20, onPage }) {
    const out = []; let pageToken;
    while (out.length < max) {
      const body = { textQuery: query, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20 };
      if (pageToken) body.pageToken = pageToken;
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELDS },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error?.message || `Erro HTTP ${r.status}`);
      out.push(...(j.places || []).filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY'));
      onPage && onPage(out.length);
      pageToken = j.nextPageToken;
      if (!pageToken) break;
      await sleep(350);
    }
    return out.slice(0, max);
  }

  /* ---------- modo demonstração (sem chave) ---------- */
  function demoPlaces(categoria, cidade, max) {
    const pre = ['Studio', 'Espaço', 'Point do', 'Casa', 'Clube', 'Ateliê', 'Central', 'Top', 'Real', 'Prime'];
    const suf = ['Centro', 'Premium', 'Express', 'do Bairro', 'Família', 'Vip', 'Arte', 'Norte', 'Sul', 'Elite'];
    const ruas = ['Av. JK', 'Rua 7 de Setembro', 'Av. Brasil', 'Rua das Flores', 'Av. Central', 'Quadra 104 Sul'];
    const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const out = [];
    for (let i = 0; i < max; i++) {
      const n = `${pre[i % pre.length]} ${categoria} ${suf[(i * 7 + Math.floor(i / 10)) % suf.length]}`;
      const mob = Math.random() > 0.3;
      const ddd = 63;
      const tel = mob ? `(${ddd}) 9${rnd(8100, 9999)}-${rnd(1000, 9999)}` : `(${ddd}) 3${rnd(200, 999)}-${rnd(1000, 9999)}`;
      const r = Math.random();
      out.push({
        id: 'demo_' + i + '_' + Date.now().toString(36),
        displayName: { text: n },
        formattedAddress: `${ruas[i % ruas.length]}, ${rnd(10, 999)} - ${cidade}`,
        nationalPhoneNumber: Math.random() > 0.08 ? tel : '',
        websiteUri: r < 0.45 ? '' : r < 0.7 ? `https://instagram.com/demo${i}` : `https://www.exemplo${i}.com.br`,
        rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
        userRatingCount: rnd(3, 420),
        primaryTypeDisplayName: { text: categoria },
        regularOpeningHours: { weekdayDescriptions: ['segunda-feira: 09:00–19:00', 'terça-feira: 09:00–19:00', 'quarta-feira: 09:00–19:00', 'quinta-feira: 09:00–19:00', 'sexta-feira: 09:00–20:00', 'sábado: 08:00–18:00', 'domingo: Fechado'] },
      });
    }
    return out;
  }

  /* ---------- mensagens ---------- */
  const tpl = (cfg, key) => (cfg.templates && cfg.templates[key]) || TEMPLATES[key]?.text || '';
  const autoTemplate = (l) => (l.siteTipo === 'sem' ? 'abertura_semsite' : l.siteTipo === 'social' ? 'abertura_social' : 'abertura_comsite');

  function b64url(obj) {
    const s = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function demoBase(cfg) {
    if (cfg.demoBase) return cfg.demoBase.replace(/\/?$/, '/') + 'demo.html';
    return new URL('demo.html', location.href).href.split('#')[0];
  }

  function demoLink(cfg, l) {
    // link curto: só o essencial (horários e mapa a página monta sozinha)
    const d = { n: l.nome, c: l.categoria, ci: l.cidade, t: l.telefone, a: l.endereco.replace(/, Brasil$|, \d{5}-\d{3}/g, ''), r: l.rating, u: l.reviews };
    if (/cid=/.test(l.maps || '')) d.m = l.maps;
    const s = cfg.empresa || cfg.meuNome; if (s) d.s = s;
    const w = phoneInfo(cfg.meuWhats).wa; if (w) d.w = w;
    return `${demoBase(cfg)}?d=${b64url(d)}`;
  }

  function vars(cfg, l, extra = {}) {
    return {
      nome: l.nome, categoria: (l.categoria || '').toLowerCase(), cidade: l.cidade, endereco: l.endereco,
      nota: l.rating ? String(l.rating).replace('.', ',') : '5', avaliacoes: l.reviews || 0,
      link_demo: demoLink(cfg, l), meu_nome: cfg.meuNome || '', empresa: cfg.empresa || '',
      meu_whats: cfg.meuWhats || '', preco: money(l.valor || cfg.preco), mensalidade: money(l.mensal || cfg.mensalidade),
      data_reuniao: l.agenda ? new Date(l.agenda).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) : '(data a combinar)',
      ...extra,
    };
  }

  const render = (text, v) => text
    .replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k] ?? '') : m))
    .split('\n').map((s) => s.replace(/^\s*—\s*|\s*—\s*$/g, '')).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();

  const message = (cfg, l, key, extra) => render(tpl(cfg, key || autoTemplate(l)), vars(cfg, l, extra));
  const waLink = (l, text) => `https://wa.me/${l.wa}?text=${encodeURIComponent(text)}`;

  /* ---------- webhook (n8n, Make, Zapier, Apps Script) ---------- */
  function webhook(cfg, event, lead) {
    if (!cfg.webhook) return Promise.resolve(false);
    const { reasons, ...l } = lead;
    return fetch(cfg.webhook, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ event, at: now(), lead: { ...l, link_demo: demoLink(cfg, lead) } }),
    }).then(() => true).catch(() => false);
  }

  /* ---------- CSV ---------- */
  function csv(rows) {
    const cols = ['nome', 'categoria', 'cidade', 'telefone', 'wa', 'endereco', 'rating', 'reviews', 'site', 'siteTipo', 'score', 'temp', 'stage', 'maps'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => q(r[c])).join(';'))].join('\n');
  }

  function download(name, content, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return {
    STAGES, TEMPLATES, OBJECOES, loadConfig, saveConfig, loadCRM, saveCRM, loadLast, saveLast,
    esc, money, now, phoneInfo, score, normalize, searchPlaces, demoPlaces,
    message, render, vars, waLink, demoLink, autoTemplate, webhook, csv, download,
  };
})();
