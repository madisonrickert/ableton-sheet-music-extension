import { describe, it, expect } from "vitest";
import { gridDivisions, buildNoteValueTable, decomposeDuration, detectGrid } from "./durations";
import type { NoteModel } from "./types";

describe("gridDivisions", () => {
  it("maps grids to units-per-quarter", () => {
    expect(gridDivisions("1/4")).toBe(1);
    expect(gridDivisions("1/8")).toBe(2);
    expect(gridDivisions("1/16")).toBe(4);
    expect(gridDivisions("1/32")).toBe(8);
  });
});

describe("buildNoteValueTable", () => {
  it("at 1/16 (divisions=4) is sorted by units descending, excludes non-integer 32nds, includes dotted eighth", () => {
    const table = buildNoteValueTable(4);
    // sorted by units, descending
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].units).toBeGreaterThanOrEqual(table[i].units);
    }
    // a plain whole note (16 units) is present; the 1-unit sixteenth is the smallest
    expect(table).toContainEqual({ type: "whole", dots: 0, units: 16 });
    expect(table[table.length - 1]).toEqual({ type: "16th", dots: 0, units: 1 });
    // 32nds (0.125 * 4 = 0.5) are not integers -> excluded
    expect(table.some((v) => v.type === "32nd")).toBe(false);
    // dotted eighth = 3 units exists
    expect(table.some((v) => v.type === "eighth" && v.dots === 1 && v.units === 3)).toBe(true);
  });
});

describe("decomposeDuration", () => {
  it("returns a single value for a clean duration", () => {
    expect(decomposeDuration(4, 4)).toEqual([{ type: "quarter", dots: 0, units: 4 }]);
  });
  it("greedily ties irregular durations largest-first", () => {
    // 5 units at divisions=4 -> quarter (4) + sixteenth (1)
    expect(decomposeDuration(5, 4)).toEqual([
      { type: "quarter", dots: 0, units: 4 },
      { type: "16th", dots: 0, units: 1 },
    ]);
  });
  it("prefers a dotted value when it fits exactly", () => {
    expect(decomposeDuration(3, 4)).toEqual([{ type: "eighth", dots: 1, units: 3 }]);
  });
});

describe("detectGrid", () => {
  const n = (startBeats: number, durationBeats: number): NoteModel => ({ midi: 60, startBeats, durationBeats });
  it("all-quarter rhythm -> 1/4", () => {
    expect(detectGrid([n(0, 1), n(1, 1), n(2, 1)])).toBe("1/4");
  });
  it("eighth-note rhythm -> 1/8", () => {
    expect(detectGrid([n(0, 0.5), n(0.5, 0.5)])).toBe("1/8");
  });
  it("a sixteenth onset -> 1/16", () => {
    expect(detectGrid([n(0.25, 0.25)])).toBe("1/16");
  });
  it("a dotted-eighth duration needs 1/16", () => {
    expect(detectGrid([n(0, 0.75)])).toBe("1/16");
  });
  it("triplet/off-grid timing falls back to 1/32", () => {
    expect(detectGrid([n(1 / 3, 1 / 3)])).toBe("1/32");
  });
  it("empty clip -> 1/4", () => {
    expect(detectGrid([])).toBe("1/4");
  });
});
