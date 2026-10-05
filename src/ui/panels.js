/* ---------- selection panel ---------- */
const wLabel = {
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};
function buildFontSelect(cur) {
  const list = FONTS.filter((f) => avail.has(f.n));
  const base = list.length ? list : SYS;
  const names = new Set(base.map((f) => f.n));
  const extra = cur && !names.has(cur) && FONTMAP[cur] ? [FONTMAP[cur]] : [];
  const groups = {};
  base.concat(extra).forEach((f) => (groups[f.c] = groups[f.c] || []).push(f));
  const label = {
    serif: "Serif",
    sans: "Sans",
    display: "Display",
    script: "Script",
    mono: "Mono",
  };
  $("selFont").innerHTML = Object.keys(groups)
    .map(
      (g) =>
        `<optgroup label="${label[g]}">${groups[g].map((f) => `<option value="${f.n}">${f.n}${!f.sys && !avail.has(f.n) ? " (unavailable; fallback)" : ""}</option>`).join("")}</optgroup>`,
    )
    .join("");
}
function updateSel() {
  const q = qs[sel];
  renderQuoteList();
  syncInspectorViewport();
  $("selBody").hidden = !q;
  $("selHint").hidden = !!q;
  $("bResetSelected").disabled = !q;
  $("stage").setAttribute(
    "aria-label",
    q
      ? `Selected quote: ${q.text}`
      : "Quote poster. Use arrow keys to move focus between quotes, then Enter to select.",
  );
  if (!q) {
    swapMode = false;
    swapDestination = -1;
    $("selSwap").textContent = "Swap with…";
    $("swapHint").hidden = true;
    return;
  }
  const st = q.st,
    f = FONTMAP[st.font] || FONTS[0];
  $("selText").textContent =
    q.text.length > 90 ? q.text.slice(0, 88) + "…" : q.text;
  buildFontSelect(st.font);
  $("selFont").value = st.font;
  $("selFontSize").value = q.fontSize === null ? "" : String(q.fontSize);
  updateFontSizeReadout();
  $("selWeight").innerHTML = f.w
    .map((w) => `<option value="${w}">${wLabel[w] || w}</option>`)
    .join("");
  $("selWeight").value = String(f.w[st.wi] || f.w[0]);
  $("selWeight").disabled = !!(st.italic && f.i);
  $("selItalic").checked = !!st.italic;
  $("selItalic").disabled = !f.i;
  $("selCaps").checked = !!(st.caps || f.caps);
  $("selCaps").disabled = !!f.caps;
  const effectiveAlign =
    curRes.cells.find((cell) => cell.q === sel)?.eff || "justify";
  $("alignmentState").textContent =
    effectiveAlign === "justify"
      ? ""
      : `Justification falls back to ${effectiveAlign} alignment in this region.`;
  renderSelectedColors(st.color);
  $("selEmph").value = String(q.emph);
  $("selEmphNum").value = String(q.emph);
  $("selEmphV").textContent =
    q.emph === 1 ? "1.0× neutral" : `${q.emph.toFixed(2)}× target`;
  const edges = Object.values(edgeSeams(tree, leafOf(tree, sel)));
  const shaped = edges.filter((node) => {
    const fitted = curRes.nodes.find((info) => info.node === node);
    return (
      node.e && node.e.k !== "flat" && fitted && Math.abs(fitted.G.A) > 0.01
    );
  }).length;
  $("edgeState").textContent = !edges.length
    ? "No editable internal boundaries."
    : shaped === 0
      ? "Straight boundaries"
      : shaped === edges.length
        ? "Shaped boundaries"
        : "Mixed boundaries";
  const roundUnavailable = !edges.some((node) => node.d === "x"),
    edgesUnavailable = !edges.length;
  $("selRound").setAttribute("aria-disabled", String(roundUnavailable));
  $("selShape").setAttribute("aria-disabled", String(edgesUnavailable));
  $("selFlat").setAttribute("aria-disabled", String(edgesUnavailable));
  $("selRound").dataset.tooltip = roundUnavailable
    ? "Unavailable: this quote has no supported side seam to round."
    : "Rounds eligible shared side boundaries; neighboring quotes can be affected.";
  $("selShape").dataset.tooltip = edgesUnavailable
    ? "Unavailable: this quote has no editable internal boundary."
    : "Choose new profiles for this quote's nearest shared boundaries.";
  $("selFlat").dataset.tooltip = edgesUnavailable
    ? "Unavailable: this quote has no editable internal boundary."
    : "Straighten this quote's nearest shared boundaries.";
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  $("swapHint").hidden = !narrow;
  $("swapHint").textContent = swapMode
    ? swapDestination >= 0
      ? "Tap Swap again to confirm, or tap another quote."
      : "Tap another quote as the destination, then confirm."
    : "Tap Swap, then tap another quote to choose a destination.";
  $("selSwap").dataset.tooltip = narrow
    ? "Tap to start a swap, tap a destination quote, then confirm. Drag-swap is desktop-only."
    : "Select a destination quote, then confirm the swap.";
}
const paletteNames = {
  ink: "Ink on white",
  riso: "Blue riso",
  night: "Night",
  mono: "Newsprint",
  garden: "Garden",
  pool: "Poolside",
  rose: "Rose",
  marigold: "Marigold",
};
function renderPaletteSwatches() {
  $("paletteSwatches").innerHTML = Object.entries(PALS)
    .map(
      ([key, pal]) =>
        `<button class="palette-choice${cfg.pal === key ? " active" : ""}" type="button" data-palette="${key}" data-tooltip="${paletteNames[key]} palette with its paper, ink, and accent colors." aria-label="${paletteNames[key]}" aria-pressed="${cfg.pal === key}"><span class="swatch-trio"><i style="background:${pal.ink}"></i><i style="background:${pal.a1}"></i><i style="background:${pal.a2}"></i></span><span>${paletteNames[key]}</span></button>`,
    )
    .join("");
}
function renderSelectedColors(selected) {
  const pal = PALS[cfg.pal];
  const roles = [
    ["0", "Ink", pal.ink],
    ["1", "Accent 1", pal.a1],
    ["2", "Accent 2", pal.a2],
  ];
  $("selectedColors").innerHTML = roles
    .map(
      ([value, name, color]) =>
        `<button class="color-choice${String(selected) === value ? " active" : ""}" type="button" data-color="${value}" data-tooltip="Assign the ${name} color role to this quote." aria-label="${name}" aria-pressed="${String(selected) === value}"><i style="background:${color}"></i></button>`,
    )
    .join("");
}
function renderAccentSwatches() {
  const palette = PALS[cfg.pal];
  $("accentSwatches").innerHTML =
    `<span>Palette accents</span><i style="background:${palette.a1}" aria-hidden="true"></i><i style="background:${palette.a2}" aria-hidden="true"></i>`;
}
function editSel(fn, live) {
  if (sel < 0) return;
  const st = qs[sel].st;
  fn(st);
  render();
  updateSel();
  if (!live) commit();
}
function pickCell(i) {
  if (swapMode && sel >= 0) {
    swapDestination = i === sel ? -1 : i;
    $("selSwap").textContent =
      swapDestination >= 0 ? "Confirm swap" : "Choose destination";
    render();
    updateSel();
    say(
      swapDestination >= 0
        ? "Confirm the selected destination to swap."
        : "Choose another quote as the destination.",
    );
    return;
  }
  sel = sel === i ? -1 : i;
  focusQ = i;
  render();
  updateSel();
  if (lastSnap) lastSnap = snap();
  if (window.matchMedia("(max-width: 900px)").matches)
    $("inspector").open = sel >= 0;
}

