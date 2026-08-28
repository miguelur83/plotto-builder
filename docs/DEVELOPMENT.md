# Development

## Prerequisites

Node 18+ (developed on Node 25). No other global tooling.

## Commands

```bash
npm install          # install deps

npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # typecheck (tsc --noEmit) + production build to dist/
npm run preview      # serve the production build locally

npm run build:data   # regenerate public/plotto.json from source/plotto.txt
```

Typecheck on its own: `npx tsc --noEmit`.

## Project layout

```
source/              public-domain plotto.txt + Kac's scripts (reference only)
scripts/build-data.mjs   the data pipeline
public/plotto.json   generated dataset (committed)
src/                 the React app (see ARCHITECTURE.md for the module map)
docs/                this documentation
dist/                production build output (gitignored)
```

## How to make common changes

### Change how the data is parsed / add a field to the dataset
Edit `scripts/build-data.mjs`, then `npm run build:data` and check the validation report
(conflict count must stay 1462; watch the dangling-links line). Mirror any new field in
`src/types.ts`. The generated JSON is committed, so commit it alongside the parser change.

### Adjust character naming
All naming logic is in `src/names.ts`. The `FUNCTION_WORDS` set and the suffix rules in
`aIsCharacter()` decide whether a bare capital `A` is the character or the article. If you
find a mis-named phrase, add the offending follower word to the right side of that rule.

### Change the builder flow / layout
The UI is three columns (`ARCHITECTURE.md` has the map):
- **Left** guided steps + instructions: `src/components/Guide.tsx` (edit the per-step
  `Instructions` text here).
- **Center** reading/choosing surface: `src/components/Workspace.tsx` — opening cards,
  build-step forward/backward choice cards (shown **complete** — never add
  `-webkit-line-clamp` to `.choice-text`), and the single-conflict preview.
- **Right** the plot: `src/components/PlotPanel.tsx` — masterplot slots, characters, beats.
- `src/App.tsx` owns the `step` state machine and computes the option sets.
- Plot state and persistence are in `src/usePlot.ts`. Bumping the storage key
  (`plotto:plot:vN`) resets saved plots when the shape changes incompatibly.

### Styling
Single stylesheet, `src/index.css`, using CSS custom properties defined on `:root`
(`--accent` = lead-ups/structure, `--accent-2` = carry-ons/forward). Serif for Cook's
prose, sans for UI chrome.

## Verifying in the browser

The layout needs width; when testing in a narrow pane, emulate ~1300px. Sanity checks
worth repeating after changes:

- A conflict opens with its permutation switcher and both option lists.
- Naming: open conflict **545** with `A` named — _"A blizzard is raging"_ must stay `A`
  while the character `A` becomes the name.
- Picking a B-clause shows opening conflicts; "Begin here" seeds beat 1.
- Reload preserves the plot (localStorage).

## Deployment

`npm run build` emits a self-contained `dist/` (including `plotto.json`). `base: "./"`
makes it deployable to GitHub Pages from any sub-path. No server or environment needed.
