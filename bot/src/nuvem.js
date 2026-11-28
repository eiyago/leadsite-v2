/* espelho dos leads no Supabase (opcional): liga sozinho quando SUPABASE_URL e SUPABASE_KEY estão no .env.
   O arquivo local data/robo.json continua sendo a fonte principal; aqui só enviamos o que mudou. */
import { DB } from './db.js';

const URL_ = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_KEY || '';
const enviado = new Map(); // id -> carimbo "atualizado" já enviado
export const nuvem = { ligada: !!(URL_ && KEY), ultimo: null, erro: null, total: 0 };

const linha = (l) => ({
  id: l.id, nome: l.nome || null, categoria: l.categoria || null, cidade: l.cidade || null,
  etapa: l.etapa || null, canal: l.canal || null, temp: l.temp || null,
  rating: typeof l.rating === 'number' ? l.rating : null, reviews: Number.isFinite(+l.reviews) ? +l.reviews : null,
  link_previa: l.linkPrevia || null, respondeu: !!l.respondeu, dados: l, atualizado: l.atualizado || new Date().toISOString(),
});

async function post(tabela, linhas) {
  const r = await fetch(`${URL_}/rest/v1/${tabela}?on_conflict=${tabela === 'meta' ? 'chave' : 'id'}`, {
    method: 'POST',
    headers: { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(linhas),
  });
  if (!r.ok) throw new Error(`${tabela}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

export async function sincronizar() {
  if (!nuvem.ligada) return;
  const mudou = DB.leads().filter((l) => l.id && enviado.get(l.id) !== l.atualizado);
  try {
    for (let i = 0; i < mudou.length; i += 100) {
      const lote = mudou.slice(i, i + 100);
      await post('leads', lote.map(linha));
      lote.forEach((l) => enviado.set(l.id, l.atualizado));
    }
    await post('meta', [{ chave: 'robo', valor: DB.meta, atualizado: new Date().toISOString() }]);
    nuvem.total += mudou.length; nuvem.ultimo = new Date().toISOString(); nuvem.erro = null;
    if (mudou.length) console.log(`☁️  Supabase: ${mudou.length} lead(s) sincronizado(s)`);
  } catch (e) {
    nuvem.erro = e.message; console.log('☁️  Supabase falhou:', e.message);
  }
}

export function ligarNuvem() {
  if (!nuvem.ligada) { console.log('☁️  Supabase desligado (sem SUPABASE_URL/SUPABASE_KEY no .env)'); return; }
  console.log('☁️  Supabase ligado: espelhando leads a cada 60s');
  sincronizar();
  setInterval(sincronizar, 60_000);
}
