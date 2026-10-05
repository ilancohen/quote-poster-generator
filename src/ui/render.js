/* ---------- UI state ---------- */
let sel = -1,
  swapMode = false,
  curRes = null,
  drag = null,
  raf = 0,
  busy = false;
let focusQ = 0;
let previewingEmph = false;
let geometryPreview = "";
let hoverNodeId = -1;
let swapDestination = -1;
const undoStack = [];
const redoStack = [];
let busySnapshot = "";
let busyDisabled = new Map();
let bodyGesture = null;
let suppressClick = false;
let lastSnap = "";
let DEFAULT_QUOTES = "";
let STARTER_QUOTES = "";
let editingQuoteId = null;
/** @type {string|null} generation prefs last applied by New layout / regenerate */
let appliedGenPrefs = null;

// Starter set (10 quotes, mixed lengths): shorts → medium → long texture.
const STARTER_TEXT_PREFIXES = [
  "To be great is to be misunderstood.",
  "The mass of men lead lives of quiet desperation.",
  "Nothing great was ever achieved without enthusiasm.",
  "There is nothing either good or bad, but thinking makes it so.",
  "Be ashamed to die until you have won some victory for humanity.",
  "What is this life if, full of care,",
  "To live is the rarest thing in the world. Most people exist, that is all.",
  "Do I contradict myself?",
  "Shall we make a new rule of life from tonight: always to try to be a little kinder",
  "We are such stuff as dreams are made on, and our little life is rounded with a sleep.",
];

function formatQuoteBlock(quote) {
  return `${quote.text.trim()}\n— ${quote.author.trim()}`;
}
function genPrefsSnapshot() {
  return JSON.stringify({
    contrast: cfg.contrast,
    shaped: cfg.shaped,
    round: cfg.round,
    symmetry: cfg.symmetry,
    moods: cfg.moods,
    effort: cfg.effort,
    color: cfg.color,
  });
}
function updateGenPrefsHint() {
  const pending =
    appliedGenPrefs !== null && genPrefsSnapshot() !== appliedGenPrefs;
  $("genPrefsHint").hidden = !pending;
}
function markGenPrefsApplied() {
  appliedGenPrefs = genPrefsSnapshot();
  updateGenPrefsHint();
}

async function loadDefaultQuotes() {
  const data = SAMPLE_QUOTES;
  if (
    !data ||
    !Array.isArray(data.quotes) ||
    !data.quotes.every(
      (quote) =>
        quote &&
        typeof quote.text === "string" &&
        quote.text.trim() &&
        typeof quote.author === "string",
    )
  ) {
    throw new Error("Quote data is malformed.");
  }
  const full = data.quotes.map(formatQuoteBlock).join("\n\n");
  const starters = STARTER_TEXT_PREFIXES.map((prefix) => {
    const quote = data.quotes.find((entry) =>
      entry.text.trim().startsWith(prefix),
    );
    if (!quote)
      throw new Error(`Starter quote missing: ${prefix.slice(0, 40)}…`);
    return formatQuoteBlock(quote);
  });
  return { full, starter: starters.join("\n\n") };
}

