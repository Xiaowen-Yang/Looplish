import { groupCuesIntoSentences, parseYouTubeTimedText } from "../domain/transcript/segmenter";
import { SegmentPlaybackController } from "../infrastructure/youtube/segmentPlaybackController";
import { getVideoMetadata, getYouTubeVideoId } from "../infrastructure/youtube/videoPage";
import { APP_CONFIG } from "../shared/config";
import {
  BRIDGE_CHANNEL,
  type BridgeRequestMessage,
  type BridgeResponseMessage,
  type ExtensionRequest,
  type ExtensionResponse,
  type PageStudyPayload
} from "../shared/messages";

const playback = new SegmentPlaybackController();

function getVideo(): HTMLVideoElement {
  const video = document.querySelector<HTMLVideoElement>(APP_CONFIG.youtube.playerSelector);
  if (!video) {
    throw new Error("YouTube video player was not found.");
  }
  return video;
}

function requestCaptionFromPage(): Promise<NonNullable<BridgeResponseMessage["payload"]>> {
  const requestId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      reject(new Error("Timed out while reading YouTube subtitles."));
    }, 10_000);

    const handleResponse = (event: MessageEvent<BridgeResponseMessage>): void => {
      const message = event.data;
      if (
        event.source !== window
        || message?.channel !== BRIDGE_CHANNEL
        || message.direction !== "response"
        || message.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleResponse);
      if (message.payload) {
        resolve(message.payload);
      } else {
        reject(new Error(message.error ?? "Unable to read YouTube subtitles."));
      }
    };

    window.addEventListener("message", handleResponse);
    window.postMessage({
      channel: BRIDGE_CHANNEL,
      direction: "request",
      requestId
    } satisfies BridgeRequestMessage, "*");
  });
}

async function getPageStudy(): Promise<PageStudyPayload> {
  const videoId = getYouTubeVideoId(window.location.href);
  if (!videoId) {
    throw new Error("Open a YouTube video before starting Looplish.");
  }

  const video = getVideo();
  const { caption, timedText } = await requestCaptionFromPage();
  const sentences = groupCuesIntoSentences(parseYouTubeTimedText(timedText), videoId);
  if (sentences.length === 0) {
    throw new Error("The selected YouTube subtitle track is empty.");
  }

  return {
    videoId,
    ...getVideoMetadata(video),
    caption,
    sentences
  };
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionRequest, _sender, sendResponse: (response: ExtensionResponse) => void) => {
    const execute = async (): Promise<unknown> => {
      switch (message.type) {
        case "GET_PAGE_STUDY":
          return getPageStudy();
        case "PLAY_SENTENCE":
          return playback.playSegment(
            getVideo(),
            message.startTime,
            message.endTime,
            message.playbackRate
          );
        case "TOGGLE_PLAYBACK":
          return playback.toggle(getVideo());
        case "PAUSE_PLAYBACK":
          playback.pause(getVideo());
          return undefined;
      }
    };

    void execute()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error: unknown) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Looplish encountered an unexpected error."
      }));
    return true;
  }
);

