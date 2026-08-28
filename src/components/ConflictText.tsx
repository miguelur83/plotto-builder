import type { NameMap, Namer } from "../names";
import { splitPhases } from "../phases";

interface Props {
  text: string;
  namer: Namer;
  names: NameMap;
  className?: string;
}

/**
 * Renders a conflict's verbatim text, but when Cook split it into stages
 * (delimited by * / ** / ***) shows each stage as a numbered line instead of
 * leaving raw asterisks mid-sentence. Naming is applied to the whole text first
 * so the grammatical article/character rule keeps its context.
 */
export function ConflictText({ text, namer, names, className }: Props) {
  const named = namer(text, names);
  const phases = splitPhases(named);
  if (phases.length <= 1) {
    return <p className={className}>{named}</p>;
  }
  return (
    <div className={`${className ?? ""} phased`}>
      {phases.map((p, i) => (
        <p className="phase" key={i}>
          <span className="phase-n" title={`Stage ${i + 1}`}>{i + 1}</span>
          <span>{p}</span>
        </p>
      ))}
    </div>
  );
}
