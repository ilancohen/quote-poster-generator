/* ---------- typesetting: fill a region edge to edge ----------
   For K lines the first line touches the top and the last touches the bottom, so a size s fixes
   the pitch. We take the largest s that still fits the words, then break optimally into exactly K
   lines. Every line runs to both edges of its band, so the text alone draws the outline. */
const SP_UP = 0.85,
  LS_UP = 0.05,
  SP_DN = 0.3,
  LS_DN = 0.015;
const AUTHOR_SCALE = 0.42,
  AUTHOR_GAP = 1.6;
const LEAD_MIN = 0.92,
  LEAD_MAX = 1.34,
  MIN_SIZE = 8;
const MEASURE = { j: 11, r: 7 }; // shortest comfortable line, in ems

/** @typedef {{K:number,s:number,leftover:number,q:number,loose:number,lines:TypesetLine[]}} Candidate */

function glue(ln, s, sp) {
  const cnt = ln.idx.length,
    S = ln.W - ln.nat;
  if (S >= 0) {
    const cap = SP_UP * sp * (cnt - 1) + LS_UP * s * Math.max(0, ln.chars - 1);
    const f = cap > 0 ? S / cap : 9;
    return { gap: f * SP_UP * sp, ls: f * LS_UP * s, f };
  }
  const cap = SP_DN * sp * (cnt - 1) + LS_DN * s * Math.max(0, ln.chars - 1);
  const f = cap > 0 ? S / cap : -9;
  return { gap: f * SP_DN * sp, ls: f * LS_DN * s, f };
}

/* token stream for one piece: the words, then the author (if any) as a smaller final token */
function streamOf(q, m) {
  const n = m.w.length,
    hasA = !!q.author;
  const aw = hasA ? authorWidth(m.f, q.author) * AUTHOR_SCALE : 0;
  let natEm = aw + (hasA ? AUTHOR_GAP * m.space : 0);
  for (let i = 0; i < n; i++) natEm += m.w[i] + (i ? m.space : 0);
  return { m, n, N: n + (hasA ? 1 : 0), hasA, aw, natEm };
}
const tokW = (T, j, s) => (j < T.n ? T.m.w[j] : T.aw) * s;
const tokPre = (T, j, s) => (j === T.n ? AUTHOR_GAP : 1) * T.m.space * s;

