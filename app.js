/* ---------- UI state ---------- */
let sel = -1, edit = false, swapMode = false, curRes = null, drag = null, raf = 0;
const undoStack = [];
let lastSnap = '';
const DEFAULT_QUOTES = `All the world's a stage, and all the men and women merely players; they have their exits and their entrances, and one man in his time plays many parts.
— Shakespeare, As You Like It

Polonius: What do you read, my lord?
Hamlet: Words, words, words.
— Shakespeare, Hamlet

There is nothing either good or bad, but thinking makes it so.
— Shakespeare

We are such stuff as dreams are made on, and our little life is rounded with a sleep.
— Shakespeare, The Tempest

"Begin at the beginning," the King said gravely, "and go on till you come to the end: then stop."
— Lewis Carroll

"There's no use trying," she said; "one can't believe impossible things." "I daresay you haven't had much practice," said the Queen. "When I was your age, I always did it for half-an-hour a day. Why, sometimes I've believed as many as six impossible things before breakfast."
— Lewis Carroll

Be ashamed to die until you have won some victory for humanity.
— Horace Mann

Write it on your heart that every day is the best day in the year. He only is rich who owns the day, and no one owns the day who allows it to be invaded with worry, fret, and anxiety.
— Ralph Waldo Emerson

Finish every day and be done with it. You have done what you could; some blunders and absurdities have crept in; forget them as soon as you can. Tomorrow is a new day; you shall begin it well and serenely and with too high a spirit to be cumbered by your old nonsense.
— Ralph Waldo Emerson

Nothing great was ever achieved without enthusiasm.
— Ralph Waldo Emerson

To be great is to be misunderstood.
— Ralph Waldo Emerson

It is not enough to be industrious; so are the ants. What are you industrious about?
— Henry David Thoreau

The mass of men lead lives of quiet desperation.
— Henry David Thoreau

To live is the rarest thing in the world. Most people exist, that is all.
— Oscar Wilde

All babies are born with a knowledge of poetry, because the lub-dub of the mother’s heart is in iambic meter. Then life slowly starts to choke the poetry out of us.
— Billy Collins

Laughter and tears are both responses to frustration and exhaustion. I myself prefer to laugh, since there is less cleaning up to do afterward.
— Kurt Vonnegut

A great swindle of our time is the assumption that science has made religion obsolete. All science has damaged is the story of Adam and Eve and the story of Jonah and the Whale. Everything else holds up pretty well, particularly lessons about fairness and gentleness. People who find those lessons irrelevant in the twentieth century are simply using science as an excuse for greed and harshness. Science has nothing to do with it, friends.
— Kurt Vonnegut

Shall we make a new rule of life from tonight: always to try to be a little kinder than is necessary?
— J.M. Barrie

Everybody has a secret world inside of them. All of the people of the world, I mean everybody. No matter how dull and boring they are on the outside, inside them they've all got unimaginable, magnificent, wonderful, stupid, amazing worlds. Not just one world. Hundreds of them. Thousands maybe.  — Neil Gaiman

What is this life if, full of care,
We have no time to stand and stare.
— from "Leisure," by W.H. Davies

The key to immortality is first living a life worth remembering.
— Brandon Lee

Never throughout history has a man who lived a life of ease left a name worth remembering.
— Theodore Roosevelt

Our deepest fear is not that we are inadequate. Our deepest fear is that we are powerful beyond measure. It is our light, not our darkness that most frightens us. We ask ourselves, Who am I to be brilliant, gorgeous, talented, fabulous? Actually, who are you not to be? You are a child of God. Your playing small does not serve the world. There is nothing enlightened about shrinking so that other people won't feel insecure around you. We are all meant to shine, as children do. We were born to make manifest the glory of God that is within us. It's not just in some of us; it's in everyone. And as we let our own light shine, we unconsciously give other people permission to do the same. As we are liberated from our own fear, our presence automatically liberates others.
— Marianne Williamson

Living is not a private affair of the individual. Living is what we do with God's time, what we do with God's world.
— A.J. Heschel

There are people who put their dreams in a little box and say, Yes, I've got dreams, of course I've got dreams. Then they put the box away and bring it out once in awhile to look in it, and yep, they're still there.
— Erma Bombeck

One of the illusions of life is that the present hour is not the critical, decisive hour. Write it on your heart that every day is the best day of the year. He only is rich who owns the day, and no one owns the day who allows it to be invaded with worry, fret, and anxiety. Finish every day and be done with it. you have done what you could. some blunders and absurdities have crept in; forget them as soon as you can. Tomorrow is a new day. you shall begin it serenely and with too high a spirit to be encumbered with your old nonsense.
— Ralph Waldo Emerson

Make no little plans. They have no magic to stir men’s blood and probably themselves will not be realized. Make big plans; aim high in hope and work, remembering that a noble, logical diagram once recorded will never die, but long after we are gone will be a living thing, asserting itself with ever-growing insistence. Remember that our sons and grandsons are going to do things that would stagger us. Let your watchword be order and your beacon beauty."
— Daniel  Burnham

"I could tell you my adventures -- beginning from this morning," said Alice a little timidly: "but it's no use going back to yesterday, because I was a different person then."
— Lewis Carroll, Alice's Adventures in Wonderland

I believe the nicest and sweetest days are not those on which anything very splendid or wonderful or exciting happens but just those that bring simple little pleasures, following one another softly, like pearls slipping off a string.
— L.M. Montgomery

When you live in the shadow of insanity, the appearance of another mind that thinks and talks as yours does is something close to a blessed event. Like Robinson Crusoe's discovery of footprints on the sand.
— Robert M. Pirsig,  Zen and the Art of Motorcycle Maintenance

"I beg you to have patience with everything unresolved in  your  heart,   and  to try to love the questions themselves as if they were locked rooms or  books written in a very foreign language. Don't search for the answers, which could not be given to you now, because  you  would not  be able to live them.  And the point is to live everything. Live the questions now. Perhaps then, someday far in the future, you will gradually, without even noticing  it,  live your way into the answer."
— Rainer Maria Rilke

"To know someone with whom you can feel there is understanding in spite of distances or thoughts unexpressed... that can make this life a garden."
- Goethe`;

