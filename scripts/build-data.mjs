#!/usr/bin/env node
// Plotto data pipeline — parses source/plotto.txt into public/plotto.json.
//
// The Plotto TEXT is public domain (W. W. Cook, 1928). This parser is original
// work written from the documented line-markup format; it does not reuse Gary
// Kacmarcik's (unlicensed) Python code, only the same public-domain source file.
//
// Run:  node scripts/build-data.mjs [--src <path>] [--out <path>]
// Emits public/plotto.json and prints a validation report. Exits non-zero only
// on structural failure (missing conflicts, unparseable refs), not on the known
// data typos it reports as dangling links.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------- args ----------
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const SRC = resolve(ROOT, getArg("--src", "source/plotto.txt"));
const OUT = resolve(ROOT, getArg("--out", "public/plotto.json"));

// ---------- helpers ----------
const stripTrailingPunct = (s) => s.replace(/[.,]\s*$/, "").trim();

/**
 * Parse a single reference group's inner text (already stripped of the outer
 * parens) into a Ref tree. Sequences (;) and alternations ( or ) nest.
 * @param {string} raw
 * @returns {object}
 */
function parseRef(raw) {
  const text = raw.trim();

  // Sequence: "318; 236; 267"
  if (text.includes(";")) {
    return { raw: text, kind: "sequence", sequence: text.split(";").map((p) => parseRef(p)) };
  }
  // Alternation: "123 or 234"
  if (/\bor\b/.test(text) && /\d+\s+or\s+\d+/.test(text)) {
    return { raw: text, kind: "alt", alt: text.split(/\s+or\s+/).map((p) => parseRef(p)) };
  }

  const ref = {
    raw: text,
    kind: "ref",
    targetConflict: null,
    targetPermutations: [],
    phase: null,
    transform: null,
  };
  if (text === "") return ref; // empty group ()

  // Leading letter-only group like "(a)" — a bare permutation pointer; no numeric target.
  if (/^[a-m]$/.test(text)) {
    ref.targetPermutations = [text];
    return ref;
  }

  // (123a, b, c) ...rest
  const m = text.match(/^(\d+)((?:[a-m])(?:,\s*[a-m])*)?(.*)$/);
  if (!m) {
    ref.transform = text; // preserve verbatim, mark unresolved
    return ref;
  }
  ref.targetConflict = String(Number(m[1])); // normalize zero-padded ids (e.g. "097" -> "97")
  if (m[2]) ref.targetPermutations = m[2].split(",").map((s) => s.trim());
  let rest = (m[3] || "").trim();

  // Phase / range marker, e.g. "-*", "-**", "*-**", "**-***"
  const phaseM = rest.match(/^(-\*{1,5}|\*{1,4}-\*{2,5})(?=\s|$)/);
  if (phaseM) {
    ref.phase = phaseM[1];
    rest = rest.slice(phaseM[0].length).trim();
  }
  // Whatever remains (ch/tr/add/eliminate annotations, "-1"/"-2" selectors, etc.)
  if (rest) ref.transform = rest.replace(/^&\s*/, "").trim() || null;
  return ref;
}

/** Split a PRE:/POST: payload into its top-level "(...)" groups. */
function parseRefList(payload) {
  const refs = [];
  const re = /\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(payload)) !== null) refs.push(parseRef(m[1]));
  return refs;
}

/** Collect every base conflict id targeted anywhere in a Ref tree. */
function collectTargets(ref, acc = new Set()) {
  if (!ref) return acc;
  if (ref.targetConflict) acc.add(ref.targetConflict);
  for (const child of ref.sequence || []) collectTargets(child, acc);
  for (const child of ref.alt || []) collectTargets(child, acc);
  return acc;
}

// ---------- read source ----------
const rawText = readFileSync(SRC, "utf8");
const lines = rawText.split(/\r?\n/);

