import { describe, expect, it } from "vitest";
import { compareTranscript, tokenize } from "../../src/domain/comparison/compare";

describe("transcript comparison", () => {
  it("normalizes case, punctuation, and apostrophes", () => {
    expect(tokenize("It’s a TEST, isn't it?")).toEqual([
      "it's", "a", "test", "isn't", "it"
    ]);
  });

  it("reports a perfect answer", () => {
    const result = compareTranscript("Hello, world!", "hello world");
    expect(result.accuracy).toBe(1);
    expect(result.diff.every((token) => token.kind === "correct")).toBe(true);
  });

  it("identifies missing and extra words", () => {
    const result = compareTranscript(
      "the quick brown fox",
      "the very quick fox"
    );

    expect(result.accuracy).toBe(0.75);
    expect(result.diff).toContainEqual({ kind: "extra", value: "very" });
    expect(result.diff).toContainEqual({ kind: "missing", value: "brown" });
  });

  it("handles empty input", () => {
    expect(compareTranscript("", "").accuracy).toBe(1);
    expect(compareTranscript("", "unexpected").accuracy).toBe(0);
  });
});

