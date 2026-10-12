/* ---------- busy / progress ---------- */
function setBusy(on, msg) {
  if (on && !busy) {
    busyDisabled = new Map();
    document
      .querySelectorAll("button, input, select, textarea")
      .forEach((el) => {
        if (
          el instanceof HTMLButtonElement ||
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement
        ) {
          busyDisabled.set(el, el.disabled);
          if (el.id !== "bCancel") el.disabled = true;
        }
      });
  } else if (!on && busy) {
    busyDisabled.forEach((disabled, el) => {
      el.disabled = disabled;
    });
    busyDisabled.clear();
  }
  busy = on;
  $("bCancel").hidden = !on;
  if (msg) say(msg);
  if (!on) $("progBar").style.width = "0";
}
function cancelActive(msg = "Canceled. The previous poster is unchanged.") {
  runToken++;
  const previous = busySnapshot;
  busySnapshot = "";
  setBusy(false, msg);
  if (previous) {
    restore(previous);
    lastSnap = previous;
  }
}
progressCb = (p) => {
  $("progBar").style.width = (p * 100).toFixed(0) + "%";
};

function applyEntry(e) {
  tree = e.tree;
  qs.forEach((q, i) => {
    q.st = { ...e.sts[i] };
  });
}
async function regenerate(opts = {}) {
  busySnapshot = opts.restore || snap();
  activeContrast = cfg.contrast;
  activeRound = cfg.round;
  const token = ++runToken;
  setBusy(true, "Packing layouts…");
  const n = opts.n || effortN();
  const top = await search(cfg.seed, n, 3, token);
  if (token !== runToken || !top) {
    if (token === runToken) cancelActive();
    return;
  }
  say("Fitting seams to the text…");
  let best = null;
  for (let i = 0; i < top.length; i++) {
    await tick();
    if (token !== runToken) return;
    const t = tighten(top[i], 140, cfg.seed + i);
    if (!best || t.score < best.score) best = t;
  }
  applyEntry(best);
  busySnapshot = "";
  setBusy(false);
  markGenPrefsApplied();
  render();
  updateSel();
  commit();
  say(`Best of ${n} layouts, seed ${cfg.seed}.`);
}
async function reroll() {
  const previous = snap();
  cfg.seed = 1 + ((Math.random() * 99999) | 0);
  $("seed").value = String(cfg.seed);
  await regenerate({ restore: previous });
}
async function refine() {
  busySnapshot = snap();
  const token = ++runToken;
  setBusy(true, "Refining…");
  const r = await anneal(token, 1300);
  if (token !== runToken || !r) {
    if (token === runToken) cancelActive();
    return;
  }
  const t = {
    score: r.to,
    tree: r.entry.tree,
    sts: r.entry.sts,
    res: evaluate(r.entry.tree, r.entry.sts, dims()),
  };
  busySnapshot = "";
  setBusy(false);
  if (t.score < r.from - 1e-6) {
    applyEntry(t);
    render();
    updateSel();
    commit();
    say("Refined. The layout scores better than before.");
  } else say("Nothing better found. Try New layout, or run Refine again.");
}
/* ---------- events ---------- */
document.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  )
    return;
  const key = event.key.toLowerCase();
  if (key === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  } else if (key === "y" && !event.shiftKey) {
    event.preventDefault();
    redo();
  }
});
$("bReroll").addEventListener("click", reroll);
$("bRefine").addEventListener("click", () => refine());
$("bUndo").addEventListener("click", undo);
$("bRedo").addEventListener("click", redo);
$("bSeed").addEventListener("click", () => regenerate());
$("bCancel").addEventListener("click", () => cancelActive());
$("bCopy").addEventListener("click", async () => {
  say("Preparing embedded fonts…");
  const result = await exportSVG();
  await copyText(result.svg, "SVG");
  if (result.external)
    say(
      `SVG copied with ${result.embedded} embedded font faces; ${result.external} still use online fallback.`,
    );
});
$("bDownloadSVG").addEventListener("click", downloadSVG);
$("bDownloadPNG").addEventListener("click", downloadPNG);
$("bDownloadPDF").addEventListener("click", downloadPDF);
$("bCopyJson").addEventListener("click", () => copyText(toJSON(), "Settings"));
$("bLoadJson").addEventListener("click", () => {
  if (!$("io").value.trim()) {
    $("ioBox").open = true;
    $("io").focus();
    say(
      "Paste settings JSON in the Save / load field, then click Load settings.",
    );
    return;
  }
  loadJSON();
});
$("bApply").addEventListener("click", async () => {
  if (busy) return;
  const text = $("quotesText").value;
  if (!parseQuotes(text).length) {
    qs = [];
    tree = null;
    sel = -1;
    finishQuoteChange("All quotes removed.");
    return;
  }
  const previous = snap();
  busySnapshot = previous;
  const token = ++runToken;
  setQuotes(text, false);
  const pool = mulberry32(cfg.seed);
  qs.forEach((q) => {
    if (!q.st) q.st = randStyle(pool, q);
  });
  saveLocal();
  setBusy(true, "Loading typefaces…");
  await loadFonts();
  if (token !== runToken) return;
  await regenerate({ restore: previous });
});

