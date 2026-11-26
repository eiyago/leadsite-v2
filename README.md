# LeadSite V2 — Máquina de Conversão

Minera negócios locais no Google, pontua a chance de fechar, gera uma **prévia de site personalizada para cada lead** e já monta a abordagem no WhatsApp. Tudo estático: roda no GitHub Pages, sem servidor.

## O que mudou em relação ao V1

| V1 (useleadsite) | V2 |
|---|---|
| Busca + cards + "Enviar para CRM" | Busca + **score explicado** ("por que é bom: sem site · 312 avaliações · celular") |
| Quente/Morno pela nota | Score 0–100 que pesa: sem site / só Instagram, nota, nº de avaliações, celular com WhatsApp |
| Aba "Site" | **Prévia de site gerada na hora** (`demo.html`) com nome, nota, endereço, mapa e WhatsApp do lead — o link vai na 1ª mensagem |
| Roteiros e objeções | Roteiros com variáveis preenchidas + botão que **abre o WhatsApp com a mensagem pronta** |
| — | **Abordagem em fila**: 1 clique = abre WhatsApp, move para "Abordado", próximo lead |
| — | **Follow-up automático**: avisa quem está há X dias sem resposta e abre a fila de follow-up |
| Etapas | Kanban arrastável + KPIs (conversão, vendido, recorrente/mês) |
| — | **Webhook** em cada evento → planilha, n8n, Make, Zapier ou envio automático |
| Agendar | Google Agenda + .ics + mensagem de confirmação |
| Limite de 40 leads/mês | Sem limite (só a cota da sua chave do Google) |

## Sites premium (aba Site)

- **16 nichos** com textos, paletas, fontes e fotos próprias: barbearia, salão, estética, hamburgueria, pizzaria, café/padaria, restaurante, academia, pet, odontologia, clínica, oficina, escritório (advocacia/contabilidade), imobiliária, obras/serviços e genérico.
- **Nenhum site igual ao outro**: cada negócio recebe uma combinação própria de layout do topo (4), lista de serviços (3), paleta, fonte (8 pares), cantos e ordem de seções. O botão **🎲 Outro visual** sorteia outra combinação.
- **Motion**: título entrando palavra por palavra, zoom lento na foto, parallax, faixa rolando, contadores animados, brilho seguindo o mouse, galeria com lightbox, barra de progresso, menu mobile animado e botão de WhatsApp pulsando.
- **Dados reais**: com a chave do Google, a prévia usa as **fotos e as avaliações reais** do negócio (nada de depoimento inventado).
- **Personalizar**: nome, título, subtítulo, texto "Sobre", serviços com preço, Instagram, nicho, topo, fonte e cor.
- **Efetivar**: baixa um `.zip` com `index.html` + fotos, sem a faixa de prévia, com SEO (título, descrição, Open Graph e dados de empresa para o Google). Arraste em app.netlify.com/drop e conecte o domínio do cliente.
- **Link curto**: ao enviar, o link da prévia é compactado e encurtado no is.gd (o cliente não vê "github"). Dá para desligar em Configurações.

## Publicar no GitHub Pages (5 min)

1. Crie um repositório (ex.: `leadsite-v2`) e envie todos os arquivos desta pasta.
2. No repositório: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Acesse `https://SEU-USUARIO.github.io/leadsite-v2/`.

```powershell
git init; git add .; git commit -m "LeadSite V2"
```

```powershell
git branch -M main; git remote add origin https://github.com/SEU-USUARIO/leadsite-v2.git; git push -u origin main
```

> A prévia de site (`demo.html`) fica no mesmo endereço, então o link que vai pro cliente é `https://SEU-USUARIO.github.io/leadsite-v2/demo.html?d=...`. Se quiser um domínio próprio (ex.: `previa.suaempresa.com.br`), configure em Settings → Pages → Custom domain e coloque essa URL em **Configurações → URL pública**.

## Chave do Google (leads reais)