const stage = $('stage');
const say = t => { $('status').textContent = t; };
const sts = () => qs.map(q => q.st);

/* ---------- poster markup ---------- */
function posterInner(res, stl, pal, D){
  let o = `<rect width="${D.W}" height="${D.H}" fill="${pal.paper}"/><g text-rendering="geometricPrecision">`;
  for (const c of res.cells) {
    if (c.bad) continue;
    const q = qs[c.q], st = stl[c.q], m = c.m, s = c.s;
    const col = [pal.ink, pal.a1, pal.a2][st.color] || pal.ink;
    const attrs = `font-family="${ffam(m.f)}" font-weight="${m.wt}" font-style="${m.it ? 'italic' : 'normal'}" font-size="${s.toFixed(2)}" fill="${col}"`;
    let t = '', au = '';
    c.lines.forEach((ln, k) => {
      const by = c.top + c.off + k * c.P + s * 0.8;
      if (ln.idx.length) {
        const set = lineSet(c, ln);
        let x = set.x, ts = '';
        ln.idx.forEach(i => {
          const w = m.caps ? q.tokens[i].toUpperCase() : q.tokens[i];
          ts += `<tspan x="${x.toFixed(2)}">${esc(w)}</tspan>`;
          x += m.w[i] * s + set.ls * m.len[i] + set.gap;
        });
        const lsAttr = (m.track * s + set.ls) ? ` letter-spacing="${(m.track * s + set.ls).toFixed(3)}"` : '';
        t += `<text y="${by.toFixed(2)}"${lsAttr}>${ts}</text>`;
      }
      if (ln.author) {
        au = `<text x="${(ln.x0 + ln.W).toFixed(2)}" y="${by.toFixed(2)}" text-anchor="end" font-family="${ffam(m.f)}" font-size="${c.a.toFixed(2)}" font-style="${m.f.i ? 'italic' : 'normal'}" font-weight="400" fill="${col}" fill-opacity="0.7">${esc(q.author)}</text>`;
      }
    });
    o += `<g ${attrs}>${t}</g>${au}`;
  }
  return o + '</g>';
}
function overlayInner(res){
  let o = '';
  for (const c of res.cells) {
    o += `<path class="hit${sel === c.q ? ' sel' : ''}" data-q="${c.q}" d="${regionPath(c.region)}"/>`;
  }
  if (edit) {
    for (const c of res.cells) o += `<path class="seam" d="${regionPath(c.region)}" fill="none"/>`;
    res.nodes.forEach((n, id) => {
      o += `<path class="seamhit-${n.node.d}" data-n="${id}" d="${seamPath(n.G, n.c)}" fill="none"/>`;
    });
  }
  return o;
}
function render(){
  if (!tree || !qs.length) return;
  const D = dims();
  curRes = evaluate(tree, sts(), D);
  stage.setAttribute('viewBox', `0 0 ${D.W} ${D.H}`);
  stage.style.touchAction = edit ? 'none' : 'auto';
  stage.innerHTML = posterInner(curRes, sts(), PALS[cfg.pal], D) + overlayInner(curRes);
}
function exportSVG(){
  const D = dims();
  const res = evaluate(tree, sts(), D);
  const url = $('fontcss').href;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${D.W} ${D.H}" width="${D.W}" height="${D.H}"><defs><style><![CDATA[@import url('${url}');]]></style></defs>${posterInner(res, sts(), PALS[cfg.pal], D)}</svg>`;
}

