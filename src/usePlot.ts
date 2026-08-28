import { useCallback, useEffect, useRef, useState } from "react";
import type { NameMap } from "./names";

export interface PlotStep {
  conflictId: string;
  /** Which permutation of the conflict this step uses. */
  permIndex: number;
}

/** Cook's masterplot frame: protagonist (A), central action (B), ending (C). */
export interface PlotFrame {
  a: number | null;
  b: number | null;
  c: number | null;
}

export interface PlotState {
  title: string;
  frame: PlotFrame;
  steps: PlotStep[];
  names: NameMap;
}

const STORAGE_KEY = "plotto:plot:v2";

const empty = (): PlotState => ({
  title: "Untitled plot",
  frame: { a: null, b: null, c: null },
  steps: [],
  names: {},
});

function load(): PlotState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<PlotState>;
    return {
      title: parsed.title ?? "Untitled plot",
      frame: { a: null, b: null, c: null, ...(parsed.frame ?? {}) },
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      names: parsed.names ?? {},
    };
  } catch {
    return empty();
  }
}

export function usePlot() {
  const [plot, setPlot] = useState<PlotState>(load);

  // Debounced persistence.
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plot));
      } catch {
        /* storage unavailable — keep working in-memory */
      }
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [plot]);

  const has = useCallback(
    (conflictId: string) => plot.steps.some((s) => s.conflictId === conflictId),
    [plot.steps],
  );

  const append = useCallback((conflictId: string, permIndex = 0) => {
    setPlot((p) =>
      p.steps.some((s) => s.conflictId === conflictId)
        ? p
        : { ...p, steps: [...p.steps, { conflictId, permIndex }] },
    );
  }, []);

  const prepend = useCallback((conflictId: string, permIndex = 0) => {
    setPlot((p) =>
      p.steps.some((s) => s.conflictId === conflictId)
        ? p
        : { ...p, steps: [{ conflictId, permIndex }, ...p.steps] },
    );
  }, []);

  const removeAt = useCallback((i: number) => {
    setPlot((p) => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i) }));
  }, []);

  const move = useCallback((i: number, dir: -1 | 1) => {
    setPlot((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.steps.length) return p;
      const steps = [...p.steps];
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return { ...p, steps };
    });
  }, []);

  const setPerm = useCallback((i: number, permIndex: number) => {
    setPlot((p) => {
      const steps = [...p.steps];
      steps[i] = { ...steps[i], permIndex };
      return { ...p, steps };
    });
  }, []);

  const setName = useCallback((symbol: string, name: string) => {
    setPlot((p) => ({ ...p, names: { ...p.names, [symbol]: name } }));
  }, []);

  const setFrame = useCallback((key: keyof PlotFrame, value: number | null) => {
    setPlot((p) => ({ ...p, frame: { ...p.frame, [key]: value } }));
  }, []);

  const setTitle = useCallback((title: string) => setPlot((p) => ({ ...p, title })), []);

  const clear = useCallback(() => setPlot(empty()), []);

  const replaceAll = useCallback((next: PlotState) => setPlot(next), []);

  return {
    plot,
    has,
    append,
    prepend,
    removeAt,
    move,
    setPerm,
    setName,
    setFrame,
    setTitle,
    clear,
    replaceAll,
  };
}

export type PlotApi = ReturnType<typeof usePlot>;
