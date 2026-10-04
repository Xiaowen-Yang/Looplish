import { describe, expect, it } from "vitest";
import {
  cleanCaptionText,
  groupCuesIntoSentences,
  parseYouTubeTimedText
} from "../../src/domain/transcript/segmenter";

describe("caption segmenter", () => {
  it("normalizes whitespace", () => {
    expect(cleanCaptionText("  hello\n  world  ")).toBe("hello world");
  });

  it("parses YouTube JSON3 events and ignores empty events", () => {
    expect(parseYouTubeTimedText({
      events: [
        { tStartMs: 1000, dDurationMs: 1500, segs: [{ utf8: "Hello " }, { utf8: "world." }] },
        { tStartMs: 3000, segs: [{ utf8: "  " }] }
      ]
    })).toEqual([{
      id: "cue-0",
      startTime: 1,
      endTime: 2.5,
      text: "Hello world."
    }]);
  });

  it("groups cues at punctuation boundaries", () => {
    const result = groupCuesIntoSentences([
      { id: "1", startTime: 0, endTime: 1, text: "Welcome to" },
      { id: "2", startTime: 1, endTime: 2, text: "Looplish." },
      { id: "3", startTime: 2.1, endTime: 3, text: "Let's begin!" }
    ], "video-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "video-1:0",
      startTime: 0,
      endTime: 2,
      text: "Welcome to Looplish."
    });
    expect(result[1]?.text).toBe("Let's begin!");
  });

  it("groups cues at long silence boundaries", () => {
    const result = groupCuesIntoSentences([
      { id: "1", startTime: 0, endTime: 1, text: "First thought" },
      { id: "2", startTime: 3, endTime: 4, text: "Second thought" }
    ], "video-1");

    expect(result.map((sentence) => sentence.text)).toEqual([
      "First thought",
      "Second thought"
    ]);
  });
});