/* ---------- history ---------- */
const snap = () => JSON.stringify({tree, sts:sts(), emph:qs.map(q => q.emph)}, (k, v) => k === '_w' ? undefined : v);
function commit(){
  const s = snap();
  if (lastSnap) undoStack.push(lastSnap);
  if (undoStack.length > 40) undoStack.shift();
  lastSnap = s;
  $('bUndo').disabled = !undoStack.length;
}
function restore(s){
  const j = JSON.parse(s);
  tree = j.tree;
  qs.forEach((q, i) => { q.st = j.sts[i]; q.emph = j.emph[i]; });
  render(); updateSel();
}
function undo(){
  if (!undoStack.length) return;
  const prev = undoStack.pop();
  lastSnap = prev;
  restore(prev);
  $('bUndo').disabled = !undoStack.length;
}

/* ---------- busy / progress ---------- */
function setBusy(on, msg){
  const buttons = [$('bReroll'), $('bRefine'), $('bOptions')];
  buttons.forEach(button => { button.disabled = on; });
  if (msg) say(msg);
  if (!on) $('progBar').style.width = '0';
}
progressCb = p => { $('progBar').style.width = (p * 100).toFixed(0) + '%'; };

function applyEntry(e){
  tree = e.tree;
  qs.forEach((q, i) => { q.st = {...e.sts[i]}; });
}
async function regenerate(opts = {}){
  const token = ++runToken;
  setBusy(true, 'Packing layouts…');
  const n = opts.n || effortN();
  const top = await search(cfg.seed, n, 3, token);
  if (token !== runToken || !top) return;
  say('Fitting seams to the text…');
  let best = null;
  for (let i = 0; i < top.length; i++) {
    await tick(); if (token !== runToken) return;
    const t = tighten(top[i], 140, cfg.seed + i);
    if (!best || t.score < best.score) best = t;
  }
  applyEntry(best);
  setBusy(false);
  render(); updateSel(); commit();
  say(`Best of ${n} layouts, seed ${cfg.seed}.`);
}
async function reroll(){
  cfg.seed = 1 + ((Math.random() * 99999) | 0);
  $('seed').value = String(cfg.seed);
  await regenerate();
}
async function refine(){
  const token = ++runToken;
  setBusy(true, 'Refining…');
  const r = await anneal(token);
  if (token !== runToken || !r) return;
  const t = tighten(r.entry, 160, (Math.random() * 1e6) | 0);
  setBusy(false);
  if (t.score < r.from - 1e-6) { applyEntry(t); render(); updateSel(); commit(); say('Refined. The layout scores better than before.'); }
  else say('Nothing better found. Try Reroll, or run Refine again.');
}
async function showOptions(){
  const token = ++runToken;
  const seed = 1 + ((Math.random() * 99999) | 0);
  setBusy(true, 'Looking for six good options…');
  const top = await search(seed, effortN() * 2, 6, token);
  if (token !== runToken || !top) return;
  for (let i = 0; i < top.length; i++) { await tick(); if (token !== runToken) return; top[i] = tighten(top[i], 50, seed + i); }
  top.sort((a, b) => a.score - b.score);
  setBusy(false);
  const D = dims(), pal = PALS[cfg.pal], box = $('opts');
  box.innerHTML = '';
  top.forEach((e, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt';
    b.innerHTML = `<svg viewBox="0 0 ${D.W} ${D.H}" aria-hidden="true">${posterInner(e.res, e.sts, pal, D)}</svg><span>Option ${k + 1} · score ${e.score.toFixed(1)}</span>`;
    b.addEventListener('click', () => { applyEntry(e); render(); updateSel(); commit(); say(`Option ${k + 1} applied.`); });
    box.appendChild(b);
  });
  box.hidden = false;
  say('Pick one to use it. Lower score means a tighter fit.');
}

