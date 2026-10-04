/* ---------- UI state ---------- */
let sel = -1, swapMode = false, curRes = null, drag = null, raf = 0, busy = false;
let focusQ = 0;
let previewingEmph = false;
let geometryPreview = '';
let hoverNodeId = -1;
let swapDestination = -1;
const undoStack = [];
const redoStack = [];
let busySnapshot = '';
let busyDisabled = new Map();
let bodyGesture = null;
let suppressClick = false;
let lastSnap = '';
let DEFAULT_QUOTES = '';
let editingQuoteId = null;

async function loadDefaultQuotes(){
  const response = await fetch('quotes.json');
  if (!response.ok) throw new Error(`Quote data request failed (${response.status}).`);
  const data = await response.json();
  if (!data || !Array.isArray(data.quotes) || !data.quotes.every(quote => quote && typeof quote.text === 'string' && quote.text.trim() && typeof quote.author === 'string')) {
    throw new Error('Quote data is malformed.');
  }
  return data.quotes.map(quote => `${quote.text.trim()}\n— ${quote.author.trim()}`).join('\n\n');
}

const stage = $('stage');
const say = t => { $('status').textContent = t; };
const sts = () => qs.map(q => q.st);
const tooltip = $('uiTooltip');
let tooltipTarget = null;
let tooltipDescriptionElement = null;
let tooltipAddedDescription = false;
function removeTooltipDescription(){
  if (tooltipDescriptionElement && tooltipAddedDescription) {
    const remaining = (tooltipDescriptionElement.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id);
    if (remaining.length) tooltipDescriptionElement.setAttribute('aria-describedby', remaining.join(' '));
    else tooltipDescriptionElement.removeAttribute('aria-describedby');
  }
  tooltipDescriptionElement = null; tooltipAddedDescription = false;
}
function describeTooltip(element){
  if (tooltipDescriptionElement === element) return;
  removeTooltipDescription();
  const describedBy = (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  tooltipAddedDescription = !describedBy.includes(tooltip.id);
  if (tooltipAddedDescription) element.setAttribute('aria-describedby', [...describedBy, tooltip.id].join(' '));
  tooltipDescriptionElement = element;
}
function placeTooltip(){
  if (!tooltipTarget || tooltip.hidden) return;
  const targetRect = tooltipTarget.getBoundingClientRect(), tipRect = tooltip.getBoundingClientRect();
  const left = clamp(targetRect.left + targetRect.width / 2 - tipRect.width / 2, 8, innerWidth - tipRect.width - 8);
  let top = targetRect.top - tipRect.height - 8;
  if (top < 8) top = Math.min(innerHeight - tipRect.height - 8, targetRect.bottom + 8);
  tooltip.style.left = `${left}px`; tooltip.style.top = `${Math.max(8, top)}px`;
}
function showTooltip(target, focusedElement = null){
  const text = target.getAttribute('data-tooltip');
  if (!text) return;
  if (tooltipTarget && tooltipTarget !== target) hideTooltip(tooltipTarget);
  tooltipTarget = target; tooltip.textContent = text; tooltip.hidden = false;
  tooltip.setAttribute('aria-hidden', 'false');
  if (focusedElement) describeTooltip(focusedElement);
  placeTooltip();
}
function hideTooltip(target){
  if (tooltipTarget !== target) return;
  removeTooltipDescription();
  tooltipTarget = null; tooltip.hidden = true; tooltip.setAttribute('aria-hidden', 'true');
}
function tooltipForEventTarget(target){ return target instanceof Element ? target.closest('[data-tooltip]') : null; }
document.addEventListener('pointerover', event => {
  const target = tooltipForEventTarget(event.target);
  if (target) showTooltip(target);
});
document.addEventListener('pointerout', event => {
  const target = tooltipForEventTarget(event.target), related = event.relatedTarget;
  const focused = target && target.contains(document.activeElement);
  if (target && !(related instanceof Node && target.contains(related)) && !focused) hideTooltip(target);
});
document.addEventListener('focusin', event => {
  const target = tooltipForEventTarget(event.target);
  if (target) showTooltip(target, event.target instanceof HTMLElement || event.target instanceof SVGElement ? event.target : null);
});
document.addEventListener('focusout', event => {
  const target = tooltipForEventTarget(event.target), related = event.relatedTarget;
  if (target && !(related instanceof Node && target.contains(related)) && !target.matches(':hover')) hideTooltip(target);
});
window.addEventListener('resize', placeTooltip);
window.addEventListener('scroll', placeTooltip, true);

/* ---------- poster markup ---------- */
function posterInner(res, stl, pal, D){
  let o = `<rect width="${D.W}" height="${D.H}" fill="${pal.paper}"/><g text-rendering="geometricPrecision">`;
  for (const c of res.cells) {
    if (c.bad) continue;
    const q = qs[c.q], st = stl[c.q], m = c.m, s = c.s;
    const col = [pal.ink, pal.a1, pal.a2][st.color] || pal.ink;
    const attrs = `font-family="${ffam(m.f)}" font-weight="${m.wt}" font-style="${m.it ? 'italic' : 'normal'}" font-size="${s}" fill="${col}"`;
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
        au = `<text x="${(ln.x0 + ln.W).toFixed(2)}" y="${by.toFixed(2)}" text-anchor="end" font-family="${ffam(m.f)}" font-size="${c.a}" font-style="${m.f.i ? 'italic' : 'normal'}" font-weight="400" fill="${col}" fill-opacity="0.7">${esc(q.author)}</text>`;
      }
    });
    o += `<g ${attrs}>${t}</g>${au}`;
  }
  return o + '</g>';
}
function overlayInner(res, activeTree = tree){
  let o = '';
  const selectedLeaf = sel >= 0 && activeTree ? leafOf(activeTree, sel) : null;
  const selectedNodes = selectedLeaf ? new Set(Object.values(edgeSeams(activeTree, selectedLeaf))) : new Set();
  const activeNode = drag && drag.type === 'seam' ? res.nodes[drag.id] : hoverNodeId >= 0 ? res.nodes[hoverNodeId] : null;
  const affected = new Set();
  if (previewingEmph) res.cells.forEach(c => affected.add(c.q));
  if (geometryPreview && selectedLeaf) {
    Object.values(edgeSeams(activeTree, selectedLeaf)).forEach(node => {
      const I = [], L = []; collect(node, I, L); L.forEach(l => affected.add(l.q));
    });
  }
  if (activeNode) {
    const I = [], L = [];
    collect(activeNode.node, I, L);
    L.forEach(l => affected.add(l.q));
  }
  for (const c of res.cells) {
    const classes = ['hit'];
    if (sel === c.q) classes.push('sel');
    if (focusQ === c.q) classes.push('focus');
    if (affected.has(c.q)) classes.push('affected');
    if (drag && drag.type === 'swap' && drag.source === c.q) classes.push('swap-source');
    if (drag && drag.type === 'swap' && drag.destination === c.q) classes.push('drop-target');
    if (swapMode && swapDestination === c.q) classes.push('drop-target');
    o += `<path class="${classes.join(' ')}" data-q="${c.q}" aria-label="Quote ${c.q + 1}" d="${regionPath(c.region)}"/>`;
  }
  res.nodes.forEach((n, id) => {
    const selected = selectedNodes.has(n.node) || (activeNode && activeNode.node === n.node);
    o += `<path class="seamhit-${n.node.d}${selected ? ' selected' : ''}" data-n="${id}" data-tooltip="Drag to adjust this shared seam. Focus it and use arrow keys for small nudges." tabindex="0" role="slider" aria-label="Adjust shared seam ${id + 1}" aria-valuemin="-0.8" aria-valuemax="0.8" aria-valuenow="${(n.node.s || 0).toFixed(2)}" d="${seamPath(n.G, n.c)}" fill="none"/>`;
    o += `<path class="seam${selected ? ' selected' : ''}" d="${seamPath(n.G, n.c)}" fill="none"/>`;
  });
  return o;
}
function render(){
  const empty = !qs.length;
  [$('bReroll'), $('bRefine'), $('bSeed'), $('bCopy'), $('bDownloadSVG')].forEach(button => { button.disabled = empty; });
  if (!tree || empty) {
    curRes = null;
    stage.innerHTML = '<rect width="2000" height="1000" fill="white"/><text x="1000" y="510" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#777777">No quotes yet</text>';
    stage.setAttribute('viewBox', '0 0 2000 1000');
    return;
  }
  const D = dims();
  curRes = evaluate(tree, sts(), D);
  stage.setAttribute('viewBox', `0 0 ${D.W} ${D.H}`);
  stage.style.touchAction = 'auto';
  let visibleTree = tree, visibleRes = curRes;
  if (drag && drag.type === 'swap' && drag.destination >= 0 && drag.source !== drag.destination) {
    visibleTree = clone(tree);
    const leaves = []; collect(visibleTree, [], leaves);
    const a = leaves.find(leaf => leaf.q === drag.source), b = leaves.find(leaf => leaf.q === drag.destination);
    if (a && b) { [a.q, b.q] = [b.q, a.q]; visibleRes = evaluate(visibleTree, sts(), D); }
  }
  stage.innerHTML = posterInner(visibleRes, sts(), PALS[cfg.pal], D) + overlayInner(visibleRes, visibleTree);
  updateFontSizeReadout();
}
function toBase64(buffer){
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
function rangeContainsCodePoint(rangeText, codePoint){
  if (!rangeText) return true;
  return rangeText.split(',').some(part => {
    const match = part.trim().match(/^U\+([0-9a-f?]+)(?:-([0-9a-f?]+))?$/i);
    if (!match) return false;
    const lower = parseInt(match[1].replace(/\?/g, '0'), 16);
    const upper = parseInt((match[2] || match[1]).replace(/\?/g, 'F'), 16);
    return codePoint >= lower && codePoint <= upper;
  });
}
const svgFontDataCache = new Map();
let svgFontCSSPromise = null;
function fontFaceMatches(rule, needs, codePoints){
  const family = rule.style.getPropertyValue('font-family').replace(/^['"]|['"]$/g, '');
  const requests = needs.get(family);
  if (!requests) return false;
  const faceStyle = rule.style.getPropertyValue('font-style').trim() || 'normal';
  const faceWeights = rule.style.getPropertyValue('font-weight').trim().split(/\s+/).map(Number);
  const hasRequestedVariant = [...requests].some(request => {
    const [italic, weight] = request.split('|');
    if ((faceStyle === 'italic') !== (italic === 'italic')) return false;
    return faceWeights.length > 1 ? +weight >= faceWeights[0] && +weight <= faceWeights[1] : +weight === faceWeights[0];
  });
  if (!hasRequestedVariant) return false;
  const ranges = rule.style.getPropertyValue('unicode-range');
  return !ranges || codePoints.some(codePoint => rangeContainsCodePoint(ranges, codePoint));
}
async function exportFontCSS(res){
  const needs = new Map();
  const addNeed = (family, weight, italic) => {
    if (!avail.has(family)) return;
    if (!needs.has(family)) needs.set(family, new Set());
    needs.get(family).add(`${italic ? 'italic' : 'normal'}|${weight}`);
  };
  for (const cell of res.cells) {
    if (cell.bad) continue;
    addNeed(cell.m.f.n, cell.m.wt, cell.m.it);
    if (qs[cell.q].author) addNeed(cell.m.f.n, 400, cell.m.f.i);
  }
  if (!needs.size) return {css:'', embedded:0, external:0};
  const codePoints = [...new Set(qs.flatMap(q => [...q.text + q.text.toUpperCase() + q.author].map(char => char.codePointAt(0))))];
  let css;
  try {
    if (!svgFontCSSPromise) {
      svgFontCSSPromise = fetch($('fontcss').href).then(response => {
        if (!response.ok) throw new Error(`Font stylesheet request failed (${response.status}).`);
        return response.text();
      }).catch(error => { svgFontCSSPromise = null; throw error; });
    }
    css = await svgFontCSSPromise;
  } catch (error) {
    const url = $('fontcss').href.replace(/'/g, '%27');
    return {css:`@import url('${url}');`, embedded:0, external:needs.size};
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const faces = Array.from(sheet.cssRules).filter(rule => rule.type === CSSRule.FONT_FACE_RULE && fontFaceMatches(/** @type {CSSFontFaceRule} */ (rule), needs, codePoints));
  let embedded = 0, external = 0;
  const rules = await Promise.all(faces.map(async rule => {
    const face = /** @type {CSSFontFaceRule} */ (rule), src = face.style.getPropertyValue('src');
    const match = src.match(/url\(\s*(['"]?)(https?:[^'")]+)\1\s*\)/i);
    if (!match) { external++; return face.cssText; }
    const fontURL = match[2];
    try {
      let request = svgFontDataCache.get(fontURL);
      if (!request) {
        request = fetch(fontURL).then(response => {
          if (!response.ok) throw new Error(`Font request failed (${response.status}).`);
          return response.arrayBuffer();
        }).then(toBase64).catch(error => { svgFontDataCache.delete(fontURL); throw error; });
        svgFontDataCache.set(fontURL, request);
      }
      const base64 = await request;
      face.style.setProperty('src', `url("data:font/woff2;base64,${base64}") format("woff2")`);
      embedded++;
    } catch (error) { external++; }
    return face.cssText;
  }));
  return {css:rules.join('\n'), embedded, external};
}
async function exportSVG(){
  const D = dims();
  const res = evaluate(tree, sts(), D);
  const fonts = await exportFontCSS(res);
  const defs = fonts.css ? `<defs><style><![CDATA[${fonts.css}]]></style></defs>` : '';
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${D.W} ${D.H}" width="${D.W}" height="${D.H}">${defs}${posterInner(res, sts(), PALS[cfg.pal], D)}</svg>`, ...fonts};
}

/* ---------- history ---------- */
const snap = () => JSON.stringify({
  tree, cfg, activeContrast, activeRound, quotes:quoteSource(), selectedId:sel >= 0 && qs[sel] ? qs[sel].id : null,
  qs:qs.map(q => ({id:q.id, text:q.text, tokens:q.tokens, brAfter:q.brAfter, author:q.author, st:q.st, emph:q.emph, fontSize:q.fontSize}))
}, (k, v) => k === '_w' ? undefined : v);
function commit(){
  const s = snap();
  if (s === lastSnap) return;
  if (lastSnap) undoStack.push(lastSnap);
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
  lastSnap = s;
  $('bUndo').disabled = !undoStack.length;
  $('bRedo').disabled = !redoStack.length;
}
function restore(s){
  const j = JSON.parse(s);
  const selectedId = j.selectedId || (qs[sel] && qs[sel].id);
  Object.assign(cfg, j.cfg || {});
  activeContrast = Number.isFinite(j.activeContrast) ? j.activeContrast : cfg.contrast;
  activeRound = Number.isFinite(j.activeRound) ? j.activeRound : cfg.round;
  tree = j.tree;
  $('quotesText').value = j.quotes ?? '';
  const parsed = j.qs.map(q => quoteFromFields(q.text, q.author));
  qs = parsed.map((q, i) => ({...q, ...j.qs[i], tokens:j.qs[i].tokens || q.tokens, brAfter:j.qs[i].brAfter || q.brAfter, chars:q.chars}));
  sel = qs.findIndex(q => q.id === selectedId);
  closeQuoteEditor();
  syncControls(); saveLocal(); mcache.clear(); acache.clear();
  render(); updateSel();
}
function undo(){
  if (!undoStack.length) return;
  redoStack.push(lastSnap);
  const prev = undoStack.pop();
  lastSnap = prev;
  restore(prev);
  $('bUndo').disabled = !undoStack.length;
  $('bRedo').disabled = !redoStack.length;
}
function redo(){
  if (!redoStack.length) return;
  undoStack.push(lastSnap);
  const next = redoStack.pop();
  lastSnap = next;
  restore(next);
  $('bUndo').disabled = !undoStack.length;
  $('bRedo').disabled = !redoStack.length;
}

/* ---------- busy / progress ---------- */
function setBusy(on, msg){
  if (on && !busy) {
    busyDisabled = new Map();
    document.querySelectorAll('button, input, select, textarea').forEach(el => {
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        busyDisabled.set(el, el.disabled);
        if (el.id !== 'bCancel') el.disabled = true;
      }
    });
  } else if (!on && busy) {
    busyDisabled.forEach((disabled, el) => { el.disabled = disabled; });
    busyDisabled.clear();
  }
  busy = on;
  $('bCancel').hidden = !on;
  if (msg) say(msg);
  if (!on) $('progBar').style.width = '0';
}
function cancelActive(msg = 'Canceled. The previous poster is unchanged.'){
  runToken++;
  const previous = busySnapshot;
  busySnapshot = '';
  setBusy(false, msg);
  if (previous) { restore(previous); lastSnap = previous; }
}
progressCb = p => { $('progBar').style.width = (p * 100).toFixed(0) + '%'; };

function applyEntry(e){
  tree = e.tree;
  qs.forEach((q, i) => { q.st = {...e.sts[i]}; });
}
async function regenerate(opts = {}){
  busySnapshot = opts.restore || snap();
  activeContrast = cfg.contrast; activeRound = cfg.round;
  const token = ++runToken;
  setBusy(true, 'Packing layouts…');
  const n = opts.n || effortN();
  const top = await search(cfg.seed, n, 3, token);
  if (token !== runToken || !top) { if (token === runToken) cancelActive(); return; }
  say('Fitting seams to the text…');
  let best = null;
  for (let i = 0; i < top.length; i++) {
    await tick(); if (token !== runToken) return;
    const t = tighten(top[i], 140, cfg.seed + i);
    if (!best || t.score < best.score) best = t;
  }
  applyEntry(best);
  busySnapshot = '';
  setBusy(false);
  render(); updateSel(); commit();
  say(`Best of ${n} layouts, seed ${cfg.seed}.`);
}
async function reroll(){
  const previous = snap();
  cfg.seed = 1 + ((Math.random() * 99999) | 0);
  $('seed').value = String(cfg.seed);
  await regenerate({restore:previous});
}
async function refine(){
  busySnapshot = snap();
  const token = ++runToken;
  setBusy(true, 'Refining…');
  const r = await anneal(token, 1300);
  if (token !== runToken || !r) { if (token === runToken) cancelActive(); return; }
  const t = {score:r.to, tree:r.entry.tree, sts:r.entry.sts, res:evaluate(r.entry.tree, r.entry.sts, dims())};
  busySnapshot = '';
  setBusy(false);
  if (t.score < r.from - 1e-6) { applyEntry(t); render(); updateSel(); commit(); say('Refined. The layout scores better than before.'); }
  else say('Nothing better found. Try Reroll, or run Refine again.');
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
  $('selFont').innerHTML = Object.keys(groups).map(g => `<optgroup label="${label[g]}">${groups[g].map(f => `<option value="${f.n}">${f.n}${!f.sys && !avail.has(f.n) ? ' (unavailable; fallback)' : ''}</option>`).join('')}</optgroup>`).join('');
}
function updateSel(){
  const q = qs[sel];
  renderQuoteList();
  syncInspectorViewport();
  $('selBody').hidden = !q; $('selHint').hidden = !!q;
  $('bResetSelected').disabled = !q;
  $('stage').setAttribute('aria-label', q ? `Selected quote: ${q.text}` : 'Quote poster. Use arrow keys to move focus between quotes, then Enter to select.');
  if (!q) {
    swapMode = false; swapDestination = -1; $('selSwap').textContent = 'Swap with…';
    return;
  }
  const st = q.st, f = FONTMAP[st.font] || FONTS[0];
  $('selText').textContent = q.text.length > 90 ? q.text.slice(0, 88) + '…' : q.text;
  buildFontSelect(st.font);
  $('selFont').value = st.font;
  $('selFontSize').value = q.fontSize === null ? '' : String(q.fontSize);
  updateFontSizeReadout();
  $('selWeight').innerHTML = f.w.map(w => `<option value="${w}">${wLabel[w] || w}</option>`).join('');
  $('selWeight').value = String(f.w[st.wi] || f.w[0]);
  $('selWeight').disabled = !!(st.italic && f.i);
  $('selItalic').checked = !!st.italic; $('selItalic').disabled = !f.i;
  $('selCaps').checked = !!(st.caps || f.caps); $('selCaps').disabled = !!f.caps;
  const effectiveAlign = curRes.cells.find(cell => cell.q === sel)?.eff || 'justify';
  $('alignmentState').textContent = effectiveAlign === 'justify' ? '' : `Justification falls back to ${effectiveAlign} alignment in this region.`;
  renderSelectedColors(st.color);
  $('selEmph').value = String(q.emph); $('selEmphNum').value = String(q.emph);
  $('selEmphV').textContent = q.emph === 1 ? '1.0× neutral' : `${q.emph.toFixed(2)}× target`;
  const edges = Object.values(edgeSeams(tree, leafOf(tree, sel)));
  const shaped = edges.filter(node => {
    const fitted = curRes.nodes.find(info => info.node === node);
    return node.e && node.e.k !== 'flat' && fitted && Math.abs(fitted.G.A) > 0.01;
  }).length;
  $('edgeState').textContent = !edges.length ? 'No editable internal boundaries.' : shaped === 0 ? 'Straight boundaries' : shaped === edges.length ? 'Shaped boundaries' : 'Mixed boundaries';
  const roundUnavailable = !edges.some(node => node.d === 'x'), edgesUnavailable = !edges.length;
  $('selRound').setAttribute('aria-disabled', String(roundUnavailable));
  $('selShape').setAttribute('aria-disabled', String(edgesUnavailable)); $('selFlat').setAttribute('aria-disabled', String(edgesUnavailable));
  $('selRound').dataset.tooltip = roundUnavailable ? 'Unavailable: this quote has no supported side seam to round.' : 'Rounds eligible shared side boundaries; neighboring quotes can be affected.';
  $('selShape').dataset.tooltip = edgesUnavailable ? 'Unavailable: this quote has no editable internal boundary.' : 'Choose new profiles for this quote\'s nearest shared boundaries.';
  $('selFlat').dataset.tooltip = edgesUnavailable ? 'Unavailable: this quote has no editable internal boundary.' : 'Straighten this quote\'s nearest shared boundaries.';
}
const paletteNames = {ink:'Ink on white', riso:'Blue riso', night:'Night', mono:'Newsprint', garden:'Garden', pool:'Poolside', rose:'Rose', marigold:'Marigold'};
function renderPaletteSwatches(){
  $('paletteSwatches').innerHTML = Object.entries(PALS).map(([key, pal]) => `<button class="palette-choice${cfg.pal === key ? ' active' : ''}" type="button" data-palette="${key}" data-tooltip="${paletteNames[key]} palette with its paper, ink, and accent colors." aria-label="${paletteNames[key]}" aria-pressed="${cfg.pal === key}"><span class="swatch-trio"><i style="background:${pal.ink}"></i><i style="background:${pal.a1}"></i><i style="background:${pal.a2}"></i></span><span>${paletteNames[key]}</span></button>`).join('');
}
function renderSelectedColors(selected){
  const pal = PALS[cfg.pal];
  const roles = [['0','Ink',pal.ink],['1','Accent 1',pal.a1],['2','Accent 2',pal.a2]];
  $('selectedColors').innerHTML = roles.map(([value, name, color]) => `<button class="color-choice${String(selected) === value ? ' active' : ''}" type="button" data-color="${value}" data-tooltip="Assign the ${name} color role to this quote." aria-label="${name}" aria-pressed="${String(selected) === value}"><i style="background:${color}"></i></button>`).join('');
}
function renderAccentSwatches(){
  const palette = PALS[cfg.pal];
  $('accentSwatches').innerHTML = `<span>Palette accents</span><i style="background:${palette.a1}" aria-hidden="true"></i><i style="background:${palette.a2}" aria-hidden="true"></i>`;
}
function editSel(fn, live){
  if (sel < 0) return;
  const st = qs[sel].st;
  fn(st);
  render(); updateSel();
  if (!live) commit();
}
function pickCell(i){
  if (swapMode && sel >= 0) {
    swapDestination = i === sel ? -1 : i;
    $('selSwap').textContent = swapDestination >= 0 ? 'Confirm swap' : 'Choose destination';
    render(); say(swapDestination >= 0 ? 'Confirm the selected destination to swap.' : 'Choose another quote as the destination.');
    return;
  }
  sel = sel === i ? -1 : i; focusQ = i; render(); updateSel();
  if (lastSnap) lastSnap = snap();
  if (window.matchMedia('(max-width: 900px)').matches) $('inspector').open = sel >= 0;
}

/* ---------- quotes, fonts, settings ---------- */
function quoteSource(){
  return qs.map(q => q.tokens.map((token, index) => token + (q.brAfter[index] ? '\n' : ' ')).join('').trim() + (q.author ? `\n— ${q.author}` : '')).join('\n\n');
}
function renderQuoteList(){
  $('quoteCount').textContent = `${qs.length} quote${qs.length === 1 ? '' : 's'}`;
  $('quotesEmpty').hidden = !!qs.length;
  $('quoteList').innerHTML = qs.map((q, index) => `<li class="quote-item${sel === index ? ' selected' : ''}"><button type="button" class="quote-select" data-select-quote="${index}" aria-pressed="${sel === index}">${esc(q.text)}${q.author ? `<small>${esc(q.author)}</small>` : ''}</button><div class="btns"><button type="button" class="btn" data-edit-quote="${index}" aria-label="Edit quote ${index + 1}">Edit</button><button type="button" class="btn danger" data-delete-quote="${index}" aria-label="Delete quote ${index + 1}" data-tooltip="Delete this quote. Undo restores it.">Delete</button></div></li>`).join('');
}
function openQuoteEditor(index = -1){
  if (busy) return;
  const q = qs[index];
  editingQuoteId = q ? q.id : null;
  $('quoteEditorTitle').textContent = q ? 'Edit quote' : 'Add quote';
  $('quoteText').value = q ? q.tokens.map((token, position) => token + (q.brAfter[position] ? '\n' : ' ')).join('').trim() : '';
  $('quoteAuthor').value = q ? q.author : '';
  $('quoteText').setCustomValidity('');
  $('quotesBox').open = true;
  $('quoteEditor').hidden = false;
  $('quoteText').focus();
}
function closeQuoteEditor(){
  editingQuoteId = null;
  $('quoteEditor').hidden = true;
}
function finishQuoteChange(message){
  drag = null; bodyGesture = null; hoverNodeId = -1;
  swapMode = false; swapDestination = -1; $('selSwap').textContent = 'Swap with…';
  focusQ = clamp(focusQ, 0, Math.max(0, qs.length - 1));
  mcache.clear(); acache.clear();
  $('quotesText').value = quoteSource();
  closeQuoteEditor();
  saveLocal(); render(); updateSel(); commit(); say(message);
}
function deleteQuote(index){
  if (busy || !qs[index]) return;
  const selectedId = qs[sel]?.id;
  const removeLeaf = node => {
    if (!node) return null;
    if ('q' in node) {
      if (node.q === index) return null;
      if (node.q > index) node.q--;
      return node;
    }
    node.a = removeLeaf(node.a); node.b = removeLeaf(node.b);
    return !node.a ? node.b : !node.b ? node.a : node;
  };
  tree = removeLeaf(tree);
  qs.splice(index, 1);
  sel = qs.findIndex(q => q.id === selectedId);
  finishQuoteChange('Quote deleted.');
}
$('bAddQuote').addEventListener('click', () => openQuoteEditor());
$('bCancelQuote').addEventListener('click', () => { closeQuoteEditor(); $('bAddQuote').focus(); });
$('selEdit').addEventListener('click', () => openQuoteEditor(sel));
$('selDelete').addEventListener('click', () => deleteQuote(sel));
$('quoteList').addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest('button') : null;
  if (!(button instanceof HTMLButtonElement) || busy) return;
  if (button.dataset.selectQuote !== undefined) { pickCell(+button.dataset.selectQuote); return; }
  if (button.dataset.editQuote !== undefined) { openQuoteEditor(+button.dataset.editQuote); return; }
  if (button.dataset.deleteQuote !== undefined) {
    const index = +button.dataset.deleteQuote;
    deleteQuote(index);
    const next = $('quoteList').querySelectorAll('button[data-delete-quote]')[Math.min(index, qs.length - 1)];
    if (next instanceof HTMLButtonElement) next.focus(); else $('bAddQuote').focus();
  }
});
$('quoteText').addEventListener('input', () => $('quoteText').setCustomValidity(''));
$('quoteEditor').addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const text = $('quoteText').value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join('\n');
  if (!text) { $('quoteText').setCustomValidity('Enter a quote.'); $('quoteText').reportValidity(); return; }
  const author = $('quoteAuthor').value.replace(/\s+/g, ' ').trim();
  const q = quoteFromFields(text, author);
  const index = editingQuoteId === null ? -1 : qs.findIndex(quote => quote.id === editingQuoteId);
  while (qs.some((quote, position) => position !== index && quote.id === q.id)) q.id += 'x';
  if (index >= 0) {
    const previous = qs[index];
    qs[index] = {...q, st:previous.st, emph:previous.emph, fontSize:previous.fontSize};
    sel = index;
  } else {
    q.st = randStyle(mulberry32(cfg.seed + qs.length));
    const newIndex = qs.length;
    const largest = curRes?.cells.filter(cell => cell.box).sort((first, second) => second.box.w * second.box.h - first.box.w * first.box.h)[0];
    const target = largest ? largest.q : 0;
    /** @param {TreeNode} node @returns {TreeNode} */
    const insertLeaf = node => {
      if ('q' in node) return node.q === target ? {d:largest?.box && largest.box.w < largest.box.h ? 'y' : 'x', a:node, b:{q:newIndex}, s:0, e:{k:'flat', a:0, p:0.5, w:1}} : node;
      node.a = insertLeaf(node.a); node.b = insertLeaf(node.b);
      return node;
    };
    qs.push(q);
    tree = tree ? insertLeaf(tree) : {q:newIndex};
    assignIds(tree);
    sel = newIndex;
  }
  finishQuoteChange(index >= 0 ? 'Quote updated.' : 'Quote added.');
  $('bAddQuote').focus();
});
function setQuotes(text, resetStyles){
  closeQuoteEditor();
  const old = new Map(qs.map(q => [q.id, q]));
  const next = parseQuotes(text);
  const seen = new Set();
  next.forEach(q => {
    while (seen.has(q.id)) q.id += 'x';
    seen.add(q.id);
    const o = old.get(q.id);
    if (o && !resetStyles) { q.st = {...o.st}; q.emph = o.emph; q.fontSize = o.fontSize ?? null; }
  });
  qs = next; tree = null; sel = -1;
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
  try { localStorage.setItem('quote-quilt', JSON.stringify({quotes:quoteSource(), cfg})); } catch (e) {}
}
function restoreLocal(){
  try {
    const j = JSON.parse(localStorage.getItem('quote-quilt') || 'null');
    if (j && typeof j.quotes === 'string') {
      $('quotesText').value = j.quotes;
      const restoredCfg = normalizeImportedConfig(j.cfg || {});
      if (restoredCfg) Object.assign(cfg, restoredCfg);
    }
  } catch (e) {}
}
function syncControls(){
  $('aspect').value = cfg.aspect; $('effort').value = cfg.effort; $('seed').value = String(cfg.seed);
  $('gap').value = String(cfg.gap); $('gapNum').value = String(cfg.gap);
  $('contrast').value = String(cfg.contrast); $('contrastV').textContent = strength(cfg.contrast, ['Subtle','Gentle','Balanced','Strong','Dramatic']);
  $('color').value = String(cfg.color); $('colorV').textContent = `${Math.round(cfg.color * 100)}%`;
  $('shaped').value = String(cfg.shaped); $('shapedV').textContent = strength(cfg.shaped, ['Fewer','Light','Balanced','Many','More']);
  $('round').value = String(cfg.round); $('roundV').textContent = strength(cfg.round, ['None','Light','Balanced','Many','More']);
  $('symmetry').value = String(cfg.symmetry); $('symmetryV').textContent = strength(cfg.symmetry, ['Freeform','Low','Balanced','High','Symmetrical']);
  /** @type {NodeListOf<HTMLInputElement>} */
  const moodInputs = document.querySelectorAll('input[data-mood]');
  moodInputs.forEach(i => {
    const mood = i.dataset.mood;
    if (!mood) return;
    i.checked = !!cfg.moods[mood];
    const systemAvailable = SYS.some(font => font.c === mood);
    i.disabled = !FONTS.some(font => font.c === mood && (!avail.size || avail.has(font.n))) && !systemAvailable;
    const label = i.parentElement && i.parentElement.querySelector('span');
    if (label) label.textContent = `${mood[0].toUpperCase()}${mood.slice(1)}${i.disabled ? ' (unavailable)' : ''}`;
    if (i.parentElement instanceof HTMLLabelElement) {
      i.parentElement.dataset.tooltip = i.disabled ? `No available ${mood} fonts.` : `Include ${mood} families in the random font pool.`;
      i.parentElement.tabIndex = i.disabled ? 0 : -1;
      i.parentElement.classList.toggle('unavailable', i.disabled);
    }
  });
  renderPaletteSwatches();
  renderAccentSwatches();
}
function strength(value, labels){ return labels[Math.min(labels.length - 1, Math.round(value * (labels.length - 1)))]; }
function finishPreference(key, step, min, max){
  cfg[key] = clamp(Math.round(cfg[key] / step) * step, min, max);
  saveLocal(); syncControls(); commit();
}
function toJSON(){
  return JSON.stringify({v:2, cfg, activeContrast, activeRound, quotes:quoteSource(), tree, styles:sts(), emph:qs.map(q => q.emph), fontSizes:qs.map(q => q.fontSize)}, (k, v) => k === '_w' ? undefined : v);
}
function validSavedTree(node, count, seen = new Set()){
  if (!node || typeof node !== 'object') return false;
  if (Object.hasOwn(node, 'q')) {
    if (!Number.isInteger(node.q) || node.d !== undefined || node.a !== undefined || node.b !== undefined) return false;
    if (node.q < 0 || node.q >= count || seen.has(node.q)) return false;
    seen.add(node.q);
    return true;
  }
  if (!['x','y'].includes(node.d) || !node.a || !node.b || (node.s !== undefined && (!Number.isFinite(node.s) || node.s < -0.8 || node.s > 0.8))) return false;
  const seamKinds = ['flat','arc','ell','wave','notch','step','slant','scurve'];
  if (node.e && (!seamKinds.includes(node.e.k) || (node.e.k !== 'flat' && !SEAM_KINDS[node.d].includes(node.e.k)) || ['a','p','w'].some(key => node.e[key] !== undefined && !Number.isFinite(node.e[key])))) return false;
  return validSavedTree(node.a, count, seen) && validSavedTree(node.b, count, seen);
}
function normalizeImportedConfig(saved){
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) || (saved.moods !== undefined && (!saved.moods || typeof saved.moods !== 'object' || Array.isArray(saved.moods)))) return null;
  const next = {};
  for (const key of Object.keys(DEFAULT_CFG)) {
    next[key] = key === 'moods' ? {...DEFAULT_CFG.moods, ...(saved.moods || {})} : saved[key] === undefined ? DEFAULT_CFG[key] : saved[key];
  }
  if (!['2:1','3:2','1:1','3:4','2:3'].includes(next.aspect) || !Object.hasOwn(PALS, next.pal) || !['fast','std','deep'].includes(next.effort)) return null;
  const ranges = {gap:[0,40], contrast:[0,0.7], color:[0,0.8], seed:[1,999999], shaped:[0,1], round:[0,1], symmetry:[0,1]};
  for (const [key, [min, max]] of Object.entries(ranges)) if (!Number.isFinite(next[key]) || next[key] < min || next[key] > max) return null;
  if (!Number.isInteger(next.seed)) return null;
  const categories = Object.keys(DEFAULT_CFG.moods);
  if (categories.some(key => ![0,1,false,true].includes(next.moods[key])) || !categories.some(key => !!next.moods[key])) return null;
  return next;
}
function validSavedStyle(st){
  if (!st || typeof st.font !== 'string' || !FONTMAP[st.font]) return false;
  const font = FONTMAP[st.font];
  return (st.wi === undefined || (Number.isInteger(st.wi) && st.wi >= 0 && st.wi < font.w.length)) &&
    (st.italic === undefined || [0,1,false,true].includes(st.italic)) &&
    (st.caps === undefined || [0,1,false,true].includes(st.caps)) &&
    (st.color === undefined || [0,1,2].includes(st.color)) &&
    (st.jit === undefined || (Number.isFinite(st.jit) && st.jit > 0));
}
async function copyText(t, what){
  try { await navigator.clipboard.writeText(t); say(what + ' copied.'); }
  catch (e) {
    const io = $('io'); io.value = t; $('ioBox').open = true; io.focus(); io.select();
    say('Copying was blocked here. The text is selected under Save / load; copy it from there.');
  }
}
async function downloadSVG(){
  say('Preparing embedded fonts…');
  const result = await exportSVG();
  const blob = new Blob([result.svg], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'quote-quilt.svg'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(result.external ? `SVG downloaded with ${result.embedded} embedded font faces; ${result.external} still use online fallback.` : `SVG downloaded with ${result.embedded} embedded font faces.`);
}
function swapQuotes(source, destination){
  if (!tree || source === destination) return false;
  const leaves = []; collect(tree, [], leaves);
  const a = leaves.find(l => l.q === source), b = leaves.find(l => l.q === destination);
  if (!a || !b) return false;
  [a.q, b.q] = [b.q, a.q];
  sel = source; focusQ = source; render(); updateSel(); commit(); say('Quotes swapped.');
  return true;
}
function cancelGesture(){
  if (!drag) { bodyGesture = null; return; }
  if (drag.type === 'seam' && drag.node) drag.node.s = drag.initial;
  drag = null; bodyGesture = null; render();
}
function loadJSON(){
  let j;
  try { j = JSON.parse($('io').value); } catch (e) { say('That is not valid settings JSON.'); return; }
  if (!j || typeof j.quotes !== 'string') { say('No quotes found in that JSON.'); return; }
  const importedQuotes = parseQuotes(j.quotes);
  const importedCfg = normalizeImportedConfig(j.cfg === undefined ? {} : j.cfg);
  if (!importedCfg) { say('Those settings contain invalid quotes or preferences; the current poster is unchanged.'); return; }
  const treeLeaves = new Set();
  if (j.tree && (!validSavedTree(j.tree, importedQuotes.length, treeLeaves) || treeLeaves.size !== importedQuotes.length)) { say('That saved layout is malformed; the current poster is unchanged.'); return; }
  if ((j.activeContrast !== undefined && (!Number.isFinite(j.activeContrast) || j.activeContrast < 0 || j.activeContrast > 0.7)) ||
      (j.activeRound !== undefined && (!Number.isFinite(j.activeRound) || j.activeRound < 0 || j.activeRound > 1))) { say('The saved layout preferences are invalid; the current poster is unchanged.'); return; }
  if (j.styles !== undefined && (!Array.isArray(j.styles) || j.styles.length !== importedQuotes.length)) { say('The saved styles do not match the quotes; the current poster is unchanged.'); return; }
  if (j.emph !== undefined && (!Array.isArray(j.emph) || j.emph.length !== importedQuotes.length || j.emph.some(value => !Number.isFinite(value) || value < 0.5 || value > 2.5))) { say('The saved size targets are invalid; the current poster is unchanged.'); return; }
  if (j.fontSizes !== undefined && (!Array.isArray(j.fontSizes) || j.fontSizes.length !== importedQuotes.length || j.fontSizes.some(value => value !== null && (!Number.isFinite(value) || value < 0.1 || value > 2000)))) { say('The saved font-size targets are invalid; the current poster is unchanged.'); return; }
  if (j.styles && j.styles.some(st => !validSavedStyle(st))) { say('The saved styles are invalid; the current poster is unchanged.'); return; }
  const previous = snap();
  Object.assign(cfg, importedCfg);
  activeContrast = j.activeContrast === undefined ? cfg.contrast : j.activeContrast;
  activeRound = j.activeRound === undefined ? cfg.round : j.activeRound;
  $('quotesText').value = j.quotes;
  setQuotes(j.quotes, true);
  const styleRng = mulberry32(cfg.seed);
  qs.forEach((q, i) => {
    if (j.styles && j.styles[i]) {
      const importedStyle = {...j.styles[i]};
      delete importedStyle.align;
      delete importedStyle.lock;
      q.st = {...randStyle(styleRng, q), ...importedStyle, lock:0};
    } else q.st = randStyle(styleRng, q);
    q.emph = j.emph ? j.emph[i] : 1;
    q.fontSize = j.fontSizes ? j.fontSizes[i] : null;
  });
  syncControls();
  if (!qs.length) {
    finishQuoteChange('Settings loaded.');
  } else if (j.tree) {
    tree = clone(j.tree);
    const internal = [], leaves = []; collect(tree, internal, leaves);
    internal.forEach(node => { if (!Number.isFinite(node.s)) node.s = 0; if (!node.e) node.e = {...FLAT}; });
    if (leaves.some(l => l.id === undefined)) assignIds(tree);
    render(); updateSel(); commit(); say('Settings loaded.');
  }
  else regenerate({restore:previous});
}

/* ---------- events ---------- */
$('bReroll').addEventListener('click', reroll);
$('bRefine').addEventListener('click', refine);
$('bUndo').addEventListener('click', undo);
$('bRedo').addEventListener('click', redo);
$('bSeed').addEventListener('click', () => regenerate());
$('bCancel').addEventListener('click', () => cancelActive());
$('bCopy').addEventListener('click', async () => {
  say('Preparing embedded fonts…');
  const result = await exportSVG();
  await copyText(result.svg, 'SVG');
  if (result.external) say(`SVG copied with ${result.embedded} embedded font faces; ${result.external} still use online fallback.`);
});
$('bDownloadSVG').addEventListener('click', downloadSVG);
$('bCopyJson').addEventListener('click', () => copyText(toJSON(), 'Settings'));
$('bLoadJson').addEventListener('click', () => {
  if (!$('io').value.trim()) {
    $('ioBox').open = true; $('io').focus();
    say('Paste settings JSON in the Save / load field, then click Load settings.');
    return;
  }
  loadJSON();
});
$('bApply').addEventListener('click', async () => {
  if (busy) return;
  const text = $('quotesText').value;
  if (!parseQuotes(text).length) {
    qs = []; tree = null; sel = -1;
    finishQuoteChange('All quotes removed.');
    return;
  }
  const previous = snap();
  busySnapshot = previous;
  const token = ++runToken;
  setQuotes(text, false);
  const pool = mulberry32(cfg.seed);
  qs.forEach(q => { if (!q.st) q.st = randStyle(pool); });
  saveLocal();
  setBusy(true, 'Loading typefaces…');
  await loadFonts();
  if (token !== runToken) return;
  await regenerate({restore:previous});
});

$('aspect').addEventListener('change', e => { cfg.aspect = selectFromEvent(e).value; render(); saveLocal(); commit(); });
$('effort').addEventListener('change', e => { cfg.effort = selectFromEvent(e).value; saveLocal(); commit(); });
$('seed').addEventListener('change', e => { const input = inputFromEvent(e); cfg.seed = clamp(parseInt(input.value, 10) || 1, 1, 999999); input.value = String(cfg.seed); saveLocal(); commit(); });
$('paletteSwatches').addEventListener('click', e => {
  const button = e.target instanceof Element ? e.target.closest('[data-palette]') : null;
  if (!button) return;
  cfg.pal = /** @type {HTMLElement} */ (button).dataset.palette || cfg.pal;
  renderPaletteSwatches(); renderAccentSwatches(); render(); saveLocal(); commit();
});
function updateGap(value){ cfg.gap = clamp(+value || 0, 0, 40); $('gap').value = String(cfg.gap); $('gapNum').value = String(cfg.gap); render(); saveLocal(); }
$('gap').addEventListener('input', e => updateGap(inputFromEvent(e).value));
$('gapNum').addEventListener('input', e => updateGap(inputFromEvent(e).value));
$('gap').addEventListener('change', commit); $('gapNum').addEventListener('change', commit);
$('contrast').addEventListener('input', e => { cfg.contrast = +inputFromEvent(e).value; $('contrastV').textContent = strength(cfg.contrast, ['Subtle','Gentle','Balanced','Strong','Dramatic']); saveLocal(); });
$('shaped').addEventListener('input', e => { cfg.shaped = +inputFromEvent(e).value; $('shapedV').textContent = strength(cfg.shaped, ['Fewer','Light','Balanced','Many','More']); saveLocal(); });
$('round').addEventListener('input', e => { cfg.round = +inputFromEvent(e).value; $('roundV').textContent = strength(cfg.round, ['None','Light','Balanced','Many','More']); saveLocal(); });
$('symmetry').addEventListener('input', e => { cfg.symmetry = +inputFromEvent(e).value; $('symmetryV').textContent = strength(cfg.symmetry, ['Freeform','Low','Balanced','High','Symmetrical']); saveLocal(); });
$('contrast').addEventListener('change', () => finishPreference('contrast', 0.02, 0, 0.7));
$('shaped').addEventListener('change', () => finishPreference('shaped', 0.05, 0, 1));
$('round').addEventListener('change', () => finishPreference('round', 0.05, 0, 1));
$('symmetry').addEventListener('change', () => finishPreference('symmetry', 0.05, 0, 1));
$('color').addEventListener('input', e => {
  cfg.color = +inputFromEvent(e).value; $('colorV').textContent = `${Math.round(cfg.color * 100)}%`; saveLocal();
});
$('color').addEventListener('change', () => finishPreference('color', 0.02, 0, 0.8));
/** @type {NodeListOf<HTMLInputElement>} */
const moodInputs = document.querySelectorAll('input[data-mood]');
moodInputs.forEach(i => i.addEventListener('change', () => {
  const mood = i.dataset.mood;
  if (mood) cfg.moods[mood] = i.checked ? 1 : 0;
  const active = Object.values(cfg.moods).some(Boolean);
  if (!active) { i.checked = true; if (mood) cfg.moods[mood] = 1; say('Choose at least one typeface category.'); return; }
  saveLocal(); commit();
}));

$('selFont').addEventListener('change', e => editSel(st => {
  const previous = FONTMAP[st.font], weight = previous && previous.w[st.wi] || 400, italic = st.italic;
  const f = FONTMAP[selectFromEvent(e).value];
  st.font = f.n; st.wi = f.w.reduce((best, item, i) => Math.abs(item - weight) < Math.abs(f.w[best] - weight) ? i : best, 0);
  st.italic = f.i ? italic : 0;
}));
$('selWeight').addEventListener('change', e => editSel(st => { const f = FONTMAP[st.font]; const i = f.w.indexOf(+selectFromEvent(e).value); st.wi = i < 0 ? 0 : i; }));
$('selItalic').addEventListener('change', e => editSel(st => { st.italic = inputFromEvent(e).checked ? 1 : 0; }));
$('selCaps').addEventListener('change', e => editSel(st => { st.caps = inputFromEvent(e).checked ? 1 : 0; }));
$('selectedColors').addEventListener('click', e => {
  const button = e.target instanceof Element ? e.target.closest('[data-color]') : null;
  if (button) editSel(st => { st.color = +/** @type {HTMLElement} */ (button).dataset.color; });
});
function updateFontSizeReadout(){
  const quote = qs[sel], cell = curRes?.cells.find(item => item.q === sel);
  if (!quote || !cell) return;
  const limited = quote.fontSize !== null && cell.s < quote.fontSize - 0.01;
  $('selFontSizeV').textContent = `${cell.s.toFixed(2)} px${limited ? ' (fit limit)' : quote.fontSize === null ? ' (auto)' : ''}`;
}
function updateFontSize(value){
  if (sel < 0) return;
  const target = value.trim() === '' ? null : Number(value);
  if (target !== null && (!Number.isFinite(target) || target <= 0)) return;
  qs[sel].fontSize = target === null ? null : clamp(target, 0.1, 2000);
  render(); updateFontSizeReadout();
}
$('selFontSize').addEventListener('input', e => {
  const input = inputFromEvent(e);
  if (!input.validity.badInput) updateFontSize(input.value);
});
$('selFontSize').addEventListener('change', e => {
  updateFontSize(inputFromEvent(e).value);
  updateSel(); commit();
});
function updateEmph(value){ if (sel < 0) return; previewingEmph = true; qs[sel].emph = clamp(+value || 1, 0.5, 2.5); $('selEmph').value = String(qs[sel].emph); $('selEmphNum').value = String(qs[sel].emph); $('selEmphV').textContent = qs[sel].emph === 1 ? '1.0× neutral' : `${qs[sel].emph.toFixed(2)}× target`; render(); updateSel(); }
$('selEmph').addEventListener('input', e => updateEmph(inputFromEvent(e).value));
$('selEmphNum').addEventListener('input', e => updateEmph(inputFromEvent(e).value));
$('selEmph').addEventListener('change', () => { previewingEmph = false; render(); commit(); });
$('selEmphNum').addEventListener('change', () => { previewingEmph = false; render(); commit(); });
$('selDeselect').addEventListener('click', () => { sel = -1; swapMode = false; swapDestination = -1; render(); updateSel(); });
$('selReroll').addEventListener('click', () => { if (sel < 0) return; qs[sel].st = randStyle(Math.random); render(); updateSel(); commit(); });
$('selRound').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  if ($('selRound').getAttribute('aria-disabled') === 'true') { say($('selRound').dataset.tooltip); return; }
  if (!roundify(tree, leafOf(tree, sel), Math.random, layTree(tree, sts(), dims()))) { say('This piece has no seam to its left or right to round.'); return; }
  render(); updateSel(); commit(); say($('edgeState').textContent === 'Straight boundaries' ? 'The layout could not keep rounded sides under current fit constraints.' : 'Round sides applied.');
});
$('selShape').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  if ($('selShape').getAttribute('aria-disabled') === 'true') { say($('selShape').dataset.tooltip); return; }
  const ed = Object.values(edgeSeams(tree, leafOf(tree, sel)));
  if (!ed.length) return;
  ed.forEach(nd => { nd.e = randomSeam(Math.random, nd.d, true); });
  render(); updateSel(); commit(); say(`Boundary profiles updated. Effective state: ${$('edgeState').textContent.toLowerCase()}.`);
});
$('selFlat').addEventListener('click', () => {
  if (sel < 0 || !tree) return;
  if ($('selFlat').getAttribute('aria-disabled') === 'true') { say($('selFlat').dataset.tooltip); return; }
  Object.values(edgeSeams(tree, leafOf(tree, sel))).forEach(nd => { nd.e = {...FLAT}; });
  render(); updateSel(); commit(); say(`Boundary profiles straightened. Effective state: ${$('edgeState').textContent.toLowerCase()}.`);
});
$('selSwap').addEventListener('click', () => {
  if (sel < 0) return;
  if (swapMode && swapDestination >= 0) {
    const destination = swapDestination;
    swapMode = false; swapDestination = -1; $('selSwap').textContent = 'Swap with…';
    swapQuotes(sel, destination); return;
  }
  swapMode = !swapMode; swapDestination = -1;
  $('selSwap').textContent = swapMode ? 'Choose destination' : 'Swap with…';
  say(swapMode ? 'Select a destination quote, then confirm.' : 'Swap canceled.'); render();
});
function bindGeometryPreview(button, action){
  button.addEventListener('pointerenter', () => { geometryPreview = action; render(); });
  button.addEventListener('pointerleave', () => { geometryPreview = ''; render(); });
  button.addEventListener('focus', () => { geometryPreview = action; render(); });
  button.addEventListener('blur', () => { geometryPreview = ''; render(); });
}
bindGeometryPreview($('selRound'), 'round');
bindGeometryPreview($('selShape'), 'shape');
bindGeometryPreview($('selFlat'), 'flat');