/* skip tapered tips too narrow for a word at size s; the skipped height still counts as unfilled */
function frame(F, s) {
  const E = F.E,
    wmin = F.wTip * s;
  let a = 0,
    b = E.n;
  while (a < b && E.r[a] - E.l[a] < wmin) a++;
  while (b > a && E.r[b - 1] - E.l[b - 1] < wmin) b--;
  return { top: (E.i0 + a) * DY, H: (b - a) * DY };
}
function placement(F, K, s) {
  const { top, H } = frame(F, s),
    lead = F.lh * LEAD_MAX;
  const P = K > 1 ? Math.max(0, Math.min((H - s) / (K - 1), s * lead)) : 0;
  return { P, top, off: (H - (K - 1) * P - s) / 2 };
}
function bands(F, K, s) {
  const { P, top, off } = placement(F, K, s),
    out = [];
  for (let k = 0; k < K; k++) {
    const y0 = top + off + k * P,
      sp = spanAt(F.E, y0, y0 + s);
    if (!sp) return null;
    out.push({ x0: sp.L, W: sp.R - sp.L });
  }
  return out;
}
/* first-fit: can every token be set in at most K lines at size s? */
function fitsIn(F, K, s) {
  const T = F.T,
    m = T.m,
    squeeze = F.mode === "j" ? 0.5 : 0;
  const { P, top, off } = placement(F, K, s);
  if (off < -0.5 || (K > 1 && P < s * F.lh * LEAD_MIN - 1e-6)) return false;
  let k = 0,
    sp = spanAt(F.E, top + off, top + off + s);
  if (!sp) return false;
  let nat = 0,
    gaps = 0,
    chars = 0,
    cnt = 0;
  for (let j = 0; j < T.N; j++) {
    const w = tokW(T, j, s),
      pre = tokPre(T, j, s),
      ln = j < T.n ? m.len[j] : 0;
    const shrink = (g, c) =>
      squeeze * (SP_DN * g + LS_DN * s * Math.max(0, c - 1));
    const g2 = cnt && j < T.n ? gaps + pre : gaps;
    let nn = cnt ? nat + pre + w : w;
    if (nn - shrink(g2, chars + ln) > sp.R - sp.L + 0.01) {
      if (!cnt || ++k >= K) return false;
      const y0 = top + off + k * P;
      sp = spanAt(F.E, y0, y0 + s);
      if (!sp || w > sp.R - sp.L + 0.01) return false;
      nat = w;
      gaps = 0;
      chars = ln;
      cnt = 1;
    } else {
      gaps = g2;
      nat = nn;
      chars += ln;
      cnt++;
    }
    if (j < T.n && m.br[j] && j < T.N - 1) {
      if (++k >= K) return false;
      const y0 = top + off + k * P;
      sp = spanAt(F.E, y0, y0 + s);
      if (!sp) return false;
      nat = 0;
      gaps = 0;
      chars = 0;
      cnt = 0;
    }
  }
  return true;
}
function largestSize(F, K, minSize = MIN_SIZE) {
  const hi = Math.min(
    K === 1 ? F.H : F.H / (1 + (K - 1) * F.lh * LEAD_MIN),
    F.sCap,
  );
  let lo = minSize;
  if (hi < lo || !fitsIn(F, K, lo)) return 0;
  if (fitsIn(F, K, hi)) return hi;
  let top = hi;
  while (top / lo > 1.004) {
    const mid = Math.sqrt(lo * top);
    if (fitsIn(F, K, mid)) lo = mid;
    else top = mid;
  }
  return lo;
}
/* how stretched the worst inner line is: glue factor for justified text, scaled slack for ragged */
function loosest(F, lines, s) {
  let mx = 0;
  for (const ln of lines) {
    if (ln.end) continue;
    const f =
      F.mode === "j"
        ? Math.abs(glue(ln, s, F.T.m.space * s).f)
        : (3 * (ln.W - ln.nat)) / ln.W;
    mx = Math.max(mx, Math.min(f, 4));
  }
  return mx;
}
/* the largest size rarely sets best: step down a little while that buys much tighter lines */
function candidate(F, K, minSize = MIN_SIZE) {
  /** @type {Candidate|null} */
  let best = null;
  const s0 = largestSize(F, K, minSize);
  for (const k of F.target ? [1] : [1, 0.92, 0.85]) {
    const s = s0 * k;
    if (s < minSize) break;
    const bs = bands(F, K, s),
      br = bs && breakLines(F, K, s, bs);
    if (!br) continue;
    const loose = loosest(F, br.lines, s),
      { P } = placement(F, K, s);
    const leftover = Math.max(0, 1 - ((K - 1) * P + s) / F.H);
    const q = F.target
      ? Math.log(s)
      : Math.log(s) - 6 * leftover - 1.5 * Math.max(0, loose - 1.2);
    if (!best || q > best.q)
      best = { K, s, leftover, q, loose, lines: br.lines };
    if (loose <= 1.4) break;
  }
  return best;
}
/* Rank line counts by a cheap optimistic score, then run the exact breaker best-first until no
   remaining count can beat the best found. The optimistic looseness is the average stretch over all
   lines, which can't exceed the worst line's. */
