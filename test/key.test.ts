import { describe, it, expect } from "vitest";
import { keyToFifths } from "../src/notation/key";

describe("keyToFifths", () => {
  it("C major -> 0", () => {
    expect(keyToFifths(0, "Major")).toBe(0);
  });
  it("A minor -> 0 (relative to C)", () => {
    expect(keyToFifths(9, "Minor")).toBe(0);
  });
  it("G major -> 1 sharp", () => {
    expect(keyToFifths(7, "Major")).toBe(1);
  });
  it("Eb major -> 3 flats", () => {
    expect(keyToFifths(3, "Major")).toBe(-3);
  });
  it("E minor -> 1 sharp", () => {
    expect(keyToFifths(4, "Minor")).toBe(1);
  });
  it("matches case-insensitively and treats unknown scale names as major", () => {
    expect(keyToFifths(7, "minor")).toBe(-2); // G minor -> Bb major (2 flats)
    expect(keyToFifths(0, "Dorian")).toBe(0); // approximated as C major
  });
});
