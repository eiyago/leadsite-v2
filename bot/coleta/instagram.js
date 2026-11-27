// Coleta no perfil do Instagram (rodar com javascript_tool em https://www.instagram.com/<insta>/ — só lê o que a página mostra)
// Devolve { logo, fotos, slogans, bio } do próprio perfil.
(async () => {
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  await dorme(3000);
  window.scrollBy(0, 1400); await dorme(1500); window.scrollTo(0, 0); await dorme(500);
  const handle = location.pathname.split('/').filter(Boolean)[0];
  const maior = (img) => {
    const c = (img.srcset || '').split(',').map((s) => s.trim().split(/\s+/)).filter((p) => p[0]).map((p) => ({ u: p[0], w: parseInt(p[1]) || 0 }));
    return (c.sort((a, b) => b.w - a.w)[0]?.u) || img.currentSrc || img.src;
  };
  const logoImg = [...document.images].find((i) => new RegExp('perfil de ' + handle + '$', 'i').test(i.alt || ''));
  // posts do próprio perfil (sem memes, sem destaques, sem fotos pequenas)
  const RUIM = /meme|humor|😂|🤣|sorteio|promo[cç][aã]o|feriado|aviso|comunicado|vaga|contrata/i;
  const posts = [...document.querySelectorAll('a[href*="/p/"] img, a[href*="/reel/"] img')]
    .filter((i) => (i.closest('a')?.getAttribute('href') || '').startsWith('/' + handle + '/') || !/^\/[^/]+\/(p|reel)\//.test(i.closest('a')?.getAttribute('href') || ''))
    .filter((i) => !RUIM.test(i.alt || '') && (i.naturalWidth || 0) >= 300);
  const fotos = [...new Set(posts.map(maior))].slice(0, 9);
  // frases de efeito reais das legendas: o que está entre aspas
  const slogans = [...new Set(posts.map((i) => ((i.alt || '').match(/[“"]([^”"]{12,70})[”"]/) || [])[1]).filter(Boolean))];
  const header = document.querySelector('header section') || document.querySelector('header');
  const bio = (header?.innerText || '').split('\n').filter((t) => t.length > 18 && !/seguidores|seguindo|posts|Seguir|Enviar mensagem/i.test(t)).slice(0, 4).join(' ');
  return { handle, logo: logoImg ? maior(logoImg) : '', fotos, slogans, bio };
})();