$("aspect").addEventListener("change", async (e) => {
  const next = selectFromEvent(e).value;
  if (busy) {
    $("aspect").value = cfg.aspect;
    say("Wait for the current search to finish before changing format.");
    return;
  }
  cfg.aspect = next;
  saveLocal();
  if (!qs.length) {
    render();
    commit();
    return;
  }
  say("Format changed — packing a new layout…");
  await regenerate();
});
$("effort").addEventListener("change", (e) => {
  cfg.effort = selectFromEvent(e).value;
  saveLocal();
  updateGenPrefsHint();
  commit();
});
$("layoutStyle").addEventListener("change", (event) => {
  const style = selectFromEvent(event).value;
  const presets = {
    chaotic: { contrast: 0.55, shaped: 0.82, round: 0.12, symmetry: 0.16 },
    structured: { contrast: 0.28, shaped: 0.12, round: 0, symmetry: 0.94 },
    masonry: { contrast: 0.38, shaped: 0.4, round: 0.14, symmetry: 0.7 },
  };
  if (!presets[style]) {
    cfg.layoutStyle = "custom";
    saveLocal();
    updateGenPrefsHint();
    commit();
    return;
  }
  cfg.layoutStyle = style;
  Object.assign(cfg, presets[style]);
  syncControls();
  saveLocal();
  updateGenPrefsHint();
  commit();
  say(`${style[0].toUpperCase()}${style.slice(1)} layout settings selected.`);
});
$("seed").addEventListener("change", (e) => {
  const input = inputFromEvent(e);
  cfg.seed = clamp(parseInt(input.value, 10) || 1, 1, 999999);
  input.value = String(cfg.seed);
  saveLocal();
  commit();
});
$("paletteSwatches").addEventListener("click", (e) => {
  const button =
    e.target instanceof Element ? e.target.closest("[data-palette]") : null;
  if (!button) return;
  cfg.pal = /** @type {HTMLElement} */ (button).dataset.palette || cfg.pal;
  renderPaletteSwatches();
  renderAccentSwatches();
  render();
  saveLocal();
  commit();
});
function updateGap(value) {
  cfg.gap = clamp(+value || 0, 0, 40);
  $("gap").value = String(cfg.gap);
  $("gapNum").value = String(cfg.gap);
  render();
  saveLocal();
}
$("gap").addEventListener("input", (e) => updateGap(inputFromEvent(e).value));
$("gapNum").addEventListener("input", (e) =>
  updateGap(inputFromEvent(e).value),
);
$("gap").addEventListener("change", commit);
$("gapNum").addEventListener("change", commit);
$("seams").addEventListener("change", (e) => {
  cfg.seams = inputFromEvent(e).checked;
  saveLocal();
  render();
  commit();
});
$("contrast").addEventListener("input", (e) => {
  cfg.contrast = +inputFromEvent(e).value;
  markLayoutCustom();
  $("contrastV").textContent = strength(cfg.contrast, [
    "Subtle",
    "Gentle",
    "Balanced",
    "Strong",
    "Dramatic",
  ]);
  saveLocal();
  updateGenPrefsHint();
});
$("shaped").addEventListener("input", (e) => {
  cfg.shaped = +inputFromEvent(e).value;
  markLayoutCustom();
  $("shapedV").textContent = strength(cfg.shaped, [
    "Fewer",
    "Light",
    "Balanced",
    "Many",
    "More",
  ]);
  saveLocal();
  updateGenPrefsHint();
});
$("round").addEventListener("input", (e) => {
  cfg.round = +inputFromEvent(e).value;
  markLayoutCustom();
  $("roundV").textContent = strength(cfg.round, [
    "None",
    "Light",
    "Balanced",
    "Many",
    "More",
  ]);
  saveLocal();
  updateGenPrefsHint();
});
$("symmetry").addEventListener("input", (e) => {
  cfg.symmetry = +inputFromEvent(e).value;
  markLayoutCustom();
  $("symmetryV").textContent = strength(cfg.symmetry, [
    "Freeform",
    "Low",
    "Balanced",
    "High",
    "Symmetrical",
  ]);
  saveLocal();
  updateGenPrefsHint();
});
$("contrast").addEventListener("change", () =>
  finishPreference("contrast", 0.02, 0, 0.7),
);
$("shaped").addEventListener("change", () =>
  finishPreference("shaped", 0.05, 0, 1),
);
$("round").addEventListener("change", () =>
  finishPreference("round", 0.05, 0, 1),
);
$("symmetry").addEventListener("change", () =>
  finishPreference("symmetry", 0.05, 0, 1),
);
$("color").addEventListener("input", (e) => {
  cfg.color = +inputFromEvent(e).value;
  $("colorV").textContent = `${Math.round(cfg.color * 100)}%`;
  saveLocal();
  updateGenPrefsHint();
});
$("color").addEventListener("change", () =>
  finishPreference("color", 0.02, 0, 0.8),
);
/** @type {NodeListOf<HTMLInputElement>} */
const moodInputs = document.querySelectorAll("input[data-mood]");
moodInputs.forEach((i) =>
  i.addEventListener("change", () => {
    const mood = i.dataset.mood;
    if (mood) cfg.moods[mood] = i.checked ? 1 : 0;
    const active = Object.values(cfg.moods).some(Boolean);
    if (!active) {
      i.checked = true;
      if (mood) cfg.moods[mood] = 1;
      say("Choose at least one typeface category.");
      return;
    }
    cfg.fontPair = "custom";
    saveLocal();
    syncControls();
    updateGenPrefsHint();
    commit();
  }),
);
$("moodPresets").addEventListener("click", (e) => {
  const button =
    e.target instanceof Element ? e.target.closest("[data-preset]") : null;
  if (!button) return;
  const key = /** @type {HTMLElement} */ (button).dataset.preset;
  const preset = key && MOOD_PRESETS[key];
  if (!preset) return;
  cfg.moods = { ...preset };
  cfg.fontPair = "custom";
  saveLocal();
  syncControls();
  updateGenPrefsHint();
  commit();
  say(`Mood preset: ${key}. Applies on next New layout.`);
});
$("fontPairings").addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest("[data-pairing]")
      : null;
  if (!button) return;
  const key = /** @type {HTMLElement} */ (button).dataset.pairing || "custom";
  cfg.fontPair = key;
  const pairing = FONT_PAIRINGS[key];
  if (pairing)
    cfg.moods = {
      serif: Number(pairing.moods.includes("serif")),
      sans: Number(pairing.moods.includes("sans")),
      display: Number(pairing.moods.includes("display")),
      script: Number(pairing.moods.includes("script")),
      mono: Number(pairing.moods.includes("mono")),
    };
  syncControls();
  saveLocal();
  updateGenPrefsHint();
  commit();
  say(
    pairing
      ? "Font pairing selected. Applies on the next layout."
      : "Custom font categories selected.",
  );
});

