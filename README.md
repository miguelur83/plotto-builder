# Plotto Plot-Builder

**An interactive, guided plot builder for William Wallace Cook's _Plotto_ (1928).**

> ### ▶ [**Try it live → miguelur83.github.io/plotto-builder**](https://miguelur83.github.io/plotto-builder/)

Plotto is a 1928 "algebra for stories": **1,462 generic plot conflicts** that chain together
into a masterplot. This app turns that dense reference book into something you can actually
*use* — frame a masterplot, pick where the action begins, and follow Cook's own cross-references
to assemble a plot beat by beat.

No AI, no text generation. Cook's public-domain material is shown **verbatim**; the app just
makes it navigable and composable.

---

## What it does

- **Guided, left‑to‑right flow** — *set up* a masterplot on the left (① protagonist, ② central
  action, ③ ending), *build outward* in the middle, watch the *resulting plot* assemble on the right.
- **Cook's method, faithfully** — the action surfaces his index of **opening conflicts**; from
  there you extend forward with **carry-ons** (toward the ending) and backward with **lead-ups**
  (toward the protagonist), exactly as _Plotto_ intends.
- **Ending guidance** — pick an ending and the conflicts that actually deliver it light up 🏁,
  parsed from the book's back-matter "Classification by Symbols" (a real C-clause → ending index).
- **Name your characters** — replace Cook's `A`/`B`/`A-2` symbols with real names; substitution is
  display-only and grammatically aware (the article "A" in "A blizzard" stays put).
- **Readable conflicts** — Cook's `*` / `**` / `***` stage markers render as numbered stages, and
  every conflict is shown in full, never trimmed.
- **Local-first** — your plot autosaves in the browser. No accounts, no server. Export to Markdown.

## Run locally

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build to dist/
npm run build:data # regenerate public/plotto.json from source/plotto.txt
```

## How it's built

A static single-page app — **React + Vite + TypeScript**, no backend — plus a zero-dependency
Node **data pipeline** that parses the raw _Plotto_ text into a validated `plotto.json`. It deploys
to **GitHub Pages** automatically on every push to `main` (see `.github/workflows/deploy.yml`).

Full details in **[`docs/`](docs/README.md)**:
[Architecture](docs/ARCHITECTURE.md) ·
[Data model](docs/DATA_MODEL.md) ·
[Development](docs/DEVELOPMENT.md) ·
[Roadmap & status](docs/ROADMAP.md)

## Attribution & sources

This project stands entirely on public-domain source material and an existing digitization:

- **_Plotto: A New Method of Plot Suggestion for Writers of Creative Fiction_** by
  **William Wallace Cook** (Ellis Publishing Company, 1928). Published 1928 — **public domain**.
- The scanned book comes from the **[Internet Archive](https://archive.org/details/plottonewmethodo00cook)**.
- The cleaned, markup-tagged source text (`source/plotto.txt`) is from Gary Kacmarcik's
  **[garykac/plotto](https://github.com/garykac/plotto)** project, which digitized the Internet
  Archive scan. That repository ships no license; this project therefore treats the underlying
  **Plotto text as public domain** and **does not reuse Kac's parser code** — the pipeline in
  `scripts/build-data.mjs` is original work written from the documented text format. Kac's scripts
  are kept under `source/scripts/` for reference only.

Conflicts are cited by their _Plotto_ id throughout the app and in exports, so any plot you build
traces back to Cook's original.

## License

This project's own code — the data pipeline (`scripts/`) and the app (`src/`) — is released
under the **[MIT License](LICENSE)**. The underlying **_Plotto_ text is in the public domain**
and is not subject to that license (see [Attribution & sources](#attribution--sources)).

---

<sub>Built with [Claude Code](https://claude.com/claude-code).</sub>
