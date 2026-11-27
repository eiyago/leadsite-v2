// Desenha posts da Nexo Digital (1080x1350) num <canvas> DENTRO da página do Instagram e entrega ao campo de upload.
// Uso (javascript_tool, com o diálogo "Criar novo post" aberto): defina window.SLIDES = [ {...}, ... ] e rode este arquivo.
// Cada slide: { tag, titulo: ['parte normal', 'parte em destaque'], texto, lista: [['✨','item'],...], preco: {de, por, ok}, cta, pagina }
(async () => {
  const W = 1080, H = 1350, F = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const quebra = (x, txt, max) => {
    const out = []; let l = '';
    for (const w of String(txt).split(' ')) { const t = l ? l + ' ' + w : w; if (x.measureText(t).width > max && l) { out.push(l); l = w; } else l = t; }
    if (l) out.push(l); return out;
  };
  function desenhar(s, i, n) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#0b0d1f'; x.fillRect(0, 0, W, H);
    const g1 = x.createRadialGradient(920, 0, 0, 920, 0, 900); g1.addColorStop(0, 'rgba(91,92,255,.42)'); g1.addColorStop(1, 'rgba(91,92,255,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
    const g2 = x.createRadialGradient(0, H, 0, 0, H, 800); g2.addColorStop(0, 'rgba(160,80,255,.28)'); g2.addColorStop(1, 'rgba(160,80,255,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
    // marca
    const lg = x.createLinearGradient(96, 70, 158, 132); lg.addColorStop(0, '#5b5cff'); lg.addColorStop(1, '#8a4dff');
    x.fillStyle = lg; x.beginPath(); x.arc(127, 101, 31, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = `800 34px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', 127, 103);
    x.textAlign = 'left'; x.font = `700 30px ${F}`; x.fillText('Nexo Digital', 176, 102);
    if (n > 1) { x.textAlign = 'right'; x.fillStyle = 'rgba(244,245,255,.55)'; x.font = `700 26px ${F}`; x.fillText(`${i + 1}/${n}`, W - 96, 102); x.textAlign = 'left'; }
    // conteúdo, centralizado na vertical
    const blocos = []; let y = 0;
    const add = (h, fn) => { blocos.push([y, fn]); y += h; };
    if (s.tag) add(110, (yy) => { x.font = `700 28px ${F}`; const w = x.measureText(s.tag).width + 52; x.fillStyle = 'rgba(91,92,255,.22)'; x.strokeStyle = 'rgba(124,125,255,.6)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, w, 62, 31); x.fill(); x.stroke(); x.fillStyle = '#c9caff'; x.textBaseline = 'middle'; x.fillText(s.tag, 122, yy + 32); });
    if (s.titulo) {
      const tam = s.tituloTam || 92; x.font = `800 ${tam}px ${F}`;
      const palavras = []; (Array.isArray(s.titulo) ? s.titulo : [s.titulo]).forEach((p, k) => String(p).split(' ').filter(Boolean).forEach((w) => palavras.push([w, k === 1])));
      const linhas = []; let l = [];
      for (const p of palavras) { const t = [...l, p].map((q) => q[0]).join(' '); if (x.measureText(t).width > W - 192 && l.length) { linhas.push(l); l = [p]; } else l.push(p); }
      if (l.length) linhas.push(l);
      linhas.forEach(() => add(tam * 1.08, () => {}));
      blocos.push([y - linhas.length * tam * 1.08, (yy) => linhas.forEach((ln, k) => {
        x.font = `800 ${tam}px ${F}`;
        let xx = 96; const by = yy + k * tam * 1.08 + tam * .82; x.textBaseline = 'alphabetic';
        ln.forEach(([w, ac]) => { if (ac) { const gr = x.createLinearGradient(xx, 0, xx + x.measureText(w).width, 0); gr.addColorStop(0, '#7c7dff'); gr.addColorStop(1, '#c06bff'); x.fillStyle = gr; } else x.fillStyle = '#f4f5ff'; x.fillText(w, xx, by); xx += x.measureText(w + ' ').width; });
      })]);
      y += 30;
    }
    if (s.texto) { x.font = `500 42px ${F}`; const ls = quebra(x, s.texto, W - 192); add(ls.length * 58 + 30, (yy) => { x.font = `500 42px ${F}`; x.fillStyle = '#c8cae6'; x.textBaseline = 'alphabetic'; ls.forEach((t, k) => x.fillText(t, 96, yy + 44 + k * 58)); }); }
    if (s.lista) s.lista.forEach(([ic, t]) => add(128, (yy) => {
      x.fillStyle = 'rgba(255,255,255,.05)'; x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, W - 192, 108, 28); x.fill(); x.stroke();
      const gi = x.createLinearGradient(124, yy + 19, 194, yy + 89); gi.addColorStop(0, '#5b5cff'); gi.addColorStop(1, '#8a4dff'); x.fillStyle = gi; x.beginPath(); x.roundRect(124, yy + 19, 70, 70, 20); x.fill();
      x.font = `36px "Segoe UI Emoji", ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, 159, yy + 56); x.textAlign = 'left';
      x.fillStyle = '#f4f5ff'; x.font = `600 40px ${F}`; x.fillText(t, 222, yy + 56);
    }));
    if (s.preco) add(400, (yy) => {
      const gp = x.createLinearGradient(96, yy, W - 96, yy + 360); gp.addColorStop(0, 'rgba(91,92,255,.35)'); gp.addColorStop(1, 'rgba(160,80,255,.28)');
      x.fillStyle = gp; x.strokeStyle = 'rgba(160,140,255,.55)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, W - 192, 360, 40); x.fill(); x.stroke();
      x.textBaseline = 'alphabetic'; x.fillStyle = '#b9bbe0'; x.font = `700 46px ${F}`; x.fillText(s.preco.de, 156, yy + 90);
      const wd = x.measureText(s.preco.de).width; x.strokeStyle = '#b9bbe0'; x.lineWidth = 4; x.beginPath(); x.moveTo(150, yy + 74); x.lineTo(162 + wd, yy + 74); x.stroke();
      x.fillStyle = '#f4f5ff'; x.font = `700 60px ${F}`; x.fillText('R$', 156, yy + 250); x.font = `900 170px ${F}`; x.fillText(s.preco.por, 250, yy + 250);
      x.font = `600 38px ${F}`; x.fillStyle = '#e6e7ff'; x.fillText(s.preco.ok, 156, yy + 318);
    });
    if (s.cta) add(170, (yy) => { x.font = `800 46px ${F}`; const w = x.measureText(s.cta).width + 112; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(96, yy + 30, w, 128, 64); x.fill(); x.fillStyle = '#1a1b3a'; x.textBaseline = 'middle'; x.fillText(s.cta, 152, yy + 95); });
    const top = Math.max(200, (H - y) / 2 + 20);
    blocos.forEach(([by, fn]) => fn(top + by));
    if (s.rodape !== false && i === n - 1) { x.fillStyle = 'rgba(244,245,255,.6)'; x.font = `700 26px ${F}`; x.textBaseline = 'alphabetic'; x.fillText('@nexo.digitallco', 96, H - 70); x.textAlign = 'right'; x.fillText('Nexo Digital', W - 96, H - 70); x.textAlign = 'left'; }
    return new Promise((r) => c.toBlob(r, 'image/jpeg', .93));
  }
  const S = window.SLIDES || [];
  const files = [];
  for (let i = 0; i < S.length; i++) files.push(new File([await desenhar(S[i], i, S.length)], `nexo-${i + 1}.jpg`, { type: 'image/jpeg' }));
  const inp = document.querySelector('input[type=file][multiple], input[type=file]');
  if (!inp) return 'sem campo de upload (abra o diálogo Criar novo post antes)';
  const dt = new DataTransfer(); files.forEach((f) => dt.items.add(f)); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
  return `ok: ${files.length} imagem(ns) entregue(s)`;
})();
