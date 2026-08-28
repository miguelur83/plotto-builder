import type { PlottoIndex } from "./data";
import type { Conflict, Ref } from "./types";

// A concrete, pickable continuation derived from one PRE:/POST: reference.
// Resolving at the *permutation* level (not the conflict-level union) keeps the
// suggestions faithful to Cook: each permutation carries only the lead-ups and
// carry-ons that actually fit that phrasing.
export interface StepOption {
  conflict: Conflict;
  permIndex: number;
  permLetter: string | null;
  annotation: string | null; // phase + transform, verbatim (Cook's adaptation note)
  raw: string;
  chainRest: string[]; // remaining ids when the source ref is a compound sequence
}

function letterToIndex(c: Conflict, letter: string | null): number {
  if (!letter) return 0;
  const i = c.permutations.findIndex((p) => p.letter === letter);
  return i >= 0 ? i : 0;
}

function annotationOf(ref: Ref): string | null {
  const parts = [ref.phase, ref.transform].filter(Boolean) as string[];
  return parts.length ? parts.join(" ") : null;
}

function leafOptions(
  ref: Ref,
  index: PlottoIndex,
  chainRest: string[],
  out: StepOption[],
): void {
  if (!ref.targetConflict) return;
  const c = index.byId.get(ref.targetConflict);
  if (!c) return; // dangling reference (e.g. the 3633 typo) — skip silently
  const letters = ref.targetPermutations?.length ? ref.targetPermutations : [null];
  const ann = annotationOf(ref);
  for (const L of letters) {
    out.push({
      conflict: c,
      permIndex: letterToIndex(c, L),
      permLetter: L,
      annotation: ann,
      raw: ref.raw,
      chainRest,
    });
  }
}

/** Flatten a permutation's refs into concrete, de-duplicated options. */
export function resolveOptions(refs: Ref[], index: PlottoIndex): StepOption[] {
  const out: StepOption[] = [];
  for (const ref of refs) {
    if (ref.kind === "sequence" && ref.sequence?.length) {
      const [first, ...rest] = ref.sequence;
      const restIds = rest.map((r) => r.targetConflict ?? r.raw);
      leafOptions(first, index, restIds, out);
    } else if (ref.kind === "alt" && ref.alt?.length) {
      for (const alt of ref.alt) leafOptions(alt, index, [], out);
    } else {
      leafOptions(ref, index, [], out);
    }
  }
  // De-dupe by conflict+permutation, keeping the first (annotated) occurrence.
  const seen = new Set<string>();
  return out.filter((o) => {
    const key = `${o.conflict.id}:${o.permIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
