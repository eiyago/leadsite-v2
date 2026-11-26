/* gera o link da prévia premium (mesmo formato do app: ?s=z… compactado) e encurta no is.gd */
import zlib from 'node:zlib';
import { CFG } from './config.js';
import { phoneInfo } from './places.js';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function siteData(l, extra = {}) {
  const d = { n: l.nome, c: l.categoria, ci: l.cidade, t: l.telefone, a: (l.endereco || '').replace(/, Brasil$|, \d{5}-\d{3}/g, ''), r: l.rating, u: l.reviews };
  if (/cid=/.test(l.maps || '')) d.m = l.maps;
  const s = CFG.empresa || CFG.meuNome; if (s) d.s = s;
  const w = phoneInfo(CFG.meuWhats).wa; if (w) d.w = w;
  if (l.fotos?.length) d.ph = l.fotos;
  if (l.avaliacoes?.length) d.rv = l.avaliacoes;
  if (l.horarios?.length) d.h = l.horarios;
  if (l.resumo) d.es = l.resumo;
  return { ...d, ...extra };
}

export function linkLongo(l, extra) {
  const packed = zlib.deflateRawSync(Buffer.from(JSON.stringify(siteData(l, extra)), 'utf8'));
  return `${CFG.demoBase}demo.html?s=z${b64u(packed)}`;
}

export async function encurtar(url) {
  for (const host of ['https://is.gd', 'https://v.gd']) {
    try {
      const r = await fetch(`${host}/create.php?format=simple&url=${encodeURIComponent(url)}`);
      const t = (await r.text()).trim();
      if (r.ok && /^https?:\/\//.test(t)) return t;
    } catch { /* tenta o próximo */ }
  }
  return url;
}

export async function linkPrevia(l) {
  if (l.linkPrevia) return l.linkPrevia;
  l.linkPrevia = await encurtar(linkLongo(l));
  return l.linkPrevia;
}