function chooseLines(F, minSize = MIN_SIZE, thorough = false) {
  const T = F.T,
    m = T.m,
    maxK = T.N;
  const sEst = Math.sqrt(F.area / (T.natEm * F.lh)) * 0.95;
  const K0 = clamp(1 + Math.round((F.H - sEst) / (sEst * F.lh)), 1, maxK);
  const bounds = [];
  for (
    let K = thorough ? 1 : Math.max(1, (K0 >> 1) - 2);
    K <= (thorough ? maxK : Math.min(maxK, 2 * K0 + 4));
    K++
  ) {
    const s = largestSize(F, K, minSize),
      bs = s && bands(F, K, s);
    if (!bs) continue;
    const { P } = placement(F, K, s);
    let sumW = 0;
    for (const b of bs) sumW += b.W;
    const slack = sumW - 0.4 * bs[K - 1].W - T.natEm * s;
    const cap =
      SP_UP * m.space * s * Math.max(0, T.n - K) +
      LS_UP * s * Math.max(0, F.chars - K);
    const loose = Math.min(
      4,
      Math.max(
        0,
        F.mode === "j" ? (cap > 0 ? slack / cap : 4) : (3 * slack) / sumW,
      ),
    );
    bounds.push({
      K,
      ub: F.target
        ? Math.log(s)
        : Math.log(s) -
          6 * Math.max(0, 1 - ((K - 1) * P + s) / F.H) -
          1.5 * Math.max(0, loose - 1.2),
    });
  }
  bounds.sort((a, b) => b.ub - a.ub);
  /** @type {Candidate|null} */
  let best = null;
  for (let i = 0; i < bounds.length && (thorough || i < 6); i++) {
    if (best && bounds[i].ub < best.q - (F.target ? 0 : 0.05)) break;
    const c = candidate(F, bounds[i].K, minSize);
    if (c && (!best || c.q > best.q)) best = c;
  }
  return best;
}

/* optimal breaking into exactly K lines; only overfull lines are forbidden, loose ones just cost */
const lastPen = (r) => 150 * Math.pow(Math.max(0, 0.72 - r) / 0.72, 2);
function breakLines(F, K, s, bs) {
  const T = F.T,
    m = T.m,
    N = T.N,
    n = T.n,
    sp = m.space * s,
    INF = 1e15,
    just = F.mode === "j";
  const cost = [],
    prv = [];
  for (let k = 0; k <= K; k++) {
    cost.push(new Float64Array(N + 1).fill(INF));
    prv.push(new Int32Array(N + 1).fill(-1));
  }
  cost[0][0] = 0;
  for (let k = 0; k < K; k++) {
    const W = bs[k].W;
    for (let i = 0; i < N; i++) {
      const base = cost[k][i];
      if (base >= INF) continue;
      let nat = 0,
        chars = 0;
      for (let j = i; j < N; j++) {
        nat += (j > i ? tokPre(T, j, s) : 0) + tokW(T, j, s);
        if (j < n) chars += m.len[j];
        const cnt = Math.min(j, n - 1) - i + 1,
          S = W - nat;
        let b;
        if (T.hasA && j === n) {
          const tw = j - i,
            capDn =
              just && tw
                ? SP_DN * sp * (tw - 1) + LS_DN * s * Math.max(0, chars - 1)
                : 0;
          if (S < -capDn - 0.01) break;
          b = i === n && K > 1 ? 30 : 0;
        } else if ((!T.hasA && j === n - 1) || m.br[j]) {
          const capDn = just
            ? SP_DN * sp * (cnt - 1) + LS_DN * s * Math.max(0, chars - 1)
            : 0;
          if (S < -capDn - 0.01) break;
          b = lastPen(Math.min(1, nat / W)) * (m.br[j] && j < n - 1 ? 0.5 : 1);
        } else if (just) {
          if (S >= 0) {
            const cap =
              SP_UP * sp * (cnt - 1) + LS_UP * s * Math.max(0, chars - 1);
            const f = cap > 0 ? S / cap : 99;
            b = f <= 1.6 ? 100 * f * f * f : 410 + 400 * (f - 1.6);
          } else {
            const cap =
              SP_DN * sp * (cnt - 1) + LS_DN * s * Math.max(0, chars - 1);
            const f = cap > 0 ? -S / cap : 99;
            if (f > 1) break;
            b = 130 * f * f * f;
          }
        } else {
          if (S < -0.01) break;
          b = 400 * (S / W) * (S / W);
        }
        const t = base + b;
        if (t < cost[k + 1][j + 1]) {
          cost[k + 1][j + 1] = t;
          prv[k + 1][j + 1] = i;
        }
        if (j < n && m.br[j]) break;
      }
    }
  }
  if (cost[K][N] >= INF) return null;
  const lines = [];
  let j = N;
  for (let k = K; k > 0; k--) {
    const i = prv[k][j],
      idx = [];
    let nat = 0,
      chars = 0;
    for (let t = i; t < Math.min(j, n); t++) {
      idx.push(t);
      nat += (t > i ? sp : 0) + m.w[t] * s;
      chars += m.len[t];
    }
    const author = T.hasA && j === N;
    lines.unshift({
      idx,
      nat,
      chars,
      W: bs[k - 1].W,
      x0: bs[k - 1].x0,
      end: author || j === n || !!m.br[j - 1],
      author,
    });
    j = i;
  }
  return { lines, cost: cost[K][N] };
}

