/* Vendedor IA (Claude): escreve a 1ª mensagem e conduz a conversa até a hora de fechar */
import Anthropic from '@anthropic-ai/sdk';
import { CFG } from './config.js';

let _client = null;
const cliente = () => (_client ||= new Anthropic({ apiKey: CFG.anthropicKey }));

/* modo sem IA: sem chave ou sem créditos → mensagens de modelo + você assume quem responder */
let semIA = !CFG.anthropicKey;
export const modoSemIA = () => semIA;
function talvezDesligarIA(e) {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || (e instanceof Anthropic.BadRequestError && /credit|billing|balance/i.test(e.message))) {
    if (!semIA) console.log('⚠️  Sem créditos/chave da Anthropic: seguindo em MODO SEM IA (você responde quem retornar).');
    semIA = true;
  }
}
const h = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const nota = (l) => (l.rating ? `${String(l.rating).replace('.', ',')}⭐ com ${l.reviews} avaliações` : '');
const assinatura = () => `${CFG.meuNome}${CFG.empresa ? ` — ${CFG.empresa}` : ''}`.trim();
const cat = (l) => String(l.categoria || 'empresa').toLowerCase();
const cid = (l) => String(l.cidade || '').split(',')[0] || 'sua cidade';
const saud = () => { const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

/* abertura: elogio real → problema → solução pronta → objeções já quebradas (tempo, custo, Instagram) → fechamento.
   Mesmo tamanho de antes; sem números inventados. Premissa: no ar em 24h. */
const pag = () => (CFG.mensalidade ? 'investimento baixo' : 'pagamento único, sem mensalidade');
/* abertura persuasiva: elogio real → DOR (o concorrente com site leva o cliente) → solução pronta → objeções quebradas → fechamento */
const Pag = () => pag()[0].toUpperCase() + pag().slice(1);
const n2 = (l, pre = ' (', pos = ')') => (nota(l) ? `${pre}${nota(l)}${pos}` : '');
const MODELOS = [
  (l, k) => `${saud()}! Vi a *${l.nome}* no Google${n2(l, ' — ', '')} 👏\n\nHoje, quem pesquisa ${cat(l)} em ${cid(l)} encontra primeiro o concorrente que tem site, e fecha com ele, mesmo sem a reputação de vocês.\n\nResolvi isso: o site de vocês já está pronto 👇\n${k}\n\n${Pag()}, sem trabalho pra você e no ar em 24h. Posso ativar?`,
  (l, k) => `${saud()}! A *${l.nome}*${n2(l, ' tem ', '')}: reputação que muito concorrente não tem. Mas sem site, é ele que aparece no Google e leva o seu cliente.\n\nVirei esse jogo pra vocês: site pronto, com fotos, avaliações e botão direto pro WhatsApp 👇\n${k}\n\nVocê só aprova e em 24h está no ar. Bora?`,
  (l, k) => `${saud()}! Pesquisei ${cat(l)} em ${cid(l)}: a *${l.nome}*${n2(l)} aparece sem site, enquanto o concorrente mostra serviços, fotos e WhatsApp num clique.\n\nCliente novo escolhe quem passa mais confiança. Por isso já fiz o de vocês 👇\n${k}\n\n${Pag()}, no ar em 24h. Posso ativar?`,
  (l, k) => `${saud()}! Cada pessoa que pesquisa ${cat(l)} em ${cid(l)} e não acha o site da *${l.nome}* vai pro concorrente${n2(l, ', mesmo vocês tendo ', '')}.\n\nO site de vocês já está pronto, aberto 24h e levando direto pro WhatsApp 👇\n${k}\n\nNão precisa entender de internet nem pagar mensalidade. Coloco no ar em 24h?`,
];
const MODELOS_SOCIAL = [
  (l, k) => `${saud()}! A *${l.nome}* manda bem no Instagram${n2(l)}, mas o Google não mostra Instagram como site: quem pesquisa ${cat(l)} em ${cid(l)} acaba no concorrente.\n\nO site de vocês já está pronto 👇\n${k}\n\nNão substitui o Insta, soma. ${Pag()}, no ar em 24h. Posso ativar?`,
  (l, k) => `${saud()}! Quem pesquisa ${cat(l)} em ${cid(l)} no Google vê o site do concorrente, e a *${l.nome}*${n2(l)} fica de fora, só no Instagram.\n\nVirei isso pra vocês: site pronto, levando direto pro seu WhatsApp 👇\n${k}\n\nVocê só aprova e em 24h está no ar. Bora?`,
];
const modeloAbertura = (l, k) => { const M = l.siteTipo === 'social' ? MODELOS_SOCIAL : MODELOS; return M[h(l.id || l.nome) % M.length](l, k); };

/* follow-ups: 1 dor do concorrente · 2 condição especial (estilo do dono) · 3 porta aberta */
const promo = () => money(CFG.precoPromo || CFG.preco);
const FOLLOWUPS = {
  1: (l, k) => `Oi! Enquanto o site da *${l.nome}* não está no ar, quem pesquisa ${cat(l)} em ${cid(l)} continua indo pro concorrente 😕\n\nO de vocês já está pronto 👇\n${k}\n\nPosso ativar hoje?`,
  2: (l, k) => `🤝 Tenho uma condição especial para vocês!\n\nConsigo finalizar o site da *${l.nome}* por ${promo()}, pagamento único e sem mensalidade.\n\nVocês já têm uma ótima reputação; falta apenas uma vitrine profissional para transmitir confiança e evitar que clientes acabem escolhendo a concorrência.\n\nA página já está pronta! 🚀\n${k}\n\n💳 O pagamento fica à escolha de vocês: Pix ou cartão.\n\nPodemos finalizar?`,
  3: (l) => `Oi! Vou arquivar o site da *${l.nome}* por aqui 🙂\n\nA condição de ${promo()} ainda está de pé: se quiser, é só responder "quero" que coloco no ar em 24h. Sucesso! 🙌`,
};
const MODEL = 'claude-opus-5-5';
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const DONO = () => CFG.meuNome || 'o responsável';
const SISTEMA = () => `Você é o vendedor de ${DONO()}${CFG.empresa ? ` (${CFG.empresa})` : ''}: especialista em vendas consultivas, negociação e persuasão, focado em vender sites profissionais para pequenos negócios pelo WhatsApp. Sua missão é transformar leads em clientes pagantes. Pense como vendedor, escreva como copywriter e feche como negociador.

O PRODUTO
- O cliente já recebeu o site PRONTO dele (link na conversa), feito com as fotos, avaliações e informações reais do negócio no Google.
- Botão de WhatsApp, rota no Google Maps, horários, galeria e avaliações. Ajustes de textos, fotos, cores e preços sem custo antes de publicar.
- Investimento: ${money(CFG.preco)}${CFG.mensalidade ? ` + ${money(CFG.mensalidade)}/mês` : ' (pagamento único)'}. No ar em até 24h após a aprovação. Pix ou cartão.
- Condição especial (use para FECHAR quando houver objeção de preço ou hesitação): ${money(CFG.precoPromo || CFG.preco)}, pagamento único, sem mensalidade.
- A dor central do cliente: quem pesquisa a categoria dele na cidade encontra o CONCORRENTE com site e fecha com ele. Use isso com frequência, sem exagero e sem inventar números.

O QUE VOCÊ VENDE (benefício antes de característica)
Profissionalismo e credibilidade; vitrine digital aberta 24h; presença profissional no Google; serviços e preços organizados num só lugar; mais contatos chegando no WhatsApp. O site é investimento em imagem e captação de clientes.

REGRAS DE COMUNICAÇÃO
- Português do Brasil, tom de WhatsApp: direto, natural, confiante. No máximo 3 frases curtas. Nada de textão nem cara de mensagem automática.
- Toda mensagem tem intenção comercial e termina conduzindo para a decisão, de preferência com uma pergunta de fechamento.
- Nunca demonstre desespero. Não aceite "vou pensar" como fim: descubra a dúvida real com uma pergunta.
- Técnicas: quebra de objeção, prova de valor (o site já está pronto e é dele), ancoragem (um cliente novo já paga o investimento), redução de risco (ajustes sem custo antes de publicar), fechamento por perguntas.
- Urgência e escassez só quando verdadeiras (ex.: entrega em 24h). NUNCA invente números, estatísticas, porcentagens, depoimentos, prazos ou garantias. Não prometa posição no Google nem quantidade de clientes.
- Use no máximo 1 emoji por mensagem.

OBJEÇÕES (modelo de resposta, adapte ao contexto)
- "Está caro": o site é a vitrine profissional aberta 24h; um único cliente que chegar por ele já ajuda a recuperar o investimento. Pergunte se pode deixar encaminhado.
- "Já tenho Instagram": o Instagram é ótimo, mas o Google não mostra Instagram como site; o site organiza serviços, informações e contato num só lugar, com muito mais profissionalismo.
- "Vou pensar": "Claro! Só pra entender: a dúvida é o investimento ou ainda não deu pra visualizar como o site ajuda o negócio?"
- "Não tenho interesse" (primeira vez, sem irritação): UMA tentativa curta e educada de mostrar o valor ("sem problemas! só uma ideia: hoje quem procura um lugar escolhe quem tem uma apresentação profissional... posso te mostrar como ficou o seu, sem compromisso?").

FECHAMENTO (sempre que houver interesse)
Ex.: "Podemos começar hoje mesmo, só preciso confirmar umas informações." / "Por ${money(CFG.preco)} você já tem seu negócio apresentado de forma profissional na internet. Vamos tirar do papel?" / "Quer que eu já deixe seu projeto encaminhado?"

LIMITES
- Se perguntarem se você é robô ou IA, seja honesto: você é o assistente virtual do ${DONO()}, que assume para finalizar.
- Nunca peça nem envie Pix, dados bancários ou dados pessoais. O pagamento é sempre com o ${DONO()}.

AÇÃO (escolha uma)
- "continuar": conversa em andamento; você responde e conduz para o fechamento.
- "passar_para_dono": a pessoa aceitou, quer fechar, pergunta como pagar ou pede Pix, quer ligação/reunião, pede algo que só um humano resolve, ou está irritada. Responda dizendo que o ${DONO()} vai falar com ela em instantes para finalizar.
- "optout": pede para parar, para não mandar mais mensagens, diz que é engano, está irritada com o contato, OU repete o "não tenho interesse" depois da sua única tentativa. Despedida curta e educada, sem insistir.
- "aguardar": a pessoa está ocupada e disse que responde depois. Responda curto (ou deixe vazio).`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resposta: { type: 'string', description: 'Mensagem para enviar no WhatsApp (pode ser vazia se a ação for aguardar).' },
    acao: { type: 'string', enum: ['continuar', 'passar_para_dono', 'optout', 'aguardar'] },
    resumo: { type: 'string', description: 'Uma linha para o dono: o que o lead quer e em que pé está.' },
  },
  required: ['resposta', 'acao', 'resumo'],
};

