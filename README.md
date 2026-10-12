# Quote Quilt

Create typographic quote posters from an editable collection of quotes.

## Run

Open `index.html` directly in a browser. No install or server is needed.

## Use

Edit or restore the sample quotes, choose a layout style, and generate a poster.
Drag seams to adjust regions, drag one quote onto another to swap their
positions, and double-click a quote to edit it in place. Undo and redo are
available from the toolbar and with Cmd/Ctrl+Z and Cmd/Ctrl+Y.

Export as SVG, PNG at 1×, 2×, or 3× resolution, or a print-ready PDF. The PDF
uses the selected raster scale at 300 DPI.

Google Fonts require a network connection. Settings are saved in `localStorage`.
A seed reproduces a layout only when the other inputs are the same.

## How it works

`core.js` provides shared generation primitives. `layout.js` builds the
guillotine layout tree and shaped seams, `regions.js` assigns quote regions,
and `typeset.js` fits text within them. `src/ui/` connects the engine to the
interface through rendering, export, history, panel, event, and boot scripts.

## Development

Run `npm install`, then `npm run typecheck`.

## License

MIT. See [LICENSE](LICENSE).