/* ---------- selection panel ---------- */
const wLabel = {300:'Light', 400:'Regular', 500:'Medium', 600:'Semibold', 700:'Bold', 800:'Extra bold', 900:'Black'};
function buildFontSelect(cur){
  const list = FONTS.filter(f => avail.has(f.n));
  const base = list.length ? list : SYS;
  const names = new Set(base.map(f => f.n));
  const extra = (cur && !names.has(cur) && FONTMAP[cur]) ? [FONTMAP[cur]] : [];
  const groups = {};
  base.concat(extra).forEach(f => (groups[f.c] = groups[f.c] || []).push(f));
  const label = {serif:'Serif', sans:'Sans', display:'Display', script:'Script', mono:'Mono'};
  $('selFont').innerHTML = Object.keys(groups).map(g => `<optgroup label="${label[g]}">${groups[g].map(f => `<option value="${f.n}">${f.n}</option>`).join('')}</optgroup>`).join('');
}
function updateSel(){
  const q = qs[sel];
  $('selBody').hidden = !q; $('selHint').hidden = !!q;
  if (!q) return;
  const st = q.st, f = FONTMAP[st.font] || FONTS[0];
  $('selText').textContent = q.text.length > 90 ? q.text.slice(0, 88) + '…' : q.text;
  buildFontSelect(st.font);
  $('selFont').value = st.font;
  $('selWeight').innerHTML = f.w.map(w => `<option value="${w}">${wLabel[w] || w}</option>`).join('');
  $('selWeight').value = String(f.w[st.wi] || f.w[0]);
  $('selWeight').disabled = !!(st.italic && f.i);
  $('selItalic').checked = !!st.italic; $('selItalic').disabled = !f.i;
  $('selCaps').checked = !!(st.caps || f.caps); $('selCaps').disabled = !!f.caps;
  $('selLock').checked = !!st.lock;
  $('selAlign').value = st.align;
  $('selColor').value = String(st.color);
  $('selEmph').value = String(q.emph); $('selEmphV').textContent = q.emph.toFixed(2);
}
function editSel(fn, live){
  if (sel < 0) return;
  const st = qs[sel].st;
  fn(st);
  if (!live || st.lock === 0) st.lock = 1;
  render(); updateSel();
  if (!live) commit();
}
function pickCell(i){
  if (swapMode && sel >= 0 && i !== sel) {
    const I = [], L = [];
    collect(tree, I, L);
    const a = L.find(l => l.q === sel), b = L.find(l => l.q === i);
    if (a && b) { const t = a.q; a.q = b.q; b.q = t; }
    swapMode = false; $('selSwap').textContent = 'Swap with…';
    render(); updateSel(); commit(); say('Swapped.');
    return;
  }
  sel = i; render(); updateSel();
}

