import { describe, it, expect } from "vitest";
import { detectStaff } from "./clef";
import type { NoteModel } from "./types";

const n = (midi: number): NoteModel => ({ midi, startBeats: 0, durationBeats: 1 });

describe("detectStaff", () => {
  it("treble for a melody above middle C", () => {
    expect(detectStaff([n(67), n(72), n(64)])).toBe("treble");
  });
  it("bass for a low line", () => {
    expect(detectStaff([n(40), n(43), n(36)])).toBe("bass");
  });
  it("grand staff when notes straddle middle C widely", () => {
    expect(detectStaff([n(40), n(43), n(72), n(76)])).toBe("grand");
  });
  it("a few stray low notes do not trigger grand staff", () => {
    expect(detectStaff([n(67), n(69), n(71), n(72), n(74), n(76), n(40)])).toBe("treble");
  });
  it("median at middle C and above -> treble", () => {
    expect(detectStaff([n(60), n(62)])).toBe("treble");
  });
  it("empty -> treble", () => {
    expect(detectStaff([])).toBe("treble");
  });
});