const stage = $("stage");
const say = (t) => {
  $("status").textContent = t;
};
const sts = () => qs.map((q) => q.st);
const tooltip = $("uiTooltip");
let tooltipTarget = null;
let tooltipDescriptionElement = null;
let tooltipAddedDescription = false;
function removeTooltipDescription() {
  if (tooltipDescriptionElement && tooltipAddedDescription) {
    const remaining = (
      tooltipDescriptionElement.getAttribute("aria-describedby") || ""
    )
      .split(/\s+/)
      .filter((id) => id && id !== tooltip.id);
    if (remaining.length)
      tooltipDescriptionElement.setAttribute(
        "aria-describedby",
        remaining.join(" "),
      );
    else tooltipDescriptionElement.removeAttribute("aria-describedby");
  }
  tooltipDescriptionElement = null;
  tooltipAddedDescription = false;
}
function describeTooltip(element) {
  if (tooltipDescriptionElement === element) return;
  removeTooltipDescription();
  const describedBy = (element.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter(Boolean);
  tooltipAddedDescription = !describedBy.includes(tooltip.id);
  if (tooltipAddedDescription)
    element.setAttribute(
      "aria-describedby",
      [...describedBy, tooltip.id].join(" "),
    );
  tooltipDescriptionElement = element;
}
function placeTooltip() {
  if (!tooltipTarget || tooltip.hidden) return;
  const targetRect = tooltipTarget.getBoundingClientRect(),
    tipRect = tooltip.getBoundingClientRect();
  const left = clamp(
    targetRect.left + targetRect.width / 2 - tipRect.width / 2,
    8,
    innerWidth - tipRect.width - 8,
  );
  let top = targetRect.top - tipRect.height - 8;
  if (top < 8)
    top = Math.min(innerHeight - tipRect.height - 8, targetRect.bottom + 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}
function showTooltip(target, focusedElement = null) {
  const text = target.getAttribute("data-tooltip");
  if (!text) return;
  if (tooltipTarget && tooltipTarget !== target) hideTooltip(tooltipTarget);
  tooltipTarget = target;
  tooltip.textContent = text;
  tooltip.hidden = false;
  tooltip.setAttribute("aria-hidden", "false");
  if (focusedElement) describeTooltip(focusedElement);
  placeTooltip();
}
function hideTooltip(target) {
  if (tooltipTarget !== target) return;
  removeTooltipDescription();
  tooltipTarget = null;
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
}
function tooltipForEventTarget(target) {
  return target instanceof Element ? target.closest("[data-tooltip]") : null;
}
document.addEventListener("pointerover", (event) => {
  const target = tooltipForEventTarget(event.target);
  if (target) showTooltip(target);
});
document.addEventListener("pointerout", (event) => {
  const target = tooltipForEventTarget(event.target),
    related = event.relatedTarget;
  const focused = target && target.contains(document.activeElement);
  if (
    target &&
    !(related instanceof Node && target.contains(related)) &&
    !focused
  )
    hideTooltip(target);
});
document.addEventListener("focusin", (event) => {
  const target = tooltipForEventTarget(event.target);
  if (target)
    showTooltip(
      target,
      event.target instanceof HTMLElement || event.target instanceof SVGElement
        ? event.target
        : null,
    );
});
document.addEventListener("focusout", (event) => {
  const target = tooltipForEventTarget(event.target),
    related = event.relatedTarget;
  if (
    target &&
    !(related instanceof Node && target.contains(related)) &&
    !target.matches(":hover")
  )
    hideTooltip(target);
});
window.addEventListener("resize", placeTooltip);
window.addEventListener("scroll", placeTooltip, true);

/* ---------- poster markup ---------- */
function posterInner(res, stl, pal, D) {
  let o = `<rect width="${D.W}" height="${D.H}" fill="${pal.paper}"/><g text-rendering="geometricPrecision">`;
  for (const c of res.cells) {
    if (c.bad) continue;
    const q = qs[c.q],
      st = stl[c.q],
      m = c.m,
      s = c.s;
    const col = [pal.ink, pal.a1, pal.a2][st.color] || pal.ink;
    const attrs = `font-family="${ffam(m.f)}" font-weight="${m.wt}" font-style="${m.it ? "italic" : "normal"}" font-size="${s}" fill="${col}"`;
    let t = "",
      au = "";
    c.lines.forEach((ln, k) => {
      const by = c.top + c.off + k * c.P + s * 0.8;
      if (ln.idx.length) {
        const set = lineSet(c, ln);
        let x = set.x,
          ts = "";
        ln.idx.forEach((i) => {
          const w = m.caps ? q.tokens[i].toUpperCase() : q.tokens[i];
          ts += `<tspan x="${x.toFixed(2)}">${esc(w)}</tspan>`;
          x += m.w[i] * s + set.ls * m.len[i] + set.gap;
        });
        const lsAttr =
          m.track * s + set.ls
            ? ` letter-spacing="${(m.track * s + set.ls).toFixed(3)}"`
            : "";
        t += `<text y="${by.toFixed(2)}"${lsAttr}>${ts}</text>`;
      }
      if (ln.author) {
        au = `<text x="${(ln.x0 + ln.W).toFixed(2)}" y="${by.toFixed(2)}" text-anchor="end" font-family="${ffam(m.f)}" font-size="${c.a}" font-style="italic" font-weight="400" fill="${pal.ink}" fill-opacity="0.55">${esc(q.author)}</text>`;
      }
    });
    o += `<g ${attrs}>${t}</g>${au}`;
  }
  return o + "</g>";
}
function overlayInner(res, activeTree = tree) {
  let o = "";
  const selectedLeaf = sel >= 0 && activeTree ? leafOf(activeTree, sel) : null;
  const selectedNodes = selectedLeaf
    ? new Set(Object.values(edgeSeams(activeTree, selectedLeaf)))
    : new Set();
  const activeNode =
    drag && drag.type === "seam"
      ? res.nodes[drag.id]
      : hoverNodeId >= 0
        ? res.nodes[hoverNodeId]
        : null;
  const affected = new Set();
  if (previewingEmph)
    res.cells.forEach((c) => {
      affected.add(c.q);
    });
  if (geometryPreview && selectedLeaf) {
    Object.values(edgeSeams(activeTree, selectedLeaf)).forEach((node) => {
      const I = [],
        L = [];
      collect(node, I, L);
      L.forEach((l) => {
        affected.add(l.q);
      });
    });
  }
  if (activeNode) {
    const I = [],
      L = [];
    collect(activeNode.node, I, L);
    L.forEach((l) => {
      affected.add(l.q);
    });
  }
  for (const c of res.cells) {
    const classes = ["hit"];
    if (sel === c.q) classes.push("sel");
    if (focusQ === c.q) classes.push("focus");
    if (affected.has(c.q)) classes.push("affected");
    if (drag && drag.type === "swap" && drag.source === c.q)
      classes.push("swap-source");
    if (drag && drag.type === "swap" && drag.destination === c.q)
      classes.push("drop-target");
    if (swapMode && swapDestination === c.q) classes.push("drop-target");
    o += `<path class="${classes.join(" ")}" data-q="${c.q}" aria-label="Quote ${c.q + 1}" d="${regionPath(c.region)}"/>`;
  }
  res.nodes.forEach((n, id) => {
    const selected =
      selectedNodes.has(n.node) || (activeNode && activeNode.node === n.node);
    o += `<path class="seamhit-${n.node.d}${selected ? " selected" : ""}" data-n="${id}" data-tooltip="Drag to adjust this shared seam. Focus it and use arrow keys for small nudges." tabindex="0" role="slider" aria-label="Adjust shared seam ${id + 1}" aria-valuemin="-0.8" aria-valuemax="0.8" aria-valuenow="${(n.node.s || 0).toFixed(2)}" d="${seamPath(n.G, n.c)}" fill="none"/>`;
    o += `<path class="seam${selected ? " selected" : ""}" d="${seamPath(n.G, n.c)}" fill="none"/>`;
  });
  return o;
}
function render() {
  const empty = !qs.length;
  [
    $("bReroll"),
    $("bRefine"),
    $("bSeed"),
    $("bCopy"),
    $("bDownloadSVG"),
    $("bDownloadPNG"),
  ].forEach((button) => {
    button.disabled = empty;
  });
  if (!tree || empty) {
    curRes = null;
    stage.innerHTML =
      '<rect width="2000" height="1000" fill="white"/><text x="1000" y="510" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#777777">No quotes yet</text>';
    stage.setAttribute("viewBox", "0 0 2000 1000");
    return;
  }
  const D = dims();
  curRes = evaluate(tree, sts(), D);
  stage.setAttribute("viewBox", `0 0 ${D.W} ${D.H}`);
  stage.style.touchAction = "auto";
  let visibleTree = tree,
    visibleRes = curRes;
  if (
    drag &&
    drag.type === "swap" &&
    drag.destination >= 0 &&
    drag.source !== drag.destination
  ) {
    visibleTree = clone(tree);
    const leaves = [];
    collect(visibleTree, [], leaves);
    const a = leaves.find((leaf) => leaf.q === drag.source),
      b = leaves.find((leaf) => leaf.q === drag.destination);
    if (a && b) {
      [a.q, b.q] = [b.q, a.q];
      visibleRes = evaluate(visibleTree, sts(), D);
    }
  }
  stage.innerHTML =
    posterInner(visibleRes, sts(), PALS[cfg.pal], D) +
    overlayInner(visibleRes, visibleTree);
  updateFontSizeReadout();
}
