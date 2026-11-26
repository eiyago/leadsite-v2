/* o vendedor: minera, aborda aos poucos, faz follow-up, conversa e te chama na hora de fechar */
import { CFG, agoraBR } from './config.js';
import { DB } from './db.js';
import { buscar, enriquecer, buscarNegocio, telefoneInfo, pontuar } from './places.js';
import { linkPrevia } from './site-link.js';
import { abertura, responder, followup, modoSemIA } from './ai.js';
import { conectado, enviar, jidDoNumero, onMensagem, onMinhaMensagem } from './wa.js';

const DIA = 864e5;
const dias = (iso) => (iso ? (Date.now() - new Date(iso)) / DIA : 0);
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);
let ownerJid = null;
let ocupado = false;

/* ---------- ritmo anti-ban ---------- */
export function cotaHoje() {
  // exceção de um dia só (ex.: "hoje pode passar do limite"); amanhã volta ao normal sozinho
  const ex = DB.meta.excecaoHoje;
  if (ex && ex.data === agoraBR().data && ex.cota) return ex.cota;
  const d = Math.floor(dias(DB.meta.inicio));
  return Math.min(CFG.maximoPorDia, CFG.inicioPorDia + CFG.aumentoPorDia * d);
}
const dentroDaJanela = (t) => CFG.diasAtivos.includes(t.dia) && t.hora >= CFG.horaInicio && t.hora < CFG.horaFim;
const podeResponder = (t) => t.hora >= CFG.respostaInicio && t.hora < CFG.respostaFim;

/* ritmo: 3 a 4 mensagens por hora (uma a cada ~15–20 min, com variação natural).
   O teto do dia (cotaHoje) continua valendo por cima disso. */
function proximoIntervalo() {
  const ex = DB.meta.excecaoHoje;
  const fixo = ex && ex.data === agoraBR().data && ex.porHora;
  const porHora = fixo || CFG.minPorHora + Math.random() * (CFG.maxPorHora - CFG.minPorHora);
  const base = 60 / porHora;
  return (base + (Math.random() * 3 - 1.5)) * 60e3;
}
/* depois de qualquer mensagem iniciada pelo robô, segura a próxima para não passar de 4/hora */
const segurarRitmo = () => DB.setMeta('proximoEnvio', Math.max(DB.meta.proximoEnvio || 0, Date.now() + proximoIntervalo()));

/* ---------- campanha por cidade ---------- */
export const cidadeAtual = () => DB.meta.cidade || CFG.cidade;

/* ---------- avisos para você ---------- */
async function avisar(texto) {
  try {
    if (!ownerJid) ownerJid = await jidDoNumero(CFG.meuWhats.startsWith('55') ? CFG.meuWhats : '55' + CFG.meuWhats);
    if (ownerJid) await enviar(ownerJid, texto);
  } catch (e) { log('[aviso] falhou:', e.message); }
}
const linkChat = (l) => `https://wa.me/${l.wa}`;

/* ---------- mineração ---------- */
const encaixa = (l) => l.temp === 'quente' && l.siteTipo !== 'tem' && l.mobile; // quente, sem site, com celular

async function minerar() {
  const cidade = cidadeAtual();
  const cat = CFG.categorias[DB.meta.catIdx % CFG.categorias.length];
  DB.setMeta('catIdx', DB.meta.catIdx + 1);
  log(`⛏️  Minerando "${cat}" em ${cidade}…`);
  const achados = await buscar(cat, cidade, 60);
  let novos = 0;
  for (const l of achados) {
    if (DB.lead(l.id) || !encaixa(l)) continue;
    DB.upsert({ ...l, etapa: 'fila', mineradoEm: new Date().toISOString() });
    novos++;
  }
  // conta rodadas seguidas sem nada novo: quando passar por TODOS os nichos sem achar nada, a cidade esgotou
  DB.setMeta('rodadasSecas', novos ? 0 : (DB.meta.rodadasSecas || 0) + 1);
  log(`   +${novos} leads quentes sem site na fila`);
  return novos;
}

