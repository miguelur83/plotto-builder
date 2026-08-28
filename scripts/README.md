# Data pipeline

Regenerates `public/plotto.json` from the source text.

```bash
npm run build:data      # == node scripts/build-data.mjs
```

- **Input:** `source/plotto.txt` — the public-domain Plotto text (W. W. Cook, 1928), as
  digitized in `garykac/plotto@gh-pages`. Committed so the build needs no network.
- **Output:** `public/plotto.json` (~1.8 MB) — committed, so the app runs without re-parsing.
- **Parser:** `build-data.mjs` — original, zero-dependency Node ESM. It does **not** reuse
  Gary Kacmarcik's (unlicensed) Python; only the same public-domain source file.

The script prints a validation report and exits non-zero on structural failure. It does
**not** fail on source-data typos, which it reports as `danglingLinks` (see below).

## Referential integrity

Kac's `verify.py` only checks link *syntax*. This pipeline additionally checks that every
cross-referenced conflict id resolves to a real conflict. Known dangling link in the source:

- Conflict **214** carry-on `(3633)` — a typo for `363`. Left verbatim in `raw`; surfaced in
  `meta.counts.danglingLinks` and the top-level `danglingLinks` array rather than silently "fixed".

## Output shape (summary)

`meta` · `characterSymbols[]` · `masterplot{ aClauses, bClauses, cClauses, bClauseIndex }` ·
`conflicts[]` · `danglingLinks[]`.

Each conflict: `id, group, subgroup, bClause, characters[], permutations[], leadUps[], carryOns[]`.
Each permutation: `letter, text, leadUps[], carryOns[]`, where lead-ups/carry-ons are **Ref**
trees: `{ raw, kind, targetConflict, targetPermutations[], phase, transform, sequence[], alt[] }`.
`raw` is always the verbatim source; `leadUps`/`carryOns` at the conflict level are the deduped
union of base target ids (what the graph consumes).
