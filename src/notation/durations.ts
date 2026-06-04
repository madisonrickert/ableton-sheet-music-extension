import type { NoteModel, QuantizeGrid } from "./types";

/** Units per quarter note implied by a quantize grid. */
export function gridDivisions(grid: QuantizeGrid): number {
  switch (grid) {
    case "1/4": return 1;
    case "1/8": return 2;
    case "1/16": return 4;
    case "1/32": return 8;
  }
}

const GRIDS: ReadonlyArray<readonly [QuantizeGrid, number]> = [
  ["1/4", 1], ["1/8", 2], ["1/16", 4], ["1/32", 8],
];

/**
 * Auto-detect the best quantize grid for a clip: the coarsest grid the notes
 * actually land on (i.e. the finest grid any note needs). Programmed MIDI lands
 * exactly on grid points; sloppy or triplet timing that fits no power-of-two
 * grid falls back to the finest grid (1/32). An empty clip yields 1/4.
 */
export function detectGrid(notes: NoteModel[]): QuantizeGrid {
  const TOL = 1e-3; // beats; absorbs float error for exactly-placed notes
  const neededDivisions = (v: number): number => {
    for (const [, g] of GRIDS) {
      if (Math.abs(v * g - Math.round(v * g)) <= TOL * g) return g;
    }
    return 8; // finest fallback
  };
  let best = 1;
  for (const n of notes) {
    best = Math.max(best, neededDivisions(n.startBeats), neededDivisions(n.durationBeats));
  }
  return (GRIDS.find(([, g]) => g === best) ?? ["1/16", 4])[0];
}

export interface NoteValue {
  type: string; // MusicXML <type> value
  dots: 0 | 1;
  units: number; // duration in divisions
}

const BASE: ReadonlyArray<{ type: string; quarters: number }> = [
  { type: "whole", quarters: 4 },
  { type: "half", quarters: 2 },
  { type: "quarter", quarters: 1 },
  { type: "eighth", quarters: 0.5 },
  { type: "16th", quarters: 0.25 },
  { type: "32nd", quarters: 0.125 },
];

/** All renderable note values (plain + single-dotted) expressible as whole units at this grid, sorted by units descending. */
export function buildNoteValueTable(divisions: number): NoteValue[] {
  const table: NoteValue[] = [];
  for (const b of BASE) {
    for (const dots of [0, 1] as const) {
      const factor = dots === 1 ? 1.5 : 1;
      const units = b.quarters * factor * divisions;
      if (Number.isInteger(units) && units >= 1) table.push({ type: b.type, dots, units });
    }
  }
  return table.sort((a, b) => b.units - a.units);
}

/** Greedy largest-first decomposition. Always terminates: the 1-unit value is always present. */
export function decomposeDuration(units: number, divisions: number): NoteValue[] {
  const table = buildNoteValueTable(divisions);
  const out: NoteValue[] = [];
  let remaining = units;
  for (const v of table) {
    while (remaining >= v.units) {
      out.push(v);
      remaining -= v.units;
    }
    if (remaining === 0) break;
  }
  return out;
}