/* ---------- quotes, fonts, settings ---------- */
function setQuotes(text, resetStyles){
  const old = new Map(qs.map(q => [q.id, q]));
  const next = parseQuotes(text);
  const seen = new Set();
  next.forEach(q => {
    while (seen.has(q.id)) q.id += 'x';
    seen.add(q.id);
    const o = old.get(q.id);
    if (o && !resetStyles) { q.st = o.st; q.emph = o.emph; }
  });
  qs = next; tree = null; sel = -1;
  undoStack.length = 0; lastSnap = ''; $('bUndo').disabled = true;
  mcache.clear();
}
async function loadFonts(){
  const text = [...new Set(qs.map(q => q.text).join('') + 'abcABC')].join('');
  const jobs = FONTS.map(f => {
    const specs = f.w.map(w => `${w} 24px "${f.n}"`);
    if (f.i) specs.push(`italic 400 24px "${f.n}"`);
    return Promise.all(specs.map(s => document.fonts.load(s, text).then(r => r.length > 0, () => false)))
      .then(r => { if (r[0]) avail.add(f.n); });
  });
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 8000))]);
  mcache.clear(); acache.clear();
}
function saveLocal(){
  try { localStorage.setItem('quote-quilt', JSON.stringify({quotes:$('quotesText').value, cfg})); } catch (e) {}
}
function restoreLocal(){
  try {
    const j = JSON.parse(localStorage.getItem('quote-quilt') || 'null');
    if (j && typeof j.quotes === 'string' && j.quotes.trim()) {
      $('quotesText').value = j.quotes;
      if (j.cfg) Object.assign(cfg, j.cfg, {moods:Object.assign({}, cfg.moods, j.cfg.moods || {})});
    }
  } catch (e) {}
}
function syncControls(){
  $('aspect').value = cfg.aspect; $('pal').value = cfg.pal; $('effort').value = cfg.effort; $('seed').value = String(cfg.seed);
  $('gap').value = String(cfg.gap); $('gapV').textContent = String(cfg.gap);
  $('contrast').value = String(cfg.contrast); $('contrastV').textContent = (+cfg.contrast).toFixed(2);
  $('color').value = String(cfg.color); $('colorV').textContent = (+cfg.color).toFixed(2);
  $('just').value = String(cfg.just); $('justV').textContent = (+cfg.just).toFixed(2);
  $('shaped').value = String(cfg.shaped); $('shapedV').textContent = (+cfg.shaped).toFixed(2);
  $('round').value = String(cfg.round); $('roundV').textContent = (+cfg.round).toFixed(2);
  /** @type {NodeListOf<HTMLInputElement>} */
  const moodInputs = document.querySelectorAll('input[data-mood]');
  moodInputs.forEach(i => { const mood = i.dataset.mood; if (mood) i.checked = !!cfg.moods[mood]; });
}
function toJSON(){
  return JSON.stringify({v:2, cfg, quotes:$('quotesText').value, tree, styles:sts(), emph:qs.map(q => q.emph)}, (k, v) => k === '_w' ? undefined : v);
}
async function copyText(t, what){
  try { await navigator.clipboard.writeText(t); say(what + ' copied.'); }
  catch (e) {
    const io = $('io'); io.value = t; $('ioBox').open = true; io.focus(); io.select();
    say('Copying was blocked here. The text is selected under Save / load; copy it from there.');
  }
}
function loadJSON(){
  let j;
  try { j = JSON.parse($('io').value); } catch (e) { say('That is not valid settings JSON.'); return; }
  if (!j || typeof j.quotes !== 'string') { say('No quotes found in that JSON.'); return; }
  Object.assign(cfg, j.cfg || {}, {moods:Object.assign({}, cfg.moods, (j.cfg && j.cfg.moods) || {})});
  $('quotesText').value = j.quotes;
  setQuotes(j.quotes, true);
  qs.forEach((q, i) => { q.st = (j.styles && j.styles[i]) || randStyle(Math.random); if (j.emph && j.emph[i]) q.emph = j.emph[i]; });
  const leaves = []; if (j.tree) collect(j.tree, [], leaves);
  syncControls();
  if (j.tree && leaves.length === qs.length) {
    tree = j.tree;
    if (leaves.some(l => l.id === undefined)) assignIds(tree);
    render(); updateSel(); commit(); say('Settings loaded.');
  }
  else regenerate();
}