$("selFont").addEventListener("change", (e) =>
  editSel((st) => {
    const previous = FONTMAP[st.font],
      weight = (previous && previous.w[st.wi]) || 400,
      italic = st.italic;
    const f = FONTMAP[selectFromEvent(e).value];
    st.font = f.n;
    st.wi = f.w.reduce(
      (best, item, i) =>
        Math.abs(item - weight) < Math.abs(f.w[best] - weight) ? i : best,
      0,
    );
    st.italic = f.i ? italic : 0;
  }),
);
$("selWeight").addEventListener("change", (e) =>
  editSel((st) => {
    const f = FONTMAP[st.font];
    const i = f.w.indexOf(+selectFromEvent(e).value);
    st.wi = i < 0 ? 0 : i;
  }),
);
$("selItalic").addEventListener("change", (e) =>
  editSel((st) => {
    st.italic = inputFromEvent(e).checked ? 1 : 0;
  }),
);
$("selCaps").addEventListener("change", (e) =>
  editSel((st) => {
    st.caps = inputFromEvent(e).checked ? 1 : 0;
  }),
);
$("selectedColors").addEventListener("click", (e) => {
  const button =
    e.target instanceof Element ? e.target.closest("[data-color]") : null;
  if (button)
    editSel((st) => {
      st.color = +(/** @type {HTMLElement} */ (button).dataset.color);
    });
});
function updateFontSizeReadout() {
  const quote = qs[sel],
    cell = curRes?.cells.find((item) => item.q === sel);
  if (!quote || !cell) return;
  const limited = quote.fontSize !== null && cell.s < quote.fontSize - 0.01;
  $("selFontSizeV").textContent =
    `${cell.s.toFixed(2)} px${limited ? " (fit limit)" : quote.fontSize === null ? " (auto)" : ""}`;
}
function updateFontSize(value) {
  if (sel < 0) return;
  const target = value.trim() === "" ? null : Number(value);
  if (target !== null && (!Number.isFinite(target) || target <= 0)) return;
  qs[sel].fontSize = target === null ? null : clamp(target, 0.1, 2000);
  render();
  updateFontSizeReadout();
}
$("selFontSize").addEventListener("input", (e) => {
  const input = inputFromEvent(e);
  if (!input.validity.badInput) updateFontSize(input.value);
});
$("selFontSize").addEventListener("change", (e) => {
  updateFontSize(inputFromEvent(e).value);
  updateSel();
  commit();
});
function updateEmph(value) {
  if (sel < 0) return;
  previewingEmph = true;
  qs[sel].emph = clamp(+value || 1, 0.5, 2.5);
  $("selEmph").value = String(qs[sel].emph);
  $("selEmphNum").value = String(qs[sel].emph);
  $("selEmphV").textContent =
    qs[sel].emph === 1 ? "1.0× neutral" : `${qs[sel].emph.toFixed(2)}× target`;
  render();
  updateSel();
}
$("selEmph").addEventListener("input", (e) =>
  updateEmph(inputFromEvent(e).value),
);
$("selEmphNum").addEventListener("input", (e) =>
  updateEmph(inputFromEvent(e).value),
);
$("selEmph").addEventListener("change", () => {
  previewingEmph = false;
  render();
  commit();
});
$("selEmphNum").addEventListener("change", () => {
  previewingEmph = false;
  render();
  commit();
});
$("selReroll").addEventListener("click", () => {
  if (sel < 0) return;
  qs[sel].st = randStyle(Math.random, qs[sel]);
  render();
  updateSel();
  commit();
});
$("selRound").addEventListener("click", () => {
  if (sel < 0 || !tree) return;
  if ($("selRound").getAttribute("aria-disabled") === "true") {
    say($("selRound").dataset.tooltip);
    return;
  }
  if (
    !roundify(
      tree,
      leafOf(tree, sel),
      Math.random,
      layTree(tree, sts(), dims()),
    )
  ) {
    say("This piece has no seam to its left or right to round.");
    return;
  }
  render();
  updateSel();
  commit();
  say(
    $("edgeState").textContent === "Straight boundaries"
      ? "The layout could not keep rounded sides under current fit constraints."
      : "Round sides applied.",
  );
});
$("selShape").addEventListener("click", () => {
  if (sel < 0 || !tree) return;
  if ($("selShape").getAttribute("aria-disabled") === "true") {
    say($("selShape").dataset.tooltip);
    return;
  }
  const ed = Object.values(edgeSeams(tree, leafOf(tree, sel)));
  if (!ed.length) return;
  ed.forEach((nd) => {
    nd.e = randomSeam(Math.random, nd.d, true);
  });
  render();
  updateSel();
  commit();
  say(
    `Boundary profiles updated. Effective state: ${$("edgeState").textContent.toLowerCase()}.`,
  );
});
$("selFlat").addEventListener("click", () => {
  if (sel < 0 || !tree) return;
  if ($("selFlat").getAttribute("aria-disabled") === "true") {
    say($("selFlat").dataset.tooltip);
    return;
  }
  Object.values(edgeSeams(tree, leafOf(tree, sel))).forEach((nd) => {
    nd.e = { ...FLAT };
  });
  render();
  updateSel();
  commit();
  say(
    `Boundary profiles straightened. Effective state: ${$("edgeState").textContent.toLowerCase()}.`,
  );
});
$("selShapeCycle").addEventListener("click", () => {
  if (sel < 0 || busy) return;
  const shapes =
    /** @type {{name:string,key:NonNullable<Quote["shapeTarget"]>,emph:number}[]} */ ([
      { name: "Square", key: "square", emph: 1 },
      { name: "Wide", key: "wide", emph: 1.7 },
      { name: "Tall", key: "tall", emph: 0.65 },
    ]);
  const currentIndex = shapes.findIndex(
    (shape) => shape.key === qs[sel].shapeTarget,
  );
  const next = shapes[(currentIndex + 1) % shapes.length];
  qs[sel].shapeTarget = next.key;
  qs[sel].emph = next.emph;
  const fitted = reflowShapeTarget(tree, sel, sts(), dims());
  render();
  updateSel();
  saveLocal();
  commit();
  say(
    fitted
      ? `${next.name} proportion applied; neighboring regions reflowed.`
      : `${next.name} target set; the current tree cannot fit that proportion more closely.`,
  );
});
function bindGeometryPreview(button, action) {
  button.addEventListener("pointerenter", () => {
    geometryPreview = action;
    render();
  });
  button.addEventListener("pointerleave", () => {
    geometryPreview = "";
    render();
  });
  button.addEventListener("focus", () => {
    geometryPreview = action;
    render();
  });
  button.addEventListener("blur", () => {
    geometryPreview = "";
    render();
  });
}
bindGeometryPreview($("selRound"), "round");
bindGeometryPreview($("selShape"), "shape");
bindGeometryPreview($("selFlat"), "flat");

