# Quote Quilt

Create typographic quote posters from an editable collection of quotes.

![A generated Quote Quilt poster](screenshot.png)

## Run

Open `index.html` directly in a browser. No install or server is needed.

## Use

Edit or restore the sample quotes, choose **New layout**, drag seams to adjust
the regions, swap quotes, and export the poster as SVG or PNG.

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
