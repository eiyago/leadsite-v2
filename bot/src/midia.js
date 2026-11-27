/* Banco de mídia dos leads: logo, fotos reais (Instagram + Google Maps), avaliações escritas, serviços/preços e slogans.
   As imagens são baixadas e guardadas no próprio repositório (img/l/<slug>/), publicadas no GitHub Pages:
   ficam permanentes (as URLs do Instagram/Google expiram) e o site carrega rápido, do mesmo endereço. */
import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { CFG } from './config.js';
import { DB } from './db.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..'); // pasta do LeadSite (repositório do site)
const log = (...a) => console.log('[mídia]', ...a);

export const slugDe = (l) => String(l.nome || l.id).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + String(l.id).slice(-6).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/* largura x altura de um JPEG/PNG sem bibliotecas (para descartar panorâmicas 360°, que ficam distorcidas) */
function tamanho(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
async function baixar(url, destinoSemExt) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/avif,image/webp,image/*' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const tipo = (r.headers.get('content-type') || '').split(';')[0];
  const ext = TIPOS[tipo]; if (!ext) throw new Error('não é imagem: ' + tipo);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2500) throw new Error('imagem pequena demais');
  if (buf.length > 4.5e6) throw new Error('imagem grande demais');
  const t = tamanho(buf);
  if (t && t.w / t.h >= 1.9) throw new Error('panorâmica 360°, descartada');
  writeFileSync(`${destinoSemExt}.${ext}`, buf);
  return `${destinoSemExt}.${ext}`;
}

/* publica no GitHub em lote (um commit a cada poucos minutos, não um por lead) */
let pendente = false, timer = null;
const git = (args) => new Promise((res, rej) => execFile('git', args, { cwd: RAIZ }, (e, out, err) => (e ? rej(new Error(err || e.message)) : res(out))));
function agendarPublicacao() {
  pendente = true; clearTimeout(timer);
  timer = setTimeout(async () => {
    if (!pendente) return; pendente = false;
    try {
      await git(['add', 'img/l']);
      const st = await git(['status', '--porcelain', 'img/l']); if (!st.trim()) return;
      await git(['commit', '-m', 'Mídia real dos leads (logo, fotos)\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>']);
      await git(['push', '-q']);
      log('publicado no GitHub Pages');
    } catch (e) { log('falha ao publicar:', e.message); pendente = true; }
  }, 90e3);
}

/* recebe o que foi coletado no navegador e monta o "kit" do site do lead */
export async function salvarMidia(id, k = {}) {
  const l = DB.lead(id); if (!l) throw new Error('lead não encontrado');
  const slug = slugDe(l); const pasta = join(RAIZ, 'img', 'l', slug); mkdirSync(pasta, { recursive: true });
  const base = `${CFG.demoBase.replace(/\/?$/, '/')}img/l/${slug}/`;
  const urlDe = (arq) => base + arq.split(/[\\/]/).pop();
  // apaga a mídia antiga desse lead (recoleta)
  if (k.fotos?.length) for (const f of readdirSync(pasta)) if (/^f\d+\./.test(f)) unlinkSync(join(pasta, f));

  let logo = l.sx?.lg || '';
  if (k.logo) { try { logo = urlDe(await baixar(k.logo, join(pasta, 'logo'))); } catch (e) { log(l.nome, 'logo:', e.message); } }
  const fotos = [];
  for (const [i, u] of (k.fotos || []).slice(0, 12).entries()) {
    try { fotos.push(urlDe(await baixar(u, join(pasta, 'f' + String(i + 1).padStart(2, '0'))))); } catch (e) { log(l.nome, 'foto', i + 1, e.message); }
  }
  const sx = { ...(l.sx || {}) };
  if (logo) sx.lg = logo;
  if (k.servicos?.length) sx.sv = k.servicos.slice(0, 8).map((s) => [String(s[0]).slice(0, 60), String(s[1] || '').slice(0, 140), s[2] ? String(s[2]).slice(0, 20) : '']);
  if (k.slogan) sx.hl = String(k.slogan).slice(0, 80);
  if (k.sub) sx.sub = String(k.sub).slice(0, 180);
  if (k.instagram) sx.ig = String(k.instagram).replace(/^@/, '');
  const up = { id, sx, midiaEm: new Date().toISOString(), linkPrevia: null };
  if (fotos.length) up.fotos = fotos;
  if (k.avaliacoes?.length) up.avaliacoes = k.avaliacoes.slice(0, 6).map((v) => ({ a: String(v.a || 'Cliente').slice(0, 60), r: Number(v.r) || 5, t: String(v.t).length > 280 ? String(v.t).slice(0, 277).trim() + '…' : String(v.t) }));
  if (k.horarios?.length) up.horarios = k.horarios;
  if (k.bio) up.resumo = String(k.bio).slice(0, 400);
  if (existsSync(pasta) && (logo || fotos.length)) agendarPublicacao();
  DB.upsert(up);
  log(`${l.nome}: logo ${logo ? 'sim' : 'não'}, ${fotos.length} fotos, ${up.avaliacoes?.length || 0} avaliações, ${sx.sv?.length || 0} serviços`);
  return { slug, logo, fotos, avaliacoes: up.avaliacoes?.length || 0, servicos: sx.sv?.length || 0, publicaEm: '~2 min' };
}
