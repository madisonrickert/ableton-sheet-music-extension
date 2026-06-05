import { describe, it, expect } from "vitest";
import { INSTRUMENTS, getProfile, normalizeFifths, transpose } from "./transpose";
import type { NoteModel } from "./types";

describe("normalizeFifths", () => {
  it("reduces to the range [-5, 6]", () => {
    expect(normalizeFifths(0)).toBe(0);
    expect(normalizeFifths(63)).toBe(3); // 63 mod 12 = 3
    expect(normalizeFifths(7)).toBe(-5); // 7 -> -5 (Cb/Db side)
    expect(normalizeFifths(-1)).toBe(-1);
  });
});

describe("INSTRUMENTS table", () => {
  it("ships the Eb Alto Sax profile", () => {
    const alto = getProfile("Eb Alto Sax");
    expect(alto).toEqual({ name: "Eb Alto Sax", semitoneOffset: 9, clef: "treble" });
  });
  it("includes Concert / C identity first", () => {
    expect(INSTRUMENTS[0].name).toBe("Concert / C");
    expect(INSTRUMENTS[0].semitoneOffset).toBe(0);
  });
});

describe("transpose (spec §8: concert C4 in C major for Eb Alto Sax)", () => {
  const notes: NoteModel[] = [{ midi: 60, startBeats: 0, durationBeats: 1 }];
  it("shifts pitch up a major sixth and the key to A major (3 sharps)", () => {
    const result = transpose(notes, 0, getProfile("Eb Alto Sax"));
    expect(result.notes[0].midi).toBe(69); // A4
    expect(result.keyFifths).toBe(3); // A major
    expect(result.clef).toBe("treble");
  });
  it("Bb Tenor Sax: concert C major -> D major (2 sharps), pitch up a major ninth", () => {
    const result = transpose(notes, 0, getProfile("Bb Tenor Sax"));
    expect(result.notes[0].midi).toBe(74); // D5
    expect(result.keyFifths).toBe(2);
  });
  it("Concert / C is identity", () => {
    const result = transpose(notes, -3, getProfile("Concert / C"));
    expect(result.notes[0].midi).toBe(60);
    expect(result.keyFifths).toBe(-3);
  });
  it("accepts an arbitrary custom semitone offset (not a shipped preset)", () => {
    // Concert C up 5 semitones = F; F major has 1 flat. 7*5=35; 35 mod 12 = 11 -> -1.
    const result = transpose(notes, 0, { name: "Custom (+5)", semitoneOffset: 5, clef: "treble" });
    expect(result.notes[0].midi).toBe(65); // F4
    expect(result.keyFifths).toBe(-1);
  });
});
