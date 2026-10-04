/* ---------- layout tree ----------
   A guillotine tree: each internal node cuts its region in two along a seam {d, e, s}.
   d is the cut axis, e the seam profile, s a user nudge to the area split. */
function targets(sts){
  const med = median(qs.map(q => q.chars + 16));
  return qs.map((q, i) => Math.pow(med / (q.chars + 16), cfg.contrast) * q.emph * sts[i].jit);
}
function weightsOf(sts){
  const f = targets(sts);
  return {f, wts:qs.map((q, i) => (q.chars + 16) * f[i] * f[i])};
}
function randomSeam(rng, d, force){
  if (!force && rng() >= cfg.shaped) return {...FLAT};
  const kinds = SEAM_KINDS[d], k = kinds[(rng() * kinds.length) | 0], sign = rng() < 0.5 ? -1 : 1;
  const a = k === 'ell' ? 0.5 + rng() * 0.4 : 0.18 + rng() * 0.42;
  return {k, a:sign * a, p:0.15 + rng() * 0.5, w:0.2 + rng() * 0.3};
}
function tweakSeam(e, rng){
  const q = {...e}, t = rng();
  if (t < 0.5) q.a = clamp(q.a + (rng() - 0.5) * 0.25, -1, 1);
  else if (t < 0.8) q.p = clamp(q.p + (rng() - 0.5) * 0.2, 0.05, 0.9);
  else q.w = clamp(q.w + (rng() - 0.5) * 0.2, 0.1, 0.6);
  return q;
}
/* box proportions (w/h) a quote can fill with lines between 10 and 45 ems (or the whole quote, if shorter);
   10 ems sits between the typesetter's justified and ragged minimum measures */
/** @param {number} i @returns {[number, number]} */
function aspRange(i){
  const q = qs[i], em = 0.5 * q.chars + (q.author ? 0.21 * q.author.length + 0.4 : 0), lh = 1.2;
  return [Math.min(em, 10) ** 2 / (lh * em), Math.min(em, 45) ** 2 / (lh * em)];
}
const GROUP_RANGE = /** @type {[number, number]} */ ([0.5, 2]);
const offRange = (a, [lo, hi]) => Math.max(0, Math.log(lo / a), Math.log(a / hi));
function buildTree(order, wts, rng, w, h, ctr){
  if (order.length === 1) return {q:order[0], id:ctr.n++};
  const tot = order.reduce((s, i) => s + wts[i], 0), target = 0.3 + rng() * 0.4;
  let k = 1, acc = 0, bestD = Infinity;
  for (let j = 1; j < order.length; j++) {
    acc += wts[order[j - 1]];
    const dd = Math.abs(acc / tot - target);
    if (dd < bestD) { bestD = dd; k = j; }
  }
  const A = order.slice(0, k), B = order.slice(k);
  const r = A.reduce((s, i) => s + wts[i], 0) / tot;
  // cut the way that keeps each child within the proportions it can fill
  const fit = (set, cw, ch) => offRange(cw / ch, set.length === 1 ? aspRange(set[0]) : GROUP_RANGE);
  const bx = Math.max(fit(A, w * r, h), fit(B, w * (1 - r), h)), by = Math.max(fit(A, w, h * r), fit(B, w, h * (1 - r)));
  const d = (rng() < 0.85) === (bx <= by) ? 'x' : 'y';
  const a = d === 'x' ? buildTree(A, wts, rng, w * r, h, ctr) : buildTree(A, wts, rng, w, h * r, ctr);
  const b = d === 'x' ? buildTree(B, wts, rng, w * (1 - r), h, ctr) : buildTree(B, wts, rng, w, h * (1 - r), ctr);
  return {d, a, b, s:0, e:randomSeam(rng, d)};
}
function calcW(n, wts){ return n.q !== undefined ? (n._w = wts[n.q]) : (n._w = calcW(n.a, wts) + calcW(n.b, wts)); }
function collect(n, I, L){ if (n.q !== undefined) { L.push(n); return; } I.push(n); collect(n.a, I, L); collect(n.b, I, L); }
function assignIds(tr){ const L = []; collect(tr, [], L); L.forEach((l, i) => { l.id = i; }); }
function parentsOf(tr){
  const P = new Map();
  (function go(n){ if (n.q !== undefined) return; P.set(n.a, n); P.set(n.b, n); go(n.a); go(n.b); })(tr);
  return P;
}
const leafOf = (tr, q) => { const L = []; collect(tr, [], L); return L.find(l => l.q === q); };
/* the nearest seam on each side of a leaf */
function edgeSeams(tr, leaf){
  const P = parentsOf(tr), out = {};
  for (let cur = leaf, p; (p = P.get(cur)); cur = p) {
    const side = p.d === 'x' ? (cur === p.b ? 'left' : 'right') : (cur === p.b ? 'top' : 'bottom');
    if (!out[side]) out[side] = p;
  }
  return out;
}
/* Round pieces: elliptical bulges on the side seams, spanning just this leaf's height along each seam.
   `lay` is a layout of the current tree, used to find where the leaf sits. */
