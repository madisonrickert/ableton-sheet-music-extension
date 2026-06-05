import { describe, it, expect } from "vitest";
import { injectPayload, escapeForScriptJson, PAYLOAD_TOKEN, type ChartPayload } from "./payload";
import { INSTRUMENTS } from "./notation/transpose";

const payload: ChartPayload = {
  clipName: "Verse <Sax>",
  notes: [{ midi: 60, startBeats: 0, durationBeats: 1 }],
  concertKeyFifths: 0,
  tempo: 120,
  timeSig: { numerator: 4, denominator: 4 },
  quantizeGrid: "1/16",
  instruments: INSTRUMENTS,
  settings: { instrument: "Eb Alto Sax", quantizeGrid: "1/16", formats: ["musicxml", "pdf"] },
  fingerprint: "a3f9c1",
  lastExportFingerprint: null,
  provenance: { clipName: "Verse <Sax>", tempo: 120, concertKeyFifths: 0, fingerprint: "a3f9c1", generatedAt: "2026-06-03T00:00:00Z" },
};

describe("escapeForScriptJson", () => {
  it("escapes < so a </script> cannot appear", () => {
    expect(escapeForScriptJson('{"x":"</script>"}')).toBe('{"x":"\\u003c/script>"}');
  });
});

describe("injectPayload", () => {
  const html = `<html><body><script id="chart-payload" type="application/json">${PAYLOAD_TOKEN}</script></body></html>`;

  it("replaces the token with escaped JSON and round-trips via JSON.parse", () => {
    const result = injectPayload(html, payload);
    expect(result).not.toContain(PAYLOAD_TOKEN);
    const json = result.match(/type="application\/json">([\s\S]*?)<\/script>/)![1];
    expect(JSON.parse(json)).toEqual(payload);
  });

  it("throws when the token is missing", () => {
    expect(() => injectPayload("<html></html>", payload)).toThrow(/token/i);
  });
});
