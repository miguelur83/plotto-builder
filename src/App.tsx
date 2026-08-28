import { useEffect, useMemo, useState } from "react";
import type { PlottoIndex } from "./data";
import { legendFor, loadPlotto, searchConflicts } from "./data";
import { activeNames, createNamer } from "./names";
import { resolveOptions } from "./options";
import { usePlot, type PlotFrame } from "./usePlot";
import { toMarkdown } from "./export";
import { Setup } from "./components/Setup";
import { Workspace } from "./components/Workspace";
import { PlotPanel } from "./components/PlotPanel";

interface Preview {
  conflictId: string;
  permIndex: number;
}

export function App() {
  const [index, setIndex] = useState<PlottoIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [query, setQuery] = useState("");

  const api = usePlot();
  const { plot } = api;

  useEffect(() => {
    loadPlotto().then(setIndex).catch((e) => setError(String(e)));
  }, []);

  const namer = useMemo(() => (index ? createNamer(index.allSymbols) : (t: string) => t), [index]);
  const names = useMemo(() => activeNames(plot.names), [plot.names]);
  const results = useMemo(() => (index ? searchConflicts(index, query, null) : []), [index, query]);

  const symbolsInScope = useMemo(() => {
    if (!index) return [];
    const conflicts = plot.steps
      .map((s) => index.byId.get(s.conflictId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (preview) {
      const pc = index.byId.get(preview.conflictId);
      if (pc && !conflicts.includes(pc)) conflicts.push(pc);
    }
    return legendFor(index, conflicts);
  }, [index, plot.steps, preview]);

  if (error) return <div className="center-msg warn">Could not load data.<div className="hint">{error}</div></div>;
  if (!index) return <div className="center-msg">Loading Plotto…</div>;

  const hasBeats = plot.steps.length > 0;
  const endBeat = hasBeats ? plot.steps[plot.steps.length - 1] : null;
  const startBeat = hasBeats ? plot.steps[0] : null;

  const permOf = (beat: typeof endBeat) => {
    if (!beat) return null;
    const c = index.byId.get(beat.conflictId);
    return c ? c.permutations[beat.permIndex] ?? c.permutations[0] : null;
  };
  const forward = endBeat ? resolveOptions(permOf(endBeat)?.carryOns ?? [], index) : [];
  const backward = startBeat ? resolveOptions(permOf(startBeat)?.leadUps ?? [], index) : [];

  const openingIds = plot.frame.b != null
    ? (index.data.masterplot.bClauseIndex[String(plot.frame.b)]?.conflicts ?? [])
    : [];
  const openings = openingIds
    .map((id) => index.byId.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  // Every other conflict filed under this action — a fuller set when Cook's index is thin.
  const openingSet = new Set(openingIds);
  const moreOpenings = plot.frame.b != null
    ? index.conflicts.filter((c) => c.bClause === plot.frame.b && !openingSet.has(c.id))
    : [];

  const scrollTop = () => { const el = document.querySelector(".content"); if (el) el.scrollTop = 0; };

  const pickClause = (kind: keyof PlotFrame, number: number) => { api.setFrame(kind, number); setPreview(null); scrollTop(); };
  const begin = (id: string) => { api.append(id, 0); setPreview(null); scrollTop(); };
  const addForward = (id: string, permIndex: number) => { api.append(id, permIndex); setPreview(null); scrollTop(); };
  const addBackward = (id: string, permIndex: number) => { api.prepend(id, permIndex); setPreview(null); scrollTop(); };
  const addPreview = (where: "end" | "start") => {
    if (!preview) return;
    if (where === "end") api.append(preview.conflictId, preview.permIndex);
    else api.prepend(preview.conflictId, preview.permIndex);
    setPreview(null); scrollTop();
  };

  const onExport = async () => {
    const md = toMarkdown(plot, index, namer, names);
    try {
      await navigator.clipboard.writeText(md);
      alert("Plot copied to clipboard as Markdown.\n(Full export/import — .md, .txt, .json — is the next increment.)");
    } catch { alert(md); }
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Plotto</h1>
        <span className="subtitle">a method of plot suggestion — W. W. Cook, 1928</span>
        <span className="spacer" />
        <span className="meta"><code>{index.data.meta.counts.conflicts}</code> conflicts · <code>{plot.steps.length}</code> in plot</span>
      </header>

      <div className="main">
        <Setup
          masterplot={index.data.masterplot}
          frame={plot.frame}
          onPickClause={pickClause}
          symbolsInScope={symbolsInScope}
          names={names}
          onSetName={api.setName}
          query={query}
          onQuery={setQuery}
          results={results}
          onOpenConflict={(id) => { setPreview({ conflictId: id, permIndex: 0 }); scrollTop(); }}
          namer={namer}
        />

        <main className="content">
          <Workspace
            index={index}
            namer={namer}
            names={names}
            frame={plot.frame}
            openings={openings}
            moreOpenings={moreOpenings}
            forward={forward}
            backward={backward}
            endBeatId={endBeat?.conflictId ?? null}
            startBeatId={startBeat?.conflictId ?? null}
            preview={preview}
            hasBeats={hasBeats}
            inPlot={api.has}
            onBegin={begin}
            onAddForward={addForward}
            onAddBackward={addBackward}
            onOpen={(id, permIndex) => setPreview({ conflictId: id, permIndex })}
            onSetPreviewPerm={(permIndex) => setPreview((p) => (p ? { ...p, permIndex } : p))}
            onAddPreview={addPreview}
            onClosePreview={() => setPreview(null)}
          />
        </main>

        <PlotPanel
          index={index}
          api={api}
          namer={namer}
          names={names}
          focusId={preview?.conflictId ?? null}
          onFocusBeat={(id, permIndex) => { setPreview({ conflictId: id, permIndex }); scrollTop(); }}
          onExport={onExport}
        />
      </div>
    </div>
  );
}
