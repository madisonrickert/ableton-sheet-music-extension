import { describe, it, expect } from "vitest";
import { fileUrl } from "./file-url";

describe("fileUrl", () => {
  // Regression: a Live-managed extension's temp directory lives under
  // "~/Library/Application Support/Ableton/Extensions Data/…", whose spaces made
  // `file://${path}` a malformed URL. Live's modal-dialog host rejected it with
  // "Invalid URL", so the chart window never opened (worked in dev only because
  // the dev temp path has no spaces).
  it("percent-encodes spaces so the modal-dialog host accepts the URL", () => {
    const url = fileUrl(
      "/Users/madison/Library/Application Support/Ableton/Extensions Data/madison-rickert.sheet-music/temp/chart-ui.html",
    );
    expect(url).not.toMatch(/ /); // a raw space is what made it "Invalid URL"
    expect(url).toContain("Application%20Support");
    expect(url).toContain("Extensions%20Data");
    expect(url.startsWith("file:///")).toBe(true);
    expect(() => new URL(url)).not.toThrow();
  });

  it("leaves a space-free path unchanged", () => {
    expect(fileUrl("/tmp/dev/chart-ui.html")).toBe("file:///tmp/dev/chart-ui.html");
  });
});