/* ---------- events ---------- */
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const regenSoon = debounce(() => regenerate(), 250);

$('bReroll').addEventListener('click', reroll);
$('bRefine').addEventListener('click', refine);
$('bOptions').addEventListener('click', showOptions);
$('bUndo').addEventListener('click', undo);
  $('bEdit').addEventListener('click', () => { edit = !edit; $('bEdit').setAttribute('aria-pressed', String(edit)); render(); say(edit ? 'Drag a dashed seam to resize the pieces on either side.' : ''); });
$('bCopy').addEventListener('click', () => copyText(exportSVG(), 'SVG'));
$('bCopyJson').addEventListener('click', () => copyText(toJSON(), 'Settings'));
$('bLoadJson').addEventListener('click', loadJSON);
$('bApply').addEventListener('click', async () => {
  const text = $('quotesText').value;
  if (!parseQuotes(text).length) { say('Add at least one quote.'); return; }
  setQuotes(text, false);
  const pool = mulberry32(cfg.seed);
  qs.forEach(q => { if (!q.st) q.st = randStyle(pool); });
  saveLocal();
  await loadFonts();
  await regenerate();
});

$('aspect').addEventListener('change', e => { cfg.aspect = selectFromEvent(e).value; saveLocal(); regenSoon(); });
$('effort').addEventListener('change', e => { cfg.effort = selectFromEvent(e).value; saveLocal(); });
$('seed').addEventListener('change', e => { const input = inputFromEvent(e); cfg.seed = clamp(parseInt(input.value, 10) || 1, 1, 999999); input.value = String(cfg.seed); saveLocal(); regenSoon(); });
$('pal').addEventListener('change', e => { cfg.pal = selectFromEvent(e).value; saveLocal(); render(); });
$('gap').addEventListener('input', e => { cfg.gap = +inputFromEvent(e).value; $('gapV').textContent = String(cfg.gap); saveLocal(); render(); });
$('contrast').addEventListener('input', e => { cfg.contrast = +inputFromEvent(e).value; $('contrastV').textContent = cfg.contrast.toFixed(2); saveLocal(); regenSoon(); });
$('just').addEventListener('input', e => { cfg.just = +inputFromEvent(e).value; $('justV').textContent = cfg.just.toFixed(2); saveLocal(); regenSoon(); });
$('shaped').addEventListener('input', e => { cfg.shaped = +inputFromEvent(e).value; $('shapedV').textContent = cfg.shaped.toFixed(2); saveLocal(); regenSoon(); });
$('round').addEventListener('input', e => { cfg.round = +inputFromEvent(e).value; $('roundV').textContent = cfg.round.toFixed(2); saveLocal(); regenSoon(); });
$('color').addEventListener('input', e => {
  cfg.color = +inputFromEvent(e).value; $('colorV').textContent = cfg.color.toFixed(2); saveLocal();
  const rng = mulberry32(cfg.seed + 99);
  qs.forEach(q => { const cr = rng(); if (!q.st.lock) q.st.color = cr < cfg.color * 0.5 ? 1 : (cr < cfg.color ? 2 : 0); });
  render();
});
$('color').addEventListener('change', () => commit());
/** @type {NodeListOf<HTMLInputElement>} */
const moodInputs = document.querySelectorAll('input[data-mood]');
moodInputs.forEach(i => i.addEventListener('change', () => { const mood = i.dataset.mood; if (mood) cfg.moods[mood] = i.checked ? 1 : 0; saveLocal(); regenSoon(); }));