/* mede o potencial de uma cidade: leads quentes, sem site e com celular em vários nichos */
async function medirCidade(cidade) {
  const amostra = CFG.categorias.slice(0, 4);
  let total = 0; const porNicho = {};
  for (const cat of amostra) {
    try { const r = await buscar(cat, cidade, 20); const n = r.filter((l) => encaixa(l) && !DB.lead(l.id)).length; porNicho[cat] = n; total += n; }
    catch (e) { log(`   [medir ${cidade}] ${e.message}`); }
  }
  return { cidade, total, nichos: Object.values(porNicho).filter((n) => n > 0).length, porNicho };
}

/* cidade esgotou: testa as próximas da lista, escolhe a de maior potencial e troca a campanha */
export async function trocarCidade(forcada) {
  const usadas = new Set([...(DB.meta.cidadesUsadas || []), cidadeAtual()]);
  let escolha;
  if (forcada) escolha = { cidade: forcada, total: null };
  else {
    const candidatas = CFG.cidades.filter((c) => !usadas.has(c)).slice(0, 4);
    if (!candidatas.length) {
      await avisar(`🏁 *${cidadeAtual()}* esgotou e acabaram as cidades da lista.\nMande /cidade Nome, UF para escolher a próxima (ou adicione em CIDADES no .env).`);
      DB.setMeta('rodadasSecas', 0);
      return null;
    }
    log(`🗺️  ${cidadeAtual()} esgotou. Medindo potencial de: ${candidatas.join(' | ')}`);
    const medidas = [];
    for (const c of candidatas) medidas.push(await medirCidade(c));
    medidas.sort((a, b) => b.total - a.total || b.nichos - a.nichos);
    escolha = medidas[0];
    log(`   potencial: ${medidas.map((m) => `${m.cidade}=${m.total}`).join(', ')}`);
  }
  const anterior = cidadeAtual();
  DB.setMeta('cidadesUsadas', [...usadas]);
  DB.setMeta('cidade', escolha.cidade);
  DB.setMeta('catIdx', 0);
  DB.setMeta('rodadasSecas', 0);
  log(`🚚 Nova campanha: ${escolha.cidade}`);
  await avisar(`🚚 *Nova campanha: ${escolha.cidade}*\n${forcada ? 'Trocada por você.' : `${anterior} esgotou (todos os nichos sem leads novos quentes e sem site). Escolhi a cidade de maior potencial: ${escolha.total} leads prontos só na amostra.`}\nO ritmo e a cota continuam os mesmos.`);
  return escolha;
}

async function proximoNovo() {
  // variedade de nichos: mantém pelo menos 4 categorias diferentes na fila
  let fila = DB.leads().filter((l) => l.etapa === 'fila');
  const cats = () => new Set(fila.map((l) => l.categoria)).size;
  let tentativas = 0;
  while (fila.length < 5 || cats() < 4) {
    // fila vazia: passa por todos os nichos de uma vez para saber se a cidade esgotou
    if (tentativas >= (fila.length ? 4 : CFG.categorias.length + 1)) break;
    tentativas++;
    try { await minerar(); } catch (e) { log('[mineração] erro:', e.message); break; }
    fila = DB.leads().filter((l) => l.etapa === 'fila');
    if (!fila.length && (DB.meta.rodadasSecas || 0) >= CFG.categorias.length) {
      if (!(await trocarCidade())) break;
      tentativas = 0;
    }
  }
  // escolhe o nicho menos abordado nas últimas 24h; dentro dele, o lead mais quente
  const recentes = DB.leads().filter((l) => l.abordadoEm && dias(l.abordadoEm) < 1);
  const usos = (c) => recentes.filter((l) => l.categoria === c).length;
  return fila.sort((a, b) => (b.manual ? 1 : 0) - (a.manual ? 1 : 0) || usos(a.categoria) - usos(b.categoria) || b.score - a.score || b.reviews - a.reviews)[0];
}

