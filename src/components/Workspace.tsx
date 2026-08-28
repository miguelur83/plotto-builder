import { useState } from "react";
import type { PlottoIndex } from "../data";
import type { StepOption } from "../options";
import type { NameMap, Namer } from "../names";
import type { Conflict } from "../types";
import type { PlotFrame } from "../usePlot";
import { ConflictText } from "./ConflictText";

interface Preview {
  conflictId: string;
  permIndex: number;
}

interface Props {
  index: PlottoIndex;
  namer: Namer;
  names: NameMap;
  frame: PlotFrame;
  openings: Conflict[];
  moreOpenings: Conflict[];
  forward: StepOption[];
  backward: StepOption[];
  endBeatId: string | null;
  startBeatId: string | null;
  preview: Preview | null;
  hasBeats: boolean;
  inPlot: (id: string) => boolean;
  onBegin: (id: string) => void;
  onAddForward: (id: string, permIndex: number) => void;
  onAddBackward: (id: string, permIndex: number) => void;
  onOpen: (id: string, permIndex: number) => void;
  onSetPreviewPerm: (permIndex: number) => void;
  onAddPreview: (where: "end" | "start") => void;
  onClosePreview: () => void;
}

/** Is this conflict a terminal (ending) conflict, and does it match the chosen C-clause? */
function endingBadge(index: PlottoIndex, id: string, frameC: number | null) {
  const cs = index.terminalFor.get(id);
  if (!cs || cs.length === 0) return null;
  if (frameC != null && cs.includes(frameC)) return { label: "🏁 delivers your ending ③", strong: true };
  return { label: "🏁 can end a story", strong: false };
}

function Meta({ index, c }: { index: PlottoIndex; c: Conflict }) {
  const bText = c.bClause != null
    ? index.data.masterplot.bClauses.find((b) => b.number === c.bClause)?.text
    : undefined;
  return (
    <div className="card-meta">
      <span className="grp">{c.group}{c.subgroup ? ` ▸ ${c.subgroup}` : ""}</span>
      {c.bClause != null && <span className="bchip" title={bText}>B{c.bClause}</span>}
    </div>
  );
}