const ABERTURA_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { mensagem: { type: 'string' } }, required: ['mensagem'],
};

function fatos(l) {
  return [
    `Negócio: ${l.nome}`, `Categoria: ${l.categoria}`, `Cidade: ${l.cidade}`,
    l.rating ? `Nota no Google: ${String(l.rating).replace('.', ',')} com ${l.reviews} avaliações` : '',
    `Site atual: ${l.siteTipo === 'sem' ? 'não tem site' : l.siteTipo === 'social' ? 'usa só Instagram/link como site' : 'tem site'}`,
    l.avaliacoes?.[0] ? `Trecho de avaliação real: "${l.avaliacoes[0].t.slice(0, 140)}"` : '',
  ].filter(Boolean).join('\n');
}

async function pedir(system, user, schema, maxTokens = 1500) {
  if (semIA) throw new Error('modo sem IA');
  try { return await pedirIA(system, user, schema, maxTokens); } catch (e) { talvezDesligarIA(e); throw e; }
}

async function pedirIA(system, user, schema, maxTokens) {
  const r = await cliente().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: user }],
  });
  if (r.stop_reason === 'refusal') throw new Error('IA recusou responder');
  const txt = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(txt);
}

/* 1ª mensagem: única para cada lead (evita mensagens repetidas, que aumentam o risco de ban) */
export async function abertura(l, link) {
  const user = `${fatos(l)}

Escreva a PRIMEIRA mensagem de WhatsApp para o dono deste negócio, no estilo dos melhores vendedores:
1) gancho com elogio real (nota/avaliações);
2) o problema: ${l.siteTipo === 'social' ? 'o Google não mostra Instagram como site, então quem pesquisa a categoria na cidade vai para o concorrente' : 'sem site, quem pesquisa a categoria na cidade escolhe o concorrente que passa mais confiança'};
3) a solução já pronta: o site deles, neste link, em uma linha própria: ${link}
4) quebre antes que apareçam 1 ou 2 objeções numa frase curta: tempo ("já está pronto, você só aprova"), custo (${CFG.mensalidade ? 'investimento baixo' : 'pagamento único, sem mensalidade'}), complexidade ("não precisa entender de internet")${l.siteTipo === 'social' ? ', Instagram ("não substitui o Insta, soma")' : ''};
5) premissa: fica no ar em 24h; feche com pergunta direta (ex.: "Posso ativar?").
Assine como ${CFG.meuNome}${CFG.empresa ? ` — ${CFG.empresa}` : ''}. Máximo de 7 linhas curtas, no máximo uns 380 caracteres. Sem números ou porcentagens inventados. Varie a forma de escrever.`;
  try {
    const { mensagem } = await pedir(SISTEMA(), user, ABERTURA_SCHEMA);
    if (mensagem.includes(link)) return mensagem.trim();
  } catch (e) { if (!semIA) console.warn('[ia] abertura com modelo pronto:', e.message); }
  return modeloAbertura(l, link);
}

