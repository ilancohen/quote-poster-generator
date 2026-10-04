/* ---------- regions: a piece is a stack of thin rows, each holding one horizontal span ----------
   Any outline whose rows are single spans works: rectangles, notches, stairs, slants, arcs, ellipses. */
const DY = 4;

function rectRegion(x, y, w, h){
  const i0 = Math.round(y / DY), n = Math.round((y + h) / DY) - i0;
  return {i0, n, l:new Float64Array(n).fill(x), r:new Float64Array(n).fill(x + w)};
}
const rowOn = (R, i) => R.r[i] - R.l[i] > 0.5;
function trimRegion(R){
  let a = 0, b = R.n;
  while (a < b && !rowOn(R, a)) a++;
  while (b > a && !rowOn(R, b - 1)) b--;
  if (a === 0 && b === R.n) return R;
  return {i0:R.i0 + a, n:b - a, l:R.l.subarray(a, b), r:R.r.subarray(a, b)};
}
function regionArea(R){
  let s = 0;
  for (let i = 0; i < R.n; i++) if (rowOn(R, i)) s += R.r[i] - R.l[i];
  return s * DY;
}
function regionBox(R){
  let x0 = Infinity, x1 = -Infinity;
  for (let i = 0; i < R.n; i++) if (rowOn(R, i)) { x0 = Math.min(x0, R.l[i]); x1 = Math.max(x1, R.r[i]); }
  if (x0 > x1) return {x:0, y:R.i0 * DY, w:0, h:0};
  return {x:x0, y:R.i0 * DY, w:x1 - x0, h:R.n * DY};
}
function isRect(R){
  for (let i = 1; i < R.n; i++) if (Math.abs(R.l[i] - R.l[0]) > 0.5 || Math.abs(R.r[i] - R.r[0]) > 0.5) return false;
  return true;
}
/* shrink by g on every side (Chebyshev distance), so neighbouring pieces keep a clean gutter */
function erode(R, g){
  if (g <= 0 || !R.n) return R;
  const k = Math.ceil(g / DY - 1e-9), n = R.n, l = new Float64Array(n), r = new Float64Array(n);
  for (let i = k; i < n - k; i++) {
    let L = -Infinity, Rr = Infinity;
    for (let j = i - k; j <= i + k; j++) { if (R.l[j] > L) L = R.l[j]; if (R.r[j] < Rr) Rr = R.r[j]; }
    if (Rr - L - 2 * g > 1) { l[i] = L + g; r[i] = Rr - g; }
  }
  return trimRegion({i0:R.i0, n, l, r});
}
/* widest span that is free over the whole band [ya, yb] */
function spanAt(R, ya, yb){
  const a = Math.floor(ya / DY + 1e-6) - R.i0, b = Math.ceil(yb / DY - 1e-6) - R.i0;
  if (a < 0 || b > R.n || b <= a) return null;
  let L = -Infinity, Rr = Infinity;
  for (let i = a; i < b; i++) { if (R.l[i] > L) L = R.l[i]; if (R.r[i] < Rr) Rr = R.r[i]; }
  return Rr - L > 2 ? {L, R:Rr} : null;
}
function regionPath(R){
  const f = v => v.toFixed(1);
  let d = '', i = 0;
  while (i < R.n) {
    while (i < R.n && !rowOn(R, i)) i++;
    if (i >= R.n) break;
    let j = i;
    while (j < R.n && rowOn(R, j)) j++;
    for (let k = i; k < j; k++) d += (k === i ? 'M' : 'L') + f(R.l[k]) + ' ' + f((R.i0 + k) * DY) + 'L' + f(R.l[k]) + ' ' + f((R.i0 + k + 1) * DY);
    for (let k = j - 1; k >= i; k--) d += 'L' + f(R.r[k]) + ' ' + f((R.i0 + k + 1) * DY) + 'L' + f(R.r[k]) + ' ' + f((R.i0 + k) * DY);
    d += 'Z'; i = j;
  }
  return d;
}
/* a waist: somewhere between its wide parts the piece gets much narrower (tapered tips are fine) */
function hasNeck(R){
  let wmax = 0;
  for (let i = 0; i < R.n; i++) wmax = Math.max(wmax, R.r[i] - R.l[i]);
  if (wmax <= 0) return true;
  let a = 0, b = R.n - 1;
  while (a < b && R.r[a] - R.l[a] < 0.5 * wmax) a++;
  while (b > a && R.r[b] - R.l[b] < 0.5 * wmax) b--;
  for (let i = a; i <= b; i++) if (R.r[i] - R.l[i] < 0.45 * wmax) return true;
  return false;
}
function touching(A, B){
  const a0 = A.i0, a1 = A.i0 + A.n, b0 = B.i0, b1 = B.i0 + B.n;
  if (a1 < b0 - 1 || b1 < a0 - 1) return false;
  for (let i = Math.max(a0, b0 - 1); i < Math.min(a1, b1 + 1); i++) {
    const ia = i - a0;
    if (!rowOn(A, ia)) continue;
    for (let di = -1; di <= 1; di++) {
      const ib = i + di - b0;
      if (ib < 0 || ib >= B.n || !rowOn(B, ib)) continue;
      const la = A.l[ia], ra = A.r[ia], lb = B.l[ib], rb = B.r[ib];
      if (di === 0 ? (Math.abs(ra - lb) < 0.5 || Math.abs(rb - la) < 0.5) : Math.min(ra, rb) - Math.max(la, lb) > 2) return true;
    }
  }
  return false;
}