// ---------- parse front-matter tables ----------
const numberedList = (startId, { paren }) => {
  // Find "-- ID:startId", then the first FORMAT_LINES:bodylist, collect items.
  const out = [];
  let i = lines.findIndex((l) => l.trim() === `-- ID:${startId}`);
  if (i < 0) return out;
  // advance to first content line after a FORMAT_LINES marker
  while (i < lines.length && !/^-- FORMAT_LINES:/.test(lines[i])) i++;
  i++;
  const rx = paren ? /^\((\d+)\)\s*(.*)$/ : /^(\d+)\.\s*(.*)$/;
  for (; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "") continue;
    if (l.startsWith("--")) break; // next directive ends the list
    const m = l.match(rx);
    if (m) out.push({ number: Number(m[1]), text: stripTrailingPunct(m[2]) });
  }
  return out;
};

const aClauses = numberedList("a-clauses", { paren: false });
const bClauses = numberedList("b-clauses", { paren: true });
const cClauses = numberedList("c-clauses", { paren: true });

// B-clause -> conflict index
const bClauseIndex = {};
{
  let i = lines.findIndex((l) => l.trim() === "-- ID:index-b-clause-conflicts");
  if (i >= 0) {
    while (i < lines.length && !/^-- FORMAT_LINES:/.test(lines[i])) i++;
    i++;
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l === "") continue;
      if (l.startsWith("--")) break;
      const m = l.match(/^\((\d+)\)\s*(.*)$/);
      if (!m) continue;
      const ids = [...m[2].matchAll(/@\{(\d+)\}/g)].map((x) => x[1]);
      bClauseIndex[m[1]] = { conflicts: ids, note: ids.length ? null : m[2].trim() };
    }
  }
}

// Character symbols
const characterSymbols = [];
{
  let i = lines.findIndex((l) => l.trim() === "-- ID:character-symbols");
  if (i >= 0) {
    for (; i < lines.length; i++) {
      const l = lines[i];
      if (/^-- FORMAT_BEGIN/.test(l) && characterSymbols.length) break; // trailing note block
      if (/^-- HR/.test(l)) break;
      const m = l.match(/^([A-Za-z][A-Za-z0-9-]*),\s+(.+)$/);
      if (m) {
        const symbol = m[1];
        const description = m[2].trim();
        const gender = /female|mother|sister|daughter|aunt|niece|grand mother|grandmother/i.test(description)
          ? "f"
          : /male|father|brother|son|uncle|nephew|grandfather/i.test(description)
          ? "m"
          : null;
        const relM = description.match(/\bof (A|B)\b/);
        characterSymbols.push({ symbol, description, gender, relationOf: relM ? relM[1] : null });
      }
    }
  }
}
const symbolSet = new Set(characterSymbols.map((c) => c.symbol));

// Known symbol bases for extracting characters from conflict text.
const symbolBases = new Set([
  "A", "B", "AX", "BX", "X", "CH",
  ...characterSymbols.map((c) => c.symbol.replace(/-\d+$/, "")),
]);
function extractCharacters(text) {
  const found = new Set();
  // Surface forms: optional a/b prefix, base, optional -digit or -A/-B relation tail.
  const re = /\b([ab])?([A-Z]{1,3})(-(?:[0-9]+|[AB]))?\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const base = m[2];
    const tail = m[3] || "";
    if (base === "AU" && tail === "") continue; // avoid stray; AU-A handled via tail
    const canonicalBase = base;
    if (symbolBases.has(canonicalBase) || symbolSet.has(base + tail)) {
      found.add((m[1] || "") + base + tail);
    }
  }
  return [...found].sort();
}

// ---------- parse conflict section ----------
const START = lines.findIndex((l) => l.trim() === "-- page 18");
const END = lines.findIndex((l) => l.trim() === "-- page 190");
if (START < 0 || END < 0) {
  console.error("FATAL: could not locate conflict-section bounds (page 18 / page 190).");
  process.exit(1);
}

const conflicts = [];
let curGroup = null, curSub = null, curB = null;
let conflict = null; // current conflict record
let perm = null; // current permutation being built
let inText = false;