function resetPoster() {
  cfg.aspect = DEFAULT_CFG.aspect;
  cfg.gap = DEFAULT_CFG.gap;
  cfg.seams = DEFAULT_CFG.seams;
  cfg.pal = DEFAULT_CFG.pal;
  syncControls();
  render();
  saveLocal();
  commit();
}
function resetGenerate() {
  for (const key of [
    "contrast",
    "color",
    "shaped",
    "round",
    "symmetry",
    "effort",
    "seed",
  ])
    cfg[key] = DEFAULT_CFG[key];
  cfg.moods = clone(DEFAULT_CFG.moods);
  cfg.fontPair = DEFAULT_CFG.fontPair;
  cfg.layoutStyle = DEFAULT_CFG.layoutStyle;
  syncControls();
  saveLocal();
  updateGenPrefsHint();
  commit();
}
function resetSelectedQuote() {
  if (sel < 0) return;
  const font = FONTMAP.Georgia;
  qs[sel].st = {
    font: font.n,
    wi: regIndex(font),
    italic: 0,
    caps: 0,
    color: 0,
    lock: 0,
    jit: 1,
  };
  qs[sel].emph = 1;
  qs[sel].fontSize = null;
  qs[sel].shapeTarget = null;
  for (const node of Object.values(edgeSeams(tree, leafOf(tree, sel)))) {
    node.e = { ...FLAT };
    node.s = 0;
  }
  render();
  updateSel();
  saveLocal();
  commit();
}
$("bResetPoster").addEventListener("click", resetPoster);
$("bResetGenerate").addEventListener("click", resetGenerate);
$("bResetSelected").addEventListener("click", resetSelectedQuote);
$("bClearJSON").addEventListener("click", () => {
  $("io").value = "";
});
$("bResetQuotes").addEventListener("click", () => {
  $("quotesText").value = DEFAULT_QUOTES;
  $("bApply").click();
});
$("emptyStarters").addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest("[data-starter]")
      : null;
  if (!button || busy) return;
  const key = /** @type {HTMLElement} */ (button).dataset.starter || "";
  const content = STARTER_BUNDLES[key];
  if (!content) return;
  $("quotesText").value = content;
  $("bApply").click();
});
$("stage").addEventListener("focus", () =>
  $("stage").classList.add("has-focus"),
);
$("stage").addEventListener("blur", () =>
  $("stage").classList.remove("has-focus"),
);
function syncInspectorViewport() {
  $("inspector").hidden = sel < 0;
  $("inspector").open = sel >= 0;
}
window.addEventListener("resize", syncInspectorViewport);
syncInspectorViewport();
$("panel").addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (swapMode) {
    swapMode = false;
    swapDestination = -1;
    render();
    say("Swap canceled.");
  } else if (sel >= 0) {
    sel = -1;
    render();
    updateSel();
  }
});

