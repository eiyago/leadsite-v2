/* painel local: o app (aba Pipeline → "Sincronizar robô") lê os leads daqui */
import http from 'node:http';
import { CFG, agoraBR } from './config.js';
import { DB } from './db.js';
import { conectado } from './wa.js';
import { cotaHoje } from './robo.js';

const ETAPA = { abordado: 'abordado', followup1: 'abordado', followup2: 'followup', conversando: 'followup', negociando: 'agendado', convertido: 'convertido', optout: 'perdido', perdido: 'perdido' };

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
    if (url.pathname === '/leads') return send(DB.leads().filter((l) => ETAPA[l.etapa]).map(paraApp));
    if (url.pathname === '/status') {
      const t = agoraBR(); const all = DB.leads();
      return send({ conectado: conectado(), pausado: !!DB.meta.pausado, hoje: DB.enviadosHoje(t.data), cota: cotaHoje(), fila: all.filter((l) => l.etapa === 'fila').length, abordados: all.filter((l) => l.abordadoEm).length, responderam: all.filter((l) => l.respondeu).length, prontos: all.filter((l) => l.etapa === 'negociando').length, cidade: CFG.cidade });
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
