// Minimal Markdown export for the plot builder. The dedicated export/import
// increment will add plain-text, JSON round-trip, and file downloads; for now
// this powers a "copy to clipboard" so a built plot is never trapped in the app.

import { legendFor, type PlottoIndex } from "./data";
import type { NameMap, Namer } from "./names";
import type { PlotState } from "./usePlot";

export function toMarkdown(
  plot: PlotState,
  index: PlottoIndex,
  namer: Namer,
  names: NameMap,
): string {
  const lines: string[] = [];
  lines.push(`# ${plot.title || "Untitled plot"}`, "");

  // Masterplot frame (A/B/C clauses), if chosen.
  const mp = index.data.masterplot;
  const a = mp.aClauses.find((x) => x.number === plot.frame.a);
  const b = mp.bClauses.find((x) => x.number === plot.frame.b);
  const cc = mp.cClauses.find((x) => x.number === plot.frame.c);
  if (a || b || cc) {
    const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
    const sentence = [a?.text ?? "A protagonist", lower(b?.text ?? "a central action"), lower(cc?.text ?? "an ending")].join(", ");
    lines.push("## Masterplot frame", "", `_${sentence}._`, "");
  }

  const conflicts = plot.steps
    .map((s) => index.byId.get(s.conflictId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const legend = legendFor(index, conflicts);
  if (legend.length) {
    lines.push("## Characters", "");
    for (const s of legend) {
      const name = names[s.symbol]?.trim();
      lines.push(`- **${s.symbol}**${name ? ` — ${name}` : ""}: ${s.description}`);
    }
    lines.push("");
  }

  lines.push("## Masterplot", "");
  plot.steps.forEach((step, i) => {
    const c = index.byId.get(step.conflictId);
    if (!c) return;
    const perm = c.permutations[step.permIndex] ?? c.permutations[0];
    const variant = perm?.letter ? ` (${perm.letter})` : "";
    lines.push(`${i + 1}. ${namer(perm?.text ?? "", names)}  \n   _— Plotto conflict ${c.id}${variant}_`);
  });
  lines.push("");

  lines.push(
    "---",
    `_Built from Plotto (W. W. Cook, 1928), public domain. Conflicts cited by id._`,
  );
  return lines.join("\n");
}
