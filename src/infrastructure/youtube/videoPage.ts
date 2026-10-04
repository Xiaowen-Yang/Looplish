import { APP_CONFIG } from "../../shared/config";

export function getYouTubeVideoId(locationValue: string): string | undefined {
  const url = new URL(locationValue);
  if (url.hostname !== APP_CONFIG.youtube.hostname || url.pathname !== APP_CONFIG.youtube.watchPath) {
    return undefined;
  }
  return url.searchParams.get("v") ?? undefined;
}

export function getVideoMetadata(video: HTMLVideoElement): {
  title: string;
  channel: string;
  duration: number;
} {
  const title = document.querySelector<HTMLElement>("h1.ytd-watch-metadata")?.innerText.trim()
    || document.title.replace(/\s+-\s+YouTube$/u, "").trim();
  const channel = document.querySelector<HTMLElement>("ytd-channel-name #text")?.innerText.trim()
    || "Unknown channel";

  return {
    title,
    channel,
    duration: Number.isFinite(video.duration) ? video.duration : 0
  };
}