/* how each line is set: justified lines stretch to both edges; an end line does too once it is nearly full */
function lineSet(c, ln) {
  const s = c.s,
    sp = c.m.space * s;
  const room = ln.author ? ln.W - c.aw * s - AUTHOR_GAP * sp : ln.W;
  if (!ln.idx.length) return { x: ln.x0, gap: sp, ls: 0, f: 0 };
  if (
    c.eff === "justify" &&
    ln.idx.length > 1 &&
    (!ln.end || ln.nat / room > 0.8)
  ) {
    const g = glue({ ...ln, W: room }, s, sp),
      f = Math.min(g.f, 2.5),
      k = g.f ? f / g.f : 0;
    return { x: ln.x0, gap: sp + g.gap * k, ls: g.ls * k, f };
  }
  if (c.eff === "right")
    return { x: ln.x0 + room - ln.nat, gap: sp, ls: 0, f: 0 };
  if (c.eff === "center")
    return { x: ln.x0 + (room - ln.nat) / 2, gap: sp, ls: 0, f: 0 };
  return { x: ln.x0, gap: sp, ls: 0, f: 0 };
}
function cellStats(c) {
  let j = 0,
    jn = 0,
    rg = 0,
    rn = 0,
    mx = 0,
    fill = 0;
  for (const ln of c.lines) {
    const used = ln.author ? 1 : Math.min(1, ln.nat / ln.W);
    fill += used;
    if (ln.end) continue;
    if (c.eff === "justify") {
      const g = glue(ln, c.s, c.m.space * c.s),
        f = Math.abs(g.f);
      j += (g.f < 0 ? 1.3 : 1) * Math.min(f, 4) ** 3;
      jn++;
      mx = Math.max(mx, Math.min(f, 4));
    } else {
      const r = (ln.W - ln.nat) / ln.W;
      rg += r * r;
      rn++;
    }
  }
  const last = c.lines[c.lines.length - 1];
  c.badJ = jn ? j / jn : 0;
  c.maxF = mx;
  c.rag = rn ? rg / rn : 0;
  c.lastFill = !last
    ? 1
    : last.author
      ? last.idx.length
        ? 1
        : 0.5
      : last.nat / last.W;
  c.fill = c.lines.length ? fill / c.lines.length : 0;
  c.wpl = c.lines.length
    ? c.lines.reduce((a, l) => a + l.idx.length, 0) / c.lines.length
    : 0;
}
/* Search re-fits the same piece many times; a fit depends only on the metrics, outline, gap and alignment.
   Keyed by the metrics object, so entries go away when metrics are re-measured. */
