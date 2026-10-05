/* ---------- helpers ---------- */
/** @typedef {Object} UIElements
 * @property {HTMLLinkElement} fontcss
 * @property {SVGSVGElement} stage
 * @property {HTMLButtonElement} bReroll
 * @property {HTMLButtonElement} bRefine
 * @property {HTMLButtonElement} bUndo
 * @property {HTMLButtonElement} bRedo
 * @property {HTMLButtonElement} bCopy
 * @property {HTMLButtonElement} bDownloadSVG
 * @property {HTMLButtonElement} bDownloadPNG
 * @property {HTMLButtonElement} bSeed
 * @property {HTMLButtonElement} bCancel
 * @property {HTMLParagraphElement} swapHint
 * @property {HTMLInputElement} gapNum
 * @property {HTMLElement} progBar
 * @property {HTMLParagraphElement} status
 * @property {HTMLSelectElement} aspect
 * @property {HTMLInputElement} gap
 * @property {HTMLInputElement} contrast
 * @property {HTMLOutputElement} contrastV
 * @property {HTMLInputElement} shaped
 * @property {HTMLOutputElement} shapedV
 * @property {HTMLInputElement} round
 * @property {HTMLOutputElement} roundV
 * @property {HTMLInputElement} symmetry
 * @property {HTMLOutputElement} symmetryV
 * @property {HTMLInputElement} color
 * @property {HTMLOutputElement} colorV
 * @property {HTMLDivElement} paletteSwatches
 * @property {HTMLDivElement} selectedColors
 * @property {HTMLOutputElement} alignmentState
 * @property {HTMLElement} panel
 * @property {HTMLDivElement} uiTooltip
 * @property {HTMLDetailsElement} inspector
 * @property {HTMLButtonElement} bResetPoster
 * @property {HTMLButtonElement} bResetGenerate
 * @property {HTMLButtonElement} bResetSelected
 * @property {HTMLDivElement} moods
 * @property {HTMLSelectElement} effort
 * @property {HTMLInputElement} seed
 * @property {HTMLParagraphElement} selHint
 * @property {HTMLDivElement} selBody
 * @property {HTMLParagraphElement} selText
 * @property {HTMLButtonElement} selEdit
 * @property {HTMLButtonElement} selDelete
 * @property {HTMLParagraphElement} genPrefsHint
 * @property {HTMLDetailsElement} quotesBox
 * @property {HTMLOutputElement} quoteCount
 * @property {HTMLOListElement} quoteList
 * @property {HTMLParagraphElement} quotesEmpty
 * @property {HTMLFormElement} quoteEditor
 * @property {HTMLHeadingElement} quoteEditorTitle
 * @property {HTMLTextAreaElement} quoteText
 * @property {HTMLInputElement} quoteAuthor
 * @property {HTMLButtonElement} bAddQuote
 * @property {HTMLButtonElement} bCancelQuote
 * @property {HTMLParagraphElement} edgeState
 * @property {HTMLSelectElement} selFont
 * @property {HTMLSelectElement} selWeight
 * @property {HTMLInputElement} selItalic
 * @property {HTMLInputElement} selCaps
 * @property {HTMLInputElement} selEmph
 * @property {HTMLInputElement} selEmphNum
 * @property {HTMLOutputElement} selEmphV
 * @property {HTMLInputElement} selFontSize
 * @property {HTMLOutputElement} selFontSizeV
 * @property {HTMLDivElement} accentSwatches
 * @property {HTMLButtonElement} selReroll
 * @property {HTMLButtonElement} selRound
 * @property {HTMLButtonElement} selShape
 * @property {HTMLButtonElement} selFlat
 * @property {HTMLButtonElement} selSwap
 * @property {HTMLTextAreaElement} quotesText
 * @property {HTMLDetailsElement} ioBox
 * @property {HTMLTextAreaElement} io
 * @property {HTMLButtonElement} bCopyJson
 * @property {HTMLButtonElement} bLoadJson
 * @property {HTMLButtonElement} bApply
 * @property {HTMLButtonElement} bResetQuotes
 * @property {HTMLButtonElement} bClearJSON
 */
