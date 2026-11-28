import { CFG, faltando } from './config.js';
import { iniciar } from './wa.js';
import { ligar } from './robo.js';
import { iniciarServidor } from './server.js';
import { ligarNuvem } from './nuvem.js';

const f = faltando();
if (f.length) {
  console.error(`\n❌ Preencha no arquivo .env: ${f.join(', ')}\n   (copie .env.example para .env)\n`);
  process.exit(1);
}

console.log('\n🚀 LeadSite Robô — vendendo sites\n');
process.on('unhandledRejection', (e) => console.error('[erro]', e?.message || e));
iniciarServidor();
await iniciar();
ligar();
ligarNuvem();
