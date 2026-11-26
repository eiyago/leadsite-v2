/* conexão com o WhatsApp (como o WhatsApp Web: escaneie o QR uma vez) */
import * as B from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

// compatível com o pacote em CommonJS ou ESM
const lib = B.useMultiFileAuthState ? B : (B.default || B);
const makeWASocket = typeof lib.default === 'function' ? lib.default : (typeof B.default === 'function' ? B.default : lib.makeWASocket);
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = lib;
import pino from 'pino';

let sock = null;
let pronto = false;
let aoReceber = async () => {};
let aoProprio = () => {};
const enviadasPeloRobo = new Set();
const enviandoPara = new Set();

let ultimoQR = '';
export const qrAtual = () => (pronto ? '' : ultimoQR);
export const conectado = () => pronto;
export function onMensagem(fn) { aoReceber = fn; }
/* mensagens que VOCÊ digitou no celular do chip (o robô para de responder esse lead) */
export function onMinhaMensagem(fn) { aoProprio = fn; }

export async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), markOnlineOnConnect: false, syncFullHistory: false, browser: ['LeadSite', 'Chrome', '1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) ultimoQR = qr;
    if (qr) { console.log('\n🌐 Ou abra no navegador: http://localhost:3210/qr'); console.log('\n📱 Escaneie com o WhatsApp do CHIP DE VENDAS (Aparelhos conectados > Conectar aparelho):\n'); qrcode.generate(qr, { small: true }); }
    if (connection === 'open') { pronto = true; console.log('✅ WhatsApp conectado'); }
    if (connection === 'close') {
      pronto = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) { console.log('⚠️ Sessão encerrada no celular. Apague a pasta "auth" e rode de novo para escanear o QR.'); return; }
      console.log('🔄 Reconectando…'); setTimeout(iniciar, 5000);
    }
  });
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message) continue;
      const jid = m.key.remoteJid || '';
      if (m.key.fromMe) {
        const id = m.key.id;
        setTimeout(() => { if (!enviadasPeloRobo.has(id) && !enviandoPara.has(jid)) aoProprio({ jid, alt: m.key.remoteJidAlt || '' }); }, 4000);
        continue;
      }
      if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue; // ignora grupos e status
      const texto = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || (m.message.audioMessage ? '[áudio]' : m.message.imageMessage ? '[imagem]' : '');
      if (!texto) continue;
      const alt = m.key.remoteJidAlt || m.key.senderPn || '';
      try { await aoReceber({ jid, alt, texto, nome: m.pushName || '' }); } catch (e) { console.error('[wa] erro ao tratar mensagem:', e.message); }
    }
  });
}

/* número existe no WhatsApp? devolve o jid correto (resolve o 9º dígito) */
export async function jidDoNumero(wa) {
  try {
    const [r] = await sock.onWhatsApp(wa);
    return r?.exists ? r.jid : null;
  } catch { return null; }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* envia como uma pessoa: "digitando…" proporcional ao tamanho do texto */
export async function enviar(jid, texto) {
  if (!pronto) throw new Error('WhatsApp desconectado');
  try { await sock.presenceSubscribe(jid); } catch { /* ok */ }
  await sock.sendPresenceUpdate('composing', jid);
  await espera(Math.min(14000, 2500 + texto.length * 45 + Math.random() * 2500));
  await sock.sendPresenceUpdate('paused', jid);
  enviandoPara.add(jid);
  try {
    const r = await sock.sendMessage(jid, { text: texto });
    if (r?.key?.id) enviadasPeloRobo.add(r.key.id);
    return r?.key?.remoteJid || jid;
  } finally { setTimeout(() => enviandoPara.delete(jid), 6000); }
}