$('selFont').addEventListener('change', e => editSel(st => { const f = FONTMAP[selectFromEvent(e).value]; st.font = f.n; st.wi = regIndex(f); if (!f.i) st.italic = 0; }));
$('selWeight').addEventListener('change', e => editSel(st => { const f = FONTMAP[st.font]; const i = f.w.indexOf(+selectFromEvent(e).value); st.wi = i < 0 ? 0 : i; }));
$('selItalic').addEventListener('change', e => editSel(st => { st.italic = inputFromEvent(e).checked ? 1 : 0; }));
$('selCaps').addEventListener('change', e => editSel(st => { st.caps = inputFromEvent(e).checked ? 1 : 0; }));
$('selAlign').addEventListener('change', e => editSel(st => { st.align = selectFromEvent(e).value; }));
$('selColor').addEventListener('change', e => editSel(st => { st.color = +selectFromEvent(e).value; }));
$('selLock').addEventListener('change', e => { if (sel < 0) return; qs[sel].st.lock = inputFromEvent(e).checked ? 1 : 0; commit(); });
$('selEmph').addEventListener('input', e => { if (sel < 0) return; qs[sel].emph = +inputFromEvent(e).value; $('selEmphV').textContent = qs[sel].emph.toFixed(2); render(); });
$('selEmph').addEventListener('change', () => commit());
$('selReroll').addEventListener('click', () => { if (sel < 0) return; const lock = qs[sel].st.lock; qs[sel].st = randStyle(Math.random); qs[sel].st.lock = lock; render(); updateSel(); commit(); });
$('selRound').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  if (!roundify(tree, leafOf(tree, sel), Math.random, layTree(tree, sts(), dims()))) { say('This piece has no seam to its left or right to round.'); return; }
  render(); commit(); say('Rounded.');
});
$('selShape').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  const ed = Object.values(edgeSeams(tree, leafOf(tree, sel)));
  if (!ed.length) return;
  ed.forEach(nd => { nd.e = randomSeam(Math.random, nd.d, true); });
  render(); commit(); say('Edges reshaped. Click again for another shape.');
});
$('selFlat').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  Object.values(edgeSeams(tree, leafOf(tree, sel))).forEach(nd => { nd.e = {...FLAT}; });
  render(); commit(); say('Edges flattened.');
});
$('selSwap').addEventListener('click', () => { if (sel < 0) return; swapMode = !swapMode; $('selSwap').textContent = swapMode ? 'Cancel swap' : 'Swap with…'; say(swapMode ? 'Click the piece to trade places with.' : ''); });

function svgPoint(e){
  const pt = stage.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}
stage.addEventListener('pointerdown', e => {
  if (!(e.target instanceof Element)) return;
  const h = e.target.closest('[data-n]');
  if (!h) return;
  e.preventDefault();
  drag = {id: +/** @type {HTMLElement} */ (h).dataset.n};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag || !curRes) return;
  const nd = curRes.nodes[drag.id];
  if (!nd) return;
  const p = svgPoint(e);
  nd.node.s = clamp(dragFrac(nd, p.x, p.y) - nd.base, -0.8, 0.8);
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
});
const endDrag = () => { if (drag) { drag = null; commit(); } };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('click', e => { if (!(e.target instanceof Element)) return; const h = e.target.closest('.hit'); if (h) pickCell(+/** @type {HTMLElement} */ (h).dataset.q); });

/* ---------- boot ---------- */
async function boot(){
  $('quotesText').value = DEFAULT_QUOTES;
  restoreLocal();
  syncControls();
  setQuotes($('quotesText').value, true);
  const rng = mulberry32(cfg.seed);
  qs.forEach(q => { q.st = randStyle(rng); });
  await regenerate({n:80});
  say('Loading typefaces…');
  await loadFonts();
  if (avail.size) { qs.forEach(q => { q.st.lock = 0; }); await regenerate(); }
  else say('Web fonts did not load, so this uses system fonts.');
}
boot();
