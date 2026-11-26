import 'dotenv/config';

const num = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v));
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export const CFG = {
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  placesKey: process.env.GOOGLE_PLACES_KEY || '',
  meuNome: process.env.MEU_NOME || '',
  empresa: process.env.EMPRESA || '',
  meuWhats: String(process.env.MEU_WHATS || '').replace(/\D/g, ''),
  preco: num(process.env.PRECO, 250),
  precoPromo: num(process.env.PRECO_PROMO, 150),
  mensalidade: num(process.env.MENSALIDADE, 0),
  cidade: process.env.CIDADE || 'Foz do Iguaçu, PR',
  categorias: list(process.env.CATEGORIAS),
  inicioPorDia: num(process.env.INICIO_POR_DIA, 8),
  aumentoPorDia: num(process.env.AUMENTO_POR_DIA, 4),
  maximoPorDia: num(process.env.MAXIMO_POR_DIA, 40),
  horaInicio: num(process.env.HORA_INICIO, 9),
  horaFim: num(process.env.HORA_FIM, 18),
  diasAtivos: list(process.env.DIAS_ATIVOS || '1,2,3,4,5,6').map(Number),
  respostaInicio: num(process.env.RESPOSTA_INICIO, 8),
  respostaFim: num(process.env.RESPOSTA_FIM, 21),
  followup1: num(process.env.FOLLOWUP1_DIAS, 2),
  followup2: num(process.env.FOLLOWUP2_DIAS, 5),
  demoBase: (process.env.DEMO_BASE || 'https://eiyago.github.io/leadsite-v2/').replace(/\/?$/, '/'),
  porta: num(process.env.PORTA, 3210),
  minPorHora: num(process.env.MIN_POR_HORA, 3),
  maxPorHora: num(process.env.MAX_POR_HORA, 4),
  // próximas campanhas (separadas por ";"). O robô mede o potencial e escolhe a melhor quando a atual esgotar.
  cidades: String(process.env.CIDADES || 'Cascavel, PR;Toledo, PR;Maringá, PR;Londrina, PR;Ponta Grossa, PR;Guarapuava, PR;Francisco Beltrão, PR;Pato Branco, PR;Medianeira, PR;Umuarama, PR;Campo Mourão, PR;Chapecó, SC;Dourados, MS;Campo Grande, MS;Curitiba, PR')
    .split(';').map((s) => s.trim()).filter(Boolean),
  fuso: 'America/Sao_Paulo',
};

if (!CFG.categorias.length) CFG.categorias = ['Barbearia', 'Salão de beleza', 'Hamburgueria', 'Pizzaria', 'Academia', 'Pet shop'];

export function faltando() {
  const f = [];
  if (!CFG.placesKey) f.push('GOOGLE_PLACES_KEY');
  if (!CFG.meuWhats) f.push('MEU_WHATS');
  if (!CFG.meuNome) f.push('MEU_NOME');
  return f;
}

/* hora e dia da semana no fuso de Brasília */
export function agoraBR() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: CFG.fuso, hour12: false, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hora = Number(p.hour) % 24, minuto = Number(p.minute);
  return { dia: dias[p.weekday], hora, minuto, minutos: hora * 60 + minuto, data: `${p.year}-${p.month}-${p.day}` };
}
