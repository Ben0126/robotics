// Resolve canonical DOIs via Crossref by bibliographic title, then liveness-check.
// arXiv-only items fall back to a stable arXiv URL and are HEAD-verified.
const fs = require('fs');
const MAILTO = 'benzyeh@gmail.com';

// title, optional arxiv fallback id
const ITEMS = [
  ['ChatGPT for Robotics: Design Principles and Model Abilities', '2306.17582'],
  ['Do As I Can, Not As I Say: Grounding Language in Robotic Affordances', '2204.01691'],
  ['Code as Policies: Language Model Programs for Embodied Control', '2209.07753'],
  ['RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control', '2307.15818'],
  ['RT-1: Robotics Transformer for Real-World Control at Scale', '2212.06817'],
  ['OpenVLA: An Open-Source Vision-Language-Action Model', '2406.09246'],
  ['Vision-Language-Action Models for Robotics: A Review Towards Real-World Applications', null],
  ['Diffusion Policy: Visuomotor Policy Learning via Action Diffusion', '2303.04137'],
  ['Champion-level drone racing using deep reinforcement learning', null],
  ['Learning high-speed flight in the wild', null],
  ['OmniDrones: An Efficient and Flexible Platform for Reinforcement Learning in Drone Control', '2309.12825'],
  ['Aerial Gym Simulator: A Framework for Highly Parallelized Simulation of Aerial Robots', null],
  ['AerialVLN: Vision-and-Language Navigation for UAVs', '2308.06735'],
  ['CityNavAgent: Aerial Vision-and-Language Navigation with Hierarchical Semantic Planning and Global Memory', null],
  ['OpenFly: A Versatile Toolchain and Large-scale Benchmark for Aerial Vision-Language Navigation', '2502.18041'],
  ['LLVM-drone: A synergistic framework integrating large language models and vision models for visual tasks in unmanned aerial vehicles', null],
  ['ASMA: An Adaptive Safety Margin Algorithm for Vision-Language Drone Navigation via Scene-Aware Control Barrier Functions', null],
  ['Foundation models in robotics: Applications, challenges, and the future', null],
  ['Crossing the Reality Gap: A Survey on Sim-to-Real Transferability of Robot Controllers in Reinforcement Learning', null],
  ['A Benchmark Comparison of Learned Control Policies for Agile Quadrotor Flight', null],
];

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
function sim(a, b) {
  const A = new Set(norm(a).split(' ')), B = new Set(norm(b).split(' '));
  let inter = 0; for (const w of A) if (B.has(w)) inter++;
  return inter / Math.max(A.size, 1);
}

async function crossref(title) {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(title)}&rows=5&mailto=${MAILTO}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': `dsw/1.0 (mailto:${MAILTO})` } });
    const j = await r.json();
    let best = null, bestS = 0;
    for (const it of (j.message?.items || [])) {
      const t = (it.title && it.title[0]) || '';
      const s = sim(title, t);
      if (s > bestS) { bestS = s; best = it; }
    }
    if (best && bestS >= 0.6) {
      return {
        doi: best.DOI,
        crossTitle: best.title[0],
        year: (best.issued?.['date-parts']?.[0]?.[0]) || (best.published?.['date-parts']?.[0]?.[0]),
        venue: (best['container-title'] && best['container-title'][0]) || best.publisher || '',
        type: best.type, score: +bestS.toFixed(2),
      };
    }
    return null;
  } catch (e) { return { error: String(e) }; }
}

async function head(url) {
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (r.status >= 400 || r.status === 405) r = await fetch(url, { method: 'GET', redirect: 'follow' });
    return r.status;
  } catch (e) { return 'ERR:' + e.message; }
}

(async () => {
  const out = [];
  for (const [title, arx] of ITEMS) {
    const cr = await crossref(title);
    let doi = cr && !cr.error ? cr.doi : null;
    let primaryUrl = doi ? `https://doi.org/${doi}` : (arx ? `https://arxiv.org/abs/${arx}` : null);
    const status = primaryUrl ? await head(primaryUrl) : 'NO-URL';
    out.push({
      title, doi: doi || (arx ? `arXiv:${arx}` : 'NONE'),
      url: primaryUrl, status,
      venue: cr?.venue || (arx ? 'arXiv preprint' : ''), year: cr?.year || '', match: cr?.score || (arx ? 'arxiv-fallback' : 'none'),
    });
    console.log(`[${status}] ${doi || (arx ? 'arXiv:' + arx : 'NONE')}  <-  ${title.slice(0, 55)}`);
    await new Promise(r => setTimeout(r, 800));
  }
  fs.writeFileSync('research_output/bib_verified.json', JSON.stringify(out, null, 2));
  const dead = out.filter(x => !(x.status === 200 || x.status === 302 || x.status === 301));
  console.log(`\nResolved ${out.length} items. Non-200: ${dead.length}`);
  dead.forEach(d => console.log(`  ! ${d.status} ${d.url} (${d.title.slice(0,45)})`));
})();
