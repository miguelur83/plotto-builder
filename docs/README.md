# Plotto Plot-Builder — Documentation

A local-first web app that turns William Wallace Cook's **_Plotto_ (1928)** into an
interactive tool for **building a plot the way Cook intended** — choosing a masterplot
frame, picking an opening conflict, and chaining conflicts via his lead-up / carry-on
cross-references. No AI, no text generation: it makes Cook's own material navigable and
composable, shown verbatim.

## What is Plotto?

Plotto is an "algebra for stories." It contains:

- **1,462 conflicts** — generic plot situations (e.g. _"A, seeking to uphold a lofty
  conception of duty, secretly abandons B, a woman whom he loves dearly"_), each written
  with character **symbols** (`A` = male lead, `B` = female lead, `A-3` = his rival, …).
- **The masterplot frame** — every story is framed by three clauses: an **A-clause**
  (the protagonist, 15 options), a **B-clause** (the central action, 62 options), and a
  **C-clause** (the ending, 15 options).
- **Cross-references** — each conflict lists **lead-ups** (conflicts that can precede it,
  working back toward the protagonist) and **carry-ons** (conflicts that can follow,
  working forward toward the ending), sometimes with adaptation notes like
  `ch B to A` (change B to A) or `tr A & A-3` (transpose two characters).

## How the app maps onto Cook's method

The intended workflow (see [Cook's own "How to Use Plotto"](https://garykac.github.io/plotto/plotto-mf.html)) is
**top-to-bottom**, and the UI follows it:

1. **① Protagonist / ② Central action / ③ Ending** — chosen in the *Masterplot frame*
   panel. These assemble into a one-sentence masterplot.
2. **Opening conflict** — choosing the action (②) surfaces Cook's own index of opening
   conflicts for that B-clause. Pick where the story begins.
3. **Expand** — from the opening conflict, follow **carry-ons forward** and **lead-ups
   backward** to chain each beat. Each choice shows the candidate's full text so you can
   read before you pick.
4. **Name the characters** — optionally replace `A`/`B`/… with real names; substitution
   is display-only (Cook's text is never mutated) and reads correctly everywhere.
5. **Export / save** — the plot autosaves to the browser and can be exported.

## Document map

| Doc | What's in it |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the app is built — data pipeline, frontend module map, data flow |
| [DATA_MODEL.md](DATA_MODEL.md) | The `plotto.json` schema, field by field |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Run/build commands and how to make common changes |
| [ROADMAP.md](ROADMAP.md) | Increment plan, what's done, and what's next |

## Quick start

```bash
npm install
npm run build:data   # regenerate public/plotto.json from source/plotto.txt (optional; committed)
npm run dev          # start the dev server
```

## Source & licensing

- The **_Plotto_ text is public domain** (Cook, 1928). Source file: `source/plotto.txt`,
  as digitized in [`garykac/plotto`](https://github.com/garykac/plotto) (`gh-pages`).
- That repo has **no LICENSE**, so this project **does not reuse Kac's parser code** —
  `scripts/build-data.mjs` is original, written from the documented text format. Kac's
  scripts are kept under `source/scripts/` for reference only.