function proximoFollowup() {
  for (const l of DB.leads()) {
    if (l.respondeu || l.humano) continue;
    const d = dias(l.abordadoEm);
    // 1º benefício (dia 2) · 2º quebra de preço (dia 5) · 3º porta aberta (dia 9) · perdido (dia 14)
    if (l.etapa === 'abordado' && d >= CFG.followup1) return { l, n: 1 };
    if (l.etapa === 'followup1' && d >= CFG.followup2) return { l, n: 2 };
    if (l.etapa === 'followup2' && d >= CFG.followup2 + 4) return { l, n: 3 };
    if (l.etapa === 'followup3' && d >= CFG.followup2 + 9) { DB.upsert({ id: l.id, etapa: 'perdido' }); }
  }
  return null;
}

/* ---------- ações ---------- */
async function abordar(l) {
  const jid = await jidDoNumero(l.wa);
  if (!jid) { DB.upsert({ id: l.id, etapa: 'sem_whatsapp' }); log(`   ${l.nome}: sem WhatsApp, pulando`); return false; }
  try { await enriquecer(l); } catch (e) { log('   (sem fotos extras)', e.message); }
  const link = await linkPrevia(l);
  const msg = await abertura(l, link);
  const jidReal = await enviar(jid, msg);
  DB.upsert({ ...l, jid: jidReal, jids: [...new Set([jid, jidReal])], etapa: 'abordado', abordadoEm: new Date().toISOString(), linkPrevia: link });
  DB.log(l.id, 'eu', msg);
  log(`📤 Abordado: ${l.nome} (${l.score})`);
  return true;
}

async function fazerFollowup({ l, n }) {
  const msg = await followup(l, l.linkPrevia, n);
  await enviar(l.jid, msg);
  DB.upsert({ id: l.id, etapa: `followup${n}` });
  DB.log(l.id, 'eu', msg);
  log(`🔁 Follow-up ${n}: ${l.nome}`);
}

/* ---------- conversa ---------- */
const timers = new Map();
function agendarResposta(l) {
  clearTimeout(timers.get(l.id));
  // espera a pessoa terminar de escrever (várias mensagens seguidas) e responde como humano
  timers.set(l.id, setTimeout(() => processarResposta(l.id).catch((e) => log('[resposta] erro:', e.message)), 25e3 + Math.random() * 50e3));
}

async function processarResposta(id) {
  const l = DB.lead(id); if (!l || l.humano || ['negociando', 'optout', 'convertido'].includes(l.etapa)) return;
  if (!podeResponder(agoraBR())) { DB.upsert({ id, pendente: true }); return; }
  DB.upsert({ id, pendente: false });
  const r = await responder(l, l.linkPrevia);
  if (r.resposta?.trim()) { await enviar(l.jid, r.resposta.trim()); DB.log(id, 'eu', r.resposta.trim()); }
  DB.upsert({ id, resumo: r.resumo });
  if (r.acao === 'passar_para_dono') {
    DB.upsert({ id, etapa: 'negociando', passadoEm: new Date().toISOString() });
    if (modoSemIA()) {
      log(`🔥 ${l.nome} respondeu → avisando você`);
      await avisar(`🔥 *Lead respondeu!*\n*${l.nome}* (${l.categoria}, ${String(l.rating || '').replace('.', ',')}⭐)\n${r.resumo}\n\nPrévia que ele recebeu: ${l.linkPrevia}\nResponder: ${linkChat(l)}\n\nResponda pelo celular do chip. O robô não responde esse lead.`);
    } else {
      log(`💰 ${l.nome} quer fechar → avisando você`);
      await avisar(`💰 *Lead pronto para fechar!*\n*${l.nome}* (${l.categoria})\n${r.resumo}\n\nPrévia: ${l.linkPrevia}\nConversa: ${linkChat(l)}\n\nO robô parou de responder esse lead. Agora é com você: efetive o site no app e mande o Pix.`);
    }
  } else if (r.acao === 'optout') {
    DB.upsert({ id, etapa: 'optout' });
    log(`🚫 ${l.nome} não quer contato — nunca mais será abordado`);
  } else {
    DB.upsert({ id, etapa: 'conversando' });
  }
}

