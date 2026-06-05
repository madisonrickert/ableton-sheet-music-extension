import { describe, it, expect } from "vitest";
import { toNoteModels } from "./notes";

describe("toNoteModels", () => {
  it("maps NoteDescription fields and sorts by start then pitch", () => {
    const result = toNoteModels([
      { pitch: 64, startTime: 1, duration: 0.5 },
      { pitch: 60, startTime: 0, duration: 1 },
    ]);
    expect(result).toEqual([
      { midi: 60, startBeats: 0, durationBeats: 1 },
      { midi: 64, startBeats: 1, durationBeats: 0.5 },
    ]);
  });
  it("drops muted notes", () => {
    const result = toNoteModels([
      { pitch: 60, startTime: 0, duration: 1, muted: true },
      { pitch: 62, startTime: 0, duration: 1 },
    ]);
    expect(result).toEqual([{ midi: 62, startBeats: 0, durationBeats: 1 }]);
  });
  it("coerces BigInt fields to number (the SDK returns BigInt at runtime)", () => {
    const result = toNoteModels([
      { pitch: 60n as unknown as number, startTime: 0n as unknown as number, duration: 2n as unknown as number },
    ]);
    expect(result).toEqual([{ midi: 60, startBeats: 0, durationBeats: 2 }]);
    expect(typeof result[0].midi).toBe("number");
    expect(typeof result[0].startBeats).toBe("number");
  });
});
