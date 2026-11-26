/* o vendedor: minera, aborda aos poucos, faz follow-up, conversa e te chama na hora de fechar */
import { CFG, agoraBR } from './config.js';
import { DB } from './db.js';
import { buscar, enriquecer } from './places.js';
import { linkPrevia } from './site-link.js';
import { abertura, responder, followup } from './ai.js';
import { conectado, enviar, jidDoNumero, onMensagem, onMinhaMensagem } from './wa.js';

const DIA = 864e5;
const dias = (iso) => (iso ? (Date.now() - new Date(iso)) / DIA : 0);
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);
let ownerJid = null;
let ocupado = false;

/* ---------- ritmo anti-ban ---------- */
export function cotaHoje() {
  const d = Math.floor(dias(DB.meta.inicio));
  return Math.min(CFG.maximoPorDia, CFG.inicioPorDia + CFG.aumentoPorDia * d);
}
const dentroDaJanela = (t) => CFG.diasAtivos.includes(t.dia) && t.hora >= CFG.horaInicio && t.hora < CFG.horaFim;
const podeResponder = (t) => t.hora >= CFG.respostaInicio && t.hora < CFG.respostaFim;

function proximoIntervalo(t) {
  const restante = Math.max(15, CFG.horaFim * 60 - t.minutos);
  const faltam = Math.max(1, cotaHoje() - DB.enviadosHoje(t.data));
  const base = Math.min(30, Math.max(4, restante / faltam)); // minutos, entre 4 e 30
  return base * (0.6 + Math.random() * 0.8) * 60e3;
}

/* ---------- avisos para você ---------- */
async function avisar(texto) {
  try {
    if (!ownerJid) ownerJid = await jidDoNumero(CFG.meuWhats.startsWith('55') ? CFG.meuWhats : '55' + CFG.meuWhats);
    if (ownerJid) await enviar(ownerJid, texto);
  } catch (e) { log('[aviso] falhou:', e.message); }
}
const linkChat = (l) => `https://wa.me/${l.wa}`;

/* ---------- mineração ---------- */
async function minerar() {
  const cat = CFG.categorias[DB.meta.catIdx % CFG.categorias.length];
  DB.setMeta('catIdx', DB.meta.catIdx + 1);
  log(`⛏️  Minerando "${cat}" em ${CFG.cidade}…`);
  const achados = await buscar(cat, CFG.cidade, 60);
  let novos = 0;
  for (const l of achados) {
    if (DB.lead(l.id)) continue;
    if (l.temp !== 'quente' || l.siteTipo === 'tem' || !l.mobile) continue; // só quentes, sem site e com celular
    DB.upsert({ ...l, etapa: 'fila', mineradoEm: new Date().toISOString() });
    novos++;
  }
  log(`   +${novos} leads quentes sem site na fila`);
  return novos;
}

async function proximoNovo() {
  let fila = DB.leads().filter((l) => l.etapa === 'fila');
  let tentativas = 0;
  while (fila.length < 5 && tentativas < 3) {
    tentativas++;
    try { await minerar(); } catch (e) { log('[mineração] erro:', e.message); break; }
    fila = DB.leads().filter((l) => l.etapa === 'fila');
  }
  return fila.sort((a, b) => b.score - a.score || b.reviews - a.reviews)[0];
}

function proximoFollowup() {
  for (const l of DB.leads()) {
    if (l.respondeu || l.humano) continue;
    const d = dias(l.abordadoEm);
    if (l.etapa === 'abordado' && d >= CFG.followup1) return { l, n: 1 };
    if (l.etapa === 'followup1' && d >= CFG.followup2) return { l, n: 2 };
    if (l.etapa === 'followup2' && d >= CFG.followup2 + 4) { DB.upsert({ id: l.id, etapa: 'perdido' }); }
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
  DB.upsert({ id: l.id, etapa: n === 1 ? 'followup1' : 'followup2' });
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
    log(`💰 ${l.nome} quer fechar → avisando você`);
    await avisar(`💰 *Lead pronto para fechar!*\n*${l.nome}* (${l.categoria})\n${r.resumo}\n\nPrévia: ${l.linkPrevia}\nConversa: ${linkChat(l)}\n\nO robô parou de responder esse lead. Agora é com você: efetive o site no app e mande o Pix.`);
  } else if (r.acao === 'optout') {
    DB.upsert({ id, etapa: 'optout' });
    log(`🚫 ${l.nome} não quer contato — nunca mais será abordado`);
  } else {
    DB.upsert({ id, etapa: 'conversando' });
  }
}

async function aoReceber({ jid, alt, texto }) {
  const dig = (j) => String(j || '').split('@')[0].split(':')[0];
  // comandos seus, do seu WhatsApp pessoal
  if (CFG.meuWhats && [dig(jid), dig(alt)].some((d) => d && (d === CFG.meuWhats || d === '55' + CFG.meuWhats || '55' + d === CFG.meuWhats))) {
    return comando(texto.trim().toLowerCase());
  }
  const l = DB.porJid(jid) || (alt && DB.porJid(alt));
  if (!l) return; // conversa que não é de lead do robô
  if (!(l.jids || []).includes(jid)) DB.upsert({ id: l.id, jids: [...(l.jids || []), jid] });
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

async function comando(c) {
  const t = agoraBR();
  if (c.startsWith('/pausar')) { DB.setMeta('pausado', true); return avisar('⏸️ Robô pausado. Mande /retomar para voltar.'); }
  if (c.startsWith('/retomar')) { DB.setMeta('pausado', false); return avisar('▶️ Robô retomado.'); }
  if (c.startsWith('/status')) {
    const all = DB.leads(); const n = (e) => all.filter((l) => l.etapa === e).length;
    return avisar(`📊 *Robô LeadSite*\nHoje: ${DB.enviadosHoje(t.data)}/${cotaHoje()} abordagens\nNa fila: ${n('fila')}\nAbordados: ${all.filter((l) => l.abordadoEm).length}\nResponderam: ${all.filter((l) => l.respondeu).length}\nConversando: ${n('conversando')}\nProntos p/ fechar: ${n('negociando')}\nSem interesse: ${n('optout')}\n${DB.meta.pausado ? '⏸️ PAUSADO' : '▶️ rodando'}`);
  }
  if (c.startsWith('/')) return avisar('Comandos: /status, /pausar, /retomar');
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
  log(`🤖 Robô ligado — ${CFG.cidade} · cota de hoje: ${cotaHoje()} abordagens · janela ${CFG.horaInicio}h–${CFG.horaFim}h`);
}
