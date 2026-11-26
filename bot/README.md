# 🤖 LeadSite Robô — vendedor 24h

Roda no seu computador e, sozinho:

1. **Minera** leads em uma cidade (padrão: Foz do Iguaçu), categoria por categoria, e guarda só os **quentes, sem site e com celular**.
2. **Aborda aos poucos** no WhatsApp: cada lead recebe uma mensagem única, escrita pela IA, com elogio real (nota e avaliações) e o **link curto da prévia premium** do site dele, com fotos e avaliações reais do Google.
3. **Faz follow-up** com quem não respondeu (2 e 5 dias depois) e encerra com educação.
4. **Conversa com quem responde** (IA Claude): tira dúvidas, contorna objeções, manda a prévia de novo, fala o preço.
5. **Te chama quando o lead quer fechar**: para de responder aquele lead e manda no **seu WhatsApp pessoal** o resumo, a prévia e o link da conversa. Você efetiva o site no app, manda o Pix e confere o comprovante.
6. **Respeita quem não quer**: se a pessoa disser que não quer, recebe uma despedida e nunca mais é contatada.

Se você responder um lead pelo celular do chip, o robô percebe e **para de responder aquele lead** (você assumiu).

## ⚠️ Antes de começar (importante)

- **Use um chip só para vendas.** A conexão é a mesma do WhatsApp Web, feita por uma biblioteca não oficial (Baileys). O WhatsApp não autoriza automação em contas comuns e pode **banir o número**. O robô reduz o risco (aquecimento gradual, horário comercial, intervalos aleatórios de 4 a 30 min, digitação simulada, mensagens únicas e respeito ao "não"), mas o risco não chega a zero.
- Aqueça o chip novo por alguns dias antes: use normalmente, converse com amigos, entre em grupos.
- A IA se apresenta honestamente como **assistente do {seu nome}** se alguém perguntar se é robô, e nunca pede Pix nem dados de pagamento.
- Contato frio com empresas: seja respeitoso e pare quando pedirem (LGPD). O robô já faz isso.

## Instalação (uma vez)

1. Instale o **Node.js 20+** (https://nodejs.org).
2. Nesta pasta, dê dois cliques em **`INICIAR.bat`**. Na primeira vez ele instala tudo e abre o `.env` no Bloco de Notas.
3. Preencha o `.env`:
   - `ANTHROPIC_API_KEY`: crie em https://platform.claude.com (é pago por uso; cada conversa custa centavos).
   - `GOOGLE_PLACES_KEY`: a mesma chave que você usa no app.
   - `MEU_NOME`, `EMPRESA`, `MEU_WHATS` (seu número **pessoal**, onde você recebe os avisos), `PRECO`.
4. Rode `INICIAR.bat` de novo. Vai aparecer um **QR code**: no celular do **chip de vendas**, abra WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie.
5. Pronto. Deixe a janela aberta e o PC ligado (desative a suspensão do Windows).

## Comandos pelo seu WhatsApp pessoal

Mande para o número do chip:

| Comando | O que faz |
|---|---|
| `/status` | Números do dia: abordagens, respostas e quem está pronto para fechar |
| `/pausar` | Para tudo (abordagens e respostas) |
| `/retomar` | Volta a rodar |

## Pipeline no app

Na aba **Pipeline** do LeadSite, clique em **🤖 Sincronizar robô** (depois disso ele sincroniza sozinho a cada minuto com a aba aberta). Os leads entram com a etapa certa, e na ficha você vê a **conversa inteira do robô** e o resumo. Quem quer fechar aparece em **Agendado**.

## Ritmo (no `.env`)

| Dia | Abordagens novas |
|---|---|
| 1 | 8 |
| 2 | 12 |
| 3 | 16 |
| … | +4 por dia |
| 9 em diante | 40 (máximo) |

Só de segunda a sábado, das 9h às 18h. As respostas a quem já está conversando saem das 8h às 21h; fora disso, ficam para a manhã seguinte.

## Meta de 100 sites até 31/12 (conta realista)

Com 1 chip, a cerca de 30 a 40 abordagens por dia, dá para fazer de **700 a 1.000 abordagens** até o fim do ano. Com resposta de 15–25% e fechamento de 10–20% de quem responde, isso dá algo como **15 a 45 vendas**. Para chegar a 100:

- **Mais chips** (2 ou 3 robôs, um por chip/pasta), cada um em uma cidade.
- **Mais cidades**: mude `CIDADE` no `.env` quando Foz esgotar (Cascavel, Toledo, Medianeira, Maringá…).
- **Responder rápido** quando o robô te chamar: o lead quente esfria em horas.
- Ajuste `PRECO` para facilitar o "sim" (R$ 250 com entrega em 48h já é um bom argumento).

## Arquivos

- `data/robo.json`: todos os leads e conversas (faça backup de vez em quando).
- `auth/`: sessão do WhatsApp. Para trocar de chip, apague esta pasta.
- `.env`: suas chaves. **Nunca envie para o GitHub** (já está no .gitignore).