const flushPerm = () => {
  if (conflict && perm) conflict.permutations.push(perm);
  perm = null;
  inText = false;
};
const flushConflict = () => {
  flushPerm();
  if (conflict) conflicts.push(conflict);
  conflict = null;
};

for (let i = START; i <= END; i++) {
  const l = lines[i];
  const t = l.trim();

  let m;
  if ((m = t.match(/^ConflictGroup\{(.+)\}$/))) { curGroup = m[1]; continue; }
  if ((m = t.match(/^ConflictSubGroup\{(.*)\}$/))) { curSub = m[1] || null; continue; }
  if ((m = t.match(/^B\{(\d+)\}\s*(.*)$/))) { curB = { number: Number(m[1]), name: m[2] }; continue; }

  if ((m = t.match(/^Conflict\{(\d+)\}$/))) {
    flushConflict();
    conflict = {
      id: m[1],
      group: curGroup,
      subgroup: curSub,
      bClause: curB ? curB.number : null,
      characters: [],
      permutations: [],
      leadUps: [],
      carryOns: [],
    };
    continue;
  }

  if (!conflict) continue;

  // (x) PRE: <links>   |   PRE: <links>
  if ((m = t.match(/^(?:\(([a-m])\)\s*)?PRE:\s*(.*)$/))) {
    flushPerm();
    perm = {
      letter: m[1] || null,
      text: "",
      textLines: [],
      leadUps: parseRefList(m[2]),
      carryOns: [],
    };
    inText = true;
    continue;
  }

  if ((m = t.match(/^POST:\s*(.*)$/))) {
    if (perm) {
      perm.carryOns = parseRefList(m[1]);
      perm.text = perm.textLines.join(" ").replace(/\s+/g, " ").trim();
      delete perm.textLines;
      flushPerm();
    }
    continue;
  }

  // In-conflict directive lines (e.g. "-- MISTRESS master") are gender-swap hints; skip.
  if (t.startsWith("--")) continue;

  if (inText && perm) {
    if (t !== "") perm.textLines.push(t);
  }
}
flushConflict();

// ---------- derive unions, characters ----------
for (const c of conflicts) {
  const lead = new Set();
  const carry = new Set();
  const allText = [];
  for (const p of c.permutations) {
    allText.push(p.text);
    for (const r of p.leadUps) for (const id of collectTargets(r)) lead.add(id);
    for (const r of p.carryOns) for (const id of collectTargets(r)) carry.add(id);
  }
  c.leadUps = [...lead].sort((a, b) => Number(a) - Number(b));
  c.carryOns = [...carry].sort((a, b) => Number(a) - Number(b));
  c.characters = extractCharacters(allText.join(" "));
}

// ---------- validate ----------
const idSet = new Set(conflicts.map((c) => c.id));
const expectedContiguous =
  conflicts.length === 1462 &&
  conflicts.every((c, i) => Number(c.id) === i + 1);

const danglingLinks = [];
for (const c of conflicts) {
  for (const p of c.permutations) {
    for (const [dir, refs] of [["leadUp", p.leadUps], ["carryOn", p.carryOns]]) {
      for (const r of refs) {
        for (const id of collectTargets(r)) {
          if (!idSet.has(id)) {
            danglingLinks.push({ from: c.id, permutation: p.letter, direction: dir, target: id, raw: r.raw });
          }
        }
      }
    }
  }
}

