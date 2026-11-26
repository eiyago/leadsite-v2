/* banco local em arquivo JSON (data/robo.json), gravação atômica */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('data');
const FILE = path.join(DIR, 'robo.json');
fs.mkdirSync(DIR, { recursive: true });

const vazio = () => ({ meta: { inicio: new Date().toISOString(), pausado: false, catIdx: 0, enviadosPorDia: {}, proximoEnvio: 0 }, leads: {} });

let db = vazio();
try { db = { ...vazio(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* primeiro uso */ }

let timer = null;
export function salvar() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE);
  }, 200);
}

export const DB = {
  get meta() { return db.meta; },
  leads: () => Object.values(db.leads),
  lead: (id) => db.leads[id],
  porJid: (jid) => {
    const dig = String(jid || '').split('@')[0].split(':')[0];
    return Object.values(db.leads).find((l) => l.jid === jid || (l.jids || []).includes(jid) || (dig && (l.wa === dig || l.wa === '55' + dig || (l.jid || '').startsWith(dig))));
  },
  upsert(l) { db.leads[l.id] = { ...(db.leads[l.id] || {}), ...l, atualizado: new Date().toISOString() }; salvar(); return db.leads[l.id]; },
  log(id, papel, texto) {
    const l = db.leads[id]; if (!l) return;
    (l.conversa = l.conversa || []).push({ papel, texto, em: new Date().toISOString() });
    l.atualizado = new Date().toISOString(); salvar();
  },
  contarEnvio(data) { db.meta.enviadosPorDia[data] = (db.meta.enviadosPorDia[data] || 0) + 1; salvar(); },
  enviadosHoje: (data) => db.meta.enviadosPorDia[data] || 0,
  setMeta(k, v) { db.meta[k] = v; salvar(); },
};