function roundify(tr, leaf, rng, lay){
  const {left, right} = edgeSeams(tr, leaf);
  const cell = lay.cells.find(c => c.q === leaf.q);
  if ((!left && !right) || !cell) return false;
  const b = regionBox(cell.region), a = 0.75 + rng() * 0.25;
  for (const [nd, sign] of [[left, -1], [right, 1]]) {
    const info = nd && lay.nodes.find(x => x.node === nd);
    if (!info) continue;
    const box = info.G.box, w = clamp(b.h / box.h, 0.05, 1);
    nd.e = {k:'ell', a:sign * a, p:clamp((b.y - box.y) / box.h, 0, 1 - w), w};
  }
  return true;
}
function roundSome(tr, rng, sts, D){
  const L = []; collect(tr, [], L);
  const n = Math.round(cfg.round * L.length * 0.2 + rng() * cfg.round);
  if (!n) return;
  const lay = layTree(tr, sts, D);
  shuffle(L, rng).slice(0, n).forEach(l => roundify(tr, l, rng, lay));
}

/* ---------- laying out and scoring ---------- */
/* seams laid out higher in the tree can pinch pieces made by later cuts. After laying out, any piece
   with a waist gets the seams along its edges damped, and we lay out again. */
function layTree(tr, sts, D){
  const {f, wts} = weightsOf(sts);
  calcW(tr, wts);
  const damp = new Map(), P = parentsOf(tr), leaves = [];
  collect(tr, [], leaves);
  let out;
  for (let pass = 0; pass < 4; pass++) {
    out = layOnce(tr, D, damp);
    let changed = false;
    for (const c of out.cells) {
      if (!hasNeck(c.region)) continue;
      for (let nd = P.get(leaves.find(l => l.q === c.q)); nd; nd = P.get(nd)) {
        if (!nd.e || nd.e.k === 'flat') continue;
        const k = damp.has(nd) ? damp.get(nd) : 1;
        if (k > 0) { damp.set(nd, pass < 2 ? k * 0.5 : 0); changed = true; }
      }
    }
    if (!changed) break;
  }
  out.f = f;
  return out;
}
function layOnce(tr, D, damp){
  /** @type {LayoutCell[]} */
  const cells = [], nodes = [];
  (function go(node, R){
    if (node.q !== undefined) { cells.push({q:node.q, id:node.id, region:R}); return; }
    const base = node.a._w / (node.a._w + node.b._w);
    const ratio = clamp(base + (node.s || 0), 0.08, 0.92);
    const sp = splitRegion(R, node.d, node.e, ratio, damp.has(node) ? damp.get(node) : 1);
    nodes.push({node, base, ratio, G:sp.G, c:sp.c, total:sp.total});
    go(node.a, sp.a); go(node.b, sp.b);
  })(tr, rectRegion(D.m, D.m, D.W - 2 * D.m, D.H - 2 * D.m));
  return {cells, nodes};
}
/* a leaf reads as round when its side seams bulge outward around its middle by a fair share of its height */
function countRound(tr, nodes, cells){
  const G = new Map(nodes.map(nd => [nd.node, nd.G])), L = [];
  collect(tr, [], L);
  let n = 0;
  for (const c of cells) {
    const {left, right} = edgeSeams(tr, L.find(l => l.q === c.q)), cy = c.box.y + c.box.h / 2;
    const out = (nd, sign) => {
      if (!nd || !nd.e || nd.e.k !== 'ell') return false;
      const g = G.get(nd), y0 = g.box.y + nd.e.p * g.box.h, y1 = y0 + (nd.e.w || 1) * g.box.h;
      return sign * g.A > 0.12 * c.box.h && cy > y0 && cy < y1;
    };
    if ((left || right) && (!left || out(left, -1)) && (!right || out(right, 1))) n++;
  }
  return n;
}
/** @param {TreeNode} tr @param {Style[]} sts @param {Dimensions} D */
function evaluate(tr, sts, D){
  const {cells, nodes, f} = layTree(tr, sts, D), n = cells.length;
  for (const c of cells) { fitCell(c, sts[c.q], D); c.box = regionBox(c.region); }
  const lr = cells.map(c => Math.log(c.s / f[c.q]));
  const mu = lr.reduce((a, b) => a + b, 0) / n;
  const vr = lr.reduce((a, b) => a + (b - mu) ** 2, 0) / n;
  // each piece much smaller than its share costs on its own, so one tiny quote can't hide in an average
  const under = lr.reduce((a, v) => a + Math.max(0, mu - v - 0.25) ** 2, 0);
  const sFloor = D.W * 0.009;
  let left = 0, asp = 0, jb = 0, rag = 0, lastP = 0, wplP = 0, bad = 0, small = 0, same = 0;
  for (const c of cells) {
    left += c.leftover ** 2;
    if (c.box.h > 0 && c.box.w > 0) asp += offRange(c.box.w / c.box.h, aspRange(c.q)) ** 2;
    jb += c.badJ + 12 * Math.max(0, c.maxF - 1) ** 2; rag += c.rag; bad += c.bad;
    if (c.K > 1) lastP += Math.max(0, 0.6 - c.lastFill) ** 2;
    if (c.eff === 'justify' && c.K > 1) wplP += Math.max(0, 3.5 - c.wpl) ** 2;
    else if (c.K > 2) wplP += 2.5 * Math.max(0, 2 - c.wpl) ** 2;
    small += Math.max(0, 1 - c.s / sFloor) ** 2;
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = cells[i], b = cells[j];
    if (sts[a.q].font !== sts[b.q].font) continue;
    if (a.box.x > b.box.x + b.box.w + 1 || b.box.x > a.box.x + a.box.w + 1) continue;
    if (touching(a.region, b.region)) same++;
  }
  const rounds = cfg.round > 0 ? countRound(tr, nodes, cells) : 0;
  const roundP = Math.max(0, Math.round(cfg.round * n * 0.15) - rounds);
  const score = 40 * vr + 15 * under + 1500 * left / n + 30 * asp / n + 14 * jb / n + 8 * rag / n + 10 * lastP / n +
    10 * wplP / n + 500 * bad + 30 * small + 1.5 * same + 4 * roundP;
  return {cells, nodes, score, f, rounds};
}
/* area fraction the first child would get if the seam passed through (px, py) */
function dragFrac(nd, px, py){
  const G = nd.G;
  let c;
  if (G.d === 'x') {
    const i = clamp(Math.floor(py / DY) - G.R.i0, 0, G.R.n - 1);
    c = px - (G.offs[i] || 0);
  } else c = py - seamY(G.e, clamp((px - G.box.x) / (G.box.w || 1), 0, 1), G.A);
  return seamFrac(G, nd.total, c);
}

