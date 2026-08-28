# Architecture

Two independent halves: a **build-time data pipeline** (Node) that produces a static
dataset, and a **runtime SPA** (React) that reads it. There is no backend.

```
source/plotto.txt ──▶ scripts/build-data.mjs ──▶ public/plotto.json ──▶ React app ──▶ static dist/
   (public domain)        (parser + validator)      (committed data)     (Vite build)   (GitHub Pages)
```

## 1. Data pipeline — `scripts/build-data.mjs`

Zero-dependency Node ESM. Run with `npm run build:data`. It:

1. Parses the front matter of `plotto.txt` into the masterplot scaffolding — the
   **A/B/C clauses**, the **B-clause → conflict index**, and the **character-symbol key**.
2. Parses the conflict section (bounded by `-- page 18` … `-- page 190`) into 1,462
   conflicts, each with one or more lettered **permutations**, and each permutation's
   `PRE:` (lead-ups) and `POST:` (carry-ons) reference lists.
3. Parses each cross-reference into a **`Ref` tree** — resolving the target conflict id
   while preserving Cook's verbatim string, phase markers (`-*`), transforms
   (`ch B to A`), and compound sequences/alternations.
4. **Validates** referential integrity: every referenced id must resolve to a real
   conflict. Danglers are reported (not silently fixed) in `danglingLinks` — currently
   one known source typo (`3633` in conflict 214, should be `363`).
5. Writes `public/plotto.json` and prints a validation report. Exits non-zero only on
   structural failure, never on data typos.

The generated JSON is **committed** so the app runs without re-parsing.

## 2. Frontend — `src/`

React 18 + TypeScript + Vite. Static build, `base: "./"` for GitHub Pages.

### Non-component modules

| File | Responsibility |
| --- | --- |
| `types.ts` | TypeScript mirror of the `plotto.json` shape |
| `data.ts` | Fetches + indexes the dataset (`byId`, search blob, symbol map, `allSymbols`); `searchConflicts`, `legendFor` |
| `options.ts` | `resolveOptions(refs)` — flattens a permutation's `Ref` trees into concrete, de-duplicated **`StepOption`s** (the pickable lead-up/carry-on choices). Resolving at the *permutation* level (not the conflict-level union) keeps suggestions faithful to Cook |
| `masterplot.ts` | `frameClauses` / `synopsis` — resolves the A/B/C frame to clauses and the one-line masterplot sentence |
| `names.ts` | `createNamer(allSymbols)` — display-only character renaming. Handles the one ambiguous token (bare capital `A`, character vs. article) with a grammatical rule; see [naming](#character-naming) |
| `usePlot.ts` | Plot state (`title`, A/B/C `frame`, `steps`, `names`) + actions + debounced `localStorage` persistence (`plotto:plot:v2`) |
| `export.ts` | `toMarkdown(plot, …)` — current export (Markdown to clipboard). Full `.md`/`.txt`/`.json` + import is the next increment |

### Components — a left→right, three-column flow

The UI reads left to right: **choose → read → assemble**.

The columns map to **set up → build → result**.

| Component | Column | Role |
| --- | --- | --- |
| `App.tsx` | — | Wires everything; owns the center `preview` and the search `query`, and computes the openings / forward / backward option sets. There is no step state machine — the center's mode is derived |
| `Setup.tsx` | **left · set up** | Structure decisions: the masterplot pickers ① protagonist / ② action / ③ ending (inline accordions of the clause lists), the **Characters** name boxes, and a "find any conflict" reference search |
| `Workspace.tsx` | **center · build** | The reading + choosing surface, derived from state: a welcome (no action yet), the **opening-conflict** cards (+ a "more conflicts under this action" expander), or the build step's forward/backward **choice cards** — always **complete, untrimmed** conflict text, with stage numbering and ending badges. Also the single-conflict **preview** |
| `PlotPanel.tsx` | **right · result** | The resulting plot: the **synopsis** on top, then the ordered **Beats** (reorder/remove, inline variant tabs, 🏁 when a beat delivers the chosen ending, click a beat to preview it in the center) |
| `ConflictText.tsx` | center/right | Renders verbatim text, splitting Cook's `*`/`**`/`***` into numbered stages |
| `CharacterNames.tsx` | left | Symbol → name inputs |

### Data flow at runtime

`App` derives what the center shows from the plot state and an optional `preview`:
a single-conflict **preview** if set (from search or a clicked beat), else — no action →
welcome; action but no beats → openings; beats → build. Picking a clause updates the
frame; picking an **opening** seeds beat 1; in build, forward options come from the
**last beat's** carry-ons (append) and backward from the **first beat's** lead-ups
(prepend), so the chain grows outward at both ends. Ending guidance reads
`index.terminalFor` (from the back-matter C-clause index): candidates and beats that
terminate the story the chosen way are flagged 🏁. Everything the user sees passes through
the `namer` and `ConflictText`, so names and stage-splitting apply consistently.

### Character naming

Cook writes protagonists as capital symbols and the English article as lowercase `a`, so
`B` and every multi-character symbol (`A-2`, `AX`, `F-B`, …) are unambiguous. The only
hard case is a bare capital **`A`** — usually the male lead, occasionally a sentence-initial
article (_"A blizzard rages"_). `names.ts` disambiguates structurally: character-`A` is a
grammatical subject, so it is followed by a verb, auxiliary/preposition, or punctuation;
article-`A` precedes a noun/adjective. This correctly renames ~1,457 of ~1,493 bare-`A`
occurrences and leaves the rest (true article nouns) untouched.