const AUTO = /mensagem autom[aá]tica|resposta autom[aá]tica|grande demanda|hor[aá]rio de atendimento|fora do (nosso )?hor[aá]rio|no momento (n[aã]o|estamos)|em breve (retornaremos|responderemos|entraremos)|retornaremos (o mais|em breve|assim)|agradecemos (o|seu) contato|obrigad[oa] (por|pelo) (entrar em )?contato|seja bem.?vind[oa]|clique no link|fa[cç]a seu agendamento|agende (pelo|por|no) link|nosso card[aá]pio|digite (o n[uú]mero|uma op[cç][aã]o|1)|escolha uma op[cç][aã]o|aguarde (que|um momento|nosso)/i;
function respostaAutomatica(l, texto) {
  const ultimaMinha = [...(l.conversa || [])].reverse().find((m) => m.papel === 'eu');
  const segundos = ultimaMinha ? (Date.now() - new Date(ultimaMinha.em)) / 1000 : 9999;
  const repetida = l.autoResposta && texto.slice(0, 300) === l.autoResposta;
  return repetida || AUTO.test(texto) || (segundos < 20 && texto.length > 60);
}

/* caiu no menu/robô da empresa: uma linha humana pedindo para chegar no dono (uma vez só) */
const ENCAMINHAR = [
  (l) => `Oi! Pode encaminhar pro(a) responsável, por favor? É sobre o site da *${l.nome}* que já deixei pronto 🙂`,
  (l) => `Obrigado! Consegue passar essa mensagem pro dono(a)? Deixei o site da *${l.nome}* prontinho pra ele(a) ver.`,
  (l) => `Oi! Quem cuida da divulgação aí? Fiz o site da *${l.nome}* e queria mostrar pro(a) responsável 🙂`,
];
function pedirEncaminhar(id) {
  DB.upsert({ id, pediuEncaminhar: true });
  setTimeout(async () => {
    const l = DB.lead(id);
    if (!l || l.respondeu || l.humano || ['optout', 'negociando'].includes(l.etapa)) return;
    const t = agoraBR();
    if (!dentroDaJanela(t) || !conectado()) return;
    if (DB.enviadosHoje(t.data) >= cotaHoje()) { DB.upsert({ id, pediuEncaminhar: false }); return; } // cota cheia: tenta outro dia
    try {
      const msg = ENCAMINHAR[Math.floor(Math.random() * ENCAMINHAR.length)](l);
      await enviar(l.jid, msg);
      DB.contarEnvio(t.data);
      DB.log(id, 'eu', msg);
      log(`📨 Pedi para encaminhar ao responsável: ${l.nome}`); segurarRitmo();
    } catch (e) { log('[encaminhar] erro:', e.message); }
  }, (100 + Math.random() * 140) * 1000);
}

async function aoReceber({ jid, alt, texto }) {
  const dig = (j) => String(j || '').split('@')[0].split(':')[0];
  // comandos seus, do seu WhatsApp pessoal
  if (CFG.meuWhats && [dig(jid), dig(alt)].some((d) => d && (d === CFG.meuWhats || d === '55' + CFG.meuWhats || '55' + d === CFG.meuWhats))) {
    return comando(texto.trim().toLowerCase(), texto.trim());
  }
  const l = DB.porJid(jid) || (alt && DB.porJid(alt));
  if (!l) return; // conversa que não é de lead do robô
  if (!(l.jids || []).includes(jid)) DB.upsert({ id: l.id, jids: [...(l.jids || []), jid] });
  // resposta automática do WhatsApp Business (saudação/ausência): registra, mas não conta como interesse
  if (!l.respondeu && respostaAutomatica(l, texto)) {
    DB.log(l.id, 'auto', texto);
    if (!l.autoResposta) log(`🤖 ${l.nome}: resposta automática do WhatsApp Business — pedindo para encaminhar ao responsável`);
    DB.upsert({ id: l.id, autoResposta: texto.slice(0, 300) });
    if (!l.pediuEncaminhar) pedirEncaminhar(l.id);
    return;
  }
  DB.log(l.id, 'cliente', texto);
  const primeira = !l.respondeu;
  DB.upsert({ id: l.id, respondeu: true, respondeuEm: l.respondeuEm || new Date().toISOString() });
  if (l.etapa === 'negociando') return avisar(`💬 *${l.nome}* mandou: "${texto.slice(0, 300)}"\n${linkChat(l)}`);
  if (l.humano || l.etapa === 'optout') return;
  if (primeira) log(`🔥 ${l.nome} respondeu!`);
  agendarResposta(DB.lead(l.id));
}

