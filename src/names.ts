// Display-only character naming. The underlying conflict text is never mutated —
// this only affects what's shown.
//
// Cook writes the protagonists as capital symbols (A, B, A-2, AX, …) and uses
// lowercase "a" for the English article. That makes B and every multi-character
// symbol unambiguous. The one hard case is a bare capital "A", which is *usually*
// the male protagonist but is occasionally a sentence-initial article
// ("A blizzard rages"). We disambiguate structurally: character-A is a grammatical
// subject, so it is followed by a verb, an auxiliary/preposition, or punctuation;
// article-A precedes a noun or adjective. This rule matches ~1457 of the ~1493
// bare-"A" occurrences as the character, leaving only true article nouns as "A".

export type NameMap = Record<string, string>;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Closed-class function words that legitimately follow the character A.
const FUNCTION_WORDS = new Set(
  ("in on at by for from of to with into onto upon under over through about against between among during " +
    "before after without within toward towards across behind beside beyond near and but or nor yet so " +
    "because although though while whereas if unless since as who whom whose which that will can could would " +
    "should must may might shall has had have is was are am be been being do does did cannot then now again " +
    "also still thus never always soon later here there away back out up down off not no ever once only even " +
    "just too very much more most all some any both each either neither himself herself itself them him her " +
    "his she he they this these those what where why how when whether " +
    // common irregular past-tense verbs (no -ed/-s ending)
    "knew thought took taken went gave saw told made found kept met ran came became fell held lost won spoke " +
    "wrote sent brought caught sought felt meant bade drew grew set put let bore rose stood").split(/\s+/),
);

/** Is a bare capital "A" the character here, given the text that follows it? */
function aIsCharacter(after: string): boolean {
  const s = after.replace(/^['’]s\b/, ""); // A's -> possessive, still the character
  const m = s.match(/^\s*([^\s]+)/);
  if (!m) return true; // end of string
  const tok = m[1];
  if (/^[,;:.!?"“”'’()\-—*]/.test(tok)) return true; // punctuation next
  const w = tok.replace(/[^A-Za-z].*$/, "").toLowerCase(); // leading word only
  if (!w) return true;
  if (FUNCTION_WORDS.has(w)) return true;
  if (w.length >= 3 && (/s$/.test(w) || /ed$/.test(w) || /ing$/.test(w) || /ly$/.test(w))) return true;
  return false; // noun/adjective -> article "A"
}

export type Namer = (text: string, names: NameMap) => string;

/**
 * Build a substitution function bound to the full symbol vocabulary. Symbols
 * are matched longest-first so "A-2" wins over "A"; token boundaries keep the
 * "A" in "Adventure" untouched; a bare "A" is only renamed when grammatically
 * the character (see aIsCharacter).
 */
export function createNamer(allSymbols: string[]): Namer {
  const alternation = allSymbols
    .filter((s) => s.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const re = new RegExp(`(?<![A-Za-z0-9])(${alternation})(?![A-Za-z0-9])`, "g");

  return (text, names) => {
    if (!text || Object.keys(names).length === 0) return text;
    return text.replace(re, (m, _g, offset: number, str: string) => {
      const name = names[m];
      if (!name) return m;
      if (m === "A" && !aIsCharacter(str.slice(offset + 1))) return m;
      return name;
    });
  };
}

/** Symbols that actually carry a non-empty name. */
export function activeNames(names: NameMap): NameMap {
  const out: NameMap = {};
  for (const [k, v] of Object.entries(names)) if (v.trim()) out[k] = v.trim();
  return out;
}
