'use strict';
/* Interface do J.A.R.V.I.S. — mesma central no Lead Site V2 (página inicial) e no app JARVIS separado */
const JVUI = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  let raiz = null, navFn = null, timers = [];

  function montar(el, { nav, modo = 'site' } = {}) {
    raiz = el; navFn = nav;
    timers.forEach(clearInterval); timers = [];
    el.innerHTML = `
    <div class="jv ${modo === 'app' ? 'jv-app' : ''}">
      <header class="jv-top">
        <div class="jv-hi">
          <div class="jv-k">J.A.R.V.I.S. · Central de comando${modo === 'app' ? '' : ' · Lead Site V2'}</div>
          <h1 id="jvTitulo">Olá</h1>
          <div class="jv-dt" id="jvData"></div>
        </div>
        <div class="jv-acoes">
          <button class="jv-btn" data-a="saudar" title="Ouvir a saudação de hoje">▶ Saudação</button>
          <button class="jv-btn" data-a="noticias" title="Principais notícias do Brasil e do mundo + dólar oficial">📰 Notícias</button>
          <button class="jv-btn" data-a="cotacoes" title="Dólar, euro, libra e guarani">💱 Cotações</button>
          <button class="jv-btn jv-mic" data-a="mic" title="Falar com o JARVIS">🎙️ Falar</button>
          <button class="jv-btn jv-stop" data-a="parar" title="Parar de falar (Esc)">⏹ Parar</button>
          <button class="jv-btn jv-iron" data-a="ironman" title="Interface holográfica do filme (roda no seu computador)">🦾 Modo Homem de Ferro</button>
          <button class="jv-ico" data-a="mudo" id="jvMudo" title="Silenciar voz"></button>
          <button class="jv-ico" data-a="cfg" title="Configurações de voz e do JARVIS">⚙️</button>
        </div>
      </header>
      <div class="jv-grid">
        <aside class="jv-col">
          <section class="jv-card" id="jvClima"><div class="jv-load">Carregando clima…</div></section>
          <section class="jv-card" id="jvCot"><div class="jv-load">Carregando cotações…</div></section>
        </aside>
        <div class="jv-centro">
          <div class="jv-orbwrap"><canvas id="jvOrb" aria-label="Núcleo 3D do JARVIS — arraste para girar"></canvas><div class="jv-orbfb"></div></div>
          <div class="jv-estado" id="jvEstado"></div>
          <div class="jv-chat" id="jvChat"></div>
          <form class="jv-perg" id="jvPerg"><input placeholder="Pergunte ou dê um comando ao JARVIS…" aria-label="Pergunta"><button aria-label="Enviar">➤</button></form>
        </div>
        <aside class="jv-col">
          <section class="jv-card" id="jvResumo"><div class="jv-load">Carregando operação…</div></section>
          <section class="jv-card" id="jvMeta"></section>
          <section class="jv-card" id="jvAlertas"></section>
        </aside>
      </div>
      <div class="jv-play" id="jvPlay" hidden><button>▶ Ouvir a saudação de hoje</button></div>
      <dialog class="jv-dlg" id="jvDlg"></dialog>
    </div>`;

    el.querySelector('.jv-acoes').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) acao(b.dataset.a); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && JV.estado === 'falando') JV.parar(); });
    $('#jvPerg', el).addEventListener('submit', (e) => { e.preventDefault(); const i = e.target.querySelector('input'); const t = i.value.trim(); if (t) { i.value = ''; conversar(t); } });
    $('#jvPlay button', el).addEventListener('click', async () => { $('#jvPlay', el).hidden = true; JV.falar(await JV.saudacao(), { forcar: true }); localStorage.setItem('lv2_saudou_dia', JV.agora().iso); });

    if (!montar._ok) {
      montar._ok = true;
      JV.on('estado', mostrarEstado);
      JV.on('parcial', (t) => { const e = $('#jvEstado', raiz); if (e && JV.estado === 'ouvindo') e.textContent = '🎙️ ' + t; });
      // tudo que o JARVIS fala também aparece escrito (inclusive a saudação automática)
      JV.on('fala', (t) => { const c = $('#jvChat', raiz); if (c && c.lastElementChild?.textContent !== t) balao('jv', t); });
    }
    mostrarEstado(JV.estado); pintarMudo();

    relogio(); timers.push(setInterval(relogio, 30e3));
    pintarClima(); timers.push(setInterval(pintarClima, 15 * 60e3));
    pintarCotacoes(); timers.push(setInterval(pintarCotacoes, 10 * 60e3));
    pintarResumo(); timers.push(setInterval(pintarResumo, 60e3));

    JV.orb($('#jvOrb', el));
    ligarWake();
    JV.saudarAoIniciar(() => { const p = $('#jvPlay', raiz); if (p) p.hidden = false; });
  }

  /* ---------- topo ---------- */
  function relogio() {
    if (!raiz) return;
    const a = JV.agora(), c = JV.cfg();
    $('#jvTitulo', raiz).textContent = `${a.h < 12 ? 'Bom dia' : a.h < 18 ? 'Boa tarde' : 'Boa noite'}, ${c.nome}.`;
    $('#jvData', raiz).textContent = `${a.semana[0].toUpperCase() + a.semana.slice(1)}, ${a.dia} de ${a.mes} de ${a.ano} · ${a.hora} · ${c.cidade}`;
  }
  const ESTADOS = { ocioso: () => (JV.cfg().wake ? 'Diga “ok Jarvis” ou toque em Falar' : 'Toque em Falar ou escreva abaixo'), ouvindo: () => '🎙️ Ouvindo…', falando: () => '🔊 Falando…', pensando: () => '🧠 Pensando…' };
  function mostrarEstado(s) {
    if (!raiz) return;
    const e = $('#jvEstado', raiz); if (e) e.textContent = (ESTADOS[s] || ESTADOS.ocioso)();
    raiz.querySelector('.jv')?.setAttribute('data-estado', s);
    const m = raiz.querySelector('.jv-mic'); if (m) m.textContent = s === 'ouvindo' ? '⏹ Parar' : '🎙️ Falar';
  }
  function pintarMudo() { const b = $('#jvMudo', raiz); if (b) { const m = JV.cfg().mudo; b.textContent = m ? '🔇' : '🔊'; b.title = m ? 'Voz silenciada — clique para ligar' : 'Silenciar voz'; b.classList.toggle('on', m); } }

  /* ---------- cards ---------- */
  async function pintarClima() {
    const el = $('#jvClima', raiz); if (!el) return;
    try {
      const w = await JV.clima();
      el.innerHTML = `<div class="jv-ct">Clima · ${esc(w.cidade)}</div>
        <div class="jv-clima"><span class="jv-ic">${JV.ICONE(w.cod, w.dia)}</span><span class="jv-temp">${w.temp}°</span><div><b>${esc(w.condicao)}</b><small>Sensação ${w.sensacao}° · máx ${w.max}° mín ${w.min}°</small></div></div>
        <div class="jv-kv"><span>💧 ${w.umidade}%</span><span>🌬️ ${w.vento} km/h</span><span>☔ ${w.chuvaHoje}% hoje</span></div>
        <div class="jv-horas">${w.proximas.map((p) => `<div><small>${p.hora}</small><span>${JV.ICONE(p.cod)}</span><b>${p.temp}°</b><small>${p.chuva}%</small></div>`).join('')}</div>
        <div class="jv-src">Atualizado ${w.atualizado} · ${w.fonte}</div>`;
    } catch {
      el.innerHTML = `<div class="jv-ct">Clima</div><div class="jv-erro">Clima indisponível no momento.</div><button class="jv-mini" onclick="JVUI.recarregar('clima')">Tentar de novo</button>`;
    }
  }
  async function pintarCotacoes() {
    const el = $('#jvCot', raiz); if (!el) return;
    try {
      const c = await JV.cotacoes();
      const var_ = (v) => (v == null ? '' : `<em class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '▲' : '▼'} ${JV.num(Math.abs(v))}%</em>`);
      el.innerHTML = `<div class="jv-ct">Cotações em reais</div>
        <div class="jv-cot">
          <div><span><i class="jv-moeda">$</i>Dólar <small>PTAX oficial (BC)</small></span><b>${c.ptax ? 'R$ ' + JV.num(c.ptax.venda, 4) : '—'}</b></div>
          <div><span><i class="jv-moeda">$</i>Dólar <small>comercial agora</small></span><b>${c.usd ? 'R$ ' + JV.num(c.usd.valor, 4) : '—'} ${var_(c.usd?.variacao)}</b></div>
          <div><span><i class="jv-moeda">€</i>Euro</span><b>${c.eur ? 'R$ ' + JV.num(c.eur.valor, 4) : '—'} ${var_(c.eur?.variacao)}</b></div>
          <div><span><i class="jv-moeda">£</i>Libra</span><b>${c.gbp ? 'R$ ' + JV.num(c.gbp.valor, 4) : '—'} ${var_(c.gbp?.variacao)}</b></div>
          <div><span><i class="jv-moeda">₲</i>Guarani <small>por ₲ 1.000</small></span><b>${c.pyg ? 'R$ ' + JV.num(c.pyg.valor * 1000, 2) : '—'} ${var_(c.pyg?.variacao)}</b></div>
        </div>
        <div class="jv-src">PTAX ${c.ptax ? `${c.ptax.tipo.toLowerCase()} ${c.ptax.quando.slice(8, 10)}/${c.ptax.quando.slice(5, 7)} ${c.ptax.quando.slice(11, 16)}` : 'indisponível'} · mercado ${c.atualizado} · BC / AwesomeAPI</div>`;
    } catch {
      el.innerHTML = `<div class="jv-ct">Cotações</div><div class="jv-erro">Cotações indisponíveis no momento.</div><button class="jv-mini" onclick="JVUI.recarregar('cot')">Tentar de novo</button>`;
    }
  }
  async function pintarResumo() {
    const el = $('#jvResumo', raiz); if (!el) return;
    const r = await JV.resumo();
    const s = (v, t, cls = '') => `<div class="jv-st ${cls}"><b>${v}</b><span>${t}</span></div>`;
    el.innerHTML = `<div class="jv-ct">Operação de hoje</div>
      <div class="jv-stats">
        ${s(r.vendasHoje, 'vendas pagas hoje', r.vendasHoje ? 'ok' : '')}
        ${s(JV.dinheiro(r.recebidoHoje), 'recebido hoje', r.recebidoHoje ? 'ok' : '')}
        ${s(r.robo ? `${r.robo.hoje}/${r.robo.cota}` : '—', 'contatos do robô')}
        ${s(r.robo ? r.robo.responderam : '—', 'responderam (total)')}
        ${s(r.robo ? r.robo.prontos : '—', 'prontos p/ fechar', r.robo?.prontos ? 'hot' : '')}
        ${s(r.followups, 'follow-ups vencidos', r.followups ? 'warn' : '')}
        ${s(r.interessados, 'interessados')}
        ${s(r.pagamentoPendente, 'pagamento pendente', r.pagamentoPendente ? 'warn' : '')}
      </div>
      <div class="jv-src">${r.robo ? `Robô ${r.robo.conectado ? 'online' : 'sem WhatsApp'}${r.robo.pausado ? ' · pausado' : ''} · campanha ${esc(r.robo.cidade)}` : 'Robô offline neste computador'} · CRM com ${r.noCrm} leads</div>`;
    pintarMeta(r.meta);
    const a = $('#jvAlertas', raiz);
    a.innerHTML = `<div class="jv-ct">Alertas</div>${r.alertas.length ? `<ul class="jv-alertas">${r.alertas.map((x) => `<li>⚠️ ${esc(x)}</li>`).join('')}</ul>` : '<div class="jv-okmsg">✅ Tudo em dia.</div>'}`;
  }
  function pintarMeta(m) {
    const el = $('#jvMeta', raiz); if (!el || !m) return;
    el.innerHTML = `<div class="jv-ct">Meta ${JV.NOME_PERIODO[m.periodo]}</div>
      <div class="jv-meta-v"><b>${JV.fmtMeta(m, m.atual)}</b> <span>de ${JV.fmtMeta(m, m.valor)}</span></div>
      <div class="jv-bar"><i style="width:${m.pct}%"></i>${[25, 50, 75].map((p) => `<u style="left:${p}%" class="${m.pct >= p ? 'ok' : ''}"></u>`).join('')}</div>
      <div class="jv-meta-r"><span>${Math.round(m.pct)}% atingido</span><span>faltam ${JV.fmtMeta(m, m.falta)}</span></div>
      <div class="jv-src">Medindo: ${JV.NOME_METRICA[m.metrica]}${navFn ? ' · <a href="#/metas">ver metas</a>' : ''}</div>`;
  }
  function recarregar(qual) { if (qual === 'clima') JV.clima(true).finally(pintarClima); else JV.cotacoes(true).finally(pintarCotacoes); }

  /* ---------- conversa ---------- */
  function balao(quem, texto) {
    const c = $('#jvChat', raiz); if (!c || !texto) return;
    const d = document.createElement('div'); d.className = 'jv-msg ' + quem; d.textContent = texto;
    c.appendChild(d); while (c.children.length > 6) c.firstChild.remove();
    c.scrollTop = c.scrollHeight;
  }
  async function conversar(texto) {
    balao('eu', texto);
    JV.setEstado('pensando');
    const r = await JV.responder(texto, navFn);
    if (JV.estado === 'pensando') JV.setEstado('ocioso');
    if (r) { balao('jv', r); if (JV.cfg().mudo) aviso('Voz silenciada: resposta só em texto.'); JV.falar(r); }
  }
  async function ouvir() {
    if (JV.estado === 'ouvindo') { JV.pararWake(true); try { window.speechSynthesis?.cancel(); } catch { /* ok */ } JV.setEstado('ocioso'); return; }
    try { const t = await JV.ouvirComando(); if (t) conversar(t); else JV.setEstado('ocioso'); }
    catch (e) { balao('jv', e.message); }
  }
  function aviso(t) { const e = $('#jvEstado', raiz); if (e) { e.textContent = t; setTimeout(() => mostrarEstado(JV.estado), 3000); } }

  async function acao(a) {
    if (a === 'mic') return ouvir();
    if (a === 'parar') { JV.parar(); aviso('Ok, parei.'); return; }
    if (a === 'ironman') {
      const ok = await fetch('http://localhost:8787/health').then((r) => r.ok).catch(() => false);
      if (ok) { window.open('http://localhost:5173', 'jarvis-ironman', 'popup,width=1400,height=900'); return; }
      balao('jv', 'O modo Homem de Ferro roda no seu computador. Abra o atalho "JARVIS Homem de Ferro" na área de trabalho (ou o JARVIS-IronMan.bat) e clique aqui de novo.');
      return;
    }
    if (a === 'mudo') { const m = !JV.cfg().mudo; JV.salvar({ mudo: m }); if (m) JV.parar(); pintarMudo(); return; }
    if (a === 'cfg') return abrirConfig();
    const fontes = { saudar: JV.saudacao, noticias: JV.textoNoticias, cotacoes: JV.textoCotacoes };
    JV.setEstado('pensando');
    try {
      const t = await fontes[a]();
      if (a === 'cotacoes') pintarCotacoes();
      JV.setEstado('ocioso'); balao('jv', t);
      if (JV.cfg().mudo) aviso('Voz silenciada: clique em 🔇 para ouvir.');
      JV.falar(t);
    } catch (e) { JV.setEstado('ocioso'); balao('jv', 'Não consegui buscar isso agora. ' + e.message); }
  }

  /* ---------- "ok Jarvis" ---------- */
  function ligarWake() {
    JV.pararWake();
    if (!JV.cfg().wake || !JV.temMicrofone()) return;
    JV.iniciarWake(async () => {
      if (navFn) navFn('inicio');
      await JV.falar('Pois não?', { forcar: false });
      ouvir();
    });
  }

  /* ---------- configurações (voz, saudação, cidade, IA) ---------- */
  async function htmlConfig() {
    const c = JV.cfg();
    const vozes = await JV.listaVozes();
    const atual = await JV.vozEscolhida();
    const G = { masc: 'masculina', fem: 'feminina', '?': '?' };
    let ia = '<span class="jv-dim">verificando…</span>';
    return `
      <div class="jv-cfg">
        <h3>Voz e saudação</h3>
        <label class="jv-sw"><input type="checkbox" data-c="falarAoIniciar" ${c.falarAoIniciar ? 'checked' : ''}><span></span> Saudação falada ao iniciar</label>
        <div class="jv-row"><label>Repetir a saudação<select data-c="quando"><option value="dia" ${c.quando === 'dia' ? 'selected' : ''}>uma vez por dia</option><option value="sessao" ${c.quando === 'sessao' ? 'selected' : ''}>a cada sessão</option></select></label></div>
        <label class="jv-sw"><input type="checkbox" data-c="mudo" ${c.mudo ? 'checked' : ''}><span></span> Silenciar toda a voz</label>
        <div class="jv-row">
          <label>Voz<select data-c="genero"><option value="masc" ${c.genero === 'masc' ? 'selected' : ''}>Masculina</option><option value="fem" ${c.genero === 'fem' ? 'selected' : ''}>Feminina</option></select></label>
          <label>Escolher voz<select data-c="vozURI"><option value="">Automática (${atual ? esc(atual.name) : 'nenhuma voz pt'})</option>${vozes.map((v) => `<option value="${esc(v.uri)}" ${c.vozURI === v.uri ? 'selected' : ''}>${esc(v.nome)} · ${G[v.genero]}${v.natural ? ' · ✨ natural' : v.online ? ' · online' : ' · robótica'}</option>`).join('')}</select></label>
        </div>
        ${vozes.some((v) => v.genero === 'masc') ? '' : '<p class="jv-dim">Este navegador não tem voz masculina em português. No Microsoft Edge aparecem vozes naturais masculinas (ex.: Antonio).</p>'}
        <div class="jv-row">
          <label>Velocidade <input type="range" min="0.7" max="1.4" step="0.05" data-c="rate" value="${c.rate}"></label>
          <label>Volume <input type="range" min="0" max="1" step="0.05" data-c="volume" value="${c.volume}"></label>
        </div>
        <button type="button" class="jv-btn" data-t="testar">🔊 Testar voz</button>
        <h3>Microfone</h3>
        <label class="jv-sw"><input type="checkbox" data-c="wake" ${c.wake ? 'checked' : ''} ${JV.temMicrofone() ? '' : 'disabled'}><span></span> Ouvir “ok Jarvis” enquanto esta tela estiver aberta</label>
        ${JV.temMicrofone() ? '' : '<p class="jv-dim">Este navegador não tem reconhecimento de voz. Use Chrome ou Edge.</p>'}
        <h3>Você e o clima</h3>
        <div class="jv-row"><label>Seu nome<input data-c="nome" value="${esc(c.nome)}"></label><label>Cidade do clima<input data-t="cidade" value="${esc(c.cidade)}"></label></div>
        <h3>IA para conversa livre (opcional, gratuita e local)</h3>
        <div class="jv-row"><label>Endereço do Ollama<input data-c="ollamaUrl" value="${esc(c.ollamaUrl)}"></label></div>
        <p class="jv-dim" id="jvIA">${ia}</p>
        <div class="jv-dlg-acoes"><button type="button" class="jv-btn" data-t="fechar">Fechar</button></div>
      </div>`;
  }
  async function abrirConfig() {
    const d = $('#jvDlg', raiz);
    d.innerHTML = await htmlConfig();
    d.showModal();
    JV.ollamaModelo().then((m) => { const e = $('#jvIA', d); if (e) e.innerHTML = `✅ IA local conectada · modelo <b>${esc(m)}</b>`; })
      .catch(() => { const e = $('#jvIA', d); if (e) e.innerHTML = 'IA local não encontrada. Sem ela, o JARVIS responde a comandos (notícias, cotações, clima, resumo, metas, hora). Para conversa livre: instale o <b>Ollama</b> (ollama.com), rode <code>ollama pull qwen2.5:3b</code> e, no PowerShell, <code>setx OLLAMA_ORIGINS "https://eiyago.github.io"</code>; depois reinicie o Ollama.'; });
    d.oninput = d.onchange = async (e) => {
      const t = e.target, k = t.dataset.c;
      if (k) {
        const v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
        JV.salvar({ [k]: v });
        if (k === 'genero') JV.salvar({ vozURI: '' });
        if (k === 'mudo') { pintarMudo(); if (v) JV.parar(); }
        if (k === 'wake') ligarWake();
        if (k === 'nome') relogio();
        if (k === 'genero' && e.type === 'change') { d.innerHTML = await htmlConfig(); }
      }
      if (t.dataset.t === 'cidade' && e.type === 'change') {
        try { const r = await JV.buscarCidade(t.value); JV.salvar(r); t.value = r.cidade; relogio(); pintarClima(); }
        catch { t.value = JV.cfg().cidade; aviso('Cidade não encontrada.'); }
      }
    };
    d.onclick = async (e) => {
      const t = e.target.dataset?.t;
      if (t === 'fechar' || e.target === d) d.close();
      if (t === 'testar') JV.falar(`Olá, ${JV.cfg().nome}. Esta é a minha voz. Pronto para mais um dia de vendas.`, { forcar: true });
    };
  }

  return { montar, recarregar, conversar, ouvir, abrirConfig };
})();
