/* ---------- boot ---------- */
async function boot() {
  try {
    const loaded = await loadDefaultQuotes();
    DEFAULT_QUOTES = loaded.full;
    STARTER_QUOTES = loaded.starter;
  } catch (error) {
    say(error.message || "Could not load the default quotes.");
    return;
  }
  $("quotesText").value = STARTER_QUOTES;
  restoreLocal();
  syncControls();
  setQuotes($("quotesText").value, true);
  const rng = mulberry32(cfg.seed);
  qs.forEach((q) => {
    q.st = randStyle(rng, q);
  });
  if (!qs.length) {
    render();
    updateSel();
    commit();
    return;
  }
  await regenerate({ n: 80 });
  say("Loading typefaces…");
  await loadFonts();
  syncControls();
  if (avail.size) await regenerate();
  else say("Web fonts did not load, so this uses system fonts.");
}
boot();
