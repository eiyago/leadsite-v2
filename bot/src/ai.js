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
const MODELOS = [
  (l, k) => `Oi, tudo bem? 👋\n\nVi a *${l.nome}* no Google${nota(l) ? ` (${nota(l)})` : ''}, parabéns pelo trabalho!\nReparei que vocês ainda não têm site, então montei uma prévia de como ficaria:\n${k}\n\nPosso te mostrar como fica no celular?\n${assinatura()}`,
  (l, k) => `Olá! Tudo certo?\n\nEncontrei a *${l.nome}* pesquisando ${l.categoria.toLowerCase()} em ${l.cidade.split(',')[0]}${nota(l) ? ` — ${nota(l)}, muito bom!` : '.'}\nComo vocês ainda não têm site, tomei a liberdade de fazer uma prévia:\n${k}\n\nO que achou?\n${assinatura()}`,
  (l, k) => `Oi! Boa tarde 🙂\n\nSou ${CFG.meuNome || 'criador de sites'} e vi a *${l.nome}* no Google Maps${nota(l) ? ` (${nota(l)})` : ''}.\nMontei um site de exemplo com as informações de vocês, dá uma olhada:\n${k}\n\nSe gostar, coloco no ar em 48h.`,
  (l, k) => `Olá, tudo bem?\n\nPassei pelo perfil da *${l.nome}* no Google${nota(l) ? `, ${nota(l)}` : ''}, e vi que ainda falta um site pra quem procura vocês por lá.\nPreparei uma prévia sem compromisso:\n${k}\n\nPosso te explicar rapidinho como funciona?\n${assinatura()}`,
];
const modeloAbertura = (l, k) => MODELOS[h(l.id || l.nome) % MODELOS.length](l, k);
const MODEL = 'claude-opus-5-5';
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const SISTEMA = () => `Você é o assistente comercial de ${CFG.meuNome || 'um criador de sites'}${CFG.empresa ? ` (${CFG.empresa})` : ''}, que cria sites profissionais para negócios locais. Você conversa pelo WhatsApp com donos de negócios que ainda não têm site.

O produto:
- Site profissional pronto, feito com as fotos, avaliações e informações reais do negócio no Google.
- Botão de WhatsApp, rota no Google Maps, horários, galeria, avaliações e otimização para aparecer no Google.
- O cliente já recebeu uma PRÉVIA pronta do site dele (link na conversa). Ajustes de fotos, textos, cores e preços são feitos sem custo antes de publicar.
- Investimento: ${money(CFG.preco)}${CFG.mensalidade ? ` + ${money(CFG.mensalidade)}/mês` : ' (pagamento único)'}. Entrega em até 48h após a aprovação.

Como escrever:
- Português do Brasil, tom de WhatsApp: curto, simpático, direto, sem textão. No máximo 3 frases curtas por mensagem.
- Use no máximo 1 emoji por mensagem, e nem sempre.
- Fale sobre o negócio da pessoa (nome, nota, avaliações) para mostrar que olhou com atenção.
- Nunca invente fatos, depoimentos, números ou garantias que não estão aqui. Não prometa posição no Google.
- Não pressione. Se houver objeção, responda com empatia e um argumento concreto, depois faça uma pergunta simples.
- Se perguntarem se você é robô ou IA, seja honesto: diga que é o assistente virtual do ${CFG.meuNome || 'responsável'} e que ele assume a conversa para fechar.
- Nunca peça nem envie dados de pagamento, chave Pix ou dados pessoais. O fechamento é sempre com o ${CFG.meuNome || 'responsável'}.

Decida a ação:
- "continuar": a conversa segue normalmente.
- "passar_para_dono": a pessoa quer fechar, pergunta como pagar, pede Pix, aceita a proposta, quer marcar ligação/reunião, pede algo que só um humano resolve, ou está irritada. Nesse caso responda avisando que o ${CFG.meuNome || 'responsável'} vai falar com ela em instantes para finalizar.
- "optout": a pessoa diz que não tem interesse de forma clara, pede para parar ou não ser contatada, ou diz que é engano. Responda com uma despedida curta e educada, sem insistir.
- "aguardar": a pessoa disse que vai ver depois, está ocupada ou não pediu nada. Responda curto ou deixe "resposta" vazia se não for preciso responder.`;

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

Escreva a PRIMEIRA mensagem de WhatsApp para o dono deste negócio. Regras:
- Cumprimente, elogie algo real (nota/avaliações), diga que ${l.siteTipo === 'social' ? 'o Google não mostra Instagram como site' : 'notou que ainda não têm site'} e que montou uma prévia do site deles.
- Inclua exatamente este link em uma linha própria: ${link}
- Termine com uma pergunta leve (ex.: se pode mostrar como fica no celular).
- Assine como ${CFG.meuNome}${CFG.empresa ? ` — ${CFG.empresa}` : ''}.
- Máximo de 5 linhas curtas. Varie a forma de escrever; não use frases prontas de marketing.`;
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
  const user = `${fatos(l)}
Você mandou a prévia do site (${link}) ${n === 1 ? 'há 2 dias' : 'há alguns dias, e já lembrou uma vez'} e o dono não respondeu.
Escreva um ${n === 1 ? 'lembrete leve (2 linhas), perguntando se conseguiu ver a prévia, com o link de novo' : `último toque educado (2-3 linhas): diz que vai arquivar a prévia, mas que coloca no ar em 48h por ${money(CFG.preco)} se ele quiser`}. Sem pressão.`;
  try { const { mensagem } = await pedir(SISTEMA(), user, ABERTURA_SCHEMA, 800); return mensagem.trim(); }
  catch { return n === 1 ? `Oi! Conseguiu ver a prévia do site da *${l.nome}*? 🙂\n${link}` : `Oi! Vou arquivar a prévia da *${l.nome}* por aqui. Se quiser, coloco no ar em 48h. Sucesso!`; }
}
