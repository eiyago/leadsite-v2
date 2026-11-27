/* painel local: o app (aba Pipeline → "Sincronizar robô") lê os leads daqui */
import http from 'node:http';
import { CFG, agoraBR } from './config.js';
import { DB } from './db.js';
import QRCode from 'qrcode';
import { conectado, qrAtual } from './wa.js';
import * as F from './funil.js';
import { cotaHoje, teste, abordarAgora, leadManual, cidadeAtual } from './robo.js';

const PAGINA_QR = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar WhatsApp — Robô LeadSite</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e2e8f0;font:16px system-ui;text-align:center}
.c{background:#fff;color:#111;border-radius:20px;padding:28px 32px;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
img{width:300px;height:300px;image-rendering:pixelated}h1{font-size:20px;margin:0 0 6px}ol{text-align:left;font-size:14px;line-height:1.6;padding-left:20px}.ok{font-size:48px}</style></head>
<body><div class="c" id="c">Carregando…</div><script>
async function t(){try{const r=await fetch('/qr.json');const j=await r.json();const c=document.getElementById('c');
if(j.conectado){c.innerHTML='<div class="ok">✅</div><h1>WhatsApp conectado!</h1><p>Pode fechar esta página. O robô começa no horário configurado.</p>';return;}
if(!j.img){c.innerHTML='<h1>Gerando QR…</h1><p>Aguarde alguns segundos.</p>';}
else c.innerHTML='<h1>Conecte o chip de vendas</h1><img src="'+j.img+'" alt="QR"><ol><li>No celular do <b>chip de vendas</b>, abra o WhatsApp</li><li>Toque em ⋮ ou Configurações → <b>Aparelhos conectados</b></li><li><b>Conectar um aparelho</b> e aponte para o QR</li></ol><small>O QR muda sozinho a cada ~20s.</small>';}catch(e){}
setTimeout(t,3000)}t();</script></body></html>`;

const ETAPA = { oi: 'abordado', pitch: 'abordado', valor: 'followup', preco: 'followup', ig_enviado: 'abordado', abordado: 'abordado', followup1: 'abordado', followup2: 'followup', followup3: 'followup', conversando: 'followup', negociando: 'agendado', convertido: 'convertido', optout: 'perdido', perdido: 'perdido' };

function paraApp(l) {
  return {
    id: l.id, nome: l.nome, categoria: l.categoria, cidade: l.cidade, telefone: l.telefone, telDigits: l.telDigits, wa: l.wa, mobile: l.mobile,
    endereco: l.endereco, rating: l.rating, reviews: l.reviews, site: l.site, siteTipo: l.siteTipo, maps: l.maps, score: l.score, temp: l.temp,
    fotos: l.fotos, avaliacoes: l.avaliacoes, horarios: l.horarios, resumoGoogle: l.resumo,
    stage: ETAPA[l.etapa], etapaRobo: l.etapa, resumoRobo: l.resumo || '', humano: !!l.humano,
    abordadoEm: l.abordadoEm, respondeuEm: l.respondeuEm, linkPrevia: l.linkPrevia,
    conversa: (l.conversa || []).slice(-12),
  };
}

export function iniciarServidor() {
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const send = (obj, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/qr') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGINA_QR); }
    if (url.pathname === '/qr.json') {
      const q = qrAtual();
      if (!q) return send({ conectado: conectado(), img: '' });
      return QRCode.toDataURL(q, { margin: 1, width: 600 }).then((img) => send({ conectado: false, img })).catch(() => send({ conectado: false, img: '' }));
    }
    if (url.pathname === '/leads') return send(DB.leads().filter((l) => ETAPA[l.etapa]).map(paraApp));
    if (url.pathname === '/status') {
      const t = agoraBR(); const all = DB.leads();
      return send({ conectado: conectado(), pausado: !!DB.meta.pausado, hoje: DB.enviadosHoje(t.data), cota: cotaHoje(), fila: all.filter((l) => l.etapa === 'fila').length, abordados: all.filter((l) => l.abordadoEm).length, responderam: all.filter((l) => l.respondeu).length, prontos: all.filter((l) => l.etapa === 'negociando').length, cidade: cidadeAtual(), cidadesUsadas: DB.meta.cidadesUsadas || [] });
    }
    if (req.method === 'POST' && url.pathname === '/abordar-agora') {
      return abordarAgora().then((r) => send({ ok: true, ...r })).catch((e) => send({ ok: false, erro: e.message }, 400));
    }
    if (req.method === 'POST' && url.pathname === '/lead') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        let dados = {}; try { dados = JSON.parse(body || '{}'); } catch { /* corpo inválido */ }
        leadManual(dados).then((r) => send({ ok: true, ...r })).catch((e) => send({ ok: false, erro: e.message }, 400));
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/teste') {
      return teste().then((r) => send({ ok: true, ...(r || {}) })).catch((e) => send({ ok: false, erro: e.message }, 500));
    }
    /* fila do Instagram: leads sem celular que têm Instagram (nunca recebem WhatsApp) */
    if (url.pathname === '/instagram') {
      const t = agoraBR(); const hoje = DB.leads().filter((l) => l.igEm && l.igEm.startsWith(t.data)).length;
      const fila = DB.leads().filter((l) => l.etapa === 'ig_fila').sort((a, b) => (b.temp === 'quente') - (a.temp === 'quente') || b.score - a.score)
        .slice(0, 30).map((l) => ({ id: l.id, nome: l.nome, categoria: l.categoria, cidade: l.cidade, temp: l.temp, rating: l.rating, reviews: l.reviews,
          insta: (l.site.match(/instagram\.com\/([^/?#]+)/i) || [])[1] || '', story: F.insta(l, true), direct: F.insta(l, false) }));
      return send({ hoje, limite: 20, fila, enviados: DB.leads().filter((l) => l.etapa === 'ig_enviado').length });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/instagram/')) {
      const [, , id, acao] = url.pathname.split('/').map(decodeURIComponent);
      if (!DB.lead(id)) return send({ ok: false, erro: 'lead não encontrado' }, 404);
      if (acao === 'enviado') DB.upsert({ id, etapa: 'ig_enviado', canal: 'instagram', igEm: new Date().toISOString() });
      else if (acao === 'pular') DB.upsert({ id, etapa: 'ig_pulado' });
      else if (acao === 'respondeu') DB.upsert({ id, etapa: 'negociando', canal: 'instagram', respondeu: true, respondeuEm: new Date().toISOString() });
      return send({ ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/pausar') { DB.setMeta('pausado', true); return send({ ok: true }); }
    if (req.method === 'POST' && url.pathname === '/retomar') { DB.setMeta('pausado', false); return send({ ok: true }); }
    if (req.method === 'POST' && url.pathname.startsWith('/convertido/')) {
      const id = decodeURIComponent(url.pathname.split('/')[2]); if (DB.lead(id)) DB.upsert({ id, etapa: 'convertido' });
      return send({ ok: true });
    }
    send({ erro: 'não encontrado' }, 404);
  }).listen(CFG.porta, '127.0.0.1', () => console.log(`🖥️  Painel do robô em http://localhost:${CFG.porta}/status`));
}
