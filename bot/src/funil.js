/* Funil por etapas (prospecção fria, do jeito do Yago):
   1 oi → 2 apresentação + dor → 3 valor + prévia (após resposta) → 4 preço → passa pra você
   Follow-up 1: mesmo dia (ou manhã seguinte) com a condição de R$150 · Follow-up 2: 2–3 dias depois, último contato.
   Cada etapa tem várias versões e pequenas variações: nenhuma mensagem sai igual à outra. */
import { CFG } from './config.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const nome1 = () => String(CFG.meuNome || 'Yago').split(' ')[0];
const emp = () => CFG.empresa || 'Nexa Digital';
const cat = (l) => String(l.categoria || 'negócio local').toLowerCase();
const cid = (l) => String(l.cidade || '').split(',')[0] || 'aqui na cidade';
const saud = () => { const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const social = (l) => l.siteTipo === 'social';
const semSite = (l) => (social(l) ? pick(['ainda não tem um site próprio, só o Instagram', 'aparece no Google sem site, só com o Instagram', 'não tem site, só rede social']) : pick(['ainda não tem site', 'não tem site', 'aparece no Google sem site']));
const nota = (l) => (l.rating >= 4.5 && l.reviews >= 10 ? pick([` (${String(l.rating).replace('.', ',')}⭐ no Google, parabéns!)`, `, mesmo com ${l.reviews} avaliações ótimas no Google`, '']) : '');

/* 1 — abertura curta (aumenta resposta e reduz denúncia de spam) */
const OI = [
  () => 'Oi, tudo bem?', () => 'Oi! Tudo bem?', () => 'Olá, tudo bem?', () => 'Oi, tudo certo?',
  () => `${saud()}! Tudo bem?`, () => `${saud()}, tudo bem?`, (l) => `Oi, tudo bem? Falo com a ${l.nome}?`,
  () => 'Opa, tudo bem?', () => `Oi, ${saud().toLowerCase()}! Tudo certo por aí?`,
];
export const oi = (l) => pick(OI)(l);

/* 2 — quem sou + a dor (concorrência) */
const PITCH = [
  (l) => `Me chamo ${nome1()}, da ${emp()}. Analiso empresas de ${cat(l)} aqui em ${cid(l)} e vi que a *${l.nome}* ${semSite(l)}${nota(l)}.\n\nE empresa que não consegue mostrar o seu serviço pro público acaba deixando cliente pra concorrência, entendeu?`,
  (l) => `Aqui é o ${nome1()}, da ${emp()} 🙂 Eu analiso negócios de ${cat(l)} em ${cid(l)} e reparei que a *${l.nome}* ${semSite(l)}${nota(l)}.\n\nQuando a pessoa pesquisa e não encontra como vocês trabalham, ela acaba fechando com o concorrente que aparece, sabe?`,
  (l) => `Sou o ${nome1()}, da ${emp()}. Estou analisando as empresas de ${cat(l)} de ${cid(l)} e vi que a *${l.nome}* ${semSite(l)}${nota(l)}.\n\nIsso faz muito cliente que procura no Google ir direto pra concorrência, porque não consegue ver o serviço de vocês, entende?`,
  (l) => `Prazer, sou o ${nome1()} da ${emp()}! Faço análise de empresas de ${cat(l)} aqui de ${cid(l)} e notei que a *${l.nome}* ${semSite(l)}${nota(l)}.\n\nEmpresa que não mostra o serviço pro público acaba perdendo cliente pra quem mostra, entendeu?`,
];
export const pitch = (l) => pick(PITCH)(l);

/* 3 — depois da resposta: valor, dor e objeções quebradas, com a prévia pronta */
const VALOR = [
  (l, k) => `Hoje quem procura ${cat(l)} em ${cid(l)} pesquisa no Google, e quem aparece com site, fotos e botão de WhatsApp passa mais confiança e leva o cliente.\n\nPor isso já deixei uma prévia do site da *${l.nome}* pronta 👇\n${k}\n\nVocê não precisa fazer nada nem entender de internet${social(l) ? ', e ele não substitui o Instagram: soma' : ''}. O que achou?`,
  (l, k) => `Montei uma prévia de como ficaria o site de vocês, com serviços, localização e WhatsApp num clique 👇\n${k}\n\nÉ a vitrine da *${l.nome}* aberta 24h: o cliente vê, confia e chama vocês em vez do concorrente. Dá uma olhada e me diz o que achou?`,
  (l, k) => `Olha como ficou a prévia que eu fiz pra *${l.nome}* 👇\n${k}\n\nCom o site, quem pesquisa ${cat(l)} encontra vocês, vê o trabalho e já chama no WhatsApp. Sem complicação: eu cuido de tudo${social(l) ? ' e o Instagram continua do mesmo jeito' : ''}. Curtiu?`,
  (l, k) => `Pra você visualizar, já preparei o site da *${l.nome}* 👇\n${k}\n\nAs pessoas escolhem quem passa mais confiança, e um site profissional faz exatamente isso: mostra o serviço, a localização e leva direto pro seu WhatsApp. Faz sentido pra vocês?`,
];
export const valor = (l, k) => pick(VALOR)(l, k);

/* Instagram: logo depois da apresentação, já mandando a prévia (sem asterisco, o Direct não formata) */
const IG_PREVIA = [
  (l, k) => `Inclusive já montei uma prévia de como ficaria o site da ${l.nome} 👇\n${k}\n\nDá uma olhada com calma e me diz o que achou?`,
  (l, k) => `Pra você visualizar, preparei o site de vocês com serviços, localização e WhatsApp num clique 👇\n${k}\n\nO que achou?`,
  (l, k) => `Fiz uma prévia do site da ${l.nome} pra você ver como ficaria 👇\n${k}\n\nSe curtir, deixo no ar em poucos minutos. Me conta o que achou!`,
  (l, k) => `Olha como ficaria a ${l.nome} com site próprio 👇\n${k}\n\nQuem pesquisa ${cat(l)} em ${cid(l)} já encontra vocês e chama direto no WhatsApp. Curtiu?`,
];
export const igPrevia = (l, k) => pick(IG_PREVIA)(l, k);

/* Instagram por etapas, igual ao WhatsApp (uma etapa por vez, esperando a resposta). O Direct não formata *negrito*. */
export function igEtapa(nome, l, k) {
  const f = { oi, pitch, valor: (x) => valor(x, k), preco, objecao, fu1: (x) => fu1(x, k), fu2 }[nome];
  return f ? f(l).replace(/\*/g, '') : '';
}

/* 4 — preço: R$250, sem mensalidade, ativo em minutos */
const PRECO = [
  (l) => `O investimento é de ${money(CFG.preco)}, pagamento único, *sem mensalidade*. Um único cliente novo já paga o site.\n\nConfirmando, consigo deixar o site da *${l.nome}* ativo em poucos minutos pra vocês pararem de perder cliente pra concorrência. Pix ou cartão. Vamos ativar?`,
  (l) => `Fica ${money(CFG.preco)} uma vez só, sem mensalidade nenhuma 🙌\n\nE é rápido: confirmando agora, em alguns minutos o site da *${l.nome}* já está no ar recebendo cliente. Pix ou cartão. Posso ativar?`,
  (l) => `É ${money(CFG.preco)}, pagamento único e *sem mensalidade*. Ajusto texto, fotos e cores sem custo.\n\nTe mando o site da *${l.nome}* ativo em poucos minutos, pra não perder mais nenhum cliente pra concorrência. Pix ou cartão. Bora?`,
];
export const preco = (l) => pick(PRECO)(l);

/* objeção ("caro", "vou pensar") depois do preço: a condição especial, uma vez */
const OBJECAO = [
  (l) => `Entendo! Pra facilitar, consigo fazer o site da *${l.nome}* por ${money(CFG.precoPromo)}, pagamento único e sem mensalidade 🤝\n\nAtivo em poucos minutos, Pix ou cartão. Fechamos?`,
  (l) => `Sem problema! Tenho uma condição especial: ${money(CFG.precoPromo)} e o site da *${l.nome}* fica no ar hoje, sem mensalidade. Pix ou cartão. Podemos finalizar?`,
];
export const objecao = (l) => pick(OBJECAO)(l);

/* follow-up 1 — mesmo dia (ou manhã seguinte): a promoção de R$150 */
const FU1 = [
  (l, k) => `🤝 Tenho uma condição especial pra vocês!\n\nConsigo finalizar o site da *${l.nome}* por ${money(CFG.precoPromo)}, pagamento único e sem mensalidade.\n\nVocês já têm uma ótima reputação; falta só uma vitrine profissional pra passar confiança e não perder cliente pra concorrência.${k ? `\n\nA prévia já está pronta 👇\n${k}` : ''}\n\n💳 Pix ou cartão. Podemos finalizar?`,
  (l, k) => `Passando pra avisar: hoje consigo fazer o site da *${l.nome}* por ${money(CFG.precoPromo)} 🔥 pagamento único, sem mensalidade, ativo em poucos minutos.${k ? `\n\nOlha como fica 👇\n${k}` : ''}\n\nPix ou cartão. Quer que eu ative?`,
  (l, k) => `Oi! Liberei uma condição especial pra *${l.nome}*: site profissional por ${money(CFG.precoPromo)}, sem mensalidade 🚀${k ? `\n${k}` : ''}\n\nEnquanto não tem site, quem pesquisa ${cat(l)} em ${cid(l)} acaba indo pro concorrente. Vamos resolver isso hoje?`,
];
export const fu1 = (l, k) => pick(FU1)(l, k);

/* follow-up 2 — dia 2/3: último contato, promoção de pé, agradecimento */
const FU2 = [
  (l) => `Esse é meu último contato por aqui, pra não te incomodar 🙂\n\nA condição de ${money(CFG.precoPromo)} pro site da *${l.nome}* ainda está de pé, caso queira. É só responder que eu ativo em poucos minutos.\n\nObrigado pela atenção e sucesso! 🙏`,
  (l) => `Oi! Vou encerrar por aqui pra não ficar mandando mensagem 🙂 Se quiser o site da *${l.nome}*, a promoção de ${money(CFG.precoPromo)} continua valendo, é só me chamar.\n\nMuito obrigado e sucesso pra vocês! 🙌`,
  (l) => `Último recado, prometo 😄 Os ${money(CFG.precoPromo)} pro site da *${l.nome}* ainda estão de pé, sem mensalidade. Se fizer sentido, é só responder "quero".\n\nObrigado pela atenção e muito sucesso!`,
];
export const fu2 = (l) => pick(FU2)(l);

/* entende a resposta sem IA */
const OPTOUT = /n[aã]o (tenho|temos|tem) interesse|sem interesse|n[aã]o (quero|queremos|preciso|precisamos)|n[aã]o precisa|para(r)? de (mandar|enviar)|n[aã]o (me )?(mande|mandem|envie)|remov|descadastr|engano|n[uú]mero errado|n[aã]o (é|e) (aqui|daqui)|bloque|denunci|spam|j[aá] (tenho|temos|possuo|possu[ií]mos) (um )?site|j[aá] (estamos|estou) fazendo|n[aã]o obrigad/i;
const FECHAR = /\b(quero|queremos|fechado|fechou|bora|vamos sim|pode (fazer|ativar|mandar|seguir|ser)|manda o pix|me passa o pix|qual (o|a) (pix|chave)|como (eu )?(pago|fa[cç]o (o|pra) pag)|aceito|topo|fecho|vou querer|pode ativar|ativa)\b|pix|cart[aã]o/i;
const PRECOQ = /quanto|valor|pre[cç]o|custa|investimento|cobra|or[cç]amento/i;
const OBJ = /caro|pensar|ver (aqui|com)|depois|sem dinheiro|apertad|n[aã]o tenho (como|condi)|mais barato|desconto|agora n[aã]o|outro momento|m[eê]s que vem/i;

export function entender(texto) {
  const t = String(texto || '');
  if (OPTOUT.test(t)) return { tipo: 'optout', temSite: /j[aá] (tenho|temos|possuo|possu[ií]mos) (um )?site/i.test(t) };
  if (FECHAR.test(t)) return { tipo: 'fechar' };
  if (PRECOQ.test(t)) return { tipo: 'preco' };
  if (OBJ.test(t)) return { tipo: 'objecao' };
  return { tipo: 'outro' };
}

export const despedida = (l, temSite) => (temSite
  ? pick([`Ah, que ótimo! Então tá tudo certo 🙂 Obrigado e sucesso pra *${l.nome}*!`, 'Perfeito, então vocês já estão bem servidos! Obrigado pela atenção 🙏'])
  : pick(['Tranquilo, obrigado pela atenção! Sucesso 🙏', 'Sem problemas! Não vou mais te incomodar. Sucesso pra vocês 🙂', 'Entendido, obrigado pelo retorno! Abraço 🙏']));

/* Instagram: 1 mensagem só (sem link na 1ª: Instagram filtra link de quem não segue).
   Story: elogio curto + apresentação. Direct: oi + apresentação. */
const ELOGIO = ['Que trabalho top! 👏', 'Muito bom esse conteúdo 👏', 'Ficou show isso aqui! 🔥', 'Mandaram muito bem 👏', 'Que capricho! 👏'];
export function insta(l, story) {
  const base = pick(PITCH)(l).replace(/\*/g, '');
  return story ? `${pick(ELOGIO)} ${base}` : `${pick(OI)(l)} ${base}`;
}