/* ---------- seams ----------
   x seams (vertical cuts) may take any profile. y seams (horizontal cuts) must be monotone in x,
   otherwise a row of the piece below would hold two spans. */
const FLAT = {k:'flat', a:0, p:0.5, w:0.3};
const SEAM_KINDS = {x:['arc', 'arc', 'ell', 'wave', 'notch', 'notch', 'step', 'slant'], y:['step', 'step', 'slant', 'scurve']};
const smooth = v => v * v * (3 - 2 * v);
const unsmooth = y => 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);

/* amplitude is capped by the thinner child so a seam never pinches a piece into a sliver or neck */
function seamAmp(e, d, box, ratio){
  if (!e || e.k === 'flat') return 0;
  const across = d === 'x' ? box.w : box.h, along = d === 'x' ? box.h : box.w;
  const base = e.k === 'ell' ? along * (e.w || 1) * 0.5 : Math.min(across, along) * 0.5;
  const cap = 0.6 * across * Math.min(ratio, 1 - ratio);
  return clamp(e.a * base, -cap, cap);
}
function seamX(e, u, A){
  switch (e.k) {
    case 'ell': { const v = (u - e.p) / (e.w || 1); return v > 0 && v < 1 ? A * 2 * Math.sqrt(v * (1 - v)) : 0; }
    case 'arc': return A * Math.sin(Math.PI * u);
    case 'wave': return A * Math.sin(2 * Math.PI * u);
    case 'notch': return (u >= e.p && u <= e.p + e.w) ? A : 0;
    case 'step': return u < e.p ? -A / 2 : A / 2;
    case 'slant': return A * (u - 0.5);
    default: return 0;
  }
}
function seamY(e, v, A){
  switch (e.k) {
    case 'step': return v < e.p ? -A / 2 : A / 2;
    case 'slant': return A * (v - 0.5);
    case 'scurve': return A * (smooth(v) - 0.5);
    default: return 0;
  }
}
/* where the row with seam-relative height thr leaves the upper piece: v (0..1 across the box) and
   whether the upper piece is to the right of it (up) or to the left */
