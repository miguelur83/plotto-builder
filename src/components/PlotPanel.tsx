import { useEffect, useState } from "react";
import type { PlottoIndex } from "../data";
import type { NameMap, Namer } from "../names";
import type { PlotApi } from "../usePlot";
import { synopsis } from "../masterplot";
import { downloadFile, slugify, toHtmlDocument, toMarkdown } from "../export";
import { ConflictText } from "./ConflictText";

interface Props {
  index: PlottoIndex;
  api: PlotApi;
  namer: Namer;
  names: NameMap;
  focusId: string | null;
  onFocusBeat: (id: string, permIndex: number) => void;
}

export function PlotPanel({ index, api, namer, names, focusId, onFocusBeat }: Props) {
  const { plot } = api;
  const syn = synopsis(plot.frame, index.data.masterplot);

  const [menuOpen, setMenuOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const noBeats = plot.steps.length === 0;

  const downloadHtml = () => {
    downloadFile(`${slugify(plot.title)}.html`, "text/html;charset=utf-8", toHtmlDocument(plot, index, namer, names));
    setFlash("Formatted .html downloaded — open it, then Print → Save as PDF for a PDF.");
    setMenuOpen(false);
  };

  const downloadMarkdown = () => {
    downloadFile(`${slugify(plot.title)}.md`, "text/markdown;charset=utf-8", toMarkdown(plot, index, namer, names));
    setFlash("Markdown .md downloaded.");
    setMenuOpen(false);
  };

  return (
    <aside className="plotpanel">
      <div className="plot-head">
        <input className="plot-title" value={plot.title} onChange={(e) => api.setTitle(e.target.value)} aria-label="Plot title" />
        <div className="plot-actions">
          <span className="step-count">{plot.steps.length} beat{plot.steps.length === 1 ? "" : "s"}</span>
          <div className="export-wrap">
            <button className="btn" onClick={() => setMenuOpen((v) => !v)} disabled={noBeats} aria-haspopup="menu" aria-expanded={menuOpen}>
              Export ▾
            </button>
            {menuOpen && (
              <div className="export-menu" role="menu">
                <button role="menuitem" onClick={downloadHtml}>
                  <span className="mi-title">Formatted document</span>
                  <span className="mi-sub">.html · opens in any browser, print → PDF</span>
                </button>
                <button role="menuitem" onClick={downloadMarkdown}>
                  <span className="mi-title">Markdown</span>
                  <span className="mi-sub">.md · portable, editable</span>
                </button>
              </div>
            )}
          </div>
          <button className="btn" onClick={() => { if (noBeats || confirm("Clear the whole plot?")) api.clear(); }}>Clear</button>
        </div>
        {flash && <div className="export-flash">{flash}</div>}
      </div>

      <div className="panel-scroll">
        <section className="panel-section">
          <h3 className="section-title">Synopsis</h3>
          <p className={`synopsis ${syn.complete ? "complete" : ""}`}>{syn.text}</p>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Beats <span className="tiny">opening → ending</span></h3>
          <div className="chain">
            {plot.steps.length === 0 ? (
              <div className="chain-empty">
                <p>No beats yet.</p>
                <p className="hint">Choose a central action ② on the left, then press <strong>Begin here</strong> on an opening conflict.</p>
              </div>
            ) : (
              plot.steps.map((step, i) => {
                const conflict = index.byId.get(step.conflictId);
                if (!conflict) return null;
                const perm = conflict.permutations[step.permIndex] ?? conflict.permutations[0];
                const isLast = i === plot.steps.length - 1;
                const focused = conflict.id === focusId;
                const delivers = plot.frame.c != null && (index.terminalFor.get(conflict.id) ?? []).includes(plot.frame.c);
                return (
                  <div key={`${step.conflictId}-${i}`}>
                    <div className={`beat ${isLast ? "frontier" : ""} ${focused ? "focused" : ""}`}>
                      <div className="beat-top">
                        <span className="beat-num">{i + 1}</span>
                        <button className="beat-id" onClick={() => onFocusBeat(conflict.id, step.permIndex)}>#{conflict.id}</button>
                        {conflict.permutations.length > 1 && (
                          <span className="beat-variants" title="Alternative phrasings of this conflict">
                            {conflict.permutations.map((p, pi) => (
                              <button key={pi} className={`vtab ${pi === step.permIndex ? "active" : ""}`}
                                onClick={() => api.setPerm(i, pi)} title={`Use variant ${p.letter ?? ""}`}>{p.letter ?? "·"}</button>
                            ))}
                          </span>
                        )}
                        {delivers && <span className="beat-end" title="Delivers your chosen ending">🏁</span>}
                        <span className="beat-spacer" />
                        <button className="icon" onClick={() => api.move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                        <button className="icon" onClick={() => api.move(i, 1)} disabled={isLast} title="Move down">↓</button>
                        <button className="icon danger" onClick={() => api.removeAt(i)} title="Remove beat">✕</button>
                      </div>
                      <ConflictText className="beat-text" text={perm.text} namer={namer} names={names} />
                    </div>
                    {!isLast && <div className="beat-arrow">↓</div>}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
