import { useState } from "react";
import type { Conflict, Masterplot, CharacterSymbol } from "../types";
import type { NameMap, Namer } from "../names";
import type { PlotFrame } from "../usePlot";
import { CharacterNames } from "./CharacterNames";

type ClauseKind = keyof PlotFrame;

interface Props {
  masterplot: Masterplot;
  frame: PlotFrame;
  onPickClause: (kind: ClauseKind, number: number) => void;
  symbolsInScope: CharacterSymbol[];
  names: NameMap;
  onSetName: (symbol: string, name: string) => void;
  // reference search
  query: string;
  onQuery: (q: string) => void;
  results: Conflict[];
  onOpenConflict: (id: string) => void;
  namer: Namer;
}

export function Setup(props: Props) {
  const { masterplot, frame, onPickClause, symbolsInScope, names, onSetName } = props;
  const [expanded, setExpanded] = useState<ClauseKind | null>(
    frame.a == null ? "a" : frame.b == null ? "b" : null,
  );
  const [showNames, setShowNames] = useState(true);

  const pick = (kind: ClauseKind, number: number) => {
    onPickClause(kind, number);
    setExpanded(kind === "a" ? "b" : null); // choosing protagonist opens the action
  };

  const picker = (
    kind: ClauseKind,
    num: string,
    label: string,
    options: { number: number; text: string }[],
    hint?: string,
  ) => {
    const chosen = options.find((o) => o.number === frame[kind]);
    const open = expanded === kind;
    return (
      <div className={`picker ${open ? "open" : ""}`}>
        <button className="picker-head" onClick={() => setExpanded(open ? null : kind)}>
          <span className="slot-num">{num}</span>
          <span className="slot-body">
            <span className="slot-label">{label}{hint && !chosen ? ` · ${hint}` : ""}</span>
            <span className={`slot-value ${chosen ? "set" : ""}`}>
              {chosen ? `${chosen.number}. ${chosen.text}` : "Choose…"}
            </span>
          </span>
          <span className="picker-chevron">{open ? "▾" : "▸"}</span>
        </button>
        {open && (
          <div className="clause-list">
            {options.map((o) => (
              <button
                key={o.number}
                className={`clause-item ${frame[kind] === o.number ? "chosen" : ""}`}
                onClick={() => pick(kind, o.number)}
              >
                <span className="clause-num">{o.number}</span>
                <span className="clause-text">{o.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="setup">
      <div className="setup-scroll">
        <section className="panel-section">
          <h3 className="section-title">Masterplot <span className="tiny">structure</span></h3>
          <p className="section-hint">
            Set the frame: a protagonist, a central action, an ending. Cook's clauses are
            interchangeable — any combination is valid. The action decides your opening conflicts.
          </p>
          <div className="pickers">
            {picker("a", "①", "Protagonist", masterplot.aClauses)}
            {picker("b", "②", "Central action", masterplot.bClauses)}
            {picker("c", "③", "Ending", masterplot.cClauses, "optional")}
          </div>
        </section>

        <section className="panel-section">
          <button className="section-title toggle" onClick={() => setShowNames((v) => !v)}>
            {showNames ? "▾" : "▸"} Characters
          </button>
          {showNames && (
            <>
              <p className="section-hint">Name the symbols and they’ll read as names everywhere. Optional.</p>
              <CharacterNames symbols={symbolsInScope} names={names} onSetName={onSetName} />
            </>
          )}
        </section>

        <section className="panel-section">
          <Search {...props} />
        </section>
      </div>
    </aside>
  );
}

function Search({ query, onQuery, results, onOpenConflict, namer, names }: Props) {
  return (
    <div className="ref-search">
      <h3 className="section-title">Find any conflict</h3>
      <input
        type="search"
        placeholder="🔍 by id or keyword…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="ref-results">
          {results.slice(0, 40).map((c) => (
            <button key={c.id} className="ref-item" onClick={() => onOpenConflict(c.id)}>
              <span className="id">#{c.id}</span>
              <span className="snippet">{namer(c.permutations[0]?.text ?? "", names)}</span>
            </button>
          ))}
          {results.length === 0 && <div className="ref-empty">No matches.</div>}
        </div>
      )}
    </div>
  );
}