function aoMinhaMensagem({ jid, alt }) {
  const l = DB.porJid(jid) || (alt && DB.porJid(alt));
  if (l && !l.humano) { DB.upsert({ id: l.id, humano: true }); log(`🙋 Você assumiu a conversa com ${l.nome}; o robô não responde mais esse lead.`); }
}

async function comando(c, original = c) {
  const t = agoraBR();
  if (c.startsWith('/pausar')) { DB.setMeta('pausado', true); return avisar('⏸️ Robô pausado. Mande /retomar para voltar.'); }
  if (c.startsWith('/retomar')) { DB.setMeta('pausado', false); return avisar('▶️ Robô retomado.'); }
  if (c.startsWith('/status')) {
    const all = DB.leads(); const n = (e) => all.filter((l) => l.etapa === e).length;
    return avisar(`📊 *Robô LeadSite*\n📍 Campanha: ${cidadeAtual()}\nHoje: ${DB.enviadosHoje(t.data)}/${cotaHoje()} mensagens (${CFG.minPorHora}–${CFG.maxPorHora} por hora)\nNa fila: ${n('fila')}\nAbordados: ${all.filter((l) => l.abordadoEm).length}\nResponderam: ${all.filter((l) => l.respondeu).length}\nConversando: ${n('conversando')}\nProntos p/ fechar: ${n('negociando')}\nSem interesse: ${n('optout')}\n${DB.meta.pausado ? '⏸️ PAUSADO' : '▶️ rodando'}`);
  }
  if (c.startsWith('/teste')) return teste();
  if (c.startsWith('/cidade')) {
    const nova = original.slice(7).trim();
    if (!nova) return avisar(`📍 Campanha atual: *${cidadeAtual()}*\nPróximas da lista: ${CFG.cidades.filter((x) => !(DB.meta.cidadesUsadas || []).includes(x)).slice(0, 5).join(', ')}\n\nPara trocar: /cidade Cascavel, PR\nPara eu medir e escolher a melhor: /cidade melhor`);
    if (/^melhor$/i.test(nova)) { const r = await trocarCidade(); return r ? null : avisar('Não encontrei cidade nova na lista.'); }
    return trocarCidade(/,\s*[A-Za-z]{2}$/.test(nova) ? nova : `${nova}, PR`);
  }
  if (c.startsWith('/lead')) {
    const [busca, telefone, instagram] = original.slice(5).split('|').map((s) => s.trim());
    try {
      const r = await leadManual({ busca, telefone, instagram });
      if (r.jaAbordado) return avisar(`ℹ️ *${r.lead}* já foi abordado antes.\nPrévia: ${r.link}`);
      if (r.amanha) return avisar(`➕ *${r.lead}* adicionado. A cota de hoje já bateu (anti-ban), então ele é o primeiro de amanhã.`);
      if (r.naFila) return avisar(`➕ *${r.lead}* adicionado. Sai em ~${r.emMin} min (respeitando o intervalo entre mensagens).`);
      return avisar(`✅ *${r.lead}* abordado agora!\nPrévia que ele recebeu: ${r.link}`);
    } catch (e) { return avisar(`⚠️ /lead: ${e.message}\nUso: /lead Nome do negócio | telefone (opcional) | @instagram (opcional)`); }
  }
  if (c.startsWith('/')) return avisar('Comandos: /status, /pausar, /retomar, /teste, /lead Nome | telefone | @insta, /cidade');
}

