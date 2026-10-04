# Quote Quilt — UI and Interaction Plan

Goal: give users freedom to tweak the poster without requiring them to understand the layout engine. Every control must have a predictable scope, a meaningful value, and a reversible effect.

## Interaction model

Organize controls around three intentions:
- **Poster**: direct changes to the current composition.
- **Generate**: preferences for the next generated composition, not live edits.
- **Selected quote**: direct edits to one quote, with shared geometry effects made visible.

Changing a control must not silently trigger a full layout search. Only explicit generation actions may create a new arrangement. Direct edits may refit text and move shared boundaries where necessary, but must preserve quote placement in the layout tree and unrelated style choices.

## Top bar

- **Reroll**: choose a new seed and generate a new arrangement using generation preferences. Preserve styles marked Keep style and all relative-size targets; positions and geometry may change.
- **Refine spacing**: replace Refine with a geometry-only operation on the current arrangement. Adjust seam positions to improve fit; do not swap quotes, change fonts, recolor, or randomize edge profiles. Text size may change as it refits. Generation preferences are not applied.
- **Undo / Redo**: restore complete editing states, including controls and the poster.
- **Copy SVG**: export the current committed poster, without selection or editing overlays.
- Remove **6 options** and **Edit seams**. Seam editing is available without a mode toggle.
- Disable conflicting editing and export actions while a generation/refinement result is pending. Provide progress and cancellation; cancellation keeps the previous committed poster.

Use familiar icons with accessible names and tooltips for Undo / Redo and other compact tools. Keep text labels for generation commands whose effects need distinguishing.

## Poster panel: direct edits

Keep this section compact and always visible:
- **Format**: aspect-ratio select. Refit the existing layout into the new dimensions; preserve quote order, styles, and edge profiles. Do not reroll automatically.
- **Palette**: swatch previews with names. Immediately change paper, ink, and accent colors while preserving each quote's assigned color role, including protected styles.
- **Spacing**: slider plus numeric input, in poster pixels. These are SVG/export units, not on-screen pixels; the poster's longest side is currently 2000 units. Refit text in the current regions without generating a new layout. Do not describe the value as a guaranteed visible distance between glyphs.

Use a common unit convention for all geometry controls. Keep controls synchronized with the displayed poster after every edit and history operation.

## Generate panel: preferences

Use a collapsible **Generate** section, initially open. Preferences take effect only through an explicit generation command; changing them leaves the current poster untouched.

Primary preferences:
- **Typeface categories**: multi-select chips with representative type samples. They define the random font pool, not restrictions on the selected-quote picker. Require at least one category; clearly disable categories with no available fonts.
- **Size variation**: continuous slider with `Subtle` and `Dramatic` endpoints and a named strength readout, not a percentage. Higher values favor shorter quotes with larger relative text. The minimum is not a guarantee of identical font sizes.
- **Shaped boundaries**: continuous slider with `Fewer` and `More` endpoints and a named strength readout. It controls the tendency to generate non-straight internal seams, not curvature depth or an exact percentage of pieces.
- **Accent frequency**: continuous slider with `None` and `Frequent` endpoints. If a numeric value is shown, label it as an approximate target share of unprotected quotes assigned accent roles, not a guaranteed visible share or color intensity. Show palette swatches alongside it.

Under collapsed **Advanced generation**:
- **Rounded forms**: continuous slider with `None` and `More` endpoints and a named strength readout. It controls attempts to round eligible pieces, not a percentage; maximum does not mean every piece becomes round.
- **Justified text**: approximate target share of unprotected quotes assigned justified alignment. Text fitting may still fall back when justification is unsuitable.
- **Search effort**: Quick / Standard / Thorough. Controls how many candidates are evaluated, with a time-versus-search-depth tradeoff, not a guaranteed quality improvement.
- **Seed**: integer plus **Generate with seed** action. Changing the number alone does not regenerate. Reproduction depends on the same quotes, preferences, protected styles, relative sizes, available fonts, and engine version; the seed alone is not a saved design.

