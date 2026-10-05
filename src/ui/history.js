/* ---------- history ---------- */
const snap = () =>
  JSON.stringify(
    {
      tree,
      cfg,
      activeContrast,
      activeRound,
      appliedGenPrefs,
      quotes: quoteSource(),
      selectedId: sel >= 0 && qs[sel] ? qs[sel].id : null,
      qs: qs.map((q) => ({
        id: q.id,
        text: q.text,
        tokens: q.tokens,
        brAfter: q.brAfter,
        author: q.author,
        st: q.st,
        emph: q.emph,
        fontSize: q.fontSize,
      })),
    },
    (k, v) => (k === "_w" ? undefined : v),
  );
function commit() {
  const s = snap();
  if (s === lastSnap) return;
  if (lastSnap) undoStack.push(lastSnap);
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
  lastSnap = s;
  $("bUndo").disabled = !undoStack.length;
  $("bRedo").disabled = !redoStack.length;
}
function restore(s) {
  const j = JSON.parse(s);
  const selectedId = j.selectedId || (qs[sel] && qs[sel].id);
  Object.assign(cfg, j.cfg || {});
  activeContrast = Number.isFinite(j.activeContrast)
    ? j.activeContrast
    : cfg.contrast;
  activeRound = Number.isFinite(j.activeRound) ? j.activeRound : cfg.round;
  tree = j.tree;
  $("quotesText").value = j.quotes ?? "";
  const parsed = j.qs.map((q) => quoteFromFields(q.text, q.author));
  qs = parsed.map((q, i) => ({
    ...q,
    ...j.qs[i],
    tokens: j.qs[i].tokens || q.tokens,
    brAfter: j.qs[i].brAfter || q.brAfter,
    chars: q.chars,
  }));
  sel = qs.findIndex((q) => q.id === selectedId);
  closeQuoteEditor();
  syncControls();
  saveLocal();
  mcache.clear();
  acache.clear();
  appliedGenPrefs =
    typeof j.appliedGenPrefs === "string" || j.appliedGenPrefs === null
      ? j.appliedGenPrefs
      : genPrefsSnapshot();
  updateGenPrefsHint();
  render();
  updateSel();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(lastSnap);
  const prev = undoStack.pop();
  lastSnap = prev;
  restore(prev);
  $("bUndo").disabled = !undoStack.length;
  $("bRedo").disabled = !redoStack.length;
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(lastSnap);
  const next = redoStack.pop();
  lastSnap = next;
  restore(next);
  $("bUndo").disabled = !undoStack.length;
  $("bRedo").disabled = !redoStack.length;
}