/* teste de ponta a ponta: lead real, prévia real, mensagem real — mas enviada para VOCÊ */
/* lead que VOCÊ trouxe de fora: busca no Google pelo nome, completa com o que você passar e aborda.
   Não passa pelo filtro de "quente/sem site" e não conta na cota automática. */
export async function leadManual({ busca, telefone, instagram, categoria }) {
  if (!busca) throw new Error('informe o nome do negócio');
  let l = null;
  try { l = await buscarNegocio(busca, cidadeAtual()); } catch (e) { log('[manual] busca falhou:', e.message); }
  const ph = telefoneInfo(telefone || l?.telefone);
  if (!ph.wa) throw new Error('não achei telefone; mande junto: /lead Nome | (45) 99999-9999');
  if (!l) l = { id: 'manual_' + ph.digits, nome: busca, cidade: cidadeAtual(), endereco: '', rating: 0, reviews: 0, site: '', maps: '' };
  if (categoria) l.categoria = categoria;
  if (!l.categoria) l.categoria = 'Negócio local';
  Object.assign(l, { telefone: telefone || l.telefone, telDigits: ph.digits, wa: ph.wa, mobile: ph.mobile });
  if (instagram && (!l.site || l.siteTipo === 'sem')) { l.site = `https://instagram.com/${String(instagram).replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, '').replace(/\/$/, '')}`; l.siteTipo = 'social'; }
  Object.assign(l, pontuar(l));
  const existente = DB.lead(l.id);
  if (existente?.abordadoEm) return { lead: existente.nome, jaAbordado: true, link: existente.linkPrevia };
  DB.upsert({ ...l, etapa: 'fila', manual: true, mineradoEm: new Date().toISOString() });
  log(`➕ Lead manual: ${l.nome} (${l.categoria}${l.rating ? `, ${l.rating}⭐` : ''})`);

  // a cota é o teto do dia para TUDO: se já bateu, o lead fica na fila (sai primeiro amanhã)
  const t = agoraBR();
  if (DB.enviadosHoje(t.data) >= cotaHoje()) return { lead: l.nome, amanha: true };
  const falta = 5 * 60e3 - (Date.now() - (DB.meta.ultimoEnvio || 0));
  if (falta > 0 || ocupado || !conectado() || !dentroDaJanela(t)) {
    DB.setMeta('proximoEnvio', Math.min(DB.meta.proximoEnvio || Infinity, Date.now() + Math.max(falta, 60e3)));
    return { lead: l.nome, naFila: true, emMin: Math.ceil(Math.max(falta, 60e3) / 60e3) };
  }
  ocupado = true;
  try {
    if (!(await abordar(DB.lead(l.id)))) throw new Error('esse número não tem WhatsApp');
    DB.contarEnvio(t.data);
    segurarRitmo();
    const s = DB.lead(l.id);
    return { lead: s.nome, categoria: s.categoria, nota: s.rating, link: s.linkPrevia, mensagem: s.conversa?.at(-1)?.texto };
  } finally { ocupado = false; }
}