function resetPoster(){
  cfg.aspect = DEFAULT_CFG.aspect; cfg.gap = DEFAULT_CFG.gap; cfg.pal = DEFAULT_CFG.pal;
  syncControls(); render(); saveLocal(); commit();
}
function resetGenerate(){
  for (const key of ['contrast','color','shaped','round','symmetry','effort','seed']) cfg[key] = DEFAULT_CFG[key];
  cfg.moods = clone(DEFAULT_CFG.moods);
  syncControls(); saveLocal(); commit();
}
function resetSelectedQuote(){
  if (sel < 0) return;
  const font = FONTMAP.Georgia;
  qs[sel].st = {font:font.n, wi:regIndex(font), italic:0, caps:0, color:0, lock:0, jit:1};
  qs[sel].emph = 1;
  qs[sel].fontSize = null;
  for (const node of Object.values(edgeSeams(tree, leafOf(tree, sel)))) { node.e = {...FLAT}; node.s = 0; }
  render(); updateSel(); commit();
}
$('bResetPoster').addEventListener('click', resetPoster);
$('bResetGenerate').addEventListener('click', resetGenerate);
$('bResetSelected').addEventListener('click', resetSelectedQuote);
$('bClearJSON').addEventListener('click', () => { $('io').value = ''; });
$('bResetQuotes').addEventListener('click', () => { $('quotesText').value = DEFAULT_QUOTES; $('bApply').click(); });
$('stage').addEventListener('focus', () => $('stage').classList.add('has-focus'));
$('stage').addEventListener('blur', () => $('stage').classList.remove('has-focus'));
function syncInspectorViewport(){
  if (!window.matchMedia('(max-width: 900px)').matches) $('inspector').open = true;
  else if (sel < 0) $('inspector').open = false;
  else $('inspector').open = true;
}
window.addEventListener('resize', syncInspectorViewport);
syncInspectorViewport();
$('panel').addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (swapMode) { swapMode = false; swapDestination = -1; $('selSwap').textContent = 'Swap with…'; render(); say('Swap canceled.'); }
  else if (sel >= 0) { sel = -1; render(); updateSel(); }
});

