import { APP_CONFIG } from "../shared/config";
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

async function loadPreferredCaption(): Promise<BridgeResponseMessage["payload"]> {
  const track = selectPreferredCaptionTrack(getCaptionTracks(readPlayerResponse()));
  if (!track) {
    throw new Error("No subtitles are available for this video.");
  }

  const response = await fetch(withJson3Format(track.baseUrl), {
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`YouTube subtitle request failed (${response.status}).`);
  }

  return {
    caption: track,
    timedText: await response.json() as BridgeResponseMessage["payload"] extends { timedText: infer T }
      ? T
      : never
  };
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