Do not normalize all values into generic percentages. Preserve continuous stored values when showing named strength bands; opening the UI must not snap old values to presets. Use percentages only for a defined approximate share, and multiples only for a relative target.

## Stage selection and navigation

- **Select**: click or tap a quote. Show a stable, clearly visible outline and identify the same quote in the inspector.
- **Deselect**: click the selected quote again, click empty stage/background space, use the inspector's deselect control, or press Esc when focus is in the stage/inspector. Interacting with inspector controls must not deselect.
- **Keyboard**: provide a focusable stage with arrow-key quote navigation and Enter/Space selection. Focus and selection must be visually distinct. Escape first cancels an active gesture or closes a popup, then clears selection.
- Keep selection attached to quote identity through refits, swaps, rerolls, and history changes. Clear it if the quote is removed.
- **Desktop**: keep the inspector stable and visible beside the poster, rather than inserting controls that shift the page.
- **Mobile**: use a compact, collapsible inspector below the stage. Selection must not unexpectedly scroll the poster away; opening controls must leave the selected quote inspectable. No required control may depend on hover.

## Stage geometry editing

### Shared seams
- Thin handles appear on hover and on boundaries of the selected quote. Hit targets are larger than their visible strokes, including touch-sized targets on touch devices.
- Preview/highlight the boundary and all affected regions before and during adjustment. A seam may affect several quotes, not just the selected quote.
- Handles take priority over body dragging. Focusable handles support arrow-key nudges as an alternative to dragging.
- Preserve styles and quote assignments. Refit affected text; actual font sizes can change.

### Swapping quotes
- On a mouse/pen, drag a quote body onto another quote; use approximately 5 CSS screen pixels to distinguish a click from a drag, independent of SVG scale.
- Show source and destination feedback. Preview the resulting refit, since swapping does not guarantee identical region dimensions or font sizes.
- Keep a contextual **Swap…** command in the inspector: select a destination by click/tap or keyboard, then confirm. This is also the touch alternative to body dragging.
- Preserve normal touch scrolling from quote bodies; touch seam editing starts from an explicit handle. Do not disable scrolling across the whole stage.
- Dropping outside a valid target or onto the source cancels. Esc or pointer cancellation restores the pre-gesture state. A completed drag must not also trigger click selection/deselection.
- A successful swap keeps the source quote selected and carries its style, Keep style state, and relative-size target with it.

## Selected quote inspector

Show a quote excerpt and a clear deselect control. With no selection, keep a compact empty state instead of displaying disabled editing fields.

- **Font**: family picker with samples and a compact variant picker containing only supported combinations, such as Regular, Bold, and Italic. Do not place every family/variant combination in one long menu or offer synthetic unsupported variants. Preserve a compatible variant when changing families; otherwise show the actual fallback.
- **Relative size**: slider plus numeric target, `Smaller` to `Bigger`, with neutral `1.0×` and a reset control. This is relative sizing priority, not literal font size or an exact rendered-size multiplier. It reallocates area and refits text, so neighbors can change. Highlight affected regions during preview.
- **Alignment**: icon-based Left / Center / Right / Justified controls with accessible names. Reflect any fitting fallback rather than implying justification always succeeds.
- **Case**: retain an All caps toggle. Fonts that intrinsically render capitals show that fixed state instead of an ineffective toggle.
- **Color**: palette swatches named Ink / Accent 1 / Accent 2, reflecting the current palette. Retain role-based colors for this iteration.
- **Reroll style**: randomize font family/variant, case, alignment, color role, and style sizing variation within current generation preferences. Preserve the relative-size target, quote assignment, and edge profiles. Refit without a layout search, then enable Keep style.

