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
    x.fillStyle = '#3628f9'; x.fillRect(0, 0, W, H);
    const g1 = x.createRadialGradient(920, 0, 0, 920, 0, 900); g1.addColorStop(0, 'rgba(255,255,255,.12)'); g1.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g1; x.fillRect(0, 0, W, H);
    const g2 = x.createRadialGradient(0, H, 0, 0, H, 800); g2.addColorStop(0, 'rgba(18,8,140,.45)'); g2.addColorStop(1, 'rgba(18,8,140,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
    // marca
    /* símbolo NX oficial em vetor (quadrado azul com N e X brancos) */ const nx = (X0, Y0, S) => { const k = S / 1024, P = (pts) => { x.beginPath(); pts.forEach(([u, v], i) => (i ? x.lineTo : x.moveTo).call(x, X0 + u * k, Y0 + v * k)); x.closePath(); x.fill(); }; x.save(); x.beginPath(); x.roundRect(X0, Y0, S, S, S * .22); x.fillStyle = '#3628f9'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.stroke(); x.fillStyle = '#fff'; P([[225, 204], [328, 204], [328, 818], [225, 818]]); P([[225, 204], [325, 204], [797, 818], [668, 818]]); P([[687, 204], [797, 204], [541, 818], [431, 818]]); x.restore(); }; nx(96, 70, 62);
    x.fillStyle = '#fff'; x.textBaseline = 'middle';
    x.textAlign = 'left'; x.font = `700 30px ${F}`; x.fillText('Nexo Digital', 176, 102);
    if (n > 1) { x.textAlign = 'right'; x.fillStyle = 'rgba(244,245,255,.55)'; x.font = `700 26px ${F}`; x.fillText(`${i + 1}/${n}`, W - 96, 102); x.textAlign = 'left'; }
    // conteúdo, centralizado na vertical
    const blocos = []; let y = 0;
    const add = (h, fn) => { blocos.push([y, fn]); y += h; };
    if (s.tag) add(110, (yy) => { x.font = `700 28px ${F}`; const w = x.measureText(s.tag).width + 52; x.fillStyle = 'rgba(255,255,255,.14)'; x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, w, 62, 31); x.fill(); x.stroke(); x.fillStyle = '#ffffff'; x.textBaseline = 'middle'; x.fillText(s.tag, 122, yy + 32); });
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
        ln.forEach(([w, ac]) => { if (ac) { const ww = x.measureText(w).width; x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(xx, by + tam * .1, ww, Math.max(6, tam * .08)); x.fillStyle = '#ffffff'; } else x.fillStyle = '#ffffff'; x.fillText(w, xx, by); xx += x.measureText(w + ' ').width; });
      })]);
      y += 30;
    }
    if (s.texto) { x.font = `500 42px ${F}`; const ls = quebra(x, s.texto, W - 192); add(ls.length * 58 + 30, (yy) => { x.font = `500 42px ${F}`; x.fillStyle = '#e4e2ff'; x.textBaseline = 'alphabetic'; ls.forEach((t, k) => x.fillText(t, 96, yy + 44 + k * 58)); }); }
    if (s.lista) s.lista.forEach(([ic, t]) => add(128, (yy) => {
      x.fillStyle = 'rgba(255,255,255,.09)'; x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, W - 192, 108, 28); x.fill(); x.stroke();
      x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(124, yy + 19, 70, 70, 20); x.fill();
      x.font = `36px "Segoe UI Emoji", ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, 159, yy + 56); x.textAlign = 'left';
      x.fillStyle = '#f4f5ff'; x.font = `600 40px ${F}`; x.fillText(t, 222, yy + 56);
    }));
    if (s.preco) add(400, (yy) => {
      x.fillStyle = 'rgba(255,255,255,.1)'; x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, yy, W - 192, 360, 40); x.fill(); x.stroke();
      x.textBaseline = 'alphabetic'; x.fillStyle = '#d8d5ff'; x.font = `700 46px ${F}`; x.fillText(s.preco.de, 156, yy + 90);
      const wd = x.measureText(s.preco.de).width; x.strokeStyle = '#d8d5ff'; x.lineWidth = 4; x.beginPath(); x.moveTo(150, yy + 74); x.lineTo(162 + wd, yy + 74); x.stroke();
      x.fillStyle = '#f4f5ff'; x.font = `700 60px ${F}`; x.fillText('R$', 156, yy + 250); x.font = `900 170px ${F}`; x.fillText(s.preco.por, 250, yy + 250);
      x.font = `600 38px ${F}`; x.fillStyle = '#e6e7ff'; x.fillText(s.preco.ok, 156, yy + 318);
    });
    if (s.cta) add(170, (yy) => { x.font = `800 46px ${F}`; const w = x.measureText(s.cta).width + 112; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(96, yy + 30, w, 128, 64); x.fill(); x.fillStyle = '#3628f9'; x.textBaseline = 'middle'; x.fillText(s.cta, 152, yy + 95); });
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
