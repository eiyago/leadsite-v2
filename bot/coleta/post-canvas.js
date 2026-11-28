// Desenha posts da Nexo Digital (1080x1350) num <canvas> DENTRO da página do Instagram e entrega ao campo de upload.
// Uso (javascript_tool, com o diálogo "Criar novo post" aberto): defina window.SLIDES = [ {...}, ... ] e rode este arquivo.
// Cada slide: { tag, titulo: ['parte normal', 'parte em destaque'], texto, lista: [['✨','item'],...], preco: {de, por, ok}, cta, pagina }
(async () => {
  /* marca oficial: símbolo NX (azul #3628f9) embutido, para funcionar dentro do Instagram sem baixar nada */
  const NX = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAArdSURBVHhe7Z1rkBXFFcf5lM+plJAYNUKEXZcFFmF5Q0AxChEfeaiUaCSKIsSgQYNi5GlECRYRBRNXSVFITEjUPEQjES21jIUSJfEV3iqIgLAoBGFnZndO6t/jpG76DrvTPffO9MzpU/UvaqsuPTO3f9N9+pzTfTsNrPEuHFLvLx5Q61gxE/q9U2NtS9PIBqKh9VbchH7vBBLwx8DTHStmQr9bABjLAsBcFgDmsgAwlwWAuSwAzGUBYC4LAHNZAJjLAsBcFgDmsgAwlwWAuSwAzGUBYC4LAHNZAJjLAsBcFgDmsgAwlwWAuTIBoLHGoTNOc6ifggbUlrdjuvr3UH/OtJ81dQDwcEN7OTSqv0Oj+sVX327pfjFJhc4fUq/+nKMHOjSsd3rPmjoAp5/o0G3TPWo+4NOB/R2r+fN/lyxspe6dy9szUY09glFu4z/82M8Z6oP3fAEBRg653WoodQBqv+LQHbd7pGPXXeFRzZcdGlRX3q5JAuTTJuk945o/tonvSG6zWsoEgHkz9b6c5v1EZw9yqNcpZkMAAF56vk2+/Vh2+bddqj+5vM1qKVcAwF5/tY36nOpQv+7lbZug3l9z6DvnuNSq8YhvbPBF56c1/0O5AwD2yHJz/QHc14qmVvmWY9lPpwdTnNxmNZVLAGC3/MgTX7ZJUwFGpeF9HOHMqdq+vb5YNaQ9suUWgCNHiC4c7VLPk8yBoKaLQ3Nm6D3bw8uyGdVyCwBs8799sdzq+/Xy66QtzNuY/9/cqP72uy7RBWe5wreR2622cg0A7C+Pt4l5c0BN+bXSFEaiiRe78u3FsufXprv0K1XuAYAtmOXRaSdkOxX06OLQk4/rLf2mXulR3VfL20xDhQDAc4kmXOSK9XcWEDR0c+jcoS4d/Uy+s45t2xZfRP0wlcntpqFCAAD7cKcvPPA+XR0amDIEcN7uXai39Ft0R6sYPeQ201JhAIC9sK5NDKVIxMjXrZZwLcT+EcNXtcOHiUYPyNaJLRQAsGWLW4U/IF+3WsK0c+O1es/z2KNtmb79UOEAgE25MqWkUW0AwMsv6Dl/8FvqT4loN0UVEoDmA0TfHOxWPWmEdf93z3WpVWP6f/3V9OP+USokALA3XvOrnjSC87fyYY3eJ6KZN3pUm3LcP0qFBQC26tdBeLUabxlKt0Y0OKLgQ9X27vFpcAZx/ygVGgDYrdOqkzRC3H/erXrP0bQ0m7h/lAoPwGdHiC46u7JJIxH3P9Wht/+l/vY7DtH5Z2YT949S4QGAbalw0ggwXXWpXtx/3TPZxf2jlBsAdu9Sf9tK7cknKpc0wvCP2j0dm/L97OL+UcoNAJhvn/2r3pce2oLZyZNGiPuPGebS0aNy6x3b1k2+GIWyivtHKTcAzLrZo/7dHdr/sf5I4HlB0WVtgqQRnLf7fq639Fs4N9u4f5RyA8Ddcz3q8oUWunaCS74+A2IqGd7gBE6YIgSI+2MK2fm++g0cPkR0ZqNDZ1TID6mUcgPAXXOC8C6G8CWab2BoLz7XRnUnqSeNcO/Tr1O/d9gffmPe2w/lDgDMn4i/P7c2mT/wgGLSCEs/OG9/f1H9uhixLrsg+7h/lHIHANpo6OrQkF56KdhSmzrREx59HH8Acf/vjXGpTb3/acN6n3oaEPePUi4BQIdhFBg/zhWBFV072Ex0zpB4SSM4fwgt6xiikSat/UuVSwAgdBiG8PkabZXaxg2+GFEQ25fvNRRKtkb0dQQwqrZnty/uFSsYuV0TlFsAIAypcKyeWK33Zob2u5XtJ40wTeiC9qsl5sT9o5RrACAsq5BVe/ftZP4AtmVFJY2w7MOS8Z031dvH9DRulBvUKUZ8FyYo9wCgw+Bg4Yv+z2H5f8U3RPawqROefikEiPtfPV4v7v+3p9qMyPm3p9wDAKHDMBXcNEW93VJDiTbKvHAaSdg2rvn0nzVcfyKafHkAlHy/JqkQAITqfoJDKx5M5g+gs/HWIt6AuP/Y4S4d04j7Y9saQDIp7h+lQgEAXwBLutde0XtjQ1s4LwgSYVRZeo8eUHfN9oyM/MkqFACYChCwOavRoY/3qTttoaHIExW7uNddO9Xb+fQTEodDmRb3j1KhAIAAAT436bJkSaOtm326U/Mso9WPtFIPg5d+pSocAKEwhN97t97wncQA3fjzg+iifE8mqrAAhEmjdQmLSFQN/geWjscLKpmmwgIAiaRRvUPv70gwFyjajOvNjftHqdAAhEmjS89zyWmRW6y87f7Qp0GfF47I92KqCg0AFCaN5t6ifk1V++UvzI77R6nwAEAiadTZocd+Wz2nsKWF6LxvuGLaka9vslgAAGFNjrSuTlInjq1dE5Sdy9c1XWwAwFSA3bh4Sw8dkltPbihWRZ2hfF3TxQYAKEwa/Xiy+vXbs03vBEUlpsf9o8QKgFBwCpc/UDl/4M5Z+Yj7R4klACjPQoXu+peTB4mwPXxkv/TO96+0WAIQJo2QsNm3J5lT+OiKVur6xfJKoryIJQAQOgx5f1T74KhWXdu+NRgBUDaWRwjYAhCq25ccun9RMn8Am0WwwshTBDAUbwCwKuhcGYew6X61nUamiDUACA5h+P7koHw1PZt2dbAayNNUwBoAdJZu0UeUoRIINYRYYeQFArYAhEWfCOJU0vB7ASgGzcuykC0AKNe+ZkIC978dC0vC8lAUwhYAtPXMmuSBoOPZ7TdF7zQyTSwBQNweSSGkcKtl2EuA7eTyTiPTxBIAvJko3qi27dga7AyGryHfgyliB4AI1tQ5iY+di2uYZvDMpmYK2QGA66NwM02752fmBolYAQCvHCXbSbeOqRqOlfnBJcFOI9P8AVYAYLMGjpXR2TGE0nKcO6xrez8KkkY4Y9gkCFgBgLX56pV6zh9Kvmb/RP2+S+2Vl8xLGrEBAHF/5P8PfSq33LHt+sAXnYbVA4o/k9hDy8zyB9gAgLg/2tAxbBHH6IEQL4bvHds05pASu+Eac5JGLAAI4/44tEHVENAZM9wV/x8dhsDOxWNdOnZM/mR8wyg0doQrpoOsIWABADpt8hV6cf+n/vT/9f7oMJxEgsOrk9hb//T/t1dBvt80xQIAXPPZp/XmbpSMYelY2l640+j3q/QcytDE+cEZJ43yA8BsPQBwRNu4kXonimIXEWr9ojoIby7O/n9L4+fiS23ODE+MKFlNBYUHAJ77g/fpvanzbzt+vT86DHM4CkBQCKJrSEhd8q3skkaFBgD1/4N7OuK4VlU7eMAXx8O2N0ejwwDItEnqz1Nq7233xX1mkTQqNAC4Fg5q1rFVy+Nv9ca6/qGleqNMaOJQyQySRoUFQMT9T3Zow3p15w+xeyz1sHlEbjdKCBJhOkCkL4ktXpB+kCh1ANCJ2EunaovmH38+jhI6BAkYHUNH1p0Y7fxFCVMBYvyI9e/5SH26KbXrr/LKVh3VVOoA4OFu/qFH2zb74ii2OMJnZ96g9nNr+Cx+3Gn7lvL2OtLUiepHvAICjG74PcFN75a3GUeIMGKTybDe6R0vnzoAEN4szHUqivs2lgoHRMntxBEcPx2PXFT/dA2mBLnNuBraK5DO8+qo0ADgqHe5nTiS21GV3J6q5PaqqUwAsDJHFgDmsgAwlwWAuSwAzGUBYC4LAHNZAJjLAsBcFgDmsgAwlwWAuSwAzGUBYC4LAHNZAJjLAsBcFgDmsgAwlwWAuSwAzGUBYC4BQGNtS9PIBhJ/WPES+v2/HIHVZ0Nk++IAAAAASUVORK5CYII='; });
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
    if (NX) { x.save(); x.beginPath(); x.roundRect(96, 70, 62, 62, 14); x.clip(); x.drawImage(NX, 96, 70, 62, 62); x.restore(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.beginPath(); x.roundRect(96, 70, 62, 62, 14); x.stroke(); }
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
