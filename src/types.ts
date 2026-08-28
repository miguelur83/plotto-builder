// Types mirroring the shape emitted by scripts/build-data.mjs -> public/plotto.json.

export interface CharacterSymbol {
  symbol: string;
  description: string;
  gender: "m" | "f" | null;
  relationOf: "A" | "B" | null;
}

export interface Clause {
  number: number;
  text: string;
}

export interface BClauseIndexEntry {
  conflicts: string[];
  note: string | null;
}

export interface Masterplot {
  aClauses: Clause[];
  bClauses: Clause[];
  cClauses: Clause[];
  bClauseIndex: Record<string, BClauseIndexEntry>;
  /** C-clause number → conflict ids that terminate the story that way. */
  cClauseIndex: Record<string, string[]>;
}

/** One cross-reference inside a PRE:/POST: group. Sequences/alternations nest. */
export interface Ref {
  raw: string;
  kind: "ref" | "sequence" | "alt";
  targetConflict?: string | null;
  targetPermutations?: string[];
  phase?: string | null;
  transform?: string | null;
  sequence?: Ref[];
  alt?: Ref[];
}

export interface Permutation {
  letter: string | null;
  text: string;
  leadUps: Ref[];
  carryOns: Ref[];
}

export interface Conflict {
  id: string;
  group: string;
  subgroup: string | null;
  bClause: number | null;
  characters: string[];
  permutations: Permutation[];
  /** Deduped union of base target ids — what the graph consumes. */
  leadUps: string[];
  carryOns: string[];
}

export interface DanglingLink {
  from: string;
  permutation: string | null;
  direction: "leadUp" | "carryOn";
  target: string;
  raw: string;
}

export interface PlottoData {
  meta: {
    source: string;
    sourceNote: string;
    generatedAt: string;
    counts: Record<string, number>;
  };
  characterSymbols: CharacterSymbol[];
  masterplot: Masterplot;
  conflicts: Conflict[];
  danglingLinks: DanglingLink[];
}
