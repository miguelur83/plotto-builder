// Cook divides many conflicts into successive stages, delimited in the text by
// `*`, `**`, `***` (and rarely `****`). Cross-reference phase markers (-*, *-**,
// **-***) point at these stages. Splitting the text on the markers lets the UI
// show the stages as a readable, numbered progression instead of raw asterisks.
export function splitPhases(text: string): string[] {
  return text
    .split(/\s*\*{1,4}(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