/* ---------- search ---------- */
const effortN = () => ({fast:120, std:360, deep:1200}[cfg.effort] || 360);
const effortIters = () => ({fast:500, std:1300, deep:3500}[cfg.effort] || 1300);
/** @type {(progress:number)=>void} */
let progressCb = () => {};

async function search(seed, n, keep, token){
  const rng = mulberry32(seed >>> 0), D = dims();
  const out = [], idx = qs.map((_, k) => k);
  for (let i = 0; i < n; i++) {
    const sts = qs.map(q => (q.st && q.st.lock) ? q.st : randStyle(rng, q));
    const {wts} = weightsOf(sts);
    const t = buildTree(shuffle(idx.slice(), rng), wts, rng, D.W - 2 * D.m, D.H - 2 * D.m, {n:0});
    if (cfg.round > 0) roundSome(t, rng, sts, D);
    const res = evaluate(t, sts, D);
    out.push({score:res.score, tree:t, sts, res});
    if (out.length > keep * 3) { out.sort((a, b) => a.score - b.score); out.length = keep; }
    if (i % 8 === 7) { progressCb(i / n); await tick(); if (token !== runToken) return null; }
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, keep);
}
const FINE_OPS = ['swap', 'nudge', 'nudge', 'nudge', 'seam'];
const COARSE_OPS = ['swap', 'swap', 'flip', 'nudge', 'nudge', 'nudge', 'restyle', 'restyle', 'mirror', 'seam', 'seam', 'round'];
function mutate(cur, rng, fine){
  const p = {tree:clone(cur.tree), sts:cur.sts.map(s => ({...s}))};
  const I = [], L = [];
  collect(p.tree, I, L);
  const pick = a => a[(rng() * a.length) | 0];
  if (!I.length) return p;
  switch (pick(fine ? FINE_OPS : COARSE_OPS)) {
    case 'swap': { const a = pick(L), b = pick(L), t = a.q; a.q = b.q; b.q = t; break; }
    case 'flip': { const nd = pick(I); nd.d = nd.d === 'x' ? 'y' : 'x'; nd.s = 0; nd.e = randomSeam(rng, nd.d); break; }
    case 'nudge': { const nd = pick(I); nd.s = clamp((nd.s || 0) + (rng() - 0.5) * (fine ? 0.07 : 0.16), -0.4, 0.4); break; }
    case 'restyle': {
      const free = qs.map((q, i) => i).filter(i => !qs[i].st.lock);
      if (free.length) { const i = pick(free); p.sts[i] = randStyle(rng, qs[i]); }
      break;
    }
    case 'mirror': { const nd = pick(I), t = nd.a; nd.a = nd.b; nd.b = t; break; }
    case 'seam': {
      const nd = pick(I);
      if (nd.e && nd.e.k !== 'flat') nd.e = tweakSeam(nd.e, rng);
      else if (!fine) nd.e = randomSeam(rng, nd.d);
      break;
    }
    case 'round': if (cfg.round > 0) roundify(p.tree, pick(L), rng, layTree(p.tree, p.sts, dims())); break;
  }
  return p;
}
async function anneal(token){
  const D = dims(), rng = mulberry32((Math.random() * 1e9) | 0);
  let cur = {tree:clone(tree), sts:qs.map(q => ({...q.st}))};
  let cres = evaluate(cur.tree, cur.sts, D);
  const start = cres.score;
  let best = cur, bres = cres;
  const N = effortIters(), T0 = Math.max(0.6, cres.score * 0.08);
  for (let i = 0; i < N; i++) {
    const T = T0 * 0.02 ** (i / N);
    const prop = mutate(cur, rng, false);
    const res = evaluate(prop.tree, prop.sts, D);
    const d = res.score - cres.score;
    if (d < 0 || rng() < Math.exp(-d / T)) {
      cur = prop; cres = res;
      if (res.score < bres.score) { best = prop; bres = res; }
    }
    if (i % 20 === 19) { progressCb(i / N); await tick(); if (token !== runToken) return null; }
  }
  return {entry:best, from:start, to:bres.score};
}
/* cold local search on seams only: settles each piece around its text */
function tighten(entry, iters, seed){
  const D = dims(), rng = mulberry32(seed >>> 0);
  let cur = {tree:entry.tree, sts:entry.sts};
  let cres = evaluate(cur.tree, cur.sts, D);
  for (let i = 0; i < iters; i++) {
    const prop = mutate(cur, rng, true);
    const res = evaluate(prop.tree, prop.sts, D);
    if (res.score < cres.score) { cur = prop; cres = res; }
  }
  return {score:cres.score, tree:cur.tree, sts:cur.sts, res:cres};
}