function svgPoint(e) {
  const pt = stage.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}
let lastTilePointer = { index: -1, time: 0 };
let inlineEditClick = false;
stage.addEventListener("pointerdown", (e) => {
  if (busy) return;
  if (!(e.target instanceof Element)) return;
  const tile = e.target.closest(".hit");
  if (tile) {
    const index = +(/** @type {HTMLElement} */ (tile).dataset.q);
    const now = performance.now();
    if (
      e.detail >= 2 ||
      (lastTilePointer.index === index && now - lastTilePointer.time < 900)
    ) {
      lastTilePointer = { index: -1, time: 0 };
      inlineEditClick = true;
      bodyGesture = null;
      e.preventDefault();
      openQuoteEditor(index);
      return;
    }
    lastTilePointer = { index, time: now };
  }
  const h = e.target.closest("[data-n]");
  if (h) {
    e.preventDefault();
    const id = +(/** @type {HTMLElement} */ (h).dataset.n);
    const pairedId = Number(/** @type {HTMLElement} */ (h).dataset.n2);
    const ids = [id, ...(Number.isInteger(pairedId) ? [pairedId] : [])];
    const nodes = ids
      .map((nodeId) => curRes && curRes.nodes[nodeId]?.node)
      .filter((node) => !!node);
    drag = {
      type: "seam",
      id,
      ids,
      nodes,
      initials: nodes.map((node) => node.s || 0),
      node: nodes[0],
      initial: nodes[0] ? nodes[0].s || 0 : 0,
      ghostPath: ids
        .map((nodeId) => {
          const info = curRes && curRes.nodes[nodeId];
          return info ? seamPath(info.G, info.c) : "";
        })
        .join(" "),
    };
    stage.setPointerCapture(e.pointerId);
    return;
  }
  const hit = e.target.closest(".hit");
  if (hit)
    bodyGesture = {
      q: +(/** @type {HTMLElement} */ (hit).dataset.q),
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
});
stage.addEventListener("pointermove", (e) => {
  if (busy) return;
  if (!drag) {
    const hovered =
      e.target instanceof Element ? e.target.closest("[data-n]") : null;
    const id = hovered ? +(/** @type {HTMLElement} */ (hovered).dataset.n) : -1;
    if (id !== hoverNodeId) {
      hoverNodeId = id;
      render();
    }
  }
  if (
    !drag &&
    bodyGesture &&
    e.pointerId === bodyGesture.pointerId &&
    Math.hypot(e.clientX - bodyGesture.x, e.clientY - bodyGesture.y) >= 5
  ) {
    drag = { type: "swap", source: bodyGesture.q, destination: -1 };
    stage.setPointerCapture(e.pointerId);
  }
  if (drag && drag.type === "swap") {
    const point = document.elementFromPoint(e.clientX, e.clientY);
    const target = point instanceof Element ? point.closest(".hit") : null;
    const destination = target
      ? +(/** @type {HTMLElement} */ (target).dataset.q)
      : -1;
    if (destination !== drag.destination) {
      drag.destination = destination;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          render();
        });
    }
    e.preventDefault();
    return;
  }
  if (!drag || drag.type !== "seam" || !curRes) return;
  const p = svgPoint(e);
  for (const id of drag.ids || [drag.id]) {
    const nd = curRes.nodes[id];
    if (nd)
      adjustSeam(
        tree,
        nd.node,
        dragFrac(nd, p.x, p.y) - nd.base,
        sts(),
        dims(),
      );
  }
  if (!raf)
    raf = requestAnimationFrame(() => {
      raf = 0;
      render();
    });
});
stage.addEventListener("pointerup", () => {
  if (drag && drag.type === "seam") {
    drag = null;
    commit();
    render();
  } else if (drag && drag.type === "swap") {
    const { source, destination } = drag;
    drag = null;
    bodyGesture = null;
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (destination >= 0 && source !== destination)
      swapQuotes(source, destination);
    else render();
  } else bodyGesture = null;
});
stage.addEventListener("pointercancel", () => cancelGesture());
stage.addEventListener("pointerleave", () => {
  if (hoverNodeId >= 0 && !drag) {
    hoverNodeId = -1;
    render();
  }
});
stage.addEventListener("keydown", (e) => {
  if (busy) return;
  if ((e.key === "Delete" || e.key === "Backspace") && sel >= 0) {
    e.preventDefault();
    deleteQuote(sel);
    return;
  }
  const handle =
    e.target instanceof Element ? e.target.closest("[data-n]") : null;
  if (handle && e.key.startsWith("Arrow")) {
    const id = +(/** @type {HTMLElement} */ (handle).dataset.n);
    const nd = curRes && curRes.nodes[id];
    if (nd) {
      const delta =
        e.key === "ArrowRight" || e.key === "ArrowDown" ? 0.01 : -0.01;
      for (const id of [
        +(/** @type {HTMLElement} */ (handle).dataset.n),
        ...(Number.isInteger(
          Number(/** @type {HTMLElement} */ (handle).dataset.n2),
        )
          ? [Number(/** @type {HTMLElement} */ (handle).dataset.n2)]
          : []),
      ]) {
        const info = curRes && curRes.nodes[id];
        if (info)
          adjustSeam(
            tree,
            info.node,
            (info.node.s || 0) + delta,
            sts(),
            dims(),
          );
      }
      render();
      /** @type {SVGPathElement|null} */ (
        stage.querySelector(`[data-n="${id}"]`)
      )?.focus();
      commit();
      e.preventDefault();
    }
    return;
  }
  if (e.key === "Escape") {
    if (drag) cancelGesture();
    else if (swapMode) {
      swapMode = false;
      swapDestination = -1;
      render();
      say("Swap canceled.");
    } else if (sel >= 0) {
      sel = -1;
      render();
      updateSel();
    }
    e.preventDefault();
    return;
  }
  if ((e.key === "s" || e.key === "S") && sel >= 0) {
    swapMode = !swapMode;
    swapDestination = -1;
    focusQ = sel;
    render();
    say(
      swapMode
        ? "Swap mode. Use arrow keys to choose a tile, then Enter."
        : "Swap canceled.",
    );
    e.preventDefault();
    return;
  }
  if (e.key.startsWith("Arrow") && qs.length) {
    focusQ =
      (focusQ +
        (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) +
        qs.length) %
      qs.length;
    if (swapMode) {
      swapDestination = focusQ === sel ? -1 : focusQ;
    }
    render();
    e.preventDefault();
  } else if (e.key === "Enter" || e.key === " ") {
    if (swapMode && focusQ !== sel) {
      const destination = focusQ;
      swapMode = false;
      swapDestination = -1;
      swapQuotes(sel, destination);
    } else if (swapMode) say("Choose a different tile with the arrow keys.");
    else {
      sel = sel === focusQ ? -1 : focusQ;
      render();
      updateSel();
    }
    e.preventDefault();
  }
});
stage.addEventListener("click", (e) => {
  if (busy) return;
  if (inlineEditClick) {
    inlineEditClick = false;
    return;
  }
  stage.focus({ preventScroll: true });
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (!(e.target instanceof Element)) return;
  const hit = e.target.closest(".hit");
  if (hit) {
    const index = +(/** @type {HTMLElement} */ (hit).dataset.q);
    if (e.detail === 2) openQuoteEditor(index);
    else pickCell(index);
  } else if (!e.target.closest("[data-n]") && sel >= 0) {
    sel = -1;
    swapMode = false;
    render();
    updateSel();
  }
});
