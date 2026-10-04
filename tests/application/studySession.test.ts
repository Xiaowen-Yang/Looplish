import { describe, expect, it } from "vitest";
import { StudySession } from "../../src/application/studySession";
import type { Sentence } from "../../src/domain/transcript/types";

const sentences: Sentence[] = [0, 1, 2].map((order) => ({
  id: `video:${order}`,
  videoId: "video",
  order,
  startTime: order * 2,
  endTime: order * 2 + 2,
  text: `Sentence ${order}`
}));

describe("StudySession", () => {
  it("restores saved progress", () => {
    const session = new StudySession("video", sentences, {
      videoId: "video",
      currentSentenceOrder: 2,
      playbackRate: 0.85,
      completedSentenceIds: ["video:0"],
      updatedAt: 1
    });

    expect(session.current?.id).toBe("video:2");
    expect(session.playbackRate).toBe(0.85);
    expect(session.completedCount).toBe(1);
  });

  it("keeps navigation inside transcript boundaries", () => {
    const session = new StudySession("video", sentences);
    session.move(-10);
    expect(session.currentOrder).toBe(0);
    session.move(20);
    expect(session.currentOrder).toBe(2);
  });

  it("validates playback rates", () => {
    const session = new StudySession("video", sentences);
    expect(() => session.setPlaybackRate(3)).toThrow();
    session.setPlaybackRate(1.25);
    expect(session.playbackRate).toBe(1.25);
  });

  it("serializes completed sentences", () => {
    const session = new StudySession("video", sentences);
    session.completeCurrent();
    expect(session.toProgress(100)).toMatchObject({
      videoId: "video",
      completedSentenceIds: ["video:0"],
      updatedAt: 100
    });
  });
});

