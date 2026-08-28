import type { Clause, Masterplot } from "./types";
import type { PlotFrame } from "./usePlot";

export interface FrameClauses {
  a: Clause | undefined;
  b: Clause | undefined;
  c: Clause | undefined;
}

export function frameClauses(frame: PlotFrame, mp: Masterplot): FrameClauses {
  return {
    a: mp.aClauses.find((x) => x.number === frame.a),
    b: mp.bClauses.find((x) => x.number === frame.b),
    c: mp.cClauses.find((x) => x.number === frame.c),
  };
}

const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** The masterplot sentence, with placeholders for unfilled clauses. */
export function synopsis(frame: PlotFrame, mp: Masterplot): { text: string; complete: boolean } {
  const { a, b, c } = frameClauses(frame, mp);
  const text = `${a ? a.text : "A protagonist"}, ${b ? lower(b.text) : "in some central action"}, ${
    c ? lower(c.text) : "reaching some ending"
  }.`;
  return { text, complete: Boolean(a && b && c) };
}
