'use strict';
/* J.A.R.V.I.S. — núcleo compartilhado (Lead Site V2 e app JARVIS)
   Dados reais: clima (Open-Meteo), cotações (AwesomeAPI + PTAX do Banco Central), notícias (g1 via rss2json).
   Voz: Web Speech API (vozes do sistema/navegador). Microfone: reconhecimento de fala do navegador.
   IA livre: Ollama local (opcional). Nada é inventado: se uma fonte falhar, o JARVIS diz que não conseguiu. */
const JV = (() => {
  /* ---------------- configuração ---------------- */
  const K = 'lv2_jarvis';
  const DEF = {
    nome: 'Yago', cidade: 'Foz do Iguaçu, PR', lat: -25.5163, lon: -54.5854,
    genero: 'masc', vozURI: '', rate: 1, pitch: 1, volume: 1,
    falarAoIniciar: true, quando: 'dia', mudo: false, wake: false,
    ollamaUrl: 'http://localhost:11434', ollamaModelo: '',
  };
  const cfg = () => ({ ...DEF, ...(JSON.parse(localStorage.getItem(K) || '{}')) });
  const salvar = (patch) => { const c = { ...cfg(), ...patch }; localStorage.setItem(K, JSON.stringify(c)); emit('cfg', c); return c; };

  /* eventos simples (estado do orb, falas, etc.) */
  const ouvintes = {};
  const on = (ev, fn) => ((ouvintes[ev] = ouvintes[ev] || []).push(fn));
  const emit = (ev, d) => (ouvintes[ev] || []).forEach((fn) => { try { fn(d); } catch (e) { console.warn(e); } });
  let estado = 'ocioso';
  const setEstado = (s) => { estado = s; emit('estado', s); };

  /* ---------------- utilidades ---------------- */
  const FUSO = 'America/Sao_Paulo';
  const agora = () => {
    const d = new Date();
    const f = (o) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...o }).format(d);
    return { d, semana: f({ weekday: 'long' }), dia: Number(f({ day: 'numeric' })), mes: f({ month: 'long' }), ano: f({ year: 'numeric' }), hora: f({ hour: '2-digit', minute: '2-digit' }), h: Number(f({ hour: 'numeric', hour12: false })), iso: new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d) };
  };
  const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = (v, c = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hashDia = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const cache = async (chave, minutos, fn) => {
    try { const c = JSON.parse(localStorage.getItem(chave) || 'null'); if (c && Date.now() - c.t < minutos * 60e3) return c.v; } catch { /* ok */ }
    const v = await fn(); localStorage.setItem(chave, JSON.stringify({ t: Date.now(), v })); return v;
  };
  const ultimoCache = (chave) => { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch { return null; } };

  /* ---------------- clima (Open-Meteo, sem chave) ---------------- */
  const WMO = { 0: 'céu limpo', 1: 'predominantemente limpo', 2: 'parcialmente nublado', 3: 'nublado', 45: 'neblina', 48: 'neblina com geada', 51: 'garoa fraca', 53: 'garoa', 55: 'garoa forte', 61: 'chuva fraca', 63: 'chuva moderada', 65: 'chuva forte', 66: 'chuva congelante', 67: 'chuva congelante forte', 71: 'neve fraca', 73: 'neve', 75: 'neve forte', 80: 'pancadas de chuva fracas', 81: 'pancadas de chuva', 82: 'pancadas de chuva fortes', 95: 'trovoadas', 96: 'trovoadas com granizo', 99: 'trovoadas fortes com granizo' };
  const ICONE = (c, dia = 1) => (c === 0 ? (dia ? '☀️' : '🌙') : c <= 2 ? '⛅' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 || (c >= 80 && c <= 82) ? '🌧️' : c <= 77 ? '❄️' : '⛈️');

  async function clima(forcar) {
    const c = cfg();
    const chave = `lv2_clima_${c.lat}_${c.lon}`;
    if (forcar) localStorage.removeItem(chave);
    return cache(chave, 15, async () => {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=2&timezone=${encodeURIComponent(FUSO)}`;
      const j = await (await fetch(u)).json();
      if (!j.current) throw new Error('clima indisponível');
      const agoraISO = j.current.time.slice(0, 13);
      const i0 = Math.max(0, j.hourly.time.findIndex((t) => t.slice(0, 13) === agoraISO));
      const proximas = j.hourly.time.slice(i0 + 1, i0 + 7).map((t, k) => ({ hora: t.slice(11, 16), temp: Math.round(j.hourly.temperature_2m[i0 + 1 + k]), chuva: j.hourly.precipitation_probability[i0 + 1 + k], cod: j.hourly.weather_code[i0 + 1 + k] }));
      return {
        cidade: c.cidade.split(',')[0], temp: Math.round(j.current.temperature_2m), sensacao: Math.round(j.current.apparent_temperature),
        umidade: j.current.relative_humidity_2m, vento: Math.round(j.current.wind_speed_10m), cod: j.current.weather_code, dia: j.current.is_day,
        condicao: WMO[j.current.weather_code] || 'condição indefinida', max: Math.round(j.daily.temperature_2m_max[0]), min: Math.round(j.daily.temperature_2m_min[0]),
        chuvaHoje: j.daily.precipitation_probability_max[0], proximas, atualizado: agora().hora, fonte: 'Open-Meteo',
      };
    });
  }

  async function buscarCidade(nome) {
    const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome.split(',')[0])}&count=5&language=pt&countryCode=BR`)).json();
    const r = (j.results || [])[0];
    if (!r) throw new Error('cidade não encontrada');
    return { cidade: `${r.name}, ${(r.admin1 || '').replace(/^Estado d[eoa] /, '')}`, lat: r.latitude, lon: r.longitude };
  }

  /* ---------------- cotações ---------------- */
  async function cotacoes(forcar) {
    if (forcar) localStorage.removeItem('lv2_cotacoes');
    return cache('lv2_cotacoes', 10, async () => {
      const j = await (await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,PYG-BRL')).json();
      const m = (k) => j[k] && { valor: Number(j[k].bid), variacao: Number(j[k].pctChange), hora: j[k].create_date };
      let ptax = null;
      try {
        const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
        const fim = new Date(), ini = new Date(Date.now() - 8 * 864e5);
        const u = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='USD'&@dataInicial='${fmt(ini)}'&@dataFinalCotacao='${fmt(fim)}'&$top=200&$format=json`;
        const p = (await (await fetch(u)).json()).value || [];
        const fech = p.filter((x) => x.tipoBoletim === 'Fechamento');
        const ult = (fech.length ? fech : p).at(-1);
        if (ult) ptax = { compra: ult.cotacaoCompra, venda: ult.cotacaoVenda, quando: ult.dataHoraCotacao.slice(0, 16), tipo: ult.tipoBoletim };
      } catch { /* PTAX indisponível */ }
      return { usd: m('USDBRL'), eur: m('EURBRL'), gbp: m('GBPBRL'), pyg: m('PYGBRL'), ptax, atualizado: agora().hora };
    });
  }

  /* ---------------- notícias (g1 via rss2json) ---------------- */
  // manchetes principais (curadoria do Google Notícias); g1 como reserva
  const GN = (t) => `https://news.google.com/rss${t ? `/headlines/section/topic/${t}` : ''}?hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const FEEDS = { brasil: [GN(''), 'https://g1.globo.com/rss/g1/'], mundo: [GN('WORLD'), 'https://g1.globo.com/rss/g1/mundo/'] };
  const limparTitulo = (t) => t.replace(/\s+-\s+[^-]{2,40}$/, '').trim(); // tira " - Folha de S.Paulo" etc.
  async function noticias(forcar) {
    if (forcar) localStorage.removeItem('lv2_noticias');
    return cache('lv2_noticias', 15, async () => {
      const pega = async (urls) => {
        for (const url of urls) {
          try {
            const j = await (await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`)).json();
            if (j.status === 'ok' && j.items?.length) return j.items.slice(0, 5).map((i) => ({ titulo: limparTitulo(i.title), fonte: (i.title.match(/\s-\s([^-]{2,40})$/) || [])[1] || '', link: i.link, data: i.pubDate }));
          } catch { /* tenta a próxima fonte */ }
        }
        throw new Error('notícias indisponíveis');
      };
      const [brasil, mundo] = await Promise.all([pega(FEEDS.brasil), pega(FEEDS.mundo)]);
      return { brasil, mundo, fonte: 'Google Notícias', atualizado: agora().hora };
    });
  }

  /* ---------------- dados comerciais (CRM + robô) ---------------- */
  const lerLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const roboBase = () => (lerLS('lv2_config', {}).roboUrl || 'http://localhost:3210').replace(/\/$/, '');
  async function robo() {
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 2500);
      return await (await fetch(roboBase() + '/status', { signal: ctl.signal })).json();
    } catch { return null; }
  }
  const mesmoDia = (iso, dia) => iso && new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(iso)) === dia;

  async function resumo() {
    const hoje = agora().iso;
    const crm = Object.values(lerLS('lv2_crm', {}));
    const conf = lerLS('lv2_config', {});
    const fuDias = conf.followupDias || 2;
    const pagos = crm.filter((l) => l.pagamento === 'confirmado');
    const r = {
      noCrm: crm.length,
      novosHoje: crm.filter((l) => mesmoDia(l.createdAt, hoje)).length,
      contatosHoje: crm.filter((l) => mesmoDia(l.lastContact, hoje)).length,
      interessados: crm.filter((l) => l.stage === 'agendado').length,
      followups: crm.filter((l) => (l.stage === 'abordado' || l.stage === 'followup') && l.lastContact && (Date.now() - new Date(l.lastContact)) / 864e5 >= fuDias).length,
      fechadas: crm.filter((l) => l.stage === 'convertido').length,
      pagamentoPendente: crm.filter((l) => l.stage === 'convertido' && l.pagamento !== 'confirmado').length,
      vendasHoje: pagos.filter((l) => mesmoDia(l.pagoEm, hoje)).length,
      recebidoHoje: pagos.filter((l) => mesmoDia(l.pagoEm, hoje)).reduce((a, l) => a + Number(l.valorPago ?? l.valor ?? 0), 0),
      recebidoTotal: pagos.reduce((a, l) => a + Number(l.valorPago ?? l.valor ?? 0), 0),
      quentes: crm.filter((l) => l.temp === 'quente' && l.stage === 'base').length,
      robo: await robo(),
    };
    r.meta = progressoMeta();
    r.alertas = [];
    if (r.followups) r.alertas.push(`${r.followups} follow-up${r.followups > 1 ? 's' : ''} vencido${r.followups > 1 ? 's' : ''}`);
    if (r.robo?.prontos) r.alertas.push(`${r.robo.prontos} lead${r.robo.prontos > 1 ? 's' : ''} pronto${r.robo.prontos > 1 ? 's' : ''} para fechar`);
    if (r.pagamentoPendente) r.alertas.push(`${r.pagamentoPendente} venda${r.pagamentoPendente > 1 ? 's' : ''} com pagamento pendente`);
    if (r.robo && !r.robo.conectado) r.alertas.push('robô sem conexão com o WhatsApp');
    if (r.robo?.pausado) r.alertas.push('robô pausado');
    if (r.robo && r.robo.fila === 0) r.alertas.push(`a cidade ${r.robo.cidade} está sem leads elegíveis na fila`);
    if (!r.robo) r.alertas.push('robô vendedor offline neste computador');
    return r;
  }

  /* ---------------- metas ---------------- */
  const KM = 'lv2_metas';
  const metas = () => lerLS(KM, { atual: { metrica: 'recebido', periodo: 'mes', valor: 3000, criadaEm: new Date().toISOString() }, anteriores: [] });
  const salvarMetas = (m) => localStorage.setItem(KM, JSON.stringify(m));
  function intervalo(periodo, ref = new Date()) {
    const d = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(ref) + 'T00:00:00-03:00');
    if (periodo === 'dia') return [d, new Date(d.getTime() + 864e5)];
    if (periodo === 'semana') { const dow = (d.getUTCDay() + 6) % 7; const i = new Date(d.getTime() - dow * 864e5); return [i, new Date(i.getTime() + 7 * 864e5)]; }
    const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit' }).format(ref).split('-').map(Number);
    return [new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00-03:00`), new Date(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01T00:00:00-03:00`)];
  }
  function realizado(metrica, [ini, fim]) {
    const dentro = (iso) => iso && new Date(iso) >= ini && new Date(iso) < fim;
    const crm = Object.values(lerLS('lv2_crm', {}));
    if (metrica === 'recebido') return crm.filter((l) => l.pagamento === 'confirmado' && dentro(l.pagoEm)).reduce((a, l) => a + Number(l.valorPago ?? l.valor ?? 0), 0);
    const fechadas = crm.filter((l) => l.stage === 'convertido' && dentro((l.hist || []).filter((h) => h.stage === 'convertido').at(-1)?.at));
    if (metrica === 'fechado') return fechadas.reduce((a, l) => a + Number(l.valor || 0), 0);
    return fechadas.length; // sites
  }
  function progressoMeta(m = metas().atual) {
    const iv = intervalo(m.periodo);
    const atual = realizado(m.metrica, iv);
    const pct = m.valor ? Math.min(100, (atual / m.valor) * 100) : 0;
    return { ...m, atual, pct, falta: Math.max(0, m.valor - atual), inicio: iv[0], fim: iv[1] };
  }
  function historicoMeta(n = 6) {
    const m = metas().atual; const out = [];
    let ref = new Date();
    for (let i = 0; i < n; i++) {
      const iv = intervalo(m.periodo, ref);
      const atual = realizado(m.metrica, iv);
      out.push({ inicio: iv[0], fim: iv[1], atual, valor: m.valor, pct: m.valor ? Math.min(100, (atual / m.valor) * 100) : 0 });
      ref = new Date(iv[0].getTime() - 3600e3);
    }
    return out;
  }
  const fmtMeta = (m, v) => (m.metrica === 'sites' ? `${v} site${v === 1 ? '' : 's'}` : dinheiro(v));
  const NOME_METRICA = { recebido: 'faturamento recebido (pagamentos confirmados)', fechado: 'vendas fechadas (valor)', sites: 'quantidade de sites vendidos' };
  const NOME_PERIODO = { dia: 'do dia', semana: 'da semana', mes: 'do mês' };

  /* ---------------- saudação (dados reais, frase do dia autoral) ---------------- */
  const FRASES = [
    'Consistência cria movimento, e movimento cria prosperidade.',
    'Cada conversa bem conduzida é uma porta que se abre. Vamos abrir algumas hoje.',
    'Disciplina hoje é tranquilidade amanhã.',
    'Gratidão pelo que já foi construído; foco no próximo fechamento.',
    'Visualize o site no ar e o cliente satisfeito. Agora, vamos executar.',
    'Grandes resultados são pequenos passos repetidos todos os dias.',
    'Oportunidade gosta de quem chega preparado. Estamos preparados.',
    'O mercado recompensa quem aparece todos os dias.',
    'Foco no que depende de você: contato, proposta e follow-up.',
    'Prosperidade é construída, não esperada. Bom trabalho pela frente.',
    'Uma venda por vez. Um cliente feliz por vez.',
    'O progresso de hoje é a meta batida do mês.',
  ];
  const ABERTURAS = ['a prosperidade lhe aguarda', 'sua central está pronta', 'bem-vindo de volta à operação', 'tudo pronto para mais um dia de resultados', 'é um prazer vê-lo novamente'];

  async function saudacao() {
    const c = cfg(); const t = agora();
    const s = hashDia(t.iso);
    const trat = ['Dear ' + c.nome, c.nome, `${t.h < 12 ? 'Bom dia' : t.h < 18 ? 'Boa tarde' : 'Boa noite'}, ${c.nome}`][s % 3];
    const partes = [`${trat}, ${ABERTURAS[s % ABERTURAS.length]}.`, `Hoje é ${t.semana}, ${t.dia} de ${t.mes}, ${t.hora}.`];
    try {
      const w = await clima();
      partes.push(`Em ${w.cidade} faz ${w.temp} graus, ${w.condicao}${w.chuvaHoje >= 40 ? `, com ${w.chuvaHoje}% de chance de chuva hoje` : ''}.`);
    } catch { partes.push('Não consegui obter o clima agora.'); }
    try {
      const r = await resumo();
      if (r.vendasHoje) partes.push(`Hoje já ${r.vendasHoje === 1 ? 'entrou 1 venda paga' : `entraram ${r.vendasHoje} vendas pagas`}, somando ${dinheiro(r.recebidoHoje)}.`);
      else partes.push('Até agora, ainda não registramos vendas pagas hoje.');
      if (r.robo) partes.push(`O robô já fez ${r.robo.hoje} de ${r.robo.cota} contatos hoje${r.robo.prontos ? `, e há ${r.robo.prontos} lead${r.robo.prontos > 1 ? 's' : ''} pronto${r.robo.prontos > 1 ? 's' : ''} para fechar` : ''}.`);
      if (r.followups) partes.push(`Existem ${r.followups} follow-ups aguardando você.`);
      if (r.meta?.valor) partes.push(`A meta ${NOME_PERIODO[r.meta.periodo]} está em ${Math.round(r.meta.pct)}%: faltam ${fmtMeta(r.meta, r.meta.falta)}.`);
    } catch { /* sem dados comerciais */ }
    partes.push(FRASES[s % FRASES.length]);
    return partes.join(' ');
  }

  /* ---------------- voz (TTS) ---------------- */
  const FEM = /maria|francisca|thalita|leticia|luciana|heloisa|raquel|vitoria|camila|fernanda|brenda|giovanna|manuela|yara|elza|leila|female|feminina|google português/i;
  const MASC = /antonio|daniel|donato|fabio|julio|ricardo|felipe|humberto|nicolau|valerio|male|masculin/i;
  let vozes = [];
  const carregarVozes = () => new Promise((res) => {
    if (!('speechSynthesis' in window)) return res([]);
    const v = speechSynthesis.getVoices();
    if (v.length) { vozes = v; return res(v); }
    speechSynthesis.onvoiceschanged = () => { vozes = speechSynthesis.getVoices(); res(vozes); };
    setTimeout(() => res(vozes), 1500);
  });
  const generoDa = (v) => (MASC.test(v.name) ? 'masc' : FEM.test(v.name) ? 'fem' : '?');
  /* vozes neurais (Edge: "Antonio Online (Natural)", Francisca, Thalita…) soam humanas; as locais do Windows (Daniel, Maria) soam robóticas */
  const natural = (v) => /natural|neural/i.test(v.name);
  const nota = (v, genero) => (natural(v) ? 100 : 0) + (/BR/i.test(v.lang) ? 20 : 0) + (generoDa(v) === genero ? 10 : 0) + (!v.localService ? 5 : 0) + (/google/i.test(v.name) ? 3 : 0);
  async function listaVozes() {
    await carregarVozes();
    const c = cfg();
    return vozes.filter((v) => /^pt/i.test(v.lang)).sort((a, b) => nota(b, c.genero) - nota(a, c.genero))
      .map((v) => ({ uri: v.voiceURI, nome: v.name, lang: v.lang, genero: generoDa(v), online: !v.localService, natural: natural(v) }));
  }
  async function vozEscolhida() {
    await carregarVozes();
    const c = cfg();
    const pt = vozes.filter((v) => /^pt/i.test(v.lang)).sort((a, b) => nota(b, c.genero) - nota(a, c.genero));
    const salva = vozes.find((v) => v.voiceURI === c.vozURI);
    // voz escolhida à mão só vale se não for robótica quando existe uma natural disponível
    if (salva && (natural(salva) || !pt.some(natural))) return salva;
    return pt[0] || null;
  }
  /* pedaços maiores (até ~220 letras) em vez de frase por frase: a entonação flui sem aquelas pausas de robô */
  function pedacos(texto) {
    const frases = String(texto).replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*\s*/g) || [texto];
    const out = [];
    for (const f of frases) { const ult = out.length - 1; if (ult >= 0 && (out[ult] + f).length <= 220) out[ult] += f; else out.push(f); }
    return out.map((p) => p.trim()).filter(Boolean);
  }

  let filaFala = Promise.resolve();
  let geracao = 0; // "parar" invalida tudo o que estava na fila, inclusive os próximos trechos
  function parar() { geracao++; if ('speechSynthesis' in window) speechSynthesis.cancel(); setEstado('ocioso'); }
  async function falar(texto, { forcar } = {}) {
    const c = cfg();
    emit('fala', texto);
    if (!texto || (c.mudo && !forcar) || !('speechSynthesis' in window)) return false;
    const voz = await vozEscolhida();
    const frases = pedacos(texto);
    const minha = geracao;
    filaFala = filaFala.then(() => new Promise((res) => {
      let i = 0;
      const prox = () => {
        if (minha !== geracao) return res(false);
        if (i >= frases.length) { setEstado('ocioso'); return res(true); }
        const u = new SpeechSynthesisUtterance(frases[i++].trim());
        if (voz) u.voice = voz; u.lang = voz?.lang || 'pt-BR';
        u.rate = c.rate; u.pitch = c.pitch; u.volume = c.volume;
        u.onstart = () => setEstado('falando');
        u.onend = prox; u.onerror = () => { setEstado('ocioso'); res(false); };
        speechSynthesis.speak(u);
      };
      prox();
    }));
    return filaFala;
  }

  /* fala automática ao iniciar: uma vez por dia ou por sessão, sem pedir confirmação */
  async function saudarAoIniciar(onBloqueado) {
    const c = cfg();
    if (!c.falarAoIniciar || c.mudo) return;
    const chave = c.quando === 'sessao' ? 'lv2_saudou_sessao' : 'lv2_saudou_dia';
    const store = c.quando === 'sessao' ? sessionStorage : localStorage;
    const marca = c.quando === 'sessao' ? '1' : agora().iso;
    if (store.getItem(chave) === marca) return;
    const texto = await saudacao();
    // navegadores bloqueiam áudio sem interação: se não começar a falar em 1,5s, mostramos o botão "Ouvir saudação"
    let comecou = false;
    const off = (s) => { if (s === 'falando') comecou = true; };
    on('estado', off);
    falar(texto);
    setTimeout(() => { if (!comecou) { parar(); onBloqueado && onBloqueado(texto); } else store.setItem(chave, marca); }, 1500);
  }

  /* ---------------- microfone (STT) ---------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const temMicrofone = () => !!SR;
  let rec = null, wakeRec = null, wakeAtivo = false;

  function ouvirComando() {
    return new Promise((res, rej) => {
      if (!SR) return rej(new Error('Este navegador não tem reconhecimento de voz. Use o Chrome ou o Edge.'));
      pararWake(true);
      parar();
      rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.maxAlternatives = 1;
      let final = '', ultimo = '', falhou = false;
      rec.onstart = () => setEstado('ouvindo');
      rec.onresult = (e) => { const t = [...e.results].map((r) => r[0].transcript).join(' '); ultimo = t; emit('parcial', t); if (e.results[e.results.length - 1].isFinal) final = t; };
      rec.onerror = (e) => { falhou = true; setEstado('ocioso'); if (e.error === 'no-speech') return res(''); rej(new Error(e.error === 'not-allowed' ? 'Permita o uso do microfone no navegador.' : 'Não consegui ouvir: ' + e.error)); };
      rec.onend = () => { if (estado === 'ouvindo') setEstado('ocioso'); if (!falhou) res((final || ultimo).trim()); retomarWake(); };
      rec.start();
    });
  }

  /* "ok Jarvis": escuta contínua enquanto a página/app estiver aberto */
  function iniciarWake(aoDetectar) {
    if (!SR) return false;
    wakeAtivo = true;
    const ligar = () => {
      if (!wakeAtivo || rec?._ativo) return;
      wakeRec = new SR(); wakeRec.lang = 'pt-BR'; wakeRec.continuous = true; wakeRec.interimResults = true;
      wakeRec.onresult = (e) => {
        const t = semAcento([...e.results].slice(e.resultIndex).map((r) => r[0].transcript).join(' '));
        if (/\b(ok|okay|oque|oi|ei|hey|e ai)?\s*(jarvis|jarves|jarbas|djarvis|jarvi)\b/.test(t)) { pararWake(true); aoDetectar && aoDetectar(); }
      };
      wakeRec.onend = () => { if (wakeAtivo) setTimeout(ligar, 400); };
      wakeRec.onerror = (e) => { if (e.error === 'not-allowed') wakeAtivo = false; };
      try { wakeRec.start(); } catch { /* já ativo */ }
    };
    iniciarWake._ligar = ligar; iniciarWake._cb = aoDetectar;
    ligar();
    return true;
  }
  function pararWake(temporario) { if (!temporario) wakeAtivo = false; try { wakeRec && (wakeRec.onend = null, wakeRec.abort()); } catch { /* ok */ } wakeRec = null; if (temporario) pararWake._retomar = true; }
  function retomarWake() { if (cfg().wake && pararWake._retomar && iniciarWake._ligar) { pararWake._retomar = false; wakeAtivo = true; setTimeout(iniciarWake._ligar, 600); } }

  /* ---------------- respostas faladas prontas ---------------- */
  async function textoNoticias() {
    const n = await noticias(true);
    const lista = (arr) => arr.slice(0, 3).map((x, i) => `${i + 1}: ${x.titulo.replace(/[.!?]$/, '')}${x.fonte ? `, segundo ${x.fonte}` : ''}.`).join(' ');
    let t = `Principais notícias do Brasil. ${lista(n.brasil)} No mundo. ${lista(n.mundo)}`;
    try { const c = await cotacoes(true); t += ' ' + textoDolar(c); } catch { t += ' Não consegui a cotação do dólar agora.'; }
    return t;
  }
  const textoDolar = (c) => (c.ptax
    ? `A cotação oficial do dólar, PTAX do Banco Central, ${c.ptax.tipo === 'Fechamento' ? 'no fechamento de' : 'na última atualização de'} ${c.ptax.quando.slice(8, 10)}/${c.ptax.quando.slice(5, 7)}, é de ${num(c.ptax.venda, 4).replace(/0+$/, '').replace(/,$/, '')} reais.${c.usd ? ` No mercado, agora, o dólar comercial está em ${num(c.usd.valor)} reais.` : ''}`
    : c.usd ? `O dólar comercial está em ${num(c.usd.valor)} reais.` : 'Não consegui a cotação do dólar agora.');
  async function textoCotacoes() {
    const c = await cotacoes(true);
    const p = [textoDolar(c)];
    if (c.eur) p.push(`O euro está em ${num(c.eur.valor)} reais.`);
    if (c.gbp) p.push(`A libra está em ${num(c.gbp.valor)} reais.`);
    if (c.pyg) p.push(`Mil guaranis valem ${num(c.pyg.valor * 1000)} reais.`);
    return p.join(' ');
  }
  async function textoClima() {
    const w = await clima(true);
    const prox = w.proximas.filter((p) => p.chuva >= 50).slice(0, 1)[0];
    return `Em ${w.cidade} agora faz ${w.temp} graus, sensação de ${w.sensacao}, ${w.condicao}. Umidade de ${w.umidade}% e vento de ${w.vento} quilômetros por hora. Hoje a máxima é ${w.max} e a mínima ${w.min} graus, com ${w.chuvaHoje}% de chance de chuva.${prox ? ` Há boa chance de chuva por volta das ${prox.hora}.` : ''}`;
  }
  async function textoResumo() {
    const r = await resumo();
    const p = [];
    p.push(r.vendasHoje ? `Hoje: ${r.vendasHoje} venda${r.vendasHoje > 1 ? 's' : ''} paga${r.vendasHoje > 1 ? 's' : ''}, ${dinheiro(r.recebidoHoje)} recebidos.` : 'Hoje ainda não há vendas pagas.');
    if (r.robo) p.push(`O robô fez ${r.robo.hoje} de ${r.robo.cota} contatos, ${r.robo.responderam} responderam no total e ${r.robo.prontos} estão prontos para fechar. Campanha em ${r.robo.cidade}.`);
    else p.push('O robô vendedor está offline neste computador.');
    p.push(`No CRM: ${r.noCrm} leads, ${r.interessados} interessados, ${r.followups} follow-ups vencidos, ${r.fechadas} vendas fechadas${r.pagamentoPendente ? `, sendo ${r.pagamentoPendente} com pagamento pendente` : ''}.`);
    if (r.meta?.valor) p.push(`Meta ${NOME_PERIODO[r.meta.periodo]}: ${fmtMeta(r.meta, r.meta.atual)} de ${fmtMeta(r.meta, r.meta.valor)}, ${Math.round(r.meta.pct)}%.`);
    const prox = r.robo?.prontos ? 'Próxima ação de maior valor: responder agora os leads prontos para fechar.' : r.followups ? 'Próxima ação: fazer os follow-ups vencidos.' : r.pagamentoPendente ? 'Próxima ação: cobrar os pagamentos pendentes.' : 'Próxima ação: manter a prospecção rodando.';
    p.push(prox);
    return p.join(' ');
  }

  /* ---------------- IA livre (Ollama local, opcional) ---------------- */
  const PERSONA = () => `Você é o J.A.R.V.I.S., assistente pessoal e copiloto comercial de ${cfg().nome} dentro do Lead Site V2 (venda de sites para pequenos negócios). Personalidade: a elegância de um mordomo tecnológico com a objetividade de um diretor de operações. Fale em português brasileiro, com clareza, confiança, discrição e humor sutil quando apropriado. Respostas curtas, próprias para serem faladas (no máximo 4 frases). Nunca invente clima, horário, vendas, leads, cotações ou estatísticas: use apenas os dados fornecidos e diga claramente quando não souber. Distinga fatos de sugestões. Não execute ações externas.`;
  async function ollamaModelo() {
    const c = cfg();
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 2000);
    const j = await (await fetch(c.ollamaUrl.replace(/\/$/, '') + '/api/tags', { signal: ctl.signal })).json();
    const nomes = (j.models || []).map((m) => m.name);
    if (!nomes.length) throw new Error('Ollama sem modelos');
    return nomes.includes(c.ollamaModelo) ? c.ollamaModelo : nomes[0];
  }
  /* Cérebro "Homem de Ferro": o JARVIS holográfico (Y:\jarvis-ironman) roda o Claude Code no computador em ws://localhost:8787.
     Quando ele está ligado, as perguntas livres vão para lá (só leitura; nada é alterado sem o modo de escrita). */
  const CEREBRO = 'ws://localhost:8787';
  function perguntarCerebro(prompt, ms = 90000) {
    return new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(CEREBRO); } catch (e) { return rej(e); }
      let txt = ''; const id = 'lv' + Date.now();
      const fim = (fn, v) => { clearTimeout(tm); try { ws.close(); } catch { /* ok */ } fn(v); };
      const tm = setTimeout(() => fim(rej, new Error('cérebro sem resposta')), ms);
      ws.onerror = () => fim(rej, new Error('cérebro desligado'));
      ws.onopen = () => ws.send(JSON.stringify({ type: 'ask', text: prompt, id }));
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'delta' && m.delta) txt += m.delta;
        if (m.type === 'done') {
          const r = (m.text || txt || '').trim();
          if (/not logged in|please run \/login/i.test(r)) return fim(rej, new Error('cérebro sem login'));
          fim(res, r);
        }
        if (m.type === 'error') fim(rej, new Error(m.message || 'erro no cérebro'));
      };
    });
  }
  async function perguntarIA(pergunta) {
    const c = cfg();
    try {
      setEstado('pensando');
      const r0 = await resumo().catch(() => null); const t0 = agora();
      const ctx = { data: `${t0.semana}, ${t0.dia} de ${t0.mes} de ${t0.ano}`, hora: t0.hora, cidade: c.cidade, robo: r0?.robo && { hoje: r0.robo.hoje, cota: r0.robo.cota, prontos: r0.robo.prontos }, meta: r0?.meta && { atual: r0.meta.atual, valor: r0.meta.valor } };
      const r = await perguntarCerebro(`${PERSONA()}\nDados reais de agora (JSON): ${JSON.stringify(ctx)}\n\nPergunta: ${pergunta}`);
      if (r) return r;
    } catch { /* sem cérebro Claude: tenta o Ollama */ }
    let modelo;
    try { modelo = await ollamaModelo(); } catch {
      return 'Meu cérebro principal está desligado. Abra o JARVIS pelo atalho do computador (ele liga o cérebro sozinho) para eu conversar sobre qualquer assunto. Enquanto isso, posso falar notícias, cotações, clima, o resumo das vendas e a meta.';
    }
    setEstado('pensando');
    const r = await resumo().catch(() => null);
    const t = agora();
    const contexto = { data: `${t.semana}, ${t.dia} de ${t.mes} de ${t.ano}`, hora: t.hora, cidade: c.cidade, resumoComercial: r && { vendasHoje: r.vendasHoje, recebidoHoje: r.recebidoHoje, followupsVencidos: r.followups, interessados: r.interessados, robo: r.robo && { hoje: r.robo.hoje, cota: r.robo.cota, prontosParaFechar: r.robo.prontos, cidade: r.robo.cidade }, meta: r.meta && { metrica: r.meta.metrica, periodo: r.meta.periodo, atual: r.meta.atual, valor: r.meta.valor } } };
    const resp = await fetch(c.ollamaUrl.replace(/\/$/, '') + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelo, stream: false, messages: [{ role: 'system', content: PERSONA() + '\nDados reais de agora (JSON): ' + JSON.stringify(contexto) }, { role: 'user', content: pergunta }] }),
    });
    const j = await resp.json();
    return (j.message?.content || 'Não consegui uma resposta da IA local.').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  /* ---------------- comandos de voz/texto ---------------- */
  async function responder(texto, nav) {
    const t = semAcento(texto);
    try {
      if (!t) return 'Não ouvi nada. Pode repetir?';
      if (/(silenci|cala a boca|para de falar|pare de falar|chega)/.test(t)) { parar(); return ''; }
      if (/noticia/.test(t)) return await textoNoticias();
      if (/(dolar|euro|libra|guarani|cotac|cambio|moeda)/.test(t)) return /^(qual|quanto).*dolar|dolar( hoje)?$/.test(t) ? textoDolar(await cotacoes(true)) : await textoCotacoes();
      if (/(clima|tempo|temperatura|chover|chuva|calor|frio)/.test(t)) return await textoClima();
      if (/(meta|objetivo)/.test(t)) { const m = progressoMeta(); return `Meta ${NOME_PERIODO[m.periodo]}, medindo ${NOME_METRICA[m.metrica]}: ${fmtMeta(m, m.atual)} de ${fmtMeta(m, m.valor)}, ${Math.round(m.pct)}% atingido. Faltam ${fmtMeta(m, m.falta)}.`; }
      if (/(resumo|status|relatorio|como (esta|estamos|vai)|vendas|leads|robo|operacao)/.test(t)) return await textoResumo();
      if (/(que horas|hora)/.test(t)) return `Agora são ${agora().hora}.`;
      if (/(que dia|data de hoje|hoje e)/.test(t)) { const a = agora(); return `Hoje é ${a.semana}, ${a.dia} de ${a.mes} de ${a.ano}.`; }
      if (/(saudacao|bom dia|boa tarde|boa noite|ola|oi jarvis)/.test(t)) return await saudacao();
      if (nav) {
        const destinos = [[/pipeline|funil/, 'pipeline'], [/meta/, 'metas'], [/(buscar|procurar|minerar|leads)/, 'buscar'], [/(config|ajuste)/, 'config'], [/(inicio|central|painel)/, 'inicio']];
        if (/(abr|mostr|ir |vai |leva)/.test(t)) for (const [re, dest] of destinos) if (re.test(t)) { nav(dest); return `Abrindo ${dest === 'buscar' ? 'a busca de leads' : dest}.`; }
      }
      return await perguntarIA(texto);
    } catch (e) {
      return 'Não consegui buscar essa informação agora. ' + (e.message || '');
    } finally { if (estado === 'pensando') setEstado('ocioso'); }
  }

  /* ---------------- orb 3D interativo (three.js) ---------------- */
  async function orb(canvas) {
    let THREE, OrbitControls;
    try {
      THREE = await import('three');
      ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    } catch (e) { canvas.classList.add('sem3d'); console.warn('3D indisponível', e); return null; }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100); cam.position.set(0, 0, 6.2);
    const controls = new OrbitControls(cam, canvas);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.06, enablePan: false, minDistance: 3.6, maxDistance: 10, autoRotate: true, autoRotateSpeed: 0.8, rotateSpeed: 0.7 });

    const cor = new THREE.Color('#22d3ee');
    const grupo = new THREE.Group(); scene.add(grupo);
    const mWire = new THREE.MeshBasicMaterial({ color: cor, wireframe: true, transparent: true, opacity: 0.55 });
    const nucleo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), mWire); grupo.add(nucleo);
    const mCore = new THREE.MeshBasicMaterial({ color: '#0ea5e9', transparent: true, opacity: 0.18 });
    const miolo = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 48), mCore); grupo.add(miolo);
    const aneis = [];
    [[1.55, 0.012, [Math.PI / 2, 0, 0]], [1.8, 0.008, [Math.PI / 3, Math.PI / 5, 0]], [2.05, 0.01, [-Math.PI / 4, Math.PI / 3, 0]]].forEach(([r, e, rot], i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, e, 8, 160), new THREE.MeshBasicMaterial({ color: i === 1 ? '#60a5fa' : cor, transparent: true, opacity: 0.75 }));
      m.rotation.set(...rot); grupo.add(m); aneis.push(m);
    });
    // marcadores girando nos anéis
    const marc = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshBasicMaterial({ color: '#e0f2fe' }));
    aneis[0].add(marc);
    // partículas
    const N = 1400, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const r = 2.4 + Math.random() * 1.4, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1); pos.set([r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p)], i * 3); }
    const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mP = new THREE.PointsMaterial({ color: '#7dd3fc', size: 0.025, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const pontos = new THREE.Points(gP, mP); scene.add(pontos);
    // brilho
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(56,189,248,.55)'); gr.addColorStop(0.4, 'rgba(14,165,233,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    brilho.scale.set(5.5, 5.5, 1); scene.add(brilho);

    const CORES = { ocioso: '#22d3ee', ouvindo: '#34d399', falando: '#38bdf8', pensando: '#a78bfa' };
    let alvo = new THREE.Color(CORES.ocioso);
    on('estado', (s) => { alvo = new THREE.Color(CORES[s] || CORES.ocioso); controls.autoRotateSpeed = s === 'ocioso' ? 0.8 : 2.2; });
    canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; clearTimeout(orb._t); });
    canvas.addEventListener('pointerup', () => { orb._t = setTimeout(() => (controls.autoRotate = true), 3000); });

    const ajustar = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    new ResizeObserver(ajustar).observe(canvas); ajustar();
    const relogio = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      const t = relogio.getElapsedTime();
      cor.lerp(alvo, 0.06); mWire.color.copy(cor); aneis[0].material.color.copy(cor); aneis[2].material.color.copy(cor);
      const pulso = estado === 'falando' ? 1 + Math.sin(t * 12) * 0.05 + Math.sin(t * 7.3) * 0.03 : estado === 'ouvindo' ? 1 + Math.sin(t * 5) * 0.04 : 1 + Math.sin(t * 1.6) * 0.015;
      nucleo.scale.setScalar(pulso); miolo.scale.setScalar(pulso * 1.02);
      nucleo.rotation.y += 0.003; nucleo.rotation.x += 0.0015;
      aneis[0].rotation.z += 0.006; aneis[1].rotation.z -= 0.004; aneis[2].rotation.z += 0.003;
      marc.position.set(Math.cos(t * 1.2) * 1.55, Math.sin(t * 1.2) * 1.55, 0);
      pontos.rotation.y += 0.0008; pontos.rotation.x += 0.0003;
      controls.update(); renderer.render(scene, cam);
    })();
    return { renderer };
  }

  return {
    cfg, salvar, on, emit, get estado() { return estado; }, setEstado, agora, dinheiro, num,
    clima, buscarCidade, cotacoes, noticias, resumo, robo,
    metas, salvarMetas, progressoMeta, historicoMeta, fmtMeta, NOME_METRICA, NOME_PERIODO,
    saudacao, saudarAoIniciar, falar, parar, listaVozes, vozEscolhida,
    temMicrofone, ouvirComando, iniciarWake, pararWake, responder, perguntarIA, ollamaModelo,
    textoNoticias, textoCotacoes, textoClima, textoResumo, orb, ICONE, WMO,
  };
})();
