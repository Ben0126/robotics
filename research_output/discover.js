// Multi-source discovery: OpenAlex + Semantic Scholar (public APIs).
// Strictly excludes MDPI (DOI 10.3390 / host "mdpi"). Decodes OpenAlex inverted abstracts.
const fs = require('fs');
const MAILTO = 'benzyeh@gmail.com';

const QUERIES = [
  'large language model UAV drone task planning control',
  'vision language action model robot end-to-end control',
  'vision and language navigation UAV aerial drone',
  'diffusion policy robot visuomotor learning',
  'sim-to-real reinforcement learning quadrotor agile flight',
];

const isMDPI = (doi, host) =>
  (doi && doi.toLowerCase().includes('10.3390')) ||
  (host && host.toLowerCase().includes('mdpi'));

function decodeInverted(inv) {
  if (!inv) return '';
  const words = [];
  for (const [w, idxs] of Object.entries(inv)) for (const i of idxs) words[i] = w;
  return words.join(' ');
}

async function openalex(q) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}` +
    `&filter=from_publication_date:2021-01-01,type:article|article&per-page=12&mailto=${MAILTO}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    return (j.results || []).map(w => ({
      src: 'OpenAlex',
      title: w.title,
      year: w.publication_year,
      doi: (w.doi || '').replace('https://doi.org/', ''),
      venue: w.primary_location?.source?.display_name || '',
      host: w.primary_location?.source?.host_organization_name || '',
      cites: w.cited_by_count,
      oa: w.open_access?.is_oa || false,
      oa_url: w.best_oa_location?.pdf_url || w.best_oa_location?.landing_page_url || '',
      abstract: decodeInverted(w.abstract_inverted_index).slice(0, 600),
    }));
  } catch (e) { return [{ src: 'OpenAlex', error: String(e), q }]; }
}

async function semanticscholar(q) {
  const fields = 'title,year,abstract,externalIds,venue,citationCount,openAccessPdf,publicationVenue';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}` +
    `&year=2021-&limit=12&fields=${fields}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [{ src: 'S2', error: 'HTTP ' + r.status, q }];
    const j = await r.json();
    return (j.data || []).map(p => ({
      src: 'S2',
      title: p.title,
      year: p.year,
      doi: p.externalIds?.DOI || '',
      venue: p.venue || p.publicationVenue?.name || '',
      host: '',
      cites: p.citationCount,
      oa: !!p.openAccessPdf,
      oa_url: p.openAccessPdf?.url || '',
      abstract: (p.abstract || '').slice(0, 600),
    }));
  } catch (e) { return [{ src: 'S2', error: String(e), q }]; }
}

(async () => {
  const all = [];
  for (const q of QUERIES) {
    const [oa, s2] = await Promise.all([openalex(q), semanticscholar(q)]);
    all.push(...oa, ...s2);
    await new Promise(res => setTimeout(res, 1200)); // be polite to rate limits
  }
  const clean = all.filter(x => !x.error && x.title && !isMDPI(x.doi, x.host));
  const dropped = all.filter(x => x.error || isMDPI(x.doi, x.host));
  // de-dup by lowercased title
  const seen = new Set(), uniq = [];
  for (const x of clean) {
    const k = (x.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(k)) { seen.add(k); uniq.push(x); }
  }
  fs.writeFileSync('research_output/discovery.json', JSON.stringify(uniq, null, 2));
  console.log(`OpenAlex+S2 raw=${all.length}  kept(non-MDPI,uniq)=${uniq.length}  dropped=${dropped.length}`);
  console.log('--- top hits (title | year | venue | cites | OA) ---');
  uniq.sort((a, b) => (b.cites || 0) - (a.cites || 0)).slice(0, 25)
    .forEach(x => console.log(`[${x.src}] ${x.title} | ${x.year} | ${x.venue} | ${x.cites ?? '?'} | ${x.oa ? 'OA' : '-'}`));
})();