Sem chave o app roda em **modo demonstração** com leads fictícios.

1. Entre em <https://console.cloud.google.com/> → crie um projeto → ative o faturamento.
2. **APIs e serviços → Biblioteca → "Places API (New)" → Ativar.**
3. **Credenciais → Criar credencial → Chave de API.**
4. **Restrinja a chave** (obrigatório, porque ela fica no navegador):
   - Restrição de aplicativo: *Referenciadores HTTP* → `https://SEU-USUARIO.github.io/*`
   - Restrição de API: só *Places API (New)*
5. Cole a chave em **Configurações** no app. Ela fica só no `localStorage` do seu navegador — nunca vai para o repositório.

Custo: o Google cobra por requisição (cada requisição traz até 20 leads) e oferece uma cota gratuita mensal. Os campos usados (telefone, site, nota) entram na faixa mais cara do Text Search — confira os valores atuais em <https://developers.google.com/maps/billing-and-pricing/pricing> e configure um **limite de cota diária** no Console para não ter surpresa.

## Automação ("já manda as informações")

Em **Configurações → Webhook**, cole a URL de um destes. O app envia um `POST` (JSON) nos eventos:
`lead.created`, `lead.contacted`, `lead.stage`, `lead.updated`, `lead.note`, `test`.

```json
{ "event": "lead.created", "at": "2026-11-26T14:00:00Z",
  "lead": { "nome": "...", "telefone": "...", "wa": "5563999990000", "cidade": "...", "categoria": "...",
            "score": 92, "temp": "quente", "siteTipo": "sem", "stage": "base", "link_demo": "https://..." } }
```

### Opção A — Google Planilhas (grátis, 2 min)

Planilha → **Extensões → Apps Script**, cole e publique como **App da Web** (acesso: *Qualquer pessoa*). Use a URL gerada como webhook.

```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents), l = d.lead || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  if (sh.getLastRow() === 0) sh.appendRow(['Quando','Evento','Nome','Telefone','WhatsApp','Cidade','Categoria','Score','Temp','Site','Etapa','Prévia','Maps']);
  sh.appendRow([new Date(), d.event, l.nome, l.telefone, l.wa, l.cidade, l.categoria, l.score, l.temp, l.site || 'SEM SITE', l.stage, l.link_demo, l.maps]);
  return ContentService.createTextOutput('ok');
}
```

### Opção B — Envio 100% automático no WhatsApp

O navegador só consegue **abrir** o WhatsApp com a mensagem pronta (você aperta enviar). Para disparar sozinho:
`Webhook → n8n/Make → Evolution API, Z-API ou WhatsApp Cloud API (oficial)`.
No n8n: nó *Webhook* → filtro `event == "lead.created" && lead.temp == "quente"` → nó HTTP para sua API de WhatsApp com `lead.wa` e a mensagem com `lead.link_demo`.

⚠️ Disparo em massa por API não-oficial pode banir o número. Use um chip dedicado, poucos envios por hora, e respeite quem pedir para não receber mais mensagens (LGPD).

## Fluxo de conversão sugerido

1. **Buscar** categoria + cidade → filtro **Quentes** ou **Sem site**.
2. **Abordar em fila**: a mensagem já leva a prévia do site do próprio lead.
3. Dia seguinte: aba **Pipeline** mostra quem precisa de follow-up → **Fazer follow-up**.
4. Respondeu? Abra a ficha → **Objeções** / **Agendar** / **Venda → Enviar proposta**.
5. Fechou → arraste para **Convertido**. KPIs mostram vendido e recorrente.

## Estrutura

```
index.html      app (buscar, pipeline, configurações)
demo.html       prévia de site gerada por lead (temas por categoria)
css/app.css
js/core.js      busca no Google, score, roteiros, webhook, CSV
js/app.js       interface
```

Dados ficam no `localStorage`. Use **Configurações → Baixar backup** para levar o CRM para outro computador.