const fitMemo = new WeakMap();
function regionKey(R) {
  let h = Math.imul(2166136261 ^ R.i0, 16777619) ^ R.n;
  for (let i = 0; i < R.n; i++) {
    h = Math.imul(h ^ Math.round(R.l[i] * 8), 16777619);
    h = Math.imul(h ^ Math.round(R.r[i] * 8), 16777619);
  }
  return h >>> 0;
}
/** @param {LayoutCell} c @param {Style} st @param {Dimensions} D */
function fitCell(c, st, D) {
  const m = getMetrics(qs[c.q], st);
  let memo = fitMemo.get(m);
  if (!memo) fitMemo.set(m, (memo = new Map()));
  const key = `${regionKey(c.region)}|${D.gap}|justify|${qs[c.q].fontSize ?? "auto"}`;
  let r = memo.get(key);
  if (!r) {
    if (memo.size > 400) memo.clear();
    memo.set(key, (r = fitShape(c.q, c.region, m, "justify", D.gap)));
  }
  Object.assign(c, r);
}
function fitShape(qi, region, m, align, gap) {
  const q = qs[qi],
    E = erode(region, gap / 2),
    rect = isRect(E);
  const c = { m, E, rect, eff: align };
  const fail = () =>
    Object.assign(c, {
      bad: 1,
      s: 4,
      P: 4,
      K: 0,
      lines: [],
      top: 0,
      off: 0,
      leftover: 1,
      a: 0,
      aw: 0,
      badJ: 0,
      maxF: 0,
      rag: 0,
      lastFill: 1,
      fill: 0,
      wpl: 0,
    });
  if (!E.n) return fail();
  const T = streamOf(q, m),
    mode = c.eff === "justify" ? "j" : "r",
    rows = [];
  for (let i = 0; i < E.n; i++) if (E.r[i] > E.l[i]) rows.push(E.r[i] - E.l[i]);
  // short quotes may run one line, so their measure is just the whole quote
  const fontSize = q.fontSize ?? null;
  const sCap = fontSize ?? median(rows) / Math.min(MEASURE[mode], T.natEm);
  const F = {
    E,
    T,
    H: E.n * DY,
    area: regionArea(E),
    lh: LH[m.f.c],
    mode,
    wTip: 2.5 * median(m.w) + m.space,
    sCap,
    chars: m.len.reduce((a, b) => a + b, 0),
    target: fontSize !== null,
  };
  let ch = chooseLines(F, Math.min(MIN_SIZE, sCap), F.target);
  if (!ch) {
    let widest = 0;
    for (let row = 1; row < E.n; row++)
      if (E.r[row] - E.l[row] > E.r[widest] - E.l[widest]) widest = row;
    const width = E.r[widest] - E.l[widest];
    if (width <= 2) return fail();
    const minSize =
      Math.min(
        MIN_SIZE,
        sCap,
        width / T.natEm,
        DY / (1 + (T.N - 1) * F.lh * LEAD_MAX),
      ) / 2;
    for (let floor = MIN_SIZE; !ch && floor >= minSize; floor /= 2)
      ch = chooseLines(F, floor, true);
    if (!ch) {
      F.E = {
        i0: E.i0 + widest,
        n: 1,
        l: E.l.subarray(widest, widest + 1),
        r: E.r.subarray(widest, widest + 1),
      };
      F.H = DY;
      F.area = width * DY;
      ch = chooseLines(F, minSize, true);
    }
  }
  if (!ch)
    return align === "justify" ? fitShape(qi, region, m, "left", gap) : fail();
  const { K, s } = ch,
    pl = placement(F, K, s);
  Object.assign(c, {
    bad: 0,
    s,
    K,
    P: pl.P,
    off: pl.off,
    top: pl.top,
    lines: ch.lines,
    aw: T.aw,
    a: T.hasA ? s * AUTHOR_SCALE : 0,
    leftover: ch.leftover,
  });
  cellStats(c);
  // Tapered cells with ugly glue look better ragged than rivered
  if (
    align === "justify" &&
    !rect &&
    (c.maxF > 1.55 || c.badJ > 2.2 || (c.K > 2 && c.wpl < 2.4))
  ) {
    return fitShape(qi, region, m, "left", gap);
  }
  return c;
}