/* ---------- quotes, fonts, settings ---------- */
function quoteSource() {
  return qs
    .map(
      (q) =>
        q.tokens
          .map((token, index) => token + (q.brAfter[index] ? "\n" : " "))
          .join("")
          .trim() + (q.author ? `\n— ${q.author}` : ""),
    )
    .join("\n\n");
}
function renderQuoteList() {
  $("quoteCount").textContent =
    `${qs.length} quote${qs.length === 1 ? "" : "s"}`;
  $("quotesEmpty").hidden = !!qs.length;
  $("quoteList").innerHTML = qs
    .map(
      (q, index) =>
        `<li class="quote-item${sel === index ? " selected" : ""}"><button type="button" class="quote-select" data-select-quote="${index}" aria-pressed="${sel === index}">${esc(q.text)}${q.author ? `<small>${esc(q.author)}</small>` : ""}</button><div class="btns"><button type="button" class="btn" data-edit-quote="${index}" aria-label="Edit quote ${index + 1}">Edit</button><button type="button" class="btn danger" data-delete-quote="${index}" aria-label="Delete quote ${index + 1}" data-tooltip="Delete this quote. Undo restores it.">Delete</button></div></li>`,
    )
    .join("");
}
function openQuoteEditor(index = -1) {
  if (busy) return;
  const q = qs[index];
  editingQuoteId = q ? q.id : null;
  $("quoteEditorTitle").textContent = q ? "Edit quote" : "Add quote";
  $("quoteText").value = q
    ? q.tokens
        .map((token, position) => token + (q.brAfter[position] ? "\n" : " "))
        .join("")
        .trim()
    : "";
  $("quoteAuthor").value = q ? q.author : "";
  $("quoteText").setCustomValidity("");
  $("quotesBox").open = true;
  $("quoteEditor").hidden = false;
  $("quoteText").focus();
}
function closeQuoteEditor() {
  editingQuoteId = null;
  $("quoteEditor").hidden = true;
}
function finishQuoteChange(message) {
  drag = null;
  bodyGesture = null;
  hoverNodeId = -1;
  swapMode = false;
  swapDestination = -1;
  $("selSwap").textContent = "Swap with…";
  focusQ = clamp(focusQ, 0, Math.max(0, qs.length - 1));
  mcache.clear();
  acache.clear();
  $("quotesText").value = quoteSource();
  closeQuoteEditor();
  saveLocal();
  render();
  updateSel();
  commit();
  say(message);
}
function deleteQuote(index) {
  if (busy || !qs[index]) return;
  const selectedId = qs[sel]?.id;
  const removeLeaf = (node) => {
    if (!node) return null;
    if ("q" in node) {
      if (node.q === index) return null;
      if (node.q > index) node.q--;
      return node;
    }
    node.a = removeLeaf(node.a);
    node.b = removeLeaf(node.b);
    return !node.a ? node.b : !node.b ? node.a : node;
  };
  tree = removeLeaf(tree);
  qs.splice(index, 1);
  sel = qs.findIndex((q) => q.id === selectedId);
  finishQuoteChange("Quote deleted.");
}
$("bAddQuote").addEventListener("click", () => openQuoteEditor());
$("bCancelQuote").addEventListener("click", () => {
  closeQuoteEditor();
  $("bAddQuote").focus();
});
$("selEdit").addEventListener("click", () => openQuoteEditor(sel));
$("selDelete").addEventListener("click", () => deleteQuote(sel));
$("quoteList").addEventListener("click", (event) => {
  const button =
    event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLButtonElement) || busy) return;
  if (button.dataset.selectQuote !== undefined) {
    pickCell(+button.dataset.selectQuote);
    return;
  }
  if (button.dataset.editQuote !== undefined) {
    openQuoteEditor(+button.dataset.editQuote);
    return;
  }
  if (button.dataset.deleteQuote !== undefined) {
    const index = +button.dataset.deleteQuote;
    deleteQuote(index);
    const next = $("quoteList").querySelectorAll("button[data-delete-quote]")[
      Math.min(index, qs.length - 1)
    ];
    if (next instanceof HTMLButtonElement) next.focus();
    else $("bAddQuote").focus();
  }
});
$("quoteText").addEventListener("input", () =>
  $("quoteText").setCustomValidity(""),
);
$("quoteEditor").addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) return;
  const text = $("quoteText")
    .value.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  if (!text) {
    $("quoteText").setCustomValidity("Enter a quote.");
    $("quoteText").reportValidity();
    return;
  }
  const author = $("quoteAuthor").value.replace(/\s+/g, " ").trim();
  const q = quoteFromFields(text, author);
  const index =
    editingQuoteId === null
      ? -1
      : qs.findIndex((quote) => quote.id === editingQuoteId);
  while (qs.some((quote, position) => position !== index && quote.id === q.id))
    q.id += "x";
  if (index >= 0) {
    const previous = qs[index];
    qs[index] = {
      ...q,
      st: previous.st,
      emph: previous.emph,
      fontSize: previous.fontSize,
    };
    sel = index;
  } else {
    q.st = randStyle(mulberry32(cfg.seed + qs.length), q);
    const newIndex = qs.length;
    const largest = curRes?.cells
      .filter((cell) => cell.box)
      .sort(
        (first, second) =>
          second.box.w * second.box.h - first.box.w * first.box.h,
      )[0];
    const target = largest ? largest.q : 0;
    /** @param {TreeNode} node @returns {TreeNode} */
    const insertLeaf = (node) => {
      if ("q" in node)
        return node.q === target
          ? {
              d: largest?.box && largest.box.w < largest.box.h ? "y" : "x",
              a: node,
              b: { q: newIndex },
              s: 0,
              e: { k: "flat", a: 0, p: 0.5, w: 1 },
            }
          : node;
      node.a = insertLeaf(node.a);
      node.b = insertLeaf(node.b);
      return node;
    };
    qs.push(q);
    tree = tree ? insertLeaf(tree) : { q: newIndex };
    assignIds(tree);
    sel = newIndex;
  }
  finishQuoteChange(index >= 0 ? "Quote updated." : "Quote added.");
  $("bAddQuote").focus();
});
function setQuotes(text, resetStyles) {
  closeQuoteEditor();
  const old = new Map(qs.map((q) => [q.id, q]));
  const next = parseQuotes(text);
  const seen = new Set();
  next.forEach((q) => {
    while (seen.has(q.id)) q.id += "x";
    seen.add(q.id);
    const o = old.get(q.id);
    if (o && !resetStyles) {
      q.st = { ...o.st };
      q.emph = o.emph;
      q.fontSize = o.fontSize ?? null;
    }
  });
  qs = next;
  tree = null;
  sel = -1;
  mcache.clear();
}
async function loadFonts() {
  const text = [...new Set(qs.map((q) => q.text).join("") + "abcABC")].join("");
  const jobs = FONTS.map((f) => {
    const specs = f.w.map((w) => `${w} 24px "${f.n}"`);
    if (f.i) specs.push(`italic 400 24px "${f.n}"`);
    return Promise.all(
      specs.map((s) =>
        document.fonts.load(s, text).then(
          (r) => r.length > 0,
          () => false,
        ),
      ),
    ).then((r) => {
      if (r[0]) avail.add(f.n);
    });
  });
  await Promise.race([
    Promise.all(jobs),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
  mcache.clear();
  acache.clear();
}
function saveLocal() {
  try {
    localStorage.setItem(
      "quote-quilt",
      JSON.stringify({ quotes: quoteSource(), cfg }),
    );
  } catch (e) {}
}
function restoreLocal() {
  try {
    const j = JSON.parse(localStorage.getItem("quote-quilt") || "null");
    if (j && typeof j.quotes === "string") {
      $("quotesText").value = j.quotes;
      const restoredCfg = normalizeImportedConfig(j.cfg || {});
      if (restoredCfg) Object.assign(cfg, restoredCfg);
    }
  } catch (e) {}
}
function syncControls() {
  $("aspect").value = cfg.aspect;
  $("effort").value = cfg.effort;
  $("seed").value = String(cfg.seed);
  $("gap").value = String(cfg.gap);
  $("gapNum").value = String(cfg.gap);
  $("contrast").value = String(cfg.contrast);
  $("contrastV").textContent = strength(cfg.contrast, [
    "Subtle",
    "Gentle",
    "Balanced",
    "Strong",
    "Dramatic",
  ]);
  $("color").value = String(cfg.color);
  $("colorV").textContent = `${Math.round(cfg.color * 100)}%`;
  $("shaped").value = String(cfg.shaped);
  $("shapedV").textContent = strength(cfg.shaped, [
    "Fewer",
    "Light",
    "Balanced",
    "Many",
    "More",
  ]);
  $("round").value = String(cfg.round);
  $("roundV").textContent = strength(cfg.round, [
    "None",
    "Light",
    "Balanced",
    "Many",
    "More",
  ]);
  $("symmetry").value = String(cfg.symmetry);
  $("symmetryV").textContent = strength(cfg.symmetry, [
    "Freeform",
    "Low",
    "Balanced",
    "High",
    "Symmetrical",
  ]);
  /** @type {NodeListOf<HTMLInputElement>} */
  const moodInputs = document.querySelectorAll("input[data-mood]");
  moodInputs.forEach((i) => {
    const mood = i.dataset.mood;
    if (!mood) return;
    i.checked = !!cfg.moods[mood];
    const systemAvailable = SYS.some((font) => font.c === mood);
    i.disabled =
      !FONTS.some(
        (font) => font.c === mood && (!avail.size || avail.has(font.n)),
      ) && !systemAvailable;
    const label = i.parentElement && i.parentElement.querySelector("span");
    if (label)
      label.textContent = `${mood[0].toUpperCase()}${mood.slice(1)}${i.disabled ? " (unavailable)" : ""}`;
    if (i.parentElement instanceof HTMLLabelElement) {
      i.parentElement.dataset.tooltip = i.disabled
        ? `No available ${mood} fonts.`
        : `Include ${mood} families in the random font pool.`;
      i.parentElement.tabIndex = i.disabled ? 0 : -1;
      i.parentElement.classList.toggle("unavailable", i.disabled);
    }
  });
  renderPaletteSwatches();
  renderAccentSwatches();
  document.querySelectorAll("#moodPresets [data-preset]").forEach((button) => {
    const key = /** @type {HTMLElement} */ (button).dataset.preset;
    const preset = key && MOOD_PRESETS[key];
    button.classList.toggle(
      "active",
      !!preset &&
        Object.keys(preset).every(
          (mood) => !!cfg.moods[mood] === !!preset[mood],
        ),
    );
  });
}
function strength(value, labels) {
  return labels[
    Math.min(labels.length - 1, Math.round(value * (labels.length - 1)))
  ];
}
function finishPreference(key, step, min, max) {
  cfg[key] = clamp(Math.round(cfg[key] / step) * step, min, max);
  saveLocal();
  syncControls();
  updateGenPrefsHint();
  commit();
}
function toJSON() {
  return JSON.stringify(
    {
      v: 2,
      cfg,
      activeContrast,
      activeRound,
      quotes: quoteSource(),
      tree,
      styles: sts(),
      emph: qs.map((q) => q.emph),
      fontSizes: qs.map((q) => q.fontSize),
    },
    (k, v) => (k === "_w" ? undefined : v),
  );
}
function validSavedTree(node, count, seen = new Set()) {
  if (!node || typeof node !== "object") return false;
  if (Object.hasOwn(node, "q")) {
    if (
      !Number.isInteger(node.q) ||
      node.d !== undefined ||
      node.a !== undefined ||
      node.b !== undefined
    )
      return false;
    if (node.q < 0 || node.q >= count || seen.has(node.q)) return false;
    seen.add(node.q);
    return true;
  }
  if (
    !["x", "y"].includes(node.d) ||
    !node.a ||
    !node.b ||
    (node.s !== undefined &&
      (!Number.isFinite(node.s) || node.s < -0.8 || node.s > 0.8))
  )
    return false;
  const seamKinds = [
    "flat",
    "arc",
    "ell",
    "wave",
    "notch",
    "step",
    "slant",
    "scurve",
  ];
  if (
    node.e &&
    (!seamKinds.includes(node.e.k) ||
      (node.e.k !== "flat" && !SEAM_KINDS[node.d].includes(node.e.k)) ||
      ["a", "p", "w"].some(
        (key) => node.e[key] !== undefined && !Number.isFinite(node.e[key]),
      ))
  )
    return false;
  return (
    validSavedTree(node.a, count, seen) && validSavedTree(node.b, count, seen)
  );
}
function normalizeImportedConfig(saved) {
  if (
    !saved ||
    typeof saved !== "object" ||
    Array.isArray(saved) ||
    (saved.moods !== undefined &&
      (!saved.moods ||
        typeof saved.moods !== "object" ||
        Array.isArray(saved.moods)))
  )
    return null;
  const next = {};
  for (const key of Object.keys(DEFAULT_CFG)) {
    next[key] =
      key === "moods"
        ? { ...DEFAULT_CFG.moods, ...(saved.moods || {}) }
        : saved[key] === undefined
          ? DEFAULT_CFG[key]
          : saved[key];
  }
  if (
    !["2:1", "3:2", "1:1", "3:4", "2:3"].includes(next.aspect) ||
    !Object.hasOwn(PALS, next.pal) ||
    !["fast", "std", "deep"].includes(next.effort)
  )
    return null;
  const ranges = {
    gap: [0, 40],
    contrast: [0, 0.7],
    color: [0, 0.8],
    seed: [1, 999999],
    shaped: [0, 1],
    round: [0, 1],
    symmetry: [0, 1],
  };
  for (const [key, [min, max]] of Object.entries(ranges))
    if (!Number.isFinite(next[key]) || next[key] < min || next[key] > max)
      return null;
  if (!Number.isInteger(next.seed)) return null;
  const categories = Object.keys(DEFAULT_CFG.moods);
  if (
    categories.some((key) => ![0, 1, false, true].includes(next.moods[key])) ||
    !categories.some((key) => !!next.moods[key])
  )
    return null;
  return next;
}
function validSavedStyle(st) {
  if (!st || typeof st.font !== "string" || !FONTMAP[st.font]) return false;
  const font = FONTMAP[st.font];
  return (
    (st.wi === undefined ||
      (Number.isInteger(st.wi) && st.wi >= 0 && st.wi < font.w.length)) &&
    (st.italic === undefined || [0, 1, false, true].includes(st.italic)) &&
    (st.caps === undefined || [0, 1, false, true].includes(st.caps)) &&
    (st.color === undefined || [0, 1, 2].includes(st.color)) &&
    (st.jit === undefined || (Number.isFinite(st.jit) && st.jit > 0))
  );
}
async function copyText(t, what) {
  try {
    await navigator.clipboard.writeText(t);
    say(what + " copied.");
  } catch (e) {
    const io = $("io");
    io.value = t;
    $("ioBox").open = true;
    io.focus();
    io.select();
    say(
      "Copying was blocked here. The text is selected under Save / load; copy it from there.",
    );
  }
}
function swapQuotes(source, destination) {
  if (!tree || source === destination) return false;
  const leaves = [];
  collect(tree, [], leaves);
  const a = leaves.find((l) => l.q === source),
    b = leaves.find((l) => l.q === destination);
  if (!a || !b) return false;
  [a.q, b.q] = [b.q, a.q];
  sel = source;
  focusQ = source;
  render();
  updateSel();
  commit();
  say("Quotes swapped.");
  return true;
}
function cancelGesture() {
  if (!drag) {
    bodyGesture = null;
    return;
  }
  if (drag.type === "seam" && drag.node) drag.node.s = drag.initial;
  drag = null;
  bodyGesture = null;
  render();
}
function loadJSON() {
  let j;
  try {
    j = JSON.parse($("io").value);
  } catch (e) {
    say("That is not valid settings JSON.");
    return;
  }
  if (!j || typeof j.quotes !== "string") {
    say("No quotes found in that JSON.");
    return;
  }
  const importedQuotes = parseQuotes(j.quotes);
  const importedCfg = normalizeImportedConfig(j.cfg === undefined ? {} : j.cfg);
  if (!importedCfg) {
    say(
      "Those settings contain invalid quotes or preferences; the current poster is unchanged.",
    );
    return;
  }
  const treeLeaves = new Set();
  if (
    j.tree &&
    (!validSavedTree(j.tree, importedQuotes.length, treeLeaves) ||
      treeLeaves.size !== importedQuotes.length)
  ) {
    say("That saved layout is malformed; the current poster is unchanged.");
    return;
  }
  if (
    (j.activeContrast !== undefined &&
      (!Number.isFinite(j.activeContrast) ||
        j.activeContrast < 0 ||
        j.activeContrast > 0.7)) ||
    (j.activeRound !== undefined &&
      (!Number.isFinite(j.activeRound) ||
        j.activeRound < 0 ||
        j.activeRound > 1))
  ) {
    say(
      "The saved layout preferences are invalid; the current poster is unchanged.",
    );
    return;
  }
  if (
    j.styles !== undefined &&
    (!Array.isArray(j.styles) || j.styles.length !== importedQuotes.length)
  ) {
    say(
      "The saved styles do not match the quotes; the current poster is unchanged.",
    );
    return;
  }
  if (
    j.emph !== undefined &&
    (!Array.isArray(j.emph) ||
      j.emph.length !== importedQuotes.length ||
      j.emph.some(
        (value) => !Number.isFinite(value) || value < 0.5 || value > 2.5,
      ))
  ) {
    say("The saved size targets are invalid; the current poster is unchanged.");
    return;
  }
  if (
    j.fontSizes !== undefined &&
    (!Array.isArray(j.fontSizes) ||
      j.fontSizes.length !== importedQuotes.length ||
      j.fontSizes.some(
        (value) =>
          value !== null &&
          (!Number.isFinite(value) || value < 0.1 || value > 2000),
      ))
  ) {
    say(
      "The saved font-size targets are invalid; the current poster is unchanged.",
    );
    return;
  }
  if (j.styles && j.styles.some((st) => !validSavedStyle(st))) {
    say("The saved styles are invalid; the current poster is unchanged.");
    return;
  }
  const previous = snap();
  Object.assign(cfg, importedCfg);
  activeContrast =
    j.activeContrast === undefined ? cfg.contrast : j.activeContrast;
  activeRound = j.activeRound === undefined ? cfg.round : j.activeRound;
  $("quotesText").value = j.quotes;
  setQuotes(j.quotes, true);
  const styleRng = mulberry32(cfg.seed);
  qs.forEach((q, i) => {
    if (j.styles && j.styles[i]) {
      const importedStyle = { ...j.styles[i] };
      delete importedStyle.align;
      delete importedStyle.lock;
      q.st = { ...randStyle(styleRng, q), ...importedStyle, lock: 0 };
    } else q.st = randStyle(styleRng, q);
    q.emph = j.emph ? j.emph[i] : 1;
    q.fontSize = j.fontSizes ? j.fontSizes[i] : null;
  });
  syncControls();
  if (!qs.length) {
    markGenPrefsApplied();
    finishQuoteChange("Settings loaded.");
  } else if (j.tree) {
    tree = clone(j.tree);
    const internal = [],
      leaves = [];
    collect(tree, internal, leaves);
    internal.forEach((node) => {
      if (!Number.isFinite(node.s)) node.s = 0;
      if (!node.e) node.e = { ...FLAT };
    });
    if (leaves.some((l) => l.id === undefined)) assignIds(tree);
    markGenPrefsApplied();
    render();
    updateSel();
    commit();
    say("Settings loaded.");
  } else regenerate({ restore: previous });
}
