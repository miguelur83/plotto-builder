import type { CharacterSymbol, Conflict, PlottoData } from "./types";

// A derived, indexed view of the dataset that the UI works against.
export interface PlottoIndex {
  data: PlottoData;
  conflicts: Conflict[];
  byId: Map<string, Conflict>;
  symbolByName: Map<string, CharacterSymbol>;
  groups: string[];
  /** Lowercased searchable blob per conflict id, built once. */
  searchBlob: Map<string, string>;
  /** Every character surface form seen anywhere, longest-first (for naming regex). */
  allSymbols: string[];
  /** conflict id → C-clause numbers it can terminate (from the back-matter index). */
  terminalFor: Map<string, number[]>;
}

let cache: Promise<PlottoIndex> | null = null;

// base is "./" in vite config, so the JSON resolves relative to the deployed page.
const DATA_URL = new URL("plotto.json", document.baseURI).href;

export function loadPlotto(): Promise<PlottoIndex> {
  if (!cache) cache = fetchAndIndex();
  return cache;
}

async function fetchAndIndex(): Promise<PlottoIndex> {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load plotto.json (${res.status})`);
  const data = (await res.json()) as PlottoData;

  const byId = new Map<string, Conflict>();
  const searchBlob = new Map<string, string>();
  for (const c of data.conflicts) {
    byId.set(c.id, c);
    const blob = [
      c.id,
      c.group,
      c.subgroup ?? "",
      ...c.permutations.map((p) => p.text),
    ]
      .join(" ")
      .toLowerCase();
    searchBlob.set(c.id, blob);
  }

  const symbolByName = new Map<string, CharacterSymbol>();
  for (const s of data.characterSymbols) symbolByName.set(s.symbol, s);

  const groups = [...new Set(data.conflicts.map((c) => c.group))];

  const symSet = new Set<string>(data.characterSymbols.map((s) => s.symbol));
  for (const c of data.conflicts) for (const s of c.characters) symSet.add(s);
  const allSymbols = [...symSet].sort((a, b) => b.length - a.length);

  const terminalFor = new Map<string, number[]>();
  for (const [cNum, ids] of Object.entries(data.masterplot.cClauseIndex ?? {})) {
    for (const id of ids) {
      const arr = terminalFor.get(id) ?? [];
      arr.push(Number(cNum));
      terminalFor.set(id, arr);
    }
  }

  return { data, conflicts: data.conflicts, byId, symbolByName, groups, searchBlob, allSymbols, terminalFor };
}

/** Filter conflicts by free-text query and optional group. */
export function searchConflicts(
  index: PlottoIndex,
  query: string,
  group: string | null,
): Conflict[] {
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  return index.conflicts.filter((c) => {
    if (group && c.group !== group) return false;
    if (terms.length === 0) return true;
    const blob = index.searchBlob.get(c.id)!;
    return terms.every((t) => blob.includes(t));
  });
}

/**
 * Resolve which character symbols appear across a set of conflicts, in the
 * canonical order of the dataset's symbol key. Powers the legend.
 */
export function legendFor(index: PlottoIndex, conflicts: Conflict[]): CharacterSymbol[] {
  const used = new Set<string>();
  for (const c of conflicts) {
    for (const raw of c.characters) {
      // Surface forms may carry a lowercase gender prefix (aB-2) or numeric
      // suffix (X-2); map back to the base symbol key when possible.
      const base = raw.replace(/^[ab]/, "").replace(/-\d+$/, "");
      if (index.symbolByName.has(raw)) used.add(raw);
      else if (index.symbolByName.has(base)) used.add(base);
    }
  }
  return index.data.characterSymbols.filter((s) => used.has(s.symbol));
}
