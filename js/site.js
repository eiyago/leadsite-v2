'use strict';
/* LeadSite V2 — motor de sites premium.
   LSite.page(d, opts) devolve um documento HTML completo (usado na prévia e no "efetivar").
   Cada negócio recebe uma combinação própria (layout, paleta, fontes, textos) derivada do nome. */
var LSite = (function () {
  var U = function (id, w) { return 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=' + (w || 1600) + '&q=72'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var pick = function (r, a) { return a[Math.floor(r() * a.length)]; };
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rgb(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join(''); var n = parseInt(hex, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function lum(hex) { var c = rgb(hex).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  var rgba = function (hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  function nicheOf(cat) {
    for (var i = 0; i < LS_NICHE_ORDER.length; i++) { var k = LS_NICHE_ORDER[i]; if (k !== 'generico' && LS_NICHES[k].re.test(cat || '')) return k; }
    return 'generico';
  }

  var ICON = {
    wa: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4a10.4 10.4 0 0 1-1.6-5.5C5.3 9.8 10.1 5.1 16 5.1s10.7 4.7 10.7 10.5S21.9 26.1 16 26.1zm5.8-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.6-1.8-1.7-2.1s0-.5.1-.6l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.1-1.2 2.8 1.2 3.2 1.4 3.4 2.4 3.6 5.8 5c.8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5s.3-1.3.2-1.5-.3-.2-.6-.3z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M8 7h9v9"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 7v5l3 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  };
  /* ícones de marca por nicho (traço, 24x24) */
  var MARK = {
    barbearia: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    salao: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    estetica: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 14 10"/>',
    hamburgueria: '<path d="M4 11c0-4 3.6-6 8-6s8 2 8 6z"/><path d="M3 14.5h18"/><path d="M4 17.5h16c0 1.7-1.3 2.5-3 2.5H7c-1.7 0-3-.8-3-2.5z"/>',
    pizzaria: '<path d="M12 21 3.5 6.5a15 15 0 0 1 17 0z"/><path d="M5.6 9.6a12 12 0 0 1 12.8 0"/><circle cx="11" cy="12.5" r="1"/><circle cx="13.6" cy="15.6" r="1"/>',
    cafe: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v3M12 3v3"/>',
    restaurante: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
    academia: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    pet: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="5.5" r="1.8"/><circle cx="16" cy="6.5" r="1.8"/><circle cx="18.5" cy="11" r="1.8"/><path d="M12 11c-3 0-6 4.5-6 7a2.5 2.5 0 0 0 3.5 2.2c1.6-.6 3.4-.6 5 0A2.5 2.5 0 0 0 18 18c0-2.5-3-7-6-7z"/>',
    odonto: '<path d="M12 5.5C10 4 6.5 3.5 5 6c-1.5 2.6.2 6 1 8.5.7 2.3 1 6.5 2.5 6.5S10 16 12 16s2 5 3.5 5 1.8-4.2 2.5-6.5c.8-2.5 2.5-5.9 1-8.5-1.5-2.5-5-2-7-.5z"/>',
    clinica: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/>',
    oficina: '<path d="M15 4a5 5 0 0 0-4.7 6.7L3.6 17.4a2 2 0 0 0 3 3l6.7-6.7A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
    escritorio: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    imobiliaria: '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-6h4v6"/>',
    obras: '<path d="M13 7 3.5 16.5a2.1 2.1 0 0 0 3 3L16 10"/><path d="M12 6l3-3 6 6-3 3z"/>',
    generico: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  };
  var markSvg = function (nk, cls) { return '<svg class="' + (cls || 'mk') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (MARK[nk] || MARK.generico) + '</svg>'; };

  /* selo circular com o nome girando — logo gerado para quem não tem */
  var sealN = 0;
  function seal(P, d, cls) {
    var id = 'sp' + (++sealN), txt = (d.n + ' · ' + (P.ci || d.c || '') + ' · ').toUpperCase();
    var fs = Math.max(10, Math.min(17, 430 / (txt.length * .62)));
    var center = d.lg
      ? '<clipPath id="c' + id + '"><circle cx="100" cy="100" r="52"/></clipPath><circle cx="100" cy="100" r="54" fill="#fff"/><image href="' + esc(d.lg) + '" x="48" y="48" width="104" height="104" preserveAspectRatio="xMidYMid slice" clip-path="url(#c' + id + ')"/>'
      : '<circle cx="100" cy="100" r="54" fill="var(--ac)"/><g transform="translate(76 76) scale(2)" fill="none" stroke="var(--on)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + (MARK[P.nk] || MARK.generico) + '</g>';
    return '<svg class="seal ' + (cls || '') + '" viewBox="0 0 200 200" role="img" aria-label="' + esc(d.n) + '"><defs><path id="' + id + '" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>' +
      '<g class="seal-rot"><text font-size="' + fs.toFixed(1) + '" fill="currentColor" style="font-family:var(--fb);font-weight:600;letter-spacing:.12em"><textPath href="#' + id + '" textLength="486" lengthAdjust="spacing">' + esc(txt) + '</textPath></text></g>' +
      '<circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" stroke-opacity=".25"/>' + center + '</svg>';
  }

  function favicon(P, d) {
    if (d.lg) return '<link rel="icon" href="' + esc(d.lg) + '"><link rel="apple-touch-icon" href="' + esc(d.lg) + '">';
    var on = lum(P.pal.ac) > .45 ? '#111111' : '#ffffff';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="' + P.pal.ac + '"/><g transform="translate(14 14) scale(1.5)" fill="none" stroke="' + on + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (MARK[P.nk] || MARK.generico) + '</g></svg>';
    return '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,' + encodeURIComponent(svg) + '">';
  }

  var stars = function (n) { var s = ''; for (var i = 0; i < 5; i++) s += '<i class="' + (i < Math.round(n || 5) ? 'on' : '') + '">' + ICON.star + '</i>'; return '<span class="stars">' + s + '</span>'; };

  /* ---------- plano: escolhas determinísticas por negócio ---------- */
  function cleanName(n) { return String(n || '').split(/\s+[|–—-]\s+/)[0].trim() || String(n || ''); }

  /* direções visuais: cada uma é um conjunto coerente (tipografia, forma, ritmo, layouts) */
  var DIRS = {
    urbano: { label: 'Urbano bold', fonts: [0, 1, 7], rad: [0, 4], btn: 'sq', heroes: ['full', 'editorial', 'split'], svc: ['list', 'grid'], tilt: true },
    editorial: { label: 'Editorial luxo', fonts: [2, 6, 4], rad: [0, 2], btn: 'sq', heroes: ['editorial', 'full', 'split'], svc: ['list', 'cards'], tilt: false },
    clean: { label: 'Clean moderno', fonts: [3, 5], rad: [14, 20], btn: 'pill', heroes: ['split', 'center'], svc: ['cards', 'grid'], tilt: false },
    acolhedor: { label: 'Acolhedor artesanal', fonts: [4, 2, 7], rad: [18, 26], btn: 'pill', heroes: ['center', 'split', 'full'], svc: ['cards', 'list'], tilt: false },
    /* direções de personalidade forte: cada uma muda paleta, tipografia, forma e acabamento */
    noturno: { label: 'Noturno neon', fonts: [13, 1, 7], rad: [6, 12], btn: 'sq', heroes: ['poster', 'full', 'mosaic'], svc: ['grid', 'list'], tilt: true,
      pal: function (p, r, N) { return { bg: pick(r, ['#06070b', '#0a0710', '#050a0c']), fg: '#eef0f7', ac: vivo(N) }; } },
    luxo: { label: 'Luxo dourado', fonts: [9, 10, 6], rad: [0, 0], btn: 'sq', heroes: ['editorial', 'mosaic', 'center'], svc: ['list'], tilt: false,
      pal: function (p, r) { return r() > .45 ? { bg: '#0e0d0b', fg: '#f3ecdf', ac: '#c9a45a' } : { bg: '#f6f1e7', fg: '#1d1a15', ac: '#9c7a36' }; } },
    retro: { label: 'Retrô carimbado', fonts: [11, 4], rad: [12, 18], btn: 'pill', heroes: ['center', 'mosaic', 'split'], svc: ['cards'], tilt: true,
      pal: function (p, r, N) { return { bg: pick(r, ['#f3e8d4', '#efe2c8', '#f6ecdc']), fg: '#2a1c12', ac: vivo(N, true) }; } },
    brutal: { label: 'Brutalista', fonts: [8, 0], rad: [0, 0], btn: 'sq', heroes: ['poster', 'full'], svc: ['grid', 'list'], tilt: true,
      pal: function (p, r, N) { return r() > .5 ? { bg: '#f1efe9', fg: '#0b0b0b', ac: vivo(N) } : { bg: '#0b0b0b', fg: '#f1efe9', ac: vivo(N) }; } },
    suico: { label: 'Suíço minimalista', fonts: [12, 5], rad: [0, 2], btn: 'sq', heroes: ['split', 'mosaic', 'editorial'], svc: ['list', 'grid'], tilt: false,
      pal: function (p, r, N) { return { bg: pick(r, ['#f4f4f1', '#f7f6f2', '#efefeb']), fg: '#111111', ac: vivo(N, true) }; } },
  };
  /* a cor mais viva da paleta do nicho (para direções que pedem destaque forte) */
  function vivo(N, escura) {
    var best = N.pal[0].ac, bs = -1;
    N.pal.forEach(function (p) { var c = rgb(p.ac), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), s = mx ? (mx - mn) / mx : 0; if (escura && lum(p.ac) > .5) s -= .5; if (s > bs) { bs = s; best = p.ac; } });
    return best;
  }
  var NICHE_DIRS = {
    barbearia: ['urbano', 'editorial', 'noturno', 'brutal', 'luxo', 'retro'], unhas: ['luxo', 'acolhedor', 'retro', 'clean', 'suico'], salao: ['editorial', 'acolhedor', 'luxo', 'suico', 'retro'],
    estetica: ['editorial', 'clean', 'acolhedor', 'luxo', 'suico'], hamburgueria: ['urbano', 'acolhedor', 'noturno', 'brutal', 'retro'],
    pizzaria: ['urbano', 'acolhedor', 'editorial', 'retro', 'noturno'], cafe: ['acolhedor', 'editorial', 'retro', 'suico'],
    restaurante: ['editorial', 'acolhedor', 'urbano', 'luxo', 'retro'], academia: ['urbano', 'clean', 'noturno', 'brutal'],
    pet: ['acolhedor', 'clean', 'retro'], odonto: ['clean', 'editorial', 'suico', 'luxo'], clinica: ['clean', 'acolhedor', 'suico', 'luxo'],
    oficina: ['urbano', 'clean', 'brutal', 'noturno'], escritorio: ['editorial', 'clean', 'suico', 'luxo'],
    imobiliaria: ['editorial', 'clean', 'luxo', 'suico'], obras: ['urbano', 'clean', 'brutal', 'suico'], generico: ['clean', 'editorial', 'acolhedor', 'suico', 'retro'],
  };

  function plan(d) {
    var nk = d.k || nicheOf(d.c); var N = LS_NICHES[nk];
    var r = rng(hash(cleanName(d.n) + '|' + (d.v || 0)));
    var ci = String(d.ci || '').split(',')[0].trim();
    var fill = function (s) { return String(s).replace(/\{n\}/g, d.n || '').replace(/\{ci\}/g, ci || 'sua cidade'); };
    var dk = d.dir || pick(r, NICHE_DIRS[nk] || ['clean']); var D = DIRS[dk];
    var pal = Object.assign({}, N.pal[(d.p != null ? d.p : Math.floor(r() * N.pal.length)) % N.pal.length]);
    if (D.pal && d.p == null) pal = D.pal(pal, r, N);
    if (d.ac) pal.ac = d.ac;
    var okFonts = D.fonts.filter(function (f) { return N.fonts.indexOf(f) >= 0; });
    var font = LS_FONTS[d.f != null ? d.f : pick(r, okFonts.length ? okFonts : D.fonts)];
    var stock = shuffle(r, N.img).map(function (id) { return U(id); });
    var own = (d.ph || []).filter(Boolean);
    // fotos do próprio negócio têm prioridade; banco de imagens só completa quando faltam
    var photos = own.length >= 6 ? own.slice() : own.concat(stock);
    var svc = (d.sv && d.sv.length ? d.sv : shuffle(r, N.svc).slice(0, r() > .5 ? 6 : 4));
    return {
      nk: nk, N: N, r: r, ci: ci, fill: fill, pal: pal, font: font, photos: photos, stock: stock, own: own.length,
      dir: dk, dirLabel: D.label,
      dark: lum(pal.bg) < .35,
      hero: d.hl2 || pick(r, D.heroes),
      svcL: pick(r, D.svc),
      rad: pick(r, D.rad),
      btn: D.btn,
      aboutL: r() > .5,
      tilt: D.tilt && r() > .4,
      kick: fill(pick(r, N.kick)),
      head: fill(d.hl || pick(r, N.heads)),
      sub: fill(d.sub || pick(r, N.subs)),
      svc: svc,
      perks: shuffle(r, N.perks).slice(0, 4),
      aboutT: fill(pick(r, N.aboutT)),
      about: (d.ab ? [d.ab] : d.es ? [d.es].concat(N.about.slice(1)) : N.about).map(fill),
      ctaT: fill(pick(r, N.ctaT)),
      marq: shuffle(r, N.marq),
    };
  }

  /* ---------- CSS ---------- */
  /* logo própria (para quem não tem): monograma com as iniciais numa forma que muda conforme o estilo do site */
  var SHAPES = {
    urbano: '<rect x="8" y="8" width="84" height="84" rx="6"/>', brutal: '<rect x="8" y="8" width="84" height="84"/>',
    editorial: '<circle cx="50" cy="50" r="42"/>', luxo: '<path d="M50 6 94 50 50 94 6 50z"/>', clean: '<rect x="8" y="8" width="84" height="84" rx="26"/>',
    acolhedor: '<path d="M50 7c20 0 43 9 43 40 0 30-21 46-43 46S7 77 7 47C7 16 30 7 50 7z"/>', noturno: '<path d="M50 5 89 27.5v45L50 95 11 72.5v-45z"/>',
    retro: '<circle cx="50" cy="50" r="42"/>', suico: '<rect x="8" y="8" width="84" height="84" rx="2"/>'
  };
  function iniciais(d) {
    var n = String(d.n || '?').replace(/[&|·\-–—]/g, ' ');
    var ws = n.split(/\s+/).filter(function (w) { return w.length > 2 && !/^(dos?|das?|de|e|the|and|studio|st[uú]dio|espa[cç]o|sal[aã]o|beleza|barbearia|barber|shop|cl[ií]nica|centro|instituto|loja|restaurante|lanchonete|oficina|pet|auto|academia|est[eé]tica|odontologia|consult[oó]rio)$/i.test(w); });
    if (!ws.length) ws = n.split(/\s+/).filter(Boolean);
    return (ws.length > 1 ? ws[0].charAt(0) + ws[1].charAt(0) : ws[0].charAt(0)).toUpperCase();
  }
  function brandMark(P, d, cls) {
    var ini = iniciais(d), sh = SHAPES[P.dir] || SHAPES.clean;
    return '<svg class="bmk ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true"><g class="bmk-f" fill="var(--ac)">' + sh + '</g>' +
      '<g class="bmk-l" fill="none" stroke="var(--ac)" stroke-width="2" pathLength="1" transform="translate(50 50) scale(1.12) translate(-50 -50)">' + sh.replace('<path ', '<path pathLength="1" ').replace('<rect ', '<rect pathLength="1" ').replace('<circle ', '<circle pathLength="1" ') + '</g>' +
      '<text x="50" y="50" dy=".35em" text-anchor="middle" fill="var(--on)" style="font-family:var(--fd);font-weight:700;font-size:' + (ini.length > 1 ? 38 : 50) + 'px;letter-spacing:-.02em">' + esc(ini) + '</text></svg>';
  }

  /* camada de motion graphics: abertura com a logo, aurora animada no topo, granulado, cursor, títulos letra a letra */
  var MOTION_CSS = [
    '.intro{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--bg);color:var(--fg);transition:clip-path 1s cubic-bezier(.77,0,.18,1),visibility 0s 1s;clip-path:inset(0 0 0 0)}',
    '.intro.out{clip-path:inset(0 0 100% 0);visibility:hidden}',
    '.intro .ib{display:grid;justify-items:center;gap:22px;text-align:center;padding:24px}',
    '.intro .il{width:clamp(116px,16vw,156px);height:clamp(116px,16vw,156px);display:grid;place-items:center;animation:ipop .9s cubic-bezier(.2,1.4,.3,1) both}',
    '.intro .il img{width:100%;height:100%;object-fit:contain;border-radius:18px;background:#fff;padding:8px}.intro .il .bmk{width:100%;height:100%}',
    '.bmk-l *{stroke-dasharray:1;stroke-dashoffset:1;animation:idraw 1.4s .2s cubic-bezier(.6,0,.2,1) forwards}',
    '.intro .in2{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);letter-spacing:var(--dls);font-size:clamp(26px,4.4vw,52px);line-height:1.05;overflow:hidden}',
    '.intro .in2 i{display:inline-block;font-style:normal;transform:translateY(110%);animation:iup .7s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(.35s + var(--k)*.035s)}',
    '.intro .ibar{width:160px;height:2px;background:var(--line);overflow:hidden;border-radius:2px}.intro .ibar:after{content:"";display:block;height:100%;background:var(--ac);transform-origin:left;animation:ibar 1.3s .2s cubic-bezier(.7,0,.2,1) both}',
    '@keyframes ipop{from{transform:scale(.4) rotate(-12deg);opacity:0}}@keyframes idraw{to{stroke-dashoffset:0}}@keyframes iup{to{transform:none}}@keyframes ibar{from{transform:scaleX(0)}}',
    '.aur{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;mix-blend-mode:screen;opacity:.55}',
    '.aur b{position:absolute;width:46vmax;height:46vmax;border-radius:50%;filter:blur(70px);background:var(--ac);opacity:.55;animation:aur 18s ease-in-out infinite alternate}',
    '.aur b:nth-child(2){background:#fff;opacity:.16;width:34vmax;height:34vmax;right:-10vmax;top:-12vmax;animation-duration:23s;animation-delay:-6s}',
    '.aur b:nth-child(3){left:30%;bottom:-24vmax;opacity:.35;animation-duration:27s;animation-delay:-11s}',
    '.aur b:nth-child(1){left:-14vmax;top:-10vmax}',
    '@keyframes aur{0%{transform:translate(0,0) scale(1)}50%{transform:translate(12vw,8vh) scale(1.2)}100%{transform:translate(-6vw,14vh) scale(.9)}}',
    '.grain{position:fixed;inset:-50%;z-index:150;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E");animation:grain 1.2s steps(6) infinite}',
    '@keyframes grain{0%{transform:translate(0,0)}20%{transform:translate(-4%,3%)}40%{transform:translate(3%,-5%)}60%{transform:translate(-6%,-2%)}80%{transform:translate(5%,4%)}100%{transform:translate(0,0)}}',
    '.cur,.cur2{position:fixed;left:0;top:0;z-index:190;pointer-events:none;border-radius:50%;opacity:0;transition:opacity .3s,width .35s cubic-bezier(.2,.8,.2,1),height .35s cubic-bezier(.2,.8,.2,1),background .3s}',
    '.cur{width:8px;height:8px;margin:-4px 0 0 -4px;background:var(--ac)}.cur2{width:38px;height:38px;margin:-19px 0 0 -19px;border:1.5px solid var(--ac)}',
    'body.cv .cur,body.cv .cur2{opacity:1}body.ch .cur2{width:70px;height:70px;margin:-35px 0 0 -35px;background:var(--acs)}',
    '.sh .disp .ch{display:inline-block;transform:translateY(105%) rotate(6deg);opacity:0;transition:transform .8s cubic-bezier(.2,.8,.2,1),opacity .6s;transition-delay:calc(var(--k)*.022s)}',
    '.sh .disp .cw{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em}.sh.in .disp .ch{transform:none;opacity:1}',
    '.tilt{transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.8,.2,1)}',
    '.btn{transition:transform .35s cubic-bezier(.2,.8,.2,1),background .3s,color .3s,box-shadow .3s}',
    '.mono .ini{position:relative;font-family:var(--fd);font-weight:700;font-size:14px;letter-spacing:-.02em;color:var(--on)}.mono.has-img .ini{display:none}',
    '@media (pointer:coarse),(prefers-reduced-motion:reduce){.cur,.cur2,.grain{display:none}}',
    '@media (prefers-reduced-motion:reduce){.intro{display:none}.sh .disp .ch{transform:none;opacity:1}}'
  ].join('');

  function css(P) {
    var p = P.pal, f = P.font, dark = P.dark, onAc = lum(p.ac) > .45 ? '#111111' : '#ffffff';
    return ':root{--bg:' + p.bg + ';--fg:' + p.fg + ';--ac:' + p.ac + ';--on:' + onAc + ';--mut:' + rgba(p.fg, .66) + ';--line:' + rgba(p.fg, .12) +
      ';--card:' + (dark ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.035)') + ';--card2:' + (dark ? 'rgba(255,255,255,.08)' : '#ffffff') + ';--acs:' + rgba(p.ac, .14) +
      ';--fd:"' + f.d + '",serif;--fb:"' + f.b + '",system-ui,sans-serif;--dw:' + f.w + ';--tt:' + (f.up ? 'uppercase' : 'none') + ';--dls:' + f.ls + ';--dlh:' + f.lh + ';--dsc:' + (f.sc || 1) +
      ';--r:' + P.rad + 'px;--rb:' + (P.btn === 'pill' ? '999px' : Math.min(P.rad, 10) + 'px') + ';--shade:' + rgba(p.bg, .82) + '}' + BASE_CSS + HERO2_CSS + (DIR_CSS[P.dir] || '') + MOTION_CSS;
  }

  /* layouts de topo novos: mosaico de fotos reais e pôster com o nome gigante */
  var HERO2_CSS = [
    '.h-mos .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:56px;align-items:center}.h-mos h1{font-size:calc(clamp(40px,5.8vw,96px)*var(--dsc))}',
    '.mos{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:clamp(70px,9vw,120px);gap:10px}',
    '.mos figure{overflow:hidden;border-radius:var(--r);position:relative}.mos img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}.mos figure:hover img{transform:scale(1.06)}',
    '.mos .m1{grid-column:1/5;grid-row:1/4}.mos .m2{grid-column:5/7;grid-row:1/3}.mos .m3{grid-column:5/7;grid-row:3/5}.mos .m4{grid-column:1/3;grid-row:4/6}.mos .m5{grid-column:3/5;grid-row:4/6}.mos .m6{grid-column:5/7;grid-row:5/6}',
    '.mos .mtag{position:absolute;left:10px;bottom:10px;background:var(--bg);color:var(--fg);font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:6px 10px;border-radius:calc(var(--r)*.5)}',
    '.h-post{align-items:flex-end;padding-bottom:70px;text-align:left}',
    '.h-post .h-bg img{filter:grayscale(1) contrast(1.15) brightness(.62)}.h-post .duo{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 20%,var(--bg) 92%),linear-gradient(0deg,var(--acs),var(--acs));mix-blend-mode:normal}',
    '.h-post .duo:before{content:"";position:absolute;inset:0;background:var(--ac);mix-blend-mode:multiply;opacity:.32}',
    '.h-post .giant{font-family:var(--fd);font-weight:var(--dw);text-transform:uppercase;letter-spacing:var(--dls);line-height:.82;font-size:min(calc(clamp(56px,15vw,240px)*var(--dsc)),calc((100vw - 48px) / (var(--gw,8) * var(--cw,.62))));margin:0 0 26px;overflow-wrap:normal}',
    '.h-post .giant .w{transition-duration:1.1s}',
    '.h-post .pr{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end;border-top:1px solid var(--line);padding-top:28px}',
    '.h-post .pr h1{font-size:calc(clamp(22px,2.6vw,36px)*var(--dsc));max-width:none;margin:0}',
    '@media (max-width:960px){.h-mos .wrap,.h-post .pr{grid-template-columns:1fr}.mos{grid-auto-rows:64px}}',
  ].join('');

  /* acabamento de cada direção (só muda o que dá personalidade; o resto é a base) */
  var DIR_CSS = {
    noturno: [
      '.disp .hl,.giant .hl{color:var(--ac);text-shadow:0 0 18px var(--ac),0 0 46px var(--acs)}',
      'h1.disp,.giant{text-shadow:0 0 30px rgba(255,255,255,.08)}',
      '.btn-ac{box-shadow:0 0 0 1px var(--ac),0 0 28px -4px var(--ac),0 0 60px -10px var(--ac)}',
      '.eyb{text-shadow:0 0 12px var(--ac)}.prog{box-shadow:0 0 14px var(--ac)}',
      'section.alt,.s-grid article,.perks article,.rvs article{background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01))}',
      '.rvs article,.s-grid article,.perks article{border:1px solid transparent;background-image:linear-gradient(var(--bg),var(--bg)),linear-gradient(140deg,var(--ac),transparent 45%,rgba(255,255,255,.12));background-origin:border-box;background-clip:padding-box,border-box}',
      'body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:79;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px)}',
    ].join(''),
    luxo: [
      '.eyb{letter-spacing:.42em;font-weight:500}.eyb:before{width:56px}',
      '.sh{text-align:center;margin-inline:auto}.sh .eyb{justify-content:center}.sh .eyb:after{content:"";width:56px;height:1px;background:currentColor}',
      'h2.disp{font-weight:400}.disp .hl{font-style:italic;color:var(--ac)}',
      '.btn{letter-spacing:.28em;font-weight:500;font-size:12px}.btn-ac{box-shadow:none;background:transparent;color:var(--ac);border-color:var(--ac)}.btn-ac:hover{background:var(--ac);color:var(--on)}',
      'section{border-top:1px solid var(--line)}.mq{border-color:var(--ac)}',
      '.gal figure,.ed-row figure,.mos figure,.about figure{outline:1px solid var(--line);outline-offset:8px}',
      '.price{font-style:italic}.stars{color:var(--ac)}',
    ].join(''),
    retro: [
      '.btn{border:2px solid var(--fg);box-shadow:4px 4px 0 var(--fg);letter-spacing:.06em}.btn:hover{box-shadow:6px 6px 0 var(--fg)}.btn:active{box-shadow:1px 1px 0 var(--fg);transform:translate(3px,3px)}',
      '.btn-ac{box-shadow:4px 4px 0 var(--fg)}.btn-gh{background:var(--bg)}',
      '.s-cards article,.rvs article,.perks article,.badge{border:2px solid var(--fg);box-shadow:6px 6px 0 var(--fg)}',
      '.gal figure,.mos figure,.col figure,.about figure,.strip figure{border:2px solid var(--fg);box-shadow:6px 6px 0 var(--ac)}',
      '.eyb{background:var(--ac);color:var(--on);padding:6px 12px;border-radius:999px;letter-spacing:.14em}.eyb:before{display:none}',
      '.seal{filter:drop-shadow(3px 3px 0 var(--fg))}.mq{border-block:2px solid var(--fg)}',
      'body:after{opacity:.09}',
    ].join(''),
    brutal: [
      '*{border-radius:0!important}',
      '.btn{border:3px solid var(--fg);box-shadow:none;font-weight:800}.btn-ac{border-color:var(--fg)}.btn:hover{background:var(--fg);color:var(--bg)}',
      'h2.disp{font-size:calc(clamp(40px,7.4vw,112px)*var(--dsc))}',
      '.s-grid article,.s-list .row,.rvs article,.perks article,.gal figure,.mos figure,.col figure{border:3px solid var(--fg)!important;box-shadow:none!important}',
      '.eyb{color:var(--fg);background:var(--ac);padding:4px 10px;letter-spacing:.1em;font-weight:800}.eyb:before{display:none}',
      '.mq{background:var(--fg);color:var(--bg);border:0}.mq span:after{color:var(--ac)}',
      'section{border-top:3px solid var(--fg)}.nav.on{box-shadow:0 3px 0 var(--fg)}',
    ].join(''),
    suico: [
      'body{background-image:linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:calc((min(1200px,100vw - 40px))/12) 100%;background-position:center top}',
      '.eyb{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;font-weight:500;color:var(--fg)}.eyb:before{content:"→";width:auto;height:auto;background:none;color:var(--ac)}',
      'h2.disp{font-weight:400}.disp .hl{font-style:italic}',
      '.btn{letter-spacing:.04em;text-transform:none;font-size:15px}',
      '.s-list .row{border-bottom:1px solid var(--fg)}.num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
      'section{border-top:1px solid var(--fg)}.mq{border-block:1px solid var(--fg)}',
    ].join(''),
  };

  var BASE_CSS = [
    '*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}',
    ':root{--ease:cubic-bezier(.23,1,.32,1);--ease-io:cubic-bezier(.77,0,.175,1)}',
    'h1,h2,h3{text-wrap:balance}p{text-wrap:pretty}',
    'body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:80;opacity:.045;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")}',
    ':focus-visible{outline:2px solid var(--ac);outline-offset:3px;border-radius:4px}',
    '.skip{position:fixed;left:12px;top:-60px;z-index:100;background:var(--ac);color:var(--on);padding:10px 14px;border-radius:8px;font-weight:600;transition:top .2s var(--ease)}.skip:focus{top:12px}',
    '.mono{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:min(var(--r),10px);background:var(--ac);color:var(--on);font-family:var(--fd);font-size:14px;letter-spacing:0;flex:none}',
    '.logo{display:inline-flex;align-items:center;gap:12px}',
    '.mono{overflow:hidden;position:relative}.mono .mk{width:19px;height:19px}.mono img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;padding:3px;display:none}',
    '.mono.has-img img{display:block}.mono.has-img .mk{visibility:hidden}',
    '.seal{width:100%;height:auto;color:var(--fg);overflow:visible}.seal-rot{transform-origin:100px 100px;animation:spin 26s linear infinite}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '.h-seal{position:absolute;right:clamp(20px,6vw,90px);bottom:clamp(70px,12vh,130px);width:clamp(120px,12vw,168px);color:#fff}',
    '.c-seal{position:absolute;left:-54px;bottom:-30px;width:clamp(110px,10vw,140px);z-index:3;background:var(--bg);border-radius:50%;padding:8px}',
    '.t-seal{width:96px;margin:0 auto 22px}',
    '.ed-fig{position:relative}.e-seal{position:absolute;right:-40px;top:-50px;width:clamp(110px,10vw,140px);background:var(--bg);border-radius:50%;padding:8px}',
    '.f-seal{width:96px;flex:none}',
    '@media (max-width:960px){.h-seal{width:96px;bottom:auto;top:96px;right:18px}.c-seal{left:8px;bottom:-24px;width:96px}.e-seal{right:10px;top:-40px;width:96px}}',
    '.open{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:999px;border:1px solid var(--line);margin-left:6px;vertical-align:middle}',
    '.open:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}.open.is-on{color:#16a34a;border-color:rgba(22,163,74,.35)}.open.is-off{color:var(--mut)}.open:empty{display:none}',
    'body{display:block;margin:0;padding:0;background:var(--bg);color:var(--fg);font:400 17px/1.65 var(--fb);overflow-x:hidden;-webkit-font-smoothing:antialiased}',
    'img{display:block;max-width:100%}a{color:inherit;text-decoration:none}svg{width:1em;height:1em;flex:none}',
    '::selection{background:var(--ac);color:var(--on)}',
    '.wrap{width:min(1200px,100% - 40px);margin:0 auto}',
    '.disp{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);letter-spacing:var(--dls);line-height:var(--dlh)}',
    '.disp .hl{color:var(--ac);font-style:italic}',
    'h2.disp{font-size:calc(clamp(34px,5.4vw,72px)*var(--dsc))}',
    '.eyb{display:inline-flex;align-items:center;gap:12px;color:var(--ac);font-size:13px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;margin-bottom:18px}',
    '.eyb:before{content:"";width:34px;height:1px;background:currentColor}',
    '.lead{font-size:clamp(17px,1.6vw,20px);color:var(--mut);max-width:560px}',
    'section{padding:clamp(80px,11vw,150px) 0;position:relative}',
    '.sh{margin-bottom:clamp(40px,6vw,70px);max-width:820px}',
    /* progresso + nav */
    '.prog{position:fixed;top:0;left:0;right:0;height:3px;background:var(--ac);transform-origin:0 50%;transform:scaleX(0);z-index:60}',
    '.nav{position:fixed;inset:0 0 auto;z-index:50;transition:background .4s,padding .4s,box-shadow .4s;padding:22px 0}',
    '.nav.on{background:var(--shade);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px);padding:12px 0;box-shadow:0 1px 0 var(--line)}',
    '.nav .wrap{display:flex;align-items:center;gap:28px}',
    '.logo{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);font-size:calc(19px*var(--dsc));letter-spacing:var(--dls);line-height:1.1;max-width:46%}',
    '.links{display:flex;gap:26px;margin-left:auto;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}',
    '.links a{position:relative;transition:color .3s}.links a:hover{color:var(--fg)}',
    '.links a:after{content:"";position:absolute;left:0;bottom:-6px;height:1px;width:100%;background:var(--ac);transform:scaleX(0);transform-origin:right;transition:transform .4s}',
    '.links a:hover:after{transform:scaleX(1);transform-origin:left}',
    '.burger{display:none;margin-left:auto;background:none;border:0;color:inherit;width:44px;height:44px;cursor:pointer;position:relative}',
    '.burger i{position:absolute;left:11px;right:11px;height:2px;background:currentColor;transition:transform .4s,top .4s}.burger i:first-child{top:17px}.burger i:last-child{top:25px}',
    '.menu .burger i:first-child{top:21px;transform:rotate(45deg)}.menu .burger i:last-child{top:21px;transform:rotate(-45deg)}',
    '.mnav{position:fixed;inset:0;z-index:45;background:var(--bg);display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 28px;clip-path:circle(0 at calc(100% - 40px) 40px);transition:clip-path .7s cubic-bezier(.7,0,.2,1)}',
    '.menu .mnav{clip-path:circle(150% at calc(100% - 40px) 40px)}',
    '.mnav a{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);font-size:calc(40px*var(--dsc));line-height:1.15}',
    /* botões */
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:16px 28px;border-radius:var(--rb);font-weight:600;font-size:14px;letter-spacing:.12em;text-transform:uppercase;border:1px solid transparent;position:relative;overflow:hidden;isolation:isolate;cursor:pointer;transition:transform .2s var(--ease),box-shadow .25s var(--ease),border-color .2s,background-color .2s}',
    '.btn svg{width:18px;height:18px}',
    '.btn:active{transform:scale(.97)}',
    '@media (hover:hover) and (pointer:fine){.btn:hover{transform:translateY(-2px)}.btn:hover:active{transform:translateY(-2px) scale(.97)}}',
    '.btn-ac{background:var(--ac);color:var(--on);box-shadow:0 12px 32px -12px var(--ac)}',
    '.btn-ac:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.3) 50%,transparent 70%);transform:translateX(-120%);transition:transform .7s var(--ease);z-index:-1}',
    '@media (hover:hover) and (pointer:fine){.btn-ac:hover:before{transform:translateX(120%)}}',
    '.btn-gh{border-color:var(--line);color:var(--fg);background:transparent}.btn-gh:hover{border-color:var(--fg)}',
    '.btn.sm{padding:11px 18px;font-size:12px}',
    /* hero */
    '.hero{min-height:100svh;display:flex;align-items:center;position:relative;overflow:hidden;padding:130px 0 90px}',
    '.hero h1{font-size:calc(clamp(46px,8.4vw,128px)*var(--dsc));margin:6px 0 28px;max-width:14ch}',
    '.wl{display:inline-block;overflow:hidden;vertical-align:top;padding:.16em .04em .08em;margin:-.16em -.04em -.08em}',
    '.w{display:inline-block;transform:translateY(102%);transition:transform .9s var(--ease) calc(.1s + var(--i)*.045s)}',
    '.ready .w{transform:none}',
    '.cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:38px}',
    '.chip{display:inline-flex;align-items:center;gap:10px;margin-top:34px;font-size:14px;color:var(--mut)}.chip b{color:var(--fg)}',
    '.stars{display:inline-flex;gap:2px;color:var(--ac)}.stars i{display:inline-flex;opacity:.25}.stars i.on{opacity:1}.stars svg{width:15px;height:15px}',
    '.h-bg{position:absolute;inset:-6% 0;z-index:-2}.h-bg img{width:100%;height:100%;object-fit:cover;animation:kb 22s ease-in-out infinite alternate}',
    '@keyframes kb{from{transform:scale(1.08)}to{transform:scale(1.2) translate(-2%,-1%)}}',
    '.h-sh{position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,var(--bg) 8%,' + 'var(--shade) 45%,transparent 100%),linear-gradient(0deg,var(--bg),transparent 35%)}',
    '.scroll{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mut);display:flex;flex-direction:column;align-items:center;gap:10px}',
    '.scroll:after{content:"";width:1px;height:46px;background:linear-gradient(var(--ac),transparent);animation:sc 2s ease-in-out infinite}',
    '@keyframes sc{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}',
    '.h-split .wrap{display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}',
    '.col{position:relative;height:min(640px,72vh)}',
    '.col figure{position:absolute;overflow:hidden;border-radius:var(--r);box-shadow:0 40px 80px -30px rgba(0,0,0,.5)}',
    '.col figure img{width:100%;height:100%;object-fit:cover;transform:scale(1.15)}',
    '.col .f1{inset:0 18% 14% 0}.col .f2{width:48%;height:46%;right:0;bottom:0;border:6px solid var(--bg)}',
    '.badge{position:absolute;z-index:2;background:var(--card2);color:var(--fg);backdrop-filter:blur(10px);padding:14px 18px;border-radius:calc(var(--r) + 4px);box-shadow:0 20px 40px -20px rgba(0,0,0,.45);font-size:14px;display:flex;align-items:center;gap:10px;animation:fl 6s ease-in-out infinite}',
    '.badge b{font-family:var(--fd);font-size:26px;line-height:1}',
    '.badge.b1{left:-26px;top:12%}.badge.b2{right:6%;top:-14px;animation-delay:-3s}',
    '.badge .dot{width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:pu 2s infinite}',
    '@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}',
    '@keyframes pu{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}100%{box-shadow:0 0 0 12px rgba(34,197,94,0)}}',
    '.h-center{text-align:center;flex-direction:column;justify-content:center}',
    '.h-center h1{margin-left:auto;margin-right:auto;max-width:16ch}.h-center .lead{margin:0 auto}.h-center .cta,.h-center .chip{justify-content:center}',
    '.h-center .glow{position:absolute;width:70vw;height:70vw;max-width:900px;max-height:900px;border-radius:50%;background:radial-gradient(circle,var(--acs),transparent 65%);top:-20%;left:50%;transform:translateX(-50%);z-index:-1;animation:br 9s ease-in-out infinite}',
    '@keyframes br{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.15)}}',
    '.strip{margin-top:70px;width:100%;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}',
    '.strip .tr{display:flex;gap:18px;width:max-content;animation:mq 50s linear infinite}',
    '.strip figure{width:clamp(220px,26vw,340px);aspect-ratio:4/5;border-radius:var(--r);overflow:hidden}.strip img{width:100%;height:100%;object-fit:cover}',
    '.h-ed{align-items:flex-end}.h-ed h1{font-size:calc(clamp(52px,11.5vw,190px)*var(--dsc));max-width:none;margin:0 0 40px}',
    '.ed-top{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:22px;margin-bottom:34px}',
    '.ed-row{display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:end}',
    '.ed-row figure{aspect-ratio:16/10;overflow:hidden;border-radius:var(--r)}.ed-row img{width:100%;height:100%;object-fit:cover;transform:scale(1.15)}',
    '.ed-row h2{font-size:calc(clamp(26px,3vw,40px)*var(--dsc));margin-bottom:18px}',
    /* marquee */
    '.mq{padding:26px 0;border-block:1px solid var(--line);overflow:hidden;background:var(--bg);position:relative;z-index:2}',
    '.mq.tilt{background:var(--ac);color:var(--on);transform:rotate(-2deg) scale(1.04);margin:-10px 0;border:0}',
    '.mq .tr{display:flex;width:max-content;animation:mq 32s linear infinite}',
    '.mq span{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);font-size:calc(clamp(22px,2.6vw,34px)*var(--dsc));padding:0 28px;white-space:nowrap;display:flex;align-items:center;gap:56px}',
    '.mq span:after{content:"✦";font-size:.6em;color:var(--ac)}.mq.tilt span:after{color:inherit}',
    '@keyframes mq{to{transform:translateX(-50%)}}',
    /* serviços */
    '.s-list .row{display:grid;grid-template-columns:70px 1.1fr 1.4fr auto;gap:28px;align-items:center;padding:30px 0;border-bottom:1px solid var(--line);position:relative;transition:padding .4s}',
    '.s-list .row:before{content:"";position:absolute;inset:0;background:var(--acs);transform:scaleY(0);transform-origin:bottom;transition:transform .5s cubic-bezier(.2,.8,.2,1);z-index:-1}',
    '.s-list .row:hover{padding-left:22px;padding-right:22px}.s-list .row:hover:before{transform:scaleY(1)}',
    '.num{font-family:var(--fd);color:var(--ac);font-size:15px}',
    '.s-list h3{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);letter-spacing:var(--dls);font-size:calc(clamp(22px,2.4vw,32px)*var(--dsc));line-height:1.05}',
    '.s-list p,.s-cards p,.s-grid p,.perk p{color:var(--mut);font-size:15.5px}',
    '.price{font-family:var(--fd);color:var(--ac);font-size:calc(22px*var(--dsc));white-space:nowrap}',
    '.price svg{width:26px;height:26px;transition:transform .4s}.row:hover .price svg{transform:rotate(45deg)}',
    '.s-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}',
    '.s-cards article{border-radius:var(--r);overflow:hidden;background:var(--card);border:1px solid var(--line);transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s}',
    '.s-cards article:hover{transform:translateY(-8px);box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}',
    '.s-cards figure{aspect-ratio:4/3;overflow:hidden}.s-cards img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}',
    '.s-cards article:hover img{transform:scale(1.08)}',
    '.s-cards .bd{padding:24px 24px 28px}.s-cards h3,.s-grid h3,.perk h3{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);letter-spacing:var(--dls);font-size:calc(22px*var(--dsc));line-height:1.1;margin-bottom:8px}',
    '.s-cards .price{display:block;margin-top:14px;font-size:20px}',
    '.s-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}',
    '.s-grid article,.perk{background:var(--bg);padding:40px 32px;position:relative;overflow:hidden}',
    '.glow:after{content:"";position:absolute;inset:0;background:radial-gradient(380px circle at var(--mx,-999px) var(--my,-999px),var(--acs),transparent 60%);pointer-events:none;transition:opacity .3s}',
    '.s-grid .big{font-family:var(--fd);font-size:56px;line-height:1;color:transparent;-webkit-text-stroke:1px var(--ac);display:block;margin-bottom:26px}',
    '.s-grid .price{display:block;margin-top:16px;font-size:20px}',
    /* diferenciais */
    '.alt{background:var(--card)}',
    '.perks{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}',
    '.perk{border-radius:var(--r);border:1px solid var(--line);background:var(--bg);transition:transform .5s,border-color .5s}',
    '.perk:hover{transform:translateY(-6px);border-color:var(--ac)}',
    '.perk .n{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;background:var(--acs);color:var(--ac);font-family:var(--fd);font-size:16px;margin-bottom:26px}',
    /* sobre */
    '.about{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,7vw,100px);align-items:center}',
    '.about.rev figure{order:2}',
    '.about figure{aspect-ratio:4/5;overflow:hidden;border-radius:var(--r);position:relative}.about figure img{width:100%;height:100%;object-fit:cover;transform:scale(1.15)}',
    '.about p{color:var(--mut);margin-top:18px;font-size:17.5px}',
    '.stats{display:flex;gap:44px;flex-wrap:wrap;margin-top:40px;padding-top:32px;border-top:1px solid var(--line)}',
    '.stats b{display:block;font-family:var(--fd);font-weight:var(--dw);font-size:calc(46px*var(--dsc));line-height:1;color:var(--fg)}.stats span{font-size:13px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase}',
    /* galeria */
    '.gal{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:clamp(160px,19vw,260px);gap:14px}',
    '.gal figure{overflow:hidden;border-radius:var(--r);cursor:zoom-in;position:relative}',
    '.gal figure:nth-child(1){grid-column:span 2;grid-row:span 2}',
    '.g3 figure:nth-child(2),.g3 figure:nth-child(3){grid-column:span 2}',
    '.g4 figure:nth-child(3),.g6 figure:nth-child(3),.g8 figure:nth-child(3){grid-row:span 2}',
    '.g6 figure:nth-child(5),.g6 figure:nth-child(6){grid-column:span 2}',
    '.gal img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.8,.2,1),filter .6s}',
    '.gal figure:hover img{transform:scale(1.07)}',
    '.gal figure:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.35),transparent 50%);opacity:0;transition:opacity .5s}.gal figure:hover:after{opacity:1}',
    '.lb{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:30px;opacity:0;pointer-events:none;transition:opacity .4s;cursor:zoom-out}',
    '.lb.on{opacity:1;pointer-events:auto}.lb img{max-height:90vh;border-radius:8px;transform:scale(.94);transition:transform .5s}.lb.on img{transform:none}',
    '.credit{font-size:12px;color:var(--mut);margin-top:14px}',
    /* avaliações */
    '.rv-top{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex-wrap:wrap;margin-bottom:50px}',
    '.score{display:flex;align-items:center;gap:22px}.score b{font-family:var(--fd);font-weight:var(--dw);font-size:calc(clamp(70px,9vw,120px)*var(--dsc));line-height:.9;color:var(--ac)}',
    '.score .stars svg{width:20px;height:20px}.score small{display:block;color:var(--mut);font-size:14px;margin-top:6px}',
    '.rvs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}',
    '.rvs article{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:34px;display:flex;flex-direction:column;gap:18px}',
    '.rvs q{font-size:17px;line-height:1.6;quotes:"\\201C" "\\201D"}.rvs q:before{content:open-quote;font-family:var(--fd);color:var(--ac);font-size:52px;line-height:0;vertical-align:-.4em;margin-right:4px}',
    '.rvs .who{margin-top:auto;display:flex;align-items:center;gap:12px;font-size:14px}',
    '.rvs .av{width:40px;height:40px;border-radius:50%;background:var(--ac);color:var(--on);display:grid;place-items:center;font-weight:700}',
    '.rvs .who small{display:block;color:var(--mut);font-size:12px}',
    /* cta */
    '.band{min-height:78vh;display:flex;align-items:center;text-align:center;overflow:hidden;color:#fff}',
    '.band .bgi{position:absolute;inset:-12% 0;z-index:-2}.band .bgi img{width:100%;height:100%;object-fit:cover}',
    '.band:before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,.45),rgba(0,0,0,.78))}',
    '.band h2{margin:0 auto 22px;max-width:16ch}.band p{color:rgba(255,255,255,.78);max-width:560px;margin:0 auto 38px}.band .eyb{color:#fff}',
    /* contato */
    '.contact{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(30px,5vw,70px)}',
    '.info{display:flex;flex-direction:column;gap:6px}',
    '.it{display:flex;gap:18px;padding:22px 0;border-bottom:1px solid var(--line)}.it svg{width:24px;height:24px;color:var(--ac);margin-top:2px}',
    '.it h4{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);font-weight:600;margin-bottom:4px}',
    '.hours{list-style:none;font-size:15px}.hours li{display:flex;justify-content:space-between;gap:20px;text-transform:capitalize}',
    '.map{border-radius:var(--r);overflow:hidden;min-height:420px;border:1px solid var(--line)}.map iframe{width:100%;height:100%;min-height:420px;border:0;filter:' + 'var(--mapf)}',
    /* faq */
    '.faq{max-width:860px}.faq details{border-bottom:1px solid var(--line);padding:24px 0}',
    '.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);font-size:calc(21px*var(--dsc));letter-spacing:var(--dls)}',
    '.faq summary:after{content:"+";color:var(--ac);font-size:28px;line-height:1;transition:transform .4s}.faq details[open] summary:after{transform:rotate(45deg)}',
    '.faq p{color:var(--mut);margin-top:12px;max-width:680px}',
    /* rodapé */
    'footer{padding:70px 0 120px;border-top:1px solid var(--line)}',
    '.ft{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;align-items:flex-end}',
    '.ft .big{font-family:var(--fd);font-weight:var(--dw);text-transform:var(--tt);letter-spacing:var(--dls);font-size:calc(clamp(30px,5vw,64px)*var(--dsc));line-height:1}',
    '.ft small{color:var(--mut);font-size:13px}.ft small a{color:var(--fg);border-bottom:1px solid var(--ac)}',
    /* flutuantes */
    '.fwa{position:fixed;right:22px;bottom:22px;z-index:70;width:62px;height:62px;border-radius:50%;background:#25d366;color:#fff;display:grid;place-items:center;box-shadow:0 14px 34px -10px rgba(37,211,102,.7);transition:transform .35s}',
    '.fwa:hover{transform:scale(1.08)}.fwa svg{width:32px;height:32px}',
    '.fwa:before{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #25d366;animation:ring 2.4s infinite}',
    '@keyframes ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.7);opacity:0}}',
    '.fwa span{position:absolute;right:76px;white-space:nowrap;background:var(--card2);color:var(--fg);padding:9px 14px;border-radius:10px;font-size:13px;box-shadow:0 10px 30px -10px rgba(0,0,0,.4);opacity:0;transform:translateX(10px);transition:.4s;pointer-events:none}',
    '.fwa.hint span,.fwa:hover span{opacity:1;transform:none}',
    '.pv{position:fixed;left:16px;bottom:16px;z-index:70;display:flex;align-items:center;gap:10px;background:#111;color:#fff;font:500 12.5px/1.3 system-ui,sans-serif;padding:9px 10px 9px 14px;border-radius:999px;box-shadow:0 10px 30px -8px rgba(0,0,0,.5);max-width:calc(100% - 110px)}',
    '.pv a{background:#22c55e;color:#04120a;font-weight:700;padding:6px 11px;border-radius:999px;white-space:nowrap}',
    /* revelação */
    '[data-r]{opacity:0;transform:translateY(20px);transition:opacity .8s var(--ease) var(--d,0s),transform .8s var(--ease) var(--d,0s)}',
    '[data-r="clip"]{opacity:1;transform:none;clip-path:inset(100% 0 0 0);transition:clip-path 1.1s var(--ease-io) var(--d,0s)}',
    '[data-r="scale"]{transform:scale(.96)}',
    '[data-r].in{opacity:1;transform:none;clip-path:inset(0 0 0 0)}',
    '@media (hover:none){.s-list .row:hover{padding-left:0;padding-right:0}.s-list .row:hover:before{transform:scaleY(0)}.s-cards article:hover,.perk:hover{transform:none}.gal figure:hover img,.s-cards article:hover img{transform:none}.glow:after{display:none}}',
    '@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}[data-r]{opacity:1;transform:none;clip-path:none}.w{transform:none}}',
    /* responsivo */
    '@media (max-width:960px){.links,.nav .btn{display:none}.burger{display:block}.h-split .wrap,.ed-row,.about,.contact{grid-template-columns:1fr}.col{height:440px;margin-top:20px}.badge.b1{left:0}',
    '.perks{grid-template-columns:1fr 1fr}.s-list .row{grid-template-columns:44px 1fr auto;gap:14px}.s-list .row p{grid-column:2/4;grid-row:2}.about.rev figure{order:0}.gal{grid-template-columns:1fr 1fr;grid-auto-flow:dense}.gal figure{grid-column:auto!important;grid-row:auto!important}.gal figure:nth-child(1){grid-column:span 2!important}.logo{max-width:70%}}',
    '@media (max-width:560px){body{font-size:16px}.perks{grid-template-columns:1fr}.hero{padding-top:110px}.btn{padding:15px 22px}.cta .btn{width:100%;justify-content:center}.map,.map iframe{min-height:320px}}',
  ].join('');

  /* ---------- HTML ---------- */
  function page(d, opts) {
    opts = Object.assign({}, opts || {});
    if (d.x) opts.exported = true; // site efetivado: sem faixa de prévia, liberado para o Google
    d = Object.assign({}, d, { n: d.dn || cleanName(d.n) });
    var P = plan(d), N = P.N, ph = P.photos, r = P.r;
    var tel = String(d.t || '').replace(/\D/g, ''); if (tel.indexOf('55') === 0 && tel.length >= 12) tel = tel.slice(2);
    var wa = tel.length >= 10 ? 'https://wa.me/55' + tel + '?text=' + encodeURIComponent(N.wa) : '#contato';
    var mapsQ = encodeURIComponent((d.n || '') + ' ' + (d.a || ''));
    var mapsUrl = d.m || 'https://www.google.com/maps/search/?api=1&query=' + mapsQ;
    var rating = d.r ? String(d.r).replace('.', ',') : '';
    var words = function (t) {
      var ws = String(t).split(/\s+/);
      return ws.map(function (w, i) { return '<span class="wl"><span class="w' + (i === ws.length - 1 && P.font.up === 0 ? ' hl' : '') + '" style="--i:' + i + '">' + esc(w) + '</span></span>'; }).join(' ');
    };
    var btnWA = function (label, cls) { return '<a class="btn btn-ac ' + (cls || '') + '" href="' + wa + '" target="_blank" rel="noopener">' + ICON.wa + '<span>' + esc(label || N.cta) + '</span></a>'; };
    var btnSec = '<a class="btn btn-gh" href="#servicos"><span>Ver ' + esc(N.svcT.toLowerCase()) + '</span>' + ICON.arrow + '</a>';
    var hoursAttr = (d.h && d.h.length) ? ' data-open="' + esc(JSON.stringify(d.h)) + '"' : '';
    var openTag = hoursAttr ? '<span class="open"' + hoursAttr + '></span>' : '';
    var chip = (d.r || openTag) ? '<div class="chip" data-r style="--d:.9s">' + (d.r ? stars(d.r) + '<span><b>' + rating + '</b> no Google · ' + (d.u || 0) + ' avaliações</span>' : '') + openTag + '</div>' : '';
    var monoHtml = '<span class="mono' + (d.lg ? ' has-img' : '') + '" aria-hidden="true">' +
      (d.lg ? '<img src="' + esc(d.lg) + '" alt="">' : d.fv ? '<img data-fv src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d.fv) + '&sz=256" alt="">' : '') + '<b class="ini">' + esc(iniciais(d)) + '</b></span>';
    var sealHtml = function (cls) { return seal(P, d, cls); };
    var initials = String(d.n || '').split(/\s+/).filter(function (w) { return w.length > 2 || /^[A-ZÀ-Ú]/.test(w); }).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || String(d.n || '?').charAt(0);
    var sh = function (eyb, title, center) { return '<div class="sh"' + (center ? ' style="margin-inline:auto;text-align:center"' : '') + ' data-r><span class="eyb">' + esc(eyb) + '</span><h2 class="disp">' + esc(title) + '</h2></div>'; };
    var nav = [['servicos', N.svcT], ['sobre', 'Sobre'], ['galeria', 'Galeria'], ['avaliacoes', 'Avaliações'], ['contato', 'Contato']];

    /* hero */
    var hero;
    if (P.hero === 'full') {
      hero = '<header class="hero h-full"><div class="h-bg" data-px=".1"><img src="' + ph[0] + '" alt="' + esc(d.n) + '" fetchpriority="high"></div><div class="h-sh"></div>' +
        '<div class="wrap"><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div><div class="h-seal" data-r="scale" style="--d:1s">' + sealHtml() + '</div><a class="scroll" href="#servicos">Rolar</a></header>';
    } else if (P.hero === 'split') {
      hero = '<header class="hero h-split"><div class="wrap"><div><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div>' +
        '<div class="col" data-r="scale" style="--d:.3s"><figure class="f1"><img src="' + ph[0] + '" alt="" data-px=".06"></figure><figure class="f2"><img src="' + ph[1] + '" alt="" data-px="-.05"></figure>' +
        (d.r ? '<div class="badge b1">' + ICON.star + '<div><b>' + rating + '</b><br><small>' + (d.u || 0) + ' avaliações</small></div></div>' : '') +
        '<div class="badge b2"><span class="dot"></span>Atendimento pelo WhatsApp</div><div class="c-seal">' + sealHtml() + '</div></div></div></header>';
    } else if (P.hero === 'center') {
      var strip = ph.slice(0, 6).map(function (u) { return '<figure><img src="' + u + '" alt=""></figure>'; }).join('');
      hero = '<header class="hero h-center"><div class="glow"></div><div class="wrap"><div class="t-seal" data-r="scale">' + sealHtml() + '</div><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div><div class="strip" data-r style="--d:.9s"><div class="tr">' + strip + strip + '</div></div></header>';
    } else if (P.hero === 'mosaic') {
      // mosaico: 6 fotos (as reais primeiro) com legenda de verdade na maior
      var tags = [d.r ? '★ ' + rating + ' no Google' : '', P.ci, N.short];
      var mos = ph.slice(0, 6).map(function (u, i) { return '<figure class="m' + (i + 1) + '" data-r="clip" style="--d:' + (.2 + i * .08) + 's"><img src="' + u + '" alt="' + (i ? '' : esc(d.n)) + '"' + (i ? ' loading="lazy"' : ' fetchpriority="high"') + '>' + (i === 0 && tags[0] ? '<span class="mtag">' + esc(tags[0]) + '</span>' : '') + '</figure>'; }).join('');
      hero = '<header class="hero h-mos"><div class="wrap"><div><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div><div class="mos">' + mos + '</div></div></header>';
    } else if (P.hero === 'poster') {
      // pôster: o nome do negócio gigante sobre a foto real em duotone na cor da marca
      hero = '<header class="hero h-post"><div class="h-bg" data-px=".08"><img src="' + ph[0] + '" alt="' + esc(d.n) + '" fetchpriority="high"></div><div class="duo"></div>' +
        '<div class="wrap"><span class="eyb" data-r>' + esc(P.kick) + '</span><div class="giant" style="--gw:' + Math.max.apply(null, String(d.n).split(/\s+/).map(function (w) { return w.length; })) + ';--cw:' + (P.font.cw || .62) + '">' + words(d.n) + '</div>' +
        '<div class="pr" data-r style="--d:.7s"><div><h1 class="disp">' + esc(P.head) + '</h1><p class="lead" style="margin-top:14px">' + esc(P.sub) + '</p></div>' +
        '<div><div class="cta" style="margin-top:0">' + btnWA() + btnSec + '</div>' + chip + '</div></div></div></header>';
    } else {
      hero = '<header class="hero h-ed"><div class="wrap"><div class="ed-top" data-r><span class="eyb" style="margin:0">' + esc(P.kick) + '</span>' + (d.r ? '<span class="chip" style="margin:0">' + stars(d.r) + '<span><b>' + rating + '</b> · ' + (d.u || 0) + ' avaliações</span></span>' : '') + '</div>' +
        '<h1 class="disp">' + words(d.n) + '</h1><div class="ed-row"><div class="ed-fig"><figure data-r="clip" style="--d:.4s"><img src="' + ph[0] + '" alt="" data-px=".08"></figure><div class="e-seal" data-r="scale" style="--d:1s">' + sealHtml() + '</div></div>' +
        '<div data-r style="--d:.6s"><h2 class="disp">' + esc(P.head) + '</h2><p class="lead">' + esc(P.sub) + '</p><div class="cta">' + btnWA() + '</div></div></div></div></header>';
    }

    var mq = P.marq.concat([d.n]).concat(P.ci ? ['Em ' + P.ci] : []);
    var mqHtml = mq.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var marquee = '<div class="mq' + (P.tilt ? ' tilt' : '') + '"><div class="tr">' + mqHtml + mqHtml + '</div></div>';

    /* serviços */
    var svcItems = P.svc.map(function (s, i) {
      var price = s[2] ? '<span class="price">' + esc(s[2]) + '</span>' : '';
      var dl = 'style="--d:' + (i % 3) * .1 + 's"';
      if (P.svcL === 'list') return '<div class="row" data-r ' + dl + '><span class="num">0' + (i + 1) + '</span><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p>' + (price || '<span class="price">' + ICON.arrow + '</span>') + '</div>';
      if (P.svcL === 'cards') return '<article data-r ' + dl + '><figure><img src="' + ph[(i + 2) % ph.length] + '" alt="" loading="lazy"></figure><div class="bd"><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p>' + price + '</div></article>';
      return '<article class="glow" data-r ' + dl + '><span class="big">0' + (i + 1) + '</span><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p>' + price + '</article>';
    }).join('');
    var services = '<section id="servicos"><div class="wrap">' + sh(N.svcT, P.svcL === 'list' ? ({ 'Cardápio': 'Nosso cardápio', 'Modalidades': 'Nossas modalidades', 'Especialidades': 'Nossas especialidades', 'Áreas de atuação': 'Como podemos ajudar', 'O que oferecemos': 'O que oferecemos' }[N.svcT] || 'Nossos ' + N.svcT.toLowerCase()) : 'O que fazemos de melhor') +
      '<div class="s-' + P.svcL + '">' + svcItems + '</div><div class="cta" data-r style="margin-top:46px">' + btnWA() + '</div></div></section>';

    /* diferenciais */
    var perks = '<section class="alt" id="diferenciais"><div class="wrap">' + sh('Diferenciais', 'Por que escolher a ' + d.n) + '<div class="perks">' +
      P.perks.map(function (p, i) { return '<div class="perk glow" data-r style="--d:' + i * .1 + 's"><span class="n">0' + (i + 1) + '</span><h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p></div>'; }).join('') + '</div></div></section>';

    /* sobre */
    var stats = '';
    var openDays = (d.h || []).filter(function (h) { return !/fechado/i.test(h); }).length;
    if (d.r) stats = '<div class="stats" data-r><div><b data-count="' + d.r + '">0</b><span>Nota no Google</span></div><div><b data-count="' + (d.u || 0) + '">0</b><span>Avaliações</span></div>' +
      (openDays ? '<div><b data-count="' + openDays + '">0</b><span>Dias por semana</span></div>' : '') + '</div>';
    var about = '<section id="sobre"><div class="wrap about' + (P.aboutL ? ' rev' : '') + '"><figure data-r="clip"><img src="' + ph[1 % ph.length] + '" alt="' + esc(d.n) + '" loading="lazy" data-px=".07"></figure>' +
      '<div><div data-r><span class="eyb">Sobre</span><h2 class="disp">' + esc(P.aboutT) + '</h2></div>' + P.about.map(function (t, i) { return '<p data-r style="--d:' + (.1 + i * .1) + 's">' + esc(t) + '</p>'; }).join('') + stats +
      '<div class="cta" data-r>' + btnWA(N.short, 'sm') + '</div></div></div></section>';

    /* galeria */
    var igOn = !!d.ig && P.own >= 7; // fotos próprias de sobra: galeria (ambiente) + vitrine do Instagram sem repetir
    var gp = ph.slice(0, igOn ? 4 : (P.own >= 8 ? 8 : 6));
    var gallery = '<section id="galeria" class="alt"><div class="wrap">' + sh('Galeria', P.own >= 3 ? 'Por dentro da ' + d.n : 'Ambiente e rotina') + '<div class="gal g' + gp.length + '">' +
      gp.map(function (u, i) { return '<figure data-r="clip" style="--d:' + (i % 4) * .08 + 's"><img src="' + u + '" alt="' + esc(d.n) + ' — foto ' + (i + 1) + '" loading="lazy"></figure>'; }).join('') + '</div>' +
      (P.own ? '<p class="credit">Fotos reais de ' + esc(d.n) + '</p>' : '') + '</div></section>';

    /* vitrine do Instagram com as fotos reais do perfil (só quando há fotos próprias suficientes) */
    var igH = d.ig ? String(d.ig).replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, '').replace(/\/$/, '') : '';
    var igFeed = '';
    if (igH && igOn) {
      var igPh = P.photos.slice(4, P.own).slice(0, 6);
      igFeed = '<section class="igf"><div class="wrap"><div class="igf-top" data-r><div><span class="eyb">Instagram</span><h2 class="disp">@' + esc(igH) + '</h2></div>' +
        '<a class="btn btn-gh sm" href="https://instagram.com/' + esc(igH) + '" target="_blank" rel="noopener">' + ICON.ig + '<span>Seguir no Instagram</span></a></div>' +
        '<div class="igf-g" style="grid-template-columns:repeat(' + igPh.length + ',1fr)">' + igPh.map(function (u, i) { return '<a href="https://instagram.com/' + esc(igH) + '" target="_blank" rel="noopener" data-r="clip" style="--d:' + (i % 6) * .06 + 's"><img src="' + u + '" alt="Post de @' + esc(igH) + '" loading="lazy"></a>'; }).join('') + '</div></div></section>';
    }

    /* avaliações (somente reais) */
    var reviews = '';
    if (d.r) {
      var list = (d.rv || []).slice(0, 3).map(function (v, i) {
        return '<article data-r style="--d:' + i * .1 + 's">' + stars(v.r) + '<q>' + esc(v.t) + '</q><div class="who"><span class="av">' + esc((v.a || '?').charAt(0).toUpperCase()) + '</span><div><b>' + esc(v.a) + '</b><small>Avaliação no Google</small></div></div></article>';
      }).join('');
      reviews = '<section id="avaliacoes"><div class="wrap"><div class="rv-top"><div data-r><span class="eyb">Avaliações</span><h2 class="disp">Quem conhece, recomenda</h2></div>' +
        '<div class="score" data-r><b data-count="' + d.r + '">0</b><div>' + stars(d.r) + '<small>' + (d.u || 0) + ' avaliações no Google</small></div></div></div>' +
        (list ? '<div class="rvs">' + list + '</div>' : '') +
        '<div class="cta" data-r><a class="btn btn-gh sm" href="' + mapsUrl + '" target="_blank" rel="noopener"><span>Ver todas no Google</span>' + ICON.arrow + '</a></div></div></section>';
    }

    /* chamada final */
    var band = '<section class="band"><div class="bgi"><img src="' + ph[2 % ph.length] + '" alt="" loading="lazy" data-px=".12"></div><div class="wrap">' +
      '<span class="eyb" data-r>' + esc(N.short) + ' pelo WhatsApp</span><h2 class="disp" data-r>' + esc(P.ctaT) + '</h2><p data-r>Resposta rápida, sem complicação. É só tocar no botão e mandar uma mensagem.</p><div data-r>' + btnWA() + '</div></div></section>';

    /* contato */
    var hours = (d.h && d.h.length) ? '<ul class="hours">' + d.h.map(function (h) { var k = h.indexOf(':'); return '<li><span>' + esc(h.slice(0, k)) + '</span><span>' + esc(h.slice(k + 1).trim()) + '</span></li>'; }).join('') + '</ul>' : '<p>Consulte pelo WhatsApp</p>';
    var ig = d.ig ? String(d.ig).replace(/^@|https?:\/\/(www\.)?instagram\.com\//g, '').replace(/\/$/, '') : '';
    var contact = '<section id="contato"><div class="wrap">' + sh('Contato', 'Venha nos visitar') + '<div class="contact"><div class="info" data-r>' +
      (d.a ? '<div class="it">' + ICON.pin + '<div><h4>Endereço</h4><p>' + esc(d.a) + '</p><a class="btn btn-gh sm" style="margin-top:12px" href="' + mapsUrl + '" target="_blank" rel="noopener"><span>Como chegar</span>' + ICON.arrow + '</a></div></div>' : '') +
      '<div class="it">' + ICON.clock + '<div style="flex:1"><h4>Horário ' + (openTag ? openTag : '') + '</h4>' + hours + '</div></div>' +
      (d.t ? '<div class="it">' + ICON.phone + '<div><h4>Telefone / WhatsApp</h4><p><a href="' + wa + '" target="_blank" rel="noopener">' + esc(d.t) + '</a></p></div></div>' : '') +
      (ig ? '<div class="it">' + ICON.ig + '<div><h4>Instagram</h4><p><a href="https://instagram.com/' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(ig) + '</a></p></div></div>' : '') +
      '<div class="cta" style="margin-top:24px">' + btnWA() + '</div></div>' +
      '<div class="map" data-r="clip"><iframe loading="lazy" title="Mapa" src="https://www.google.com/maps?q=' + mapsQ + '&output=embed"></iframe></div></div></div></section>';

    /* faq */
    var verb = N.short.toLowerCase();
    var faq = '<section class="alt"><div class="wrap">' + sh('Dúvidas', 'Perguntas frequentes') + '<div class="faq" data-r>' +
      '<details open><summary>Como faço para ' + (verb === 'pedir' ? 'fazer um pedido' : verb === 'orçamento' ? 'pedir um orçamento' : verb === 'contato' ? 'falar com vocês' : 'agendar') + '?</summary><p>É só tocar em qualquer botão de WhatsApp desta página. Você fala direto com a nossa equipe e recebe resposta rapidinho.</p></details>' +
      '<details><summary>Onde vocês ficam?</summary><p>' + esc(d.a || 'Fale com a gente pelo WhatsApp para saber o endereço.') + '</p></details>' +
      '<details><summary>Qual o horário de atendimento?</summary><p>' + ((d.h && d.h.length) ? 'Confira os horários completos na seção de contato acima.' : 'Consulte os horários pelo WhatsApp.') + '</p></details>' +
      '</div></div></section>';

    var cr = (opts.exported && d.s && d.cr !== 0) ? '<small>Site por ' + (d.w ? '<a href="https://wa.me/' + esc(d.w) + '" target="_blank" rel="noopener">' + esc(d.s) + '</a>' : esc(d.s)) + '</small>' : '';
    var footer = '<footer><div class="wrap ft"><div class="f-seal">' + sealHtml() + '</div><div style="flex:1"><div class="big">' + esc(d.n) + '</div><small>' + esc(d.c || '') + (P.ci ? ' em ' + esc(P.ci) : '') + ' · © ' + new Date().getFullYear() + '</small></div>' + cr + '</div></footer>';

    var pv = (!opts.exported && (d.s || d.w)) ? '<div class="pv">✨ Prévia' + (d.s ? ' por ' + esc(d.s) : '') + (d.w ? ' <a href="https://wa.me/' + esc(d.w) + '?text=' + encodeURIComponent('Oi! Vi a prévia do site da ' + d.n + ' e quero colocar no ar.') + '" target="_blank" rel="noopener">Quero no ar →</a>' : '') + '</div>' : '';

    var introNome = String(d.n || '').split('').map(function (c, k) { return c === ' ' ? ' ' : '<i style="--k:' + k + '">' + esc(c) + '</i>'; }).join('');
    var intro = '<div class="intro" aria-hidden="true"><div class="ib"><div class="il">' + (d.lg ? '<img src="' + esc(d.lg) + '" alt="">' : brandMark(P, d)) + '</div><div class="in2">' + introNome + '</div><div class="ibar"></div></div></div>';
    var hz = hero.lastIndexOf('</header>'); if (hz > 0) hero = hero.slice(0, hz) + '<div class="aur"><b></b><b></b><b></b></div>' + hero.slice(hz);
    var body = intro + '<div class="grain"></div><div class="cur"></div><div class="cur2"></div><a class="skip" href="#servicos">Pular para o conteúdo</a><div class="prog"></div><nav class="nav" aria-label="Principal"><div class="wrap"><a class="logo" href="#">' + monoHtml + '<span>' + esc(d.n) + '</span></a><div class="links">' +
      nav.filter(function (x) { return x[0] !== 'avaliacoes' || d.r; }).map(function (x) { return '<a href="#' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '</div>' + btnWA('WhatsApp', 'sm') +
      '<button class="burger" aria-label="Menu"><i></i><i></i></button></div></nav>' +
      '<div class="mnav">' + nav.map(function (x) { return '<a href="#' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '<div style="margin-top:20px">' + btnWA() + '</div></div>' +
      '<main>' + hero + marquee + services + (r() > .5 ? perks + about : about + perks) + gallery + reviews + igFeed + band + contact + faq + '</main>' + footer +
      '<a class="fwa" href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '<span>Fale com a gente</span></a>' + pv + '<div class="lb"><img alt=""></div>';

    var title = d.n + ' — ' + (d.c || '') + (P.ci ? ' em ' + P.ci : '');
    var desc = P.sub;
    var ld = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.n, telephone: d.t || undefined, address: d.a || undefined, image: ph[0], url: opts.url || undefined };
    if (d.r) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: d.r, reviewCount: d.u || 1 };

    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '">' + (opts.exported ? '' : '<meta name="robots" content="noindex">') +
      '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '"><meta property="og:image" content="' + esc(ph[0]) + '"><meta name="theme-color" content="' + P.pal.bg + '">' + favicon(P, d) +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + P.font.q + '&display=swap">' +
      '<style>' + css(P) + '.map iframe{--mapf:' + (P.dark ? 'grayscale(.4) invert(.9) hue-rotate(180deg)' : 'grayscale(.2)') + '}' +
      '.igf-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:28px}.igf-top .btn svg{width:18px;height:18px}' +
      '.igf-g{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.igf-g a{display:block;aspect-ratio:1;overflow:hidden;border-radius:calc(var(--r)*.6)}' +
      '.igf-g img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.8,.2,1),filter .4s}.igf-g a:hover img{transform:scale(1.07);filter:saturate(1.15)}' +
      '@media(max-width:760px){.igf-g{grid-template-columns:repeat(3,1fr)!important}}</style>' +
      '<noscript><style>[data-r]{opacity:1!important;transform:none!important;clip-path:none!important}.w{transform:none!important}</style></noscript>' +
      '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script></head><body>' + body +
      '<script>(' + boot.toString() + ')()</script></body></html>';
  }

  /* ---------- runtime das animações (autocontido: vai junto no site exportado) ---------- */
  function boot() {
    var q = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    /* foto real ainda não publicada (ou fora do ar): troca por uma do banco, sem buraco no layout */
    var reserva = []; try { reserva = JSON.parse(document.body.getAttribute('data-lss') || '[]'); } catch (e) { /* sem reserva */ } var ri = 0;
    q('img').forEach(function (im) {
      if (im.closest('.mono') || im.closest('.seal')) return;
      im.addEventListener('error', function () { if (!im.dataset.rv && reserva.length) { im.dataset.rv = 1; im.src = reserva[ri++ % reserva.length]; } });
    });
    /* cor da marca: tira a cor dominante do logo real e usa como destaque do site (só logo do mesmo endereço) */
    (function () {
      var lg = document.querySelector('.mono img'); if (!lg || !document.body.hasAttribute('data-lso')) return;
      var usa = function () {
        try {
          var c = document.createElement('canvas'), s = 48; c.width = c.height = s; var x = c.getContext('2d');
          x.drawImage(lg, 0, 0, s, s); var px = x.getImageData(0, 0, s, s).data, best = null, cont = {};
          for (var i = 0; i < px.length; i += 4) {
            if (px[i + 3] < 200) continue;
            var r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
            if (sat < .38 || mx < 70) continue; // ignora preto, branco e cinza
            var k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); cont[k] = (cont[k] || { n: 0, r: 0, g: 0, b: 0 }); cont[k].n++; cont[k].r += r; cont[k].g += g; cont[k].b += b;
          }
          for (var kk in cont) if (!best || cont[kk].n > best.n) best = cont[kk];
          if (!best || best.n < 40) return; // logo sem cor marcante: mantém a paleta do nicho
          var R = Math.round(best.r / best.n), G = Math.round(best.g / best.n), B = Math.round(best.b / best.n);
          var L = (.2126 * R + .7152 * G + .0722 * B) / 255, st = document.documentElement.style;
          st.setProperty('--ac', 'rgb(' + R + ',' + G + ',' + B + ')'); st.setProperty('--acs', 'rgba(' + R + ',' + G + ',' + B + ',.14)'); st.setProperty('--on', L > .55 ? '#111111' : '#ffffff');
        } catch (e) { /* logo de outro endereço: sem leitura de pixels */ }
      };
      if (lg.complete && lg.naturalWidth) usa(); else lg.addEventListener('load', usa);
    })();
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nav = document.querySelector('.nav'), bar = document.querySelector('.prog'), px = q('[data-px]'), tick = false;
    var pend = q('[data-r],[data-count]');
    function reveal() {
      var lim = innerHeight * .94;
      pend = pend.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < lim && r.bottom > 0) { el.classList.add('in'); if (el.dataset.count != null) count(el); return false; }
        return true;
      });
    }
    function frame() {
      tick = false; reveal(); var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      if (nav) nav.classList.toggle('on', y > 40);
      if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
      if (!reduce) px.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; var c = r.top + r.height / 2 - innerHeight / 2; el.style.transform = 'translate3d(0,' + (-c * parseFloat(el.dataset.px)).toFixed(1) + 'px,0) scale(1.15)'; });
    }
    function count(el) {
      var to = parseFloat(el.dataset.count), dec = (String(el.dataset.count).split('.')[1] || '').length, t0 = Date.now();
      var st = function () { var p = Math.min(1, (Date.now() - t0) / 1600), e = 1 - Math.pow(1 - p, 4); el.textContent = (to * e).toFixed(dec).replace('.', ','); if (p < 1) setTimeout(st, 16); };
      st();
    }
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', frame);
    frame(); setTimeout(frame, 300);
    q('.glow').forEach(function (c) { c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }); });
    var b = document.querySelector('.burger'); if (b) b.addEventListener('click', function () { document.body.classList.toggle('menu'); });
    q('.mnav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu'); }); });
    var lb = document.querySelector('.lb');
    q('.gal figure').forEach(function (f) { f.addEventListener('click', function () { lb.querySelector('img').src = f.querySelector('img').src; lb.classList.add('on'); }); });
    if (lb) lb.addEventListener('click', function () { lb.classList.remove('on'); });
    /* ícone do site do próprio negócio: só usa se tiver resolução boa */
    q('img[data-fv]').forEach(function (img) {
      var ok = function () { if (img.naturalWidth >= 96) img.parentNode.classList.add('has-img'); else img.remove(); };
      if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = function () { img.remove(); }; }
    });
    /* "Aberto agora" calculado na hora, a partir dos horários reais do Google */
    var DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    q('[data-open]').forEach(function (el) {
      try {
        var h = JSON.parse(el.dataset.open), now = new Date(), day = DAYS[now.getDay()];
        var line = h.filter(function (x) { return x.toLowerCase().indexOf(day) === 0; })[0]; if (!line) return;
        var rest = line.slice(line.indexOf(':') + 1).toLowerCase(), on = false;
        if (/24 horas/.test(rest)) on = true;
        else if (!/fechado/.test(rest)) {
          var mins = now.getHours() * 60 + now.getMinutes(), re = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/g, m;
          while ((m = re.exec(rest))) { var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; if (b <= a) b += 1440; if (mins >= a && mins < b) on = true; }
        }
        el.textContent = on ? 'Aberto agora' : 'Fechado agora'; el.classList.add(on ? 'is-on' : 'is-off');
      } catch (e) { /* sem horário */ }
    });
    var fw = document.querySelector('.fwa'); if (fw) { setTimeout(function () { fw.classList.add('hint'); }, 4000); setTimeout(function () { fw.classList.remove('hint'); }, 9000); }
    setTimeout(function () { document.body.classList.add('ready'); }, 60);
    /* ---- motion graphics ---- */
    var intro = document.querySelector('.intro');
    if (intro) {
      var visto = false; try { visto = sessionStorage.getItem('lsi') === location.pathname + location.search; sessionStorage.setItem('lsi', location.pathname + location.search); } catch (e) { /* sem storage */ }
      if (reduce || visto) intro.remove(); else { document.documentElement.style.overflow = 'hidden'; setTimeout(function () { intro.classList.add('out'); document.documentElement.style.overflow = ''; frame(); }, 1900); setTimeout(function () { intro.remove(); }, 3100); }
    }
    /* títulos das seções entram letra a letra */
    q('.sh .disp').forEach(function (h) {
      var k = 0; h.innerHTML = h.textContent.split(' ').map(function (w) { return '<span class="cw">' + w.split('').map(function (c) { return '<span class="ch" style="--k:' + (k++) + '">' + c.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join('') + '</span>'; }).join(' ');
    });
    var fino = window.matchMedia && matchMedia('(pointer:fine)').matches;
    if (fino && !reduce) {
      /* cursor com rastro */
      var c1 = document.querySelector('.cur'), c2 = document.querySelector('.cur2'), mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
      addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; document.body.classList.add('cv'); var a = e.target.closest && e.target.closest('a,button,summary,figure'); document.body.classList.toggle('ch', !!a); }, { passive: true });
      document.addEventListener('pointerleave', function () { document.body.classList.remove('cv'); });
      (function loop() { rx += (mx - rx) * .16; ry += (my - ry) * .16; if (c1) c1.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; if (c2) c2.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)'; requestAnimationFrame(loop); })();
      /* botões magnéticos */
      q('.btn').forEach(function (bt) {
        bt.addEventListener('pointermove', function (e) { var r = bt.getBoundingClientRect(); bt.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px)'; });
        bt.addEventListener('pointerleave', function () { bt.style.transform = ''; });
      });
      /* cartões e fotos com inclinação 3D */
      q('.glow,.gal figure,.rv,.about figure').forEach(function (el) {
        el.classList.add('tilt');
        el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = 'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateZ(0)'; });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
    /* topo some suavemente ao rolar; faixa de texto inclina com a velocidade */
    var hw = document.querySelector('.hero .wrap'), mqs = q('.mq'), ly = scrollY, sk = 0;
    if (!reduce) (function loop2() {
      var y = scrollY, v = y - ly; ly = y; sk += (Math.max(-12, Math.min(12, v * .35)) - sk) * .12;
      if (hw && y < innerHeight * 1.2) { var p = y / innerHeight; hw.style.opacity = Math.max(0, 1 - p * 1.3).toFixed(3); hw.style.transform = 'translate3d(0,' + (p * 90).toFixed(1) + 'px,0)'; }
      mqs.forEach(function (m) { m.style.transform = 'skewX(' + (-sk).toFixed(2) + 'deg)'; });
      requestAnimationFrame(loop2);
    })();
  }

  /* imagens usadas (para embutir no site efetivado) */
  function images(d) { var P = plan(d); return P.photos.slice(0, 6); }

  return { page: page, boot: boot, plan: plan, DIRS: DIRS, NICHE_DIRS: NICHE_DIRS, nicheOf: nicheOf, images: images, NICHES: LS_NICHES };
})();
