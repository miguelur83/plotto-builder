# Roadmap & status

Built in reviewable increments. Status as of 2026-08-26.

## Done

### ✅ 1. Data pipeline
`scripts/build-data.mjs` → `public/plotto.json`. Parses conflicts, permutations, the
A/B/C masterplot scaffolding, the B-clause index, and the character-symbol key; parses
every cross-reference into a resolvable `Ref` tree; validates referential integrity.
1,462 conflicts, 1,852 permutations, 1 known dangling link (source typo `3633`).

### ✅ 2. App skeleton + browse & search
Vite + React + TS. Loads the dataset; search by id/keyword, group filter, random jump.

### ✅ 3. Guided plot builder (Plotto's method), left → right
Grounded in Cook's "How to Use Plotto" and laid out **choose → read → assemble**:
- **Left (`Guide`)** — the guided steps with instructions: pick ① protagonist and
  ② central action (and optionally ③ ending) from clause lists; a reference search.
  A/B/C clauses are **interchangeable** (Cook), so choosing A does not restrict B.
- **Center (`Workspace`)** — reads and chooses: the chosen action surfaces Cook's index
  of **opening conflicts**; then the build step offers **carry-ons forward** and
  **lead-ups backward**, each a **complete, untrimmed** conflict card with adaptation
  notes. Options are **permutation-specific** for coherence. Conflicts appear only when
  the method makes them relevant — the full catalogue is reachable only via search.
- **Right (`PlotPanel`)** — the accumulating plot: masterplot summary + synopsis on top,
  then character-name boxes, then the ordered **beats** (reorder/remove, inline variant
  tabs, click a beat to view it complete in the center).

### ✅ 4. Character legend + naming
Always-available legend; display-only symbol → name substitution that resolves the
character-vs-article ambiguity for bare `A`.

### ✅ 5. Local persistence
Plot (title, frame, beats, names) autosaves to `localStorage` and restores on reload.

## Next

### ◐ 6. Export & import
- ✅ **Downloadable exports** — the Export menu offers a **formatted `.html`** document
  (self-contained, print → PDF) and a **`.md`** file. Both include the masterplot
  sentence, the character legend, and every beat with **names applied** and stages
  preserved, each cited by conflict id. Implemented in `src/export.ts` (`toHtmlDocument`,
  `toMarkdown`, `downloadFile`).
- ▶ Still to do: round-trippable **JSON** export + **re-import** to resume a saved plot
  (`usePlot` already has `replaceAll`).

### 7. Graph view
Cytoscape.js: conflicts as nodes, lead-up/carry-on as directed edges, progressive
click-to-expand from a focus, distinct edge direction. The dataset already carries
conflict-level `leadUps`/`carryOns` unions for this.

### ✅ Ending guidance (strong version)
The pipeline now parses the back-matter *Classification by Symbols* (source lines ~15143+),
where terminal conflicts are prefixed with their C-clause number, into a
**C-clause → ending-conflict index** (`masterplot.cClauseIndex`; 1,213 validated pairs,
873 terminal conflicts, C1–14). The build step uses it: a **destination banner** names
the chosen ending, opening/carry-on/lead-up candidates that terminate the story that way
are badged **🏁 delivers your ending** (or the softer "can end a story"), and a beat that
delivers the chosen ending is flagged 🏁 in the plot. When the last beat has no carry-ons
it's called out as a natural terminal point.

### ✅ Fuller openings
Cook's B-clause index can be thin (32 actions list a single opening). The opening step
still leads with his recommendation but adds a "**more conflicts filed under this action**"
expander (all conflicts whose `bClause` matches), so a sparse index never limits the user.

## Later (noted, not scheduled)

- **Gender-swap toggle** — the data hook exists (`characterSymbols` carry `gender`);
  mirror Kac's A↔B + gendered-term swap.
- **Phase-aware excerpts** — use `Ref.phase` to show only the referenced `*`-delimited
  span of a linked conflict.
- **Image export** of a plot/graph (PNG/SVG).
- **Constraint/path search** — "every N-beat path from X to a resolution," loops,
  shortest/longest chains (a reason for Cytoscape).
- **AI adapter layer** — deliberately out of scope; keep the data model clean enough to
  bolt on later without rework.

## Known issues / notes

- One source typo (`3633` in conflict 214) is surfaced as a dangling link by design.
- `plotto.json` is committed pretty-printed (~3.8 MB) for reviewable diffs; ship a
  minified copy if load time ever matters (gzips small, served compressed).
- Naming leaves ~36 rare bare-`A` article nouns as `A` (correct) and could miss a rare
  base-form verb after `A`; both are safe, low-frequency edges.