function cutY(e, A, thr){
  const up = A >= 0;
  if (A === 0) return {up:true, v:thr < 0 ? -1 : 2};
  if (e.k === 'slant') return {up, v:thr / A + 0.5};
  if (e.k === 'step') { const B = Math.abs(A) / 2; return {up, v:thr < -B ? (up ? -1 : 2) : thr >= B ? (up ? 2 : -1) : e.p}; }
  if (e.k === 'scurve') { const y = thr / A + 0.5; return {up, v:y <= 0 ? -1 : y >= 1 ? 2 : unsmooth(y)}; }
  return {up:true, v:thr < 0 ? -1 : 2};
}
function seamGeom(R, d, e, box, ratio, k = 1){
  e = e || FLAT;
  const A = seamAmp(e, d, box, ratio) * k, offs = new Float64Array(R.n);
  if (d === 'x') for (let i = 0; i < R.n; i++) offs[i] = seamX(e, ((R.i0 + i + 0.5) * DY - box.y) / (box.h || 1), A);
  return {R, d, e, box, A, offs};
}
/* first child takes the left part of row i when left is true, else the right part */
function rowCut(G, i, c){
  if (G.d === 'x') return {xs:c + G.offs[i], left:true};
  const k = cutY(G.e, G.A, (G.R.i0 + i + 0.5) * DY - c);
  return {xs:G.box.x + k.v * G.box.w, left:!k.up};
}
function firstArea(G, c){
  const R = G.R;
  let s = 0;
  for (let i = 0; i < R.n; i++) {
    if (!rowOn(R, i)) continue;
    const {xs, left} = rowCut(G, i, c), l = R.l[i], r = R.r[i];
    s += left ? Math.max(0, Math.min(r, xs) - l) : Math.max(0, r - Math.max(l, xs));
  }
  return s * DY;
}
function seamRange(G){
  const b = G.box, A = Math.abs(G.A) + 1;
  return G.d === 'x' ? [b.x - A, b.x + b.w + A] : [b.y - A, b.y + b.h + A];
}
/* place the seam so the first child gets `ratio` of the area, whatever the seam's profile */
function splitRegion(R, d, e, ratio, k){
  const box = regionBox(R), G = seamGeom(R, d, e, box, ratio, k), total = regionArea(R);
  let [lo, hi] = seamRange(G);
  for (let it = 0; it < 24; it++) {
    const mid = (lo + hi) / 2;
    if (firstArea(G, mid) < ratio * total) lo = mid; else hi = mid;
  }
  const c = (lo + hi) / 2, n = R.n;
  const a = {i0:R.i0, n, l:new Float64Array(n), r:new Float64Array(n)};
  const b = {i0:R.i0, n, l:new Float64Array(n), r:new Float64Array(n)};
  for (let i = 0; i < n; i++) {
    if (!rowOn(R, i)) continue;
    const {xs, left} = rowCut(G, i, c), l = R.l[i], r = R.r[i], m = clamp(xs, l, r);
    if (left) { a.l[i] = l; a.r[i] = m; b.l[i] = m; b.r[i] = r; }
    else { a.l[i] = m; a.r[i] = r; b.l[i] = l; b.r[i] = m; }
  }
  return {a:trimRegion(a), b:trimRegion(b), c, G, total};
}
const seamFrac = (G, total, c) => total > 0 ? firstArea(G, c) / total : 0.5;
function seamPath(G, c){
  const R = G.R, f = v => v.toFixed(1), pts = [];
  if (G.d === 'x') {
    for (let i = 0; i < R.n; i++) {
      const xs = c + G.offs[i];
      pts.push(rowOn(R, i) && xs > R.l[i] && xs < R.r[i] ? [xs, (R.i0 + i + 0.5) * DY] : null);
    }
  } else {
    for (let k = 0; k <= 120; k++) {
      const v = k / 120, x = G.box.x + v * G.box.w, y = c + seamY(G.e, v, G.A), i = Math.floor(y / DY) - R.i0;
      pts.push(i >= 0 && i < R.n && rowOn(R, i) && x >= R.l[i] - 1 && x <= R.r[i] + 1 ? [x, y] : null);
    }
  }
  let d = '', pen = false;
  for (const p of pts) { if (!p) { pen = false; continue; } d += (pen ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); pen = true; }
  return d;
}
