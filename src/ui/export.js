function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
function rangeContainsCodePoint(rangeText, codePoint) {
  if (!rangeText) return true;
  return rangeText.split(",").some((part) => {
    const match = part.trim().match(/^U\+([0-9a-f?]+)(?:-([0-9a-f?]+))?$/i);
    if (!match) return false;
    const lower = parseInt(match[1].replace(/\?/g, "0"), 16);
    const upper = parseInt((match[2] || match[1]).replace(/\?/g, "F"), 16);
    return codePoint >= lower && codePoint <= upper;
  });
}
const svgFontDataCache = new Map();
let svgFontCSSPromise = null;
function fontFaceMatches(rule, needs, codePoints) {
  const family = rule.style
    .getPropertyValue("font-family")
    .replace(/^['"]|['"]$/g, "");
  const requests = needs.get(family);
  if (!requests) return false;
  const faceStyle =
    rule.style.getPropertyValue("font-style").trim() || "normal";
  const faceWeights = rule.style
    .getPropertyValue("font-weight")
    .trim()
    .split(/\s+/)
    .map(Number);
  const hasRequestedVariant = [...requests].some((request) => {
    const [italic, weight] = request.split("|");
    if ((faceStyle === "italic") !== (italic === "italic")) return false;
    return faceWeights.length > 1
      ? +weight >= faceWeights[0] && +weight <= faceWeights[1]
      : +weight === faceWeights[0];
  });
  if (!hasRequestedVariant) return false;
  const ranges = rule.style.getPropertyValue("unicode-range");
  return (
    !ranges ||
    codePoints.some((codePoint) => rangeContainsCodePoint(ranges, codePoint))
  );
}
async function exportFontCSS(res) {
  const needs = new Map();
  const addNeed = (family, weight, italic) => {
    if (!avail.has(family)) return;
    if (!needs.has(family)) needs.set(family, new Set());
    needs.get(family).add(`${italic ? "italic" : "normal"}|${weight}`);
  };
  for (const cell of res.cells) {
    if (cell.bad) continue;
    addNeed(cell.m.f.n, cell.m.wt, cell.m.it);
    if (qs[cell.q].author) addNeed(cell.m.f.n, 400, cell.m.f.i);
  }
  if (!needs.size) return { css: "", embedded: 0, external: 0 };
  const codePoints = [
    ...new Set(
      qs.flatMap((q) =>
        [...(q.text + q.text.toUpperCase() + q.author)].map((char) =>
          char.codePointAt(0),
        ),
      ),
    ),
  ];
  let css;
  try {
    if (!svgFontCSSPromise) {
      svgFontCSSPromise = fetch($("fontcss").href)
        .then((response) => {
          if (!response.ok)
            throw new Error(
              `Font stylesheet request failed (${response.status}).`,
            );
          return response.text();
        })
        .catch((error) => {
          svgFontCSSPromise = null;
          throw error;
        });
    }
    css = await svgFontCSSPromise;
  } catch (error) {
    const url = $("fontcss").href.replace(/'/g, "%27");
    return { css: `@import url('${url}');`, embedded: 0, external: needs.size };
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const faces = Array.from(sheet.cssRules).filter(
    (rule) =>
      rule.type === CSSRule.FONT_FACE_RULE &&
      fontFaceMatches(/** @type {CSSFontFaceRule} */ (rule), needs, codePoints),
  );
  let embedded = 0,
    external = 0;
  const rules = await Promise.all(
    faces.map(async (rule) => {
      const face = /** @type {CSSFontFaceRule} */ (rule),
        src = face.style.getPropertyValue("src");
      const match = src.match(/url\(\s*(['"]?)(https?:[^'")]+)\1\s*\)/i);
      if (!match) {
        external++;
        return face.cssText;
      }
      const fontURL = match[2];
      try {
        let request = svgFontDataCache.get(fontURL);
        if (!request) {
          request = fetch(fontURL)
            .then((response) => {
              if (!response.ok)
                throw new Error(`Font request failed (${response.status}).`);
              return response.arrayBuffer();
            })
            .then(toBase64)
            .catch((error) => {
              svgFontDataCache.delete(fontURL);
              throw error;
            });
          svgFontDataCache.set(fontURL, request);
        }
        const base64 = await request;
        face.style.setProperty(
          "src",
          `url("data:font/woff2;base64,${base64}") format("woff2")`,
        );
        embedded++;
      } catch (error) {
        external++;
      }
      return face.cssText;
    }),
  );
  return { css: rules.join("\n"), embedded, external };
}
async function exportSVG() {
  const D = dims();
  const res = evaluate(tree, sts(), D);
  const fonts = await exportFontCSS(res);
  const defs = fonts.css
    ? `<defs><style><![CDATA[${fonts.css}]]></style></defs>`
    : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${D.W} ${D.H}" width="${D.W}" height="${D.H}">${defs}${posterInner(res, sts(), PALS[cfg.pal], D)}</svg>`,
    ...fonts,
  };
}

async function downloadSVG() {
  say("Preparing embedded fonts…");
  const result = await exportSVG();
  const blob = new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quote-quilt.svg";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(
    result.external
      ? `SVG downloaded with ${result.embedded} embedded font faces; ${result.external} still use online fallback.`
      : `SVG downloaded with ${result.embedded} embedded font faces.`,
  );
}
async function downloadPNG() {
  if (!tree || !qs.length) {
    say("Add quotes before exporting a PNG.");
    return;
  }
  say("Preparing PNG…");
  try {
    const result = await exportSVG();
    const D = dims();
    const blob = new Blob([result.svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error("Could not rasterize the poster SVG in this browser."),
        );
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = D.W;
    canvas.height = D.H;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Could not create a canvas for PNG export.");
    c.fillStyle = PALS[cfg.pal].paper;
    c.fillRect(0, 0, D.W, D.H);
    c.drawImage(img, 0, 0, D.W, D.H);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL("image/png");
    if (!pngUrl || pngUrl === "data:,")
      throw new Error("PNG export was blocked in this browser.");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "quote-quilt.png";
    link.click();
    say(
      result.external
        ? `PNG downloaded; ${result.external} font faces may use fallbacks.`
        : "PNG downloaded.",
    );
  } catch (error) {
    say(
      error instanceof Error
        ? error.message
        : "PNG export failed in this browser.",
    );
  }
}