// ---------- parse C-clause -> terminal-conflict index (back-matter) ----------
// Cook's "Classification by Symbols" (from page 195) lists terminal conflicts
// prefixed with their C-clause number in parens, e.g. "(1) A ... commits suicide 281b".
// We reconstruct multi-line entries, keep those that begin with "(N)", and take the
// trailing conflict id. Every extracted id is validated against a real conflict.
function parseCClauseIndex() {
  const startIdx = lines.findIndex((l) => l.trim() === "-- page 195");
  const cClauseIndex = {};
  if (startIdx < 0) return { cClauseIndex, terminalPairs: 0 };
  const idEnd = /(\d+)\s*([a-m])?\s*$/;
  const entries = [];
  let buf = [];
  for (let i = startIdx; i < lines.length; i++) {
    const s = lines[i].trim();
    if (s === "" || s.startsWith("--")) continue;
    buf.push(s);
    if (idEnd.test(s)) { entries.push(buf.join(" ")); buf = []; }
    else if (buf.length === 1 && /^[A-Z][A-Za-z0-9,&\- ]{0,40}$/.test(s) && !/[a-z]{4,}/.test(s)) {
      buf = []; // symbol-group / section header — drop
    }
  }
  const sets = {};
  let pairs = 0;
  for (const e of entries) {
    const m = e.match(/^\((\d+)\)\s+(.*)$/);
    if (!m) continue;
    const cNum = m[1];
    const im = m[2].match(idEnd);
    if (!im) continue;
    const base = im[1];
    if (!idSet.has(base)) continue; // validate against real conflicts
    (sets[cNum] ??= new Set()).add(base);
    pairs++;
  }
  for (const cNum of Object.keys(sets)) {
    cClauseIndex[cNum] = [...sets[cNum]].sort((a, b) => Number(a) - Number(b));
  }
  return { cClauseIndex, terminalPairs: pairs };
}
const { cClauseIndex, terminalPairs } = parseCClauseIndex();
const terminalConflicts = new Set(Object.values(cClauseIndex).flat());

// ---------- assemble output ----------
const out = {
  meta: {
    source: "garykac/plotto@gh-pages/plotto.txt",
    sourceNote: "Text public domain (W. W. Cook, 1928). Parser original; Kac's code not reused.",
    generatedAt: new Date().toISOString(),
    counts: {
      conflicts: conflicts.length,
      permutations: conflicts.reduce((n, c) => n + c.permutations.length, 0),
      groups: new Set(conflicts.map((c) => c.group)).size,
      subgroups: new Set(conflicts.map((c) => c.subgroup)).size,
      bClauses: bClauses.length,
      aClauses: aClauses.length,
      cClauses: cClauses.length,
      characterSymbols: characterSymbols.length,
      danglingLinks: danglingLinks.length,
      terminalConflicts: terminalConflicts.size,
      cClauseTerminalPairs: terminalPairs,
    },
  },
  characterSymbols,
  masterplot: { aClauses, bClauses, cClauses, bClauseIndex, cClauseIndex },
  conflicts,
  danglingLinks,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");

// ---------- report ----------
const bytes = Buffer.byteLength(JSON.stringify(out));
console.log("Plotto data pipeline — validation report");
console.log("=".repeat(46));
console.log(`source            : ${SRC}`);
console.log(`output            : ${OUT}  (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`conflicts         : ${conflicts.length}  ${expectedContiguous ? "(contiguous 1..1462 OK)" : "!! NOT contiguous 1..1462"}`);
console.log(`permutations      : ${out.meta.counts.permutations}`);
console.log(`groups/subgroups  : ${out.meta.counts.groups} / ${out.meta.counts.subgroups}`);
console.log(`clauses A/B/C     : ${aClauses.length} / ${bClauses.length} / ${cClauses.length}`);
console.log(`character symbols : ${characterSymbols.length}`);
console.log(`terminal conflicts: ${terminalConflicts.size} (${terminalPairs} C-clause pairs, C1–${Math.max(...Object.keys(cClauseIndex).map(Number))})`);
console.log(`dangling links    : ${danglingLinks.length}`);
for (const d of danglingLinks) {
  console.log(`   - conflict ${d.from}${d.permutation ? `(${d.permutation})` : ""} ${d.direction} -> ${d.target}  [raw: "${d.raw}"]`);
}

const structuralOk = expectedContiguous && aClauses.length === 15 && bClauses.length === 62 && cClauses.length === 15;
if (!structuralOk) {
  console.error("\nFAIL: structural expectations not met.");
  process.exit(2);
}
console.log("\nOK: structure verified. Dangling links (if any) are source data typos, reported above.");
