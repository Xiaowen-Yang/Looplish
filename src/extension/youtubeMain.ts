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

async function waitForTokenizedCaptionUrl(
  track: NonNullable<ReturnType<typeof selectPreferredCaptionTrack>>
): Promise<string | undefined> {
  const deadline = Date.now() + APP_CONFIG.youtube.captionRequestWaitMs;

  do {
    const url = findTokenizedCaptionUrl(getCaptionResourceUrls(), track);
    if (url) {
      return url;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, APP_CONFIG.youtube.captionRequestPollMs);
    });
  } while (Date.now() < deadline);

  return undefined;
}

async function loadPreferredCaption(): Promise<NonNullable<BridgeResponseMessage["payload"]>> {
  const track = selectPreferredCaptionTrack(getCaptionTracks(readPlayerResponse()));
  if (!track) {
    throw new Error("No subtitles are available for this video.");
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

  const tokenizedUrl = await waitForTokenizedCaptionUrl(track);
  if (tokenizedUrl) {
    const tokenizedTimedText = await fetchTimedText(asJson3CaptionUrl(tokenizedUrl));
    if (tokenizedTimedText) {
      return { caption: track, timedText: tokenizedTimedText };
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

