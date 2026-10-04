import { describe, expect, it, vi } from "vitest";
import { SegmentPlaybackController } from "../../src/infrastructure/youtube/segmentPlaybackController";

class FakeMedia extends EventTarget {
  currentTime = 0;
  playbackRate = 1;
  paused = true;
  play = vi.fn(async () => {
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}

describe("SegmentPlaybackController", () => {
  it("seeks with a small lead-in and applies playback rate", async () => {
    const media = new FakeMedia();
    const controller = new SegmentPlaybackController();

    await controller.playSegment(media, 3, 5, 0.8);

    expect(media.currentTime).toBeCloseTo(2.85);
    expect(media.playbackRate).toBe(0.8);
    expect(media.play).toHaveBeenCalledOnce();
  });

  it("pauses at the end of the requested segment", async () => {
    const media = new FakeMedia();
    const controller = new SegmentPlaybackController();
    await controller.playSegment(media, 3, 5, 1);

    media.currentTime = 5.11;
    media.dispatchEvent(new Event("timeupdate"));

    expect(media.pause).toHaveBeenCalledOnce();
  });

  it("toggles normal playback", async () => {
    const media = new FakeMedia();
    const controller = new SegmentPlaybackController();

    await controller.toggle(media);
    controller.toggle(media);

    expect(media.play).toHaveBeenCalledOnce();
    expect(media.pause).toHaveBeenCalledOnce();
  });
});

