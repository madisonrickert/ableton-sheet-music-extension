import { describe, it, expect } from "vitest";
import { fingerprintNotes } from "./fingerprint";
import type { NoteModel } from "./types";

const a: NoteModel[] = [
  { midi: 60, startBeats: 0, durationBeats: 1 },
  { midi: 64, startBeats: 1, durationBeats: 1 },
];

describe("fingerprintNotes", () => {
  it("is a 6-char hex string", () => {
    expect(fingerprintNotes(a)).toMatch(/^[0-9a-f]{6}$/);
  });
  it("is deterministic and order-independent", () => {
    const reordered = [a[1], a[0]];
    expect(fingerprintNotes(reordered)).toBe(fingerprintNotes(a));
  });
  it("changes when a note changes", () => {
    const b: NoteModel[] = [{ ...a[0], midi: 61 }, a[1]];
    expect(fingerprintNotes(b)).not.toBe(fingerprintNotes(a));
  });
  it("empty clip has a stable fingerprint", () => {
    expect(fingerprintNotes([])).toMatch(/^[0-9a-f]{6}$/);
  });
});
