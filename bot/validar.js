/* Valida os sites de todos os leads antes de publicar: node validar.js  (ou: node validar.js <id>)
   Usa o mesmo motor do app (js/niches.js + js/site.js) e mostra o que bloqueia e o que é só aviso. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteData } from './src/site-link.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Date, JSON, String, Number, Object, Array, encodeURIComponent, parseFloat };
vm.createContext(ctx);
for (const f of ['js/niches.js', 'js/site.js']) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8').replace(/^const LSite/m, 'var LSite'), ctx, { filename: f });
const LSite = ctx.LSite || vm.runInContext('LSite', ctx);

const db = JSON.parse(fs.readFileSync(path.join(raiz, 'bot/data/robo.json'), 'utf8'));
const so = process.argv[2];
const leads = Object.values(db.leads).filter((l) => (so ? l.id === so : ['abordado', 'negociando', 'ig_valor', 'ig_oi', 'ig_fila'].includes(l.etapa)));
const tot = { ok: 0, bloq: 0 };
for (const l of leads) {
  const d = siteData(l);
  const r = LSite.validar(d);
  const b = r.filter((x) => x.nivel === 'bloqueia');
  b.length ? tot.bloq++ : tot.ok++;
  console.log(`\n${b.length ? '⛔' : '✅'} ${l.nome}  [${LSite.plan(d).seg} · ${LSite.plan(d).dir}]`);
  r.forEach((x) => console.log(`   ${x.nivel === 'bloqueia' ? '⛔' : '⚠️ '} ${x.campo}: ${x.msg}`));
}
console.log(`\n${leads.length} site(s): ${tot.ok} prontos para efetivar, ${tot.bloq} com bloqueio.`);
