/* Google Places (New): mineração de leads + fotos/avaliações reais — mesma lógica do app */
import { CFG } from './config.js';

const SOCIAL = /instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp|ifood|linkbio|bio\.link|beacons\.ai|taplink|tiktok\.com|goo\.gl|business\.site|sites\.google/i;
const siteTipo = (u) => (!u ? 'sem' : SOCIAL.test(u) ? 'social' : 'tem');

export function phoneInfo(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return { digits: d, mobile: d.length === 11 && d[2] === '9', wa: d.length >= 10 ? '55' + d : '' };
}

function score(l) {
  let s = 0;
  s += l.siteTipo === 'sem' ? 45 : l.siteTipo === 'social' ? 35 : 5;
  s += l.rating >= 4.5 ? 15 : l.rating >= 4 ? 8 : 0;
  s += l.reviews >= 100 ? 20 : l.reviews >= 30 ? 12 : l.reviews >= 10 ? 6 : 0;
  s += l.mobile ? 20 : l.telDigits ? 6 : -25;
  s = Math.max(0, Math.min(100, s));
  return { score: s, temp: s >= 70 ? 'quente' : s >= 45 ? 'morno' : 'frio' };
}

const FIELDS = ['places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus', 'nextPageToken'].join(',');

/* lead de fora: acha o negócio pelo nome no Google (1º resultado) */
export async function buscarNegocio(texto, cidade) {
  const [p] = await buscar(null, cidade, 1, `${texto} ${cidade}`);
  if (p) p.categoria = p.tipoGoogle || 'Negócio local';
  return p || null;
}

export { phoneInfo as telefoneInfo, siteTipo as tipoDeSite, score as pontuar };

export async function buscar(categoria, cidade, max = 60, consulta) {
  const out = []; let pageToken;
  while (out.length < max) {
    const body = { textQuery: consulta || `${categoria} em ${cidade}`, languageCode: 'pt-BR', regionCode: 'BR', pageSize: Math.min(20, max) };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': CFG.placesKey, 'X-Goog-FieldMask': FIELDS, Referer: CFG.demoBase },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error?.message || `Places HTTP ${r.status}`);
    out.push(...(j.places || []).filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY'));
    pageToken = j.nextPageToken; if (!pageToken) break;
    await new Promise((res) => setTimeout(res, 400));
  }
  return out.map((p) => {
    const ph = phoneInfo(p.nationalPhoneNumber);
    const l = {
      id: p.id, nome: p.displayName?.text || 'Sem nome', categoria, tipoGoogle: p.primaryTypeDisplayName?.text || '', cidade,
      telefone: p.nationalPhoneNumber || '', telDigits: ph.digits, wa: ph.wa, mobile: ph.mobile,
      endereco: p.formattedAddress || '', rating: p.rating || 0, reviews: p.userRatingCount || 0,
      site: p.websiteUri || '', siteTipo: siteTipo(p.websiteUri), maps: p.googleMapsUri || '',
    };
    return Object.assign(l, score(l));
  });
}

/* fotos, avaliações, horários e descrição do próprio negócio */
export async function enriquecer(l) {
  if (l.enriched) return l;
  const h = { 'X-Goog-Api-Key': CFG.placesKey, 'X-Goog-FieldMask': 'photos,reviews,regularOpeningHours.weekdayDescriptions,editorialSummary', Referer: CFG.demoBase };
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(l.id)}?languageCode=pt-BR`, { headers: h });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'Falha nos detalhes');
  const avs = (j.reviews || []).filter((v) => v.rating >= 4 && v.text?.text).slice(0, 3)
    .map((v) => ({ a: v.authorAttribution?.displayName || 'Cliente', r: v.rating, t: v.text.text.length > 260 ? v.text.text.slice(0, 257).trim() + '…' : v.text.text }));
  if (avs.length) l.avaliacoes = avs; // não apaga as avaliações reais coletadas no banco de mídia
  if (j.regularOpeningHours?.weekdayDescriptions?.length) l.horarios = j.regularOpeningHours.weekdayDescriptions;
  if (j.editorialSummary?.text && !l.resumo) l.resumo = j.editorialSummary.text;
  const nomes = (j.photos || []).slice(0, 5).map((p) => p.name); // 5 fotos próprias: bom visual gastando menos cota
  const fotos = await Promise.all(nomes.map((n) =>
    fetch(`https://places.googleapis.com/v1/${n}/media?maxWidthPx=1800&skipHttpRedirect=true&key=${encodeURIComponent(CFG.placesKey)}`, { headers: { Referer: CFG.demoBase } })
      .then((x) => x.json()).then((x) => x.photoUri || null).catch(() => null)));
  if (fotos.some(Boolean)) l.fotos = fotos.filter(Boolean); // idem para as fotos
  l.enriched = new Date().toISOString();
  return l;
}
