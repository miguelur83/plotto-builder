import type { CharacterSymbol } from "../types";
import type { NameMap } from "../names";

interface Props {
  symbols: CharacterSymbol[];
  names: NameMap;
  onSetName: (symbol: string, name: string) => void;
}

export function CharacterNames({ symbols, names, onSetName }: Props) {
  if (symbols.length === 0) {
    return <div className="legend-empty">Characters appear here as you build.</div>;
  }
  return (
    <div className="names-editor">
      {symbols.map((s) => (
        <div className="name-row" key={s.symbol}>
          <span className="sym" title={s.description}>
            {s.symbol}
          </span>
          <input
            type="text"
            placeholder={s.description}
            value={names[s.symbol] ?? ""}
            onChange={(e) => onSetName(s.symbol, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