### Keep style, not position locking
- Replace Locked / Unlock with a **Keep style** toggle and a small protected-style indicator on selected/protected quotes.
- Any direct typography, color, or relative-size edit enables Keep style. It preserves the quote's complete style against Reroll, not only the last edited property. Users can also enable it without changing anything.
- Keep style does not block further manual edits. Turning it off allows future random restyling; it does not immediately change the quote.
- Relative-size targets remain until explicitly edited or reset, whether Keep style is on or off.
- Geometry edits and swaps do not auto-enable Keep style, because it cannot protect their result. Undo handles reversal of these edits.
- Keep style does not preserve position, boundaries, exact fitted font size, or absolute color when the palette changes. Refine spacing preserves all styles regardless of this toggle.
- **Pin position/geometry is out of scope** for this iteration. Do not promise that a piece remains completely unchanged under generation.

### Edges and shared geometry
- Do not represent Straight / Shaped / Round as one always-valid exclusive piece setting.
- Show the current boundary state, including **Mixed**, and offer contextual actions: **Straighten boundaries**, **Reshape boundaries**, and **Round sides**. Reshape remains repeatable for another variation.
- Preview/highlight the shared boundaries and neighboring regions each action changes. Outer poster edges are not editable seams.
- Disable inapplicable actions, with an accessible reason available on focus/tap as well as hover. Round sides is available only where the layout supports it and is not a promise of a circular piece.
- Reflect the effective geometry after fitting; do not show success if constraints prevented the requested result.

## Recovery and persistence

- Every completed direct edit, generation, refinement, swap, seam gesture, and applied quote/settings change is undoable. Include global preferences, quote content, styles, relative-size targets, and layout in history, not just the tree and styles.
- Slider and pointer previews produce one history entry on completion. Canceled gestures produce none. A new edit after Undo clears Redo.
- Restore displayed controls and derived inspector state with the saved state. Editing controls during asynchronous work must not allow stale results to overwrite newer changes.
- Keep quote text editing and Save / load separate from visual controls. Applying quote changes preserves settings for unchanged quotes and is undoable.
- Keep localStorage's existing quotes/preferences scope for this iteration; do not imply that reloading restores manual layout edits. Full settings JSON is the saved-design format.
- Existing JSON and localStorage data must load without user migration. Preserve existing configuration keys, ranges, and stored precision; presentation labels do not change storage semantics.
- Interpret legacy style `lock` as Keep style and `emph` as the relative-size target. Preserve saved trees and mixed/shared edges without forcing them into a new exclusive shape enum.
- A valid saved tree must load directly without automatic regeneration. Missing optional fields use defaults; unavailable fonts use a visible fallback without discarding the saved font choice. Malformed data must not replace the current poster.

## Acceptance checks

- Adjusting palette or spacing preserves quote assignments and unrelated style choices; changing format refits without randomization.
- Changing any generation preference leaves the poster unchanged until Reroll or Generate with seed. Refine spacing does not consume those preferences or restyle/swap quotes.
- Editing a quote enables Keep style. Reroll preserves its style and relative target, while the UI makes no position/geometry guarantee. Turning Keep style off causes no immediate visual change.
- Relative size shows `1.0×` at the neutral target and previews neighboring effects; no control presents a random tendency as an exact outcome.
- Select/deselect works by mouse, touch, and keyboard. Inspector interaction preserves selection; swaps and rerolls retain quote identity.
- Seams can be adjusted without hover, swaps have a non-drag alternative, touch scrolling remains available, and canceled gestures leave no changes or history entries.
- Shared/mixed boundary states and unavailable rounding actions are represented honestly. Repeated reshaping remains possible.
- Undo/Redo restores both poster and controls after a slider gesture, palette change, generation preference change, swap, reroll, and quote replacement. Each gesture is one history step.
- Canceling asynchronous work preserves the committed poster and leaves controls usable. No stale result can overwrite a newer state.
- Desktop and narrow mobile layouts keep the selected quote inspectable, controls reachable, text unclipped, and focus indicators visible.
- Load representative legacy JSON/localStorage settings, including non-preset numeric values, locked styles, mixed edges, and unavailable fonts. Round-trip supported settings without silent resets; reject malformed imports without losing the current design.
