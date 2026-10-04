import { APP_CONFIG } from "../shared/config";
import type { YouTubeTimedText } from "../domain/transcript/types";
import {
  BRIDGE_CHANNEL,
  type BridgeRequestMessage,
  type BridgeResponseMessage
} from "../shared/messages";
import {
  getCaptionTracks,
  selectPreferredCaptionTrack,
  withJson3Format
} from "../infrastructure/youtube/playerResponse";
import {
  asJson3CaptionUrl,
  findPreferredTokenizedCaption,
  findTokenizedCaptionUrl,
  getCaptionResourceUrls
} from "../infrastructure/youtube/playerCaptionRequest";

declare global {
  interface Window {
    ytInitialPlayerResponse?: unknown;
    ytplayer?: { config?: { args?: { player_response?: string } } };
  }
}

function readPlayerResponse(): unknown {
  if (window.ytInitialPlayerResponse) {
    return window.ytInitialPlayerResponse;
  }

  const serialized = window.ytplayer?.config?.args?.player_response;
  if (!serialized) {
    return undefined;
  }

  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    return undefined;
  }
}

async function fetchTimedText(url: string): Promise<YouTubeTimedText | undefined> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`YouTube subtitle request failed (${response.status}).`);
  }

  const body = await response.text();
  if (!body.trim()) {
    return undefined;
  }

  let value: unknown;
  try {
    value = JSON.parse(body) as unknown;
  } catch {
    throw new Error("YouTube returned an unsupported subtitle format.");
  }

  if (!value || typeof value !== "object" || !Array.isArray((value as YouTubeTimedText).events)) {
    throw new Error("YouTube returned malformed subtitle data.");
  }
  return value as YouTubeTimedText;
}

async function waitForTokenizedCaption(
  videoId: string
): Promise<ReturnType<typeof findPreferredTokenizedCaption>> {
  const deadline = Date.now() + APP_CONFIG.youtube.captionRequestWaitMs;

  do {
    const candidate = findPreferredTokenizedCaption(
      getCaptionResourceUrls(),
      videoId
    );
    if (candidate) {
      return candidate;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, APP_CONFIG.youtube.captionRequestPollMs);
    });
  } while (Date.now() < deadline);

  return undefined;
}

async function loadPreferredCaption(): Promise<NonNullable<BridgeResponseMessage["payload"]>> {
  const videoId = new URL(window.location.href).searchParams.get("v");
  if (!videoId) {
    throw new Error("当前页面不是可识别的 YouTube 视频。");
  }

  const playerCaption = findPreferredTokenizedCaption(
    getCaptionResourceUrls(),
    videoId
  );
  if (playerCaption) {
    const timedText = await fetchTimedText(asJson3CaptionUrl(playerCaption.url));
    if (timedText) {
      return { caption: playerCaption.track, timedText };
    }
  }

  const track = selectPreferredCaptionTrack(getCaptionTracks(readPlayerResponse()));
  if (!track) {
    const delayedCaption = await waitForTokenizedCaption(videoId);
    if (delayedCaption) {
      const timedText = await fetchTimedText(asJson3CaptionUrl(delayedCaption.url));
      if (timedText) {
        return { caption: delayedCaption.track, timedText };
      }
    }
    throw new Error("没有捕获到字幕数据。请开启 CC、播放几秒，然后重试。");
  }

  const playerUrl = findTokenizedCaptionUrl(getCaptionResourceUrls(), track);
  if (playerUrl) {
    const playerTimedText = await fetchTimedText(asJson3CaptionUrl(playerUrl));
    if (playerTimedText) {
      return { caption: track, timedText: playerTimedText };
    }
  }

  const directTimedText = await fetchTimedText(withJson3Format(track.baseUrl));
  if (directTimedText) {
    return { caption: track, timedText: directTimedText };
  }

  const tokenizedCaption = await waitForTokenizedCaption(videoId);
  if (tokenizedCaption) {
    const tokenizedTimedText = await fetchTimedText(asJson3CaptionUrl(tokenizedCaption.url));
    if (tokenizedTimedText) {
      return { caption: tokenizedCaption.track, timedText: tokenizedTimedText };
    }
  }

  throw new Error("YouTube 需要播放器令牌。请开启 CC 字幕、播放几秒，然后重试。");
}

window.addEventListener("message", (event: MessageEvent<BridgeRequestMessage>) => {
  const message = event.data;
  if (
    event.source !== window
    || message?.channel !== BRIDGE_CHANNEL
    || message.direction !== "request"
  ) {
    return;
  }

  void loadPreferredCaption()
    .then((payload) => {
      window.postMessage({
        channel: BRIDGE_CHANNEL,
        direction: "response",
        requestId: message.requestId,
        payload
      } satisfies BridgeResponseMessage, "*");
    })
    .catch((error: unknown) => {
      window.postMessage({
        channel: BRIDGE_CHANNEL,
        direction: "response",
        requestId: message.requestId,
        error: error instanceof Error ? error.message : "Unable to load YouTube subtitles."
      } satisfies BridgeResponseMessage, "*");
    });
});

document.addEventListener(APP_CONFIG.youtube.navigationEvent, () => {
  // YouTube is a single-page app. The isolated script requests fresh data after navigation.
});