/* aborda o próximo lead agora (respeitando a cota do dia) e reagenda o ritmo normal */
export async function abordarAgora() {
  const t = agoraBR();
  if (!conectado()) throw new Error('WhatsApp desconectado');
  if (DB.enviadosHoje(t.data) >= cotaHoje()) throw new Error('cota de hoje já atingida');
  while (ocupado) await new Promise((r) => setTimeout(r, 1000));
  // nunca duas abordagens coladas: mínimo de 5 min desde a última (do robô ou manual)
  const falta = 5 * 60e3 - (Date.now() - (DB.meta.ultimoEnvio || 0));
  if (falta > 0) throw new Error(`aguarde ${Math.ceil(falta / 60e3)} min: a última abordagem foi há pouco`);
  ocupado = true;
  try {
    for (let i = 0; i < 4; i++) {
      const l = await proximoNovo(); if (!l) break;
      if (await abordar(l)) {
        DB.contarEnvio(t.data);
        DB.setMeta('proximoEnvio', Date.now() + proximoIntervalo(t));
        const salvo = DB.lead(l.id);
        return { lead: salvo.nome, categoria: salvo.categoria, nota: salvo.rating, link: salvo.linkPrevia, mensagem: salvo.conversa?.at(-1)?.texto, hoje: `${DB.enviadosHoje(t.data)}/${cotaHoje()}` };
      }
    }
    throw new Error('nenhum lead disponível com WhatsApp');
  } finally { ocupado = false; }
}

export async function teste() {
  let l = DB.leads().filter((x) => x.etapa === 'fila').sort((a, b) => b.score - a.score)[0];
  if (!l) { await minerar(); l = DB.leads().filter((x) => x.etapa === 'fila').sort((a, b) => b.score - a.score)[0]; }
  if (!l) return avisar('⚠️ Teste: não encontrei lead quente sem site agora.');
  try { await enriquecer(l); } catch { /* segue */ }
  const link = await linkPrevia(l);
  DB.upsert({ ...l });
  const msg = await abertura(l, link);
  await avisar(`🧪 *TESTE* — é exatamente isto que *${l.nome}* (${l.categoria}, ${String(l.rating).replace('.', ',')}⭐, ${l.reviews} avaliações) vai receber:`);
  await avisar(msg);
  log(`🧪 Teste enviado para você com o lead ${l.nome}`);
  return { lead: l.nome, link };
}

/* ---------- laço principal ---------- */
async function tick() {
  if (ocupado || !conectado() || DB.meta.pausado) return;
  ocupado = true;
  try {
    const t = agoraBR();
    // respostas que ficaram para a manhã
    if (podeResponder(t)) for (const l of DB.leads().filter((x) => x.pendente)) await processarResposta(l.id);
    if (!dentroDaJanela(t) || Date.now() < (DB.meta.proximoEnvio || 0)) return;
    if (DB.enviadosHoje(t.data) >= cotaHoje()) return;
    const fu = proximoFollowup();
    let enviou = false;
    if (fu) { await fazerFollowup(fu); enviou = true; }
    else {
      for (let i = 0; i < 4 && !enviou; i++) { const l = await proximoNovo(); if (!l) break; enviou = await abordar(l); }
    }
    if (enviou) {
      DB.contarEnvio(t.data);
      const ms = proximoIntervalo(t);
      DB.setMeta('proximoEnvio', Date.now() + ms);
      log(`   próximo envio em ~${Math.round(ms / 60e3)} min (${DB.enviadosHoje(t.data)}/${cotaHoje()} hoje)`);
    }
  } catch (e) {
    log('[robô] erro:', e.message);
    DB.setMeta('proximoEnvio', Date.now() + 10 * 60e3);
  } finally { ocupado = false; }
}

export function ligar() {
  onMensagem(aoReceber);
  onMinhaMensagem(aoMinhaMensagem);
  setInterval(tick, 30e3);
  setTimeout(tick, 8e3);
  // quem caiu em resposta automática e ainda não recebeu o pedido de encaminhamento
  DB.leads().filter((l) => l.autoResposta && !l.pediuEncaminhar && !l.respondeu && !l.humano)
    .forEach((l, i) => setTimeout(() => pedirEncaminhar(l.id), i * (180 + Math.random() * 120) * 1000));
  if (modoSemIA()) log('ℹ️  MODO SEM IA: mensagens de modelo; quem responder vai direto para você.');
  log(`🤖 Robô ligado — ${cidadeAtual()} · cota de hoje: ${cotaHoje()} abordagens · janela ${CFG.horaInicio}h–${CFG.horaFim}h`);
}