function ChoiceCard({
  index, c, permIndex, namer, names, frameC, annotation, chainRest, action, added,
}: {
  index: PlottoIndex;
  c: Conflict;
  permIndex: number;
  namer: Namer;
  names: NameMap;
  frameC: number | null;
  annotation?: string | null;
  chainRest?: string[];
  action: { label: string; onClick: () => void; kind: "lead" | "carry" | "begin" };
  added: boolean;
}) {
  const perm = c.permutations[permIndex] ?? c.permutations[0];
  const ending = endingBadge(index, c.id, frameC);
  return (
    <div className={`choice ${added ? "added" : ""}`}>
      <div className="choice-head">
        <span className="choice-id">#{c.id}{perm?.letter ?? ""}</span>
        <Meta index={index} c={c} />
        {ending && <span className={`ending-badge ${ending.strong ? "strong" : ""}`}>{ending.label}</span>}
        <span className="choice-spacer" />
        <button className={`btn ${action.kind === "lead" ? "" : "primary"} choice-add`} disabled={added} onClick={action.onClick}>
          {added ? "✓ in plot" : action.label}
        </button>
      </div>
      <ConflictText className="choice-text" text={perm?.text ?? ""} namer={namer} names={names} />
      {(annotation || (chainRest && chainRest.length > 0)) && (
        <div className="choice-notes">
          {annotation && <span className="opt-ann" title="Cook's adaptation note — change/transpose characters to match">{annotation}</span>}
          {chainRest && chainRest.length > 0 && (
            <span className="opt-chain" title="Compound suggestion — a further beat follows">then → {chainRest.join(" → ")}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function Workspace(props: Props) {
  const { index, namer, names, frame, preview, hasBeats } = props;
  const [showMore, setShowMore] = useState(false);

  if (preview) {
    const c = index.byId.get(preview.conflictId);
    if (c) return <PreviewPane {...props} conflict={c} />;
  }

  if (frame.b == null) return <Welcome hasProtagonist={frame.a != null} />;

  if (!hasBeats) {
    const bText = index.data.masterplot.bClauses.find((b) => b.number === frame.b)?.text ?? "";
    return (
      <div className="workspace">
        <header className="ws-head">
          <div className="ws-crumb">Opening conflict</div>
          <h2>Where does the action begin?</h2>
          <p className="ws-sub"><span className="bchip">B{frame.b}</span> {bText}</p>
          <p className="ws-instr">Read each opening in full, then press <strong>Begin here</strong> on the one that fits. It becomes your first beat; you’ll extend it forward and backward next.</p>
        </header>
        <div className="choices">
          {props.openings.map((c) => (
            <ChoiceCard key={c.id} index={index} c={c} permIndex={0} namer={namer} names={names} frameC={frame.c}
              added={props.inPlot(c.id)}
              action={{ label: "Begin here →", kind: "begin", onClick: () => props.onBegin(c.id) }} />
          ))}
          {props.openings.length === 0 && props.moreOpenings.length === 0 && (
            <p className="ws-instr">This action applies broadly — use “Find any conflict” on the left to pick any opening.</p>
          )}
        </div>

        {props.moreOpenings.length > 0 && (
          <div className="more-openings">
            <button className="more-toggle" onClick={() => setShowMore((v) => !v)}>
              {showMore ? "▾" : "▸"} {props.openings.length > 0 ? "More" : "All"} conflicts filed under this action ({props.moreOpenings.length})
            </button>
            <p className="ws-instr" style={{ marginTop: 4 }}>
              Beyond Cook’s recommended opening{props.openings.length === 1 ? "" : "s"} above, any of these can also start your plot.
            </p>
            {showMore && (
              <div className="choices">
                {props.moreOpenings.map((c) => (
                  <ChoiceCard key={c.id} index={index} c={c} permIndex={0} namer={namer} names={names} frameC={frame.c}
                    added={props.inPlot(c.id)}
                    action={{ label: "Begin here →", kind: "begin", onClick: () => props.onBegin(c.id) }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // build outward
  const end = props.endBeatId ? index.byId.get(props.endBeatId) : null;
  const start = props.startBeatId ? index.byId.get(props.startBeatId) : null;
  const cClause = frame.c != null ? index.data.masterplot.cClauses.find((x) => x.number === frame.c) : undefined;
  const endDelivers = end ? (index.terminalFor.get(end.id) ?? []).includes(frame.c ?? -1) : false;
  const endTerminal = end ? (index.terminalFor.get(end.id)?.length ?? 0) > 0 : false;
  const noCarryOns = props.forward.length === 0;

  return (
    <div className="workspace">
      <header className="ws-head">
        <div className="ws-crumb">Build outward</div>
        <h2>What comes next — and before?</h2>
        <p className="ws-instr">
          Extend at either end. <strong>Carry-ons</strong> move forward toward your ending;
          <strong> lead-ups</strong> reach back toward how it began. Each card is a full conflict — adapt
          the wording; a note like <em>ch B to A</em> means Cook suggests swapping a character.
        </p>
        <div className={`destination ${endDelivers || (noCarryOns && endTerminal) ? "reached" : ""}`}>
          {endDelivers
            ? <>🏁 Your last beat <strong>#{end?.id}</strong> delivers your chosen ending{cClause ? <> — <strong>{cClause.text}</strong></> : null}. This is a complete masterplot.</>
            : cClause
              ? <>🎯 Heading toward <strong>{cClause.text}</strong> (ending ③).{" "}
                  {(index.data.masterplot.cClauseIndex[String(frame.c)]?.length ?? 0) > 0 &&
                    <>Aim for a carry-on badged <em>🏁 delivers your ending</em>.</>}
                  {noCarryOns && <> This beat has no carry-ons — a natural stopping point.</>}</>
              : <>🎯 No ending set — pick an <strong>ending ③</strong> on the left to steer toward, and matching beats get flagged.</>}
        </div>
      </header>

      <section className="ws-section">
        <h3 className="ws-section-title carry">▶ What comes next <span className="from">after #{end?.id}</span></h3>
        <div className="choices">
          {props.forward.map((o, i) => (
            <ChoiceCard key={`f-${o.conflict.id}-${o.permIndex}-${i}`} index={index} c={o.conflict} permIndex={o.permIndex}
              namer={namer} names={names} frameC={frame.c} annotation={o.annotation} chainRest={o.chainRest}
              added={props.inPlot(o.conflict.id)}
              action={{ label: "Add →", kind: "carry", onClick: () => props.onAddForward(o.conflict.id, o.permIndex) }} />
          ))}
          {noCarryOns && (
            <p className="ws-instr">
              Cook lists no carry-ons here — this is a <strong>terminal conflict</strong>, a natural ending.
              Keep it as your last beat, or extend the opening backward instead.
            </p>
          )}
        </div>
      </section>

      <section className="ws-section">
        <h3 className="ws-section-title lead">◀ What comes before <span className="from">ahead of #{start?.id}</span></h3>
        <div className="choices">
          {props.backward.map((o, i) => (
            <ChoiceCard key={`b-${o.conflict.id}-${o.permIndex}-${i}`} index={index} c={o.conflict} permIndex={o.permIndex}
              namer={namer} names={names} frameC={frame.c} annotation={o.annotation} chainRest={o.chainRest}
              added={props.inPlot(o.conflict.id)}
              action={{ label: "← Add", kind: "lead", onClick: () => props.onAddBackward(o.conflict.id, o.permIndex) }} />
          ))}
          {props.backward.length === 0 && <p className="ws-instr">No lead-ups — this can stand as your opening beat.</p>}
        </div>
      </section>
    </div>
  );
}

function Welcome({ hasProtagonist }: { hasProtagonist: boolean }) {
  return (
    <div className="workspace frame-pane">
      <header className="ws-head">
        <div className="ws-crumb">Get started</div>
        <h2>Build a plot, Plotto's way</h2>
      </header>
      <ol className="welcome-steps">
        <li className={hasProtagonist ? "done" : ""}>Choose a <strong>protagonist ①</strong> on the left.</li>
        <li>Choose a <strong>central action ②</strong> — that surfaces Cook's opening conflicts here.</li>
        <li>Press <strong>Begin here</strong> on an opening, then follow <strong>carry-ons</strong> forward and <strong>lead-ups</strong> backward to chain each beat.</li>
        <li>Optionally set an <strong>ending ③</strong> — beats that deliver it get flagged 🏁.</li>
      </ol>
      <p className="ws-instr">Cook's conflicts are suggestions to adapt. Name your characters on the left to make them yours; the full text is always shown, never trimmed.</p>
    </div>
  );
}

function PreviewPane(props: Props & { conflict: Conflict }) {
  const { namer, names, conflict: c, preview, hasBeats, inPlot, frame, index } = props;
  const permIndex = preview!.permIndex;
  const perm = c.permutations[permIndex] ?? c.permutations[0];
  const already = inPlot(c.id);
  const ending = endingBadge(index, c.id, frame.c);
  return (
    <div className="workspace">
      <button className="back-link" onClick={props.onClosePreview}>← Back to {hasBeats ? "building" : "the steps"}</button>
      <header className="ws-head">
        <div className="card-meta"><span className="grp">{c.group}{c.subgroup ? ` ▸ ${c.subgroup}` : ""}</span>{c.bClause != null && <span className="bchip">B{c.bClause}</span>}{ending && <span className={`ending-badge ${ending.strong ? "strong" : ""}`}>{ending.label}</span>}</div>
        <div className="explorer-head">
          <h2>Conflict {c.id}</h2>
          {c.permutations.length > 1 && (
            <div className="perm-switch">
              {c.permutations.map((p, i) => (
                <button key={i} className={`perm-tab ${i === permIndex ? "active" : ""}`} onClick={() => props.onSetPreviewPerm(i)}>{p.letter ?? "·"}</button>
              ))}
            </div>
          )}
        </div>
      </header>
      <ConflictText className="choice-text big" text={perm.text} namer={namer} names={names} />
      <div className="build-bar">
        {already ? (
          <span className="in-plot-badge">✓ Already a beat in your plot</span>
        ) : !hasBeats ? (
          <button className="btn primary" onClick={() => props.onBegin(c.id)}>▶ Begin plot here</button>
        ) : (
          <>
            <button className="btn primary" onClick={() => props.onAddPreview("end")}>Add to end ▶</button>
            <button className="btn" onClick={() => props.onAddPreview("start")}>◀ Add to start</button>
          </>
        )}
      </div>
    </div>
  );
}