/* conversa: histórico → próxima resposta + ação */
export async function responder(l, link) {
  const hist = (l.conversa || []).slice(-30).map((m) => `${m.papel === 'eu' ? 'VOCÊ' : 'CLIENTE'}: ${m.texto}`).join('\n');
  const user = `${fatos(l)}
Link da prévia do site dele: ${link}

Conversa até agora:
${hist}

Escreva a próxima mensagem para o CLIENTE e escolha a ação.`;
  try {
    return await pedir(SISTEMA(), user, SCHEMA);
  } catch (e) {
    if (!semIA) console.warn('[ia] falha ao responder:', e.message);
    const ult = [...(l.conversa || [])].reverse().find((m) => m.papel === 'cliente');
    return { resposta: '', acao: 'passar_para_dono', resumo: `Respondeu: "${(ult?.texto || '').slice(0, 200)}"${semIA ? ' (modo sem IA: responda você)' : ''}` };
  }
}

/* follow-ups curtos, também únicos por lead */
export async function followup(l, link, n) {
  const objetivo = {
    1: `reforçar a DOR: enquanto o site não está no ar, quem pesquisa a categoria na cidade continua indo pro concorrente; mande o link de novo (${link}); termine com "Posso ativar hoje?"`,
    2: `oferecer a CONDIÇÃO ESPECIAL neste estilo: "🤝 Tenho uma condição especial para vocês! Consigo finalizar o site por ${money(CFG.precoPromo || CFG.preco)}, pagamento único e sem mensalidade. Vocês já têm uma ótima reputação; falta apenas uma vitrine profissional para transmitir confiança e evitar que clientes acabem escolhendo a concorrência. A página já está pronta! 🚀 (link ${link}) 💳 Pix ou cartão. Podemos finalizar?"`,
    3: `último toque, curto e educado: vai arquivar o site dele, mas a condição de ${money(CFG.precoPromo || CFG.preco)} ainda está de pé; é só responder "quero" que ativa em 24h`,
  }[n];
  const user = `${fatos(l)}
Você mandou o site pronto dele e não teve resposta. Escreva o follow-up ${n} (no máximo 3 linhas) com este objetivo: ${objetivo}. Não repita a mensagem anterior.`;
  try { const { mensagem } = await pedir(SISTEMA(), user, ABERTURA_SCHEMA, 800); return mensagem.trim(); }
  catch { return FOLLOWUPS[n](l, link); }
}
