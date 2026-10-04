import { APP_CONFIG } from "../../shared/config";

type PlayableMedia = Pick<
  HTMLMediaElement,
  "currentTime" | "playbackRate" | "paused" | "play" | "pause" | "addEventListener" | "removeEventListener"
>;

export class SegmentPlaybackController {
  private activeMedia?: PlayableMedia;
  private endTime = 0;

  private readonly handleTimeUpdate = (): void => {
    if (this.activeMedia && this.activeMedia.currentTime >= this.endTime) {
      this.activeMedia.pause();
      this.detach();
    }
  };

  async playSegment(
    media: PlayableMedia,
    startTime: number,
    endTime: number,
    playbackRate: number = APP_CONFIG.practice.defaultPlaybackRate
  ): Promise<void> {
    this.detach();
    this.activeMedia = media;
    this.endTime = Math.max(endTime + APP_CONFIG.practice.replayTailSeconds, startTime);
    media.currentTime = Math.max(startTime - APP_CONFIG.practice.replayLeadSeconds, 0);
    media.playbackRate = playbackRate;
    media.addEventListener("timeupdate", this.handleTimeUpdate);
    await media.play();
  }

  toggle(media: PlayableMedia): Promise<void> | void {
    if (media.paused) {
      return media.play();
    }
    media.pause();
  }

  pause(media: PlayableMedia): void {
    media.pause();
    this.detach();
  }

  private detach(): void {
    this.activeMedia?.removeEventListener("timeupdate", this.handleTimeUpdate);
    this.activeMedia = undefined;
  }
}