function svgPoint(e){
  const pt = stage.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}
stage.addEventListener('pointerdown', e => {
  if (busy) return;
  if (!(e.target instanceof Element)) return;
  const h = e.target.closest('[data-n]');
  if (h) {
    e.preventDefault();
    const id = +/** @type {HTMLElement} */ (h).dataset.n;
    const nd = curRes && curRes.nodes[id];
    drag = {type:'seam', id, node:nd && nd.node, initial:nd ? nd.node.s || 0 : 0};
    stage.setPointerCapture(e.pointerId);
    return;
  }
  const hit = e.target.closest('.hit');
  if (hit && e.pointerType !== 'touch') bodyGesture = {q:+/** @type {HTMLElement} */ (hit).dataset.q, x:e.clientX, y:e.clientY, pointerId:e.pointerId};
});
stage.addEventListener('pointermove', e => {
  if (busy) return;
  if (!drag) {
    const hovered = e.target instanceof Element ? e.target.closest('[data-n]') : null;
    const id = hovered ? +/** @type {HTMLElement} */ (hovered).dataset.n : -1;
    if (id !== hoverNodeId) { hoverNodeId = id; render(); }
  }
  if (!drag && bodyGesture && e.pointerId === bodyGesture.pointerId && Math.hypot(e.clientX - bodyGesture.x, e.clientY - bodyGesture.y) >= 5) {
    drag = {type:'swap', source:bodyGesture.q, destination:-1};
    stage.setPointerCapture(e.pointerId);
  }
  if (drag && drag.type === 'swap') {
    const point = document.elementFromPoint(e.clientX, e.clientY);
    const target = point instanceof Element ? point.closest('.hit') : null;
    const destination = target ? +/** @type {HTMLElement} */ (target).dataset.q : -1;
    if (destination !== drag.destination) {
      drag.destination = destination;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
    }
    e.preventDefault(); return;
  }
  if (!drag || drag.type !== 'seam' || !curRes) return;
  const nd = curRes.nodes[drag.id];
  if (!nd) return;
  const p = svgPoint(e);
  adjustSeam(tree, nd.node, dragFrac(nd, p.x, p.y) - nd.base, sts(), dims());
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
});
stage.addEventListener('pointerup', () => {
  if (drag && drag.type === 'seam') { drag = null; commit(); render(); }
  else if (drag && drag.type === 'swap') {
    const {source, destination} = drag; drag = null; bodyGesture = null; suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (destination >= 0 && source !== destination) swapQuotes(source, destination); else render();
  } else bodyGesture = null;
});
stage.addEventListener('pointercancel', () => cancelGesture());
stage.addEventListener('pointerleave', () => { if (hoverNodeId >= 0 && !drag) { hoverNodeId = -1; render(); } });
stage.addEventListener('keydown', e => {
  if (busy) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) { e.preventDefault(); deleteQuote(sel); return; }
  const handle = e.target instanceof Element ? e.target.closest('[data-n]') : null;
  if (handle && e.key.startsWith('Arrow')) {
    const id = +/** @type {HTMLElement} */ (handle).dataset.n;
    const nd = curRes && curRes.nodes[id];
    if (nd) {
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 0.01 : -0.01;
      adjustSeam(tree, nd.node, (nd.node.s || 0) + delta, sts(), dims());
      render(); /** @type {SVGPathElement|null} */ (stage.querySelector(`[data-n="${id}"]`))?.focus(); commit(); e.preventDefault();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (drag) cancelGesture();
    else if (swapMode) { swapMode = false; swapDestination = -1; $('selSwap').textContent = 'Swap with…'; render(); say('Swap canceled.'); }
    else if (sel >= 0) { sel = -1; render(); updateSel(); }
    e.preventDefault(); return;
  }
  if (e.key.startsWith('Arrow') && qs.length) {
    focusQ = (focusQ + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + qs.length) % qs.length;
    if (swapMode) {
      swapDestination = focusQ === sel ? -1 : focusQ;
      $('selSwap').textContent = swapDestination >= 0 ? 'Confirm swap' : 'Choose destination';
    }
    render(); e.preventDefault();
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (swapMode) pickCell(focusQ);
    else { sel = sel === focusQ ? -1 : focusQ; render(); updateSel(); }
    e.preventDefault();
  }
});
stage.addEventListener('click', e => {
  if (busy) return;
  stage.focus({preventScroll:true});
  if (suppressClick) { suppressClick = false; return; }
  if (!(e.target instanceof Element)) return;
  const hit = e.target.closest('.hit');
  if (hit) pickCell(+/** @type {HTMLElement} */ (hit).dataset.q);
  else if (!e.target.closest('[data-n]') && sel >= 0) { sel = -1; swapMode = false; render(); updateSel(); }
});

/* ---------- boot ---------- */
async function boot(){
  try { DEFAULT_QUOTES = await loadDefaultQuotes(); }
  catch (error) { say(error.message || 'Could not load the default quotes.'); return; }
  $('quotesText').value = DEFAULT_QUOTES;
  restoreLocal();
  syncControls();
  setQuotes($('quotesText').value, true);
  const rng = mulberry32(cfg.seed);
  qs.forEach(q => { q.st = randStyle(rng); });
  if (!qs.length) { render(); updateSel(); commit(); return; }
  await regenerate({n:80});
  say('Loading typefaces…');
  await loadFonts();
  syncControls();
  if (avail.size) await regenerate();
  else say('Web fonts did not load, so this uses system fonts.');
}
boot();
