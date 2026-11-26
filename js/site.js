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
  var stars = function (n) { var s = ''; for (var i = 0; i < 5; i++) s += '<i class="' + (i < Math.round(n || 5) ? 'on' : '') + '">' + ICON.star + '</i>'; return '<span class="stars">' + s + '</span>'; };

  /* ---------- plano: escolhas determinísticas por negócio ---------- */
  function cleanName(n) { return String(n || '').split(/\s+[|–—-]\s+/)[0].trim() || String(n || ''); }

  function plan(d) {
    var nk = d.k || nicheOf(d.c); var N = LS_NICHES[nk];
    var r = rng(hash(cleanName(d.n) + '|' + (d.v || 0)));
    var ci = String(d.ci || '').split(',')[0].trim();
    var fill = function (s) { return String(s).replace(/\{n\}/g, d.n || '').replace(/\{ci\}/g, ci || 'sua cidade'); };
    var pal = Object.assign({}, N.pal[(d.p != null ? d.p : Math.floor(r() * N.pal.length)) % N.pal.length]);
    if (d.ac) pal.ac = d.ac;
    var font = LS_FONTS[d.f != null ? d.f : pick(r, N.fonts)];
    var stock = shuffle(r, N.img).map(function (id) { return U(id); });
    var photos = (d.ph || []).concat(stock);
    var svc = (d.sv && d.sv.length ? d.sv : shuffle(r, N.svc).slice(0, r() > .5 ? 6 : 4));
    return {
      nk: nk, N: N, r: r, ci: ci, fill: fill, pal: pal, font: font, photos: photos, stock: stock,
      dark: lum(pal.bg) < .35,
      hero: d.hl2 || pick(r, ['full', 'split', 'center', 'editorial']),
      svcL: pick(r, ['list', 'cards', 'grid']),
      rad: pick(r, [0, 6, 16, 26]),
      btn: pick(r, ['sq', 'pill']),
      aboutL: r() > .5,
      tilt: r() > .55,
      kick: fill(pick(r, N.kick)),
      head: fill(d.hl || pick(r, N.heads)),
      sub: fill(d.sub || pick(r, N.subs)),
      svc: svc,
      perks: shuffle(r, N.perks).slice(0, 4),
      aboutT: fill(pick(r, N.aboutT)),
      about: (d.ab ? [d.ab] : N.about).map(fill),
      ctaT: fill(pick(r, N.ctaT)),
      marq: shuffle(r, N.marq),
    };
  }

  /* ---------- CSS ---------- */
  function css(P) {
    var p = P.pal, f = P.font, dark = P.dark, onAc = lum(p.ac) > .45 ? '#111111' : '#ffffff';
    return ':root{--bg:' + p.bg + ';--fg:' + p.fg + ';--ac:' + p.ac + ';--on:' + onAc + ';--mut:' + rgba(p.fg, .66) + ';--line:' + rgba(p.fg, .12) +
      ';--card:' + (dark ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.035)') + ';--card2:' + (dark ? 'rgba(255,255,255,.08)' : '#ffffff') + ';--acs:' + rgba(p.ac, .14) +
      ';--fd:"' + f.d + '",serif;--fb:"' + f.b + '",system-ui,sans-serif;--dw:' + f.w + ';--tt:' + (f.up ? 'uppercase' : 'none') + ';--dls:' + f.ls + ';--dlh:' + f.lh + ';--dsc:' + (f.sc || 1) +
      ';--r:' + P.rad + 'px;--rb:' + (P.btn === 'pill' ? '999px' : Math.min(P.rad, 10) + 'px') + ';--shade:' + rgba(p.bg, .82) + '}' + BASE_CSS;
  }

  var BASE_CSS = [
    '*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}',
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
    '.btn{display:inline-flex;align-items:center;gap:10px;padding:17px 28px;border-radius:var(--rb);font-weight:600;font-size:14px;letter-spacing:.12em;text-transform:uppercase;border:1px solid transparent;position:relative;overflow:hidden;isolation:isolate;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}',
    '.btn svg{width:18px;height:18px}',
    '.btn:hover{transform:translateY(-3px)}',
    '.btn-ac{background:var(--ac);color:var(--on);box-shadow:0 12px 32px -12px var(--ac)}',
    '.btn-ac:before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%);transform:translateX(-120%);transition:transform .8s;z-index:-1}',
    '.btn-ac:hover:before{transform:translateX(120%)}',
    '.btn-gh{border-color:var(--line);color:var(--fg);background:transparent}.btn-gh:hover{border-color:var(--fg)}',
    '.btn.sm{padding:11px 18px;font-size:12px}',
    /* hero */
    '.hero{min-height:100svh;display:flex;align-items:center;position:relative;overflow:hidden;padding:130px 0 90px}',
    '.hero h1{font-size:calc(clamp(46px,8.4vw,128px)*var(--dsc));margin:6px 0 28px;max-width:14ch}',
    '.wl{display:inline-block;overflow:hidden;vertical-align:top;padding:.16em .04em .08em;margin:-.16em -.04em -.08em}',
    '.w{display:inline-block;transform:translateY(105%) rotate(4deg);transition:transform 1.1s cubic-bezier(.2,.8,.2,1) calc(.15s + var(--i)*.07s)}',
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
    '.gal figure:nth-child(1){grid-column:span 2;grid-row:span 2}.gal figure:nth-child(4){grid-row:span 2}',
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
    '[data-r]{opacity:0;transform:translateY(34px);transition:opacity 1s cubic-bezier(.2,.75,.2,1) var(--d,0s),transform 1s cubic-bezier(.2,.75,.2,1) var(--d,0s)}',
    '[data-r="clip"]{opacity:1;transform:none;clip-path:inset(100% 0 0 0);transition:clip-path 1.3s cubic-bezier(.7,0,.2,1) var(--d,0s)}',
    '[data-r="scale"]{transform:scale(.92)}',
    '[data-r].in{opacity:1;transform:none;clip-path:inset(0 0 0 0)}',
    '@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}[data-r]{opacity:1;transform:none;clip-path:none}.w{transform:none}}',
    /* responsivo */
    '@media (max-width:960px){.links,.nav .btn{display:none}.burger{display:block}.h-split .wrap,.ed-row,.about,.contact{grid-template-columns:1fr}.col{height:440px;margin-top:20px}.badge.b1{left:0}',
    '.perks{grid-template-columns:1fr 1fr}.s-list .row{grid-template-columns:44px 1fr auto;gap:14px}.s-list .row p{grid-column:2/4;grid-row:2}.about.rev figure{order:0}.gal{grid-template-columns:1fr 1fr}.gal figure:nth-child(4){grid-row:span 1}}',
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
    var chip = d.r ? '<div class="chip" data-r style="--d:.9s">' + stars(d.r) + '<span><b>' + rating + '</b> no Google · ' + (d.u || 0) + ' avaliações</span></div>' : '';
    var sh = function (eyb, title, center) { return '<div class="sh"' + (center ? ' style="margin-inline:auto;text-align:center"' : '') + ' data-r><span class="eyb">' + esc(eyb) + '</span><h2 class="disp">' + esc(title) + '</h2></div>'; };
    var nav = [['servicos', N.svcT], ['sobre', 'Sobre'], ['galeria', 'Galeria'], ['avaliacoes', 'Avaliações'], ['contato', 'Contato']];

    /* hero */
    var hero;
    if (P.hero === 'full') {
      hero = '<header class="hero h-full"><div class="h-bg" data-px=".1"><img src="' + ph[0] + '" alt="' + esc(d.n) + '" fetchpriority="high"></div><div class="h-sh"></div>' +
        '<div class="wrap"><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div><a class="scroll" href="#servicos">Rolar</a></header>';
    } else if (P.hero === 'split') {
      hero = '<header class="hero h-split"><div class="wrap"><div><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div>' +
        '<div class="col" data-r="scale" style="--d:.3s"><figure class="f1"><img src="' + ph[0] + '" alt="" data-px=".06"></figure><figure class="f2"><img src="' + ph[1] + '" alt="" data-px="-.05"></figure>' +
        (d.r ? '<div class="badge b1">' + ICON.star + '<div><b>' + rating + '</b><br><small>' + (d.u || 0) + ' avaliações</small></div></div>' : '') +
        '<div class="badge b2"><span class="dot"></span>Atendimento pelo WhatsApp</div></div></div></header>';
    } else if (P.hero === 'center') {
      var strip = ph.slice(0, 6).map(function (u) { return '<figure><img src="' + u + '" alt=""></figure>'; }).join('');
      hero = '<header class="hero h-center"><div class="glow"></div><div class="wrap"><span class="eyb" data-r>' + esc(P.kick) + '</span><h1 class="disp">' + words(P.head) + '</h1><p class="lead" data-r style="--d:.6s">' + esc(P.sub) + '</p>' +
        '<div class="cta" data-r style="--d:.75s">' + btnWA() + btnSec + '</div>' + chip + '</div><div class="strip" data-r style="--d:.9s"><div class="tr">' + strip + strip + '</div></div></header>';
    } else {
      hero = '<header class="hero h-ed"><div class="wrap"><div class="ed-top" data-r><span class="eyb" style="margin:0">' + esc(P.kick) + '</span>' + (d.r ? '<span class="chip" style="margin:0">' + stars(d.r) + '<span><b>' + rating + '</b> · ' + (d.u || 0) + ' avaliações</span></span>' : '') + '</div>' +
        '<h1 class="disp">' + words(d.n) + '</h1><div class="ed-row"><figure data-r="clip" style="--d:.4s"><img src="' + ph[0] + '" alt="" data-px=".08"></figure>' +
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
    if (d.r) stats = '<div class="stats" data-r><div><b data-count="' + d.r + '">0</b><span>Nota no Google</span></div><div><b data-count="' + (d.u || 0) + '">0</b><span>Avaliações</span></div><div><b>100%</b><span>Atendimento direto</span></div></div>';
    var about = '<section id="sobre"><div class="wrap about' + (P.aboutL ? ' rev' : '') + '"><figure data-r="clip"><img src="' + ph[1 % ph.length] + '" alt="" loading="lazy" data-px=".07"></figure>' +
      '<div><div data-r><span class="eyb">Sobre</span><h2 class="disp">' + esc(P.aboutT) + '</h2></div>' + P.about.map(function (t, i) { return '<p data-r style="--d:' + (.1 + i * .1) + 's">' + esc(t) + '</p>'; }).join('') + stats +
      '<div class="cta" data-r>' + btnWA(N.short, 'sm') + '</div></div></div></section>';

    /* galeria */
    var gp = ph.slice(0, 6);
    var gallery = '<section id="galeria" class="alt"><div class="wrap">' + sh('Galeria', 'Ambiente e rotina') + '<div class="gal">' +
      gp.map(function (u, i) { return '<figure data-r="clip" style="--d:' + (i % 3) * .12 + 's"><img src="' + u + '" alt="' + esc(d.n) + '" loading="lazy"></figure>'; }).join('') + '</div>' +
      ((d.ph && d.ph.length) ? '<p class="credit">Algumas fotos: Google Maps</p>' : '') + '</div></section>';

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
      '<div class="it">' + ICON.clock + '<div style="flex:1"><h4>Horário</h4>' + hours + '</div></div>' +
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
    var footer = '<footer><div class="wrap ft"><div><div class="big">' + esc(d.n) + '</div><small>' + esc(d.c || '') + (P.ci ? ' em ' + esc(P.ci) : '') + ' · © ' + new Date().getFullYear() + '</small></div>' + cr + '</div></footer>';

    var pv = (!opts.exported && (d.s || d.w)) ? '<div class="pv">✨ Prévia' + (d.s ? ' por ' + esc(d.s) : '') + (d.w ? ' <a href="https://wa.me/' + esc(d.w) + '?text=' + encodeURIComponent('Oi! Vi a prévia do site da ' + d.n + ' e quero colocar no ar.') + '" target="_blank" rel="noopener">Quero no ar →</a>' : '') + '</div>' : '';

    var body = '<div class="prog"></div><nav class="nav"><div class="wrap"><a class="logo" href="#">' + esc(d.n) + '</a><div class="links">' +
      nav.filter(function (x) { return x[0] !== 'avaliacoes' || d.r; }).map(function (x) { return '<a href="#' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '</div>' + btnWA('WhatsApp', 'sm') +
      '<button class="burger" aria-label="Menu"><i></i><i></i></button></div></nav>' +
      '<div class="mnav">' + nav.map(function (x) { return '<a href="#' + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') + '<div style="margin-top:20px">' + btnWA() + '</div></div>' +
      '<main>' + hero + marquee + services + (r() > .5 ? perks + about : about + perks) + gallery + reviews + band + contact + faq + '</main>' + footer +
      '<a class="fwa" href="' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '<span>Fale com a gente 👋</span></a>' + pv + '<div class="lb"><img alt=""></div>';

    var title = d.n + ' — ' + (d.c || '') + (P.ci ? ' em ' + P.ci : '');
    var desc = P.sub;
    var ld = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.n, telephone: d.t || undefined, address: d.a || undefined, image: ph[0], url: opts.url || undefined };
    if (d.r) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: d.r, reviewCount: d.u || 1 };

    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '">' + (opts.exported ? '' : '<meta name="robots" content="noindex">') +
      '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '"><meta property="og:image" content="' + esc(ph[0]) + '"><meta name="theme-color" content="' + P.pal.bg + '">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + P.font.q + '&display=swap">' +
      '<style>' + css(P) + '.map iframe{--mapf:' + (P.dark ? 'grayscale(.4) invert(.9) hue-rotate(180deg)' : 'grayscale(.2)') + '}</style>' +
      '<noscript><style>[data-r]{opacity:1!important;transform:none!important;clip-path:none!important}.w{transform:none!important}</style></noscript>' +
      '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script></head><body>' + body +
      '<script>(' + boot.toString() + ')()</script></body></html>';
  }

  /* ---------- runtime das animações (autocontido: vai junto no site exportado) ---------- */
  function boot() {
    var q = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
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
    var fw = document.querySelector('.fwa'); if (fw) { setTimeout(function () { fw.classList.add('hint'); }, 4000); setTimeout(function () { fw.classList.remove('hint'); }, 9000); }
    setTimeout(function () { document.body.classList.add('ready'); }, 60);
  }

  /* imagens usadas (para embutir no site efetivado) */
  function images(d) { var P = plan(d); return P.photos.slice(0, 6); }

  return { page: page, boot: boot, plan: plan, nicheOf: nicheOf, images: images, NICHES: LS_NICHES };
})();