/** @template {keyof UIElements} K @param {K} id @returns {UIElements[K]} */
const $ = id => /** @type {UIElements[K]} */ (document.getElementById(id));
/** @param {Event} event @returns {HTMLInputElement} */
const inputFromEvent = event => /** @type {HTMLInputElement} */ (event.currentTarget);
/** @param {Event} event @returns {HTMLSelectElement} */
const selectFromEvent = event => /** @type {HTMLSelectElement} */ (event.currentTarget);

/** @typedef {'serif'|'sans'|'display'|'script'|'mono'} FontCategory */
/** @typedef {{n:string,c:FontCategory,w:number[],i?:number,caps?:number,sys?:number}} FontDef */
/** @typedef {{w:number[],len:number[],br:boolean[],space:number,track:number,wt:number,it:number,caps:number,f:FontDef}} FontMetrics */
/** @typedef {{font:string,wi:number,italic:number,caps:number,color:number,lock:number,jit:number}} Style */
/** @typedef {{id:string,text:string,tokens:string[],brAfter:boolean[],author:string,chars:number,emph:number,fontSize:number|null,st:Style|null}} Quote */
/** @typedef {{k:'flat'|'arc'|'ell'|'wave'|'notch'|'step'|'slant'|'scurve',a:number,p:number,w:number}} Seam */
/** @typedef {{q:number,id?:number,_w?:number}|{d:'x'|'y',a:TreeNode,b:TreeNode,s:number,e?:Seam,_w?:number}} TreeNode */
/** @typedef {{i0:number,n:number,l:Float64Array,r:Float64Array}} Region */
/** @typedef {{x:number,y:number,w:number,h:number}} Box */
/** @typedef {{W:number,H:number,m:number,gap:number}} Dimensions */
/** @typedef {{idx:number[],nat:number,chars:number,W:number,x0:number,end:boolean,author:boolean}} TypesetLine */
/** @typedef {{q:number,id:number,region:Region,box?:Box,bad?:number,m?:FontMetrics,E?:Region,rect?:boolean,eff?:string,s?:number,K?:number,P?:number,off?:number,top?:number,lines?:TypesetLine[],a?:number,aw?:number,leftover?:number,badJ?:number,maxF?:number,rag?:number,lastFill?:number,fill?:number,wpl?:number}} LayoutCell */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tickCh = new MessageChannel(), tickQ = [];
tickCh.port1.onmessage = () => tickQ.shift()();
// MessageChannel yields are not throttled in background tabs, unlike setTimeout(0)
const tick = () => new Promise(r => { tickQ.push(r); tickCh.port2.postMessage(0); });
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clone = o => JSON.parse(JSON.stringify(o));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr, rng){for(let i=arr.length-1;i>0;i--){const j=(rng()*(i+1))|0;[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/* ---------- fonts ---------- */
/** @type {FontDef[]} */
const FONTS = [
  {n:'Libre Baskerville',c:'serif',w:[400,700],i:1},
  {n:'EB Garamond',c:'serif',w:[400,700],i:1},
  {n:'Lora',c:'serif',w:[400,700],i:1},
  {n:'Crimson Pro',c:'serif',w:[400,700],i:1},
  {n:'Cormorant Garamond',c:'serif',w:[400,700],i:1},
  {n:'Playfair Display',c:'serif',w:[400,700,900],i:1},
  {n:'Montserrat',c:'sans',w:[400,700,800]},
  {n:'Raleway',c:'sans',w:[300,500,800]},
  {n:'Josefin Sans',c:'sans',w:[300,400,700]},
  {n:'Archivo Narrow',c:'sans',w:[400,700]},
  {n:'Oswald',c:'sans',w:[300,400,600]},
  {n:'Bebas Neue',c:'display',w:[400],caps:1},
  {n:'Alfa Slab One',c:'display',w:[400]},
  {n:'Abril Fatface',c:'display',w:[400]},
  {n:'Rokkitt',c:'display',w:[400,800]},
  {n:'Bree Serif',c:'display',w:[400]},
  {n:'Cinzel',c:'display',w:[400,700],caps:1},
  {n:'Caveat',c:'script',w:[400,700]},
  {n:'Kalam',c:'script',w:[400,700]},
  {n:'Courier Prime',c:'mono',w:[400,700],i:1},
  {n:'IBM Plex Mono',c:'mono',w:[400,500]},
  {n:'Special Elite',c:'mono',w:[400]}
];
/** @type {FontDef[]} */
const SYS = [
  {n:'Georgia',c:'serif',w:[400,700],i:1,sys:1},
  {n:'Arial',c:'sans',w:[400,700],sys:1},
  {n:'Trebuchet MS',c:'sans',w:[400,700],i:1,sys:1},
  {n:'Courier New',c:'mono',w:[400,700],i:1,sys:1},
  {n:'Impact',c:'display',w:[400],caps:1,sys:1}
];
/** @type {Record<string, FontDef>} */
const FONTMAP = {};
FONTS.concat(SYS).forEach(f => FONTMAP[f.n] = f);
const FB = {serif:'Georgia, serif', sans:'Arial, Helvetica, sans-serif', display:'Impact, "Arial Black", sans-serif', script:'"Comic Sans MS", cursive', mono:'"Courier New", monospace'};
const LH = {serif:1.24, sans:1.2, display:1.06, script:1.16, mono:1.3};
const fcss = (f, wt, it) => `${it ? 'italic ' : ''}${wt} 100px "${f.n}", ${FB[f.c]}`;
const ffam = f => `'${f.n}', ${FB[f.c]}`.replace(/"/g, "'");
const regIndex = f => f.w.reduce((bi, w, i) => Math.abs(w - 400) < Math.abs(f.w[bi] - 400) ? i : bi, 0);

const PALS = {
  ink:   {paper:'#ffffff', ink:'#14151a', a1:'#8a1c2b', a2:'#3f6fd1'},
  riso:  {paper:'#eef1f4', ink:'#1b2a63', a1:'#e2512d', a2:'#2f7f86'},
  night: {paper:'#14161c', ink:'#ecebe6', a1:'#f2b84b', a2:'#7aa2ff'},
  mono:  {paper:'#f2f2ef', ink:'#111111', a1:'#111111', a2:'#5a5a5a'},
  garden:{paper:'#f4f6ed', ink:'#203b32', a1:'#c04432', a2:'#a37a20'},
  pool:  {paper:'#f0f7f6', ink:'#103b46', a1:'#da4b35', a2:'#227a6b'},
  rose:  {paper:'#fff6f2', ink:'#2d3033', a1:'#b52e4a', a2:'#337f78'},
  marigold:{paper:'#fff6df', ink:'#342b28', a1:'#bb3028', a2:'#165e75'}
};

/* ---------- state ---------- */
const cfg = {aspect:'2:1', gap:14, contrast:0.3, color:0.3, pal:'ink',
  moods:{serif:1, sans:1, display:1, script:1, mono:1}, effort:'std', seed:7, shaped:0.45, round:0.3, symmetry:0.75};
const DEFAULT_CFG = clone(cfg);
let activeContrast = cfg.contrast, activeRound = cfg.round;
/** @type {Quote[]} */
let qs = [];            // quotes: {id,text,tokens,author,chars,emph,st}
/** @type {TreeNode|null} */
let tree = null;        // guillotine tree; internal nodes {d,a,b,s,e}, leaves {q}
let avail = new Set();  // web fonts that loaded
let runToken = 0;
const ctx = document.createElement('canvas').getContext('2d');
/** @type {Map<string, FontMetrics>} */
const mcache = new Map();
/** @type {Map<string, number>} */
const acache = new Map();

/** @returns {Dimensions} */
function dims(){
  const [a, b] = cfg.aspect.split(':').map(Number);
  const W = a >= b ? 2000 : Math.round(2000 * a / b);
  const H = a >= b ? Math.round(2000 * b / a) : 2000;
  return {W, H, m:30, gap:cfg.gap};
}
function activePool(){
  const available = FONTS.filter(f => avail.has(f.n));
  if (!available.length) {
    const selectedSystem = SYS.filter(f => cfg.moods[f.c]);
    return selectedSystem.length ? selectedSystem : SYS;
  }
  const selectedWeb = available.filter(f => cfg.moods[f.c]);
  const selectedFallback = SYS.filter(f => cfg.moods[f.c] && !available.some(font => font.c === f.c));
  const p = selectedWeb.concat(selectedFallback);
  if (!p.length) return available;
  return p;
}

/* ---------- quotes ---------- */
function hashStr(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'q'+(h>>>0).toString(36)}
function quoteFromFields(rawText, author){
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const text = lines.join(' ');
  const tokens = [], brAfter = [];
  lines.forEach((line, lineIndex) => {
    const words = line.split(/\s+/);
    words.forEach((word, wordIndex) => { tokens.push(word); brAfter.push(wordIndex === words.length - 1 && lineIndex < lines.length - 1); });
  });
  return {id:hashStr(text + '|' + author), text, tokens, brAfter, author, chars:text.length, emph:1, fontSize:null, st:null};
}
function parseQuotes(txt){
  return txt.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    const lines = b.split('\n').map(l => l.trim()).filter(Boolean);
    let author = '';
    const last = lines[lines.length - 1];
    const m = last.match(/^(?:—|–|--|-|~)\s*(.+)$/);
    if (m && lines.length > 1) { author = m[1]; lines.pop(); }
    else {
      const m2 = last.match(/^(.*[.!?"”'’])\s+(?:—|–|--)\s+(.{2,60})$/);
      if (m2) { lines[lines.length - 1] = m2[1]; author = m2[2]; }
    }
    return quoteFromFields(lines.join('\n'), author);
  });
}

/* ---------- styles ---------- */
/** @param {()=>number} rng @param {Quote} [q] @returns {Style} */
function randStyle(rng, q){
  const pool = activePool();
  const f = pool[(rng() * pool.length) | 0];
  const bold = rng() < 0.3 && f.w.length > 1;
  const wi = bold ? f.w.length - 1 - ((rng() < 0.4 && f.w.length > 2) ? 1 : 0) : regIndex(f);
  const italic = (f.i && rng() < 0.22) ? 1 : 0;
  const caps = f.caps ? 1 : (rng() < 0.14 ? 1 : 0);
  const cr = rng();
  const color = cr < cfg.color * 0.5 ? 1 : (cr < cfg.color ? 2 : 0);
  return {font:f.n, wi, italic, caps, color, lock:0, jit:0.82 + rng() * 0.4};
}

/* ---------- measuring ---------- */
/** @param {Quote} q @param {Style} st @returns {FontMetrics} */
function getMetrics(q, st){
  const f = FONTMAP[st.font] || FONTS[0];
  const it = (st.italic && f.i) ? 1 : 0;
  const wt = it ? 400 : (f.w[st.wi] || f.w[0]);
  const caps = (st.caps || f.caps) ? 1 : 0;
  const key = q.id + '|' + f.n + '|' + wt + '|' + it + '|' + caps;
  let m = mcache.get(key);
  if (m) return m;
  ctx.font = fcss(f, wt, it);
  const track = caps ? 0.04 : 0;
  const w = [], len = [];
  for (const t of q.tokens) {
    const tt = caps ? t.toUpperCase() : t;
    w.push(ctx.measureText(tt).width / 100 + track * tt.length);
    len.push(tt.length);
  }
  m = {w, len, br:q.brAfter, space:ctx.measureText(' ').width / 100 + track, track, wt, it, caps, f};
  mcache.set(key, m);
  return m;
}
/** @param {FontDef} f @param {string} author @returns {number} */
function authorWidth(f, author){
  const key = f.n + '|' + author;
  let v = acache.get(key);
  if (v === undefined) {
    ctx.font = `${f.i ? 'italic ' : ''}400 100px "${f.n}", ${FB[f.c]}`;
    v = ctx.measureText(author).width / 100;
    acache.set(key, v);
  }
  return v;
}
