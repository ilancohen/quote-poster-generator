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
async function rasterizePoster(scale) {
  if (!tree || !qs.length) {
    throw new Error("Add quotes before exporting.");
  }
  const result = await exportSVG();
  const D = dims();
  const url = URL.createObjectURL(
    new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(
          new Error("Could not rasterize the poster SVG in this browser."),
        );
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = D.W * scale;
    canvas.height = D.H * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create a canvas for export.");
    context.fillStyle = PALS[cfg.pal].paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, result, scale };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportError(error) {
  say(
    error instanceof Error
      ? error.message
      : "Poster export failed in this browser.",
  );
}
async function downloadPNG() {
  const scale = clamp(parseInt($("pngScale").value, 10) || 1, 1, 3);
  say(`Preparing ${scale}× PNG…`);
  try {
    const { canvas, result } = await rasterizePoster(scale);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (image) =>
          image
            ? resolve(image)
            : reject(new Error("PNG export was blocked in this browser.")),
        "image/png",
      ),
    );
    downloadBlob(blob, `quote-quilt-${scale}x.png`);
    say(
      result.external
        ? `${scale}× PNG downloaded; ${result.external} font faces may use fallbacks.`
        : `${scale}× PNG downloaded (${canvas.width} × ${canvas.height}).`,
    );
  } catch (error) {
    exportError(error);
  }
}
async function downloadPDF() {
  const scale = clamp(parseInt($("pngScale").value, 10) || 1, 1, 3);
  say("Preparing print-ready PDF…");
  try {
    const { canvas, result } = await rasterizePoster(scale);
    const jpeg = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (image) =>
          image
            ? resolve(image)
            : reject(new Error("PDF image encoding failed.")),
        "image/jpeg",
        0.96,
      ),
    );
    const imageBytes = new Uint8Array(await jpeg.arrayBuffer());
    const pageW = ((canvas.width * 72) / 300).toFixed(2);
    const pageH = ((canvas.height * 72) / 300).toFixed(2);
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const append = (chunk) => {
      const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
      chunks.push(bytes);
      length += bytes.length;
    };
    append("%PDF-1.4\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ];
    objects.forEach((body, index) => {
      offsets.push(length);
      append(`${index + 1} 0 obj\n${body}\nendobj\n`);
    });
    offsets.push(length);
    append(
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
    );
    append(imageBytes);
    append("\nendstream\nendobj\n");
    const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    offsets.push(length);
    append(
      `5 0 obj\n<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`,
    );
    const xref = length;
    append(
      `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
        .join(
          "",
        )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    );
    downloadBlob(
      new Blob(chunks, { type: "application/pdf" }),
      "quote-quilt.pdf",
    );
    say(
      result.external
        ? `PDF downloaded at ${scale}×; ${result.external} font faces may use fallbacks.`
        : `Print-ready PDF downloaded at ${scale}× (${canvas.width} × ${canvas.height} px).`,
    );
  } catch (error) {
    exportError(error);
  }
}
