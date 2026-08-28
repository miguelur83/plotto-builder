import { legendFor, type PlottoIndex } from "./data";
import type { NameMap, Namer } from "./names";
import { synopsis } from "./masterplot";
import { splitPhases } from "./phases";
import type { PlotState } from "./usePlot";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface ExportBits {
  title: string;
  synopsisText: string;
  legend: { symbol: string; description: string; name: string | null }[];
  beats: { n: number; phases: string[]; cite: string }[];
}

/** Shared, name-applied content used by every export format. */
function bits(plot: PlotState, index: PlottoIndex, namer: Namer, names: NameMap): ExportBits {
  const conflicts = plot.steps
    .map((s) => index.byId.get(s.conflictId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const legend = legendFor(index, conflicts).map((s) => ({
    symbol: s.symbol,
    description: s.description,
    name: names[s.symbol]?.trim() || null,
  }));

  const beats = plot.steps.map((step, i) => {
    const c = index.byId.get(step.conflictId)!;
    const perm = c.permutations[step.permIndex] ?? c.permutations[0];
    const named = namer(perm?.text ?? "", names); // name first, then split, so stages keep context
    const variant = perm?.letter ? ` (${perm.letter})` : "";
    return { n: i + 1, phases: splitPhases(named), cite: `Plotto conflict ${c.id}${variant}` };
  });

  return {
    title: plot.title || "Untitled plot",
    synopsisText: synopsis(plot.frame, index.data.masterplot).text,
    legend,
    beats,
  };
}

const FOOTER = "Built from Plotto (W. W. Cook, 1928), public domain. Conflicts cited by id.";

/** Markdown — portable and editable. */
export function toMarkdown(plot: PlotState, index: PlottoIndex, namer: Namer, names: NameMap): string {
  const b = bits(plot, index, namer, names);
  const out: string[] = [`# ${b.title}`, ""];

  out.push("## Masterplot", "", `_${b.synopsisText}_`, "");

  if (b.legend.length) {
    out.push("## Characters", "");
    for (const s of b.legend) out.push(`- **${s.symbol}**${s.name ? ` — ${s.name}` : ""}: ${s.description}`);
    out.push("");
  }

  out.push("## Beats", "");
  for (const beat of b.beats) {
    const [first, ...rest] = beat.phases;
    out.push(`${beat.n}. ${first ?? ""}${rest.map((p) => `  \n   ${p}`).join("")}  `);
    out.push(`   _— ${beat.cite}_`);
  }
  out.push("", "---", `_${FOOTER}_`);
  return out.join("\n");
}

/** A self-contained, typeset HTML document — opens in any browser, prints to a clean PDF. */
export function toHtmlDocument(plot: PlotState, index: PlottoIndex, namer: Namer, names: NameMap): string {
  const b = bits(plot, index, namer, names);
  const body: string[] = [`<h1>${esc(b.title)}</h1>`];

  body.push(`<p class="synopsis">${esc(b.synopsisText)}</p>`);

  if (b.legend.length) {
    body.push("<h2>Characters</h2>", '<ul class="chars">');
    for (const s of b.legend) {
      body.push(`<li><span class="sym">${esc(s.symbol)}</span>${s.name ? ` <strong>${esc(s.name)}</strong>` : ""} <span class="desc">${esc(s.description)}</span></li>`);
    }
    body.push("</ul>");
  }

  body.push("<h2>Beats</h2>", '<ol class="beats">');
  for (const beat of b.beats) {
    const stages = beat.phases.map((p) => `<span class="stage">${esc(p)}</span>`).join("");
    body.push(`<li><div class="beat-body">${stages}</div><div class="cite">— ${esc(beat.cite)}</div></li>`);
  }
  body.push("</ol>", `<footer>${esc(FOOTER)}</footer>`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(b.title)}</title>
<style>
  :root { color-scheme: light; }
  body { max-width: 46rem; margin: 3rem auto; padding: 0 1.5rem;
    font: 16px/1.6 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: #2b2620; background: #fffdf8; }
  h1 { font-size: 2rem; margin: 0 0 .25rem; }
  h2 { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; color: #8a5a2b;
    border-bottom: 1px solid #e2dbcc; padding-bottom: .3rem; margin: 2rem 0 1rem; font-family: system-ui, sans-serif; }
  .synopsis { font-style: italic; color: #6b6256; font-size: 1.15rem; margin: 0 0 1rem; }
  ul.chars { list-style: none; padding: 0; }
  ul.chars li { margin: .25rem 0; }
  .sym { font-family: ui-monospace, Menlo, monospace; font-size: .85rem; color: #8a5a2b; font-weight: 700; }
  .desc { color: #6b6256; }
  ol.beats { padding-left: 1.4rem; }
  ol.beats li { margin: 0 0 1.1rem; }
  .beat-body .stage { display: block; }
  .beat-body .stage + .stage { margin-top: .3rem; }
  .cite { font-family: system-ui, sans-serif; font-size: .8rem; color: #8a5a2b; margin-top: .3rem; }
  footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e2dbcc;
    font-family: system-ui, sans-serif; font-size: .78rem; color: #6b6256; }
  @media print { body { margin: 0; max-width: none; } }
</style>
</head>
<body>
${body.join("\n")}
</body>
</html>`;
}

/** Kebab-case slug from the plot title, for the download filename. */
export function slugify(title: string): string {
  const s = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "plotto-plot";
}

/** Trigger a client-side file download of `content`. */
export function downloadFile(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
