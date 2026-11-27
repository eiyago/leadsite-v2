// Coleta no Google Maps (rodar com javascript_tool na página do lugar: https://www.google.com/maps/place/?q=place_id:<id>&hl=pt-BR)
// Devolve { fotos, avaliacoes, horarios } só com dados reais da página.
// IMPORTANTE: a aba do Maps precisa estar em primeiro plano (tabs_select) — em segundo plano o painel não carrega e volta vazio.
(async () => {
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  await dorme(5000);
  const grande = (u) => u.replace(/=[^=/]*$/, '') + '=w1600-h1100-k-no';
  const fotosDe = () => [...document.images].map((i) => i.currentSrc || i.src)
    .filter((s) => /googleusercontent\.com\/(grass-cs|gps-cs|p\/|geougc)/.test(s)).map(grande);
  const fotos = new Set(fotosDe());
  // horários (texto da tabela, quando aparece)
  const horarios = [...document.querySelectorAll('table tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())
    .filter((t) => /^(segunda|terça|quarta|quinta|sexta|sábado|domingo)/i.test(t)).map((t) => t.replace(/^(\S+)\s/, '$1: '));
  // avaliações: abre a aba, ordena por "mais relevantes" (padrão), expande "Mais"
  [...document.querySelectorAll('[role=tab]')].find((t) => /Avalia/.test(t.innerText))?.click();
  await dorme(4000);
  const painel = document.querySelector('div[role=main] div[tabindex="-1"]') || document.querySelector('div[role=main]');
  for (let i = 0; i < 3; i++) { painel?.scrollBy(0, 2500); await dorme(900); }
  document.querySelectorAll('button.w8nwRe, button[aria-label^="Ver mais"]').forEach((b) => b.click());
  await dorme(800);
  fotosDe().forEach((f) => fotos.add(f));
  const vistos = new Set();
  const avaliacoes = [...document.querySelectorAll('div[data-review-id]')].map((e) => ({
    a: e.querySelector('.d4r55')?.innerText?.trim(),
    r: Number((e.querySelector('[role=img][aria-label*=estrela]')?.getAttribute('aria-label') || '').match(/\d/)?.[0] || 0),
    t: (e.querySelector('.wiI7pd')?.innerText || '').replace(/\s+/g, ' ').trim(),
  })).filter((v) => v.a && v.t.length >= 35 && v.r >= 4 && !vistos.has(v.a) && vistos.add(v.a));
  return { fotos: [...fotos].slice(0, 8), avaliacoes: avaliacoes.slice(0, 6), horarios };
})();
