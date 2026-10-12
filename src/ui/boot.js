/* ---------- boot ---------- */
async function boot() {
  try {
    const loaded = await loadDefaultQuotes();
    DEFAULT_QUOTES = loaded.full;
    STARTER_QUOTES = loaded.starter;
    const starterBlocks = STARTER_TEXT_PREFIXES.map((prefix) => {
      const quote = SAMPLE_QUOTES.quotes.find((entry) =>
        entry.text.trim().startsWith(prefix),
      );
      return formatQuoteBlock(quote);
    });
    STARTER_BUNDLES = {
      motivational: [0, 2, 4, 6]
        .map((index) => starterBlocks[index])
        .join("\n\n"),
      literary: [1, 3, 5, 9].map((index) => starterBlocks[index]).join("\n\n"),
      short: [0, 7, 1, 2].map((index) => starterBlocks[index]).join("\n\n"),
      showcase: starterBlocks.join("\n\n"),
    };
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
